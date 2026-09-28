import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HttpGravado } from './gravacoes.js';
import { LomadeeAdapter, parseOferta } from './lomadee.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = {
  baseUrl: 'https://api.lomadee.com/',
  appToken: 'TOKEN-SECRETO',
  sourceId: '123',
  lojas: ['9001', '9002'],
  tamanhoPagina: 100,
  maxPaginas: 20,
};

describe('adaptador Lomadee (respostas gravadas)', () => {
  it('percorre as páginas de cada loja e separa itens ilegíveis', async () => {
    const http = new HttpGravado(path.join(RAIZ, 'fixtures/lomadee/promocao'));
    const r = await new LomadeeAdapter(http, config).coletar();
    expect(http.pedidos).toEqual(['loja-9001-pagina-1.json', 'loja-9001-pagina-2.json', 'loja-9002-pagina-1.json']);
    expect(r.ofertas).toHaveLength(7);
    expect(r.ilegiveis).toHaveLength(1);
    expect(r.ilegiveis[0]!.erro).toContain('price');
    expect(r.completa).toBe(true);
  });

  it('corte por maxPaginas marca a coleta como incompleta', async () => {
    const http = new HttpGravado(path.join(RAIZ, 'fixtures/lomadee/promocao'));
    const r = await new LomadeeAdapter(http, { ...config, lojas: ['9001'], maxPaginas: 1 }).coletar();
    expect(http.pedidos).toEqual(['loja-9001-pagina-1.json']);
    expect(r.completa).toBe(false);
  });

  it('converte preço em reais para centavos sem erro de ponto flutuante', () => {
    const o = parseOferta({ id: 1, name: 'X', price: 19.9, link: 'l', category: { name: 'C' }, store: { id: 5 } });
    expect(o.precoCentavos).toBe(1990);
    expect(o.lojaIdExterno).toBe('5');
    expect(o.frete).toEqual({ status: 'a_confirmar' });
  });

  it('status diferente de OK interrompe a coleta sem expor o token', async () => {
    const http = { get: async () => ({ requestInfo: { status: 'ERROR' } }) };
    const erro = await new LomadeeAdapter(http, config).coletar().catch((e: Error) => e);
    expect(erro).toBeInstanceOf(Error);
    expect((erro as Error).message).not.toContain('TOKEN-SECRETO');
  });
});
