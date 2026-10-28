// /v1/admin/alertas* (admin.yaml, tag alertas): fila de aprovação e revisão dos alertas.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../../db/transacao.js';
import { produtoResumo } from '../../alertas.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { codificarCursor } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador } from '../../sessaoOperador.js';
import type { DepsAuth } from '../auth.js';
import { idDoCaminho, lerEnum, lerObservacao, lerPagina, revisaoJson } from './comum.js';

const REVISOES = ['pendente', 'aprovado', 'rejeitado', 'nao_exigida'] as const;
const DECISOES = ['notificar', 'aguardar_aprovacao', 'somente_feed'] as const;

const num = (v: unknown): number => Number(v);

/** `LojaAdmin` a partir de colunas `loja_*` (prefixo) de `stores`. */
export function lojaAdminJson(r: any, p = '') {
  return {
    id: r[`${p}id`],
    rede: r[`${p}rede`],
    nome: r[`${p}nome`],
    cnpj: r[`${p}cnpj`] === null ? null : String(r[`${p}cnpj`]).trim(),
    tipo: r[`${p}tipo`],
    status: r[`${p}status`],
    reputacao: num(r[`${p}reputacao`]),
    autorizacao_sanitaria: r[`${p}autorizacao_sanitaria`],
    criado_em: r[`${p}criado_em`].toISOString(),
  };
}

export const COLUNAS_ALERTA_ADMIN = `a.id, a.criado_em, a.decisao, a.revisao_situacao, a.revisao_operador_id, a.revisao_em, a.revisao_observacao, ro.nome AS revisao_operador_nome,
       a.preco_centavos, a.preco_efetivo_por_unidade, a.preco_referencia_por_unidade, a.rotulo_condicao, a.entrega_a_confirmar,
       o.id AS offer_id, o.valida_ate, o.coletada_em, o.link, o.link_afiliado, o.disponivel, o.escondida_em, o.preco_centavos AS oferta_preco_centavos,
       p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url,
       s.id AS loja_id, s.rede AS loja_rede, s.nome AS loja_nome, s.cnpj AS loja_cnpj, s.tipo AS loja_tipo, s.status AS loja_status,
       s.reputacao AS loja_reputacao, s.autorizacao_sanitaria AS loja_autorizacao_sanitaria, s.criado_em AS loja_criado_em,
       src.id AS fonte_id, src.nome AS fonte_nome, src.tipo AS fonte_tipo, src.confiabilidade AS fonte_confiabilidade, src.status_confianca AS fonte_status`;
export const JUNCOES_ALERTA_ADMIN = `FROM alerts a
       JOIN offers o ON o.tenant_id = a.tenant_id AND o.id = a.offer_id
       JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
       JOIN stores s ON s.tenant_id = a.tenant_id AND s.id = a.store_id
       JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
       LEFT JOIN operadores ro ON ro.tenant_id = a.tenant_id AND ro.id = a.revisao_operador_id`;

/** Escondida por denúncia; encerrada (acabou, saiu do ar ou o preço mudou); senão ativa. */
export function situacaoOferta(r: any, agora: Date): 'ativa' | 'encerrada' | 'escondida_por_denuncia' {
  if (r.escondida_em !== null) return 'escondida_por_denuncia';
  if (!r.disponivel || (r.valida_ate !== null && r.valida_ate <= agora) || r.oferta_preco_centavos !== r.preco_centavos) return 'encerrada';
  return 'ativa';
}

