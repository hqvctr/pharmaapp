// /v1/admin/denuncias* e /v1/admin/triagem* (admin.yaml, tags denuncias e triagem): o que o operador revisa à mão.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../../db/transacao.js';
import { CODIGOS_LIBERAVEIS } from '../../../normalizador/normalizar.js';
import { produtoResumo } from '../../alertas.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { codificarCursor } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador } from '../../sessaoOperador.js';
import type { DepsAuth } from '../auth.js';
import { idDoCaminho, lerBooleano, lerEnum, lerObservacao, lerPagina, revisaoJson } from './comum.js';

const SITUACOES = ['escondida', 'restaurada', 'mantida_escondida'] as const;
const RESOLUCOES = ['restaurar', 'manter_escondida'] as const;
const RESULTADOS_TRIAGEM = ['bloqueio_correto', 'falso_positivo', 'liberado'] as const;

/**
 * Só dá para liberar o que a triagem decidiu por texto ou por cautela (D20): cautela da NBCAL e filtro de texto de medicamento
 * (a triagem marca esses com `revisao_humana`). NBCAL_VEDADO e medicamento achado por GTIN na CMED só mudam ajustando as listas.
 */
export function bloqueioLiberavel(codigo: string, revisaoHumana: boolean): boolean {
  return CODIGOS_LIBERAVEIS.has(codigo) && (codigo === 'NBCAL_CAUTELA' || revisaoHumana);
}

