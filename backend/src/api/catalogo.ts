// Consulta única dos cartões de produto (pesquisa, navegação por categoria e fileiras do Início). Um só SQL para que as
// regras de visibilidade e os campos do cartão não divirjam entre as telas.
import { normalizarTexto } from '../normalizador/medicamentos.js';
import type { Db } from '../pipeline/repositorio.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';
import { produtoResumo } from './alertas.js';
import { travasDeMarca } from './ofertas.js';

export const MAX_PALAVRAS = 6;
export const ORDENS = ['relevancia', 'menor_preco', 'maior_preco', 'nome', 'maior_queda', 'menor_preco_unidade', 'mais_novos', 'para_voce'] as const;
export type Ordem = (typeof ORDENS)[number];

/** Escapa os curingas do LIKE: o texto da pessoa nunca vira padrão. */
export const escapar = (t: string): string => t.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface FiltroProdutos {
  tenantId: string;
  userId: string;
  config: ConfigTenant;
  agora: Date;
  ceps: string[];
  /** Pesquisa por texto (nome, marca ou GTIN). Sem texto é navegação: só o que tem preço agora. */
  texto?: string;
  /** Restringe às categorias (as escolhidas pela pessoa, no Início e em `para_voce`). */
  categorias?: string[];
  categoria?: string;
  subcategoria?: string;
  lojaId?: string;
  marca?: string;
  precoMin?: number;
  precoMax?: number;
  comQueda?: boolean;
  menorPreco180d?: boolean;
  unidade?: 'un' | 'kg' | 'l';
  /** Embalagem mínima (na unidade do produto): a fileira de preço por unidade deixa de fora o item avulso. */
  quantidadeMinima?: number;
  ids?: string[];
  /** Só produtos seguidos que ficaram mais baratos desde que a pessoa os seguiu (fileira do Início). */
  favoritosMaisBaratos?: boolean;
  ordem: Ordem;
  offset: number;
  limite: number;
  facetas?: boolean;
}

export interface CartaoProduto {
  [campo: string]: unknown;
}

export interface ResultadoProdutos {
  itens: CartaoProduto[];
  temMais: boolean;
  facetas?: { lojas: Array<{ id: string; nome: string; quantidade: number }>; marcas: Array<{ chave: string; nome: string; quantidade: number }> };
}

/**
 * Produto que o app pode mostrar à pessoa: categoria do app (sem medicamento), sem advertência legal (a página não tem onde
 * pôr o texto da NBCAL; esses produtos só aparecem no feed, com o texto) e de marca não silenciada com "tudo".
 */
export const PODE_MOSTRAR = `p.tenant_id = $1 AND p.categoria = ANY($2::text[]) AND cardinality(p.advertencias) = 0
        AND (p.marca_chave IS NULL OR NOT EXISTS (SELECT 1 FROM silenciamentos sm WHERE sm.tenant_id = p.tenant_id AND sm.user_id = $3 AND sm.alcance = 'tudo' AND sm.tipo = 'marca' AND sm.marca_chave = p.marca_chave))`;

const DIA = 86_400_000;

/**
 * Subconsulta `preco` (uma linha por produto com oferta que a pessoa pode ver agora). Os parâmetros entram em `params` pela
 * função `par`; $1 é o tenant e $3 a pessoa.
 */
