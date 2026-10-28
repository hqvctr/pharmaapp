// O que as rotas precisam saber da pessoa para filtrar o que ela vê: CEPs que o plano usa e categorias escolhidas.
import { montarUsuario } from '../auth/usuarios.js';
import type { Db } from '../pipeline/repositorio.js';
import type { ConfigApp } from '../shared/configApp.js';

export async function preferenciasDaPessoa(db: Db, tenantId: string, userId: string, app: ConfigApp, agora: Date): Promise<{ ceps: string[]; categorias: string[] }> {
  const usuario = await montarUsuario(db, tenantId, userId, app, agora);
  const r = (await db.query(`SELECT categorias, ceps FROM user_preferences WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId])).rows[0];
  return { ceps: ((r?.ceps ?? []) as string[]).slice(0, usuario.plano.ceps_permitidos), categorias: (r?.categorias ?? []) as string[] };
}
