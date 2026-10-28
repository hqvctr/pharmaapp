import { describe, expect, it } from 'vitest';
import { linkRastreadoDaOferta, OfertaSemLinkError } from './linkRastreado.js';

type Consulta = { sql: string; params: unknown[] };
function bd(linha: Record<string, unknown> | null) {
  const consultas: Consulta[] = [];
  return {
    consultas,
    db: {
      query: async (sql: string, params: unknown[]) => {
        consultas.push({ sql, params });
        if (sql.startsWith('SELECT')) return { rowCount: linha === null ? 0 : 1, rows: linha === null ? [] : [linha] };
        return { rowCount: 1, rows: [] };
      },
    },
  };
}
const agora = new Date('2026-10-28T12:00:00Z');

describe('link rastreado da oferta', () => {
  it('gera, guarda e devolve na primeira vez', async () => {
    const { db, consultas } = bd({ link: 'https://loja.test/p', link_rastreado: null, link_rastreado_de: null, id_externo_loja: 'ORG' });
    const chamadas: string[][] = [];
    const l = await linkRastreadoDaOferta(db as never, { linkRastreado: async (o, u) => { chamadas.push([o, u]); return 'https://lmdee.link/x'; } }, 't1', 'o1', agora);
    expect(l).toBe('https://lmdee.link/x');
    expect(chamadas).toEqual([['ORG', 'https://loja.test/p']]);
    expect(consultas.at(-1)!.params).toEqual(['t1', 'o1', 'https://lmdee.link/x', 'https://loja.test/p', agora]);
  });

  it('reaproveita o guardado enquanto o link da loja não mudar', async () => {
    const { db, consultas } = bd({ link: 'https://loja.test/p', link_rastreado: 'https://lmdee.link/x', link_rastreado_de: 'https://loja.test/p', id_externo_loja: 'ORG' });
    const l = await linkRastreadoDaOferta(db as never, { linkRastreado: async () => { throw new Error('não deveria chamar'); } }, 't1', 'o1', agora);
    expect(l).toBe('https://lmdee.link/x');
    expect(consultas).toHaveLength(1);
  });

  it('gera de novo quando o link da loja mudou', async () => {
    const { db } = bd({ link: 'https://loja.test/novo', link_rastreado: 'https://lmdee.link/x', link_rastreado_de: 'https://loja.test/velho', id_externo_loja: 'ORG' });
    expect(await linkRastreadoDaOferta(db as never, { linkRastreado: async () => 'https://lmdee.link/y' }, 't1', 'o1', agora)).toBe('https://lmdee.link/y');
  });

  it('oferta inexistente (ou de outro tenant) = erro; a consulta sempre filtra por tenant', async () => {
    const { db, consultas } = bd(null);
    await expect(linkRastreadoDaOferta(db as never, { linkRastreado: async () => 'x' }, 't1', 'o1', agora)).rejects.toBeInstanceOf(OfertaSemLinkError);
    expect(consultas[0]!.sql).toContain('o.tenant_id = $1');
  });

  it('falha do encurtador não grava nada', async () => {
    const { db, consultas } = bd({ link: 'https://loja.test/p', link_rastreado: null, link_rastreado_de: null, id_externo_loja: 'ORG' });
    await expect(linkRastreadoDaOferta(db as never, { linkRastreado: async () => { throw new Error('sem canal'); } }, 't1', 'o1', agora)).rejects.toThrow('sem canal');
    expect(consultas).toHaveLength(1);
  });
});
