import { describe, expect, it } from 'vitest';
import { agregarPorDia, calcularProva, diaLocal } from './historico.js';

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

describe('prova do alerta', () => {
  const agora = new Date('2026-09-10T15:00:00Z'); // 12:00 em São Paulo
  const l = (iso: string, precoCentavos: number) => ({ observadoEm: new Date(iso), precoCentavos });

  it('menor, maior e dias com observação, sem o dia corrente', () => {
    const p = calcularProva(
      [l('2026-09-07T12:00:00Z', 6500), l('2026-09-08T12:00:00Z', 5900), l('2026-09-08T18:00:00Z', 6200), l('2026-09-09T12:00:00Z', 7100), l('2026-09-10T12:00:00Z', 3000)],
      agora,
      'America/Sao_Paulo',
      180,
    );
    expect(p).toEqual({ menorPrecoCentavos: 5900, maiorPrecoCentavos: 7100, diasMedidos: 3 });
  });

  it('só a janela do motor: observação mais velha que a janela não entra', () => {
    const p = calcularProva([l('2026-08-01T12:00:00Z', 9900), l('2026-09-09T12:00:00Z', 6000)], agora, 'America/Sao_Paulo', 30);
    expect(p).toEqual({ menorPrecoCentavos: 6000, maiorPrecoCentavos: 6000, diasMedidos: 1 });
  });

  it('dia é contado no fuso do tenant', () => {
    // 01:30 UTC do dia 10 ainda é dia 9 em São Paulo: entra; no UTC seria o dia corrente.
    expect(calcularProva([l('2026-09-10T01:30:00Z', 5000)], agora, 'America/Sao_Paulo', 180)).toEqual({ menorPrecoCentavos: 5000, maiorPrecoCentavos: 5000, diasMedidos: 1 });
  });

  it('sem observação medida devolve null', () => {
    expect(calcularProva([], agora, 'America/Sao_Paulo', 180)).toBeNull();
    expect(calcularProva([l('2026-09-10T12:00:00Z', 3000)], agora, 'America/Sao_Paulo', 180)).toBeNull();
  });
});
