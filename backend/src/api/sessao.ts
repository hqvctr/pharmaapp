// Controle de acesso das rotas com login: Authorization: Bearer <access>. O tenant vem da sessão, nunca de X-Tenant.
import type { FastifyRequest } from 'fastify';
import type { Db } from '../pipeline/repositorio.js';
import { sessaoDoAccess, type SessaoAutenticada } from '../auth/sessoes.js';
import { ErroApi } from './erros.js';
import type { RegistroTenants, TenantAtivo } from './tenants.js';

export interface ContextoSessao extends SessaoAutenticada {
  tenant: TenantAtivo;
}

export interface OpcoesSessao {
  /** `/v1/me*` e `/v1/auth/*` respondem mesmo com os termos pendentes (LGPD); as demais rotas dão 403. */
  permitirTermosPendentes?: boolean;
}

export async function exigirSessao(
  req: FastifyRequest,
  db: Db,
  tenants: RegistroTenants,
  agora: Date,
  opcoes: OpcoesSessao = {},
): Promise<ContextoSessao> {
  const cab = req.headers.authorization;
  const m = typeof cab === 'string' ? /^Bearer (\S+)$/.exec(cab) : null;
  const sessao = await sessaoDoAccess(db, m?.[1], agora);
  const tenant = await tenants.porId(sessao.tenantId);
  if (tenant === null) throw new ErroApi('nao_autenticado');
  if (opcoes.permitirTermosPendentes !== true) {
    const r = await db.query(`SELECT termos_versao FROM users WHERE tenant_id = $1 AND id = $2`, [sessao.tenantId, sessao.userId]);
    if (r.rows[0]?.termos_versao !== tenant.config.app.termos.versao) throw new ErroApi('termos_pendentes');
  }
  return { ...sessao, tenant };
}
