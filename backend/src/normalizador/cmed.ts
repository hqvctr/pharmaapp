// Conversão da lista de preços da CMED (Anvisa) para a referência de medicamentos do normalizador.
// A CMED publica a lista PMC em .xlsx; cada linha é uma apresentação com até três EAN (código de barras).
// Regras (parecer da RDC 96/2008 e DECISIONS 57/58; tudo em falha fechada):
//  - só "Tarja Sem Tarja" é medicamento isento de prescrição; "Tarja Vermelha", "Tarja Vermelha sob restrição",
//    "Tarja Preta" e "- (*)" (sem informação de tarja, que inclui remédios de receita) NÃO são isentos;
//  - substância controlada = substância de qualquer produto "Tarja Preta" ou "Tarja Vermelha sob restrição",
//    para barrar produto isento que contenha uma delas;
//  - GTIN repetido em linhas diferentes: vale o mais restritivo (um "não isento" vence um "isento").
import { lerPlanilha } from './xlsx.js';
import { normalizarTexto, type ReferenciaMedicamento } from './medicamentos.js';

export const ABA_PMC = 'Lista PMC';
export const TERMOS_BLOQUEADOS_PADRAO: readonly string[] = [
  'tarja preta',
  'tarja vermelha',
  'venda sob prescrição',
  'retenção de receita',
  'receita controlada',
  'psicotrópico',
];

const COLUNAS = ['SUBSTÂNCIA', 'REGISTRO', 'EAN 1', 'EAN 2', 'EAN 3', 'PRODUTO', 'TARJA'] as const;
const TARJA_ISENTA = 'tarja sem tarja';
const TARJAS_CONTROLADAS = new Set(['tarja preta', 'tarja vermelha sob restricao']);
const TARJAS_CONHECIDAS = new Set([TARJA_ISENTA, 'tarja vermelha', 'tarja vermelha sob restricao', 'tarja preta', '- (*)']);
const MINIMO_DE_LINHAS = 10_000;

export interface ListasConvertidas {
  versao: string;
  fonte: string;
  referencia: ReferenciaMedicamento[];
  substanciasControladas: string[];
  termosBloqueados: string[];
}

export interface RelatorioConversao {
  linhas: number;
  gtins: number;
  isentos: number;
  naoIsentos: number;
  substanciasControladas: number;
  tarjasDesconhecidas: Record<string, number>;
  gtinsConflitantes: number;
}

/** Só dígitos, 8 a 14. A CMED usa "    -     " quando o EAN não existe. */
export function limparGtin(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return /^[0-9]{8,14}$/.test(t) ? t : null;
}

export function lerLinhasDaCmed(xlsx: Uint8Array): Array<Record<(typeof COLUNAS)[number], string>> {
  const { linhas } = lerPlanilha(xlsx, ABA_PMC);
  const cabecalho = linhas[0];
  if (cabecalho === undefined) throw new Error('Planilha da CMED vazia');
  const coluna = new Map<string, number>();
  for (const [i, nome] of cabecalho) coluna.set(nome.trim(), i);
  const faltando = COLUNAS.filter((c) => !coluna.has(c));
  if (faltando.length > 0) throw new Error(`Colunas ausentes na lista da CMED: ${faltando.join(', ')}`);
  const saida: Array<Record<(typeof COLUNAS)[number], string>> = [];
  for (const l of linhas.slice(1)) {
    if (!l.has(coluna.get('SUBSTÂNCIA')!)) continue;
    saida.push(Object.fromEntries(COLUNAS.map((c) => [c, (l.get(coluna.get(c)!) ?? '').trim()])) as Record<(typeof COLUNAS)[number], string>);
  }
  return saida;
}

export function converterCmed(
  linhas: ReadonlyArray<Record<(typeof COLUNAS)[number], string>>,
  versao: string,
): { listas: ListasConvertidas; relatorio: RelatorioConversao } {
  if (linhas.length < MINIMO_DE_LINHAS) {
    throw new Error(`Lista da CMED com só ${linhas.length} linhas (esperado pelo menos ${MINIMO_DE_LINHAS}); arquivo incompleto ou formato mudou`);
  }
  const porGtin = new Map<string, ReferenciaMedicamento>();
  const controladas = new Set<string>();
  const desconhecidas: Record<string, number> = {};
  let conflitos = 0;

  for (const l of linhas) {
    const tarja = normalizarTexto(l.TARJA);
    if (!TARJAS_CONHECIDAS.has(tarja)) desconhecidas[l.TARJA] = (desconhecidas[l.TARJA] ?? 0) + 1;
    const isento = tarja === TARJA_ISENTA;
    const principios = l['SUBSTÂNCIA'].split(/[;+]/).map((s) => s.trim()).filter((s) => s !== '');
    if (TARJAS_CONTROLADAS.has(tarja)) for (const p of principios) controladas.add(normalizarTexto(p));
    const principioAtivo = principios.join(';');
    for (const g of [l['EAN 1'], l['EAN 2'], l['EAN 3']]) {
      const gtin = limparGtin(g);
      if (gtin === null) continue;
      const atual = porGtin.get(gtin);
      if (atual === undefined) porGtin.set(gtin, { gtin, principioAtivo, isentoPrescricao: isento });
      else if (atual.isentoPrescricao !== isento) {
        conflitos++;
        atual.isentoPrescricao = false;
      }
    }
  }

  const referencia = [...porGtin.values()].sort((a, b) => (a.gtin < b.gtin ? -1 : 1));
  const isentos = referencia.filter((r) => r.isentoPrescricao).length;
  return {
    listas: {
      versao,
      fonte: 'CMED/Anvisa, lista de preços PMC',
      referencia,
      substanciasControladas: [...controladas].sort(),
      termosBloqueados: [...TERMOS_BLOQUEADOS_PADRAO],
    },
    relatorio: {
      linhas: linhas.length,
      gtins: referencia.length,
      isentos,
      naoIsentos: referencia.length - isentos,
      substanciasControladas: controladas.size,
      tarjasDesconhecidas: desconhecidas,
      gtinsConflitantes: conflitos,
    },
  };
}

/** "cmed-2026-10-09" a partir de "Publicada em 09/10/2026" na aba de cabeçalho, ou do nome do arquivo. */
export function versaoDaCmed(nomeDoArquivo: string, textoDoCabecalho: string | undefined): string {
  const data = /Publicada em (\d{2})\/(\d{2})\/(\d{4})/.exec(textoDoCabecalho ?? '');
  if (data) return `cmed-${data[3]}-${data[2]}-${data[1]}`;
  const arq = /(\d{4})(\d{2})(\d{2})/.exec(nomeDoArquivo);
  if (arq) return `cmed-${arq[1]}-${arq[2]}-${arq[3]}`;
  throw new Error('Não foi possível descobrir a data de publicação da lista da CMED');
}
