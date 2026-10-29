// Cartão de produto, ordens e filtros de GET /v1/produtos (contrato 1.3.0) contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { beforeEach, describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('cartão, ordens e filtros de produtos (Postgres)', () => {
  const t = ambienteDeTeste('teste_catalogo');
  const { e } = t;
  const navegar = (auth: Record<string, string>, qs: string) => t.chamar('GET', `/v1/produtos${qs}`, auth);
  const nomes = (r: { json(): { itens: Array<{ nome: string }> } }) => r.json().itens.map((i) => i.nome);
  // O banco é compartilhado entre os testes do arquivo: cada um começa sem oferta ativa.
  beforeEach(async () => {
    await e.pool.query(`UPDATE offers SET disponivel = false`);
  });

  async function comOferta(o: Parameters<typeof t.produto>[0] & { preco?: number } = {}) {
    const { loja, fonte } = await t.loja();
    const produto = await t.produto({ categoria: 'bebe', ...o });
    const oferta = await t.oferta({ produto, loja, fonte, preco: o.preco });
    return { produto, loja, fonte, oferta };
  }

  it('cartão: preço por unidade, número de lojas e a queda da oferta mais barata (nunca o "antes" de outra loja)', async () => {
    const p = await t.pessoa();
    const a = await comOferta({ nome: 'Fralda Duas Lojas', marca: 'A', marcaChave: 'a', preco: 6000 });
    const { loja, fonte } = await t.loja({ nome: 'PromoFarma' });
    const barata = await t.oferta({ produto: a.produto, loja, fonte, preco: 5400 });
    await t.alerta({ oferta: barata, loja, preco: 5400 });
    // Queda só na loja mais cara: o cartão mostra o preço da mais barata, então não mostra queda.
    const b = await comOferta({ nome: 'Fralda Queda Na Cara', marca: 'B', marcaChave: 'b', preco: 7000 });
    const lb = await t.loja({ nome: 'Outra' });
    await t.oferta({ produto: b.produto, loja: lb.loja, fonte: lb.fonte, preco: 6500 });
    await t.alerta({ oferta: b.oferta, loja: b.loja, preco: 7000 });
    // Alerta de outro preço (a oferta mudou de preço depois) não vale.
    const c = await comOferta({ nome: 'Fralda Alerta Velho', marca: 'C', marcaChave: 'c', preco: 5000 });
    await t.alerta({ oferta: c.oferta, loja: c.loja, preco: 4000 });

    const itens = (await navegar(p.auth, '?categoria=bebe&ordem=nome')).json().itens;
    const porNome = Object.fromEntries(itens.map((i: { nome: string }) => [i.nome, i]));
    expect(porNome['Fralda Duas Lojas']).toMatchObject({ menor_preco_centavos: 5400, menor_preco_por_unidade_centavos: 90, lojas: 2, queda: 0.3333, preco_referencia_centavos: 8982, menor_preco_180d: false, seguido: false, preco_ao_seguir_centavos: null });
    expect(porNome['Fralda Duas Lojas'].alerta_id).toEqual(expect.any(String));
    expect(porNome['Fralda Queda Na Cara']).toMatchObject({ menor_preco_centavos: 6500, lojas: 2, queda: null, preco_referencia_centavos: null, alerta_id: null });
    expect(porNome['Fralda Alerta Velho']).toMatchObject({ lojas: 1, queda: null });
  });

  it('menor preço em 180 dias: só com histórico de 14 dias e um preço maior antes; preço parado não conta', async () => {
    const p = await t.pessoa();
    const caiu = await comOferta({ nome: 'Lenço Caiu', marca: 'D', marcaChave: 'd', preco: 3000 }); // 50/un
    await t.historico(caiu.produto, caiu.loja, '2026-09-20T15:00:00Z', 70);
    await t.historico(caiu.produto, caiu.loja, '2026-10-31T15:00:00Z', 50);
    const novo = await comOferta({ nome: 'Lenço Novo', marca: 'E', marcaChave: 'e', preco: 3000 });
    await t.historico(novo.produto, novo.loja, '2026-10-25T15:00:00Z', 70); // só 7 dias de histórico
    await t.historico(novo.produto, novo.loja, '2026-10-31T15:00:00Z', 50);
    const parado = await comOferta({ nome: 'Lenço Parado', marca: 'F', marcaChave: 'f', preco: 3000 });
    await t.historico(parado.produto, parado.loja, '2026-09-20T15:00:00Z', 50);
    const subiu = await comOferta({ nome: 'Lenço Já Foi Mais Barato', marca: 'G', marcaChave: 'g', preco: 3000 });
    await t.historico(subiu.produto, subiu.loja, '2026-09-20T15:00:00Z', 40);
    await t.historico(subiu.produto, subiu.loja, '2026-10-20T15:00:00Z', 60);
    const velho = await comOferta({ nome: 'Lenço Mínimo Antigo', marca: 'H', marcaChave: 'h', preco: 3000 });
    await t.historico(velho.produto, velho.loja, '2026-03-01T15:00:00Z', 30); // fora da janela de 180 dias: não conta
    await t.historico(velho.produto, velho.loja, '2026-09-20T15:00:00Z', 70);

    const r = (await navegar(p.auth, '?categoria=bebe&ordem=nome')).json().itens;
    const menor = Object.fromEntries(r.map((i: { nome: string; menor_preco_180d: boolean }) => [i.nome, i.menor_preco_180d]));
    expect(menor).toEqual({ 'Lenço Caiu': true, 'Lenço Novo': false, 'Lenço Parado': false, 'Lenço Já Foi Mais Barato': false, 'Lenço Mínimo Antigo': true });
    expect(nomes(await navegar(p.auth, '?categoria=bebe&menor_preco_180d=true&ordem=nome'))).toEqual(['Lenço Caiu', 'Lenço Mínimo Antigo']);
  });

  it('ordens novas: maior queda, menor preço por unidade (mesma unidade junta) e mais novos', async () => {
    const p = await t.pessoa();
    const caro = await comOferta({ nome: 'Pacote 10', marca: 'I', marcaChave: 'i', quantidade: 10, preco: 1000 }); // 100/un (oferta grava preço/60)
    await e.pool.query(`UPDATE offers SET preco_por_unidade_centavos = 100 WHERE id = $1`, [caro.oferta]);
    const barato = await comOferta({ nome: 'Pacote 80', marca: 'J', marcaChave: 'j', quantidade: 80, preco: 4000 });
    await e.pool.query(`UPDATE offers SET preco_por_unidade_centavos = 50 WHERE id = $1`, [barato.oferta]);
    const litro = await comOferta({ nome: 'Shampoo 1 l', marca: 'K', marcaChave: 'k', quantidade: 1, unidade: 'l', preco: 2000 });
    await e.pool.query(`UPDATE offers SET preco_por_unidade_centavos = 1 WHERE id = $1`, [litro.oferta]);
    await t.alerta({ oferta: caro.oferta, loja: caro.loja, preco: 1000 });

    expect(nomes(await navegar(p.auth, '?categoria=bebe&ordem=menor_preco_unidade'))).toEqual(['Pacote 80', 'Pacote 10', 'Shampoo 1 l']);
    expect(nomes(await navegar(p.auth, '?categoria=bebe&ordem=maior_queda'))[0]).toBe('Pacote 10');
    expect(nomes(await navegar(p.auth, '?categoria=bebe&ordem=mais_novos'))).toEqual(['Shampoo 1 l', 'Pacote 80', 'Pacote 10']);
  });

  it('filtros: com queda, faixa de preço, loja, marca e ids; facetas de lojas e marcas na primeira página', async () => {
    const p = await t.pessoa();
    const x = await comOferta({ nome: 'Filtro X', marca: 'Marca X', marcaChave: 'marca-x', preco: 1000 });
    const y = await comOferta({ nome: 'Filtro Y', marca: 'Marca Y', marcaChave: 'marca-y', preco: 5000 });
    const z = await comOferta({ nome: 'Filtro Z', marca: 'Marca X', marcaChave: 'marca-x', preco: 9000 });
    await t.oferta({ produto: z.produto, loja: x.loja, fonte: x.fonte, preco: 9500 }); // Z também na loja de X
    await t.alerta({ oferta: y.oferta, loja: y.loja, preco: 5000 });

    expect(nomes(await navegar(p.auth, '?categoria=bebe&com_queda=true'))).toEqual(['Filtro Y']);
    expect(nomes(await navegar(p.auth, '?categoria=bebe&preco_min=2000&preco_max=9000&ordem=nome'))).toEqual(['Filtro Y', 'Filtro Z']);
    const naLoja = (await navegar(p.auth, `?categoria=bebe&loja_id=${x.loja}&ordem=nome`)).json().itens;
    // Com a loja escolhida, o preço é o daquela loja.
    expect(naLoja.map((i: { nome: string; menor_preco_centavos: number }) => [i.nome, i.menor_preco_centavos])).toEqual([['Filtro X', 1000], ['Filtro Z', 9500]]);
    expect(nomes(await navegar(p.auth, '?categoria=bebe&marca=marca-x&ordem=nome'))).toEqual(['Filtro X', 'Filtro Z']);
    expect(nomes(await navegar(p.auth, `?ids=${y.produto},${z.produto}&ordem=nome`))).toEqual(['Filtro Y', 'Filtro Z']);

    const comFacetas = (await navegar(p.auth, '?categoria=bebe&facetas=true')).json();
    expect(comFacetas.facetas.marcas).toEqual([{ chave: 'marca-x', nome: 'Marca X', quantidade: 2 }, { chave: 'marca-y', nome: 'Marca Y', quantidade: 1 }]);
    expect(comFacetas.facetas.lojas[0]).toMatchObject({ id: x.loja, quantidade: 2 });
    expect(comFacetas.facetas.lojas).toHaveLength(3);
    expect((await navegar(p.auth, '?categoria=bebe')).json().facetas).toBeUndefined();
    // Na pesquisa, filtro de preço tira o produto sem preço na área.
    expect(nomes(await t.chamar('GET', '/v1/produtos?q=filtro&com_queda=true', p.auth))).toEqual(['Filtro Y']);

    for (const qs of ['?ordem=popular', '?loja_id=x', '?marca=Com%20Espaço', '?preco_min=-1', '?preco_min=10&preco_max=5', '?com_queda=sim', '?ids=', `?ids=${'x,'.repeat(3)}`, '?facetas=1']) {
      expect((await navegar(p.auth, qs)).statusCode, qs).toBe(422);
    }
  });

  it('"Para você": quedas primeiro, depois menor preço em 180 dias, depois o resto alternando categorias; só nas categorias da pessoa', async () => {
    const p = await t.pessoa({ categorias: ['bebe', 'mamae'] });
    const resto1 = await comOferta({ nome: 'Bebê Resto 1', marca: 'L', marcaChave: 'l' });
    const resto2 = await comOferta({ nome: 'Bebê Resto 2', marca: 'M', marcaChave: 'm' });
    await comOferta({ nome: 'Mamãe Resto', categoria: 'mamae', marca: 'N', marcaChave: 'n' });
    await comOferta({ nome: 'Infantil Fora', categoria: 'infantil', marca: 'O', marcaChave: 'o' });
    const menor = await comOferta({ nome: 'Mamãe Menor', categoria: 'mamae', marca: 'P', marcaChave: 'p', preco: 3000 });
    await t.historico(menor.produto, menor.loja, '2026-09-20T15:00:00Z', 70);
    await t.historico(menor.produto, menor.loja, '2026-10-31T15:00:00Z', 50);
    const queda = await comOferta({ nome: 'Bebê Queda', marca: 'Q', marcaChave: 'q' });
    await t.alerta({ oferta: queda.oferta, loja: queda.loja });
    void resto1; void resto2;

    const lista = nomes(await navegar(p.auth, '?ordem=para_voce'));
    expect(lista.slice(0, 2)).toEqual(['Bebê Queda', 'Mamãe Menor']);
    // Depois, o mais novo de cada categoria, depois o segundo: bebê e mamãe se alternam.
    expect(lista.slice(2)).toEqual(['Bebê Resto 2', 'Mamãe Resto', 'Bebê Resto 1']);
    expect(lista).not.toContain('Infantil Fora');
    // Paginação estável.
    const p1 = (await navegar(p.auth, '?ordem=para_voce&limite=3')).json();
    const p2 = (await navegar(p.auth, `?ordem=para_voce&limite=3&cursor=${p1.proximo_cursor}`)).json();
    expect([...p1.itens, ...p2.itens].map((i: { nome: string }) => i.nome)).toEqual(lista);
    // Com categoria escolhida, vale a categoria (mesmo fora das preferências).
    expect(nomes(await navegar(p.auth, '?ordem=para_voce&categoria=infantil'))).toEqual(['Infantil Fora']);
  });

  it('GET /v1/categorias conta o que dá para comprar agora por categoria, para o CEP dado ou os da pessoa', async () => {
    const p = await t.pessoa({ ceps: ['14020260'] });
    await comOferta({ nome: 'Conta Bebê 1', marca: 'Z1', marcaChave: 'z1' });
    await comOferta({ nome: 'Conta Bebê 2', marca: 'Z2', marcaChave: 'z2' });
    await comOferta({ nome: 'Conta Mamãe', categoria: 'mamae', marca: 'Z3', marcaChave: 'z3' });
    await comOferta({ nome: 'Conta Remédio', categoria: 'medicamentos_isentos', marca: 'Z4', marcaChave: 'z4' });
    const r = await t.chamar('GET', '/v1/categorias', p.auth);
    expect(r.statusCode).toBe(200);
    expect(r.json().categorias).toEqual([{ slug: 'gestacao', produtos: 0 }, { slug: 'mamae', produtos: 1 }, { slug: 'bebe', produtos: 2 }, { slug: 'infantil', produtos: 0 }]);
    // CEP fora da área de entrega das lojas do teste (01000000 a 19999999).
    expect((await t.chamar('GET', '/v1/categorias?cep=90000000', p.auth)).json().categorias.every((c: { produtos: number }) => c.produtos === 0)).toBe(true);
    expect((await t.chamar('GET', '/v1/categorias?cep=123', p.auth)).statusCode).toBe(422);
    expect((await t.chamar('GET', '/v1/categorias', {})).statusCode).toBe(401);
  });

  describe('GET /v1/inicio', () => {
    const seguir = (auth: Record<string, string>, produto: string) =>
      t.chamar('PUT', `/v1/seguidos/${produto}`, auth, { avisos: { promocao_excepcional: true, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false } });

    it('fileiras nas categorias da pessoa, na ordem do Início, sem fileira vazia; favoritos mais baratos desde que seguiu', async () => {
      const p = await t.pessoa({ categorias: ['bebe'] });
      const queda = await comOferta({ nome: 'Início Queda', marca: 'R', marcaChave: 'r' });
      await t.alerta({ oferta: queda.oferta, loja: queda.loja });
      const fralda = await comOferta({ nome: 'Início Fralda 80', subcategoria: 'fraldas', marca: 'S', marcaChave: 's', quantidade: 80, preco: 4000 });
      await comOferta({ nome: 'Início Fralda Avulsa', subcategoria: 'fraldas', marca: 'T', marcaChave: 't', quantidade: 1, preco: 100 });
      const menor = await comOferta({ nome: 'Início Menor', marca: 'U', marcaChave: 'u', preco: 3000 });
      await t.historico(menor.produto, menor.loja, '2026-09-20T15:00:00Z', 70);
      await t.historico(menor.produto, menor.loja, '2026-10-31T15:00:00Z', 50);
      await comOferta({ nome: 'Início Infantil', categoria: 'infantil', marca: 'V', marcaChave: 'v' });
      // Seguido de outra categoria: favoritos não dependem das categorias escolhidas.
      const fav = await comOferta({ nome: 'Início Favorito', categoria: 'infantil', marca: 'W', marcaChave: 'w', preco: 4500 });
      await t.historico(fav.produto, fav.loja, '2026-11-01T06:00:00Z', 90, 5000);
      expect((await seguir(p.auth, fav.produto)).statusCode).toBeLessThan(300);
      const favIgual = await comOferta({ nome: 'Início Favorito Igual', marca: 'X', marcaChave: 'x', preco: 5000 });
      await t.historico(favIgual.produto, favIgual.loja, '2026-11-01T06:00:00Z', 90, 5000);
      await seguir(p.auth, favIgual.produto);

      const r = await t.chamar('GET', '/v1/inicio', p.auth);
      expect(r.statusCode).toBe(200);
      const corpo = r.json();
      expect(corpo.cep).toBe('14020260');
      const porId = Object.fromEntries(corpo.fileiras.map((f: { id: string; itens: Array<{ nome: string }> }) => [f.id, f.itens.map((i) => i.nome)]));
      expect(corpo.fileiras.map((f: { id: string }) => f.id)).toEqual(['baixaram_de_preco', 'favoritos_mais_baratos', 'menor_preco_180d', 'por_unidade_bebe_fraldas', 'novidades']);
      expect(porId.baixaram_de_preco).toEqual(['Início Queda']);
      expect(porId.favoritos_mais_baratos).toEqual(['Início Favorito']);
      expect(corpo.fileiras[1].itens[0]).toMatchObject({ preco_ao_seguir_centavos: 5000, menor_preco_centavos: 4500, seguido: true });
      expect(porId.menor_preco_180d).toEqual(['Início Menor']);
      expect(porId.por_unidade_bebe_fraldas).toEqual(['Início Fralda 80']);
      expect(porId.novidades).not.toContain('Início Infantil');
      expect(porId.novidades[0]).toBe('Início Favorito Igual');
      expect(corpo.fileiras[3].ver_todas).toEqual({ categoria: 'bebe', subcategoria: 'fraldas', ordem: 'menor_preco_unidade' });
      expect(corpo.fileiras[1].ver_todas).toBeNull();
      void fralda;
    });

    it('sem CEP coberto não há fileira; termos pendentes; sem sessão', async () => {
      await comOferta({ nome: 'Início Longe', marca: 'Y', marcaChave: 'y' });
      const longe = await t.pessoa({ ceps: ['90000000'] });
      expect((await t.chamar('GET', '/v1/inicio', longe.auth)).json()).toEqual({ cep: '90000000', fileiras: [] });
      const sem = await t.pessoa({ ceps: [] });
      expect((await t.chamar('GET', '/v1/inicio', sem.auth)).json()).toEqual({ cep: null, fileiras: [] });
      expect((await t.chamar('GET', '/v1/inicio', (await t.pessoa({ termos: false })).auth)).json().codigo).toBe('termos_pendentes');
      expect((await t.chamar('GET', '/v1/inicio', {})).statusCode).toBe(401);
    });
  });
});
