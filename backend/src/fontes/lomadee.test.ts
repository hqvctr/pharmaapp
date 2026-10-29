import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HttpGravado } from './gravacoes.js';
import { escolherImagem, escolherImagens, fabricaLomadee, LomadeeAdapter, parseProduto } from './lomadee.js';

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

describe('foto e variações (Lomadee)', () => {
  it('escolherImagem: a da opção vale mais; só https, sem espaço e até 2048 caracteres', () => {
    expect(escolherImagem({ images: [{ url: 'https://a.test/p.jpg' }] }, { images: [{ url: 'https://a.test/o.jpg' }] })).toBe('https://a.test/o.jpg');
    expect(escolherImagem({ images: [{ url: 'https://a.test/p.jpg' }] }, { images: [] })).toBe('https://a.test/p.jpg');
    expect(escolherImagem({ images: [{ url: 'http://a.test/p.jpg' }, { url: 'https://a.test/b c.jpg' }, { url: 'https://a.test/ok.jpg' }] }, {})).toBe('https://a.test/ok.jpg');
    expect(escolherImagem({ images: [{ url: `https://a.test/${'x'.repeat(2048)}` }] }, {})).toBeNull();
    expect(escolherImagem({ images: ['https://a.test/s.jpg'] }, null)).toBe('https://a.test/s.jpg');
    expect(escolherImagem({}, {})).toBeNull();
  });

  it('a foto do produto vai para a oferta', () => {
    const r = parseProduto(produto({ images: [{ url: 'https://a.test/p.jpg' }] }));
    expect(r.ofertas[0]!.imagemUrl).toBe('https://a.test/p.jpg');
    expect(parseProduto(produto()).ofertas[0]!.imagemUrl).toBeNull();
  });

  const variacoes = () => produto({ id: 'v1', name: 'Body Bebê' }, [
    opcao({ id: 'a', name: 'P', pricing: [{ price: 50 }] }),
    opcao({ id: 'b', name: 'M', pricing: [{ price: 39.9 }], images: [{ url: 'https://a.test/m.jpg' }] }),
    opcao({ id: 'c', name: 'G', pricing: [{ price: 29.9 }], available: false }),
    opcao({ id: 'd', name: 'GG', pricing: [{ price: 0 }] }),
  ]);

  it('sem colapsar: uma oferta por variação, como antes', () => {
    const r = parseProduto(variacoes());
    expect(r.ofertas.map((x) => x.idExterno)).toEqual(['v1:a', 'v1:b', 'v1:c']);
    expect(r.erros).toHaveLength(1);
  });

  it('colapsando: uma oferta, a da variação disponível mais barata, com o nome do produto, o id do produto e sem EAN', () => {
    const r = parseProduto(variacoes(), undefined, true);
    expect(r.erros).toEqual([]);
    expect(r.ofertas).toHaveLength(1);
    expect(r.ofertas[0]).toMatchObject({ idExterno: 'v1', titulo: 'Body Bebê', precoCentavos: 3990, gtin: null, imagemUrl: 'https://a.test/m.jpg' });
  });

  it('colapsando, produto de uma opção só segue o caminho normal (id composto e EAN)', () => {
    const r = parseProduto(produto(), undefined, true);
    expect(r.ofertas[0]).toMatchObject({ idExterno: 'p1:o1', gtin: '7891234567895' });
  });

  it('colapsando sem nenhuma variação disponível e com preço válido: erro, nenhuma oferta', () => {
    const r = parseProduto(produto({}, [opcao({ id: 'a', available: false }), opcao({ id: 'b', pricing: [{ price: -1 }] })]), undefined, true);
    expect(r.ofertas).toEqual([]);
    expect(r.erros).toEqual(['nenhuma opção disponível com preço válido']);
  });

  it('a fábrica liga o colapso só com colapsarOpcoes === true', () => {
    const http = { get: async () => ({ data: [variacoes()] }) };
    const cria = (extra: Record<string, unknown>) => fabricaLomadee.criar({ http, config: { baseUrl: 'https://x.test/', tamanhoPagina: 100, maxPaginas: 1, ...extra }, lojas: ['org-1'] } as never);
    return Promise.all([cria({ colapsarOpcoes: true }).coletar(), cria({ colapsarOpcoes: 'sim' }).coletar(), cria({}).coletar()]).then(([a, b, c]) => {
      expect(a.ofertas).toHaveLength(1);
      expect(b.ofertas).toHaveLength(3);
      expect(c.ofertas).toHaveLength(3);
    });
  });
});

describe('várias fotos (Lomadee)', () => {
  it('escolherImagens: as da opção primeiro, depois as do produto, sem repetir, só https, até 6', () => {
    const p = { images: [{ url: 'https://a.test/1.jpg' }, { url: 'https://a.test/2.jpg' }, { url: 'http://a.test/x.jpg' }] };
    const o = { images: [{ url: 'https://a.test/2.jpg' }, { url: 'https://a.test/o.jpg' }] };
    expect(escolherImagens(p, o)).toEqual(['https://a.test/2.jpg', 'https://a.test/o.jpg', 'https://a.test/1.jpg']);
    const muitas = { images: Array.from({ length: 10 }, (_, i) => ({ url: `https://a.test/${i}.jpg` })) };
    expect(escolherImagens(muitas, {})).toHaveLength(6);
    expect(escolherImagens({}, null)).toEqual([]);
  });

  it('a oferta leva a lista e a primeira é a imagemUrl', () => {
    const r = parseProduto(produto({ images: [{ url: 'https://a.test/1.jpg' }, { url: 'https://a.test/2.jpg' }] }));
    expect(r.ofertas[0]!.imagensUrls).toEqual(['https://a.test/1.jpg', 'https://a.test/2.jpg']);
    expect(r.ofertas[0]!.imagemUrl).toBe('https://a.test/1.jpg');
    expect(parseProduto(produto()).ofertas[0]!.imagensUrls).toEqual([]);
  });
});
