// /v1/produtos, /v1/produtos/{id} e /v1/produtos/{id}/historico (openapi.yaml, tag produtos). Exigem termos aceitos.
import type { FastifyInstance } from 'fastify';
import { agregarPorDia, diaLocal } from '../../avaliador/historico.js';
import { normalizarTexto } from '../../normalizador/medicamentos.js';
import { produtoResumo } from '../alertas.js';
import { falhaDeValidacao } from '../corpo.js';
import { lerLimite, UUID } from '../cursor.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import type { ProvedorLinkOferta } from '../linkOferta.js';
import { ofertasAtuais, travasDeMarca, type OfertaLinha } from '../ofertas.js';
import { preferenciasDaPessoa } from '../pessoa.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const CATEGORIA = /^[a-z0-9_]+$/;
export const MAX_PALAVRAS = 6;

export interface DepsProdutos extends DepsAuth {
  links: ProvedorLinkOferta;
}

/** Escapa os curingas do LIKE: o texto da pessoa nunca vira padrão. */
export const escapar = (t: string): string => t.replace(/[\\%_]/g, (c) => `\\${c}`);

export function cursorDeOffset(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString('base64url');
}
export function lerOffset(bruto: unknown): number {
  if (bruto === undefined) return 0;
  const invalido = () => falhaDeValidacao([{ campo: 'cursor', mensagem: 'Cursor inválido.' }]);
  if (typeof bruto !== 'string' || bruto.length > 512) throw invalido();
  try {
    const c = JSON.parse(Buffer.from(bruto, 'base64url').toString('utf8'));
    if (!Number.isInteger(c?.o) || c.o < 0 || c.o > 100_000) throw invalido();
    return c.o as number;
  } catch {
    throw invalido();
  }
}

