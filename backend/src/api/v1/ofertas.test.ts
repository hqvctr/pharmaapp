import { describe, expect, it } from 'vitest';
import { carregarConfigTenant } from '../../shared/tenantConfig.js';
import type { LinhaOferta } from '../repositorio.js';
import { codificarCursor, decodificarCursor, visaoOferta } from './ofertas.js';

const config = await carregarConfigTenant('economae');
const linha: LinhaOferta = {
  ofertaId: '6f1c2a8e-0000-4000-8000-000000000001',
  precoCentavos: 3000,
  condicao: { tipo: 'leve_pague', leve: 3, pague: 2 },
  freteStatus: 'a_confirmar',
  freteCentavos: null,
  validaAte: null,
  link: 'https://exemplo/x',
  linkAfiliado: true,
  imagemUrl: null,
  coletadaEm: new Date('2026-09-28T12:00:00Z'),
  produto: { nome: 'Sabonete Líquido Infantil 500ml', marca: null, categoria: 'higiene_cuidados_bebe', familiaChave: 'f', quantidade: 0.5, unidade: 'l' },
  loja: { id: '6f1c2a8e-0000-4000-8000-000000000002', nome: 'Loja', rede: 'Rede', tipo: 'online' },
  alerta: {
    id: '6f1c2a8e-0000-4000-8000-000000000003',
    criadoEm: new Date('2026-09-28T12:00:00.123Z'),
    cursor: '2026-09-28T12:00:00.123456Z',
    decisao: 'notificar',
    score: 80,
    referenciaPorUnidade: 6000,
    pisoPorUnidade: 4200,
    maiorPorUnidade: 6600,
    diasMedidos: 94,
  },
  ativa: true,
  prazoEntregaDias: 2,
};

describe('visaoOferta', () => {
  it('leve 3 pague 2: preço efetivo por embalagem, referência da mesma embalagem e rótulo da condição', () => {
    expect(visaoOferta(linha, config)).toMatchObject({
      precoCentavos: 3000,
      precoEfetivoCentavos: 2000,
      precoReferenciaCentavos: 3000,
      queda: 0.3333,
      precoPorUnidade: { centavos: 4000, unidade: 'l' },
      condicao: 'Leve 3, pague 2',
      avisos: [],
    });
  });

  it('alimentação infantil leva a advertência da NBCAL', () => {
    const papinha = { ...linha, produto: { ...linha.produto, categoria: 'alimentacao_infantil' } };
    expect(visaoOferta(papinha, config).avisos).toEqual([config.nbcal.aviso]);
    expect(config.nbcal.aviso).toMatch(/^O Ministério da Saúde informa: o aleitamento materno/);
  });
});

describe('prova do desconto', () => {
  it('menor e maior preço convertidos para a embalagem, com os dias medidos', () => {
    expect(visaoOferta(linha, config).prova).toEqual({ menorPrecoCentavos: 2100, maiorPrecoCentavos: 3300, diasMedidos: 94 });
  });

  it('alerta anterior à migration 0007 manda prova = null', () => {
    const antigo = { ...linha, alerta: { ...linha.alerta, pisoPorUnidade: null, maiorPorUnidade: null, diasMedidos: null } };
    expect(visaoOferta(antigo, config).prova).toBeNull();
  });
});

describe('cursor do feed', () => {
  it('ida e volta preserva microssegundos', () => {
    expect(decodificarCursor(codificarCursor(linha))).toEqual({ alertadaEm: '2026-09-28T12:00:00.123456Z', alertaId: linha.alerta.id });
  });

  it.each(['', 'lixo', Buffer.from('["2026-09-28", "x"]').toString('base64url')])('recusa cursor adulterado %#', (c) => {
    expect(() => decodificarCursor(c)).toThrow(expect.objectContaining({ codigo: 'CURSOR_INVALIDO' }));
  });
});
