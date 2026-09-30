// Um ciclo de coleta: fonte → normalizador → histórico → motor → deduplicação → alerta.
// Cada oferta é processada na sua própria transação; uma oferta com erro não derruba as outras.
import type pg from 'pg';
import { avaliarOferta } from '../curadoria/motor.js';
import type { Decisao } from '../curadoria/tipos.js';
import { deduplicar } from '../avaliador/deduplicacao.js';
import { agregarPorDia, diaLocal } from '../avaliador/historico.js';
import type { SourceAdapter } from '../fontes/contrato.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { normalizarOferta, type ProdutoNormalizado } from '../normalizador/normalizar.js';
import { precoPorUnidade } from '../curadoria/preco.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';
import * as repo from './repositorio.js';

const DIA_MS = 86_400_000;

export interface ResumoColeta {
  coletadas: number;
  ilegiveis: number;
  bloqueadas: number;
  categoriaIgnorada: number;
  lojaNaoAprovada: number;
  erros: number;
  decisoes: Record<Decisao, number>;
  alertasCriados: number;
  alertasSuprimidos: number;
  /** Ofertas que sumiram da fonte nesta coleta; null se a coleta veio incompleta. */
  encerradas: number | null;
}

export interface ContextoColeta {
  pool: pg.Pool;
  tenantId: string;
  fonte: repo.FonteRegistrada;
  lojas: Map<string, repo.LojaAprovada>;
  adapter: SourceAdapter;
  config: ConfigTenant;
  mapaCategorias: Record<string, string>;
  listas: ListasMedicamentos;
  agora: Date;
  log: (msg: string) => void;
}