export function rotasProdutos(app: FastifyInstance, d: DepsProdutos): void {
  /**
   * Produto que o app pode mostrar à pessoa: categoria do app (sem medicamento), sem advertência legal (a página não tem onde
   * pôr o texto da NBCAL; esses produtos só aparecem no feed, com o texto) e de marca não silenciada com "tudo".
   */
  const PODE_MOSTRAR = `p.tenant_id = $1 AND p.categoria = ANY($2::text[]) AND cardinality(p.advertencias) = 0
        AND (p.marca_chave IS NULL OR NOT EXISTS (SELECT 1 FROM silenciamentos sm WHERE sm.tenant_id = p.tenant_id AND sm.user_id = $3 AND sm.alcance = 'tudo' AND sm.tipo = 'marca' AND sm.marca_chave = p.marca_chave))`;

  /**
   * Menor preço atual de cada produto entre as ofertas que a pessoa pode ver: as mesmas regras de `ofertasAtuais` (disponível, na
   * validade, não escondida, coletada há pouco, marca da fonte liberada, loja não silenciada com "tudo", CEP coberto).
   * Calculado uma vez para o tenant inteiro (agrupado por produto), e não produto a produto: com milhares de produtos a
   * consulta correlacionada levava ~1 s por página. $1 tenant, $3 pessoa; os demais números vêm de `parametros`.
   */
  const PRECO_ATUAL = (o: { agora: number; coletaMinima: number; ceps: number; fontes: number; marcas: number }, juncao: 'JOIN' | 'LEFT JOIN') => `${juncao} (
        SELECT o.product_id, min(o.preco_centavos) AS menor
          FROM offers o
          JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
          LEFT JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
         WHERE o.tenant_id = $1
           AND o.disponivel AND (o.valida_ate IS NULL OR o.valida_ate > $${o.agora}) AND o.escondida_em IS NULL AND o.coletada_em >= $${o.coletaMinima}
           AND (NOT (src.nome = ANY($${o.fontes}::text[])) OR ref.id_externo = ANY($${o.marcas}::text[]))
           AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = o.tenant_id AND sl.user_id = $3 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = o.store_id)
           AND o.store_id IN (SELECT sa.store_id FROM unnest($${o.ceps}::text[]) AS c(cep)
                                JOIN store_service_areas sa ON sa.tenant_id = $1 AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim)
         GROUP BY o.product_id
      ) preco ON preco.product_id = p.id`;

  const ORDENS = ['relevancia', 'menor_preco', 'maior_preco', 'nome'] as const;
  type Ordem = (typeof ORDENS)[number];

  app.get('/v1/produtos', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    // Sem `q` é navegação por categoria; com `q` é pesquisa.
    const pesquisa = q.q !== undefined;
    const texto = typeof q.q === 'string' ? q.q.trim() : '';
    if (pesquisa && (texto.length < 2 || texto.length > 100)) campos.push({ campo: 'q', mensagem: 'Digite de 2 a 100 caracteres.' });
    const slug = (campo: 'categoria' | 'subcategoria'): string | undefined => {
      if (q[campo] === undefined) return undefined;
      if (typeof q[campo] !== 'string' || !CATEGORIA.test(q[campo] as string)) {
        campos.push({ campo, mensagem: campo === 'categoria' ? 'Categoria inválida.' : 'Subcategoria inválida.' });
        return undefined;
      }
      return q[campo] as string;
    };
    const categoria = slug('categoria');
    const subcategoria = slug('subcategoria');
    if (subcategoria !== undefined && categoria === undefined && !campos.some((c) => c.campo === 'categoria')) campos.push({ campo: 'categoria', mensagem: 'Informe a categoria da subcategoria.' });
    let ordem: Ordem = 'relevancia';
    if (q.ordem !== undefined) {
      if (typeof q.ordem !== 'string' || !(ORDENS as readonly string[]).includes(q.ordem)) campos.push({ campo: 'ordem', mensagem: `Use ${ORDENS.join(', ')}.` });
      else ordem = q.ordem as Ordem;
    }
    const l = lerLimite(q.limite);
    if ('erro' in l) campos.push({ campo: 'limite', mensagem: l.erro });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const offset = lerOffset(q.cursor);
    const limite = (l as { limite: number }).limite;

    const chave = pesquisa ? 'buscaPorConta' : 'navegacaoPorConta';
    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa[chave] ?? (pesquisa ? { maximo: 30, janelaSegundos: 60 } : { maximo: 120, janelaSegundos: 60 });
    const espera = await d.limitador.usar(`${chave}:${ctx.userId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const cfg = ctx.tenant.config.app;
    const { ceps } = await preferenciasDaPessoa(d.db, ctx.tenantId, ctx.userId, cfg, agora);
    const { fontes, marcas } = travasDeMarca(ctx.tenant.config);
    const params: unknown[] = [ctx.tenantId, cfg.categorias.map((c) => c.slug), ctx.userId];
    const par = (v: unknown): number => params.push(v);
    const preco = PRECO_ATUAL({
      agora: par(agora),
      coletaMinima: par(new Date(agora.getTime() - cfg.feed.coletaMaximaHoras * 3600_000)),
      ceps: par(ceps),
      fontes: par(fontes),
      marcas: par(marcas),
    }, pesquisa ? 'LEFT JOIN' : 'JOIN');
    const onde: string[] = [PODE_MOSTRAR];
    let relevancia = 'p.nome, p.id';
    if (pesquisa) {
      const normal = normalizarTexto(texto);
      const palavras = normal.split(' ').filter((w) => w.length > 0).slice(0, MAX_PALAVRAS);
      const ehGtin = /^[0-9]{8,14}$/.test(texto);
      const iGtin = par(ehGtin ? texto : null);
      const iNormal = par(escapar(normal));
      if (ehGtin) onde.push(`p.gtin = $${iGtin}`);
      else {
        onde.push(`$${iGtin}::text IS NULL`);
        for (const w of palavras) onde.push(`f_unaccent(lower(p.nome || ' ' || p.marca)) LIKE $${par(`%${escapar(w)}%`)}`);
      }
      relevancia = `CASE WHEN p.gtin = $${iGtin} THEN 0
                      WHEN f_unaccent(lower(p.nome)) LIKE $${iNormal} || '%' ESCAPE '\\' THEN 1
                      WHEN f_unaccent(lower(p.nome)) LIKE '% ' || $${iNormal} || '%' ESCAPE '\\' THEN 2
                      ELSE 3 END, p.nome, p.id`;
      // Na pesquisa basta já ter sido coletado (o preço pode vir null fora da área de entrega), em loja que a pessoa não silenciou com "tudo".
      onde.push(`EXISTS (SELECT 1 FROM offers o WHERE o.tenant_id = p.tenant_id AND o.product_id = p.id
                          AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = o.tenant_id AND sl.user_id = $3 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = o.store_id))`);
    } else {
      // X
      relevancia = 'p.criado_em DESC, p.id';
    }
    if (categoria !== undefined) onde.push(`p.categoria = $${par(categoria)}`);
    if (subcategoria !== undefined) onde.push(`p.subcategoria = $${par(subcategoria)}`);
    const ordenacao =
      ordem === 'menor_preco' ? `preco.menor ASC NULLS LAST, ${relevancia}`
      : ordem === 'maior_preco' ? `preco.menor DESC NULLS LAST, ${relevancia}`
      : ordem === 'nome' ? 'p.nome, p.id'
      : relevancia;
    const iOffset = par(offset);
    const iLimite = par(limite + 1);
    const r = await d.db.query(
      `SELECT p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url, p.subcategoria,
              preco.menor AS menor_preco,
              EXISTS (SELECT 1 FROM seguidos sg WHERE sg.tenant_id = p.tenant_id AND sg.user_id = $3 AND sg.product_id = p.id) AS seguido
         FROM products p
         ${preco}
        WHERE ${onde.join('\n          AND ')}
        ORDER BY ${ordenacao}
        OFFSET $${iOffset} LIMIT $${iLimite}`,
      params,
    );
    const pagina = r.rows.slice(0, limite);
    return {
      itens: pagina.map((p: any) => ({ ...produtoResumo(p), menor_preco_centavos: p.menor_preco === null ? null : Number(p.menor_preco), seguido: p.seguido === true })),
      proximo_cursor: r.rows.length > limite ? cursorDeOffset(offset + limite) : null,
    };
  });

  async function produtoVisivel(ctx: { tenantId: string; userId: string; tenant: { config: any } }, id: string) {
    if (!UUID.test(id)) throw new ErroApi('nao_encontrado');
    const r = await d.db.query(
      `SELECT p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url, p.imagens, p.subcategoria, p.familia_chave
         FROM products p WHERE ${PODE_MOSTRAR} AND p.id = $4`,
      [ctx.tenantId, ctx.tenant.config.app.categorias.map((c: { slug: string }) => c.slug), ctx.userId, id],
    );
    if (r.rowCount !== 1) throw new ErroApi('nao_encontrado');
    return r.rows[0];
  }

  app.get('/v1/produtos/:id', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const p = await produtoVisivel(ctx, (req.params as { id: string }).id);
    const { ceps } = await preferenciasDaPessoa(d.db, ctx.tenantId, ctx.userId, ctx.tenant.config.app, agora);
    const linhas = await ofertasAtuais(d.db, { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, produtoIds: [p.product_id] });

    // Cada oferta traz o link do botão. Fonte que exige link rastreado e não o entrega agora fica de fora da lista: nunca o link cru.
    const ofertas = (
      await Promise.all(
        linhas.map(async (o: OfertaLinha) => {
          try {
            const link = await d.links.resolver(ctx.tenantId, { id: o.offer_id, link: o.link, link_afiliado: o.link_afiliado, fonte: o.fonte }, agora);
            return {
              loja: { id: o.store_id, nome: o.loja_nome, rede: o.rede, tipo: o.loja_tipo },
              preco_centavos: o.preco_centavos,
              preco_por_unidade_centavos: Number(o.preco_por_unidade_centavos),
              rotulo_condicao: o.rotulo_condicao,
              frete: { status: o.frete_status, centavos: o.frete_status === 'conhecido' ? o.frete_centavos : null },
              coletada_em: o.coletada_em.toISOString(),
              valida_ate: o.valida_ate === null ? null : o.valida_ate.toISOString(),
              link: link.link,
              link_afiliado: link.afiliado,
              cobertura: { modo: 'entrega_por_cep', cep: o.cobertura_cep, prazo_dias: o.prazo_dias, distancia_km: null, custo_deslocamento_centavos: null },
              alerta_id: o.alerta_id,
            };
          } catch (err) {
            req.log.warn({ err: (err as Error).message, oferta: o.offer_id }, 'oferta fora da página: link indisponível');
            return null;
          }
        }),
      )
    ).filter((o): o is NonNullable<typeof o> => o !== null);

    const desde = (await d.db.query(`SELECT min(ph.observado_em) AS primeira FROM price_history ph WHERE ph.tenant_id = $1 AND ph.product_id = $2`, [ctx.tenantId, p.product_id])).rows[0]?.primeira ?? null;
    const sg = (await d.db.query(`SELECT promocao_excepcional, queda_percentual, voltou_estoque, menor_preco_180d, promocao_acabando FROM seguidos WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3`, [ctx.tenantId, ctx.userId, p.product_id])).rows[0];
    return {
      ...produtoResumo(p),
      // A galeria do detalhe: a primeira é a `imagem_url`; produto antigo (coletado antes da galeria) devolve só a principal.
      imagens: p.imagens.length > 0 ? p.imagens : p.imagem_url === null ? [] : [p.imagem_url],
      ofertas,
      historico_desde: desde === null ? null : diaLocal(desde, ctx.tenant.config.fuso),
      seguimento: sg === undefined ? null : sg,
    };
  });

  app.get('/v1/produtos/:id/historico', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    let lojaId: string | undefined;
    if (q.loja_id !== undefined) {
      if (typeof q.loja_id !== 'string' || !UUID.test(q.loja_id)) campos.push({ campo: 'loja_id', mensagem: 'Use o id da loja.' });
      else lojaId = q.loja_id;
    }
    let dias = 180;
    if (q.dias !== undefined) {
      const n = Number(q.dias);
      if (!Number.isInteger(n) || n < 1 || n > 180) campos.push({ campo: 'dias', mensagem: 'Use de 1 a 180.' });
      else dias = n;
    }
    const p = await produtoVisivel(ctx, (req.params as { id: string }).id);
    if (campos.length > 0) throw falhaDeValidacao(campos);

    const fuso = ctx.tenant.config.fuso;
    const { fontes, marcas } = travasDeMarca(ctx.tenant.config);
    // Histórico da família (mesma marca e nome, qualquer embalagem) por loja, que é a base do motor (DECISIONS 11). Lojas silenciadas
    // com "tudo" e lojas só de marca fora da lista da fonte (trava) não entram.
    const params: unknown[] = [ctx.tenantId, p.familia_chave, new Date(agora.getTime() - (dias + 1) * 86_400_000), ctx.userId, fontes, marcas];
    let filtroLoja = '';
    if (lojaId !== undefined) {
      params.push(lojaId);
      filtroLoja = `AND ph.store_id = $${params.length}`;
    }
    const linhas = (
      await d.db.query(
        `SELECT ph.store_id, ph.observado_em, ph.preco_por_unidade_centavos, s.nome AS loja_nome, s.rede, s.tipo AS loja_tipo,
                (SELECT min(x.observado_em) FROM price_history x JOIN products px ON px.tenant_id = x.tenant_id AND px.id = x.product_id
                  WHERE x.tenant_id = ph.tenant_id AND x.store_id = ph.store_id AND px.familia_chave = $2) AS primeira
           FROM price_history ph
           JOIN products pp ON pp.tenant_id = ph.tenant_id AND pp.id = ph.product_id
           JOIN stores s ON s.tenant_id = ph.tenant_id AND s.id = ph.store_id
          WHERE ph.tenant_id = $1 AND pp.familia_chave = $2 AND ph.observado_em >= $3 ${filtroLoja}
            AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = ph.tenant_id AND sl.user_id = $4 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = ph.store_id)
            AND (NOT EXISTS (SELECT 1 FROM store_source_refs ref JOIN sources src ON src.tenant_id = ref.tenant_id AND src.id = ref.source_id
                              WHERE ref.tenant_id = ph.tenant_id AND ref.store_id = ph.store_id AND src.nome = ANY($5::text[]))
                 OR EXISTS (SELECT 1 FROM store_source_refs ref JOIN sources src ON src.tenant_id = ref.tenant_id AND src.id = ref.source_id
                             WHERE ref.tenant_id = ph.tenant_id AND ref.store_id = ph.store_id AND src.nome = ANY($5::text[]) AND ref.id_externo = ANY($6::text[])))
          ORDER BY ph.store_id, ph.observado_em`,
        params,
      )
    ).rows;

    const limiteInferior = diaLocal(new Date(agora.getTime() - dias * 86_400_000), fuso);
    interface EntradaLoja { loja: { id: string; nome: string; rede: string; tipo: string }; primeira: Date; linhas: Array<{ observadoEm: Date; precoPorUnidade: number }> }
    const porLoja = new Map<string, EntradaLoja>();
    for (const l of linhas) {
      const e: EntradaLoja = porLoja.get(l.store_id) ?? { loja: { id: l.store_id, nome: l.loja_nome, rede: l.rede, tipo: l.loja_tipo }, primeira: l.primeira, linhas: [] };
      e.linhas.push({ observadoEm: l.observado_em, precoPorUnidade: Number(l.preco_por_unidade_centavos) });
      porLoja.set(l.store_id, e);
    }
    const quantidade = Number(p.quantidade);
    const series = [...porLoja.values()].map((e) => ({
      loja: e.loja,
      desde: diaLocal(e.primeira, fuso),
      pontos: agregarPorDia(e.linhas, p.unidade, agora, fuso)
        .map((o) => ({ dia: diaLocal(o.observadoEm, fuso), preco_por_unidade_centavos: o.precoCentavos, preco_embalagem_centavos: Math.max(1, Math.round(o.precoCentavos * quantidade)) }))
        .filter((pt) => pt.dia >= limiteInferior),
    }));
    return { produto_id: p.product_id, dias, series };
  });
}
