import { describe, expect, it } from 'vitest';
import { extrairEmbalagem, removerEmbalagem } from './embalagem.js';

describe('extração de embalagem do título', () => {
  it.each([
    ['Shampoo Marca Y 400ml', 0.4, 'l'],
    ['Arroz Tipo 1 5kg', 5, 'kg'],
    ['Café Torrado 500 g', 0.5, 'kg'],
    ['Leite Integral 1 Litro', 1, 'l'],
    ['Água Mineral 6 x 1,5L', 9, 'l'],
    ['Kit 2 Sabonete Líquido 250ml', 0.5, 'l'],
    ['Paracetamol 750mg 20 Comprimidos', 20, 'un'],
    ['Fralda Marca Z G 36 Unidades', 36, 'un'],
    ['Protetor Solar FPS 50 50ml', 0.05, 'l'],
  ] as const)('%s', (titulo, quantidade, unidade) => {
    const r = extrairEmbalagem(titulo);
    expect(r.identificada).toBe(true);
    expect(r.embalagem.unidade).toBe(unidade);
    expect(r.embalagem.quantidade).toBeCloseTo(quantidade, 6);
  });

  it('sem conteúdo no título: 1 unidade, marcada como não identificada', () => {
    expect(extrairEmbalagem('Batom Matte Vermelho')).toEqual({
      embalagem: { quantidade: 1, unidade: 'un' },
      identificada: false,
    });
  });

  it('família ignora embalagem: 250 g e 500 g do mesmo café caem na mesma família', () => {
    expect(removerEmbalagem('Café Torrado Marca Q 250g')).toBe(removerEmbalagem('Café Torrado Marca Q 500 g'));
  });
});
