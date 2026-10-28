// /v1/me, /v1/me/consentimentos (openapi.yaml, tag conta). Todas respondem mesmo com os termos pendentes (LGPD).
import type { FastifyInstance } from 'fastify';
import { montarUsuario } from '../../auth/usuarios.js';
import { comTransacao } from '../../db/transacao.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

export function rotasConta(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/me', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora, { permitirTermosPendentes: true });
    return montarUsuario(d.db, ctx.tenantId, ctx.userId, ctx.tenant.config.app, agora);
  });

  app.put('/v1/me/consentimentos', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora, { permitirTermosPendentes: true });
    const b = corpoObjeto(req);

    const campos: CampoInvalido[] = [];
    const temTermos = 'termos_versao' in b;
    const temNotificacoes = 'notificacoes' in b;
    if (!temTermos && !temNotificacoes) campos.push({ campo: 'termos_versao', mensagem: 'Informe termos_versao ou notificacoes.' });
    if (temTermos && (typeof b.termos_versao !== 'string' || b.termos_versao.length === 0 || b.termos_versao.length > 32)) {
      campos.push({ campo: 'termos_versao', mensagem: 'Informe a versão dos termos.' });
    }
    if (temNotificacoes && typeof b.notificacoes !== 'boolean') campos.push({ campo: 'notificacoes', mensagem: 'Use verdadeiro ou falso.' });
    if (campos.length > 0) throw falhaDeValidacao(campos);

    if (temTermos && b.termos_versao !== ctx.tenant.config.app.termos.versao) throw new ErroApi('termos_desatualizados');

    await comTransacao(d.db, async (c) => {
      const atual = (
        await c.query(`SELECT termos_versao, notificacoes_consentidas_em FROM users WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, ctx.userId])
      ).rows[0];
      // Repetir o mesmo valor não muda as datas já gravadas.
      if (temTermos && atual.termos_versao !== b.termos_versao) {
        await c.query(`UPDATE users SET termos_versao = $3, termos_aceitos_em = $4 WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, ctx.userId, b.termos_versao, agora]);
      }
      if (b.notificacoes === true && atual.notificacoes_consentidas_em === null) {
        await c.query(`UPDATE users SET notificacoes_consentidas_em = $3 WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, ctx.userId, agora]);
      }
      if (b.notificacoes === false) {
        await c.query(`UPDATE users SET notificacoes_consentidas_em = NULL WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, ctx.userId]);
        // Sem consentimento não se guarda o token de push; o app registra de novo ao consentir (DECISIONS 73).
        await c.query(`DELETE FROM dispositivos WHERE tenant_id = $1 AND user_id = $2`, [ctx.tenantId, ctx.userId]);
      }
    });
    return montarUsuario(d.db, ctx.tenantId, ctx.userId, ctx.tenant.config.app, agora);
  });

  app.delete('/v1/me', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora, { permitirTermosPendentes: true });
    const b = corpoObjeto(req);
    if (b.confirmacao !== 'excluir') throw falhaDeValidacao([{ campo: 'confirmacao', mensagem: 'Envie "excluir" para confirmar.' }]);
    // Todas as tabelas da pessoa apontam para `users` com ON DELETE CASCADE (sessões, preferências, assinaturas, aparelhos...).
    await d.db.query(`DELETE FROM users WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, ctx.userId]);
    return reply.code(204).send();
  });
}
