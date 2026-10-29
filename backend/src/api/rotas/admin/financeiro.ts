// Painel financeiro do operador (admin.yaml 1.1.0, tag financeiro; DECISIONS 98). Receita só entra lançada pelo operador ou importada
// de um relatório (comissão da rede de afiliados, assinaturas, anúncios): o sistema não estima nem inventa receita. O que o próprio
// sistema mede (cliques em link de afiliado, assinaturas ativas) vem ao lado, para comparar.
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../../db/transacao.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { codificarCursor } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador } from '../../sessaoOperador.js';
import { idDoCaminho, lerEnum, lerPagina, resumoOperador } from './comum.js';
import type { DepsAdmin } from './lojasFontes.js';

export const FONTES_RECEITA = ['afiliado_lomadee', 'afiliado_outros', 'assinatura_google_play', 'assinatura_app_store', 'anuncios', 'outros'] as const;
export const STATUS_RECEITA = ['prevista', 'confirmada', 'recebida', 'cancelada'] as const;
export const MAX_IMPORTACAO = 1000;
const MAX_CENTAVOS = 1_000_000_000; // R$ 10 milhões por lançamento: acima disso é erro de digitação
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;

type FonteReceita = (typeof FONTES_RECEITA)[number];
type StatusReceita = (typeof STATUS_RECEITA)[number];
interface Lancamento { fonte: FonteReceita; competencia: string; valor_centavos: number; status: StatusReceita; descricao: string | null; referencia: string | null }

function diaValido(v: unknown): v is string {
  if (typeof v !== 'string' || !DIA.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= '2020-01-01' && v <= '2100-12-31';
}

/** Lê um lançamento (inteiro, ou só os campos enviados quando `parcial`). Erros vão para `campos` com o prefixo dado. */
export function lerLancamento(b: Record<string, unknown>, campos: CampoInvalido[], prefixo = '', parcial = false): Partial<Lancamento> {
  const out: Partial<Lancamento> = {};
  const tem = (k: string) => !parcial || b[k] !== undefined;
  const erro = (campo: string, mensagem: string) => campos.push({ campo: `${prefixo}${campo}`, mensagem });
  if (tem('fonte')) {
    if (typeof b.fonte !== 'string' || !(FONTES_RECEITA as readonly string[]).includes(b.fonte)) erro('fonte', `Use um de: ${FONTES_RECEITA.join(', ')}.`);
    else out.fonte = b.fonte as FonteReceita;
  }
  if (tem('competencia')) {
    if (!diaValido(b.competencia)) erro('competencia', 'Use a data no formato 2026-10-31.');
    else out.competencia = b.competencia;
  }
  if (tem('valor_centavos')) {
    const v = b.valor_centavos;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > MAX_CENTAVOS) erro('valor_centavos', 'Informe o valor em centavos (inteiro, maior que zero).');
    else out.valor_centavos = v;
  }
  if (tem('status')) {
    if (typeof b.status !== 'string' || !(STATUS_RECEITA as readonly string[]).includes(b.status)) erro('status', `Use um de: ${STATUS_RECEITA.join(', ')}.`);
    else out.status = b.status as StatusReceita;
  }
  for (const [k, max] of [['descricao', 300], ['referencia', 120]] as const) {
    if (!tem(k)) continue;
    const v = b[k];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) out[k] = null;
    else if (typeof v !== 'string' || v.trim().length > max) erro(k, `Use até ${max} caracteres ou null.`);
    else out[k] = v.trim();
  }
  return out;
}

const receitaJson = (r: any) => ({
  id: r.id,
  fonte: r.fonte,
  competencia: r.competencia,
  valor_centavos: Number(r.valor_centavos),
  status: r.status,
  descricao: r.descricao,
  referencia: r.referencia,
  criada_por: { id: r.criada_por, nome: r.criada_por_nome },
  criada_em: r.criada_em.toISOString(),
  atualizada_por: resumoOperador(r.atualizada_por, r.atualizada_por_nome),
  atualizada_em: r.atualizada_em === null ? null : r.atualizada_em.toISOString(),
});
const SELECT_RECEITA = `SELECT r.id, r.fonte, to_char(r.competencia, 'YYYY-MM-DD') AS competencia, r.valor_centavos, r.status, r.descricao, r.referencia,
       r.criada_por, oc.nome AS criada_por_nome, r.criada_em, r.atualizada_por, oa.nome AS atualizada_por_nome, r.atualizada_em
  FROM receitas r JOIN operadores oc ON oc.tenant_id = r.tenant_id AND oc.id = r.criada_por
  LEFT JOIN operadores oa ON oa.tenant_id = r.tenant_id AND oa.id = r.atualizada_por`;

