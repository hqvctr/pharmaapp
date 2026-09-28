// SQL da API. Toda query filtra por tenant_id.
import type { Condicao, Unidade } from '../curadoria/tipos.js';
import type { Db } from '../pipeline/repositorio.js';

export type { Db };

// ---------- usuários e sessões ----------

export interface LinhaUsuario {
  id: string;
  email: string;
  termosVersao: string | null;
  termosAceitosEm: Date | null;
  notificacoesConsentidasEm: Date | null;
  premium: boolean;
}

export interface SessaoAtiva {
  id: string;
  expiraEm: Date;
  ultimoUsoEm: Date;
  usuario: LinhaUsuario;
}

// $1 = tenant, $2 = agora (no contexto da query que usa o fragmento).
const COLUNAS_USUARIO = `
  u.id, u.email, u.termos_versao, u.termos_aceitos_em, u.notificacoes_consentidas_em,
  EXISTS (SELECT 1 FROM subscriptions sub
           WHERE sub.tenant_id = u.tenant_id AND sub.user_id = u.id AND sub.status = 'ativa'
             AND (sub.expira_em IS NULL OR sub.expira_em > $2)) AS premium`;

function usuarioDaLinha(r: Record<string, unknown>): LinhaUsuario {
  return {
    id: r.id as string,
    email: r.email as string,
    termosVersao: r.termos_versao as string | null,
    termosAceitosEm: r.termos_aceitos_em as Date | null,
    notificacoesConsentidasEm: r.notificacoes_consentidas_em as Date | null,
    premium: r.premium as boolean,
  };
}

export async function buscarUsuario(db: Db, tenantId: string, userId: string, agora: Date): Promise<LinhaUsuario | null> {
  const r = await db.query(`SELECT ${COLUNAS_USUARIO} FROM users u WHERE u.tenant_id = $1 AND u.id = $3`, [tenantId, agora, userId]);
  return r.rowCount === 0 ? null : usuarioDaLinha(r.rows[0]);
}

export async function buscarSessao(db: Db, tenantId: string, tokenHash: Buffer, agora: Date): Promise<SessaoAtiva | null> {
  const r = await db.query(
    `SELECT s.id AS sessao_id, s.expira_em, s.ultimo_uso_em, ${COLUNAS_USUARIO}
       FROM sessoes s JOIN users u ON u.tenant_id = s.tenant_id AND u.id = s.user_id
      WHERE s.tenant_id = $1 AND s.token_hash = $3 AND s.revogada_em IS NULL AND s.expira_em > $2`,
    [tenantId, agora, tokenHash],
  );
  if (r.rowCount === 0) return null;
  const l = r.rows[0];
  return { id: l.sessao_id, expiraEm: l.expira_em, ultimoUsoEm: l.ultimo_uso_em, usuario: usuarioDaLinha(l) };
}

export async function criarSessao(
  db: Db,
  s: { tenantId: string; userId: string; tokenHash: Buffer; agora: Date; expiraEm: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO sessoes (tenant_id, user_id, token_hash, criada_em, expira_em, ultimo_uso_em) VALUES ($1, $2, $3, $4, $5, $4)`,
    [s.tenantId, s.userId, s.tokenHash, s.agora, s.expiraEm],
  );
}

export async function renovarSessao(db: Db, tenantId: string, sessaoId: string, agora: Date, expiraEm: Date): Promise<void> {
  await db.query(`UPDATE sessoes SET ultimo_uso_em = $3, expira_em = $4 WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    sessaoId,
    agora,
    expiraEm,
  ]);
}

export async function revogarSessao(db: Db, tenantId: string, sessaoId: string, agora: Date): Promise<void> {
  await db.query(`UPDATE sessoes SET revogada_em = $3 WHERE tenant_id = $1 AND id = $2 AND revogada_em IS NULL`, [
    tenantId,
    sessaoId,
    agora,
  ]);
}

/** Serializa pedido e verificação de código (e login Google) do mesmo e-mail até o fim da transação. */
export async function travarEmail(db: Db, tenantId: string, email: string): Promise<void> {
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 1))', [`${tenantId}|${email}`]);
}

// ---------- código por e-mail ----------

