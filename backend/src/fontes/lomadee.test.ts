import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HttpGravado } from './gravacoes.js';
import { fabricaLomadee, LomadeeAdapter, parseProduto } from './lomadee.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = { baseUrl: 'https://api.exemplo.test/', organizacoes: ['9001', '9002'], tamanhoPagina: 100, maxPaginas: 20, categoriasGenericas: ['commerce_retail', 'industry_production'] };

const opcao = (o: Record<string, unknown> = {}) => ({
  id: 'o1', ean: '7891234567895', name: '', available: true,
  categories: [], brands: [{ name: 'Marca Y' }], pricing: [{ listPrice: 30, price: 25.9 }], ...o,
});
const produto = (p: Record<string, unknown> = {}, opcoes: unknown[] = [opcao()]) => ({
  organizationId: 'org-1', id: 'p1', available: true, name: 'Shampoo Hidratante 400ml',
  description: '<p>Para <b>todos</b> os cabelos &amp; mais</p>', url: 'https://loja.test/p1', options: opcoes,
  categories: [{ id: 240, name: 'commerce_retail' }, { id: 275, name: 'cosmetics' }], ...p,
});

describe('adaptador Lomadee (respostas gravadas)', () => {
  it('lê as marcas das respostas gravadas e separa itens ilegíveis', async () => {
    const http = new HttpGravado(path.join(RAIZ, 'fixtures/lomadee/promocao'));
    const r = await new LomadeeAdapter(http, config).coletar();
    expect(http.pedidos).toEqual(['org-9001-pagina-1.json', 'org-9002-pagina-1.json']);
    expect(r.ofertas).toHaveLength(7);
    expect(r.ilegiveis).toHaveLength(1);
    expect(r.ilegiveis[0]!.erro).toContain('pricing');
  });

  it('pede só disponíveis, com a marca e o tamanho de página', async () => {
    const pedidos: URL[] = [];
    const http = { get: async (u: URL) => { pedidos.push(u); return { data: [] }; } };
    await new LomadeeAdapter(http, { ...config, organizacoes: ['abc'] }).coletar();
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]!.pathname).toBe('/affiliate/products');
    expect(Object.fromEntries(pedidos[0]!.searchParams)).toEqual({ organizationIds: 'abc', isAvailable: 'true', page: '1', limit: '100' });
  });

  it('resposta fora do formato interrompe a coleta sem expor nada da URL', async () => {
    const http = { get: async () => ({ message: 'erro' }) };
    const erro = await new LomadeeAdapter(http, config).coletar().catch((e: Error) => e);
    expect((erro as Error).message).toBe('Lomadee marca 9001 página 1: resposta fora do formato esperado');
  });

  it('sem count: segue até a página que vem incompleta', async () => {
    const paginas = [Array.from({ length: 3 }, (_, i) => produto({ id: `a${i}` })), Array.from({ length: 3 }, (_, i) => produto({ id: `b${i}` })), [produto({ id: 'c0' })]];
    const pedidos: string[] = [];
    const http = { get: async (u: URL) => { pedidos.push(u.searchParams.get('page')!); return { data: paginas[pedidos.length - 1] ?? [] }; } };
    const r = await new LomadeeAdapter(http, { ...config, organizacoes: ['9001'], tamanhoPagina: 3 }).coletar();
    expect(pedidos).toEqual(['1', '2', '3']);
    expect(r.ofertas).toHaveLength(7);
  });

  it('respeita maxPaginas mesmo com páginas sempre cheias', async () => {
    let chamadas = 0;
    const http = { get: async () => { chamadas++; return { data: [produto(), produto({ id: 'p2' })] }; } };
    await new LomadeeAdapter(http, { ...config, organizacoes: ['9001'], tamanhoPagina: 2, maxPaginas: 4 }).coletar();
    expect(chamadas).toBe(4);
  });

  it('para ao receber página vazia', async () => {
    let chamadas = 0;
    const http = { get: async () => { chamadas++; return { data: [] }; } };
    await new LomadeeAdapter(http, { ...config, organizacoes: ['9001'] }).coletar();
    expect(chamadas).toBe(1);
  });
});

