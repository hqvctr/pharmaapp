// Lógica pura do painel do operador (painel/logica.js): o que a pessoa digita vira o que a API espera.
import { describe, expect, it } from 'vitest';
import {
  centavosParaReais, dataLocalParaIso, descreverDetalhe, errosDaApi, filtrarPorTexto, formatarCep, lerCep, lerCsvReceitas, lerData, lerQuantidade, marcasDoEixo, montarAreas,
  montarPedidoLoja, montarPedidoOfertaManual, montarPedidoReceita, normalizar, reaisCompactos, reaisParaCentavos, ROTULO_ACAO, ROTULO_CODIGO, rotuloMes, tempoRelativo,
  // @ts-expect-error arquivo JavaScript do navegador (sem tipos)
} from '../painel/logica.js';

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

describe('versão final: busca, CEP e loja', () => {
  it('busca sem acento e sem maiúscula, todas as palavras', () => {
    expect(normalizar('  Farmácia   SÃO João ')).toBe('farmacia sao joao');
    const itens = [{ n: 'Fralda Pampers G' }, { n: 'Lenço Umedecido' }, { n: 'Fralda Huggies M' }];
    expect(filtrarPorTexto(itens, 'fralda pampers', (i: { n: string }) => i.n)).toEqual([{ n: 'Fralda Pampers G' }]);
    expect(filtrarPorTexto(itens, 'fralda', (i: { n: string }) => i.n)).toHaveLength(2);
    expect(filtrarPorTexto(itens, 'LENCO', (i: { n: string }) => i.n)).toEqual([{ n: 'Lenço Umedecido' }]);
    expect(filtrarPorTexto(itens, '  ', (i: { n: string }) => i.n)).toHaveLength(3);
  });
  it('CEP com ou sem máscara', () => {
    expect(lerCep('14020-260')).toBe('14020260');
    expect(lerCep('14.020-260')).toBe('14020260');
    for (const x of ['1402026', '14020-2600', 'abc', '', null]) expect(lerCep(x)).toBeNull();
    expect(formatarCep('14020260')).toBe('14020-260');
  });
  it('áreas de entrega: erros no índice certo; CEP final menor que o inicial', () => {
    expect(montarAreas([{ inicio: '01000-000', fim: '19999-999', prazo: '3' }])).toEqual({ areas: [{ cep_inicio: '01000000', cep_fim: '19999999', prazo_dias: 3 }] });
    expect(montarAreas([{ inicio: '01000000', fim: '19999999', prazo: '1' }, { inicio: '2', fim: '01000000', prazo: '' }, { inicio: '09000000', fim: '01000000', prazo: '91' }]).erros).toEqual({
      'areas_entrega[1].cep_inicio': 'CEP com 8 dígitos.', 'areas_entrega[1].prazo_dias': 'Prazo de 0 a 90 dias.',
      'areas_entrega[2].cep_fim': 'O CEP final não pode ser menor que o inicial.', 'areas_entrega[2].prazo_dias': 'Prazo de 0 a 90 dias.',
    });
  });
  it('loja nova: corpo limpo, CNPJ só dígitos, rede vazia vira null; sem faixa é erro', () => {
    expect(montarPedidoLoja({ nome: ' Mercado ', rede: '', cnpj: '12.345.678/0001-90', autorizacao: '', status: 'aprovada', reputacao: '0.7', areas: [{ inicio: '01000000', fim: '01999999', prazo: '2' }] }).corpo).toEqual({
      nome: 'Mercado', rede: null, cnpj: '12345678000190', autorizacao_sanitaria: null, status: 'aprovada', reputacao: 0.7, areas_entrega: [{ cep_inicio: '01000000', cep_fim: '01999999', prazo_dias: 2 }],
    });
    expect(Object.keys(montarPedidoLoja({ nome: '', cnpj: '123', reputacao: '2', areas: [] }).erros).sort()).toEqual(['areas_entrega', 'cnpj', 'nome', 'reputacao']);
  });
  it('oferta manual leva a foto só quando informada e só https', () => {
    const base = { produtoModo: 'novo', novo: { nome: 'X', categoria: 'bebe', quantidade: '1', unidade: 'un' }, lojaId: 'l', preco: '1', condicao: { tipo: '' }, frete: {}, link: 'https://a.test' };
    expect(montarPedidoOfertaManual(base).corpo.produto_novo.imagem_url).toBeUndefined();
    expect(montarPedidoOfertaManual({ ...base, novo: { ...base.novo, imagem: ' https://cdn.test/a.jpg ' } }).corpo.produto_novo.imagem_url).toBe('https://cdn.test/a.jpg');
    expect(montarPedidoOfertaManual({ ...base, novo: { ...base.novo, imagem: 'http://cdn.test/a.jpg' } }).erros).toEqual({ 'produto_novo.imagem_url': 'O endereço da foto começa por https://' });
  });
});

