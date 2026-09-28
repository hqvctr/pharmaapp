import { describe, expect, it } from 'vitest';
import { deduplicar, type UltimoAlerta } from './deduplicacao.js';

const config = { quedaAdicionalMinima: 0.05, fatorRetornoAoNormal: 0.95 };
const agora = new Date('2026-09-20T12:00:00Z');
const ultimo: UltimoAlerta = {
  decisao: 'notificar',
  criadoEm: new Date('2026-09-10T12:00:00Z'),
  precoEfetivoPorUnidade: 350,
  precoReferenciaPorUnidade: 500,
  validaAte: null,
};

describe('deduplicação de alerta', () => {
  it.each([
    ['primeiro alerta', { decisao: 'notificar', precoEfetivoPorUnidade: 350 }, null, [], true],
    ['descartada nunca gera', { decisao: 'descartar', precoEfetivoPorUnidade: 100 }, null, [], false],
    ['promoção longa, mesmo preço 10 dias depois: não renotifica', { decisao: 'notificar', precoEfetivoPorUnidade: 350 }, ultimo, [350, 350], false],
    ['caiu só 4% a mais: não renotifica', { decisao: 'notificar', precoEfetivoPorUnidade: 336 }, ultimo, [350], false],
    ['caiu 5% a mais: novo alerta', { decisao: 'notificar', precoEfetivoPorUnidade: 332.5 }, ultimo, [350], true],
    ['voltou a R$ 4,80/kg (≥ 95% da referência) e caiu de novo', { decisao: 'notificar', precoEfetivoPorUnidade: 350 }, ultimo, [480, 350], true],
    ['subiu a R$ 4,50/kg, abaixo de 95% da referência: ainda é a mesma promoção', { decisao: 'notificar', precoEfetivoPorUnidade: 350 }, ultimo, [450, 350], false],
    ['loja aprovada: somente_feed sobe para notificar', { decisao: 'notificar', precoEfetivoPorUnidade: 350 }, { ...ultimo, decisao: 'somente_feed' }, [], true],
    ['decisão caiu de notificar para somente_feed: não gera', { decisao: 'somente_feed', precoEfetivoPorUnidade: 350 }, ultimo, [], false],
  ] as const)('%s', (_caso, nova, anterior, precos, esperado) => {
    expect(deduplicar(nova, anterior, precos, agora, config).gerarAlerta).toBe(esperado);
  });

  it('validade anterior encerrada: mesma faixa de preço é promoção nova', () => {
    const r = deduplicar(
      { decisao: 'notificar', precoEfetivoPorUnidade: 350 },
      { ...ultimo, validaAte: new Date('2026-09-15T00:00:00Z') },
      [],
      agora,
      config,
    );
    expect(r).toEqual({ gerarAlerta: true, motivo: 'promoção anterior venceu; esta é uma nova' });
  });
});
