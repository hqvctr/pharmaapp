// Painel do operador, versão final (admin.yaml 1.1.0, DECISIONS 98): resumo da tela inicial, loja própria (cadastro, dados e área de
// entrega) e a lista de operadores (só leitura: cadastrar e desativar seguem pela linha de comando, D2).
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../../db/transacao.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { travasDeMarca } from '../../ofertas.js';
import { exigirOperador } from '../../sessaoOperador.js';
import { lojaAdminJson } from './alertas.js';
import { idDoCaminho, lerObservacao } from './comum.js';
import type { DepsAdmin } from './lojasFontes.js';
import { NOME_FONTE_MANUAL } from './ofertaManual.js';

export const MAX_AREAS = 100;
const COLUNAS_LOJA = `s.id, s.rede, s.nome, s.cnpj, s.tipo, s.status, s.reputacao, s.autorizacao_sanitaria, s.criado_em`;
const CEP = /^[0-9]{8}$/;

export interface AreaEntrega {
  cep_inicio: string;
  cep_fim: string;
  prazo_dias: number;
}

/** `areas_entrega` do corpo: de 0 (ou 1, quando `minimo`) a 100 faixas de CEP válidas. Erros vão para `campos`. */
export function lerAreas(v: unknown, campos: CampoInvalido[], minimo = 0): AreaEntrega[] {
  if (!Array.isArray(v) || v.length < minimo || v.length > MAX_AREAS) {
    campos.push({ campo: 'areas_entrega', mensagem: minimo > 0 ? `Informe de 1 a ${MAX_AREAS} faixas de CEP.` : `Envie até ${MAX_AREAS} faixas de CEP.` });
    return [];
  }
  const areas: AreaEntrega[] = [];
  v.forEach((bruto, i) => {
    const a = (bruto ?? {}) as Record<string, unknown>;
    const ini = a.cep_inicio, fim = a.cep_fim, prazo = a.prazo_dias;
    if (typeof ini !== 'string' || !CEP.test(ini)) campos.push({ campo: `areas_entrega[${i}].cep_inicio`, mensagem: 'CEP com 8 dígitos.' });
    if (typeof fim !== 'string' || !CEP.test(fim)) campos.push({ campo: `areas_entrega[${i}].cep_fim`, mensagem: 'CEP com 8 dígitos.' });
    else if (typeof ini === 'string' && CEP.test(ini) && ini > fim) campos.push({ campo: `areas_entrega[${i}].cep_fim`, mensagem: 'O CEP final não pode ser menor que o inicial.' });
    if (typeof prazo !== 'number' || !Number.isInteger(prazo) || prazo < 0 || prazo > 90) campos.push({ campo: `areas_entrega[${i}].prazo_dias`, mensagem: 'Prazo de 0 a 90 dias.' });
    areas.push({ cep_inicio: String(ini), cep_fim: String(fim), prazo_dias: Number(prazo) });
  });
  return areas;
}

/** Texto obrigatório (nome, rede) ou opcional (null); `undefined` = campo inválido, já anotado. */
function lerTexto(b: Record<string, unknown>, nome: string, max: number, obrigatorio: boolean, campos: CampoInvalido[]): string | null | undefined {
  const v = b[nome];
  if (!obrigatorio && (v === null || (typeof v === 'string' && v.trim() === ''))) return null;
  if (typeof v !== 'string' || v.trim() === '' || v.trim().length > max) {
    campos.push({ campo: nome, mensagem: obrigatorio ? `Informe de 1 a ${max} caracteres.` : `Use até ${max} caracteres ou null.` });
    return undefined;
  }
  return v.trim();
}

function lerCnpj(v: unknown, campos: CampoInvalido[]): string | null | undefined {
  if (v === null || v === '') return null;
  const so = typeof v === 'string' ? v.replace(/[.\-/\s]/g, '') : '';
  if (!/^[0-9]{14}$/.test(so)) {
    campos.push({ campo: 'cnpj', mensagem: 'CNPJ com 14 dígitos ou null.' });
    return undefined;
  }
  return so;
}

