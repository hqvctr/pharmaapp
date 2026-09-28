// Configuração pública do tenant, feed e detalhe de oferta.
import { agregarPorDia, diaLocal } from '../../avaliador/historico.js';
import { precoEfetivoPorUnidade, rotuloCondicao } from '../../curadoria/preco.js';
import { historicoDaFamilia } from '../../pipeline/repositorio.js';
import type { ConfigTenant } from '../../shared/tenantConfig.js';
import { ROTULOS_TAMANHO_FRALDA, TAMANHOS_FRALDA } from '../../normalizador/fralda.js';
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import { DIA_MS, iso, sessaoDe, type Handler } from './contexto.js';

export const obterConfiguracao: Handler = async (req) => {
  const app = req.tenant.config.app;
  return {
    nome: app.nome,
    documentos: app.documentos,
    categorias: Object.entries(app.rotulosCategorias).map(([id, nome]) => ({ id, nome })),
    regiao: { nome: app.regiao.nome },
    planos: app.planos,
    limiteDiarioMaximo: app.limiteDiarioMaximo,
    tamanhosFralda: TAMANHOS_FRALDA.map((id) => ({ id, nome: ROTULOS_TAMANHO_FRALDA[id] })),
    login: { email: true, google: app.auth.googleClientIds.length > 0 },
  };
};

/** Preços da oferta como o app mostra: por embalagem e por unidade de medida. */
export function visaoOferta(l: repo.LinhaOferta, config: ConfigTenant): Record<string, unknown> {
  const { quantidade, unidade } = l.produto;
  const efetivoPorUnidade = precoEfetivoPorUnidade(l.precoCentavos, { quantidade, unidade }, l.condicao);
  const referencia = l.alerta.referenciaPorUnidade;
  return {
    ofertaId: l.ofertaId,
    produto: {
      nome: l.produto.nome,
      marca: l.produto.marca,
      categoria: l.produto.categoria,
      embalagem: { quantidade, unidade },
      tamanhoFralda: l.produto.tamanhoFralda,
    },
    loja: l.loja,
    precoCentavos: l.precoCentavos,
    precoEfetivoCentavos: Math.round(efetivoPorUnidade * quantidade),
    precoReferenciaCentavos: Math.round(referencia * quantidade),
    queda: Math.round((1 - efetivoPorUnidade / referencia) * 10_000) / 10_000,
    precoPorUnidade: { centavos: Math.round(efetivoPorUnidade * 100) / 100, unidade },
    condicao: rotuloCondicao(l.condicao),
    frete: { status: l.freteStatus, centavos: l.freteCentavos },
    validaAte: iso(l.validaAte),
    decisao: l.alerta.decisao,
    score: l.alerta.score,
    avisos: config.nbcal.categoriasComAviso.includes(l.produto.categoria) ? [config.nbcal.aviso] : [],
    imagemUrl: l.imagemUrl,
    linkAfiliado: l.linkAfiliado,
    alertadaEm: l.alerta.criadoEm.toISOString(),
    coletadaEm: l.coletadaEm.toISOString(),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export function codificarCursor(l: repo.LinhaOferta): string {
  return Buffer.from(JSON.stringify([l.alerta.cursor, l.alerta.id])).toString('base64url');
}

export function decodificarCursor(cursor: string): { alertadaEm: string; alertaId: string } {
  try {
    const v = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(v) && v.length === 2 && INSTANTE.test(v[0]) && UUID.test(v[1])) return { alertadaEm: v[0], alertaId: v[1] };
  } catch {
    // cai no erro abaixo
  }
  throw new ErroApi(400, 'CURSOR_INVALIDO', 'Cursor inválido; recomece da primeira página.');
}

export const listarFeed: Handler = async (req, _reply, deps) => {
  const { tenant } = req;
  const app = tenant.config.app;
  const { usuario } = sessaoDe(req);
  const q = req.query as { cep?: string; categoria?: string; cursor?: string; limite?: number };

  const prefs = await repo.obterPreferencias(deps.db, tenant.id, usuario.id);
  // Categoria removida da config do tenant deixa de valer; CEP além do plano (premium vencido) também.
  let categorias = (prefs?.categorias ?? []).filter((c) => app.rotulosCategorias[c] !== undefined);
  let ceps = (prefs?.ceps ?? []).slice(0, app.planos[usuario.premium ? 'premium' : 'gratuito'].maxCeps);
  if (categorias.length === 0 || ceps.length === 0) {
    throw new ErroApi(409, 'PREFERENCIAS_INCOMPLETAS', 'Escolha ao menos uma categoria e um CEP.');
  }
  if (q.cep !== undefined) {
    if (!ceps.includes(q.cep)) throw new ErroApi(422, 'CEP_NAO_CADASTRADO', 'O CEP não está nas preferências.');
    ceps = [q.cep];
  }
  if (q.categoria !== undefined) {
    if (!categorias.includes(q.categoria)) throw new ErroApi(422, 'CATEGORIA_NAO_ESCOLHIDA', 'A categoria não está nas preferências.');
    categorias = [q.categoria];
  }
  const limite = Math.min(q.limite ?? app.feed.tamanhoPaginaPadrao, app.feed.tamanhoPaginaMaximo);

  const linhas = await repo.listarFeed(deps.db, {
    tenantId: tenant.id,
    agora: deps.agora(),
    idadeMaximaHoras: app.feed.idadeMaximaColetaHoras,
    categorias,
    ceps,
    tamanhosFralda: prefs?.tamanhosFralda ?? [],
    depoisDe: q.cursor === undefined ? null : decodificarCursor(q.cursor),
    limite: limite + 1,
  });
  const pagina = linhas.slice(0, limite);
  return {
    itens: pagina.map((l) => ({ ...visaoOferta(l, tenant.config), prazoEntregaDias: l.prazoEntregaDias })),
    proximoCursor: linhas.length > limite ? codificarCursor(pagina[pagina.length - 1]!) : null,
  };
};

export const obterOferta: Handler = async (req, _reply, deps) => {
  const { tenant } = req;
  const agora = deps.agora();
  const { id } = req.params as { id: string };
  const l = await repo.buscarOferta(deps.db, tenant.id, agora, tenant.config.app.feed.idadeMaximaColetaHoras, id);
  if (l === null) throw new ErroApi(404, 'OFERTA_NAO_ENCONTRADA', 'Oferta não encontrada.');

  const { fuso, curadoria } = tenant.config;
  const linhas = await historicoDaFamilia(deps.db, {
    tenantId: tenant.id,
    storeId: l.loja.id,
    familiaChave: l.produto.familiaChave,
    unidade: l.produto.unidade,
    desde: new Date(agora.getTime() - curadoria.janelaPisoDias * DIA_MS),
  });
  const historico = agregarPorDia(linhas, l.produto.unidade, agora, fuso).map((o) => ({
    dia: diaLocal(o.observadoEm, fuso),
    precoEquivalenteCentavos: Math.round(o.precoCentavos * l.produto.quantidade),
  }));
  return { ...visaoOferta(l, tenant.config), ativa: l.ativa, link: l.ativa ? l.link : null, historico };
};
