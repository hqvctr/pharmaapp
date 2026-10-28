// /v1/seguidos (openapi.yaml, tag seguidos): a estrela do produto e os avisos dele. Exigem termos aceitos.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../db/transacao.js';
import { produtoResumo } from '../alertas.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { codificarCursor, lerCursor, lerLimite, UUID } from '../cursor.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import type { Db } from '../../pipeline/repositorio.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const BOOLEANOS = ['promocao_excepcional', 'voltou_estoque', 'menor_preco_180d', 'promocao_acabando'] as const;

const COLUNAS = `sg.promocao_excepcional, sg.queda_percentual, sg.voltou_estoque, sg.menor_preco_180d, sg.promocao_acabando, sg.criado_em, sg.atualizado_em, sg.id AS seguimento_id,
                 p.id AS product_id, p.nome, p.marca, p.marca_chave, p.categoria, p.gtin, p.quantidade, p.unidade, p.imagem_url`;
const paraSeguimento = (r: any) => ({
  produto: produtoResumo(r),
  avisos: {
    promocao_excepcional: r.promocao_excepcional,
    queda_percentual: r.queda_percentual,
    voltou_estoque: r.voltou_estoque,
    menor_preco_180d: r.menor_preco_180d,
    promocao_acabando: r.promocao_acabando,
  },
  criado_em: r.criado_em.toISOString(),
  atualizado_em: r.atualizado_em.toISOString(),
});

/** Todos os seguidos da pessoa, do mais novo para o mais antigo, sem paginar (a exportação). */
export async function todosSeguidos(db: Db, tenantId: string, userId: string) {
  const r = await db.query(
    `SELECT ${COLUNAS} FROM seguidos sg JOIN products p ON p.tenant_id = sg.tenant_id AND p.id = sg.product_id WHERE sg.tenant_id = $1 AND sg.user_id = $2 ORDER BY sg.criado_em DESC, sg.id DESC`,
    [tenantId, userId],
  );
  return r.rows.map(paraSeguimento);
}