describe('parseProduto', () => {
  it('converte o preço em reais para centavos e usa o ean como GTIN', () => {
    const { ofertas, erros } = parseProduto(produto());
    expect(erros).toEqual([]);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0]).toMatchObject({
      idExterno: 'p1:o1', titulo: 'Shampoo Hidratante 400ml', gtin: '7891234567895', marca: 'Marca Y', precoCentavos: 2590,
      categoriaFonte: 'cosmetics', lojaIdExterno: 'org-1', link: 'https://loja.test/p1', linkAfiliado: false, disponivel: true,
      frete: { status: 'a_confirmar' },
    });
    expect(ofertas[0]!.descricao).toBe('Para todos os cabelos & mais');
  });

  it('uma oferta por opção, com o nome da opção no título quando ele ainda não aparece', () => {
    const { ofertas } = parseProduto(produto({}, [opcao({ id: 'a', name: '200ml' }), opcao({ id: 'b', name: '400ml' })]));
    expect(ofertas.map((o) => o.titulo)).toEqual(['Shampoo Hidratante 400ml 200ml', 'Shampoo Hidratante 400ml']);
  });

  it('ean que não é número de 8 a 14 dígitos vira nulo', () => {
    expect(parseProduto(produto({}, [opcao({ ean: '' })])).ofertas[0]!.gtin).toBeNull();
    expect(parseProduto(produto({}, [opcao({ ean: 'abc' })])).ofertas[0]!.gtin).toBeNull();
  });

  it('indisponível no produto ou na opção', () => {
    expect(parseProduto(produto({ available: false })).ofertas[0]!.disponivel).toBe(false);
    expect(parseProduto(produto({}, [opcao({ available: false })])).ofertas[0]!.disponivel).toBe(false);
  });

  it('categoria: a primeira que não é genérica, olhando o produto e depois a opção', () => {
    expect(parseProduto(produto({ categories: [{ name: 'commerce_retail' }, { name: 'medicines' }, { name: 'hygiene' }] })).ofertas[0]!.categoriaFonte).toBe('medicines');
    expect(parseProduto(produto({ categories: [] }, [opcao({ categories: ['hygiene'] })])).ofertas[0]!.categoriaFonte).toBe('hygiene');
  });

  it('só categorias genéricas: fica com a primeira; sem categoria: vazio', () => {
    expect(parseProduto(produto({ categories: [{ name: 'commerce_retail' }, { name: 'industry_production' }] })).ofertas[0]!.categoriaFonte).toBe('commerce_retail');
    expect(parseProduto(produto({ categories: [] })).ofertas[0]!.categoriaFonte).toBe('');
  });

  it('marca aceita texto simples ou fica nula', () => {
    expect(parseProduto(produto({}, [opcao({ brands: ['Y'] })])).ofertas[0]!.marca).toBe('Y');
    expect(parseProduto(produto({}, [opcao({ brands: [] })])).ofertas[0]!.marca).toBeNull();
  });

  it('centavos sem erro de ponto flutuante (19,9 e 0,29)', () => {
    expect(parseProduto(produto({}, [opcao({ pricing: [{ price: 19.9 }] })])).ofertas[0]!.precoCentavos).toBe(1990);
    expect(parseProduto(produto({}, [opcao({ pricing: [{ price: 0.29 }] })])).ofertas[0]!.precoCentavos).toBe(29);
  });

  it.each([
    ['sem opções', produto({ options: [] }), 'options'],
    ['sem url', produto({ url: undefined }), 'url'],
    ['sem organizationId', produto({ organizationId: undefined }), 'organizationId'],
    ['preço absurdo (provável erro de unidade)', produto({}, [opcao({ pricing: [{ price: 5_000_000 }] })]), 'pricing'],
    ['preço como texto', produto({}, [opcao({ pricing: [{ price: '25,90' }] })]), 'pricing'],
    ['preço zero', produto({}, [opcao({ pricing: [{ price: 0 }] })]), 'pricing'],
    ['sem preço', produto({}, [opcao({ pricing: [] })]), 'pricing'],
  ])('ilegível: %s', (_c, p, campo) => {
    const r = parseProduto(p);
    expect(r.ofertas).toHaveLength(0);
    expect(r.erros[0]).toContain(campo);
  });

  it('uma opção ruim não derruba as boas do mesmo produto', () => {
    const r = parseProduto(produto({}, [opcao({ id: 'ruim', pricing: [] }), opcao({ id: 'boa' })]));
    expect(r.ofertas.map((o) => o.idExterno)).toEqual(['p1:boa']);
    expect(r.erros).toHaveLength(1);
  });
});

describe('fábrica da Lomadee', () => {
  it('autentica com x-api-key e exige só a apiKey', () => {
    expect([...fabricaLomadee.credenciais]).toEqual(['apiKey']);
    expect(fabricaLomadee.cabecalhos!({ apiKey: 'lmd_x' })).toEqual({ 'x-api-key': 'lmd_x' });
  });
  it('limita o tamanho de página a 100 (regra da API)', () => {
    const http = { get: async () => ({ data: [] }) };
    expect(() => fabricaLomadee.criar({ http, config: { baseUrl: 'https://x.test/', tamanhoPagina: 101, maxPaginas: 5 }, credenciais: {}, lojas: [] })).toThrow(/tamanhoPagina/);
  });
});
