// /v1/dispositivo (openapi.yaml, tag dispositivo): o token de push deste aparelho, preso à sessão atual.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../db/transacao.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

export function rotasDispositivo(app: FastifyInstance, d: DepsAuth): void {
  app.put('/v1/dispositivo', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (typeof b.token !== 'string' || b.token.trim().length === 0 || b.token.length > 4096) campos.push({ campo: 'token', mensagem: 'Envie o token de push (até 4096 caracteres).' });
    if (b.plataforma !== 'android' && b.plataforma !== 'ios') campos.push({ campo: 'plataforma', mensagem: 'Use android ou ios.' });
    if (typeof b.versao_app !== 'string' || b.versao_app.trim().length === 0 || b.versao_app.length > 32) campos.push({ campo: 'versao_app', mensagem: 'Envie a versão do app (até 32 caracteres).' });
    if (campos.length > 0) throw falhaDeValidacao(campos);

    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa.dispositivoPorSessao ?? { maximo: 30, janelaSegundos: 3600 };
    const espera = await d.limitador.usar(`dispositivoPorSessao:${ctx.sessionId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    await comTransacao(d.db, async (c) => {
      // Trava a pessoa: revogar o consentimento (que apaga os tokens) e registrar ao mesmo tempo não pode deixar token órfão.
      const u = (await c.query(`SELECT notificacoes_consentidas_em FROM users WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, ctx.userId])).rows[0];
      if (u.notificacoes_consentidas_em === null) {
        throw falhaDeValidacao([{ campo: 'token', mensagem: 'Ative as notificações antes de registrar este aparelho.' }]);
      }
      // O token é do aparelho: se estava ligado a outra sessão (outra conta no mesmo aparelho, ou sessão antiga), passa para esta.
      await c.query(`DELETE FROM dispositivos WHERE tenant_id = $1 AND token = $2 AND session_id <> $3`, [ctx.tenantId, b.token, ctx.sessionId]);
      await c.query(
        `INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app, registrado_em) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (tenant_id, session_id) DO UPDATE SET token = excluded.token, plataforma = excluded.plataforma, versao_app = excluded.versao_app,
           registrado_em = CASE WHEN dispositivos.token = excluded.token THEN dispositivos.registrado_em ELSE excluded.registrado_em END`,
        [ctx.tenantId, ctx.userId, ctx.sessionId, b.token, b.plataforma, b.versao_app, agora],
      );
    });
    return reply.code(204).send();
  });

  app.delete('/v1/dispositivo', async (req, reply) => {
    // O contrato só prevê 401: sair do push não depende dos termos.
    const ctx = await exigirSessao(req, d.db, d.tenants, d.agora(), { permitirTermosPendentes: true });
    await d.db.query(`DELETE FROM dispositivos WHERE tenant_id = $1 AND session_id = $2`, [ctx.tenantId, ctx.sessionId]);
    return reply.code(204).send();
  });
}
