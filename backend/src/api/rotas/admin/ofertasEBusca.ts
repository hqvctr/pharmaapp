// /v1/admin/ofertas-manuais (lista e encerramento), /v1/admin/produtos e /v1/admin/auditoria (admin.yaml).
// O cadastro de oferta manual (POST) é da fase 5: precisa das listas de medicamentos (CMED) carregadas na API e do prazo padrão (D21).
import type { FastifyInstance } from 'fastify';
import { normalizarTexto } from '../../../normalizador/medicamentos.js';
import { rotuloCondicao } from '../../../curadoria/preco.js';
import type { Condicao } from '../../../curadoria/tipos.js';
import { comTransacao } from '../../../db/transacao.js';
import { produtoResumo } from '../../alertas.js';
import { registrarAuditoria } from '../../auditoria.js';
import { falhaDeValidacao } from '../../corpo.js';
import { codificarCursor, lerLimite, UUID } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador } from '../../sessaoOperador.js';
import type { DepsAuth } from '../auth.js';
import { cursorDeOffset, escapar, lerOffset, MAX_PALAVRAS } from '../produtos.js';
import { idDoCaminho, lerBooleano, lerDataHora, lerEnum, lerPagina } from './comum.js';

const ACOES = [
  'operador_entrou', 'alerta_revisado', 'loja_status_definido', 'fonte_status_definido', 'fonte_credencial_gravada',
  'denuncia_resolvida', 'triagem_revisada', 'triagem_liberada', 'oferta_manual_criada', 'oferta_manual_encerrada',
] as const;

