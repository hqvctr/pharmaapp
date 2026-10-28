// Alertas de DEMONSTRAÇÃO para testar o app antes de haver histórico de preços (o motor só avisa depois de 14 dias).
// Usa ofertas REAIS já coletadas, mas o "preço de antes" e a queda são inventados: cada alerta sai marcado "DEMONSTRAÇÃO" no app
// e com motivo "DEMO:" no banco. Só para teste no computador do responsável; `--remover` apaga tudo que foi criado.
//   node dist/pipeline/demo.js --tenant padrao --criar [--quantidade 8]
//   node dist/pipeline/demo.js --tenant padrao --remover
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { travasDeMarca } from '../api/ofertas.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';
import * as repo from './repositorio.js';

export const ROTULO_DEMO = 'DEMONSTRAÇÃO';
export const PREFIXO_MOTIVO = 'DEMO:';
const QUEDAS = [0.35, 0.28, 0.22, 0.31, 0.19, 0.4, 0.25, 0.3];

export interface ResumoDemo {
  criados: number;
  semOfertaElegivel: boolean;
}

/** Cria até `quantidade` alertas de demonstração em ofertas coletadas há pouco, no feed de quem tem CEP na área da loja. */
export async function criarDemonstracao(db: repo.Db, tenantId: string, config: ConfigTenant, agora: Date, quantidade = 8): Promise<ResumoDemo> {
  const coletaMinima = new Date(agora.getTime() - config.app.feed.coletaMaximaHoras * 3600_000);
  const { fontes, marcas } = travasDeMarca(config);
  // Uma oferta por família de produto, só do que o feed mostraria de verdade (categoria do app, sem advertência, marca liberada).
  const r = await db.query(
    `SELECT DISTINCT ON (p.familia_chave) o.id AS offer_id, o.store_id, o.preco_centavos, o.preco_por_unidade_centavos, o.valida_ate, p.familia_chave, p.categoria
       FROM offers o
       JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
       JOIN sources src ON src.tenant_id = o.tenant_id AND src.id = o.source_id
       LEFT JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
      WHERE o.tenant_id = $1 AND o.disponivel AND (o.valida_ate IS NULL OR o.valida_ate > $2) AND o.escondida_em IS NULL AND o.coletada_em >= $3
        AND p.categoria = ANY($4::text[]) AND cardinality(p.advertencias) = 0
        AND (NOT (src.nome = ANY($5::text[])) OR ref.id_externo = ANY($6::text[]))
        AND EXISTS (SELECT 1 FROM store_service_areas sa WHERE sa.tenant_id = o.tenant_id AND sa.store_id = o.store_id)
        AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.tenant_id = o.tenant_id AND a.offer_id = o.id AND a.preco_centavos = o.preco_centavos)
      ORDER BY p.familia_chave, o.preco_por_unidade_centavos
      LIMIT 400`,
    [tenantId, agora, coletaMinima, config.app.categorias.map((c) => c.slug), fontes, marcas],
  );
  // Reparte entre as categorias (uma de cada vez), para o feed mostrar variedade.
  const porCategoria = new Map<string, any[]>();
  for (const l of r.rows) porCategoria.set(l.categoria, [...(porCategoria.get(l.categoria) ?? []), l]);
  const escolhidas: any[] = [];
  for (let i = 0; escolhidas.length < quantidade; i += 1) {
    let achou = false;
    for (const lista of porCategoria.values()) {
      if (lista[i] !== undefined && escolhidas.length < quantidade) { escolhidas.push(lista[i]); achou = true; }
    }
    if (!achou) break;
  }
  let n = 0;
  for (const o of escolhidas) {
    const queda = QUEDAS[n % QUEDAS.length]!;
    const efetivo = Number(o.preco_por_unidade_centavos);
    const preco = o.preco_centavos as number;
    await repo.inserirAlerta(db, {
      tenantId, offerId: o.offer_id, storeId: o.store_id, familiaChave: o.familia_chave, score: 80,
      decisao: n < 2 ? 'notificar' : 'somente_feed',
      motivo: `${PREFIXO_MOTIVO} alerta de demonstração (preço de referência e queda inventados); apague com --remover`,
      precoCentavos: preco, precoEfetivoPorUnidade: efetivo, precoReferenciaPorUnidade: efetivo / (1 - queda),
      validaAte: o.valida_ate, rotuloCondicao: ROTULO_DEMO, entregaAConfirmar: false, criadoEm: new Date(agora.getTime() - n * 60_000),
      prova: { menorPrecoCentavos: Math.max(1, Math.round(preco * 1.05)), maiorPrecoCentavos: Math.round(preco / (1 - queda)), diasMedidos: 3 },
    });
    n += 1;
  }
  return { criados: n, semOfertaElegivel: r.rowCount === 0 };
}

/** Apaga os alertas de demonstração e tudo que dependia deles (eventos, avaliações, denúncias, avisos). Devolve quantos alertas saíram. */
export async function removerDemonstracao(db: repo.Db, tenantId: string): Promise<number> {
  const ids = `SELECT id FROM alerts WHERE tenant_id = $1 AND motivo LIKE $2`;
  const args = [tenantId, `${PREFIXO_MOTIVO}%`];
  await db.query(`DELETE FROM alert_events WHERE tenant_id = $1 AND alert_id IN (${ids})`, args);
  await db.query(`DELETE FROM avaliacoes WHERE tenant_id = $1 AND alert_id IN (${ids})`, args);
  await db.query(`DELETE FROM denuncias WHERE tenant_id = $1 AND alert_id IN (${ids})`, args);
  await db.query(`DELETE FROM casos_denuncia WHERE tenant_id = $1 AND alert_id IN (${ids})`, args);
  await db.query(`UPDATE avisos SET alert_id = NULL WHERE tenant_id = $1 AND alert_id IN (${ids})`, args);
  const r = await db.query(`DELETE FROM alerts WHERE tenant_id = $1 AND motivo LIKE $2`, args);
  return r.rowCount ?? 0;
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tenant: { type: 'string' }, criar: { type: 'boolean' }, remover: { type: 'boolean' }, quantidade: { type: 'string' } } });
  if (!values.tenant || values.criar === values.remover) throw new Error('Uso: --tenant <slug> (--criar [--quantidade N] | --remover)');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const tenantId = await repo.buscarTenant(pool, values.tenant);
    if (values.remover) {
      console.log(`Alertas de demonstração removidos: ${await removerDemonstracao(pool, tenantId)}.`);
      return;
    }
    const quantidade = values.quantidade === undefined ? 8 : Number(values.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 30) throw new Error('--quantidade vai de 1 a 30');
    const config = await carregarConfigTenant(values.tenant);
    const r = await criarDemonstracao(pool, tenantId, config, new Date(), quantidade);
    if (r.criados === 0) {
      console.log(
        r.semOfertaElegivel
          ? 'Nenhuma oferta coletada nas últimas horas serve para a demonstração. Confira se o coletor está rodando (status.bat) e tente de novo mais tarde.'
          : 'Nenhum alerta novo: as ofertas elegíveis já têm alerta.',
      );
      process.exitCode = 1;
    } else console.log(`Alertas de demonstração criados: ${r.criados}. Abra o app e atualize a aba Promoções. Para apagar: demo-feed-remover.bat.`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