export async function contarCodigosDesde(db: Db, tenantId: string, email: string, desde: Date): Promise<{ n: number; maisAntigo: Date | null }> {
  const r = await db.query(
    `SELECT count(*)::int AS n, min(criado_em) AS mais_antigo FROM auth_codigos WHERE tenant_id = $1 AND email = $2 AND criado_em > $3`,
    [tenantId, email, desde],
  );
  return { n: r.rows[0].n, maisAntigo: r.rows[0].mais_antigo };
}

/** Código vencido há mais de um dia não serve nem para contar limite: sai do banco. */
export async function apagarCodigosVencidos(db: Db, antesDe: Date): Promise<void> {
  await db.query('DELETE FROM auth_codigos WHERE expira_em < $1', [antesDe]);
}

export async function inserirCodigo(
  db: Db,
  c: { tenantId: string; email: string; hash: Buffer; agora: Date; expiraEm: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO auth_codigos (tenant_id, email, codigo_hash, criado_em, expira_em) VALUES ($1, $2, $3, $4, $5)`,
    [c.tenantId, c.email, c.hash, c.agora, c.expiraEm],
  );
}

export interface LinhaCodigo {
  id: string;
  hash: Buffer;
  expiraEm: Date;
  tentativas: number;
  usadoEm: Date | null;
}

/** Só o código mais recente vale; os anteriores ficam inúteis ao pedir outro. */
export async function ultimoCodigo(db: Db, tenantId: string, email: string): Promise<LinhaCodigo | null> {
  const r = await db.query(
    `SELECT id, codigo_hash, expira_em, tentativas, usado_em FROM auth_codigos
      WHERE tenant_id = $1 AND email = $2 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [tenantId, email],
  );
  if (r.rowCount === 0) return null;
  const l = r.rows[0];
  return { id: String(l.id), hash: l.codigo_hash, expiraEm: l.expira_em, tentativas: l.tentativas, usadoEm: l.usado_em };
}

export async function registrarTentativa(db: Db, codigoId: string): Promise<void> {
  await db.query('UPDATE auth_codigos SET tentativas = tentativas + 1 WHERE id = $1', [codigoId]);
}

export async function marcarCodigoUsado(db: Db, codigoId: string, agora: Date): Promise<void> {
  await db.query('UPDATE auth_codigos SET usado_em = $2 WHERE id = $1', [codigoId, agora]);
}

// ---------- contas ----------

export async function usuarioPorEmail(db: Db, tenantId: string, email: string): Promise<{ id: string; googleSub: string | null } | null> {
  const r = await db.query(`SELECT id, google_sub FROM users WHERE tenant_id = $1 AND lower(email) = $2`, [tenantId, email]);
  return r.rowCount === 0 ? null : { id: r.rows[0].id, googleSub: r.rows[0].google_sub };
}

export async function usuarioPorGoogle(db: Db, tenantId: string, sub: string): Promise<string | null> {
  const r = await db.query(`SELECT id FROM users WHERE tenant_id = $1 AND google_sub = $2`, [tenantId, sub]);
  return r.rowCount === 0 ? null : r.rows[0].id;
}

export async function inserirUsuario(db: Db, tenantId: string, email: string, googleSub: string | null): Promise<string> {
  const r = await db.query(`INSERT INTO users (tenant_id, email, google_sub) VALUES ($1, $2, $3) RETURNING id`, [
    tenantId,
    email,
    googleSub,
  ]);
  return r.rows[0].id;
}

export async function vincularGoogle(db: Db, tenantId: string, userId: string, sub: string): Promise<void> {
  await db.query(`UPDATE users SET google_sub = $3 WHERE tenant_id = $1 AND id = $2`, [tenantId, userId, sub]);
}

