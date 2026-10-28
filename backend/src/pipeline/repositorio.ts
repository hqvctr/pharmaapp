// SQL do pipeline. Toda query filtra por tenant_id.
import type pg from 'pg';
import type { Confiabilidade, StatusConfianca } from '../curadoria/tipos.js';
import type { UltimoAlerta } from '../avaliador/deduplicacao.js';
import type { LinhaHistorico, LinhaPreco, Prova } from '../avaliador/historico.js';
import type { OfertaBruta } from '../fontes/contrato.js';
import type { ProdutoNormalizado } from '../normalizador/normalizar.js';

/** Pool ou cliente dentro de transação: só a consulta é usada. */
export type Db = Pick<pg.ClientBase, 'query'>;

export interface FonteRegistrada {
  id: string;
  confiabilidade: Confiabilidade;
  statusConfianca: StatusConfianca;
  ativa: boolean;
}

export interface LojaAprovada {
  storeId: string;
  status: StatusConfianca;
  reputacao: number;
}

export async function buscarTenant(db: Db, slug: string): Promise<string> {
  const r = await db.query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [slug]);
  if (r.rowCount !== 1) throw new Error(`Tenant não encontrado: ${slug}`);
  return r.rows[0]!.id;
}

export async function buscarFonte(db: Db, tenantId: string, nome: string): Promise<FonteRegistrada> {
  const r = await db.query(
    `SELECT id, confiabilidade, status_confianca, ativa FROM sources WHERE tenant_id = $1 AND nome = $2`,
    [tenantId, nome],
  );
  if (r.rowCount !== 1) throw new Error(`Fonte não encontrada no tenant: ${nome}`);
  const f = r.rows[0];
  return { id: f.id, confiabilidade: f.confiabilidade, statusConfianca: f.status_confianca, ativa: f.ativa };
}

/** Lojas vinculadas pelo operador a esta fonte, por id externo. */
export async function buscarLojasDaFonte(
  db: Db,
  tenantId: string,
  sourceId: string,
): Promise<Map<string, LojaAprovada>> {
  const r = await db.query(
    `SELECT ref.id_externo, s.id, s.status, s.reputacao
       FROM store_source_refs ref
       JOIN stores s ON s.tenant_id = ref.tenant_id AND s.id = ref.store_id
      WHERE ref.tenant_id = $1 AND ref.source_id = $2`,
    [tenantId, sourceId],
  );
  return new Map(
    r.rows.map((l) => [l.id_externo, { storeId: l.id, status: l.status, reputacao: Number(l.reputacao) }]),
  );
}

export async function registrarBloqueio(
  db: Db,
  tenantId: string,
  sourceId: string,
  oferta: OfertaBruta,
  bloqueio: { codigo: string; detalhe: string; revisaoHumana: boolean },
  agora: Date,
): Promise<void> {
  await db.query(
    `INSERT INTO triagem_bloqueios
       (tenant_id, source_id, id_externo, titulo, codigo, detalhe, revisao_humana, primeira_vez_em, ultima_vez_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     ON CONFLICT (tenant_id, source_id, id_externo, codigo)
     DO UPDATE SET ultima_vez_em = EXCLUDED.ultima_vez_em, titulo = EXCLUDED.titulo, detalhe = EXCLUDED.detalhe`,
    [tenantId, sourceId, oferta.idExterno, oferta.titulo, bloqueio.codigo, bloqueio.detalhe, bloqueio.revisaoHumana, agora],
  );
}

/** Códigos de bloqueio que o operador liberou para cada oferta da fonte (admin: triagem `liberado`): id externo → códigos. */
export async function bloqueiosLiberados(db: Db, tenantId: string, sourceId: string): Promise<Map<string, Set<string>>> {
  const r = await db.query(
    `SELECT id_externo, codigo FROM triagem_bloqueios WHERE tenant_id = $1 AND source_id = $2 AND resultado = 'liberado'`,
    [tenantId, sourceId],
  );
  const mapa = new Map<string, Set<string>>();
  for (const l of r.rows) mapa.set(l.id_externo, (mapa.get(l.id_externo) ?? new Set()).add(l.codigo));
  return mapa;
}

/** Identificador estável da marca (`^[a-z0-9-]+$`): sem acento, minúsculo, hífen no lugar de tudo que não é letra ou número. */
export function chaveDaMarca(marca: string | null): string | null {
  if (marca === null) return null;
  const chave = marca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return chave === '' ? null : chave;
}