export function rotasAdminModeracao(app: FastifyInstance, d: DepsAuth): void {
  // ---------------------------------------------------------------- denúncias
  const COLUNAS_CASO = `cd.id, cd.aberto_em, cd.situacao, cd.denuncias, cd.pessoas_base, cd.limite, cd.motivo_preco_errado, cd.motivo_sem_estoque,
       cd.resolucao, cd.resolucao_em, cd.resolucao_observacao, cd.resolucao_operador_id, ro.nome AS resolucao_operador_nome,
       o.id AS offer_id, o.preco_centavos, o.link, o.coletada_em,
       p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url,
       s.id AS loja_id, s.nome AS loja_nome, s.rede AS loja_rede, s.tipo AS loja_tipo`;
  const JUNCOES_CASO = `FROM casos_denuncia cd
       JOIN offers o ON o.tenant_id = cd.tenant_id AND o.id = cd.offer_id
       JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
       JOIN stores s ON s.tenant_id = o.tenant_id AND s.id = o.store_id
       LEFT JOIN operadores ro ON ro.tenant_id = cd.tenant_id AND ro.id = cd.resolucao_operador_id`;
  const casoJson = (r: any) => ({
    id: r.id,
    aberto_em: r.aberto_em.toISOString(),
    situacao: r.situacao,
    oferta: {
      id: r.offer_id,
      produto: produtoResumo(r),
      loja: { id: r.loja_id, nome: r.loja_nome, rede: r.loja_rede, tipo: r.loja_tipo },
      preco_centavos: r.preco_centavos,
      link: r.link,
      coletada_em: r.coletada_em.toISOString(),
    },
    denuncias: r.denuncias,
    pessoas_base: r.pessoas_base,
    limite: r.limite,
    motivos: { preco_errado: r.motivo_preco_errado, sem_estoque: r.motivo_sem_estoque },
    resolucao: r.resolucao,
    resolucao_por: revisaoJson(r.resolucao_operador_id, r.resolucao_operador_nome, r.resolucao_em, r.resolucao_observacao),
  });

  app.get('/v1/admin/denuncias', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const situacao = lerEnum(q, 'situacao', SITUACOES, campos) ?? 'escondida';
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId, situacao];
    const onde = ['cd.tenant_id = $1', 'cd.situacao = $2'];
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(cd.aberto_em, cd.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(`SELECT ${COLUNAS_CASO} ${JUNCOES_CASO} WHERE ${onde.join(' AND ')} ORDER BY cd.aberto_em DESC, cd.id DESC LIMIT $${params.length}`, params);
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(casoJson),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.aberto_em.toISOString(), id: ultimo.id }) : null,
    };
  });

  app.put('/v1/admin/denuncias/:id/resolucao', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (typeof b.resultado !== 'string' || !(RESOLUCOES as readonly string[]).includes(b.resultado)) campos.push({ campo: 'resultado', mensagem: 'Use restaurar ou manter_escondida.' });
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const resultado = b.resultado as (typeof RESOLUCOES)[number];

    await comTransacao(d.db, async (c) => {
      const caso = (await c.query(`SELECT id, offer_id, situacao, resolucao FROM casos_denuncia WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (caso === undefined) throw new ErroApi('nao_encontrado');
      // Mesmo resultado repetido: 200 sem mexer. Resultado diferente do já gravado: 409.
      if (caso.resolucao !== null) {
        if (caso.resolucao === resultado) return;
        throw new ErroApi('ja_revisado');
      }
      await c.query(
        `UPDATE casos_denuncia SET situacao = $3, resolucao = $4, resolucao_operador_id = $5, resolucao_em = $6, resolucao_observacao = $7 WHERE tenant_id = $1 AND id = $2`,
        [ctx.tenantId, id, resultado === 'restaurar' ? 'restaurada' : 'mantida_escondida', resultado, ctx.operador.id, agora, observacao],
      );
      // Restaurar devolve a oferta ao feed. Denúncia nova do mesmo alerta é ignorada até o preço mudar (D19, regra do endpoint de denúncia).
      if (resultado === 'restaurar') await c.query(`UPDATE offers SET escondida_em = NULL WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, caso.offer_id]);
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'denuncia_resolvida', alvoTipo: 'caso_denuncia', alvoId: id, em: agora,
        detalhe: { resultado, observacao },
      });
    });
    const r = await d.db.query(`SELECT ${COLUNAS_CASO} ${JUNCOES_CASO} WHERE cd.tenant_id = $1 AND cd.id = $2`, [ctx.tenantId, id]);
    return casoJson(r.rows[0]);
  });

  // ---------------------------------------------------------------- triagem
  const COLUNAS_TRIAGEM = `tb.id, tb.id_externo, tb.titulo, tb.codigo, tb.detalhe, tb.revisao_humana, tb.primeira_vez_em, tb.ultima_vez_em,
       tb.resultado, tb.revisado_em, tb.revisado_por, tb.revisao_observacao, ro.nome AS revisado_por_nome,
       src.id AS fonte_id, src.nome AS fonte_nome, src.tipo AS fonte_tipo, src.confiabilidade AS fonte_confiabilidade, src.status_confianca AS fonte_status`;
  const JUNCOES_TRIAGEM = `FROM triagem_bloqueios tb
       JOIN sources src ON src.tenant_id = tb.tenant_id AND src.id = tb.source_id
       LEFT JOIN operadores ro ON ro.tenant_id = tb.tenant_id AND ro.id = tb.revisado_por`;
  const triagemJson = (r: any) => ({
    id: r.id,
    fonte: { id: r.fonte_id, nome: r.fonte_nome, tipo: r.fonte_tipo, confiabilidade: r.fonte_confiabilidade, status_confianca: r.fonte_status },
    id_externo: r.id_externo,
    titulo: r.titulo,
    codigo: r.codigo,
    detalhe: r.detalhe,
    revisao_humana: r.revisao_humana,
    liberavel: bloqueioLiberavel(r.codigo, r.revisao_humana),
    primeira_vez_em: r.primeira_vez_em.toISOString(),
    ultima_vez_em: r.ultima_vez_em.toISOString(),
    resultado: r.resultado,
    revisao_por: revisaoJson(r.revisado_por, r.revisado_por_nome, r.revisado_em, r.revisao_observacao),
  });

  app.get('/v1/admin/triagem', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const revisado = lerBooleano(q, 'revisado', false, campos);
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId];
    const onde = ['tb.tenant_id = $1', revisado ? 'tb.revisado_em IS NOT NULL' : 'tb.revisado_em IS NULL'];
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(tb.ultima_vez_em, tb.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(`SELECT ${COLUNAS_TRIAGEM} ${JUNCOES_TRIAGEM} WHERE ${onde.join(' AND ')} ORDER BY tb.ultima_vez_em DESC, tb.id DESC LIMIT $${params.length}`, params);
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(triagemJson),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.ultima_vez_em.toISOString(), id: ultimo.id }) : null,
    };
  });

  app.put('/v1/admin/triagem/:id/revisao', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    if (typeof b.resultado !== 'string' || !(RESULTADOS_TRIAGEM as readonly string[]).includes(b.resultado)) campos.push({ campo: 'resultado', mensagem: 'Use bloqueio_correto, falso_positivo ou liberado.' });
    const observacao = lerObservacao(b, campos);
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const resultado = b.resultado as (typeof RESULTADOS_TRIAGEM)[number];

    await comTransacao(d.db, async (c) => {
      const tb = (await c.query(`SELECT id, codigo, revisao_humana, resultado FROM triagem_bloqueios WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (tb === undefined) throw new ErroApi('nao_encontrado');
      if (tb.resultado !== null) {
        if (tb.resultado === resultado) return;
        throw new ErroApi('ja_revisado');
      }
      if (resultado === 'liberado' && !bloqueioLiberavel(tb.codigo, tb.revisao_humana)) throw new ErroApi('liberacao_nao_permitida');
      await c.query(
        `UPDATE triagem_bloqueios SET resultado = $3, revisado_por = $4, revisado_em = $5, revisao_observacao = $6 WHERE tenant_id = $1 AND id = $2`,
        [ctx.tenantId, id, resultado, ctx.operador.id, agora, observacao],
      );
      await registrarAuditoria(c, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: resultado === 'liberado' ? 'triagem_liberada' : 'triagem_revisada', alvoTipo: 'triagem', alvoId: id, em: agora,
        detalhe: { resultado, codigo: tb.codigo, observacao },
      });
    });
    const r = await d.db.query(`SELECT ${COLUNAS_TRIAGEM} ${JUNCOES_TRIAGEM} WHERE tb.tenant_id = $1 AND tb.id = $2`, [ctx.tenantId, id]);
    return triagemJson(r.rows[0]);
  });
}
