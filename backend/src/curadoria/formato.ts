import type { Unidade } from './tipos.js';

// Formatação manual para ser idêntica em qualquer build do Node (Intl varia com a ICU instalada).

export function reais(centavos: number): string {
  const negativo = centavos < 0;
  const inteiro = Math.round(Math.abs(centavos));
  const reaisParte = Math.floor(inteiro / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = (inteiro % 100).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${reaisParte},${cents}`;
}

export function reaisPorUnidade(centavos: number, unidade: Unidade): string {
  return `${reais(centavos)}/${unidade}`;
}

export function percentual(fracao: number): string {
  return `${(fracao * 100).toFixed(1).replace('.', ',')}%`;
}
