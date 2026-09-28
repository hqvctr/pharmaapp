// Tamanho da fralda, extraído do título (a Lomadee não informa). Serve para a mãe receber só o
// tamanho que usa. Na dúvida (nenhum ou mais de um tamanho no título) devolve null e a oferta
// aparece para todos os tamanhos: perder uma promoção é pior que mostrar uma a mais.
import { normalizarTexto } from './medicamentos.js';

export const TAMANHOS_FRALDA = ['RN', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG'] as const;
export type TamanhoFralda = (typeof TAMANHOS_FRALDA)[number];

export const ROTULOS_TAMANHO_FRALDA: Record<TamanhoFralda, string> = {
  RN: 'RN (recém-nascido)',
  P: 'P',
  M: 'M',
  G: 'G',
  XG: 'XG / EG',
  XXG: 'XXG / EXG',
  XXXG: 'XXXG',
};

// Grafias por marca: EG = XG, EXG = XXG.
const SINONIMOS: Record<string, TamanhoFralda> = {
  rn: 'RN',
  p: 'P',
  m: 'M',
  g: 'G',
  xg: 'XG',
  eg: 'XG',
  xxg: 'XXG',
  exg: 'XXG',
  xxxg: 'XXXG',
};

export function tamanhoFralda(titulo: string): TamanhoFralda | null {
  const palavras = normalizarTexto(titulo).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  if (!palavras.some((p) => p === 'fralda' || p === 'fraldas')) return null;
  const achados = new Set<TamanhoFralda>();
  palavras.forEach((p, i) => {
    const t = SINONIMOS[p];
    if (t !== undefined) achados.add(t);
    // "recém-nascido" por extenso.
    if (p === 'recem' && palavras[i + 1] === 'nascido') achados.add('RN');
  });
  return achados.size === 1 ? [...achados][0]! : null;
}