function subconsultaPreco(par: (v: unknown) => number, f: Pick<FiltroProdutos, 'config' | 'agora' | 'ceps' | 'lojaId'>): string {
  const cfg = f.config.app;
  const { fontes, marcas } = travasDeMarca(f.config);
  const iAgora = par(f.agora);
  const iColeta = par(new Date(f.agora.getTime() - cfg.feed.coletaMaximaHoras * 3600_000));
  const iCeps = par(f.ceps);
  const iFontes = par(fontes);
  const iMarcas = par(marcas);
  const filtroLoja = f.lojaId !== undefined ? `AND o.store_id = $${par(f.lojaId)}` : '';

  /*
   * Preço atual de cada produto entre as ofertas que a pessoa pode ver: as mesmas regras de `ofertasAtuais` (disponível, na
   * validade, não escondida, coletada há pouco, marca da fonte liberada, loja não silenciada com "tudo", CEP coberto). Agrupado
   * por produto uma vez por pedido (D94). A queda é a do alerta ativo da oferta **mais barata**: o "antes" do cartão é sempre o
   * da loja do preço mostrado, nunca de outra loja. Oferta manual não tem queda (D95, D97).
   */
  return `(
        SELECT o.product_id,
               min(o.preco_centavos) AS menor,
               min(o.preco_por_unidade_centavos) AS menor_unidade,
               count(DISTINCT o.store_id) AS lojas,
               array_agg(DISTINCT o.store_id) AS lojas_ids,
               (array_agg(aq.queda ORDER BY o.preco_centavos, aq.queda DESC NULLS LAST))[1] AS queda,
               (array_agg(aq.referencia ORDER BY o.preco_centavos, aq.queda DESC NULLS LAST))[1] AS referencia,
               (array_agg(aq.id ORDER BY o.preco_centavos, aq.queda DESC NULLS LAST))[1] AS alerta_id
          FROM offers o
          JOIN products po ON po.tenant_id = o.tenant_id AND po.id = o.product_id
          JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
          LEFT JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
          LEFT JOIN LATERAL (
            SELECT a.id, 1 - a.preco_efetivo_por_unidade / a.preco_referencia_por_unidade AS queda,
                   greatest(1, round(a.preco_referencia_por_unidade * po.quantidade)) AS referencia
              FROM alerts a
             WHERE a.tenant_id = o.tenant_id AND a.offer_id = o.id AND a.preco_centavos = o.preco_centavos
               AND a.revisao_situacao IN ('nao_exigida', 'aprovado') AND o.criada_por IS NULL
               AND a.preco_referencia_por_unidade > a.preco_efetivo_por_unidade
             ORDER BY a.criado_em DESC, a.id DESC LIMIT 1
          ) aq ON true
         WHERE o.tenant_id = $1
           AND o.disponivel AND (o.valida_ate IS NULL OR o.valida_ate > $${iAgora}) AND o.escondida_em IS NULL AND (o.criada_por IS NOT NULL OR o.coletada_em >= $${iColeta})
           AND (NOT (src.nome = ANY($${iFontes}::text[])) OR ref.id_externo = ANY($${iMarcas}::text[]))
           AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = o.tenant_id AND sl.user_id = $3 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = o.store_id)
           AND o.store_id IN (SELECT sa.store_id FROM unnest($${iCeps}::text[]) AS c(cep)
                                JOIN store_service_areas sa ON sa.tenant_id = $1 AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim)
           ${filtroLoja}
         GROUP BY o.product_id
      ) preco ON preco.product_id = p.id`;
}

