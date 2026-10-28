import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HttpGravado } from './gravacoes.js';
import { fabricaLomadee, LomadeeAdapter, parseProduto } from './lomadee.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = { baseUrl: 'https://api.exemplo.test/', organizacoes: ['9001', '9002'], tamanhoPagina: 100, maxPaginas: 20 };

const opcao = (o: Record<string, unknown> = {}) => ({
  id: 'o1', ean: '7891234567895', name: '', available: true,
  categories: [{ name: 'Cabelos' }], brands: [{ name: 'Marca Y' }], pricing: [{ listPrice: 3000, price: 2590 }], ...o,
});
const produto = (p: Record<string, unknown> = {}, opcoes: unknown[] = [opcao()]) => ({
  organizationId: 'org-1', id: 'p1', available: true, name: 'Shampoo Hidratante 400ml',
  description: '<p>Para <b>todos</b> os cabelos &amp; mais</p>', url: 'https://loja.test/p1', options: opcoes, ...p,
});

describe('adaptador Lomadee (respostas gravadas)', () => {
  it('percorre as páginas de cada marca pelo count e separa itens ilegíveis', async () => {
    const http = new HttpGravado(path.join(RAIZ, 'fixtures/lomadee/promocao'));
    const r = await new LomadeeAdapter(http, config).coletar();
    expect(http.pedidos).toEqual(['org-9001-pagina-1.json', 'org-9001-pagina-2.json', 'org-9002-pagina-1.json']);
    expect(r.ofertas).toHaveLength(7);
    expect(r.ilegiveis).toHaveLength(1);
    expect(r.ilegiveis[0]!.erro).toContain('pricing');
  });

  it('pede só disponíveis, com a marca e o tamanho de página', async () => {
    const pedidos: URL[] = [];
    const http = { get: async (u: URL) => { pedidos.push(u); return { data: [], count: 0 }; } };
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

  it('para ao receber página vazia mesmo que o count prometa mais', async () => {
    let chamadas = 0;
    const http = { get: async () => { chamadas++; return { data: [], count: 50 }; } };
    await new LomadeeAdapter(http, { ...config, organizacoes: ['9001'] }).coletar();
    expect(chamadas).toBe(1);
  });
});

describe('parseProduto', () => {
  it('usa o preço em centavos como veio (sem converter) e o ean como GTIN', () => {
    const { ofertas, erros } = parseProduto(produto());
    expect(erros).toEqual([]);
    expect(ofertas).toHaveLength(1);
    expect(ofertas[0]).toMatchObject({
      idExterno: 'p1:o1', titulo: 'Shampoo Hidratante 400ml', gtin: '7891234567895', marca: 'Marca Y', precoCentavos: 2590,
      categoriaFonte: 'Cabelos', lojaIdExterno: 'org-1', link: 'https://loja.test/p1', linkAfiliado: false, disponivel: true,
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

  it('categoria e marca aceitam texto simples', () => {
    const o = parseProduto(produto({}, [opcao({ categories: ['Cabelos'], brands: ['Y'] })])).ofertas[0]!;
    expect([o.categoriaFonte, o.marca]).toEqual(['Cabelos', 'Y']);
  });

  it('sem categoria ou marca não quebra', () => {
    const o = parseProduto(produto({}, [opcao({ categories: [], brands: [] })])).ofertas[0]!;
    expect([o.categoriaFonte, o.marca]).toEqual(['', null]);
  });

  it.each([
    ['sem opções', produto({ options: [] }), 'options'],
    ['sem url', produto({ url: undefined }), 'url'],
    ['sem organizationId', produto({ organizationId: undefined }), 'organizationId'],
    ['preço não inteiro (reais em vez de centavos)', produto({}, [opcao({ pricing: [{ price: 25.9 }] })]), 'pricing'],
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
    const http = { get: async () => ({ data: [], count: 0 }) };
    expect(() => fabricaLomadee.criar({ http, config: { baseUrl: 'https://x.test/', tamanhoPagina: 101, maxPaginas: 5 }, credenciais: {}, lojas: [] })).toThrow(/tamanhoPagina/);
  });
});
