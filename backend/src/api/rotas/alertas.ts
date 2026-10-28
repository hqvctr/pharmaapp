// /v1/alertas, /v1/alertas/{id} e /v1/alertas/{id}/eventos (openapi.yaml, tag feed). Exigem termos aceitos.
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { diaLocal } from '../../avaliador/historico.js';
import { comTransacao } from '../../db/transacao.js';
import { consultarAlertas, paraAlerta } from '../alertas.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { codificarCursor, lerCursor, UUID } from '../cursor.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import type { ProvedorLinkOferta } from '../linkOferta.js';
import { preferenciasDaPessoa } from '../pessoa.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const CATEGORIA = /^[a-z0-9_]+$/;
const TIPOS = ['aberto', 'clicado', 'compartilhado'];
const ORIGENS = ['push', 'feed', 'central', 'produto'];
const VALIDADE_CHAVE_MS = 24 * 3600_000;

export interface DepsAlertas extends DepsAuth {
  links: ProvedorLinkOferta;
}

export function rotasAlertas(app: FastifyInstance, d: DepsAlertas): void {
  const preferencias = (tenantId: string, userId: string, ctx: { tenant: { config: any } }, agora: Date) =>
    preferenciasDaPessoa(d.db, tenantId, userId, ctx.tenant.config.app, agora);

  /** O alerta, se a pessoa poderia tê-lo visto (mesmas regras do detalhe); senão 404. */
  async function alertaVisivel(ctx: { tenantId: string; userId: string; tenant: { config: any } }, id: string, agora: Date) {
    if (!UUID.test(id)) throw new ErroApi('nao_encontrado');
    const { ceps } = await preferencias(ctx.tenantId, ctx.userId, ctx, agora);
    const linha = (await consultarAlertas(d.db, { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, alertaId: id }))[0];
    if (linha === undefined) throw new ErroApi('nao_encontrado');
    return linha;
  }

  app.get('/v1/alertas', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    let categoria: string | undefined;
    if (q.categoria !== undefined) {
      if (typeof q.categoria !== 'string' || !CATEGORIA.test(q.categoria)) campos.push({ campo: 'categoria', mensagem: 'Categoria inválida.' });
      else categoria = q.categoria;
    }
    let limite = 20;
    if (q.limite !== undefined) {
      const n = Number(q.limite);
      if (!Number.isInteger(n) || n < 1 || n > 50) campos.push({ campo: 'limite', mensagem: 'Use de 1 a 50.' });
      else limite = n;
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const cursor = lerCursor(q.cursor);

    const { ceps, categorias } = await preferencias(ctx.tenantId, ctx.userId, ctx, agora);
    const vazioPor = ceps.length === 0 ? 'sem_ceps' : categorias.length === 0 ? 'sem_categorias' : null;
    if (vazioPor !== null) return { itens: [], proximo_cursor: null, vazio_por: vazioPor };

    const linhas = await consultarAlertas(d.db, {
      tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, categorias,
      ...(categoria !== undefined ? { categoria } : {}), ...(cursor !== undefined ? { cursor } : {}), limite,
    });
    const pagina = linhas.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(paraAlerta),
      proximo_cursor: linhas.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criado_em.toISOString(), id: ultimo.id }) : null,
      vazio_por: null,
    };
  });

  app.get('/v1/alertas/:id', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const id = (req.params as { id: string }).id;
    if (!UUID.test(id)) throw new ErroApi('nao_encontrado');
    const { ceps } = await preferencias(ctx.tenantId, ctx.userId, ctx, agora);
    const linha = (await consultarAlertas(d.db, { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, alertaId: id }))[0];
    if (linha === undefined) throw new ErroApi('nao_encontrado');

    // Promoção encerrada ou em revisão mostra o estado, sem botão para a loja: só gera link rastreado de oferta ativa.
    const link = linha.situacao === 'ativa'
      ? await d.links.resolver(ctx.tenantId, { id: linha.offer_id, link: linha.link, link_afiliado: linha.link_afiliado, fonte: linha.fonte }, agora)
      : { link: linha.link, afiliado: false };

    const desde = (await d.db.query(`SELECT min(observado_em) AS primeira FROM price_history WHERE tenant_id = $1 AND product_id = $2 AND store_id = $3`, [ctx.tenantId, linha.product_id, linha.store_id])).rows[0]?.primeira ?? null;
    const aval = (await d.db.query(`SELECT valor, avaliado_em FROM avaliacoes WHERE tenant_id = $1 AND user_id = $2 AND alert_id = $3`, [ctx.tenantId, ctx.userId, id])).rows[0];
    const den = (await d.db.query(`SELECT motivo, denunciado_em FROM denuncias WHERE tenant_id = $1 AND user_id = $2 AND alert_id = $3`, [ctx.tenantId, ctx.userId, id])).rows[0];
    return {
      ...paraAlerta(linha),
      valida_de: linha.valida_de === null ? null : linha.valida_de.toISOString(),
      frete: { status: linha.frete_status, centavos: linha.frete_status === 'conhecido' ? linha.frete_centavos : null },
      link: link.link,
      link_afiliado: link.afiliado,
      historico_desde: desde === null ? null : diaLocal(desde, ctx.tenant.config.fuso),
      avaliacao: aval === undefined ? null : { alerta_id: id, valor: aval.valor, avaliado_em: aval.avaliado_em.toISOString() },
      denuncia: den === undefined ? null : { alerta_id: id, motivo: den.motivo, denunciado_em: den.denunciado_em.toISOString() },
    };
  });

  app.post('/v1/alertas/:id/eventos', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const id = (req.params as { id: string }).id;
    if (!UUID.test(id)) throw new ErroApi('nao_encontrado');
    const b = corpoObjeto(req);
    const chave = req.headers['idempotency-key'];

    const campos: CampoInvalido[] = [];
    if (typeof chave !== 'string' || !UUID.test(chave)) campos.push({ campo: 'Idempotency-Key', mensagem: 'Envie um UUID neste cabeçalho.' });
    if (typeof b.tipo !== 'string' || !TIPOS.includes(b.tipo)) campos.push({ campo: 'tipo', mensagem: 'Use aberto, clicado ou compartilhado.' });
    if (typeof b.origem !== 'string' || !ORIGENS.includes(b.origem)) campos.push({ campo: 'origem', mensagem: 'Use push, feed, central ou produto.' });
    let ocorrido = agora;
    if (b.ocorrido_em !== undefined) {
      const t = typeof b.ocorrido_em === 'string' ? Date.parse(b.ocorrido_em) : Number.NaN;
      if (Number.isNaN(t)) campos.push({ campo: 'ocorrido_em', mensagem: 'Use data e hora ISO 8601.' });
      else if (t <= agora.getTime()) ocorrido = new Date(t); // no futuro: vale a hora do servidor
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);

    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa.eventosPorConta ?? { maximo: 300, janelaSegundos: 3600 };
    const espera = await d.limitador.usar(`eventosPorConta:${ctx.userId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    // O alerta precisa ser um que a pessoa poderia ter visto (mesmas regras do detalhe).
    const { ceps } = await preferencias(ctx.tenantId, ctx.userId, ctx, agora);
    const visivel = (await consultarAlertas(d.db, { tenantId: ctx.tenantId, userId: ctx.userId, config: ctx.tenant.config, agora, ceps, alertaId: id }))[0];
    if (visivel === undefined) throw new ErroApi('nao_encontrado');

    const corpoHash = createHash('sha256').update(JSON.stringify({ tipo: b.tipo, origem: b.origem, ocorrido_em: b.ocorrido_em ?? null })).digest();
    const rota = `eventos:${id}`;
    await comTransacao(d.db, async (c) => {
      const antigo = (
        await c.query(
          `SELECT corpo_hash, criada_em FROM idempotencia_chaves WHERE tenant_id = $1 AND escopo = $2 AND rota = $3 AND chave = $4 FOR UPDATE`,
          [ctx.tenantId, ctx.userId, rota, chave],
        )
      ).rows[0];
      if (antigo !== undefined && agora.getTime() - antigo.criada_em.getTime() < VALIDADE_CHAVE_MS) {
        if (!antigo.corpo_hash.equals(corpoHash)) throw new ErroApi('idempotencia_conflito');
        return; // mesma chave, mesmo corpo: já registrado
      }
      await c.query(
        `INSERT INTO idempotencia_chaves (tenant_id, escopo, rota, chave, corpo_hash, resposta_status, resposta, criada_em)
         VALUES ($1, $2, $3, $4, $5, 204, '{}'::jsonb, $6)
         ON CONFLICT (tenant_id, escopo, rota, chave) DO UPDATE SET corpo_hash = EXCLUDED.corpo_hash, criada_em = EXCLUDED.criada_em`,
        [ctx.tenantId, ctx.userId, rota, chave, corpoHash, agora],
      );
      await c.query(
        `INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em, registrado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ctx.tenantId, ctx.userId, id, b.tipo, b.origem, ocorrido, agora],
      );
    });
    return reply.code(204).send();
  });

  app.put('/v1/alertas/:id/avaliacao', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const id = (req.params as { id: string }).id;
    const b = corpoObjeto(req);
    if (b.valor !== 'util' && b.valor !== 'nao_util') throw falhaDeValidacao([{ campo: 'valor', mensagem: 'Use util ou nao_util.' }]);
    await alertaVisivel(ctx, id, agora);
    // Uma por pessoa; repetir substitui. Repetir o mesmo valor mantém a data.
    const r = (
      await d.db.query(
        `INSERT INTO avaliacoes (tenant_id, user_id, alert_id, valor, avaliado_em) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, user_id, alert_id) DO UPDATE SET valor = EXCLUDED.valor,
           avaliado_em = CASE WHEN avaliacoes.valor = EXCLUDED.valor THEN avaliacoes.avaliado_em ELSE EXCLUDED.avaliado_em END
         RETURNING valor, avaliado_em`,
        [ctx.tenantId, ctx.userId, id, b.valor, agora],
      )
    ).rows[0];
    return { alerta_id: id, valor: r.valor, avaliado_em: r.avaliado_em.toISOString() };
  });

  app.put('/v1/alertas/:id/denuncia', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const id = (req.params as { id: string }).id;
    const b = corpoObjeto(req);
    if (b.motivo !== 'preco_errado' && b.motivo !== 'sem_estoque') throw falhaDeValidacao([{ campo: 'motivo', mensagem: 'Use preco_errado ou sem_estoque.' }]);
    const linha = await alertaVisivel(ctx, id, agora);
    // Promoção já encerrada não tem o que denunciar. Em revisão (já escondida) ainda aceita repetir a própria denúncia.
    if (linha.situacao === 'encerrada') throw new ErroApi('nao_encontrado');

    const { maximo, janelaSegundos } = ctx.tenant.config.app.limitesTaxa.denunciasPorConta ?? { maximo: 20, janelaSegundos: 86400 };
    const espera = await d.limitador.usar(`denunciasPorConta:${ctx.userId}`, maximo, janelaSegundos).catch(() => null);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const regra = ctx.tenant.config.app.denuncia;
    const { criada, denunciadoEm } = await comTransacao(d.db, async (c) => {
      // Trava o alerta: duas denúncias simultâneas não abrem dois casos nem erram a contagem.
      await c.query(`SELECT 1 FROM alerts WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, id]);
      const antes = (await c.query(`SELECT motivo, denunciado_em FROM denuncias WHERE tenant_id = $1 AND user_id = $2 AND alert_id = $3`, [ctx.tenantId, ctx.userId, id])).rows[0];
      if (antes !== undefined) {
        // Repetir troca só o motivo, sem contar duas vezes.
        await c.query(`UPDATE denuncias SET motivo = $4 WHERE tenant_id = $1 AND user_id = $2 AND alert_id = $3`, [ctx.tenantId, ctx.userId, id, b.motivo]);
        return { criada: false, denunciadoEm: antes.denunciado_em as Date };
      }
      await c.query(`INSERT INTO denuncias (tenant_id, user_id, alert_id, motivo, denunciado_em) VALUES ($1, $2, $3, $4, $5)`, [ctx.tenantId, ctx.userId, id, b.motivo, agora]);

      // Base de interesse: pessoas distintas que abriram ou clicaram neste alerta na janela. Passou do limite: a oferta some para todos.
      const desde = new Date(agora.getTime() - regra.janelaDias * 86_400_000);
      const base = (
        await c.query(
          `SELECT count(DISTINCT user_id)::int AS n FROM alert_events WHERE tenant_id = $1 AND alert_id = $2 AND tipo IN ('aberto', 'clicado') AND ocorrido_em >= $3`,
          [ctx.tenantId, id, desde],
        )
      ).rows[0].n as number;
      const limite = Math.max(regra.minimo, Math.ceil(regra.percentual * base));
      const conta = (
        await c.query(
          `SELECT count(*)::int AS total, count(*) FILTER (WHERE motivo = 'preco_errado')::int AS preco, count(*) FILTER (WHERE motivo = 'sem_estoque')::int AS estoque
             FROM denuncias WHERE tenant_id = $1 AND alert_id = $2`,
          [ctx.tenantId, id],
        )
      ).rows[0];
      if (conta.total >= limite) {
        // Um caso por alerta: depois de restaurado, denúncia nova do mesmo alerta não esconde de novo (até o preço mudar).
        const caso = await c.query(
          `INSERT INTO casos_denuncia (tenant_id, alert_id, offer_id, aberto_em, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (tenant_id, alert_id) DO NOTHING`,
          [ctx.tenantId, id, linha.offer_id, agora, conta.total, base, limite, conta.preco, conta.estoque],
        );
        if (caso.rowCount === 1) await c.query(`UPDATE offers SET escondida_em = $3 WHERE tenant_id = $1 AND id = $2 AND escondida_em IS NULL`, [ctx.tenantId, linha.offer_id, agora]);
      }
      return { criada: true, denunciadoEm: agora };
    });
    return reply.code(criada ? 201 : 200).send({ alerta_id: id, motivo: b.motivo, denunciado_em: denunciadoEm.toISOString() });
  });
}
