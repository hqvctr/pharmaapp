import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIR_CONFIG } from '../shared/tenantConfig.js';
import { carregarVinculos, validarVinculos } from './provisionar.js';

const fonte = { nome: 'lomadee', tipo: 'A', frequenciaMinutos: 120, regiao: 'SP', statusConfianca: 'em_observacao', confiabilidade: 'alta', baseLegal: 'x', ativa: true };
const loja = { fonte: 'lomadee', idExterno: '1', rede: 'R', nome: 'R (online)', tipo: 'online', status: 'em_observacao', reputacao: 0.5, faixasCep: [{ inicio: '01000000', fim: '19999999', prazoDias: 3 }] };

describe('vínculos de fontes e lojas', () => {
  it('o arquivo do tenant padrão é válido e usa só fontes e lojas declaradas', async () => {
    const v = await carregarVinculos('padrao');
    expect(v.fontes.map((f) => f.nome)).toContain('lomadee');
    expect(v.lojas.length).toBeGreaterThan(0);
    const config = JSON.parse(await readFile(path.join(DIR_CONFIG, 'tenants', 'padrao.json'), 'utf8'));
    for (const f of v.fontes) expect(Object.keys(config.fontes)).toContain(f.nome);
  });

  it('aceita o mínimo válido', () => {
    expect(validarVinculos({ fontes: [fonte], lojas: [loja] }).lojas).toHaveLength(1);
  });

  it.each([
    ['loja com fonte desconhecida', { fontes: [fonte], lojas: [{ ...loja, fonte: 'outra' }] }],
    ['loja repetida', { fontes: [fonte], lojas: [loja, loja] }],
    ['fonte repetida', { fontes: [fonte, fonte], lojas: [] }],
    ['status inválido', { fontes: [fonte], lojas: [{ ...loja, status: 'ok' }] }],
    ['reputação fora de 0 a 1', { fontes: [fonte], lojas: [{ ...loja, reputacao: 2 }] }],
    ['faixa de CEP invertida', { fontes: [fonte], lojas: [{ ...loja, faixasCep: [{ inicio: '99999999', fim: '01000000', prazoDias: 1 }] }] }],
    ['loja sem faixa de CEP', { fontes: [fonte], lojas: [{ ...loja, faixasCep: [] }] }],
    ['nome de fonte com maiúscula', { fontes: [{ ...fonte, nome: 'Lomadee' }], lojas: [] }],
    ['sem lojas', { fontes: [fonte] }],
  ])('recusa: %s', (_nome, bruto) => {
    expect(() => validarVinculos(bruto)).toThrow(/Vínculos inválidos/);
  });
});