export function alertaAdminJson(r: any, agora: Date) {
  const efetivo = num(r.preco_efetivo_por_unidade);
  const referencia = num(r.preco_referencia_por_unidade);
  const queda = referencia > 0 ? Math.min(1, Math.max(0, 1 - efetivo / referencia)) : 0;
  return {
    id: r.id,
    criado_em: r.criado_em.toISOString(),
    decisao: r.decisao,
    revisao: r.revisao_situacao,
    revisao_por: revisaoJson(r.revisao_operador_id, r.revisao_operador_nome, r.revisao_em, r.revisao_observacao),
    situacao_oferta: situacaoOferta(r, agora),
    produto: produtoResumo(r),
    loja: lojaAdminJson(r, 'loja_'),
    fonte: { id: r.fonte_id, nome: r.fonte_nome, tipo: r.fonte_tipo, confiabilidade: r.fonte_confiabilidade, status_confianca: r.fonte_status },
    preco_centavos: r.preco_centavos,
    preco_referencia_centavos: Math.max(1, Math.round(referencia * num(r.quantidade))),
    preco_por_unidade_centavos: efetivo,
    preco_referencia_por_unidade_centavos: referencia,
    queda: Math.round(queda * 10000) / 10000,
    rotulo_condicao: r.rotulo_condicao,
    entrega_a_confirmar: r.entrega_a_confirmar,
    valida_ate: r.valida_ate === null ? null : r.valida_ate.toISOString(),
    coletada_em: r.coletada_em.toISOString(),
    link: r.link,
    link_afiliado: r.link_afiliado,
  };
}

export function rotasAdminAlertas(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/admin/alertas', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const revisao = lerEnum(q, 'revisao', REVISOES, campos) ?? 'pendente';
    const decisao = lerEnum(q, 'decisao', DECISOES, campos);
    const { limite, cursor } = lerPagina(q, campos);

    const params: unknown[] = [ctx.tenantId, revisao];
    const onde = ['a.tenant_id = $1', 'a.revisao_situacao = $2'];
    if (decisao !== undefined) {
      params.push(decisao);
      onde.push(`a.decisao = $${params.length}`);
    }
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(a.criado_em, a.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(
      `SELECT ${COLUNAS_ALERTA_ADMIN} ${JUNCOES_ALERTA_ADMIN} WHERE ${onde.join(' AND ')} ORDER BY a.criado_em DESC, a.id DESC LIMIT $${params.length}`,
      params,
    );
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map((l) => alertaAdminJson(l, agora)),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criado_em.toISOString(), id: ultimo.id }) : null,
    };
  });

  async function buscar(db: { query: typeof d.db.query }, tenantId: string, id: string, agora: Date, travar = false) {
    const r = await db.query(
      `SELECT ${COLUNAS_ALERTA_ADMIN} ${JUNCOES_ALERTA_ADMIN} WHERE a.tenant_id = $1 AND a.id = $2 ${travar ? 'FOR UPDATE OF a' : ''}`,
      [tenantId, id],
    );
    if (r.rowCount !== 1) throw new ErroApi('nao_encontrado');
    return r.rows[0];
  }

  app.get('/v1/admin/alertas/:id', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    return alertaAdminJson(await buscar(d.db, ctx.tenantId, idDoCaminho(req), agora), agora);
  });

  app.put('/v1/admin/alertas/:id/revisao', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (b.resultado !== 'aprovado' && b.resultado !== 'rejeitado') campos.push({ campo: 'resultado', mensagem: 'Use aprovado ou rejeitado.' });
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const resultado = b.resultado as 'aprovado' | 'rejeitado';

    await comTransacao(d.db, async (c) => {
      const a = await buscar(c, ctx.tenantId, id, agora, true);
      // Repetir o resultado já gravado devolve 200 sem mudar nada (nem a auditoria).
      if (a.revisao_situacao === resultado) return;
      if (resultado === 'aprovado') {
        if (a.revisao_situacao === 'rejeitado') throw new ErroApi('ja_revisado');
        if (a.decisao !== 'aguardar_aprovacao') throw new ErroApi('estado_conflitante');
        if (situacaoOferta(a, agora) !== 'ativa') throw new ErroApi('oferta_encerrada');
      }
      await c.query(
        `UPDATE alerts SET revisao_situacao = $3, revisao_operador_id = $4, revisao_em = $5, revisao_observacao = $6 WHERE tenant_id = $1 AND id = $2`,
        [ctx.tenantId, id, resultado, ctx.operador.id, agora, observacao],
      );
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'alerta_revisado', alvoTipo: 'alerta', alvoId: id, em: agora,
        detalhe: { revisao: { de: a.revisao_situacao, para: resultado }, observacao },
      });
    });
    return alertaAdminJson(await buscar(d.db, ctx.tenantId, id, agora), agora);
  });
}
