// CLI: converte a lista PMC da CMED (.xlsx) para o arquivo de listas de medicamentos do normalizador.
//   node dist/normalizador/converterCmed.js --cmed lista_pmc.xlsx --saida backend/data/listas/cmed-AAAA-MM-DD.json
// Recusa gravar se a lista parecer incompleta ou o formato tiver mudado (falha fechada).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { converterCmed, lerLinhasDaCmed, versaoDaCmed } from './cmed.js';
import { lerPlanilha } from './xlsx.js';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { cmed: { type: 'string' }, saida: { type: 'string' } } });
  if (!values.cmed || !values.saida) throw new Error('Uso: --cmed <lista_pmc.xlsx> --saida <arquivo.json>');
  const bytes = new Uint8Array(await readFile(values.cmed));
  let cabecalho: string | undefined;
  try {
    cabecalho = [...lerPlanilha(bytes, 'Cabeçalho').linhas.slice(0, 6).flatMap((l) => [...l.values()])].join(' ');
  } catch {
    cabecalho = undefined;
  }
  const versao = versaoDaCmed(path.basename(values.cmed), cabecalho);
  const { listas, relatorio } = converterCmed(lerLinhasDaCmed(bytes), versao);
  await mkdir(path.dirname(values.saida), { recursive: true });
  await writeFile(values.saida, JSON.stringify(listas));
  console.log(JSON.stringify({ versao, saida: values.saida, ...relatorio }));
  if (Object.keys(relatorio.tarjasDesconhecidas).length > 0) {
    console.error(`Atenção: valores de tarja desconhecidos (tratados como não isentos): ${JSON.stringify(relatorio.tarjasDesconhecidas)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