export async function consultarProdutos(db: Db, f: FiltroProdutos): Promise<ResultadoProdutos> {
  const cfg = f.config.app;
  const params: unknown[] = [f.tenantId, cfg.categorias.map((c) => c.slug), f.userId];
  const par = (v: unknown): number => params.push(v);
  const pesquisa = f.texto !== undefined;
  // Filtro que depende de preço tira o produto sem oferta na área, mesmo na pesquisa.
  const exigePreco = !pesquisa || f.lojaId !== undefined || f.precoMin !== undefined || f.precoMax !== undefined || f.comQueda === true
    || f.menorPreco180d === true || f.favoritosMaisBaratos === true || ['maior_queda', 'menor_preco_unidade', 'para_voce'].includes(f.ordem);

  const preco = subconsultaPreco(par, f);

  /*
   * Menor preço em 180 dias: o preço por unidade de agora é o menor da janela, a janela já viu um preço pelo menos 2% maior
   * (preço que nunca mudou não é "o menor") e o histórico do produto tem pelo menos `curadoria.minObservacoes` dias, a mesma
   * base mínima do motor (produto recém-coletado seria "o menor" por falta de passado).
   */
  const iJanela = par(new Date(f.agora.getTime() - 180 * DIA));
  const iBaseMinima = par(new Date(f.agora.getTime() - f.config.curadoria.minObservacoes * DIA));
  const historico = `LEFT JOIN LATERAL (
        SELECT (preco.menor_unidade <= min(ph.preco_por_unidade_centavos) AND max(ph.preco_por_unidade_centavos) >= preco.menor_unidade * 1.02
                AND (SELECT min(x.observado_em) FROM price_history x WHERE x.tenant_id = p.tenant_id AND x.product_id = p.id) <= $${iBaseMinima}) AS menor_180d
          FROM price_history ph
         WHERE ph.tenant_id = p.tenant_id AND ph.product_id = p.id AND ph.observado_em >= $${iJanela}
      ) h ON preco.menor_unidade IS NOT NULL`;

  const onde: string[] = [PODE_MOSTRAR];
  // A ordem é aplicada na consulta de fora, com os nomes de coluna dela (`product_id`, `menor_preco`, `queda`...).
  let relevancia = 'p.criado_em DESC, p.product_id';
  if (pesquisa) {
    const texto = f.texto as string;
    const normal = normalizarTexto(texto);
    const palavras = normal.split(' ').filter((w) => w.length > 0).slice(0, MAX_PALAVRAS);
    const ehGtin = /^[0-9]{8,14}$/.test(texto);
    const iGtin = par(ehGtin ? texto : null);
    const iNormal = par(escapar(normal));
    if (ehGtin) onde.push(`p.gtin = $${iGtin}`);
    else {
      onde.push(`$${iGtin}::text IS NULL`);
      for (const w of palavras) onde.push(`f_unaccent(lower(p.nome || ' ' || coalesce(p.marca, ''))) LIKE $${par(`%${escapar(w)}%`)}`);
    }
    relevancia = `CASE WHEN p.gtin = $${iGtin} THEN 0
                    WHEN f_unaccent(lower(p.nome)) LIKE $${iNormal} || '%' ESCAPE '\\' THEN 1
                    WHEN f_unaccent(lower(p.nome)) LIKE '% ' || $${iNormal} || '%' ESCAPE '\\' THEN 2
                    ELSE 3 END, p.nome, p.product_id`;
    // Na pesquisa basta já ter sido coletado (o preço pode vir null fora da área de entrega), em loja que a pessoa não silenciou com "tudo".
    onde.push(`EXISTS (SELECT 1 FROM offers o WHERE o.tenant_id = p.tenant_id AND o.product_id = p.id
                        AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = o.tenant_id AND sl.user_id = $3 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = o.store_id))`);
  }
  if (f.categorias !== undefined) onde.push(`p.categoria = ANY($${par(f.categorias)}::text[])`);
  if (f.categoria !== undefined) onde.push(`p.categoria = $${par(f.categoria)}`);
  if (f.subcategoria !== undefined) onde.push(`p.subcategoria = $${par(f.subcategoria)}`);
  if (f.marca !== undefined) onde.push(`p.marca_chave = $${par(f.marca)}`);
  if (f.unidade !== undefined) onde.push(`p.unidade = $${par(f.unidade)}`);
  if (f.quantidadeMinima !== undefined) onde.push(`p.quantidade >= $${par(f.quantidadeMinima)}`);
  if (f.ids !== undefined) onde.push(`p.id = ANY($${par(f.ids)}::uuid[])`);
  if (f.precoMin !== undefined) onde.push(`preco.menor >= $${par(f.precoMin)}`);
  if (f.precoMax !== undefined) onde.push(`preco.menor <= $${par(f.precoMax)}`);
  if (f.comQueda === true) onde.push('preco.queda IS NOT NULL');
  if (f.menorPreco180d === true) onde.push('h.menor_180d IS TRUE');

  // Preço quando a pessoa seguiu: o menor preço observado nas 24 h antes de seguir (qualquer loja). Só para a fileira de favoritos.
  const seguido = `LEFT JOIN LATERAL (
        SELECT sg.criado_em,
               (SELECT min(ph.preco_centavos) FROM price_history ph
                 WHERE ph.tenant_id = p.tenant_id AND ph.product_id = p.id AND ph.observado_em BETWEEN sg.criado_em - interval '1 day' AND sg.criado_em) AS preco_ao_seguir
          FROM seguidos sg WHERE sg.tenant_id = p.tenant_id AND sg.user_id = $3 AND sg.product_id = p.id
      ) sg ON true`;
  if (f.favoritosMaisBaratos === true) onde.push('sg.preco_ao_seguir IS NOT NULL AND preco.menor < sg.preco_ao_seguir');

  // "Para você": primeiro as quedas verificadas, depois o menor preço em 180 dias, depois o resto; dentro de cada faixa, as
  // categorias se alternam (o mais novo de cada uma, depois o segundo de cada uma...), para a grade não virar uma categoria só.
  const vez = 'row_number() OVER (PARTITION BY p.categoria, CASE WHEN preco.queda IS NOT NULL THEN 0 WHEN h.menor_180d THEN 1 ELSE 2 END ORDER BY preco.queda DESC NULLS LAST, p.criado_em DESC, p.id)';
  const ordenacao: Record<Ordem, string> = {
    relevancia,
    menor_preco: `p.menor_preco ASC NULLS LAST, ${relevancia}`,
    maior_preco: `p.menor_preco DESC NULLS LAST, ${relevancia}`,
    nome: 'p.nome, p.product_id',
    maior_queda: `p.queda DESC NULLS LAST, ${relevancia}`,
    // Preço por unidade só compara a mesma unidade: unidade (un, kg, l) primeiro, depois o preço.
    menor_preco_unidade: `CASE p.unidade WHEN 'un' THEN 0 WHEN 'kg' THEN 1 ELSE 2 END, p.menor_unidade ASC NULLS LAST, ${relevancia}`,
    mais_novos: 'p.criado_em DESC, p.product_id',
    para_voce: `CASE WHEN p.queda IS NOT NULL THEN 0 WHEN p.menor_180d THEN 1 ELSE 2 END, p.vez, p.queda DESC NULLS LAST, p.categoria, p.criado_em DESC, p.product_id`,
  };

  const juncao = exigePreco ? 'JOIN' : 'LEFT JOIN';
  const base = `FROM products p
         ${juncao} ${preco}
         ${historico}
         ${seguido}
        WHERE ${onde.join('\n          AND ')}`;
  const iOffset = par(f.offset);
  const iLimite = par(f.limite + 1);
  const r = await db.query(
    `SELECT * FROM (
       SELECT p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url, p.subcategoria, p.criado_em,
              preco.menor AS menor_preco, preco.menor_unidade, preco.lojas, preco.queda, preco.referencia, preco.alerta_id,
              coalesce(h.menor_180d, false) AS menor_180d, sg.criado_em AS seguido_em, sg.preco_ao_seguir,
              ${f.ordem === 'para_voce' ? vez : '0'} AS vez
         ${base}
     ) p
     ORDER BY ${ordenacao[f.ordem]}
     OFFSET $${iOffset} LIMIT $${iLimite}`,
    params,
  );
  const pagina = r.rows.slice(0, f.limite);
  const resultado: ResultadoProdutos = { itens: pagina.map(paraCartao), temMais: r.rows.length > f.limite };

  if (f.facetas === true) {
    const fl = await db.query(
      `SELECT s.id, s.nome, count(*)::int AS quantidade
         FROM (SELECT unnest(preco.lojas_ids) AS store_id ${base}) x
         JOIN stores s ON s.tenant_id = $1 AND s.id = x.store_id
        GROUP BY s.id, s.nome ORDER BY quantidade DESC, s.nome LIMIT 30`,
      params.slice(0, iOffset - 1),
    );
    const fm = await db.query(
      `SELECT p.marca_chave AS chave, min(p.marca) AS nome, count(*)::int AS quantidade
         ${base} AND p.marca_chave IS NOT NULL AND p.marca IS NOT NULL
        GROUP BY p.marca_chave ORDER BY quantidade DESC, nome LIMIT 30`,
      params.slice(0, iOffset - 1),
    );
    resultado.facetas = { lojas: fl.rows, marcas: fm.rows };
  }
  return resultado;
}

