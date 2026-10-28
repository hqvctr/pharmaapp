// Controle de acesso das rotas do operador: Authorization: Bearer <access de operador>. O tenant vem da sessão.
import type { FastifyRequest } from 'fastify';
import { sessaoOperadorDoAccess } from '../auth/sessoes.js';
import type { Db } from '../pipeline/repositorio.js';
import { ErroApi } from './erros.js';
import type { RegistroTenants, TenantAtivo } from './tenants.js';

export interface OperadorLogado {
  id: string;
  email: string;
  nome: string;
  criado_em: string;
}

export interface ContextoOperador {
  sessionId: string;
  tenantId: string;
  operador: OperadorLogado;
  tenant: TenantAtivo;
}

export async function exigirOperador(req: FastifyRequest, db: Db, tenants: RegistroTenants, agora: Date): Promise<ContextoOperador> {
  const cab = req.headers.authorization;
  const m = typeof cab === 'string' ? /^Bearer (\S+)$/.exec(cab) : null;
  const sessao = await sessaoOperadorDoAccess(db, m?.[1], agora);
  const tenant = await tenants.porId(sessao.tenantId);
  if (tenant === null) throw new ErroApi('nao_autenticado');
  const o = (await db.query(`SELECT id, email, nome, criado_em FROM operadores WHERE tenant_id = $1 AND id = $2`, [sessao.tenantId, sessao.operadorId])).rows[0];
  return { sessionId: sessao.sessionId, tenantId: sessao.tenantId, tenant, operador: { id: o.id, email: o.email, nome: o.nome, criado_em: o.criado_em.toISOString() } };
}