export async function registrarAceiteTermos(db: Db, tenantId: string, userId: string, versao: string, agora: Date): Promise<void> {
  await db.query(`UPDATE users SET termos_versao = $3, termos_aceitos_em = $4 WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    userId,
    versao,
    agora,
  ]);
}

/** Consentir de novo mantém a data do primeiro consentimento. */
export async function registrarConsentimento(db: Db, tenantId: string, userId: string, consentidas: boolean, agora: Date): Promise<void> {
  await db.query(
    `UPDATE users SET notificacoes_consentidas_em = CASE WHEN $3 THEN coalesce(notificacoes_consentidas_em, $4) ELSE NULL END
      WHERE tenant_id = $1 AND id = $2`,
    [tenantId, userId, consentidas, agora],
  );
}

/** Preferências, sessões, entregas e assinaturas saem em cascata (DECISIONS 7); códigos saem pelo e-mail. */
export async function excluirConta(db: Db, tenantId: string, userId: string): Promise<void> {
  await db.query(
    `DELETE FROM auth_codigos WHERE tenant_id = $1 AND email = (SELECT lower(email) FROM users WHERE tenant_id = $1 AND id = $2)`,
    [tenantId, userId],
  );
  await db.query('DELETE FROM users WHERE tenant_id = $1 AND id = $2', [tenantId, userId]);
}

// ---------- preferências ----------

export interface LinhaPreferencias {
  categorias: string[];
  ceps: string[];
  silencioInicio: string | null;
  silencioFim: string | null;
  limiteDiario: number | null;
}

export async function obterPreferencias(db: Db, tenantId: string, userId: string): Promise<LinhaPreferencias | null> {
  const r = await db.query(
    `SELECT categorias, ceps, to_char(silencio_inicio, 'HH24:MI') AS inicio, to_char(silencio_fim, 'HH24:MI') AS fim, limite_diario
       FROM user_preferences WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId],
  );
  if (r.rowCount === 0) return null;
  const l = r.rows[0];
  return { categorias: l.categorias, ceps: l.ceps, silencioInicio: l.inicio, silencioFim: l.fim, limiteDiario: l.limite_diario };
}

export async function salvarPreferencias(db: Db, tenantId: string, userId: string, p: LinhaPreferencias, agora: Date): Promise<void> {
  await db.query(
    `INSERT INTO user_preferences (tenant_id, user_id, categorias, ceps, silencio_inicio, silencio_fim, limite_diario, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET categorias = EXCLUDED.categorias, ceps = EXCLUDED.ceps,
       silencio_inicio = EXCLUDED.silencio_inicio, silencio_fim = EXCLUDED.silencio_fim,
       limite_diario = EXCLUDED.limite_diario, atualizado_em = EXCLUDED.atualizado_em`,
    [tenantId, userId, p.categorias, p.ceps, p.silencioInicio, p.silencioFim, p.limiteDiario, agora],
  );
}

// ---------- feed e oferta ----------

export interface LinhaOferta {
  ofertaId: string;
  precoCentavos: number;
  condicao: Condicao | null;
  freteStatus: 'conhecido' | 'a_confirmar' | 'nao_se_aplica';
  freteCentavos: number | null;
  validaAte: Date | null;
  link: string;
  linkAfiliado: boolean;
  imagemUrl: string | null;
  coletadaEm: Date;
  produto: { nome: string; marca: string | null; categoria: string; familiaChave: string; quantidade: number; unidade: Unidade };
  loja: { id: string; nome: string; rede: string; tipo: 'online' | 'fisica' };
  alerta: {
    id: string;
    criadoEm: Date;
    /** criado_em em ISO com microssegundos, para o cursor do feed. */
    cursor: string;
    decisao: 'notificar' | 'aguardar_aprovacao' | 'somente_feed';
    score: number;
    referenciaPorUnidade: number;
  };
  ativa: boolean;
  prazoEntregaDias: number | null;
}

// Oferta "ativa": a última avaliação a mantém no feed, a fonte ainda a vê, está no prazo de validade
// e foi coletada recentemente (fonte parada não deixa oferta velha no feed).
// Parâmetros: $1 tenant, $2 agora, $3 idade máxima da coleta em horas.
const OFERTA_ATIVA = `(
  o.disponivel
  AND o.ultima_decisao IN ('notificar', 'aguardar_aprovacao', 'somente_feed')
  AND o.coletada_em > $2::timestamptz - make_interval(hours => $3::int)
  AND (o.valida_de IS NULL OR o.valida_de <= $2)
  AND (o.valida_ate IS NULL OR o.valida_ate > $2)
  AND s.status <> 'bloqueada'
  AND src.status_confianca <> 'bloqueada'
)`;

