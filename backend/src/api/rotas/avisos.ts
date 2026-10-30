// /v1/avisos e /v1/avisos/leitura (openapi.yaml, tag avisos): a central de avisos. Exigem termos aceitos.
// Quem cria os avisos é o despachante (src/despachante, fase 4); a rota lê o que a tabela tiver.
import type { FastifyInstance } from 'fastify';
import { produtoResumo } from '../alertas.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { codificarCursor, lerCursor, lerLimite, UUID } from '../cursor.js';
import type { CampoInvalido } from '../erros.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

export const COLUNAS_AVISO = `av.id AS aviso_id, av.tipo, av.origem, av.criado_em, av.lido_em, av.alert_id, av.preco_centavos, av.queda, av.valida_ate, av.push, av.push_em,
       p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url, p.subcategoria,
       s.id AS store_id, s.nome AS loja_nome, s.rede, s.tipo AS loja_tipo`;
export const JUNCOES_AVISO = `FROM avisos av
       JOIN products p ON p.tenant_id = av.tenant_id AND p.id = av.product_id
       LEFT JOIN stores s ON s.tenant_id = av.tenant_id AND s.id = av.store_id`;

/** `Aviso` do contrato a partir de uma linha com `COLUNAS_AVISO`. */
export function paraAviso(r: any) {
  return {
    id: r.aviso_id,
    tipo: r.tipo,
    origem: r.origem,
    criado_em: r.criado_em.toISOString(),
    lido_em: r.lido_em === null ? null : r.lido_em.toISOString(),
    produto: produtoResumo(r),
    loja: r.store_id === null ? null : { id: r.store_id, nome: r.loja_nome, rede: r.rede, tipo: r.loja_tipo },
    alerta_id: r.alert_id,
    preco_centavos: r.preco_centavos,
    queda: r.queda === null ? null : Number(r.queda),
    valida_ate: r.valida_ate === null ? null : r.valida_ate.toISOString(),
    push: { situacao: r.push, em: r.push_em === null ? null : r.push_em.toISOString() },
  };
}

const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function rotasAvisos(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/avisos', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const q = req.query as Record<string, unknown>;
    const campos: CampoInvalido[] = [];
    let soNaoLidos = false;
    if (q.nao_lidos !== undefined) {
      if (q.nao_lidos === 'true') soNaoLidos = true;
      else if (q.nao_lidos !== 'false') campos.push({ campo: 'nao_lidos', mensagem: 'Use true ou false.' });
    }
    const l = lerLimite(q.limite);
    if ('erro' in l) campos.push({ campo: 'limite', mensagem: l.erro });
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const cursor = lerCursor(q.cursor);
    const limite = (l as { limite: number }).limite;

    // O que a pessoa pode ver: produto de categoria que o app oferece; loja e marca não silenciadas com "tudo"; alerta (quando há)
    // aprovado ou sem revisão. Aviso de silêncio só de push continua na central (ela guarda tudo o que foi gerado).
    const VISIVEL = `av.tenant_id = $1 AND av.user_id = $2 AND p.categoria = ANY($3::text[])
        AND NOT EXISTS (SELECT 1 FROM silenciamentos sl WHERE sl.tenant_id = av.tenant_id AND sl.user_id = av.user_id AND sl.alcance = 'tudo'
                          AND ((sl.tipo = 'loja' AND sl.loja_id = av.store_id) OR (sl.tipo = 'marca' AND sl.marca_chave = p.marca_chave)))
        AND (av.alert_id IS NULL OR EXISTS (SELECT 1 FROM alerts a WHERE a.tenant_id = av.tenant_id AND a.id = av.alert_id AND a.revisao_situacao IN ('nao_exigida', 'aprovado')))`;
    const base = [ctx.tenantId, ctx.userId, ctx.tenant.config.app.categorias.map((c) => c.slug)];
    // Compara pelo milissegundo, que é o que o cursor carrega.
    const MS = `date_trunc('milliseconds', av.criado_em)`;
    const params: unknown[] = [...base, limite + 1];
    let filtro = soNaoLidos ? 'AND av.lido_em IS NULL' : '';
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      filtro += ` AND (${MS}, av.id) < ($5::timestamptz, $6::uuid)`;
    }
    const [pagina, naoLidos] = await Promise.all([
      d.db.query(`SELECT ${COLUNAS_AVISO} ${JUNCOES_AVISO} WHERE ${VISIVEL} ${filtro} ORDER BY ${MS} DESC, av.id DESC LIMIT $4`, params),
      d.db.query(`SELECT count(*)::int AS n ${JUNCOES_AVISO} WHERE ${VISIVEL} AND av.lido_em IS NULL`, base),
    ]);
    const itens = pagina.rows.slice(0, limite);
    const ultimo = itens.at(-1);
    return {
      itens: itens.map(paraAviso),
      proximo_cursor: pagina.rows.length > limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criado_em.toISOString(), id: ultimo.aviso_id }) : null,
      nao_lidos: naoLidos.rows[0].n as number,
    };
  });

  app.post('/v1/avisos/leitura', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const b = corpoObjeto(req);
    const chaves = Object.keys(b);
    const campos: CampoInvalido[] = [];
    for (const k of chaves) if (k !== 'ids' && k !== 'ate') campos.push({ campo: k, mensagem: 'Campo desconhecido.' });
    if (campos.length === 0 && chaves.length !== 1) campos.push({ campo: 'ids', mensagem: 'Envie `ids` ou `ate` (um dos dois).' });
    if (campos.length === 0 && chaves[0] === 'ids') {
      const ids = b.ids;
      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100) campos.push({ campo: 'ids', mensagem: 'Envie de 1 a 100 ids.' });
      else ids.forEach((id, i) => { if (typeof id !== 'string' || !UUID.test(id)) campos.push({ campo: `ids.${i}`, mensagem: 'Use o id do aviso.' }); });
    }
    if (campos.length === 0 && chaves[0] === 'ate' && (typeof b.ate !== 'string' || !DATA_HORA.test(b.ate) || Number.isNaN(Date.parse(b.ate)))) {
      campos.push({ campo: 'ate', mensagem: 'Use data e hora, como 2026-10-27T15:00:00Z.' });
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);

    // Aviso já lido mantém o `lido_em` original; id que não é desta pessoa é ignorado como se não existisse.
    if (chaves[0] === 'ids') {
      await d.db.query(`UPDATE avisos SET lido_em = $4 WHERE tenant_id = $1 AND user_id = $2 AND id = ANY($3::uuid[]) AND lido_em IS NULL`, [ctx.tenantId, ctx.userId, b.ids, agora]);
    } else {
      await d.db.query(
        `UPDATE avisos SET lido_em = $4 WHERE tenant_id = $1 AND user_id = $2 AND date_trunc('milliseconds', criado_em) <= $3::timestamptz AND lido_em IS NULL`,
        [ctx.tenantId, ctx.userId, b.ate, agora],
      );
    }
    return reply.code(204).send();
  });
}