export function rotasAdminOfertasEBusca(app: FastifyInstance, d: DepsAuth): void {
  // ---------------------------------------------------------------- ofertas manuais
  const COLUNAS_OFERTA = `o.id, o.preco_centavos, o.condicao, o.frete_status, o.frete_centavos, o.valida_de, o.valida_ate, o.validade_padrao_aplicada,
       o.link, o.link_afiliado, o.disponivel, o.criado_em AS criada_em, o.criada_por, op.nome AS criada_por_nome,
       p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url,
       s.id AS loja_id, s.nome AS loja_nome, s.rede AS loja_rede, s.tipo AS loja_tipo,
       (SELECT a.id FROM alerts a WHERE a.tenant_id = o.tenant_id AND a.offer_id = o.id ORDER BY a.criado_em DESC, a.id DESC LIMIT 1) AS alerta_id`;
  const JUNCOES_OFERTA = `FROM offers o
       JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
       JOIN stores s ON s.tenant_id = o.tenant_id AND s.id = o.store_id
       JOIN operadores op ON op.tenant_id = o.tenant_id AND op.id = o.criada_por`;
  const ofertaJson = (r: any) => ({
    id: r.id,
    produto: produtoResumo(r),
    loja: { id: r.loja_id, nome: r.loja_nome, rede: r.loja_rede, tipo: r.loja_tipo },
    preco_centavos: r.preco_centavos,
    condicao: r.condicao,
    rotulo_condicao: rotuloCondicao(r.condicao as Condicao | null),
    frete: { status: r.frete_status, centavos: r.frete_status === 'conhecido' ? r.frete_centavos : null },
    valida_de: r.valida_de === null ? null : r.valida_de.toISOString(),
    valida_ate: r.valida_ate === null ? null : r.valida_ate.toISOString(),
    validade_padrao_aplicada: r.validade_padrao_aplicada,
    link: r.link,
    link_afiliado: r.link_afiliado,
    disponivel: r.disponivel,
    alerta_id: r.alerta_id,
    criada_por: { id: r.criada_por, nome: r.criada_por_nome },
    criada_em: r.criada_em.toISOString(),
  });

  app.get('/v1/admin/ofertas-manuais', async (req) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const ativas = lerBooleano(q, 'ativas', true, campos);
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId];
    const onde = ['o.tenant_id = $1', 'o.criada_por IS NOT NULL'];
    if (ativas) {
      params.push(agora);
      onde.push(`o.disponivel AND (o.valida_ate IS NULL OR o.valida_ate > $${params.length})`);
    }
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(o.criado_em, o.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(`SELECT ${COLUNAS_OFERTA} ${JUNCOES_OFERTA} WHERE ${onde.join(' AND ')} ORDER BY o.criado_em DESC, o.id DESC LIMIT $${params.length}`, params);
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(ofertaJson),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criada_em.toISOString(), id: ultimo.id }) : null,
    };
  });

  app.delete('/v1/admin/ofertas-manuais/:id', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const id = idDoCaminho(req);
    await comTransacao(d.db, async (c) => {
      // Só oferta cadastrada à mão: a coletada por uma fonte não se encerra por aqui.
      const o = (await c.query(`SELECT disponivel FROM offers WHERE tenant_id = $1 AND id = $2 AND criada_por IS NOT NULL FOR UPDATE`, [ctx.tenantId, id])).rows[0];
      if (o === undefined) throw new ErroApi('nao_encontrado');
      if (!o.disponivel) return; // já encerrada: 204 sem nova auditoria
      // A linha fica para auditoria e histórico; o alerta sai do feed porque a oferta deixa de estar disponível.
      await c.query(`UPDATE offers SET disponivel = false WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, id]);
      await registrarAuditoria(c, { tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'oferta_manual_encerrada', alvoTipo: 'oferta', alvoId: id, em: agora });
    });
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------- produtos
  app.get('/v1/admin/produtos', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const texto = typeof q.q === 'string' ? q.q.trim() : '';
    if (texto.length < 2 || texto.length > 100) campos.push({ campo: 'q', mensagem: 'Digite de 2 a 100 caracteres.' });
    // O cursor da busca é por deslocamento (a relevância não tem chave estável), como em /v1/produtos.
    const l = lerLimite(q.limite);
    if ('erro' in l) campos.push({ campo: 'limite', mensagem: l.erro });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const limite = (l as { limite: number }).limite;
    const offset = lerOffset(q.cursor);

    const normal = normalizarTexto(texto);
    const palavras = normal.split(' ').filter((w) => w.length > 0).slice(0, MAX_PALAVRAS);
    const ehGtin = /^[0-9]{8,14}$/.test(texto);
    // O operador só procura o que o app oferece (a oferta manual passa pela mesma triagem de qualquer produto).
    const params: unknown[] = [ctx.tenantId, ctx.tenant.config.app.categorias.map((c) => c.slug), ehGtin ? texto : null, escapar(normal)];
    const onde = ['p.tenant_id = $1', 'p.categoria = ANY($2::text[])'];
    if (ehGtin) onde.push('p.gtin = $3');
    else {
      onde.push('$3::text IS NULL');
      for (const w of palavras) {
        params.push(`%${escapar(w)}%`);
        onde.push(`f_unaccent(lower(p.nome || ' ' || p.marca)) LIKE $${params.length}`);
      }
    }
    params.push(offset, limite + 1);
    const r = await d.db.query(
      `SELECT p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url
         FROM products p WHERE ${onde.join(' AND ')}
        ORDER BY CASE WHEN p.gtin = $3 THEN 0
                      WHEN f_unaccent(lower(p.nome)) LIKE $4 || '%' ESCAPE '\\' THEN 1
                      WHEN f_unaccent(lower(p.nome)) LIKE '% ' || $4 || '%' ESCAPE '\\' THEN 2
                      ELSE 3 END, p.nome, p.id
        OFFSET $${params.length - 1} LIMIT $${params.length}`,
      params,
    );
    return { itens: r.rows.slice(0, limite).map(produtoResumo), proximo_cursor: r.rows.length > limite ? cursorDeOffset(offset + limite) : null };
  });

  // ---------------------------------------------------------------- auditoria
  app.get('/v1/admin/auditoria', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    const acao = lerEnum(q, 'acao', ACOES, campos);
    let operadorId: string | undefined;
    if (q.operador_id !== undefined) {
      if (typeof q.operador_id !== 'string' || !UUID.test(q.operador_id)) campos.push({ campo: 'operador_id', mensagem: 'Use o id do operador.' });
      else operadorId = q.operador_id;
    }
    const desde = lerDataHora(q, 'desde', campos);
    const ate = lerDataHora(q, 'ate', campos);
    const { limite, cursor } = lerPagina(q, campos);
    const params: unknown[] = [ctx.tenantId];
    const onde = ['a.tenant_id = $1'];
    const filtro = (sql: string, valor: unknown) => {
      params.push(valor);
      onde.push(sql.replace('?', `$${params.length}`));
    };
    if (acao !== undefined) filtro('a.acao = ?', acao);
    if (operadorId !== undefined) filtro('a.operador_id = ?::uuid', operadorId);
    if (desde !== undefined) filtro('a.em >= ?', desde);
    if (ate !== undefined) filtro('a.em <= ?', ate);
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      onde.push(`(a.em, a.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
    }
    params.push(limite + 1);
    const r = await d.db.query(
      `SELECT a.id, a.em, a.acao, a.alvo_tipo, a.alvo_id, a.detalhe, a.operador_id, op.nome AS operador_nome
         FROM auditoria a JOIN operadores op ON op.tenant_id = a.tenant_id AND op.id = a.operador_id
        WHERE ${onde.join(' AND ')} ORDER BY a.em DESC, a.id DESC LIMIT $${params.length}`,
      params,
    );
    const pagina = r.rows.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map((l) => ({
        id: l.id, em: l.em.toISOString(), operador: { id: l.operador_id, nome: l.operador_nome }, acao: l.acao, alvo_tipo: l.alvo_tipo, alvo_id: l.alvo_id, detalhe: l.detalhe,
      })),
      proximo_cursor: r.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.em.toISOString(), id: ultimo.id }) : null,
    };
  });
}