const arredondar4 = (n: number): number => Math.round(n * 10000) / 10000;

/** `ProdutoCartao` do contrato: o resumo do produto e o que o cartão mostra (preço, preço por unidade, lojas, queda, menor em 180 dias). */
export function paraCartao(p: any): CartaoProduto {
  const temPreco = p.menor_preco !== null && p.menor_preco !== undefined;
  const queda = p.queda === null || p.queda === undefined ? null : arredondar4(Number(p.queda));
  return {
    ...produtoResumo(p),
    menor_preco_centavos: temPreco ? Number(p.menor_preco) : null,
    seguido: p.seguido_em !== null && p.seguido_em !== undefined,
    menor_preco_por_unidade_centavos: temPreco ? arredondar4(Number(p.menor_unidade)) : null,
    lojas: temPreco ? Number(p.lojas) : 0,
    queda,
    preco_referencia_centavos: queda === null ? null : Number(p.referencia),
    alerta_id: queda === null ? null : p.alerta_id,
    menor_preco_180d: temPreco && p.menor_180d === true,
    preco_ao_seguir_centavos: p.preco_ao_seguir === null || p.preco_ao_seguir === undefined ? null : Number(p.preco_ao_seguir),
  };
}

/** Quantos produtos de cada categoria do app a pessoa consegue comprar agora nos CEPs dados (cadastro inicial e preferências). */
export async function contarPorCategoria(db: Db, f: Pick<FiltroProdutos, 'tenantId' | 'userId' | 'config' | 'agora' | 'ceps'>): Promise<Array<{ slug: string; produtos: number }>> {
  const slugs = f.config.app.categorias.map((c) => c.slug);
  const params: unknown[] = [f.tenantId, slugs, f.userId];
  const par = (v: unknown): number => params.push(v);
  const r = await db.query(
    `SELECT p.categoria, count(*)::int AS produtos
       FROM products p
       JOIN ${subconsultaPreco(par, f)}
      WHERE ${PODE_MOSTRAR}
      GROUP BY p.categoria`,
    params,
  );
  const contagem = new Map(r.rows.map((l: { categoria: string; produtos: number }) => [l.categoria, l.produtos]));
  return slugs.map((slug) => ({ slug, produtos: contagem.get(slug) ?? 0 }));
}
