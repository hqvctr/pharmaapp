import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { acharLinkPmc, atualizarListas, listaEstaVelha, PAGINA_CMED } from './atualizarListas.js';

describe('atualização da lista da CMED', () => {
  it('acha o link da lista PMC e o torna absoluto', () => {
    const html = '<a href="/anvisa/x/lista_pmc_2026_10_v1.xlsx/@@download/file/lista_pmc.xlsx">PMC</a><a href="outra.pdf">y</a>';
    expect(acharLinkPmc(html)).toBe('https://www.gov.br/anvisa/x/lista_pmc_2026_10_v1.xlsx/@@download/file/lista_pmc.xlsx');
  });

  it('sem link na página: devolve nulo e o ciclo reclama de página mudada', async () => {
    expect(acharLinkPmc('<html></html>')).toBeNull();
    const dir = await mkdtemp(path.join(tmpdir(), 'listas-'));
    const buscar = async () => ({ ok: true, status: 200, text: async () => '<html></html>', arrayBuffer: async () => new ArrayBuffer(0) });
    await expect(atualizarListas(dir, buscar)).rejects.toThrow(/página pode ter mudado/);
  });

  it('página fora do ar e arquivo vazio dão erro claro', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'listas-'));
    const fora = async () => ({ ok: false, status: 503, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) });
    await expect(atualizarListas(dir, fora)).rejects.toThrow(/HTTP 503/);
    const vazio = async (u: string) => ({ ok: true, status: 200, text: async () => (u === PAGINA_CMED ? '<a href="lista_pmc_1.xlsx">x</a>' : ''), arrayBuffer: async () => new ArrayBuffer(0) });
    await expect(atualizarListas(dir, vazio)).rejects.toThrow(/tamanho estranho/);
  });

  it('lista velha: não existe ou passou do limite de dias', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'listas-'));
    const arquivo = path.join(dir, 'atual.json');
    const agora = new Date('2026-10-28T12:00:00Z');
    expect(await listaEstaVelha(arquivo, 7, agora)).toBe(true);
    await writeFile(arquivo, '{}');
    await utimes(arquivo, new Date('2026-10-25T12:00:00Z'), new Date('2026-10-25T12:00:00Z'));
    expect(await listaEstaVelha(arquivo, 7, agora)).toBe(false);
    await utimes(arquivo, new Date('2026-10-10T12:00:00Z'), new Date('2026-10-10T12:00:00Z'));
    expect(await listaEstaVelha(arquivo, 7, agora)).toBe(true);
  });
});
