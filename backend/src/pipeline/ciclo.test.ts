import { describe, expect, it, vi } from 'vitest';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { executarCiclo, naoChegouAColetar, rodarCiclos, type DependenciasCiclo, type ResumoCiclo } from './ciclo.js';

const listas = { versao: 'x', porGtin: new Map(), substanciasControladas: new Set(), termosBloqueados: ['a'] } as unknown as ListasMedicamentos;

function deps(p: Partial<DependenciasCiclo> = {}): DependenciasCiclo & { logs: string[] } {
  const logs: string[] = [];
  return {
    logs,
    agora: () => new Date('2026-10-28T12:00:00Z'),
    log: (m) => logs.push(m),
    listaVelha: async () => false,
    atualizarLista: async () => ({ versao: 'v', gtins: 10 }),
    carregarListas: async () => listas,
    coletar: async () => ({ resultados: [], falhou: false }),
    ...p,
  };
}

describe('ciclo do coletor', () => {
  it('lista em dia: não baixa de novo e coleta', async () => {
    const atualizar = vi.fn();
    const coletar = vi.fn(async () => ({ resultados: [], falhou: false }));
    const r = await executarCiclo(deps({ atualizarLista: atualizar, coletar }));
    expect(atualizar).not.toHaveBeenCalled();
    expect(coletar).toHaveBeenCalledTimes(1);
    expect(r.falhou).toBe(false);
    expect(r.listaAtualizada).toBe(false);
  });

  it('lista velha: atualiza antes de coletar', async () => {
    const ordem: string[] = [];
    const r = await executarCiclo(
      deps({
        listaVelha: async () => true,
        atualizarLista: async () => { ordem.push('atualizar'); return { versao: 'v', gtins: 5 }; },
        coletar: async () => { ordem.push('coletar'); return { resultados: [], falhou: false }; },
      }),
    );
    expect(ordem).toEqual(['atualizar', 'coletar']);
    expect(r.listaAtualizada).toBe(true);
  });

  it('falha ao baixar a lista, mas já existe uma: segue com a antiga e coleta', async () => {
    const d = deps({ listaVelha: async () => true, atualizarLista: async () => { throw new Error('sem internet'); } });
    const r = await executarCiclo(d);
    expect(r.erro).toBeUndefined();
    expect(r.falhou).toBe(false);
    expect(d.logs.join('\n')).toContain('sem internet');
  });

  it('falha ao baixar e não há lista: o ciclo falha e não coleta (falha fechada)', async () => {
    const coletar = vi.fn();
    const r = await executarCiclo(
      deps({
        listaVelha: async () => true,
        atualizarLista: async () => { throw new Error('sem internet'); },
        carregarListas: async () => { throw new Error('ENOENT'); },
        coletar,
      }),
    );
    expect(coletar).not.toHaveBeenCalled();
    expect(r.falhou).toBe(true);
    expect(r.erro).toContain('Sem lista de medicamentos');
  });

  it('erro inesperado na coleta não lança: vira ciclo com problema', async () => {
    const r = await executarCiclo(deps({ coletar: async () => { throw new Error('banco caiu'); } }));
    expect(r.falhou).toBe(true);
    expect(r.erro).toBe('banco caiu');
  });

  it('resume por fonte sem expor nada além dos números e do erro', async () => {
    const r = await executarCiclo(
      deps({
        coletar: async () => ({
          falhou: true,
          resultados: [
            { fonte: 'lomadee', resumo: { coletadas: 3, ilegiveis: 0, bloqueadas: 1, categoriaIgnorada: 0, lojaNaoAprovada: 0, erros: 0, decisoes: { notificar: 0, aguardar_aprovacao: 0, somente_feed: 0, descartar: 0 }, alertasCriados: 0, alertasSuprimidos: 0 } },
            { fonte: 'outra', erro: 'Fonte outra sem credencial gravada' },
          ],
        }),
      }),
    );
    expect(r.fontes).toEqual([
      { fonte: 'lomadee', coletadas: 3, bloqueadas: 1, erros: 0 },
      { fonte: 'outra', erro: 'Fonte outra sem credencial gravada' },
    ]);
  });
});

describe('repetição dos ciclos', () => {
  const ok: ResumoCiclo = { inicio: '', fim: '', listaAtualizada: false, falhou: false, fontes: [] };

  it('repete até o sinal e dorme o intervalo entre os ciclos', async () => {
    const parar = new AbortController();
    const dormidas: number[] = [];
    let n = 0;
    await rodarCiclos({
      intervaloMs: 1000,
      sinal: parar.signal,
      ciclo: async () => { n++; return ok; },
      dormir: async (ms) => { dormidas.push(ms); if (n === 3) parar.abort(); },
    });
    expect(n).toBe(3);
    expect(dormidas).toHaveLength(3);
    expect(dormidas.every((ms) => ms <= 1000 && ms > 900)).toBe(true);
  });

  it('sinal já abortado: não roda nenhum ciclo', async () => {
    const parar = new AbortController();
    parar.abort();
    const ciclo = vi.fn(async () => ok);
    await rodarCiclos({ intervaloMs: 1, sinal: parar.signal, ciclo, dormir: async () => undefined });
    expect(ciclo).not.toHaveBeenCalled();
  });

  it('erro ao gravar o estado do ciclo não para o coletor', async () => {
    const parar = new AbortController();
    let n = 0;
    await rodarCiclos({
      intervaloMs: 1,
      sinal: parar.signal,
      ciclo: async () => { n++; if (n === 2) parar.abort(); return ok; },
      aoTerminarCiclo: async () => { throw new Error('disco cheio'); },
      dormir: async () => undefined,
    });
    expect(n).toBe(2);
  });

  it('parar durante o ciclo não dorme de novo', async () => {
    const parar = new AbortController();
    const dormir = vi.fn(async () => undefined);
    await rodarCiclos({ intervaloMs: 1000, sinal: parar.signal, ciclo: async () => { parar.abort(); return ok; }, dormir });
    expect(dormir).not.toHaveBeenCalled();
  });

  it('ciclo que nem coletou tenta de novo mais cedo; erro numa oferta não', async () => {
    const dormidas: number[] = [];
    for (const r of [{ ...ok, fontes: [{ fonte: 'l', erro: 'sem credencial' }] }, { ...ok, fontes: [{ fonte: 'l', coletadas: 5, erros: 2 }], falhou: true }]) {
      const parar = new AbortController();
      await rodarCiclos({
        intervaloMs: 7_200_000,
        novaTentativaMs: 900_000,
        sinal: parar.signal,
        ciclo: async () => r,
        dormir: async (ms) => { dormidas.push(ms); parar.abort(); },
      });
    }
    expect(dormidas[0]).toBeLessThanOrEqual(900_000);
    expect(dormidas[1]).toBeGreaterThan(7_000_000);
    expect(naoChegouAColetar({ ...ok, erro: 'x' })).toBe(true);
    expect(naoChegouAColetar(ok)).toBe(false);
  });
});
