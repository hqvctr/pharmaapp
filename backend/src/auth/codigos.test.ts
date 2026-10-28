import { describe, expect, it } from 'vitest';
import { CodigosMemoria, CodigosRedis } from './codigos.js';
import { iguais } from './tokens.js';

/** Redis mínimo, só com o que CodigosRedis usa; TTL ignorado (o que se testa aqui é a contagem de tentativas). */
function redisFalso() {
  const m = new Map<string, string>();
  return {
    get: async (k: string) => m.get(k) ?? null,
    set: async (k: string, v: string) => (m.set(k, v), 'OK' as const),
    del: async (...ks: string[]) => ks.filter((k) => m.delete(k)).length,
    incr: async (k: string) => {
      const n = Number(m.get(k) ?? '0') + 1;
      m.set(k, String(n));
      return n;
    },
    expire: async () => 1,
  };
}

describe.each([
  ['memória', () => new CodigosMemoria(iguais)],
  ['redis', () => new CodigosRedis(redisFalso() as never, iguais)],
])('códigos de e-mail (%s)', (_nome, fabrica) => {
  it('código certo vale uma vez só', async () => {
    const c = fabrica();
    await c.guardar('k', 'abc', 600);
    expect(await c.conferir('k', 'abc', 5)).toBe('ok');
    expect(await c.conferir('k', 'abc', 5)).toBe('expirado');
  });

  it('sem código guardado: expirado', async () => {
    expect(await fabrica().conferir('nunca', 'x', 5)).toBe('expirado');
  });

  it('cinco erros invalidam o código: o quinto ainda é "inválido", o sexto e o certo já são "expirado"', async () => {
    const c = fabrica();
    await c.guardar('k', 'certo', 600);
    for (let i = 0; i < 5; i++) expect(await c.conferir('k', 'errado', 5)).toBe('invalido');
    expect(await c.conferir('k', 'errado', 5)).toBe('expirado');
    expect(await c.conferir('k', 'certo', 5)).toBe('expirado');
  });

  it('código novo substitui o anterior e zera as tentativas', async () => {
    const c = fabrica();
    await c.guardar('k', 'velho', 600);
    await c.conferir('k', 'x', 5);
    await c.conferir('k', 'x', 5);
    await c.guardar('k', 'novo', 600);
    expect(await c.conferir('k', 'velho', 5)).toBe('invalido');
    expect(await c.conferir('k', 'novo', 5)).toBe('ok');
  });
});

describe('validade (memória)', () => {
  it('vence depois do prazo', async () => {
    let agora = 0;
    const c = new CodigosMemoria(iguais, () => agora);
    await c.guardar('k', 'abc', 600);
    agora = 599_000;
    expect(await c.conferir('k', 'errado', 5)).toBe('invalido');
    agora = 600_001;
    expect(await c.conferir('k', 'abc', 5)).toBe('expirado');
  });
});
