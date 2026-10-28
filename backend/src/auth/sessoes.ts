// Sessões do app (contrato, "Convenções"): access de 1 h e refresh de 60 dias, ambos opacos e guardados só como hash.
// Refresh de uso único com rotação; refresh já usado apresentado de novo revoga a sessão inteira (indício de roubo).
import type { Db } from '../pipeline/repositorio.js';
import { ErroApi } from '../api/erros.js';
import { hashToken, novoToken, pareceToken } from './tokens.js';

export const ACCESS_SEGUNDOS = 3600;
export const REFRESH_SEGUNDOS = 60 * 86400;

export interface ParDeTokens {
  accessToken: string;
  accessExpiraEm: Date;
  refreshToken: string;
  refreshExpiraEm: Date;
}

const somar = (d: Date, segundos: number): Date => new Date(d.getTime() + segundos * 1000);

export async function criarSessao(db: Db, tenantId: string, userId: string, agora: Date): Promise<ParDeTokens> {
  const a = novoToken();
  const r = novoToken();
  const par = {
    accessToken: a.token,
    accessExpiraEm: somar(agora, ACCESS_SEGUNDOS),
    refreshToken: r.token,
    refreshExpiraEm: somar(agora, REFRESH_SEGUNDOS),
  };
  await db.query(
    `INSERT INTO sessions (tenant_id, audiencia, user_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
     VALUES ($1, 'app', $2, $3, $4, $5, $6, $7)`,
    [tenantId, userId, a.hash, par.accessExpiraEm, r.hash, par.refreshExpiraEm, agora],
  );
  return par;
}

/** Sessão da área do operador: mesma tabela, audiência `operador`. O refresh dura `refreshDias` (config do tenant, D3). */
export async function criarSessaoOperador(db: Db, tenantId: string, operadorId: string, agora: Date, refreshDias: number): Promise<ParDeTokens> {
  const a = novoToken();
  const r = novoToken();
  const par = {
    accessToken: a.token,
    accessExpiraEm: somar(agora, ACCESS_SEGUNDOS),
    refreshToken: r.token,
    refreshExpiraEm: somar(agora, refreshDias * 86400),
  };
  await db.query(
    `INSERT INTO sessions (tenant_id, audiencia, operador_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
     VALUES ($1, 'operador', $2, $3, $4, $5, $6, $7)`,
    [tenantId, operadorId, a.hash, par.accessExpiraEm, r.hash, par.refreshExpiraEm, agora],
  );
  return par;
}

export interface SessaoOperadorAutenticada {
  sessionId: string;
  tenantId: string;
  operadorId: string;
}

/** Valida o access token de operador. Token do app nunca vale aqui; operador desativado perde a sessão na hora. */
export async function sessaoOperadorDoAccess(db: Db, token: unknown, agora: Date): Promise<SessaoOperadorAutenticada> {
  if (!pareceToken(token)) throw new ErroApi('nao_autenticado');
  const r = await db.query(
    `SELECT s.id, s.tenant_id, s.operador_id, s.audiencia, s.access_expira_em, s.revogada_em, o.ativo
       FROM sessions s LEFT JOIN operadores o ON o.tenant_id = s.tenant_id AND o.id = s.operador_id
      WHERE s.access_hash = $1`,
    [hashToken(token)],
  );
  const s = r.rows[0];
  if (s === undefined || s.audiencia !== 'operador') throw new ErroApi('nao_autenticado');
  if (s.revogada_em !== null) throw new ErroApi('sessao_revogada');
  if (s.ativo !== true) {
    await revogarSessao(db, s.tenant_id, s.id, 'operador_desativado', agora);
    throw new ErroApi('sessao_revogada');
  }
  if (s.access_expira_em <= agora) throw new ErroApi('sessao_expirada');
  return { sessionId: s.id, tenantId: s.tenant_id, operadorId: s.operador_id };
}

export interface SessaoAutenticada {
  sessionId: string;
  tenantId: string;
  userId: string;
}

/** Valida o access token. 401 com o código que o app testa: `nao_autenticado`, `sessao_expirada` ou `sessao_revogada`. */
export async function sessaoDoAccess(db: Db, token: unknown, agora: Date): Promise<SessaoAutenticada> {
  if (!pareceToken(token)) throw new ErroApi('nao_autenticado');
  const r = await db.query(
    `SELECT id, tenant_id, user_id, audiencia, access_expira_em, revogada_em FROM sessions WHERE access_hash = $1`,
    [hashToken(token)],
  );
  const s = r.rows[0];
  // Token de operador nunca vale no app: responde como se não existisse.
  if (s === undefined || s.audiencia !== 'app') throw new ErroApi('nao_autenticado');
  if (s.revogada_em !== null) throw new ErroApi('sessao_revogada');
  if (s.access_expira_em <= agora) throw new ErroApi('sessao_expirada');
  return { sessionId: s.id, tenantId: s.tenant_id, userId: s.user_id };
}

