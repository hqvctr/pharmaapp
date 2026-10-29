// Lógica pura do painel do operador (painel/logica.js): o que a pessoa digita vira o que a API espera.
import { describe, expect, it } from 'vitest';
// @ts-expect-error arquivo JavaScript do navegador (sem tipos)
import { centavosParaReais, dataLocalParaIso, errosDaApi, lerQuantidade, montarPedidoOfertaManual, reaisParaCentavos, ROTULO_CODIGO } from '../painel/logica.js';

const valido = (extra: Record<string, unknown> = {}) => ({
  produtoModo: 'novo', produtoId: '', novo: { nome: ' Fralda G 60 un ', marca: ' Marca ', categoria: 'bebe', subcategoria: 'fraldas', gtin: '', quantidade: '60', unidade: 'un' },
  lojaId: 'loja-1', preco: '49,90', condicao: { tipo: '' }, frete: { status: 'a_confirmar' }, validaDe: '', validaAte: '', link: 'https://loja.test/x', linkAfiliado: false, ...extra,
});

describe('reaisParaCentavos', () => {
  it.each([
    ['49,90', 4990], ['49.90', 4990], ['49,9', 4990], ['50', 5000], ['0,01', 1], ['1.299,90', 129990], ['1299,90', 129990], ['R$ 12,50', 1250], [' 7 ', 700], ['1.000', 100000],
  ])('%s → %s', (texto, esperado) => expect(reaisParaCentavos(texto)).toBe(esperado));

  it.each(['', 'abc', '0', '0,00', '-5', '12,345', '1,2,3', '12,', ',50', '1.23', '1..000,00', null, undefined, '99999999999999999999'])('recusa %s', (texto) => {
    // "1.23" é lido como 1,23 (ponto decimal com 2 casas) e não é recusado: ver o caso abaixo.
    if (texto === '1.23') return expect(reaisParaCentavos(texto)).toBe(123);
    expect(reaisParaCentavos(texto)).toBeNull();
  });
});

describe('outras conversões', () => {
  it('centavos viram reais no formato do Brasil', () => expect(centavosParaReais(4990).replace(/\s/g, ' ')).toBe('R$ 49,90'));
  it('quantidade aceita vírgula e ponto e recusa zero e texto', () => {
    expect(lerQuantidade('0,4')).toBe(0.4);
    expect(lerQuantidade('60')).toBe(60);
    for (const t of ['0', '-1', 'x', '', null]) expect(lerQuantidade(t)).toBeNull();
  });
  it('data local vira ISO UTC; vazio é null; lixo é undefined', () => {
    expect(dataLocalParaIso('')).toBeNull();
    expect(dataLocalParaIso('2026-11-10T10:00')).toMatch(/^2026-11-10T\d\d:00:00\.000Z$/);
    expect(dataLocalParaIso('ontem')).toBeUndefined();
  });
  it('erros da API viram um mapa por campo e a mensagem geral', () => {
    expect(errosDaApi({ codigo: 'validacao', mensagem: 'Confira.', campos: [{ campo: 'link', mensagem: 'ruim' }, { campo: 'preco_centavos', mensagem: 'baixo' }] }))
      .toEqual({ campos: { link: 'ruim', preco_centavos: 'baixo' }, geral: 'Confira.' });
    expect(errosDaApi(null)).toEqual({ campos: {}, geral: 'Algo deu errado.' });
  });
  it('todo código de triagem tem um rótulo em português', () => {
    for (const c of ['NBCAL_VEDADO', 'NBCAL_CAUTELA', 'TERMO_DE_VENDA_CONTROLADA', 'MEDICAMENTO_SEM_REFERENCIA', 'MEDICAMENTO_DESLIGADO']) expect(ROTULO_CODIGO[c]).toBeTruthy();
  });
});

