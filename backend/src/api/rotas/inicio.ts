// GET /v1/inicio e GET /v1/categorias (openapi.yaml, tag produtos, acréscimos da 1.3.0). Exigem termos aceitos.
// O Início traz as fileiras numa chamada só; categorias conta o que dá para comprar agora em cada categoria (cadastro inicial).
import type { FastifyInstance } from 'fastify';
import { consultarProdutos, contarPorCategoria, type FiltroProdutos } from '../catalogo.js';
import { falhaDeValidacao } from '../corpo.js';
import { ErroApi } from '../erros.js';
import { preferenciasDaPessoa } from '../pessoa.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const POR_FILEIRA = 10;

export function rotaInicio(app: FastifyInstance, d: DepsAuth): void {
  /** Conta como uma navegação (o mesmo limite da navegação por categoria). */
  async function limitar(ctx: { userId: string; tenant: { config: { app: { limitesTaxa: Record<string, { maximo: number; janelaSegundos: number }> } } } }) {
    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa.navegacaoPorConta ?? { maximo: 120, janelaSegundos: 60 };
    const espera = await d.limitador.usar(`navegacaoPorConta:${ctx.userId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);
  }

  app.get('/v1/categorias', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    // Com `cep`, conta para aquele CEP (a pessoa ainda está digitando no cadastro); sem, para os CEPs do plano dela.
    if (q.cep !== undefined && (typeof q.cep !== 'string' || !/^[0-9]{8}$/.test(q.cep))) throw falhaDeValidacao([{ campo: 'cep', mensagem: 'Use 8 dígitos.' }]);
    await limitar(ctx);
    const ceps = typeof q.cep === 'string' ? [q.cep] : (await preferenciasDaPessoa(d.db, ctx.tenantId, ctx.userId, ctx.tenant.config.app, agora)).ceps;
    return { categorias: await contarPorCategoria(d.db, { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps }) };
  });

  app.get('/v1/inicio', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const cfg = ctx.tenant.config.app;
    await limitar(ctx);

    const { ceps, categorias } = await preferenciasDaPessoa(d.db, ctx.tenantId, ctx.userId, cfg, agora);
    const base = { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, offset: 0, limite: POR_FILEIRA };
    // As fileiras ficam nas categorias que a pessoa escolheu (todas, se nenhuma); "ver todas" abre a mesma lista no app.
    const minhas = categorias.length > 0 ? { categorias } : {};
    type Fileira = { id: string; titulo: string; filtro: Partial<FiltroProdutos> & Pick<FiltroProdutos, 'ordem'>; ver_todas: Record<string, unknown> | null };
    const fileiras: Fileira[] = [
      { id: 'baixaram_de_preco', titulo: 'Baixaram de preço', filtro: { ...minhas, comQueda: true, ordem: 'maior_queda' }, ver_todas: { ordem: 'maior_queda', com_queda: true } },
      { id: 'favoritos_mais_baratos', titulo: 'Seus favoritos ficaram mais baratos', filtro: { favoritosMaisBaratos: true, ordem: 'maior_queda' }, ver_todas: null },
      { id: 'menor_preco_180d', titulo: 'Menor preço em 180 dias', filtro: { ...minhas, menorPreco180d: true, ordem: 'maior_queda' }, ver_todas: { ordem: 'maior_queda', menor_preco_180d: true } },
      ...cfg.inicio.porUnidade
        .filter((u) => categorias.length === 0 || categorias.includes(u.categoria))
        .map((u): Fileira => ({
          id: `por_unidade_${u.categoria}_${u.subcategoria}`,
          titulo: u.titulo,
          filtro: { categoria: u.categoria, subcategoria: u.subcategoria, unidade: u.unidade, quantidadeMinima: u.quantidadeMinima, ordem: 'menor_preco_unidade' },
          ver_todas: { categoria: u.categoria, subcategoria: u.subcategoria, ordem: 'menor_preco_unidade' },
        })),
      { id: 'novidades', titulo: 'Novidades nas lojas', filtro: { ...minhas, ordem: 'mais_novos' }, ver_todas: { ordem: 'mais_novos' } },
    ];
    const resultados = await Promise.all(fileiras.map((f) => consultarProdutos(d.db, { ...base, ...f.filtro })));
    return {
      cep: ceps[0] ?? null,
      // Fileira sem item não vai: o Início nunca mostra uma fileira vazia.
      fileiras: fileiras
        .map((f, i) => ({ id: f.id, titulo: f.titulo, itens: resultados[i]!.itens, ver_todas: f.ver_todas }))
        .filter((f) => f.itens.length > 0),
    };
  });
}