/** Revoga e apaga o aparelho de push preso à sessão. Idempotente. */
export async function revogarSessao(db: Db, tenantId: string, sessionId: string, motivo: 'saiu' | 'reuso' | 'operador_desativado', agora: Date): Promise<void> {
  await db.query(
    `UPDATE sessions SET revogada_em = $3, revogada_motivo = $4 WHERE tenant_id = $1 AND id = $2 AND revogada_em IS NULL`,
    [tenantId, sessionId, agora, motivo],
  );
  await db.query(`DELETE FROM dispositivos WHERE tenant_id = $1 AND session_id = $2`, [tenantId, sessionId]);
}

export interface RenovacaoFeita extends ParDeTokens {
  tenantId: string;
  /** Pessoa do app (audiência `app`); vazio na do operador. */
  userId: string;
  /** Operador (audiência `operador`); vazio na do app. */
  operadorId: string | null;
}

export interface OpcoesRenovacao {
  audiencia: 'app' | 'operador';
  /** Duração do novo refresh; no app são 60 dias. Como função, recebe o tenant da sessão (a duração do operador é da config dele). */
  refreshSegundos: number | ((tenantId: string) => number);
}

/**
 * Troca o refresh por um par novo. Deve rodar numa transação. `limitar` é chamada com a sessão e o tenant já identificados
 * (limite de 60/h por sessão) e pode lançar 429.
 */
export async function renovarSessao(
  db: Db,
  refresh: unknown,
  agora: Date,
  limitar: (sessionId: string, tenantId: string) => Promise<void>,
  opcoes: OpcoesRenovacao = { audiencia: 'app', refreshSegundos: REFRESH_SEGUNDOS },
): Promise<RenovacaoFeita> {
  if (!pareceToken(refresh)) throw new ErroApi('nao_autenticado');
  const hash = hashToken(refresh);
  const atual = await db.query(
    `SELECT id, tenant_id, user_id, operador_id, audiencia, refresh_expira_em, revogada_em FROM sessions WHERE refresh_hash = $1 FOR UPDATE`,
    [hash],
  );
  const s = atual.rows[0];
  if (s === undefined) {
    // Não é o refresh vigente de nenhuma sessão. Se foi o anterior de alguma, alguém o usou duas vezes.
    const reuso = await db.query(`SELECT id, tenant_id, audiencia FROM sessions WHERE refresh_anterior_hash = $1 FOR UPDATE`, [hash]);
    const r = reuso.rows[0];
    if (r === undefined || r.audiencia !== opcoes.audiencia) throw new ErroApi('nao_autenticado');
    await revogarSessao(db, r.tenant_id, r.id, 'reuso', agora);
    throw new ErroSessaoRevogadaPorReuso();
  }
  if (s.audiencia !== opcoes.audiencia) throw new ErroApi('nao_autenticado');
  if (s.revogada_em !== null) throw new ErroApi('sessao_revogada');
  if (s.refresh_expira_em <= agora) throw new ErroApi('sessao_expirada');
  if (s.audiencia === 'operador') {
    const ativo = await db.query(`SELECT ativo FROM operadores WHERE tenant_id = $1 AND id = $2`, [s.tenant_id, s.operador_id]);
    if (ativo.rows[0]?.ativo !== true) {
      // Como na reutilização do refresh, a revogação precisa ser gravada mesmo que a resposta seja 401.
      await revogarSessao(db, s.tenant_id, s.id, 'operador_desativado', agora);
      throw new ErroSessaoRevogadaPorReuso();
    }
  }
  await limitar(s.id, s.tenant_id);

  const a = novoToken();
  const r = novoToken();
  const refreshSegundos = typeof opcoes.refreshSegundos === 'function' ? opcoes.refreshSegundos(s.tenant_id) : opcoes.refreshSegundos;
  const par = {
    accessToken: a.token,
    accessExpiraEm: somar(agora, ACCESS_SEGUNDOS),
    refreshToken: r.token,
    refreshExpiraEm: somar(agora, refreshSegundos),
  };
  await db.query(
    `UPDATE sessions SET access_hash = $3, access_expira_em = $4, refresh_hash = $5, refresh_expira_em = $6,
            refresh_anterior_hash = $7, renovada_em = $8
      WHERE tenant_id = $1 AND id = $2`,
    [s.tenant_id, s.id, a.hash, par.accessExpiraEm, r.hash, par.refreshExpiraEm, hash, agora],
  );
  return { ...par, tenantId: s.tenant_id, userId: s.user_id, operadorId: s.operador_id };
}

/**
 * A revogação por reuso precisa ser gravada mesmo que a requisição responda 401. Quem chama `renovarSessao` dentro
 * de uma transação deve confirmar (COMMIT) antes de responder quando pegar este erro, em vez de desfazer.
 */
export class ErroSessaoRevogadaPorReuso extends ErroApi {
  constructor() {
    super('sessao_revogada');
  }
}
