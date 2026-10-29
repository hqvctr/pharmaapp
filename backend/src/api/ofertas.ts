// Ofertas atuais de produtos para a pessoa: as mesmas regras do feed (disponível, na validade, não escondida, coletada há pouco,
// marca da fonte liberada, loja não silenciada com "tudo") e coberta para um CEP do plano.
import type { Db } from '../pipeline/repositorio.js';
import { rotuloCondicao } from '../curadoria/preco.js';
import type { Condicao } from '../curadoria/tipos.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';

export interface OfertaLinha {
  offer_id: string;
  product_id: string;
  preco_centavos: number;
  preco_por_unidade_centavos: number;
  rotulo_condicao: string | null;
  frete_status: 'conhecido' | 'a_confirmar' | 'nao_se_aplica';
  frete_centavos: number | null;
  coletada_em: Date;
  valida_ate: Date | null;
  link: string;
  link_afiliado: boolean;
  fonte: string;
  store_id: string;
  loja_nome: string;
  rede: string;
  loja_tipo: string;
  cobertura_cep: string;
  prazo_dias: number;
  alerta_id: string | null;
}

/** Fontes com trava de marca e as marcas liberadas (união), como no feed. */
export function travasDeMarca(config: ConfigTenant): { fontes: string[]; marcas: string[] } {
  const fontes: string[] = [];
  const marcas: string[] = [];
  for (const [nome, bloco] of Object.entries(config.fontes)) {
    const m = bloco.marcasPermitidasParaLink;
    if (m !== null && typeof m === 'object') {
      fontes.push(nome);
      marcas.push(...Object.keys(m as Record<string, unknown>));
    }
  }
  return { fontes, marcas };
}

export async function ofertasAtuais(
  db: Db,
  o: { tenantId: string; userId: string; config: ConfigTenant; agora: Date; ceps: string[]; produtoIds: string[] },
): Promise<OfertaLinha[]> {
  if (o.produtoIds.length === 0 || o.ceps.length === 0) return [];
  const coletaMinima = new Date(o.agora.getTime() - o.config.app.feed.coletaMaximaHoras * 3600_000);
  const { fontes, marcas } = travasDeMarca(o.config);
  const r = await db.query(
    `SELECT o.id AS offer_id, o.product_id, o.preco_centavos, o.preco_por_unidade_centavos, o.condicao, o.frete_status, o.frete_centavos,
            o.coletada_em, o.valida_ate, o.link, o.link_afiliado, src.nome AS fonte,
            s.id AS store_id, s.nome AS loja_nome, s.rede, s.tipo AS loja_tipo, cob.cep AS cobertura_cep, cob.prazo_dias,
            (SELECT a.id FROM alerts a
              WHERE a.tenant_id = o.tenant_id AND a.offer_id = o.id AND a.preco_centavos = o.preco_centavos
                AND a.revisao_situacao IN ('nao_exigida', 'aprovado')
              ORDER BY a.criado_em DESC, a.id DESC LIMIT 1) AS alerta_id
       FROM offers o
       JOIN stores s ON s.tenant_id = o.tenant_id AND s.id = o.store_id
       JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
       LEFT JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
       JOIN LATERAL (
         SELECT c.cep, sa.prazo_dias
           FROM unnest($4::text[]) AS c(cep)
           JOIN store_service_areas sa ON sa.tenant_id = o.tenant_id AND sa.store_id = o.store_id AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim
          ORDER BY sa.prazo_dias, c.cep LIMIT 1
       ) cob ON true
      WHERE o.tenant_id = $1 AND o.product_id = ANY($5::uuid[])
        AND o.disponivel AND (o.valida_ate IS NULL OR o.valida_ate > $2) AND o.escondida_em IS NULL AND (o.criada_por IS NOT NULL OR o.coletada_em >= $3)
        AND (NOT (src.nome = ANY($6::text[])) OR ref.id_externo = ANY($7::text[]))
        AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = o.tenant_id AND sl.user_id = $8 AND sl.alcance = 'tudo' AND sl.tipo = 'loja' AND sl.loja_id = o.store_id)
      ORDER BY o.preco_centavos, o.id`,
    [o.tenantId, o.agora, coletaMinima, o.ceps, o.produtoIds, fontes, marcas, o.userId],
  );
  return r.rows.map((l: any) => ({ ...l, rotulo_condicao: rotuloCondicao(l.condicao as Condicao | null) }) as OfertaLinha);
}
