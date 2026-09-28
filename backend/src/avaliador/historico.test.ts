import { describe, expect, it } from 'vitest';
import { agregarPorDia, diaLocal } from './historico.js';

describe('histórico diário (P1)', () => {
  const agora = new Date('2026-09-10T15:00:00Z'); // 12:00 em São Paulo

  it('várias coletas no mesmo dia viram uma observação com o menor preço', () => {
    const r = agregarPorDia(
      [
        { observadoEm: new Date('2026-09-08T11:00:00Z'), precoPorUnidade: 500 },
        { observadoEm: new Date('2026-09-08T17:00:00Z'), precoPorUnidade: 420 },
        { observadoEm: new Date('2026-09-08T21:00:00Z'), precoPorUnidade: 500 },
        { observadoEm: new Date('2026-09-09T11:00:00Z'), precoPorUnidade: 500 },
      ],
      'kg',
      agora,
    );
    expect(r.map((o) => o.precoCentavos)).toEqual([420, 500]);
  });

  it('o dia corrente fica de fora', () => {
    const r = agregarPorDia([{ observadoEm: new Date('2026-09-10T11:00:00Z'), precoPorUnidade: 300 }], 'kg', agora);
    expect(r).toEqual([]);
  });

  it('dia é contado no fuso de São Paulo, não em UTC', () => {
    // 01:30 UTC do dia 10 ainda é dia 9 em São Paulo.
    expect(diaLocal(new Date('2026-09-10T01:30:00Z'), 'America/Sao_Paulo')).toBe('2026-09-09');
    const r = agregarPorDia([{ observadoEm: new Date('2026-09-10T01:30:00Z'), precoPorUnidade: 300 }], 'kg', agora);
    expect(r).toHaveLength(1);
  });
});