export function rotasSeguidos(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/seguidos', async (req) => {
    const ctx = await exigirSessao(req, d.db, d.tenants, d.agora());
    const q = req.query as Record<string, unknown>;
    const l = lerLimite(q.limite);
    if ('erro' in l) throw falhaDeValidacao([{ campo: 'limite', mensagem: l.erro }]);
    const cursor = lerCursor(q.cursor);
    const params: unknown[] = [ctx.tenantId, ctx.userId, l.limite + 1];
    let filtroCursor = '';
    if (cursor !== undefined) {
      params.push(cursor.criadoEm, cursor.id);
      filtroCursor = `AND (sg.criado_em, sg.id) < ($4::timestamptz, $5::uuid)`;
    }
    const r = await d.db.query(
      `SELECT ${COLUNAS} FROM seguidos sg JOIN products p ON p.tenant_id = sg.tenant_id AND p.id = sg.product_id
        WHERE sg.tenant_id = $1 AND sg.user_id = $2 ${filtroCursor}
        ORDER BY sg.criado_em DESC, sg.id DESC LIMIT $3`,
      params,
    );
    const pagina = r.rows.slice(0, l.limite);
    const ultimo = pagina.at(-1);
    return {
      itens: pagina.map(paraSeguimento),
      proximo_cursor: r.rows.length > l.limite && ultimo !== undefined ? codificarCursor({ criadoEm: ultimo.criado_em.toISOString(), id: ultimo.seguimento_id }) : null,
    };
  });

  app.put('/v1/seguidos/:produto_id', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const produtoId = (req.params as { produto_id: string }).produto_id;
    if (!UUID.test(produtoId)) throw new ErroApi('nao_encontrado');
    const cfg = ctx.tenant.config.app;
    const b = corpoObjeto(req);
    const a = b.avisos as Record<string, unknown> | null | undefined;
    const campos: CampoInvalido[] = [];
    if (a === null || a === undefined || typeof a !== 'object' || Array.isArray(a)) campos.push({ campo: 'avisos', mensagem: 'Envie a configuração dos avisos.' });
    else {
      for (const k of BOOLEANOS) if (typeof a[k] !== 'boolean') campos.push({ campo: `avisos.${k}`, mensagem: 'Use verdadeiro ou falso.' });
      const q = a.queda_percentual;
      if (q === undefined) campos.push({ campo: 'avisos.queda_percentual', mensagem: 'Envie o percentual ou null.' });
      else if (q !== null && (!Number.isInteger(q) || (q as number) < cfg.limites.quedaPercentualMin || (q as number) > cfg.limites.quedaPercentualMax)) {
        campos.push({ campo: 'avisos.queda_percentual', mensagem: `Use de ${cfg.limites.quedaPercentualMin}% a ${cfg.limites.quedaPercentualMax}%.` });
      }
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);
    const av = a as Record<string, unknown>;

    // Só se segue produto que o app oferece e para o qual pode haver aviso: medicamento fora, e produto com advertência
    // legal (NBCAL) fora, porque aviso de queda é push e o push do sistema não cumpre a advertência (nbcal.notificarComAdvertencia).
    const produto = await d.db.query(
      `SELECT id FROM products WHERE tenant_id = $1 AND id = $2 AND categoria = ANY($3::text[]) AND cardinality(advertencias) = 0`,
      [ctx.tenantId, produtoId, cfg.categorias.map((c) => c.slug)],
    );
    if (produto.rowCount !== 1) throw new ErroApi('nao_encontrado');

    const criado = await comTransacao(d.db, async (c) => {
      await c.query(`SELECT 1 FROM users WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, ctx.userId]);
      const existe = (await c.query(`SELECT id FROM seguidos WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3`, [ctx.tenantId, ctx.userId, produtoId])).rowCount === 1;
      const valores = [av.promocao_excepcional, av.queda_percentual, av.voltou_estoque, av.menor_preco_180d, av.promocao_acabando];
      if (existe) {
        await c.query(
          `UPDATE seguidos SET promocao_excepcional = $4, queda_percentual = $5, voltou_estoque = $6, menor_preco_180d = $7, promocao_acabando = $8, atualizado_em = $9
            WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3`,
          [ctx.tenantId, ctx.userId, produtoId, ...valores, agora],
        );
        return false;
      }
      const total = (await c.query(`SELECT count(*)::int AS n FROM seguidos WHERE tenant_id = $1 AND user_id = $2`, [ctx.tenantId, ctx.userId])).rows[0].n as number;
      if (total >= cfg.limites.maxProdutosSeguidos) throw new ErroApi('limite_atingido', `Você pode seguir até ${cfg.limites.maxProdutosSeguidos} produtos.`);
      await c.query(
        `INSERT INTO seguidos (tenant_id, user_id, product_id, promocao_excepcional, queda_percentual, voltou_estoque, menor_preco_180d, promocao_acabando, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [ctx.tenantId, ctx.userId, produtoId, ...valores, agora],
      );
      return true;
    });
    const r = await d.db.query(`SELECT ${COLUNAS} FROM seguidos sg JOIN products p ON p.tenant_id = sg.tenant_id AND p.id = sg.product_id WHERE sg.tenant_id = $1 AND sg.user_id = $2 AND sg.product_id = $3`, [ctx.tenantId, ctx.userId, produtoId]);
    return reply.code(criado ? 201 : 200).send(paraSeguimento(r.rows[0]));
  });

  app.delete('/v1/seguidos/:produto_id', async (req, reply) => {
    const ctx = await exigirSessao(req, d.db, d.tenants, d.agora());
    const produtoId = (req.params as { produto_id: string }).produto_id;
    if (UUID.test(produtoId)) await d.db.query(`DELETE FROM seguidos WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3`, [ctx.tenantId, ctx.userId, produtoId]);
    return reply.code(204).send(); // idempotente
  });
}
