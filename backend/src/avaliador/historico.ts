// P1: a coleta roda várias vezes ao dia, mas o motor recebe UMA observação por dia fechado,
// com o menor preço por unidade do dia, no fuso de São Paulo. O dia corrente é a própria oferta
// e não entra no histórico. Assim "N observações" (`curadoria.minObservacoes`) significa N dias com observação.
import type { ObservacaoPreco, Unidade } from '../curadoria/tipos.js';

export const FUSO_PADRAO = 'America/Sao_Paulo';

export interface LinhaHistorico {
  observadoEm: Date;
  precoPorUnidade: number;
}

const formatadores = new Map<string, Intl.DateTimeFormat>();

/** "AAAA-MM-DD" do instante no fuso dado. */
export function diaLocal(instante: Date, fuso: string): string {
  let f = formatadores.get(fuso);
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatadores.set(fuso, f);
  }
  return f.format(instante);
}

export function agregarPorDia(
  linhas: readonly LinhaHistorico[],
  unidade: Unidade,
  agora: Date,
  fuso: string = FUSO_PADRAO,
): ObservacaoPreco[] {
  const hoje = diaLocal(agora, fuso);
  const porDia = new Map<string, { menor: number; ultimoInstante: number }>();
  for (const l of linhas) {
    const dia = diaLocal(l.observadoEm, fuso);
    if (dia >= hoje) continue;
    const atual = porDia.get(dia);
    const t = l.observadoEm.getTime();
    porDia.set(dia, {
      menor: atual === undefined ? l.precoPorUnidade : Math.min(atual.menor, l.precoPorUnidade),
      ultimoInstante: atual === undefined ? t : Math.max(atual.ultimoInstante, t),
    });
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => ({
      observadoEm: new Date(v.ultimoInstante),
      // O motor recebe preço por unidade como se fosse uma embalagem de 1 unidade base.
      precoCentavos: v.menor,
      embalagem: { quantidade: 1, unidade },
    }));
}

export interface LinhaPreco {
  observadoEm: Date;
  precoCentavos: number;
}

export interface Prova {
  menorPrecoCentavos: number;
  maiorPrecoCentavos: number;
  diasMedidos: number;
}

/**
 * O que o motor mediu antes de avisar, para uma embalagem numa loja: menor e maior preço e quantos dias tiveram preço observado,
 * na mesma janela do motor (dias fechados, sem o dia corrente, até `janelaDias` para trás). `null` quando não há observação.
 */
export function calcularProva(linhas: readonly LinhaPreco[], agora: Date, fuso: string, janelaDias: number): Prova | null {
  const hoje = diaLocal(agora, fuso);
  const inicio = agora.getTime() - janelaDias * 86_400_000;
  const dias = new Set<string>();
  let menor = Infinity;
  let maior = -Infinity;
  for (const l of linhas) {
    const dia = diaLocal(l.observadoEm, fuso);
    if (dia >= hoje || l.observadoEm.getTime() < inicio) continue;
    dias.add(dia);
    menor = Math.min(menor, l.precoCentavos);
    maior = Math.max(maior, l.precoCentavos);
  }
  return dias.size === 0 ? null : { menorPrecoCentavos: menor, maiorPrecoCentavos: maior, diasMedidos: dias.size };
}
