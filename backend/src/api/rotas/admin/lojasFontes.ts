// /v1/admin/lojas* e /v1/admin/fontes* (admin.yaml, tags lojas e fontes): aprovar, observar ou bloquear; credencial só de escrita.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../../db/transacao.js';
import { fabricaDo } from '../../../fontes/registro.js';
import { gravarCredenciaisFonte } from '../../../fontes/credenciais.js';
import type { ChaveCredenciais } from '../../../shared/cifra.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { codificarCursor } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador } from '../../sessaoOperador.js';
import type { DepsAuth } from '../auth.js';
import { lojaAdminJson } from './alertas.js';
import { idDoCaminho, lerEnum, lerObservacao, lerPagina, resumoOperador, STATUS_CONFIANCA } from './comum.js';

export interface DepsAdmin extends DepsAuth {
  /** Chave das credenciais de fonte (CREDENTIALS_KEY). Ausente: gravar credencial responde 503. */
  chaveCredenciais?: ChaveCredenciais;
}

const COLUNAS_LOJA = `s.id, s.rede, s.nome, s.cnpj, s.tipo, s.status, s.reputacao, s.autorizacao_sanitaria, s.criado_em`;

export function rotasAdminLojasFontes(app: FastifyInstance, d: DepsAdmin): void {
  app.get('/v1/admin/lojas', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const status = lerEnum(q, 'status', STATUS_CONFIANCA, campos);
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId];
    const onde = ['s.tenant_id = $1'];
    if (status !== undefined) {
      params.push(status);
      onde.push(`s.status = $${params.length}`);
    }
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(s.criado_em, s.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(`SELECT ${COLUNAS_LOJA} FROM stores s WHERE ${onde.join(' AND ')} ORDER BY s.criado_em DESC, s.id DESC LIMIT $${params.length}`, params);
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map((l) => lojaAdminJson(l)),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criado_em.toISOString(), id: ultimo.id }) : null,
    };
  });

  app.put('/v1/admin/lojas/:id/status', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (typeof b.status !== 'string' || !(STATUS_CONFIANCA as readonly string[]).includes(b.status)) campos.push({ campo: 'status', mensagem: 'Use aprovada, em_observacao ou bloqueada.' });
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    return comTransacao(d.db, async (c) => {
      const antes = (await c.query(`SELECT ${COLUNAS_LOJA} FROM stores s WHERE s.tenant_id = $1 AND s.id = $2 FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (antes === undefined) throw new ErroApi('nao_encontrado');
      // Repetir o status já gravado devolve 200 sem mexer em nada. Loja que passa a aprovada vale na próxima coleta (D18).
      if (antes.status !== b.status) {
        await c.query(`UPDATE stores SET status = $3 WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id, b.status]);
        await registrarAuditoria(c, {
          tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'loja_status_definido', alvoTipo: 'loja', alvoId: id, em: agora,
          detalhe: { status: { de: antes.status, para: b.status }, observacao },
        });
      }
      return lojaAdminJson({ ...antes, status: b.status });
    });
  });

  const COLUNAS_FONTE = `src.id, src.nome, src.tipo, src.confiabilidade, src.status_confianca, src.frequencia_minutos, src.regiao, src.ativa,
       (sc.source_id IS NOT NULL) AS cred_definida, sc.atualizada_em AS cred_em, sc.atualizada_por AS cred_por_id, op.nome AS cred_por_nome`;
  const JUNCOES_FONTE = `FROM sources src
       LEFT JOIN source_credentials sc ON sc.tenant_id = src.tenant_id AND sc.source_id = src.id
       LEFT JOIN operadores op ON op.tenant_id = sc.tenant_id AND op.id = sc.atualizada_por`;
  const fonteJson = (r: any) => ({
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    confiabilidade: r.confiabilidade,
    status_confianca: r.status_confianca,
    frequencia_minutos: r.frequencia_minutos,
    regiao: r.regiao,
    ativa: r.ativa,
    credencial: { definida: r.cred_definida, atualizada_em: r.cred_em === null ? null : r.cred_em.toISOString(), atualizada_por: resumoOperador(r.cred_por_id, r.cred_por_nome) },
  });

  app.get('/v1/admin/fontes', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const r = await d.db.query(`SELECT ${COLUNAS_FONTE} ${JUNCOES_FONTE} WHERE src.tenant_id = $1 ORDER BY src.nome`, [ctx.tenantId]);
    return { itens: r.rows.map(fonteJson) };
  });

  app.put('/v1/admin/fontes/:id/status', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (typeof b.status_confianca !== 'string' || !(STATUS_CONFIANCA as readonly string[]).includes(b.status_confianca)) campos.push({ campo: 'status_confianca', mensagem: 'Use aprovada, em_observacao ou bloqueada.' });
    if (typeof b.ativa !== 'boolean') campos.push({ campo: 'ativa', mensagem: 'Use verdadeiro ou falso.' });
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    await comTransacao(d.db, async (c) => {
      const antes = (await c.query(`SELECT status_confianca, ativa FROM sources WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (antes === undefined) throw new ErroApi('nao_encontrado');
      if (antes.status_confianca === b.status_confianca && antes.ativa === b.ativa) return;
      await c.query(`UPDATE sources SET status_confianca = $3, ativa = $4 WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id, b.status_confianca, b.ativa]);
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'fonte_status_definido', alvoTipo: 'fonte', alvoId: id, em: agora,
        detalhe: { status_confianca: { de: antes.status_confianca, para: b.status_confianca }, ativa: { de: antes.ativa, para: b.ativa }, observacao },
      });
    });
    return fonteJson((await d.db.query(`SELECT ${COLUNAS_FONTE} ${JUNCOES_FONTE} WHERE src.tenant_id = $1 AND src.id = $2`, [ctx.tenantId, id])).rows[0]);
  });

  app.put('/v1/admin/fontes/:id/credencial', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const v = b.valores;
    const campos: CampoInvalido[] = [];
    if (v === null || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length < 1 || Object.keys(v).length > 20) {
      campos.push({ campo: 'valores', mensagem: 'Envie de 1 a 20 pares nome → valor.' });
    } else {
      for (const [k, val] of Object.entries(v)) if (typeof val !== 'string' || val.length > 4096) campos.push({ campo: `valores.${k}`, mensagem: 'Use um texto de até 4096 caracteres.' });
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const valores = v as Record<string, string>;

    const fonte = (await d.db.query(`SELECT nome FROM sources WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id])).rows[0];
    if (fonte === undefined) throw new ErroApi('nao_encontrado');
    const bloco = ctx.tenant.config.fontes[fonte.nome as string];
    if (bloco === undefined) throw falhaDeValidacao([{ campo: 'valores', mensagem: 'Esta fonte não tem adaptador configurado no tenant.' }]);
    const fabrica = fabricaDo(bloco.adaptador);
    // Os nomes dos campos não são segredo (os valores são); dizer quais faltam ou sobram ajuda a corrigir sem expor nada.
    const aceitos = new Set(fabrica.credenciais);
    for (const k of Object.keys(valores)) if (!aceitos.has(k)) campos.push({ campo: `valores.${k}`, mensagem: 'Campo que esta fonte não usa.' });
    for (const k of fabrica.credenciais) if ((valores[k] ?? '').trim() === '') campos.push({ campo: `valores.${k}`, mensagem: 'Campo obrigatório desta fonte.' });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    if (d.chaveCredenciais === undefined) throw new ErroApi('servico_indisponivel', undefined, undefined, 60);

    await comTransacao(d.db, async (c) => {
      await gravarCredenciaisFonte(c, d.chaveCredenciais!, fabrica, ctx.tenantId, id, valores, ctx.operador.id);
      // Só os nomes dos campos vão para a auditoria; valor de credencial nunca.
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'fonte_credencial_gravada', alvoTipo: 'fonte', alvoId: id, em: agora,
        detalhe: { campos: [...fabrica.credenciais].sort() },
      });
    });
    return reply.code(204).send();
  });
}
