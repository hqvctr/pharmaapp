// Mantém atualizada a lista de medicamentos derivada da CMED: acha o link da lista PMC mais recente na página da
// Anvisa, baixa, converte e grava em <dados>/listas/. Usado pelo comando e pelo coletor em ciclo.
//   node dist/normalizador/atualizarListas.js --dados backend/data
import { copyFile, mkdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { converterCmed, lerLinhasDaCmed, versaoDaCmed } from './cmed.js';
import { lerPlanilha } from './xlsx.js';

export const PAGINA_CMED = 'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos';
const TAMANHO_MAXIMO = 120 * 1024 * 1024;

/** Primeiro link de lista PMC (.xlsx) da página da CMED, já absoluto. */
export function acharLinkPmc(html: string, base: string = PAGINA_CMED): string | null {
  const m = /href="([^"]*lista_pmc_[^"]*\.xlsx[^"]*)"/.exec(html);
  if (m === null) return null;
  return new URL(m[1]!, base).toString();
}

export type Buscar = (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string> }>;

/** Verdadeiro se o arquivo não existe ou é mais velho que `maxDias`. */
export async function listaEstaVelha(arquivo: string, maxDias: number, agora: Date): Promise<boolean> {
  try {
    const { mtimeMs } = await stat(arquivo);
    return agora.getTime() - mtimeMs > maxDias * 86_400_000;
  } catch {
    return true;
  }
}

export async function atualizarListas(
  dados: string,
  buscar: Buscar = (u) => fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(300_000) }),
): Promise<{ versao: string; arquivo: string; gtins: number; isentos: number }> {
  const pagina = await buscar(PAGINA_CMED);
  if (!pagina.ok) throw new Error(`Página da CMED respondeu HTTP ${pagina.status}`);
  const link = acharLinkPmc(await pagina.text());
  if (link === null) throw new Error('Não achei o link da lista PMC na página da CMED (a página pode ter mudado)');
  const download = await buscar(link);
  if (!download.ok) throw new Error(`Download da lista da CMED respondeu HTTP ${download.status}`);
  const bytes = new Uint8Array(await download.arrayBuffer());
  if (bytes.length === 0 || bytes.length > TAMANHO_MAXIMO) throw new Error(`Arquivo da CMED com tamanho estranho (${bytes.length} bytes)`);

  let cabecalho: string | undefined;
  try {
    cabecalho = lerPlanilha(bytes, 'Cabeçalho').linhas.slice(0, 6).flatMap((l) => [...l.values()]).join(' ');
  } catch {
    cabecalho = undefined;
  }
  const nomeDoArquivo = path.basename(new URL(link).pathname.replace(/\/@@download.*$/, ''));
  const versao = versaoDaCmed(nomeDoArquivo, cabecalho);
  const { listas, relatorio } = converterCmed(lerLinhasDaCmed(bytes), versao);

  const pastaListas = path.join(dados, 'listas');
  await mkdir(pastaListas, { recursive: true });
  const destino = path.join(pastaListas, `${versao}.json`);
  const temporario = `${destino}.parcial`;
  await writeFile(temporario, JSON.stringify(listas));
  await rename(temporario, destino);
  await copyFile(destino, path.join(pastaListas, 'atual.json'));
  return { versao, arquivo: destino, gtins: relatorio.gtins, isentos: relatorio.isentos };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { dados: { type: 'string' } } });
  const r = await atualizarListas(values.dados ?? 'data');
  console.log(JSON.stringify(r));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

