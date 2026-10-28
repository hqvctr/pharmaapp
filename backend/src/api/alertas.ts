// Consulta e montagem do alerta (feed e detalhe). Um único SQL serve às duas rotas para que as regras de visibilidade
// não divirjam: o que o feed esconde, o detalhe também não mostra.
import type { Db } from '../pipeline/repositorio.js';
import { TEXTOS_ADVERTENCIA } from '../normalizador/nbcal.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';

export interface FiltroAlertas {
  tenantId: string;
  userId: string;
  config: ConfigTenant;
  agora: Date;
  /** CEPs que o plano da pessoa usa, na ordem em que ela os guardou. */
  ceps: string[];
  /** Detalhe: um alerta, de qualquer situação, mesmo fora das categorias escolhidas. Feed: só ativos das categorias escolhidas. */
  alertaId?: string;
  categorias?: string[];
  categoria?: string;
  cursor?: { criadoEm: string; id: string };
  limite?: number;
}

const CODIGOS_CONHECIDOS = Object.keys(TEXTOS_ADVERTENCIA);

export function situacaoSql(): string {
  return `CASE WHEN o.escondida_em IS NOT NULL THEN 'em_revisao'
               WHEN NOT o.disponivel OR (o.valida_ate IS NOT NULL AND o.valida_ate <= $2)
                    OR o.preco_centavos <> a.preco_centavos OR o.coletada_em < $3 THEN 'encerrada'
               ELSE 'ativa' END`;
}

