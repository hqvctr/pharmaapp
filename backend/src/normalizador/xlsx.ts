// Leitor mínimo de planilha .xlsx (só leitura de texto e números), para não depender de uma biblioteca grande.
// Um .xlsx é um zip com XML: workbook.xml (abas), sharedStrings.xml (textos) e uma planilha por aba.
// A entrada é arquivo de terceiros: o tamanho descompactado é limitado e nada do conteúdo é executado.
import { unzipSync } from 'fflate';

const LIMITE_DESCOMPACTADO = 600 * 1024 * 1024;

export interface PlanilhaLida {
  /** Linhas na ordem do arquivo; cada linha é um mapa coluna (A, B, ... AA) → texto. Células vazias não aparecem. */
  linhas: Array<Map<number, string>>;
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

function decodificar(t: string): string {
  return t.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-fA-F]+);/g, (m, _n, dec, hex) => {
    if (dec !== undefined) return String.fromCodePoint(Number(dec));
    if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
    return ENTIDADES[m] ?? m;
  });
}

/** "A" → 0, "Z" → 25, "AA" → 26. */
export function indiceDaColuna(letras: string): number {
  let n = 0;
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function textoDe(xml: string): string {
  // Concatena todos os <t> (texto rico vem em vários trechos).
  let saida = '';
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g)) saida += decodificar(m[1] ?? '');
  return saida;
}

function lerTextosCompartilhados(xml: string): string[] {
  const textos: string[] = [];
  for (const m of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si\s*\/>/g)) textos.push(textoDe(m[1] ?? ''));
  return textos;
}

export function lerPlanilha(arquivo: Uint8Array, nomeDaAba: string): PlanilhaLida {
  const arquivos = unzipSync(arquivo, {
    filter: (f) => {
      if (f.originalSize > LIMITE_DESCOMPACTADO) throw new Error(`Arquivo ${f.name} grande demais (${f.originalSize} bytes)`);
      return /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name);
    },
  });
  const ler = (nome: string): string | undefined => {
    const b = arquivos[nome];
    return b === undefined ? undefined : new TextDecoder('utf-8').decode(b);
  };
  const livro = ler('xl/workbook.xml');
  const relacoes = ler('xl/_rels/workbook.xml.rels');
  if (livro === undefined || relacoes === undefined) throw new Error('Arquivo não parece um .xlsx (faltam workbook.xml ou suas relações)');

  const aba = [...livro.matchAll(/<sheet\s[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => decodificar(/\bname="([^"]*)"/.exec(tag)?.[1] ?? '') === nomeDaAba);
  if (aba === undefined) throw new Error(`Aba "${nomeDaAba}" não encontrada`);
  const rid = /\br:id="([^"]*)"/.exec(aba)?.[1];
  const alvo = [...relacoes.matchAll(/<Relationship\s[^>]*>/g)].map((m) => m[0]).find((tag) => /\bId="([^"]*)"/.exec(tag)?.[1] === rid);
  const caminho = alvo === undefined ? undefined : /\bTarget="([^"]*)"/.exec(alvo)?.[1];
  if (caminho === undefined) throw new Error(`Aba "${nomeDaAba}" sem arquivo associado`);
  const xmlAba = ler(caminho.startsWith('/') ? caminho.slice(1) : `xl/${caminho}`);
  if (xmlAba === undefined) throw new Error(`Arquivo da aba "${nomeDaAba}" ausente`);

  const compartilhados = lerTextosCompartilhados(ler('xl/sharedStrings.xml') ?? '');
  const linhas: Array<Map<number, string>> = [];
  for (const linha of xmlAba.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>|<row(?:\s[^>]*)?\/>/g)) {
    const celulas = new Map<number, string>();
    let proxima = 0;
    for (const c of (linha[1] ?? '').matchAll(/<c(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const atributos = c[1] ?? '';
      const ref = /\br="([A-Z]+)\d+"/.exec(atributos)?.[1];
      const coluna = ref !== undefined ? indiceDaColuna(ref) : proxima;
      proxima = coluna + 1;
      const tipo = /\bt="([^"]*)"/.exec(atributos)?.[1];
      const corpo = c[2] ?? '';
      let valor: string | undefined;
      if (tipo === 'inlineStr') valor = textoDe(corpo);
      else {
        const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(corpo)?.[1];
        if (v !== undefined) valor = tipo === 's' ? compartilhados[Number(v)] : decodificar(v);
      }
      if (valor !== undefined && valor !== '') celulas.set(coluna, valor);
    }
    linhas.push(celulas);
  }
  return { linhas };
}