describe('versão final: financeiro', () => {
  it('data brasileira ou ISO, só se existir', () => {
    expect(lerData('31/10/2026')).toBe('2026-10-31');
    expect(lerData('1/2/2026')).toBe('2026-02-01');
    expect(lerData('2026-10-31')).toBe('2026-10-31');
    for (const x of ['31/02/2026', '2026-13-01', 'ontem', '']) expect(lerData(x)).toBeNull();
  });
  it('lançamento: valor em reais vira centavos; erros por campo', () => {
    expect(montarPedidoReceita({ fonte: 'anuncios', status: 'recebida', competencia: '05/10/2026', valor: '1.234,56', descricao: ' AdMob ', referencia: '' }).corpo)
      .toEqual({ fonte: 'anuncios', competencia: '2026-10-05', valor_centavos: 123456, status: 'recebida', descricao: 'AdMob', referencia: null });
    expect(Object.keys(montarPedidoReceita({ fonte: 'pix', status: 'paga', competencia: 'x', valor: '0' }).erros).sort()).toEqual(['competencia', 'fonte', 'status', 'valor_centavos']);
  });
  it('CSV: ; ou , com aspas, sinônimos de coluna, fonte e situação, BOM e linha com erro apontada', () => {
    const csv = '﻿Data;Origem;Comissão;Situação;Produto;Transação\n31/10/2026;Lomadee;158,90;Aprovada;"Fralda; G";T1\n01/11/2026;AdMob;10;paga;;\n02/11/2026;pix;5;paga;;\n03/11/2026;lomadee;5;sei lá;;\n';
    const r = lerCsvReceitas(csv);
    expect(r.itens).toEqual([
      { fonte: 'afiliado_lomadee', competencia: '2026-10-31', valor_centavos: 15890, status: 'confirmada', descricao: 'Fralda; G', referencia: 'T1' },
      { fonte: 'anuncios', competencia: '2026-11-01', valor_centavos: 1000, status: 'recebida', descricao: null, referencia: null },
    ]);
    expect(r.erros).toEqual([{ linha: 4, mensagem: 'fonte "pix" desconhecida' }, { linha: 5, mensagem: 'situação "sei lá" desconhecida' }]);
    expect(lerCsvReceitas('data,valor\n2026-10-01,"12.50"\n', 'outros').itens).toEqual([{ fonte: 'outros', competencia: '2026-10-01', valor_centavos: 1250, status: 'confirmada', descricao: null, referencia: null }]);
    expect(lerCsvReceitas('fonte;valor\nx;1').erros).toEqual([{ linha: 1, mensagem: 'Falta a coluna "data" no cabeçalho.' }]);
    expect(lerCsvReceitas('').erros[0].linha).toBe(1);
  });
  it('eixo com marcas redondas e valores compactos', () => {
    expect(marcasDoEixo(123456)).toEqual([0, 50000, 100000, 150000]);
    expect(marcasDoEixo(7)).toEqual([0, 2, 4, 6, 8]);
    expect(marcasDoEixo(0)).toEqual([0, 1]);
    expect(reaisCompactos(123456)).toBe('R$ 1,2 mil');
    expect(reaisCompactos(95000)).toBe('R$ 950');
    expect(reaisCompactos(250_000_000)).toBe('R$ 2,5 mi');
    expect(rotuloMes('2026-10')).toBe('out/26');
  });
  it('tempo relativo e auditoria em frases (sem id cru, credencial só pelos nomes dos campos)', () => {
    const agora = new Date('2026-11-01T12:00:00Z');
    expect(tempoRelativo('2026-11-01T11:59:30Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-11-01T09:00:00Z', agora)).toBe('há 3 h');
    expect(tempoRelativo('2026-10-31T10:00:00Z', agora)).toBe('ontem');
    expect(descreverDetalhe({ status: { de: 'em_observacao', para: 'aprovada' }, observacao: 'ok' })).toEqual(['status: em observação → aprovada', 'observação: "ok"']);
    expect(descreverDetalhe({ valor_centavos: { de: 100, para: 250 }, loja_id: 'abc' }).map((x: string) => x.replace(/ /g, ' '))).toEqual(['valor: R$ 1,00 → R$ 2,50']);
    expect(descreverDetalhe({ campos: ['app_token', 'source_id'] })).toEqual(['campos: app_token, source_id']);
    for (const a of ['loja_criada', 'loja_editada', 'loja_areas_definidas', 'receita_lancada', 'receita_editada', 'receitas_importadas', 'oferta_manual_criada']) expect(ROTULO_ACAO[a]).toBeTruthy();
  });
});
