import { describe, expect, it } from 'vitest';
import { categorizar, validarCategorizacao, type RegrasCategorizacao } from './categorizar.js';

const regras: RegrasCategorizacao = {
  regrasTexto: [
    { categoria: 'bebe', subcategoria: 'fraldas', termos: ['fralda*'] },
    { categoria: 'bebe', subcategoria: 'higiene', termos: ['lenco umedecido', 'lencos umedecidos', 'shampoo infantil'] },
    { categoria: 'bebe', subcategoria: 'roupas', termos: ['body*', 'bebe'], fonte: ['kids_clothing'] },
    { categoria: 'mamae', subcategoria: 'amamentacao', termos: ['bomba de leite'] },
    { categoria: 'infantil', termos: ['lego'] },
  ],
  porCategoriaFonte: { kids_clothing: { categoria: 'infantil', subcategoria: 'roupas' } },
  porMarca: { 'loja-brinquedo': { categoria: 'infantil', subcategoria: 'brinquedos' } },
};
const o = (titulo: string, categoriaFonte = 'x', lojaIdExterno = 'outra') => ({ titulo, categoriaFonte, lojaIdExterno });

describe('categorizar', () => {
  it('termo com * casa pelo começo da palavra; sem *, só a palavra inteira', () => {
    expect(categorizar(o('Fraldas Pampers G 60un'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'fraldas' });
    expect(categorizar(o('Fralda Huggies'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'fraldas' });
    expect(categorizar(o('Legolas Verde'), regras)).toBeNull(); // "lego" não casa com "legolas"
    expect(categorizar(o('Kit LEGO City'), regras)).toEqual({ categoria: 'infantil', subcategoria: null });
  });

  it('ignora acento e caixa, e termo de várias palavras casa como sequência', () => {
    expect(categorizar(o('Lenço Umedecido Huggies 96un'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'higiene' });
    expect(categorizar(o('Umedecido para lenço'), regras)).toBeNull();
    expect(categorizar(o('BOMBA DE LEITE elétrica'), regras)).toEqual({ categoria: 'mamae', subcategoria: 'amamentacao' });
  });

  it('a primeira regra que casa vence', () => {
    expect(categorizar(o('Fralda Shampoo Infantil'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'fraldas' });
  });

  it('regra com fonte só vale naquela categoria da fonte', () => {
    expect(categorizar(o('Body manga longa', 'kids_clothing'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'roupas' });
    expect(categorizar(o('Body manga longa', 'outra'), regras)).toBeNull();
  });

  it('sem regra de texto, vale a categoria da fonte; depois a loja; senão nada', () => {
    expect(categorizar(o('Vestido listrado', 'Kids_Clothing'), regras)).toEqual({ categoria: 'infantil', subcategoria: 'roupas' });
    expect(categorizar(o('Carrinho X', 'toys', 'loja-brinquedo'), regras)).toEqual({ categoria: 'infantil', subcategoria: 'brinquedos' });
    expect(categorizar(o('Coisa qualquer', 'x', 'outra'), regras)).toBeNull();
  });

  it('o texto vence a categoria da fonte, e a categoria da fonte vence a loja', () => {
    expect(categorizar(o('Fralda de pano', 'kids_clothing', 'loja-brinquedo'), regras)).toEqual({ categoria: 'bebe', subcategoria: 'fraldas' });
    expect(categorizar(o('Vestido', 'kids_clothing', 'loja-brinquedo'), regras)).toEqual({ categoria: 'infantil', subcategoria: 'roupas' });
  });
});

describe('validarCategorizacao', () => {
  const validas = new Map([['bebe', new Set(['fraldas', 'higiene'])], ['infantil', new Set<string>()]]);
  const ok = { regrasTexto: [{ categoria: 'bebe', subcategoria: 'fraldas', termos: ['Fralda*'] }], porCategoriaFonte: { Toys: { categoria: 'infantil' } }, porMarca: { m1: { categoria: 'bebe' } } };

  it('aceita um bloco válido e normaliza a chave da categoria da fonte', () => {
    const r = validarCategorizacao(ok, 'fontes.lomadee.categorizacao', validas);
    expect(r.regrasTexto).toEqual([{ categoria: 'bebe', subcategoria: 'fraldas', termos: ['Fralda*'] }]);
    expect(Object.keys(r.porCategoriaFonte)).toEqual(['toys']);
    expect(r.porMarca).toEqual({ m1: { categoria: 'bebe' } });
  });

  it.each([
    ['categoria que o app não tem', { ...ok, regrasTexto: [{ categoria: 'luxo', termos: ['x'] }] }, 'regrasTexto[0].categoria'],
    ['subcategoria que a categoria não tem', { ...ok, regrasTexto: [{ categoria: 'bebe', subcategoria: 'brinquedos', termos: ['x'] }] }, 'regrasTexto[0].subcategoria'],
    ['subcategoria em categoria sem subcategorias', { ...ok, porMarca: { m1: { categoria: 'infantil', subcategoria: 'a' } } }, 'porMarca.m1.subcategoria'],
    ['regra sem termos', { ...ok, regrasTexto: [{ categoria: 'bebe', termos: [] }] }, 'regrasTexto[0].termos'],
    ['termo só com asterisco', { ...ok, regrasTexto: [{ categoria: 'bebe', termos: ['*'] }] }, 'regrasTexto[0].termos'],
    ['fonte vazia', { ...ok, regrasTexto: [{ categoria: 'bebe', termos: ['x'], fonte: [] }] }, 'regrasTexto[0].fonte'],
    ['regrasTexto ausente', { porMarca: {} }, 'regrasTexto'],
    ['porMarca que não é objeto', { ...ok, porMarca: [] }, 'porMarca'],
  ])('rejeita %s', (_nome, bloco, trecho) => {
    expect(() => validarCategorizacao(bloco, 'fontes.lomadee.categorizacao', validas)).toThrow(trecho);
  });

  it('rejeita bloco que não é objeto', () => {
    expect(() => validarCategorizacao(null, 'x', validas)).toThrow('Config inválida: x.(bloco)');
  });
});
