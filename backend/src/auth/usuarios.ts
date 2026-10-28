// Conta do app: achar ou criar pelo e-mail provado e montar o `Usuario` do contrato.
import type { Db } from '../pipeline/repositorio.js';
import type { ConfigApp } from '../shared/configApp.js';

export async function acharOuCriarPorEmail(
  db: Db,
  tenantId: string,
  email: string,
  agora: Date,
): Promise<{ userId: string; contaNova: boolean }> {
  // `xmax = 0` só é verdade na linha que acabou de ser inserida.
  const r = await db.query(
    `INSERT INTO users (tenant_id, email, email_verificado_em, criado_em) VALUES ($1, $2, $3, $3)
     ON CONFLICT (tenant_id, lower(email)) DO UPDATE SET email_verificado_em = COALESCE(users.email_verificado_em, EXCLUDED.email_verificado_em)
     RETURNING id, (xmax = 0) AS nova`,
    [tenantId, email, agora],
  );
  return { userId: r.rows[0].id, contaNova: r.rows[0].nova === true };
}

export interface UsuarioApi {
  id: string;
  email: string;
  metodos_login: Array<'email' | 'google' | 'apple'>;
  termos_pendentes: boolean;
  termos_versao: string | null;
  termos_aceitos_em: string | null;
  notificacoes_consentidas: boolean;
  notificacoes_consentidas_em: string | null;
  plano: {
    tipo: 'gratuito' | 'premium';
    anuncios: boolean;
    ceps_permitidos: number;
    assinatura: { plano: string; status: string; loja: string; iniciada_em: string; expira_em: string | null } | null;
  };
  criado_em: string;
}

const iso = (d: Date | null): string | null => (d === null ? null : d.toISOString());

export async function montarUsuario(db: Db, tenantId: string, userId: string, app: ConfigApp, agora: Date): Promise<UsuarioApi> {
  const u = (
    await db.query(
      `SELECT id, email, google_sub, apple_sub, email_verificado_em, termos_versao, termos_aceitos_em,
              notificacoes_consentidas_em, criado_em
         FROM users WHERE tenant_id = $1 AND id = $2`,
      [tenantId, userId],
    )
  ).rows[0];
  const sub = (
    await db.query(
      `SELECT plano, status, origem, iniciada_em, expira_em FROM subscriptions
        WHERE tenant_id = $1 AND user_id = $2 ORDER BY iniciada_em DESC LIMIT 1`,
      [tenantId, userId],
    )
  ).rows[0];
  const assinatura =
    sub === undefined
      ? null
      : { plano: sub.plano, status: sub.status, loja: sub.origem, iniciada_em: iso(sub.iniciada_em)!, expira_em: iso(sub.expira_em) };
  const premium = sub !== undefined && sub.status === 'ativa' && (sub.expira_em === null || sub.expira_em > agora);
  const metodos: UsuarioApi['metodos_login'] = [];
  if (u.email_verificado_em !== null) metodos.push('email');
  if (u.google_sub !== null) metodos.push('google');
  if (u.apple_sub !== null) metodos.push('apple');
  return {
    id: u.id,
    email: u.email,
    metodos_login: metodos,
    termos_pendentes: u.termos_versao !== app.termos.versao,
    termos_versao: u.termos_versao,
    termos_aceitos_em: iso(u.termos_aceitos_em),
    notificacoes_consentidas: u.notificacoes_consentidas_em !== null,
    notificacoes_consentidas_em: iso(u.notificacoes_consentidas_em),
    plano: premium
      ? { tipo: 'premium', anuncios: false, ceps_permitidos: app.limites.cepsPremium, assinatura }
      : { tipo: 'gratuito', anuncios: true, ceps_permitidos: app.limites.cepsGratuito, assinatura },
    criado_em: iso(u.criado_em)!,
  };
}