describe('montarPedidoOfertaManual', () => {
  it('produto novo simples: limpa os textos, converte o preço e deixa o fim de fora (prazo padrão)', () => {
    const r = montarPedidoOfertaManual(valido());
    expect(r.erros).toBeUndefined();
    expect(r.corpo).toEqual({
      produto_novo: { nome: 'Fralda G 60 un', marca: 'Marca', categoria: 'bebe', subcategoria: 'fraldas', gtin: null, embalagem: { quantidade: 60, unidade: 'un' } },
      loja_id: 'loja-1', preco_centavos: 4990, condicao: null, frete: { status: 'a_confirmar', centavos: null }, valida_de: null, link: 'https://loja.test/x', link_afiliado: false,
    });
    expect('valida_ate' in r.corpo).toBe(false);
  });

  it('produto que já existe manda só o id; sem escolher é erro', () => {
    expect(montarPedidoOfertaManual(valido({ produtoModo: 'existente', produtoId: 'abc' })).corpo.produto_id).toBe('abc');
    expect(montarPedidoOfertaManual(valido({ produtoModo: 'existente', produtoId: 'abc' })).corpo.produto_novo).toBeUndefined();
    expect(montarPedidoOfertaManual(valido({ produtoModo: 'existente', produtoId: '' })).erros).toEqual({ produto_id: 'Escolha um produto da busca.' });
  });

  it.each([
    ['leve_pague', { tipo: 'leve_pague', leve: '3', pague: '2' }, { tipo: 'leve_pague', leve: 3, pague: 2 }],
    ['quantidade_minima', { tipo: 'quantidade_minima', quantidade: '4' }, { tipo: 'quantidade_minima', quantidade: 4 }],
    ['cartao_fidelidade', { tipo: 'cartao_fidelidade', programa: ' Clube ' }, { tipo: 'cartao_fidelidade', programa: 'Clube' }],
    ['app_da_rede', { tipo: 'app_da_rede' }, { tipo: 'app_da_rede' }],
  ])('condição %s', (_n, entrada, saida) => expect(montarPedidoOfertaManual(valido({ condicao: entrada })).corpo.condicao).toEqual(saida));

  it('condições inválidas', () => {
    for (const c of [{ tipo: 'leve_pague', leve: '2', pague: '2' }, { tipo: 'leve_pague', leve: 'x', pague: '1' }, { tipo: 'leve_pague', leve: '3', pague: '0' }, { tipo: 'quantidade_minima', quantidade: '1' }, { tipo: 'cartao_fidelidade', programa: ' ' }]) {
      expect(Object.keys(montarPedidoOfertaManual(valido({ condicao: c })).erros), JSON.stringify(c)).toEqual(['condicao']);
    }
  });

  it('frete conhecido converte o valor; vazio vale zero; inválido é erro; sem frete não manda centavos', () => {
    expect(montarPedidoOfertaManual(valido({ frete: { status: 'conhecido', valor: '12,90' } })).corpo.frete).toEqual({ status: 'conhecido', centavos: 1290 });
    expect(montarPedidoOfertaManual(valido({ frete: { status: 'conhecido', valor: '' } })).corpo.frete).toEqual({ status: 'conhecido', centavos: 0 });
    expect(montarPedidoOfertaManual(valido({ frete: { status: 'conhecido', valor: 'caro' } })).erros).toEqual({ frete: 'Informe o frete em reais (ou 0).' });
    expect(montarPedidoOfertaManual(valido({ frete: { status: 'nao_se_aplica' } })).corpo.frete).toEqual({ status: 'nao_se_aplica', centavos: null });
  });

  it('datas: fim informado vai no corpo; fim antes do começo e data inválida são erros', () => {
    const ok = montarPedidoOfertaManual(valido({ validaDe: '2026-11-01T08:00', validaAte: '2026-11-10T10:00' }));
    expect(ok.corpo.valida_de).toMatch(/^2026-11-01T/);
    expect(ok.corpo.valida_ate).toMatch(/^2026-11-10T/);
    expect(montarPedidoOfertaManual(valido({ validaDe: '2026-11-10T10:00', validaAte: '2026-11-01T08:00' })).erros).toEqual({ valida_ate: 'O fim não pode ser antes do começo.' });
    expect(Object.keys(montarPedidoOfertaManual(valido({ validaDe: 'x', validaAte: 'y' })).erros).sort()).toEqual(['valida_ate', 'valida_de']);
  });

  it('link só https; afiliado só quando marcado; todos os erros de uma vez', () => {
    expect(montarPedidoOfertaManual(valido({ link: 'http://x.test' })).erros).toEqual({ link: 'Cole o link da oferta, começando por https://' });
    expect(montarPedidoOfertaManual(valido({ link: 'https://a b' })).erros).toBeDefined();
    expect(montarPedidoOfertaManual(valido({ linkAfiliado: true })).corpo.link_afiliado).toBe(true);
    const r = montarPedidoOfertaManual({ produtoModo: 'novo', novo: { nome: '', quantidade: '0', gtin: '12' }, lojaId: '', preco: '', link: '', condicao: { tipo: '' }, frete: {} });
    expect(Object.keys(r.erros).sort()).toEqual(['link', 'loja_id', 'preco_centavos', 'produto_novo.categoria', 'produto_novo.embalagem', 'produto_novo.gtin', 'produto_novo.nome']);
  });

  it('gtin válido e subcategoria vazia', () => {
    const r = montarPedidoOfertaManual(valido({ novo: { nome: 'X', marca: '', categoria: 'bebe', subcategoria: '', gtin: '7891234567895', quantidade: '1,5', unidade: 'kg' } }));
    expect(r.corpo.produto_novo).toEqual({ nome: 'X', marca: null, categoria: 'bebe', subcategoria: null, gtin: '7891234567895', embalagem: { quantidade: 1.5, unidade: 'kg' } });
  });
});