export async function gravarProduto(db: Db, tenantId: string, p: ProdutoNormalizado): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO products (tenant_id, gtin, chave_hash, familia_chave, marca, marca_chave, nome, categoria, quantidade, unidade, advertencias)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[])
     ON CONFLICT (tenant_id, chave_hash)
     DO UPDATE SET nome = EXCLUDED.nome, categoria = EXCLUDED.categoria, marca = EXCLUDED.marca,
                   marca_chave = EXCLUDED.marca_chave, advertencias = EXCLUDED.advertencias
     RETURNING id`,
    [tenantId, p.gtin, p.chaveHash, p.familiaChave, p.marca, chaveDaMarca(p.marca), p.nome, p.categoria, p.embalagem.quantidade, p.embalagem.unidade, p.advertencias],
  );
  return r.rows[0]!.id;
}

export async function gravarOferta(
  db: Db,
  ids: { tenantId: string; productId: string; storeId: string; sourceId: string },
  o: OfertaBruta,
  precoPorUnidade: number,
  agora: Date,
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos,
                         preco_por_unidade_centavos, condicao, frete_centavos, frete_status, disponivel,
                         valida_de, valida_ate, link, link_afiliado, coletada_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (tenant_id, source_id, id_externo) DO UPDATE SET
       product_id = EXCLUDED.product_id, store_id = EXCLUDED.store_id, preco_centavos = EXCLUDED.preco_centavos,
       preco_por_unidade_centavos = EXCLUDED.preco_por_unidade_centavos, condicao = EXCLUDED.condicao,
       frete_centavos = EXCLUDED.frete_centavos, frete_status = EXCLUDED.frete_status,
       disponivel = EXCLUDED.disponivel, valida_de = EXCLUDED.valida_de, valida_ate = EXCLUDED.valida_ate,
       link = EXCLUDED.link, link_afiliado = EXCLUDED.link_afiliado, coletada_em = EXCLUDED.coletada_em,
       -- Oferta escondida por denúncia volta quando o preço muda: é outra promoção (a contagem de denúncias é por alerta).
       escondida_em = CASE WHEN offers.preco_centavos <> EXCLUDED.preco_centavos THEN NULL ELSE offers.escondida_em END
     RETURNING id`,
    [
      ids.tenantId, ids.productId, ids.storeId, ids.sourceId, o.idExterno, o.precoCentavos, precoPorUnidade,
      o.condicao === null ? null : JSON.stringify(o.condicao),
      o.frete.status === 'conhecido' ? o.frete.centavos : null, o.frete.status, o.disponivel,
      o.validaDe, o.validaAte, o.link, o.linkAfiliado, agora,
    ],
  );
  return r.rows[0]!.id;
}

/** Última linha de histórico do produto na loja, para a regra de gravação da P1. */
export async function ultimoPreco(
  db: Db,
  tenantId: string,
  productId: string,
  storeId: string,
): Promise<{ observadoEm: Date; precoCentavos: number } | null> {
  const r = await db.query(
    `SELECT observado_em, preco_centavos FROM price_history
      WHERE tenant_id = $1 AND product_id = $2 AND store_id = $3
      ORDER BY observado_em DESC LIMIT 1`,
    [tenantId, productId, storeId],
  );
  return r.rowCount === 0 ? null : { observadoEm: r.rows[0].observado_em, precoCentavos: r.rows[0].preco_centavos };
}

export async function inserirHistorico(
  db: Db,
  ids: { tenantId: string; productId: string; storeId: string },
  precoCentavos: number,
  precoPorUnidade: number,
  agora: Date,
): Promise<void> {
  await db.query(
    `INSERT INTO price_history (tenant_id, product_id, store_id, preco_centavos, preco_por_unidade_centavos, observado_em)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ids.tenantId, ids.productId, ids.storeId, precoCentavos, precoPorUnidade, agora],
  );
}

/** Histórico da família (todas as embalagens da mesma unidade) na loja, a partir de um instante. */
export async function historicoDaFamilia(
  db: Db,
  q: { tenantId: string; storeId: string; familiaChave: string; unidade: string; desde: Date },
): Promise<LinhaHistorico[]> {
  const r = await db.query(
    `SELECT ph.observado_em, ph.preco_por_unidade_centavos
       FROM price_history ph
       JOIN products p ON p.tenant_id = ph.tenant_id AND p.id = ph.product_id
      WHERE ph.tenant_id = $1 AND ph.store_id = $2 AND p.familia_chave = $3 AND p.unidade = $4
        AND ph.observado_em > $5
      ORDER BY ph.observado_em`,
    [q.tenantId, q.storeId, q.familiaChave, q.unidade, q.desde],
  );
  return r.rows.map((l) => ({ observadoEm: l.observado_em, precoPorUnidade: Number(l.preco_por_unidade_centavos) }));
}

export async function registrarAvaliacao(
  db: Db,
  tenantId: string,
  offerId: string,
  decisao: string,
  motivo: string,
  agora: Date,
): Promise<void> {
  await db.query(
    `UPDATE offers SET ultima_decisao = $3, ultimo_motivo = $4, avaliada_em = $5 WHERE tenant_id = $1 AND id = $2`,
    [tenantId, offerId, decisao, motivo, agora],
  );
}

/** Serializa a deduplicação por (tenant, família, loja) até o fim da transação. */
export async function travarChaveDeduplicacao(
  db: Db,
  tenantId: string,
  familiaChave: string,
  storeId: string,
): Promise<void> {
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${tenantId}|${familiaChave}|${storeId}`]);
}