function lerReputacao(v: unknown, campos: CampoInvalido[]): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
    campos.push({ campo: 'reputacao', mensagem: 'De 0 a 1.' });
    return undefined;
  }
  return Math.round(v * 100) / 100;
}

export function rotasAdminGestao(app: FastifyInstance, d: DepsAdmin): void {
  // ---------------------------------------------------------------- resumo da tela inicial
  // A parte da coleta lê o histórico inteiro de preços: guarda por 5 minutos (o painel pergunta de tempos em tempos).
  const cacheColeta = new Map<string, { ate: number; valor: unknown }>();
  app.get('/v1/admin/resumo', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const t = ctx.tenantId;
    const um = async (sql: string, params: unknown[] = [t]) => (await d.db.query(sql, params)).rows[0] as Record<string, any>;
    const [pend, lojas, fontes, catalogo, alertas7] = await Promise.all([
      um(`SELECT (SELECT count(*) FROM alerts WHERE tenant_id = $1 AND revisao_situacao = 'pendente')::int AS alertas,
                 (SELECT count(*) FROM triagem_bloqueios WHERE tenant_id = $1 AND resultado IS NULL)::int AS triagem,
                 (SELECT count(*) FROM casos_denuncia WHERE tenant_id = $1 AND situacao = 'escondida')::int AS denuncias,
                 (SELECT count(*) FROM offers WHERE tenant_id = $1 AND criada_por IS NOT NULL AND disponivel AND (valida_ate IS NULL OR valida_ate > $2))::int AS ofertas_manuais`, [t, agora]),
      um(`SELECT count(*) FILTER (WHERE status = 'aprovada')::int AS aprovada, count(*) FILTER (WHERE status = 'em_observacao')::int AS em_observacao,
                 count(*) FILTER (WHERE status = 'bloqueada')::int AS bloqueada,
                 count(*) FILTER (WHERE status <> 'bloqueada' AND NOT EXISTS (SELECT 1 FROM store_service_areas a WHERE a.tenant_id = s.tenant_id AND a.store_id = s.id))::int AS sem_area_entrega
            FROM stores s WHERE tenant_id = $1`),
      um(`SELECT count(*) FILTER (WHERE ativa)::int AS ativas, count(*)::int AS total FROM sources WHERE tenant_id = $1`),
      um(`SELECT (SELECT count(*) FROM products WHERE tenant_id = $1)::int AS produtos,
                 (SELECT count(*) FROM offers WHERE tenant_id = $1 AND disponivel)::int AS ofertas_disponiveis,
                 (SELECT max(coletada_em) FROM offers WHERE tenant_id = $1 AND criada_por IS NULL) AS ultima_coleta_em`),
      um(`SELECT count(*)::int AS criados, count(*) FILTER (WHERE revisao_situacao = 'aprovado')::int AS aprovados,
                 count(*) FILTER (WHERE revisao_situacao = 'rejeitado')::int AS rejeitados, count(*) FILTER (WHERE decisao = 'notificar')::int AS notificados
            FROM alerts WHERE tenant_id = $1 AND criado_em > $2 AND offer_id IN (SELECT id FROM offers WHERE tenant_id = $1 AND criada_por IS NULL)`, [t, new Date(agora.getTime() - 7 * 86_400_000)]),
    ]);
    let historico = cacheColeta.get(t);
    if (historico === undefined || historico.ate < agora.getTime()) {
      const fuso = ctx.tenant.config.fuso;
      const h = await um(
        `SELECT count(DISTINCT (observado_em AT TIME ZONE $2)::date)::int AS dias FROM price_history
          WHERE tenant_id = $1 AND (observado_em AT TIME ZONE $2)::date < ($3::timestamptz AT TIME ZONE $2)::date`,
        [t, fuso, agora],
      );
      historico = { ate: agora.getTime() + 5 * 60_000, valor: h.dias };
      cacheColeta.set(t, historico);
    }
    let ultimoCiclo: { fim: string; falhou: boolean; erro: string | null } | null = null;
    try {
      const c = d.ultimoCiclo === undefined ? null : await d.ultimoCiclo();
      if (c !== null) ultimoCiclo = { fim: c.fim, falhou: c.falhou, erro: c.erro ?? null };
    } catch {
      ultimoCiclo = null;
    }
    return {
      gerado_em: agora.toISOString(),
      pendencias: { alertas: pend.alertas, triagem: pend.triagem, denuncias: pend.denuncias },
      ofertas_manuais_ativas: pend.ofertas_manuais,
      lojas: { aprovada: lojas.aprovada, em_observacao: lojas.em_observacao, bloqueada: lojas.bloqueada, sem_area_entrega: lojas.sem_area_entrega },
      fontes: { ativas: fontes.ativas, total: fontes.total },
      catalogo: { produtos: catalogo.produtos, ofertas_disponiveis: catalogo.ofertas_disponiveis },
      coleta: {
        ultima_coleta_em: catalogo.ultima_coleta_em === null ? null : catalogo.ultima_coleta_em.toISOString(),
        dias_historico: historico.valor as number,
        dias_para_alertas: ctx.tenant.config.curadoria.minObservacoes,
        ultimo_ciclo: ultimoCiclo,
      },
      alertas_7_dias: { criados: alertas7.criados, aprovados: alertas7.aprovados, rejeitados: alertas7.rejeitados, notificados: alertas7.notificados },
    };
  });

  // ---------------------------------------------------------------- loja: detalhe, cadastro, dados, área de entrega
  async function detalheLoja(db: { query: typeof d.db.query }, tenantId: string, id: string, fontesComTrava: string[]) {
    const l = (await db.query(`SELECT ${COLUNAS_LOJA} FROM stores s WHERE s.tenant_id = $1 AND s.id = $2`, [tenantId, id])).rows[0];
    if (l === undefined) throw new ErroApi('nao_encontrado');
    const [fontes, areas, ofertas] = await Promise.all([
      db.query(`SELECT DISTINCT src.nome FROM store_source_refs r JOIN sources src ON src.tenant_id = r.tenant_id AND src.id = r.source_id WHERE r.tenant_id = $1 AND r.store_id = $2 ORDER BY src.nome`, [tenantId, id]),
      db.query(`SELECT cep_inicio, cep_fim, prazo_dias FROM store_service_areas WHERE tenant_id = $1 AND store_id = $2 ORDER BY cep_inicio, cep_fim`, [tenantId, id]),
      db.query(`SELECT count(*)::int AS n FROM offers WHERE tenant_id = $1 AND store_id = $2 AND disponivel`, [tenantId, id]),
    ]);
    const nomesFontes = fontes.rows.map((f) => f.nome as string);
    return {
      ...lojaAdminJson(l),
      propria: nomesFontes.includes(NOME_FONTE_MANUAL),
      fontes: nomesFontes,
      // Loja de marca com trava (Lomadee): oferta manual não entra, o preço vem da coleta (D67).
      aceita_oferta_manual: !nomesFontes.some((f) => fontesComTrava.includes(f)),
      areas_entrega: areas.rows.map((a) => ({ cep_inicio: a.cep_inicio, cep_fim: a.cep_fim, prazo_dias: a.prazo_dias })),
      ofertas_disponiveis: ofertas.rows[0].n as number,
    };
  }

  app.get('/v1/admin/lojas/:id', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    return detalheLoja(d.db, ctx.tenantId, idDoCaminho(req), travasDeMarca(ctx.tenant.config).fontes);
  });

  app.post('/v1/admin/lojas', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    const nome = lerTexto(b, 'nome', 120, true, campos);
    const rede = b.rede === undefined || b.rede === null || b.rede === '' ? nome : lerTexto(b, 'rede', 120, true, campos);
    const cnpj = lerCnpj(b.cnpj ?? null, campos);
    const autorizacao = b.autorizacao_sanitaria === undefined ? null : lerTexto(b, 'autorizacao_sanitaria', 120, false, campos);
    const status = b.status ?? 'em_observacao';
    if (status !== 'aprovada' && status !== 'em_observacao') campos.push({ campo: 'status', mensagem: 'A loja nova começa aprovada ou em observação.' });
    const reputacao = b.reputacao === undefined ? 0.5 : lerReputacao(b.reputacao, campos);
    const areas = lerAreas(b.areas_entrega, campos, 1);
    if (campos.length > 0) throw falhaDeValidacao(campos);

    const id = await comTransacao(d.db, async (c) => {
      // Mesmo nome de outra loja confunde a escolha na oferta manual (e quase sempre é clique duplo).
      const igual = await c.query(`SELECT 1 FROM stores WHERE tenant_id = $1 AND lower(nome) = lower($2)`, [ctx.tenantId, nome]);
      if (igual.rowCount !== 0) throw falhaDeValidacao([{ campo: 'nome', mensagem: 'Já existe uma loja com este nome.' }]);
      const fonteId = (
        await c.query(
          `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
           VALUES ($1, $2, 'E', 1440, 'manual', 'aprovada', 'alta', 'Cadastro manual por operador', false)
           ON CONFLICT (tenant_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
          [ctx.tenantId, NOME_FONTE_MANUAL],
        )
      ).rows[0].id as string;
      const lojaId = (
        await c.query(
          `INSERT INTO stores (tenant_id, rede, nome, cnpj, tipo, status, reputacao, autorizacao_sanitaria, criado_em) VALUES ($1,$2,$3,$4,'online',$5,$6,$7,$8) RETURNING id`,
          [ctx.tenantId, rede, nome, cnpj, status, reputacao, autorizacao, agora],
        )
      ).rows[0].id as string;
      for (const a of areas) {
        await c.query(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1,$2,$3,$4,$5)`, [ctx.tenantId, lojaId, a.cep_inicio, a.cep_fim, a.prazo_dias]);
      }
      await c.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [ctx.tenantId, fonteId, `manual:${randomUUID()}`, lojaId]);
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'loja_criada', alvoTipo: 'loja', alvoId: lojaId, em: agora,
        detalhe: { nome, rede, status, reputacao, areas_entrega: areas.length },
      });
      return lojaId;
    });
    return reply.code(201).send(await detalheLoja(d.db, ctx.tenantId, id, travasDeMarca(ctx.tenant.config).fontes));
  });

  app.patch('/v1/admin/lojas/:id', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    const novo: Record<string, unknown> = {};
    if (b.nome !== undefined) novo.nome = lerTexto(b, 'nome', 120, true, campos);
    if (b.rede !== undefined) novo.rede = lerTexto(b, 'rede', 120, true, campos);
    if (b.cnpj !== undefined) novo.cnpj = lerCnpj(b.cnpj, campos);
    if (b.autorizacao_sanitaria !== undefined) novo.autorizacao_sanitaria = lerTexto(b, 'autorizacao_sanitaria', 120, false, campos);
    if (b.reputacao !== undefined) novo.reputacao = lerReputacao(b.reputacao, campos);
    const observacao = lerObservacao(b, campos);
    if (Object.keys(novo).length === 0 && campos.length === 0) campos.push({ campo: 'nome', mensagem: 'Envie ao menos um campo para mudar (nome, rede, cnpj, autorizacao_sanitaria ou reputacao).' });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    await comTransacao(d.db, async (c) => {
      const antes = (await c.query(`SELECT ${COLUNAS_LOJA} FROM stores s WHERE s.tenant_id = $1 AND s.id = $2 FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (antes === undefined) throw new ErroApi('nao_encontrado');
      const atual = lojaAdminJson(antes) as Record<string, unknown>;
      const mudou = Object.entries(novo).filter(([k, v]) => atual[k] !== v);
      if (mudou.length === 0) return;
      if (novo.nome !== undefined && String(novo.nome).toLowerCase() !== String(antes.nome).toLowerCase()) {
        const igual = await c.query(`SELECT 1 FROM stores WHERE tenant_id = $1 AND id <> $2 AND lower(nome) = lower($3)`, [ctx.tenantId, id, novo.nome]);
        if (igual.rowCount !== 0) throw falhaDeValidacao([{ campo: 'nome', mensagem: 'Já existe uma loja com este nome.' }]);
      }
      const sets = mudou.map(([k], i) => `${k} = $${i + 3}`);
      await c.query(`UPDATE stores SET ${sets.join(', ')} WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id, ...mudou.map(([, v]) => v)]);
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'loja_editada', alvoTipo: 'loja', alvoId: id, em: agora,
        detalhe: { ...Object.fromEntries(mudou.map(([k, v]) => [k, { de: atual[k], para: v }])), observacao },
      });
    });
    return detalheLoja(d.db, ctx.tenantId, id, travasDeMarca(ctx.tenant.config).fontes);
  });

  app.put('/v1/admin/lojas/:id/areas', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    const areas = lerAreas(b.areas_entrega, campos);
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const chave = (a: AreaEntrega) => `${a.cep_inicio}-${a.cep_fim}:${a.prazo_dias}`;
    await comTransacao(d.db, async (c) => {
      if ((await c.query(`SELECT 1 FROM stores WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, id])).rowCount !== 1) throw new ErroApi('nao_encontrado');
      const antes = (await c.query(`SELECT cep_inicio, cep_fim, prazo_dias FROM store_service_areas WHERE tenant_id = $1 AND store_id = $2`, [ctx.tenantId, id])).rows as AreaEntrega[];
      const de = antes.map(chave).sort(), para = areas.map(chave).sort();
      if (de.join('|') === para.join('|')) return; // nada mudou: sem auditoria nova
      await c.query(`DELETE FROM store_service_areas WHERE tenant_id = $1 AND store_id = $2`, [ctx.tenantId, id]);
      for (const a of areas) {
        await c.query(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1,$2,$3,$4,$5)`, [ctx.tenantId, id, a.cep_inicio, a.cep_fim, a.prazo_dias]);
      }
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'loja_areas_definidas', alvoTipo: 'loja', alvoId: id, em: agora,
        detalhe: { areas_entrega: { de, para }, observacao },
      });
    });
    return detalheLoja(d.db, ctx.tenantId, id, travasDeMarca(ctx.tenant.config).fontes);
  });

  // ---------------------------------------------------------------- operadores (só leitura, D2)
  app.get('/v1/admin/operadores', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const r = await d.db.query(
      `SELECT o.id, o.email, o.nome, o.ativo, o.criado_em,
              (SELECT max(greatest(s.criada_em, coalesce(s.renovada_em, s.criada_em))) FROM sessions s
                WHERE s.tenant_id = o.tenant_id AND s.operador_id = o.id AND s.audiencia = 'operador') AS ultimo_acesso_em
         FROM operadores o WHERE o.tenant_id = $1 ORDER BY o.ativo DESC, lower(o.nome), o.id`,
      [ctx.tenantId],
    );
    return {
      itens: r.rows.map((o) => ({
        id: o.id, email: o.email, nome: o.nome, ativo: o.ativo, criado_em: o.criado_em.toISOString(),
        ultimo_acesso_em: o.ultimo_acesso_em === null ? null : o.ultimo_acesso_em.toISOString(), voce: o.id === ctx.operador.id,
      })),
    };
  });
}
