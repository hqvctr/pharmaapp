// Escreve openapi/v1.json a partir das definições de rota: `npm run contrato`.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarOpenApi } from './contrato.js';
import { rotasV1, VERSAO_CONTRATO } from './v1/definicoes.js';

export const ARQUIVO_CONTRATO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../openapi/v1.json');

export function contratoV1(): string {
  return `${JSON.stringify(gerarOpenApi(rotasV1, VERSAO_CONTRATO), null, 2)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await writeFile(ARQUIVO_CONTRATO, contratoV1());
  console.log(`Contrato escrito em ${ARQUIVO_CONTRATO}`);
}