/** "2026-10" → os 12 meses que terminam nele, do mais antigo ao mais novo. */
export function mesesAte(mesFinal: string, quantos: number): string[] {
  const [a, m] = mesFinal.split('-').map(Number) as [number, number];
  const out: string[] = [];
  for (let i = quantos - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** Dia (AAAA-MM-DD) do instante no fuso do tenant. */
export function diaNoFuso(agora: Date, fuso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

export function rotasAdminFinanceiro(app: FastifyInstance, d: DepsAdmin): void {
  app.get('/v1/admin/receitas', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const fonte = lerEnum(q, 'fonte', FONTES_RECEITA, campos);
    const status = lerEnum(q, 'status', STATUS_RECEITA, campos);
    for (const k of ['desde', 'ate']) if (q[k] !== undefined && !diaValido(q[k])) campos.push({ campo: k, mensagem: 'Use a data no formato 2026-10-31.' });
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId];
    const onde = ['r.tenant_id = $1'];
    const filtro = (sql: string, v: unknown) => { params.push(v); onde.push(sql.replace('?', `$${params.length}`)); };
    if (fonte !== undefined) filtro('r.fonte = ?', fonte);
    if (status !== undefined) filtro('r.status = ?', status);
    if (q.desde !== undefined) filtro('r.competencia >= ?::date', q.desde);
    if (q.ate !== undefined) filtro('r.competencia <= ?::date', q.ate);
    if (cursor !== undefined) {
      params.push(cursor.criadoEm.slice(0, 10), cursor.id);
      onde.push(`(r.competencia, r.id) < ($${params.length - 1}::date, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(`${SELECT_RECEITA} WHERE ${onde.join(' AND ')} ORDER BY r.competencia DESC, r.id DESC LIMIT $${params.length}`, params);
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(receitaJson),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: `${ultimo.competencia}T00:00:00Z`, id: ultimo.id }) : null,
    };
  });

  const buscar = async (db: { query: typeof d.db.query }, tenantId: string, id: string) => {
    const r = (await db.query(`${SELECT_RECEITA} WHERE r.tenant_id = $1 AND r.id = $2`, [tenantId, id])).rows[0];
    if (r === undefined) throw new ErroApi('nao_encontrado');
    return receitaJson(r);
  };
  const referenciaRepetida = (err: unknown) => (err as { code?: string; constraint?: string }).code === '23505';

  app.post('/v1/admin/receitas', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const campos: CampoInvalido[] = [];
    const l = lerLancamento(corpoObjeto(req), campos) as Lancamento;
    if (campos.length > 0) throw falhaDeValidacao(campos);
    let id: string;
    try {
      id = await comTransacao(d.db, async (c) => {
        const novo = (
          await c.query(
            `INSERT INTO receitas (tenant_id, fonte, competencia, valor_centavos, status, descricao, referencia, criada_por, criada_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [ctx.tenantId, l.fonte, l.competencia, l.valor_centavos, l.status, l.descricao, l.referencia, ctx.operador.id, agora],
          )
        ).rows[0].id as string;
        await registrarAuditoria(c, {
          tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'receita_lancada', alvoTipo: 'receita', alvoId: novo, em: agora,
          detalhe: { fonte: l.fonte, competencia: l.competencia, valor_centavos: l.valor_centavos, status: l.status, referencia: l.referencia },
        });
        return novo;
      });
    } catch (err) {
      if (referenciaRepetida(err)) throw falhaDeValidacao([{ campo: 'referencia', mensagem: 'Já existe um lançamento desta fonte com esta referência.' }]);
      throw err;
    }
    return reply.code(201).send(await buscar(d.db, ctx.tenantId, id));
  });

  app.patch('/v1/admin/receitas/:id', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const campos: CampoInvalido[] = [];
    const novo = lerLancamento(corpoObjeto(req), campos, '', true);
    if (Object.keys(novo).length === 0 && campos.length === 0) campos.push({ campo: 'status', mensagem: 'Envie ao menos um campo para mudar.' });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    try {
      await comTransacao(d.db, async (c) => {
        const antes = (await c.query(`${SELECT_RECEITA} WHERE r.tenant_id = $1 AND r.id = $2 FOR UPDATE OF r`, [ctx.tenantId, id])).rows[0];
        if (antes === undefined) throw new ErroApi('nao_encontrado');
        const atual = receitaJson(antes) as Record<string, unknown>;
        const mudou = Object.entries(novo).filter(([k, v]) => atual[k] !== v);
        if (mudou.length === 0) return;
        const sets = mudou.map(([k], i) => `${k} = $${i + 3}`);
        await c.query(`UPDATE receitas SET ${sets.join(', ')}, atualizada_por = $${mudou.length + 3}, atualizada_em = $${mudou.length + 4} WHERE tenant_id = $1 AND id = $2`,
          [ctx.tenantId, id, ...mudou.map(([, v]) => v), ctx.operador.id, agora]);
        await registrarAuditoria(c, {
          tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'receita_editada', alvoTipo: 'receita', alvoId: id, em: agora,
          detalhe: Object.fromEntries(mudou.map(([k, v]) => [k, { de: atual[k], para: v }])),
        });
      });
    } catch (err) {
      if (referenciaRepetida(err)) throw falhaDeValidacao([{ campo: 'referencia', mensagem: 'Já existe um lançamento desta fonte com esta referência.' }]);
      throw err;
    }
    return buscar(d.db, ctx.tenantId, id);
  });

  // Importação de um relatório (o painel lê o CSV e manda as linhas). Tudo ou nada na validação; linha com a mesma fonte e referência de
  // um lançamento que já existe é pulada, então importar o mesmo relatório duas vezes não duplica.
  app.post('/v1/admin/receitas/importacao', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (!Array.isArray(b.itens) || b.itens.length < 1 || b.itens.length > MAX_IMPORTACAO) throw falhaDeValidacao([{ campo: 'itens', mensagem: `Envie de 1 a ${MAX_IMPORTACAO} lançamentos.` }]);
    const itens = b.itens.map((it, i) => {
      if (it === null || typeof it !== 'object' || Array.isArray(it)) { campos.push({ campo: `itens[${i}]`, mensagem: 'Lançamento inválido.' }); return null; }
      return lerLancamento(it as Record<string, unknown>, campos, `itens[${i}].`) as Lancamento;
    });
    const vistas = new Set<string>();
    itens.forEach((l, i) => {
      if (l?.referencia == null) return;
      const k = `${l.fonte}|${l.referencia}`;
      if (vistas.has(k)) campos.push({ campo: `itens[${i}].referencia`, mensagem: 'Referência repetida no mesmo arquivo.' });
      vistas.add(k);
    });
    if (campos.length > 0) throw falhaDeValidacao(campos.slice(0, 50));
    const loteId = randomUUID();
    const criadas = await comTransacao(d.db, async (c) => {
      let n = 0;
      for (const l of itens as Lancamento[]) {
        const r = await c.query(
          `INSERT INTO receitas (tenant_id, fonte, competencia, valor_centavos, status, descricao, referencia, criada_por, criada_em) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (tenant_id, fonte, referencia) WHERE referencia IS NOT NULL DO NOTHING`,
          [ctx.tenantId, l.fonte, l.competencia, l.valor_centavos, l.status, l.descricao, l.referencia, ctx.operador.id, agora],
        );
        n += r.rowCount ?? 0;
      }
      if (n > 0) {
        await registrarAuditoria(c, {
          tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'receitas_importadas', alvoTipo: 'receita', alvoId: loteId, em: agora,
          detalhe: { linhas: itens.length, criadas: n, repetidas: itens.length - n, valor_centavos: (itens as Lancamento[]).reduce((s, l) => s + l.valor_centavos, 0) },
        });
      }
      return n;
    });
    return { total: itens.length, criadas, repetidas: itens.length - criadas };
  });

  app.get('/v1/admin/financeiro', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const fuso = ctx.tenant.config.fuso;
    const hoje = diaNoFuso(agora, fuso);
    let quantos = 12;
    if (q.meses !== undefined) {
      const n = Number(q.meses);
      if (!Number.isInteger(n) || n < 1 || n > 36) throw falhaDeValidacao([{ campo: 'meses', mensagem: 'Use de 1 a 36.' }]);
      quantos = n;
    }
    let mesFinal = hoje.slice(0, 7);
    if (q.ate !== undefined) {
      if (typeof q.ate !== 'string' || !MES.test(q.ate) || Number(q.ate.slice(5)) < 1 || Number(q.ate.slice(5)) > 12) throw falhaDeValidacao([{ campo: 'ate', mensagem: 'Use o mês no formato 2026-10.' }]);
      mesFinal = q.ate;
    }
    const meses = mesesAte(mesFinal, quantos);
    const de = `${meses[0]}-01`;
    const [a, m] = mesFinal.split('-').map(Number) as [number, number];
    const depois = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);

    const t = ctx.tenantId;
    const trintaDiasAtras = new Date(agora.getTime() - 30 * 86_400_000);
    const [porMes, cliques, assinaturas, afiliado30] = await Promise.all([
      d.db.query(
        `SELECT to_char(competencia, 'YYYY-MM') AS mes, fonte, status, sum(valor_centavos)::bigint AS centavos, count(*)::int AS n
           FROM receitas WHERE tenant_id = $1 AND competencia >= $2::date AND competencia < $3::date GROUP BY 1, 2, 3`,
        [t, de, depois],
      ),
      d.db.query(
        `SELECT to_char((e.ocorrido_em AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS dia, count(*)::int AS cliques, count(*) FILTER (WHERE o.link_afiliado)::int AS afiliado
           FROM alert_events e JOIN alerts al ON al.tenant_id = e.tenant_id AND al.id = e.alert_id JOIN offers o ON o.tenant_id = al.tenant_id AND o.id = al.offer_id
          WHERE e.tenant_id = $1 AND e.tipo = 'clicado' AND e.ocorrido_em > $3 AND e.ocorrido_em <= $4 GROUP BY 1 ORDER BY 1`,
        [t, fuso, trintaDiasAtras, agora],
      ),
      d.db.query(`SELECT plano, count(*)::int AS n FROM subscriptions WHERE tenant_id = $1 AND status = 'ativa' AND (expira_em IS NULL OR expira_em > $2) GROUP BY plano`, [t, agora]),
      d.db.query(
        `SELECT coalesce(sum(valor_centavos), 0)::bigint AS centavos FROM receitas
          WHERE tenant_id = $1 AND fonte IN ('afiliado_lomadee', 'afiliado_outros') AND status <> 'cancelada' AND competencia > $2::date AND competencia <= $3::date`,
        [t, diaNoFuso(trintaDiasAtras, fuso), hoje],
      ),
    ]);

    const vazioFonte = () => Object.fromEntries(FONTES_RECEITA.map((f) => [f, 0])) as Record<FonteReceita, number>;
    const vazioStatus = () => Object.fromEntries(STATUS_RECEITA.map((s) => [s, 0])) as Record<StatusReceita, number>;
    const linhasMes = new Map(meses.map((mes) => [mes, { mes, total_centavos: 0, por_fonte: vazioFonte(), por_status: vazioStatus(), lancamentos: 0 }]));
    const totais = { total_centavos: 0, por_fonte: vazioFonte(), por_status: vazioStatus(), lancamentos: 0 };
    for (const r of porMes.rows) {
      const linha = linhasMes.get(r.mes)!;
      const c = Number(r.centavos);
      linha.por_status[r.status as StatusReceita] += c;
      totais.por_status[r.status as StatusReceita] += c;
      linha.lancamentos += r.n;
      totais.lancamentos += r.n;
      // Cancelada aparece na contagem por status, mas não soma na receita.
      if (r.status === 'cancelada') continue;
      linha.por_fonte[r.fonte as FonteReceita] += c;
      linha.total_centavos += c;
      totais.por_fonte[r.fonte as FonteReceita] += c;
      totais.total_centavos += c;
    }
    const lista = [...linhasMes.values()];
    const atual = lista.at(-1)!, anterior = lista.at(-2);

    // Últimos 30 dias, dia a dia (dia sem clique vale zero).
    const porDia = new Map(cliques.rows.map((r) => [r.dia as string, r]));
    const dias = Array.from({ length: 30 }, (_, i) => {
      const dia = diaNoFuso(new Date(agora.getTime() - (29 - i) * 86_400_000), fuso);
      const r = porDia.get(dia);
      return { dia, cliques: r?.cliques ?? 0, cliques_afiliado: r?.afiliado ?? 0 };
    });
    const cliquesAfiliado = dias.reduce((s, x) => s + x.cliques_afiliado, 0);
    const receitaAfiliado30 = Number(afiliado30.rows[0].centavos);
    const porPlano = { premium_mensal: 0, premium_anual: 0 } as Record<string, number>;
    for (const r of assinaturas.rows) porPlano[r.plano] = r.n;

    return {
      gerado_em: agora.toISOString(),
      periodo: { de: meses[0], ate: mesFinal },
      meses: lista,
      totais,
      mes_atual: {
        mes: atual.mes,
        total_centavos: atual.total_centavos,
        recebido_centavos: atual.por_status.recebida,
        a_receber_centavos: atual.por_status.prevista + atual.por_status.confirmada,
        variacao: anterior === undefined || anterior.total_centavos === 0 ? null : Math.round(((atual.total_centavos - anterior.total_centavos) / anterior.total_centavos) * 10000) / 10000,
      },
      cliques: { dias, total: dias.reduce((s, x) => s + x.cliques, 0), afiliado: cliquesAfiliado },
      assinaturas: { ativas: porPlano.premium_mensal! + porPlano.premium_anual!, por_plano: porPlano },
      receita_afiliado_por_clique_centavos: cliquesAfiliado > 0 && receitaAfiliado30 > 0 ? Math.round(receitaAfiliado30 / cliquesAfiliado) : null,
    };
  });
}
