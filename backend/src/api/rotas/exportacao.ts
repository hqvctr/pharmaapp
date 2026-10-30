// GET /v1/me/exportacao (openapi.yaml, tag conta): tudo o que a conta tem guardado, em JSON (LGPD, art. 18). Responde com termos pendentes.
import type { FastifyInstance } from 'fastify';
import { montarUsuario } from '../../auth/usuarios.js';
import { comTransacao } from '../../db/transacao.js';
import type { Db } from '../../pipeline/repositorio.js';
import { ErroApi } from '../erros.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';
import { COLUNAS_AVISO, JUNCOES_AVISO, paraAviso } from './avisos.js';
import { lerPreferencias } from './preferencias.js';
import { todosSeguidos } from './seguidos.js';
import { listarSilenciamentos } from './silenciamentos.js';

/**
 * Tabelas que apontam para `users` e **não** saem na exportação, com o motivo. O teste confere que toda tabela da pessoa está aqui ou na
 * exportação, para uma tabela nova não ficar de fora sem ninguém decidir.
 */
export const TABELAS_FORA_DA_EXPORTACAO: Record<string, string> = {
  sessions: 'só hashes de token e datas de sessão; não é dado da pessoa que o contrato exporte',
};

const iso = (d: Date): string => d.toISOString();

export function rotasExportacao(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/me/exportacao', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora, { permitirTermosPendentes: true });
    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa.exportacaoPorConta ?? { maximo: 1, janelaSegundos: 3600 };
    const espera = await d.limitador.usar(`exportacaoPorConta:${ctx.userId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const t = ctx.tenantId;
    const u = ctx.userId;
    // Uma leitura só, de um instante só: o arquivo não mistura o antes e o depois de uma gravação no meio.
    const dados = await comTransacao(d.db, async (c) => {
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const db: Db = c;
      const conta = await montarUsuario(db, t, u, ctx.tenant.config.app, agora);
      const avisos = (await db.query(`SELECT ${COLUNAS_AVISO} ${JUNCOES_AVISO} WHERE av.tenant_id = $1 AND av.user_id = $2 ORDER BY av.criado_em DESC, av.id DESC`, [t, u])).rows;
      const avaliacoes = (await db.query(`SELECT alert_id, valor, avaliado_em FROM avaliacoes WHERE tenant_id = $1 AND user_id = $2 ORDER BY avaliado_em DESC, alert_id`, [t, u])).rows;
      const denuncias = (await db.query(`SELECT alert_id, motivo, denunciado_em FROM denuncias WHERE tenant_id = $1 AND user_id = $2 ORDER BY denunciado_em DESC, alert_id`, [t, u])).rows;
      const eventos = (await db.query(`SELECT alert_id, tipo, origem, ocorrido_em FROM alert_events WHERE tenant_id = $1 AND user_id = $2 ORDER BY ocorrido_em DESC, id DESC`, [t, u])).rows;
      // O token de push não sai: só serve para enviar, e quem o tem é o aparelho.
      const dispositivos = (await db.query(`SELECT plataforma, versao_app, registrado_em FROM dispositivos WHERE tenant_id = $1 AND user_id = $2 ORDER BY registrado_em DESC, id`, [t, u])).rows;
      // O hash do comprovante da loja de apps também não sai.
      const assinaturas = (await db.query(`SELECT plano, status, origem, iniciada_em, expira_em FROM subscriptions WHERE tenant_id = $1 AND user_id = $2 ORDER BY iniciada_em DESC, id`, [t, u])).rows;
      return {
        conta,
        preferencias: await lerPreferencias(db, t, u, conta.plano.ceps_permitidos),
        silenciamentos: await listarSilenciamentos(db, t, u),
        seguidos: await todosSeguidos(db, t, u),
        avisos: avisos.map(paraAviso),
        avaliacoes: avaliacoes.map((r: any) => ({ alerta_id: r.alert_id, valor: r.valor, avaliado_em: iso(r.avaliado_em) })),
        denuncias: denuncias.map((r: any) => ({ alerta_id: r.alert_id, motivo: r.motivo, denunciado_em: iso(r.denunciado_em) })),
        eventos: eventos.map((r: any) => ({ alerta_id: r.alert_id, tipo: r.tipo, origem: r.origem, ocorrido_em: iso(r.ocorrido_em) })),
        dispositivos: dispositivos.map((r: any) => ({ plataforma: r.plataforma, versao_app: r.versao_app, registrado_em: iso(r.registrado_em) })),
        assinaturas: assinaturas.map((r: any) => ({ plano: r.plano, status: r.status, loja: r.origem, iniciada_em: iso(r.iniciada_em), expira_em: r.expira_em === null ? null : iso(r.expira_em) })),
      };
    });
    reply.header('Content-Disposition', 'attachment; filename="economae-dados.json"');
    return { gerado_em: iso(agora), ...dados };
  });
}