/** Linhas cruas do banco; `paraAlerta` e `paraDetalhe` as transformam no formato do contrato. */
export async function consultarAlertas(db: Db, f: FiltroAlertas): Promise<any[]> {
  const app = f.config.app;
  const coletaMinima = new Date(f.agora.getTime() - app.feed.coletaMaximaHoras * 3600_000);
  // Fontes com trava de marca (Lomadee): só aparecem lojas cujas marcas aceitam o tipo de canal do tenant.
  const comTrava: string[] = [];
  const marcasOk: string[] = [];
  for (const [nome, bloco] of Object.entries(f.config.fontes)) {
    const m = bloco.marcasPermitidasParaLink;
    if (m !== null && typeof m === 'object') {
      comTrava.push(nome);
      marcasOk.push(...Object.keys(m as Record<string, unknown>));
    }
  }
  const params: unknown[] = [
    f.tenantId, // $1
    f.agora, // $2
    coletaMinima, // $3
    f.userId, // $4
    f.ceps, // $5
    app.categorias.map((c) => c.slug), // $6
    CODIGOS_CONHECIDOS, // $7
    comTrava, // $8
    marcasOk, // $9
  ];
  const onde: string[] = [
    `a.tenant_id = $1`,
    // Alerta rejeitado, ou aguardando aprovação do operador, nunca aparece.
    `a.revisao_situacao IN ('nao_exigida', 'aprovado')`,
    // Categoria que o app não oferece (medicamento) nunca aparece, qualquer que seja a preferência.
    `p.categoria = ANY($6::text[])`,
    // Advertência sem texto conhecido não pode ser mostrada (fica de fora até a lista ser atualizada).
    `p.advertencias <@ $7::text[]`,
    `(NOT (src.nome = ANY($8::text[])) OR ref.id_externo = ANY($9::text[]))`,
  ];
  if (f.alertaId !== undefined) {
    params.push(f.alertaId);
    onde.push(`a.id = $${params.length}`);
  } else {
    onde.push(`(${situacaoSql()}) = 'ativa'`);
    params.push(f.categorias ?? []);
    onde.push(`p.categoria = ANY($${params.length}::text[])`);
    if (f.categoria !== undefined) {
      params.push(f.categoria);
      onde.push(`p.categoria = $${params.length}`);
    }
    // Silenciamento com alcance `tudo` some do feed (o de `push` só afeta a notificação).
    onde.push(`NOT EXISTS (SELECT 1 FROM silenciamentos sl
                            WHERE sl.tenant_id = a.tenant_id AND sl.user_id = $4 AND sl.alcance = 'tudo'
                              AND ((sl.tipo = 'loja' AND sl.loja_id = a.store_id)
                                OR (sl.tipo = 'marca' AND sl.marca_chave = p.marca_chave)))`);
    if (f.cursor !== undefined) {
      params.push(f.cursor.criadoEm, f.cursor.id);
      onde.push(`(a.criado_em, a.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
  }
  const limite = f.alertaId !== undefined ? 1 : (f.limite ?? 20) + 1;
  const r = await db.query(
    `SELECT a.id, a.criado_em, a.decisao, a.preco_centavos, a.preco_efetivo_por_unidade, a.preco_referencia_por_unidade,
            a.rotulo_condicao, a.entrega_a_confirmar,
            o.id AS offer_id, o.valida_de, o.valida_ate, o.coletada_em, o.link, o.link_afiliado, o.frete_status, o.frete_centavos,
            (o.criada_por IS NOT NULL) AS manual, src.nome AS fonte,
            ${situacaoSql()} AS situacao,
            p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url, p.advertencias,
            s.id AS store_id, s.nome AS loja_nome, s.rede, s.tipo AS loja_tipo,
            cob.cep AS cobertura_cep, cob.prazo_dias,
            EXISTS (SELECT 1 FROM seguidos sg WHERE sg.tenant_id = a.tenant_id AND sg.user_id = $4 AND sg.product_id = p.id) AS seguido
       FROM alerts a
       JOIN offers o ON o.tenant_id = a.tenant_id AND o.id = a.offer_id
       JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
       JOIN stores s ON s.tenant_id = a.tenant_id AND s.id = a.store_id
       JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
       LEFT JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
       JOIN LATERAL (
         SELECT c.cep, sa.prazo_dias
           FROM unnest($5::text[]) AS c(cep)
           JOIN store_service_areas sa ON sa.tenant_id = a.tenant_id AND sa.store_id = a.store_id
                                       AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim
          ORDER BY sa.prazo_dias, c.cep LIMIT 1
       ) cob ON true
      WHERE ${onde.join('\n        AND ')}
      ORDER BY a.criado_em DESC, a.id DESC
      LIMIT ${limite}`,
    params,
  );
  return r.rows;
}

const num = (v: unknown): number => Number(v);

export function paraAlerta(r: any) {
  const quantidade = num(r.quantidade);
  const efetivo = num(r.preco_efetivo_por_unidade);
  const referencia = num(r.preco_referencia_por_unidade);
  const queda = referencia > 0 ? Math.min(1, Math.max(0, 1 - efetivo / referencia)) : 0;
  return {
    id: r.id,
    criado_em: r.criado_em.toISOString(),
    destaque: r.decisao === 'notificar',
    situacao: r.situacao,
    produto: {
      id: r.product_id,
      nome: r.nome,
      marca: r.marca_chave !== null && r.marca !== null ? { chave: r.marca_chave, nome: r.marca } : null,
      categoria: r.categoria,
      gtin: r.gtin,
      embalagem: { quantidade, unidade: r.unidade },
      imagem_url: r.imagem_url,
    },
    loja: { id: r.store_id, nome: r.loja_nome, rede: r.rede, tipo: r.loja_tipo },
    preco_centavos: r.preco_centavos,
    preco_referencia_centavos: Math.max(1, Math.round(referencia * quantidade)),
    preco_por_unidade_centavos: efetivo,
    preco_referencia_por_unidade_centavos: referencia,
    queda: Math.round(queda * 10000) / 10000,
    rotulo_condicao: r.rotulo_condicao,
    entrega_a_confirmar: r.entrega_a_confirmar,
    valida_ate: r.valida_ate === null ? null : r.valida_ate.toISOString(),
    coletada_em: r.coletada_em.toISOString(),
    sem_historico_verificado: r.manual === true,
    cobertura: { modo: 'entrega_por_cep', cep: r.cobertura_cep, prazo_dias: r.prazo_dias, distancia_km: null, custo_deslocamento_centavos: null },
    // O texto legal sai do código, nunca da config nem do banco (nbcal.ts).
    advertencias: (r.advertencias as string[]).map((codigo) => ({ codigo, texto: TEXTOS_ADVERTENCIA[codigo as keyof typeof TEXTOS_ADVERTENCIA] })),
    seguido: r.seguido === true,
    // A medição (menor, maior e dias) ainda não é gravada na criação do alerta; o contrato aceita null (BACKLOG).
    prova: null,
  };
}
