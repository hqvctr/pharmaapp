import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { quebrasDeCompatibilidade } from './compatibilidade.js';
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

describe('contrato v1 congelado', () => {
  const aprovado = JSON.parse(readFileSync(new URL('../../openapi/v1-aprovado.json', import.meta.url), 'utf8'));
  const atual = JSON.parse(contratoV1());

  it('o contrato atual é compatível com o aprovado (só acréscimos)', () => {
    expect(quebrasDeCompatibilidade(aprovado, atual)).toEqual([]);
  });

  it('o verificador pega quebra de resposta, de requisição e rota removida', () => {
    const quebrado = structuredClone(atual);
    quebrado.components.schemas.ItemFeed.required = quebrado.components.schemas.ItemFeed.required.filter((c: string) => c !== 'score');
    quebrado.components.schemas.Preferencias.required.push('tamanhosFralda');
    quebrado.components.schemas.Usuario.properties.plano.enum = ['gratuito', 'premium', 'familia'];
    quebrado.paths['/v1/eu/notificacoes'].put.requestBody.content['application/json'].schema.properties.consentidas = { type: 'string' };
    delete quebrado.paths['/v1/auth/sair'];
    expect(quebrasDeCompatibilidade(aprovado, quebrado)).toEqual([
      'POST /v1/auth/sair: rota sumiu',
      'PUT /v1/eu/notificacoes corpo.consentidas: deixou de aceitar boolean',
      'PUT /v1/preferencias corpo.tamanhosFralda: passou a ser obrigatório',
      'GET /v1/feed 200.itens[].score: deixou de ser obrigatório na resposta',
    ]);
  });
});
