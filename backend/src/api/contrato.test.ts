import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ARQUIVO_CONTRATO, contratoV1 } from './gerarContrato.js';
import { rotasV1 } from './v1/definicoes.js';

describe('contrato OpenAPI v1', () => {
  it('openapi/v1.json é exatamente o gerado pelo código (rode `npm run contrato` e revise o diff)', async () => {
    expect(await readFile(ARQUIVO_CONTRATO, 'utf8')).toBe(contratoV1());
  });

  it('operações e caminhos são únicos e toda rota tem resposta de sucesso', () => {
    expect(new Set(rotasV1.map((r) => r.operacao)).size).toBe(rotasV1.length);
    expect(new Set(rotasV1.map((r) => `${r.metodo} ${r.caminho}`)).size).toBe(rotasV1.length);
    for (const r of rotasV1) expect(Object.keys(r.respostas).some((s) => s.startsWith('2'))).toBe(true);
  });
});
