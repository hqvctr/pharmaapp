// Dependências e utilitários compartilhados pelas rotas v1.
import type pg from 'pg';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ChavesGoogle } from '../../auth/google.js';
import type { EnviadorEmail } from '../../auth/email.js';
import type { LimitadorTaxa } from '../../auth/limitador.js';
import { gerarToken, hashToken } from '../../auth/segredos.js';
import type { ConfigApp } from '../../shared/tenantConfig.js';
import * as repo from '../repositorio.js';
import type { ResolvedorTenants, TenantResolvido } from '../tenants.js';

export interface DepsV1 {
  db: pg.Pool;
  tenants: ResolvedorTenants;
  email: EnviadorEmail;
  limitador: LimitadorTaxa;
  chavesGoogle: ChavesGoogle;
  /** Chave do HMAC dos códigos de login (AUTH_CODIGO_CHAVE). */
  codigoChave: Buffer;
  agora: () => Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido pelo hook de tenant antes de qualquer handler v1. */
    tenant: TenantResolvido;
    /** Preenchido pelo hook de sessão nas rotas autenticadas. */
    sessao: repo.SessaoAtiva | null;
  }
}

export type Handler = (req: FastifyRequest, reply: FastifyReply, deps: DepsV1) => Promise<unknown>;

export const HORA_MS = 3_600_000;
export const DIA_MS = 86_400_000;

export async function emTransacao<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

export function sessaoDe(req: FastifyRequest): repo.SessaoAtiva {
  if (req.sessao === null) throw new Error('Rota autenticada sem sessão: hook ausente');
  return req.sessao;
}

export function iso(d: Date | null): string | null {
  return d === null ? null : d.toISOString();
}

export function visaoUsuario(u: repo.LinhaUsuario, app: ConfigApp): Record<string, unknown> {
  const plano = u.premium ? 'premium' : 'gratuito';
  return {
    id: u.id,
    email: u.email,
    plano,
    limites: { maxCeps: app.planos[plano].maxCeps },
    termos: {
      versaoVigente: app.documentos.termos.versao,
      versaoAceita: u.termosVersao,
      aceitosEm: iso(u.termosAceitosEm),
      pendente: u.termosVersao !== app.documentos.termos.versao,
    },
    notificacoes: { consentidas: u.notificacoesConsentidasEm !== null, consentidasEm: iso(u.notificacoesConsentidasEm) },
  };
}

/** Cria a sessão dentro da transação do login. */
export async function abrirSessao(
  db: repo.Db,
  tenant: TenantResolvido,
  userId: string,
  agora: Date,
): Promise<{ token: string; expiraEm: Date }> {
  const token = gerarToken();
  const expiraEm = new Date(agora.getTime() + tenant.config.app.auth.sessaoDias * DIA_MS);
  await repo.criarSessao(db, { tenantId: tenant.id, userId, tokenHash: hashToken(token), agora, expiraEm });
  return { token, expiraEm };
}