export async function executarColeta(ctx: ContextoColeta): Promise<ResumoColeta> {
  const resumo: ResumoColeta = {
    coletadas: 0,
    ilegiveis: 0,
    bloqueadas: 0,
    categoriaIgnorada: 0,
    lojaNaoAprovada: 0,
    erros: 0,
    decisoes: { notificar: 0, aguardar_aprovacao: 0, somente_feed: 0, descartar: 0 },
    alertasCriados: 0,
    alertasSuprimidos: 0,
    encerradas: null,
  };
  if (!ctx.fonte.ativa || ctx.fonte.statusConfianca === 'bloqueada') {
    throw new Error('Fonte inativa ou bloqueada; coleta não executada');
  }

  const coleta = await ctx.adapter.coletar();
  resumo.coletadas = coleta.ofertas.length;
  resumo.ilegiveis = coleta.ilegiveis.length;
  for (const i of coleta.ilegiveis) ctx.log(`ilegível: ${i.referencia}: ${i.erro}`);

  for (const bruta of coleta.ofertas) {
    const norm = normalizarOferta(bruta, ctx.listas, {
      mapaCategorias: ctx.mapaCategorias,
      categoriaMedicamentos: ctx.config.medicamentos.categoria,
      exibirMedicamentos: ctx.config.medicamentos.exibir,
      termosNbcal: ctx.config.nbcal.termosVedados,
    });
    if (norm.tipo === 'bloqueado') {
      resumo.bloqueadas++;
      await repo.registrarBloqueio(ctx.pool, ctx.tenantId, ctx.fonte.id, bruta, norm, ctx.agora);
      continue;
    }
    if (norm.tipo === 'categoria_ignorada') {
      resumo.categoriaIgnorada++;
      continue;
    }
    const loja = ctx.lojas.get(bruta.lojaIdExterno);
    if (loja === undefined) {
      resumo.lojaNaoAprovada++;
      continue;
    }

    const client = await ctx.pool.connect();
    try {
      await client.query('BEGIN');
      await processarOferta(client, ctx, norm.produto, bruta, loja, resumo);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      resumo.erros++;
      ctx.log(`erro na oferta ${bruta.idExterno}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
  if (coleta.completa) {
    resumo.encerradas = await repo.marcarAusentesIndisponiveis(
      ctx.pool,
      ctx.tenantId,
      ctx.fonte.id,
      coleta.ofertas.map((o) => o.idExterno),
    );
  }
  return resumo;
}

async function processarOferta(
  db: pg.ClientBase,
  ctx: ContextoColeta,
  produto: ProdutoNormalizado,
  bruta: Parameters<typeof normalizarOferta>[0],
  loja: repo.LojaAprovada,
  resumo: ResumoColeta,
): Promise<void> {
  const { tenantId, agora } = ctx;
  const productId = await repo.gravarProduto(db, tenantId, produto);
  const porUnidade = precoPorUnidade(bruta.precoCentavos, produto.embalagem);
  const offerId = await repo.gravarOferta(
    db,
    { tenantId, productId, storeId: loja.storeId, sourceId: ctx.fonte.id },
    bruta,
    porUnidade,
    agora,
  );

  // P1: grava a primeira observação do dia e toda mudança de preço.
  const ids = { tenantId, productId, storeId: loja.storeId };
  const ultimo = await repo.ultimoPreco(db, tenantId, productId, loja.storeId);
  if (
    ultimo === null ||
    ultimo.precoCentavos !== bruta.precoCentavos ||
    diaLocal(ultimo.observadoEm, ctx.config.fuso) !== diaLocal(agora, ctx.config.fuso)
  ) {
    await repo.inserirHistorico(db, ids, bruta.precoCentavos, porUnidade, agora);
  }

  const linhas = await repo.historicoDaFamilia(db, {
    tenantId,
    storeId: loja.storeId,
    familiaChave: produto.familiaChave,
    unidade: produto.embalagem.unidade,
    desde: new Date(agora.getTime() - (ctx.config.curadoria.janelaPisoDias + 1) * DIA_MS),
  });
  const resultado = avaliarOferta(
    {
      oferta: {
        categoria: produto.categoria,
        precoCentavos: bruta.precoCentavos,
        embalagem: produto.embalagem,
        condicao: bruta.condicao,
        frete: bruta.frete,
        disponivel: bruta.disponivel,
        validaDe: bruta.validaDe,
        validaAte: bruta.validaAte,
        observadaEm: agora,
      },
      historico: agregarPorDia(linhas, produto.embalagem.unidade, agora, ctx.config.fuso),
      loja: { status: loja.status, reputacao: loja.reputacao },
      fonte: { confiabilidade: ctx.fonte.confiabilidade },
    },
    ctx.config.curadoria,
    agora,
  );

  let decisao = resultado.decisao;
  let motivo = resultado.motivo;
  // Decisão de lançamento: medicamento aparece no feed e não gera push até validação jurídica.
  if (produto.ehMedicamento && !ctx.config.medicamentos.notificar && (decisao === 'notificar' || decisao === 'aguardar_aprovacao')) {
    decisao = 'somente_feed';
    motivo = `Medicamento: somente feed até validação jurídica (RDC 96/2008). ${motivo}`;
  }
  resumo.decisoes[decisao]++;
  await repo.registrarAvaliacao(db, tenantId, offerId, decisao, motivo, agora);
  if (decisao === 'descartar') return;

  await repo.travarChaveDeduplicacao(db, tenantId, produto.familiaChave, loja.storeId);
  const anterior = await repo.ultimoAlerta(db, tenantId, produto.familiaChave, loja.storeId);
  const depois =
    anterior === null
      ? []
      : (
          await repo.historicoDaFamilia(db, {
            tenantId,
            storeId: loja.storeId,
            familiaChave: produto.familiaChave,
            unidade: produto.embalagem.unidade,
            desde: anterior.criadoEm,
          })
        ).map((l) => l.precoPorUnidade);
  const dedup = deduplicar(
    { decisao, precoEfetivoPorUnidade: resultado.metricas.precoEfetivoPorUnidade },
    anterior,
    depois,
    agora,
    ctx.config.deduplicacao,
  );
  if (!dedup.gerarAlerta) {
    resumo.alertasSuprimidos++;
    return;
  }
  await repo.inserirAlerta(db, {
    tenantId,
    offerId,
    storeId: loja.storeId,
    familiaChave: produto.familiaChave,
    score: resultado.score!,
    decisao,
    motivo: `${motivo} Deduplicação: ${dedup.motivo}.`,
    precoCentavos: bruta.precoCentavos,
    precoEfetivoPorUnidade: resultado.metricas.precoEfetivoPorUnidade,
    precoReferenciaPorUnidade: resultado.metricas.precoReferenciaPorUnidade!,
    validaAte: bruta.validaAte,
    rotuloCondicao: resultado.rotuloCondicao,
    entregaAConfirmar: resultado.entregaAConfirmar,
    criadoEm: agora,
  });
  resumo.alertasCriados++;
}
