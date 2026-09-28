import { describe, expect, it } from 'vitest';
import { carregarConfigTenant } from '../../shared/tenantConfig.js';
import type { LinhaOferta } from '../repositorio.js';
import { codificarCursor, decodificarCursor, visaoOferta } from './ofertas.js';

const config = await carregarConfigTenant('padrao');
const linha: LinhaOferta = {
  ofertaId: '6f1c2a8e-0000-4000-8000-000000000001',
  precoCentavos: 3000,
  condicao: { tipo: 'leve_pague', leve: 3, pague: 2 },
  freteStatus: 'a_confirmar',
  freteCentavos: null,
  validaAte: null,
  link: 'https://exemplo/x',
  linkAfiliado: true,
  coletadaEm: new Date('2026-09-28T12:00:00Z'),
  produto: { nome: 'Detergente 500ml', marca: null, categoria: 'limpeza', familiaChave: 'f', quantidade: 0.5, unidade: 'l' },
  loja: { id: '6f1c2a8e-0000-4000-8000-000000000002', nome: 'Loja', rede: 'Rede', tipo: 'online' },
  alerta: {
    id: '6f1c2a8e-0000-4000-8000-000000000003',
    criadoEm: new Date('2026-09-28T12:00:00.123Z'),
    cursor: '2026-09-28T12:00:00.123456Z',
    decisao: 'notificar',
    score: 80,
    referenciaPorUnidade: 6000,
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
      medicamento: false,
    });
  });

  it('marca medicamento pela categoria configurada', () => {
    const med = { ...linha, produto: { ...linha.produto, categoria: config.medicamentos.categoria } };
    expect(visaoOferta(med, config).medicamento).toBe(true);
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
