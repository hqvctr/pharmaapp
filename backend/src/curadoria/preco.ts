import type { Condicao, Embalagem } from './tipos.js';

/** Centavos por unidade base (kg, l ou un). */
export function precoPorUnidade(precoCentavos: number, embalagem: Embalagem): number {
  if (!(embalagem.quantidade > 0)) throw new Error('Embalagem com quantidade não positiva');
  return precoCentavos / embalagem.quantidade;
}

/** Quantas embalagens a condição obriga a comprar para obter o preço anunciado. */
export function embalagensNaCompraMinima(condicao: Condicao | null): number {
  if (condicao === null) return 1;
  switch (condicao.tipo) {
    case 'leve_pague':
      return condicao.leve;
    case 'quantidade_minima':
      return condicao.quantidade;
    case 'cartao_fidelidade':
    case 'app_da_rede':
      return 1;
  }
}

/**
 * Preço efetivo por unidade de medida sob a condição.
 * Leve 3 pague 2 a R$ 10: paga R$ 20 por 3 embalagens.
 */
export function precoEfetivoPorUnidade(precoCentavos: number, embalagem: Embalagem, condicao: Condicao | null): number {
  const base = precoPorUnidade(precoCentavos, embalagem);
  if (condicao?.tipo === 'leve_pague') {
    if (!(condicao.leve > condicao.pague && condicao.pague > 0)) throw new Error('Condição leve/pague inválida');
    return (base * condicao.pague) / condicao.leve;
  }
  return base;
}

/** Texto que obrigatoriamente acompanha a oferta condicional no feed e na notificação. */
export function rotuloCondicao(condicao: Condicao | null): string | null {
  if (condicao === null) return null;
  switch (condicao.tipo) {
    case 'leve_pague':
      return `Leve ${condicao.leve}, pague ${condicao.pague}`;
    case 'cartao_fidelidade':
      return `Preço com cartão fidelidade ${condicao.programa}`;
    case 'app_da_rede':
      return 'Preço exclusivo no app da rede';
    case 'quantidade_minima':
      return `Preço na compra de ${condicao.quantidade} unidades`;
  }
}
