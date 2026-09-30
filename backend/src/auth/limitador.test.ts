import { describe, expect, it } from 'vitest';
import { LimitadorMemoria } from './limitador.js';

describe('LimitadorMemoria', () => {
  it('bloqueia depois do limite e reabre no fim da janela', async () => {
    let agora = new Date('2026-09-28T12:00:00Z');
    const l = new LimitadorMemoria(() => agora);
    expect((await l.consumir('ip', 2, 60)).permitido).toBe(true);
    expect((await l.consumir('ip', 2, 60)).permitido).toBe(true);
    expect(await l.consumir('ip', 2, 60)).toEqual({ permitido: false, retryAposSegundos: 60 });
    expect((await l.consumir('outro-ip', 2, 60)).permitido).toBe(true);
    agora = new Date(agora.getTime() + 60_000);
    expect((await l.consumir('ip', 2, 60)).permitido).toBe(true);
  });
});
