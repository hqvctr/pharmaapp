import { describe, expect, it } from 'vitest';
import { tamanhoFralda } from './fralda.js';

describe('tamanhoFralda', () => {
  it.each([
    ['Fralda Marca Z G 36 Unidades', 'G'],
    ['Fraldas Pampers Confort Sec Tamanho M 80 unidades', 'M'],
    ['Fralda Huggies Supreme Care XXG 58 un', 'XXG'],
    ['Fralda Turma da Mônica EG 30 Fraldas', 'XG'],
    ['Fralda Marca Q EXG 24 Unidades', 'XXG'],
    ['Fralda Recém-Nascido Marca Z 20 unidades', 'RN'],
    ['Fralda-Calça Marca W XG 28un', 'XG'],
  ])('%s → %s', (titulo, esperado) => {
    expect(tamanhoFralda(titulo)).toBe(esperado);
  });

  it.each([
    'Lenço Umedecido Marca Y 100 Unidades',
    'Shampoo Infantil Marca Y 400ml',
    'Kit Fralda P e M 2 pacotes',
    'Fralda Marca Z 36 Unidades',
    'Pomada para Assadura M 45g',
  ])('sem tamanho único ou fora de fralda: %s', (titulo) => {
    expect(tamanhoFralda(titulo)).toBeNull();
  });
});