export async function ultimoAlerta(
  db: Db,
  tenantId: string,
  familiaChave: string,
  storeId: string,
): Promise<UltimoAlerta | null> {
  const r = await db.query(
    `SELECT decisao, criado_em, preco_efetivo_por_unidade, preco_referencia_por_unidade, valida_ate
       FROM alerts WHERE tenant_id = $1 AND familia_chave = $2 AND store_id = $3
      ORDER BY criado_em DESC LIMIT 1`,
    [tenantId, familiaChave, storeId],
  );
  if (r.rowCount === 0) return null;
  const a = r.rows[0];
  return {
    decisao: a.decisao,
    criadoEm: a.criado_em,
    precoEfetivoPorUnidade: Number(a.preco_efetivo_por_unidade),
    precoReferenciaPorUnidade: Number(a.preco_referencia_por_unidade),
    validaAte: a.valida_ate,
  };
}

export interface NovoAlerta {
  tenantId: string;
  offerId: string;
  storeId: string;
  familiaChave: string;
  score: number;
  decisao: string;
  motivo: string;
  precoCentavos: number;
  precoEfetivoPorUnidade: number;
  precoReferenciaPorUnidade: number;
  validaAte: Date | null;
  rotuloCondicao: string | null;
  entregaAConfirmar: boolean;
  criadoEm: Date;
  /** O que o motor mediu antes de avisar; `null` quando não há observação medida. */
  prova: Prova | null;
}

export async function inserirAlerta(db: Db, a: NovoAlerta): Promise<void> {
  await db.query(
    `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos,
                         preco_efetivo_por_unidade, preco_referencia_por_unidade, valida_ate, rotulo_condicao,
                         entrega_a_confirmar, criado_em, prova_menor_centavos, prova_maior_centavos, prova_dias)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      a.tenantId, a.offerId, a.storeId, a.familiaChave, a.score, a.decisao, a.motivo, a.precoCentavos,
      a.precoEfetivoPorUnidade, a.precoReferenciaPorUnidade, a.validaAte, a.rotuloCondicao, a.entregaAConfirmar,
      a.criadoEm, a.prova?.menorPrecoCentavos ?? null, a.prova?.maiorPrecoCentavos ?? null, a.prova?.diasMedidos ?? null,
    ],
  );
}

/** Preços (da embalagem, não por unidade) observados para o produto na loja desde `desde`, para a prova do alerta. */
export async function precosDaEmbalagem(db: Db, tenantId: string, productId: string, storeId: string, desde: Date): Promise<LinhaPreco[]> {
  const r = await db.query(
    `SELECT observado_em, preco_centavos FROM price_history
      WHERE tenant_id = $1 AND product_id = $2 AND store_id = $3 AND observado_em >= $4 ORDER BY observado_em`,
    [tenantId, productId, storeId, desde],
  );
  return r.rows.map((l) => ({ observadoEm: l.observado_em, precoCentavos: Number(l.preco_centavos) }));
}

/** Fontes ativas e não bloqueadas do tenant, para a coleta de todas. */
export async function listarFontesAtivas(db: Db, tenantId: string): Promise<string[]> {
  const r = await db.query<{ nome: string }>(
    `SELECT nome FROM sources WHERE tenant_id = $1 AND ativa AND status_confianca <> 'bloqueada' ORDER BY nome`,
    [tenantId],
  );
  return r.rows.map((l) => l.nome);
}

export interface CredencialGravada {
  chaveVersao: string;
  iv: Buffer;
  textoCifrado: Buffer;
  tag: Buffer;
  atualizadaEm: Date;
}

export async function gravarCredencialCifrada(
  db: Db,
  tenantId: string,
  sourceId: string,
  c: Omit<CredencialGravada, 'atualizadaEm'>,
  operadorId: string | null,
): Promise<void> {
  await db.query(
    `INSERT INTO source_credentials (tenant_id, source_id, chave_versao, iv, texto_cifrado, tag, atualizada_em, atualizada_por)
          VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
     ON CONFLICT (tenant_id, source_id) DO UPDATE
       SET chave_versao = EXCLUDED.chave_versao, iv = EXCLUDED.iv, texto_cifrado = EXCLUDED.texto_cifrado,
           tag = EXCLUDED.tag, atualizada_em = now(), atualizada_por = EXCLUDED.atualizada_por`,
    [tenantId, sourceId, c.chaveVersao, c.iv, c.textoCifrado, c.tag, operadorId],
  );
}

export async function lerCredencialCifrada(db: Db, tenantId: string, sourceId: string): Promise<CredencialGravada | null> {
  const r = await db.query(
    `SELECT chave_versao, iv, texto_cifrado, tag, atualizada_em FROM source_credentials WHERE tenant_id = $1 AND source_id = $2`,
    [tenantId, sourceId],
  );
  if (r.rowCount !== 1) return null;
  const l = r.rows[0];
  return { chaveVersao: l.chave_versao, iv: l.iv, textoCifrado: l.texto_cifrado, tag: l.tag, atualizadaEm: l.atualizada_em };
}

