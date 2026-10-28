// /v1/silenciamentos (openapi.yaml, tag preferencias). Exigem termos aceitos.
import type { FastifyInstance } from 'fastify';
import { comTransacao } from '../../db/transacao.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { UUID } from '../cursor.js';
import { ErroApi } from '../erros.js';
import type { Db } from '../../pipeline/repositorio.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const ALVO = /^[a-z0-9-]{1,64}$/;
const ALCANCES = ['push', 'tudo'];

function lerAlvo(params: unknown): { tipo: 'loja' | 'marca'; alvo: string } {
  const p = params as { tipo?: string; alvo?: string };
  if (p.tipo !== 'loja' && p.tipo !== 'marca') throw falhaDeValidacao([{ campo: 'tipo', mensagem: 'Use loja ou marca.' }]);
  if (typeof p.alvo !== 'string' || !ALVO.test(p.alvo)) throw falhaDeValidacao([{ campo: 'alvo', mensagem: 'Alvo inválido.' }]);
  return { tipo: p.tipo, alvo: p.alvo };
}

const SELECT_SILENCIAMENTO = `SELECT sl.tipo, sl.alcance, sl.criado_em, sl.loja_id, sl.marca_chave,
                       s.nome AS loja_nome,
                       (SELECT p.marca FROM products p WHERE p.tenant_id = sl.tenant_id AND p.marca_chave = sl.marca_chave LIMIT 1) AS marca_nome
                  FROM silenciamentos sl LEFT JOIN stores s ON s.tenant_id = sl.tenant_id AND s.id = sl.loja_id`;
const paraJson = (r: any) => ({
  tipo: r.tipo,
  alvo: r.tipo === 'loja' ? r.loja_id : r.marca_chave,
  nome: r.tipo === 'loja' ? r.loja_nome : (r.marca_nome ?? r.marca_chave),
  alcance: r.alcance,
  criado_em: r.criado_em.toISOString(),
});

/** Todos os silenciamentos da pessoa, do mais novo para o mais antigo (a lista da rota e a exportação). */
export async function listarSilenciamentos(db: Db, tenantId: string, userId: string) {
  const r = await db.query(`${SELECT_SILENCIAMENTO} WHERE sl.tenant_id = $1 AND sl.user_id = $2 ORDER BY sl.criado_em DESC, sl.id DESC`, [tenantId, userId]);
  return r.rows.map(paraJson);
}

export function rotasSilenciamentos(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/silenciamentos', async (req) => {
    const ctx = await exigirSessao(req, d.db, d.tenants, d.agora());
    return { itens: await listarSilenciamentos(d.db, ctx.tenantId, ctx.userId) };
  });

  app.put('/v1/silenciamentos/:tipo/:alvo', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const { tipo, alvo } = lerAlvo(req.params);
    const b = corpoObjeto(req);
    if (typeof b.alcance !== 'string' || !ALCANCES.includes(b.alcance)) throw falhaDeValidacao([{ campo: 'alcance', mensagem: 'Use push ou tudo.' }]);

    // O alvo precisa existir no tenant: loja pelo id, marca pela chave de algum produto.
    let lojaId: string | null = null;
    let marcaChave: string | null = null;
    if (tipo === 'loja') {
      if (!UUID.test(alvo)) throw new ErroApi('nao_encontrado');
      const loja = await d.db.query(`SELECT id FROM stores WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, alvo]);
      if (loja.rowCount !== 1) throw new ErroApi('nao_encontrado');
      lojaId = alvo;
    } else {
      const marca = await d.db.query(`SELECT 1 FROM products WHERE tenant_id = $1 AND marca_chave = $2 LIMIT 1`, [ctx.tenantId, alvo]);
      if (marca.rowCount !== 1) throw new ErroApi('nao_encontrado');
      marcaChave = alvo;
    }

    const criado = await comTransacao(d.db, async (c) => {
      // Trava a pessoa: dois pedidos simultâneos não passam do teto.
      await c.query(`SELECT 1 FROM users WHERE tenant_id = $1 AND id = $2 FOR UPDATE`, [ctx.tenantId, ctx.userId]);
      const existente = await c.query(
        `SELECT id FROM silenciamentos WHERE tenant_id = $1 AND user_id = $2 AND tipo = $3 AND (loja_id = $4 OR marca_chave = $5)`,
        [ctx.tenantId, ctx.userId, tipo, lojaId, marcaChave],
      );
      if (existente.rowCount === 1) {
        await c.query(`UPDATE silenciamentos SET alcance = $2 WHERE id = $1`, [existente.rows[0].id, b.alcance]);
        return false;
      }
      const total = (await c.query(`SELECT count(*)::int AS n FROM silenciamentos WHERE tenant_id = $1 AND user_id = $2`, [ctx.tenantId, ctx.userId])).rows[0].n as number;
      if (total >= ctx.tenant.config.app.limites.maxSilenciamentos) throw new ErroApi('limite_atingido', `Você pode silenciar até ${ctx.tenant.config.app.limites.maxSilenciamentos} lojas e marcas.`);
      await c.query(
        `INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, marca_chave, alcance, criado_em) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ctx.tenantId, ctx.userId, tipo, lojaId, marcaChave, b.alcance, agora],
      );
      return true;
    });
    const r = await d.db.query(`${SELECT_SILENCIAMENTO} WHERE sl.tenant_id = $1 AND sl.user_id = $2 AND sl.tipo = $3 AND (sl.loja_id = $4 OR sl.marca_chave = $5)`, [ctx.tenantId, ctx.userId, tipo, lojaId, marcaChave]);
    return reply.code(criado ? 201 : 200).send(paraJson(r.rows[0]));
  });

  app.delete('/v1/silenciamentos/:tipo/:alvo', async (req, reply) => {
    const ctx = await exigirSessao(req, d.db, d.tenants, d.agora());
    const { tipo, alvo } = lerAlvo(req.params);
    // Idempotente: sem o silenciamento (ou com alvo que nem existe), continua 204.
    await d.db.query(
      `DELETE FROM silenciamentos WHERE tenant_id = $1 AND user_id = $2 AND tipo = $3
          AND ((tipo = 'loja' AND loja_id::text = $4) OR (tipo = 'marca' AND marca_chave = $4))`,
      [ctx.tenantId, ctx.userId, tipo, alvo],
    );
    return reply.code(204).send();
  });
}