const SELECT_OFERTA = `
  SELECT o.id AS oferta_id, o.preco_centavos, o.condicao, o.frete_status, o.frete_centavos, o.valida_ate, o.link,
         o.link_afiliado, o.coletada_em, o.imagem_url,
         p.nome, p.marca, p.categoria, p.familia_chave, p.quantidade, p.unidade,
         s.id AS loja_id, s.nome AS loja_nome, s.rede, s.tipo AS loja_tipo,
         a.id AS alerta_id, a.criado_em AS alertada_em, a.decisao, a.score, a.preco_referencia_por_unidade,
         -- Precisão de microssegundo: o cursor não pode perder nem repetir item por arredondamento.
         to_char(a.criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS alertada_em_cursor,
         ${OFERTA_ATIVA} AS ativa`;

const FROM_OFERTA = `
    FROM offers o
    JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
    JOIN stores s ON s.tenant_id = o.tenant_id AND s.id = o.store_id
    JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
    JOIN LATERAL (
      SELECT * FROM alerts a WHERE a.tenant_id = o.tenant_id AND a.offer_id = o.id ORDER BY a.criado_em DESC, a.id DESC LIMIT 1
    ) a ON true`;

function ofertaDaLinha(l: Record<string, any>): LinhaOferta {
  return {
    ofertaId: l.oferta_id,
    precoCentavos: l.preco_centavos,
    condicao: l.condicao,
    freteStatus: l.frete_status,
    freteCentavos: l.frete_centavos,
    validaAte: l.valida_ate,
    link: l.link,
    linkAfiliado: l.link_afiliado,
    imagemUrl: l.imagem_url,
    coletadaEm: l.coletada_em,
    produto: {
      nome: l.nome,
      marca: l.marca,
      categoria: l.categoria,
      familiaChave: l.familia_chave,
      quantidade: Number(l.quantidade),
      unidade: l.unidade,
    },
    loja: { id: l.loja_id, nome: l.loja_nome, rede: l.rede, tipo: l.loja_tipo },
    alerta: {
      id: l.alerta_id,
      criadoEm: l.alertada_em,
      cursor: l.alertada_em_cursor,
      decisao: l.decisao,
      score: l.score,
      referenciaPorUnidade: Number(l.preco_referencia_por_unidade),
    },
    ativa: l.ativa,
    prazoEntregaDias: l.prazo ?? null,
  };
}

export interface ConsultaFeed {
  tenantId: string;
  agora: Date;
  idadeMaximaHoras: number;
  categorias: string[];
  ceps: string[];
  /** Último item da página anterior. */
  depoisDe: { alertadaEm: string; alertaId: string } | null;
  limite: number;
}

/**
 * Cobertura por faixa de CEP (store_service_areas). Loja física sem faixa só entra com a
 * coordenada do CEP do usuário (P3, fase 5); até lá fica fora do feed.
 */
export async function listarFeed(db: Db, q: ConsultaFeed): Promise<LinhaOferta[]> {
  const r = await db.query(
    `SELECT * FROM (
       ${SELECT_OFERTA},
         (SELECT min(sa.prazo_dias) FROM store_service_areas sa, unnest($5::text[]) AS c(cep)
           WHERE sa.tenant_id = s.tenant_id AND sa.store_id = s.id AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim) AS prazo
       ${FROM_OFERTA}
       WHERE o.tenant_id = $1 AND ${OFERTA_ATIVA} AND p.categoria = ANY($4::text[])
         AND ($6::timestamptz IS NULL OR (a.criado_em, a.id) < ($6::timestamptz, $7::uuid))
     ) x
     WHERE x.prazo IS NOT NULL
     ORDER BY x.alertada_em DESC, x.alerta_id DESC
     LIMIT $8`,
    [
      q.tenantId,
      q.agora,
      q.idadeMaximaHoras,
      q.categorias,
      q.ceps,
      q.depoisDe?.alertadaEm ?? null,
      q.depoisDe?.alertaId ?? null,
      q.limite,
    ],
  );
  return r.rows.map(ofertaDaLinha);
}

/** Oferta que já gerou alerta, ativa ou não. Oferta sem alerta nunca passou na curadoria: null. */
export async function buscarOferta(db: Db, tenantId: string, agora: Date, idadeMaximaHoras: number, ofertaId: string): Promise<LinhaOferta | null> {
  const r = await db.query(`${SELECT_OFERTA}, NULL::int AS prazo ${FROM_OFERTA} WHERE o.tenant_id = $1 AND o.id = $4`, [
    tenantId,
    agora,
    idadeMaximaHoras,
    ofertaId,
  ]);
  return r.rowCount === 0 ? null : ofertaDaLinha(r.rows[0]);
}
