// SQL do despacho de push. Toda query filtra por tenant_id.
import type { Db } from '../pipeline/repositorio.js';

/** Último alerta de cada oferta, recente, que pode virar push (notificar, ou aprovado por humano). */
export async function alertasParaDespachar(db: Db, tenantId: string, desde: Date): Promise<Array<{ alertaId: string; ofertaId: string }>> {
  const r = await db.query(
    `SELECT a.id, a.offer_id FROM alerts a
      WHERE a.tenant_id = $1 AND a.criado_em > $2
        AND (a.decisao = 'notificar' OR (a.decisao = 'aguardar_aprovacao' AND a.aprovado_em IS NOT NULL))
        AND NOT EXISTS (SELECT 1 FROM alerts b WHERE b.tenant_id = a.tenant_id AND b.offer_id = a.offer_id
                          AND (b.criado_em, b.id) > (a.criado_em, a.id))
      ORDER BY a.criado_em, a.id`,
    [tenantId, desde],
  );
  return r.rows.map((l) => ({ alertaId: l.id, ofertaId: l.offer_id }));
}

export interface Destinatario {
  userId: string;
  limiteDiario: number | null;
  silencioInicio: string | null;
  silencioFim: string | null;
  enviadasHoje: number;
}

export interface ConsultaDestinatarios {
  tenantId: string;
  alertaId: string;
  lojaId: string;
  categoria: string;
  tamanhoFralda: string | null;
  termosVersao: string;
  maxCepsGratuito: number;
  maxCepsPremium: number;
  fuso: string;
  agora: Date;
}

/**
 * Quem pode receber este alerta: consentiu, aceitou os termos vigentes, escolheu a categoria (e o
 * tamanho, se for fralda), tem entrega para um CEP dentro do plano, tem aparelho com sessão ativa e
 * ainda não tem entrega deste alerta. Silêncio e limite do dia são checados fora, por usuário.
 */
export async function destinatarios(db: Db, q: ConsultaDestinatarios): Promise<Destinatario[]> {
  const r = await db.query(
    `SELECT u.id, up.limite_diario, to_char(up.silencio_inicio, 'HH24:MI') AS ini, to_char(up.silencio_fim, 'HH24:MI') AS fim,
            (SELECT count(*) FROM deliveries d
              WHERE d.tenant_id = u.tenant_id AND d.user_id = u.id AND d.status = 'enviada'
                AND (d.enviado_em AT TIME ZONE $9)::date = ($10::timestamptz AT TIME ZONE $9)::date)::int AS enviadas_hoje
       FROM users u
       JOIN user_preferences up ON up.tenant_id = u.tenant_id AND up.user_id = u.id
      WHERE u.tenant_id = $1
        AND u.notificacoes_consentidas_em IS NOT NULL
        AND u.termos_versao = $5
        AND $3 = ANY(up.categorias)
        AND ($4::text IS NULL OR cardinality(up.tamanhos_fralda) = 0 OR $4 = ANY(up.tamanhos_fralda))
        AND EXISTS (
          SELECT 1 FROM store_service_areas sa,
                 unnest(up.ceps[1:(CASE WHEN EXISTS (
                   SELECT 1 FROM subscriptions sub WHERE sub.tenant_id = u.tenant_id AND sub.user_id = u.id
                     AND sub.status = 'ativa' AND (sub.expira_em IS NULL OR sub.expira_em > $10)) THEN $8::int ELSE $7::int END)]) AS c(cep)
           WHERE sa.tenant_id = u.tenant_id AND sa.store_id = $6 AND c.cep BETWEEN sa.cep_inicio AND sa.cep_fim)
        AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.tenant_id = u.tenant_id AND d.alert_id = $2 AND d.user_id = u.id)
        AND EXISTS (SELECT 1 FROM dispositivos di JOIN sessoes s ON s.id = di.sessao_id
                     WHERE di.tenant_id = u.tenant_id AND di.user_id = u.id AND s.revogada_em IS NULL AND s.expira_em > $10)
      ORDER BY u.id`,
    [q.tenantId, q.alertaId, q.categoria, q.tamanhoFralda, q.termosVersao, q.lojaId, q.maxCepsGratuito, q.maxCepsPremium, q.fuso, q.agora],
  );
  return r.rows.map((l) => ({
    userId: l.id,
    limiteDiario: l.limite_diario,
    silencioInicio: l.ini,
    silencioFim: l.fim,
    enviadasHoje: l.enviadas_hoje,
  }));
}

/** Reserva a entrega antes de enviar: dois despachos nunca mandam o mesmo alerta duas vezes. */
export async function reservarEntrega(db: Db, tenantId: string, alertaId: string, userId: string, agora: Date): Promise<string | null> {
  const r = await db.query(
    `INSERT INTO deliveries (tenant_id, alert_id, user_id, canal, status, criado_em) VALUES ($1, $2, $3, 'push', 'pendente', $4)
     ON CONFLICT (tenant_id, alert_id, user_id, canal) DO NOTHING RETURNING id`,
    [tenantId, alertaId, userId, agora],
  );
  return r.rowCount === 0 ? null : r.rows[0].id;
}

export async function concluirEntrega(
  db: Db,
  tenantId: string,
  entregaId: string,
  resultado: { status: 'enviada' | 'falhou'; enviadoEm: Date | null; erro: string | null },
): Promise<void> {
  await db.query(`UPDATE deliveries SET status = $3, enviado_em = $4, erro = $5 WHERE tenant_id = $1 AND id = $2`, [
    tenantId,
    entregaId,
    resultado.status,
    resultado.enviadoEm,
    resultado.erro,
  ]);
}

export async function aparelhosAtivos(db: Db, tenantId: string, userId: string, agora: Date): Promise<Array<{ id: string; token: string }>> {
  const r = await db.query(
    `SELECT di.id, di.token FROM dispositivos di JOIN sessoes s ON s.id = di.sessao_id
      WHERE di.tenant_id = $1 AND di.user_id = $2 AND s.revogada_em IS NULL AND s.expira_em > $3
      ORDER BY di.atualizado_em DESC`,
    [tenantId, userId, agora],
  );
  return r.rows.map((l) => ({ id: l.id, token: l.token }));
}

export async function removerAparelho(db: Db, tenantId: string, id: string): Promise<void> {
  await db.query('DELETE FROM dispositivos WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
}
