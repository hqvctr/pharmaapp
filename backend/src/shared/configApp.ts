// Bloco `app` do tenant: o que o app lê em GET /v1/configuracao e os limites de taxa da API.
import type { ConfigCuradoria } from '../curadoria/config.js';

export interface DocumentoLegalConfig {
  versao: string;
  /** Caminho no site do tenant (`urlSite` + caminho). */
  caminho: string;
}

export interface ConfigApp {
  nomeApp: string;
  urlSite: string;
  termos: DocumentoLegalConfig;
  privacidade: DocumentoLegalConfig;
  versaoMinima: { android: string | null; ios: string | null };
  metodosLogin: Array<'email' | 'google' | 'apple'>;
  /** Login com Google: IDs de cliente OAuth aceitos como audiência (públicos). Vazio = o método não é oferecido. */
  google: { clientIds: string[] };
  categorias: Array<{ slug: string; rotulo: string }>;
  regiao: { cepInicio: string; cepFim: string };
  limites: {
    cepsGratuito: number;
    cepsPremium: number;
    maxProdutosSeguidos: number;
    maxSilenciamentos: number;
    quedaPercentualMin: number;
    quedaPercentualMax: number;
    limiteDiarioPadrao: number;
  };
  planos: Array<{ plano: string; loja: string; produtoLojaId: string }>;
  feed: { coletaMaximaHoras: number };
  /** Regra de denúncia (PRODUTO.md): limite = max(minimo, ceil(percentual × pessoas que abriram ou clicaram nos últimos `janelaDias`)). */
  denuncia: { minimo: number; percentual: number; janelaDias: number };
  limitesTaxa: Record<string, { maximo: number; janelaSegundos: number }>;
}

const METODOS = ['email', 'google', 'apple'] as const;
const SEMVER = /^\d+\.\d+\.\d+$/;
const CEP = /^\d{8}$/;

function inv(campo: string): never {
  throw new Error(`Config inválida: app.${campo}`);
}

function texto(v: unknown, campo: string): string {
  if (typeof v !== 'string' || v.trim() === '') inv(campo);
  return v as string;
}

function inteiro(v: unknown, campo: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max) inv(campo);
  return v as number;
}

function documento(v: any, campo: string): DocumentoLegalConfig {
  const caminho = texto(v?.caminho, `${campo}.caminho`);
  if (!caminho.startsWith('/')) inv(`${campo}.caminho`);
  return { versao: texto(v?.versao, `${campo}.versao`), caminho };
}

function versaoMinima(v: unknown, campo: string): string | null {
  if (v === null) return null;
  if (typeof v !== 'string' || !SEMVER.test(v)) inv(campo);
  return v as string;
}

export function validarConfigApp(bruto: any, curadoria: ConfigCuradoria, categoriaMedicamento: string): ConfigApp {
  if (bruto === null || typeof bruto !== 'object') inv('(bloco ausente)');
  const urlSite = texto(bruto.urlSite, 'urlSite');
  if (!/^https:\/\/[^/\s]+(\/[^\s]*)?$/.test(urlSite) || urlSite.endsWith('/')) inv('urlSite (https, sem barra no fim)');

  const metodos = bruto.metodosLogin;
  if (!Array.isArray(metodos) || metodos.length === 0 || metodos.some((m: unknown) => !METODOS.includes(m as never))) {
    inv('metodosLogin');
  }
  if (new Set(metodos).size !== metodos.length) inv('metodosLogin (repetido)');

  const clientIds = bruto.google?.clientIds ?? [];
  if (!Array.isArray(clientIds) || clientIds.length > 5 || new Set(clientIds).size !== clientIds.length) inv('google.clientIds');
  for (const [i, id] of (clientIds as unknown[]).entries()) {
    if (typeof id !== 'string' || !/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(id)) inv(`google.clientIds[${i}]`);
  }

  if (!Array.isArray(bruto.categorias) || bruto.categorias.length === 0) inv('categorias');
  const vistos = new Set<string>();
  const categorias = (bruto.categorias as any[]).map((c, i) => {
    const slug = texto(c?.slug, `categorias[${i}].slug`);
    if (!/^[a-z0-9_]+$/.test(slug) || vistos.has(slug)) inv(`categorias[${i}].slug`);
    vistos.add(slug);
    // Categoria que o motor desconhece nunca geraria alerta; medicamento está fora do app (decisão 58).
    if (curadoria.categorias[slug] === undefined) inv(`categorias[${i}].slug (não existe em curadoria)`);
    if (slug === categoriaMedicamento) inv(`categorias[${i}].slug (medicamento fica fora do app)`);
    return { slug, rotulo: texto(c?.rotulo, `categorias[${i}].rotulo`) };
  });

  const r = bruto.regiao;
  if (!CEP.test(r?.cepInicio ?? '') || !CEP.test(r?.cepFim ?? '') || r.cepInicio > r.cepFim) inv('regiao');

  const l = bruto.limites ?? {};
  const limites = {
    cepsGratuito: inteiro(l.cepsGratuito, 'limites.cepsGratuito', 1),
    cepsPremium: inteiro(l.cepsPremium, 'limites.cepsPremium', 1, 3),
    maxProdutosSeguidos: inteiro(l.maxProdutosSeguidos, 'limites.maxProdutosSeguidos', 1),
    maxSilenciamentos: inteiro(l.maxSilenciamentos, 'limites.maxSilenciamentos', 1),
    quedaPercentualMin: inteiro(l.quedaPercentualMin, 'limites.quedaPercentualMin', 1, 99),
    quedaPercentualMax: inteiro(l.quedaPercentualMax, 'limites.quedaPercentualMax', 1, 99),
    limiteDiarioPadrao: inteiro(l.limiteDiarioPadrao, 'limites.limiteDiarioPadrao', 1),
  };
  if (limites.cepsGratuito > limites.cepsPremium) inv('limites (cepsGratuito maior que cepsPremium)');
  if (limites.quedaPercentualMin > limites.quedaPercentualMax) inv('limites (queda mínima maior que a máxima)');

  if (!Array.isArray(bruto.planos)) inv('planos');
  const planos = (bruto.planos as any[]).map((p, i) => ({
    plano: texto(p?.plano, `planos[${i}].plano`),
    loja: texto(p?.loja, `planos[${i}].loja`),
    produtoLojaId: texto(p?.produtoLojaId, `planos[${i}].produtoLojaId`),
  }));

  const feed = { coletaMaximaHoras: inteiro(bruto.feed?.coletaMaximaHoras, 'feed.coletaMaximaHoras', 1, 168) };

  const dn = bruto.denuncia ?? {};
  if (typeof dn.percentual !== 'number' || !(dn.percentual > 0 && dn.percentual <= 1)) inv('denuncia.percentual');
  const denuncia = { minimo: inteiro(dn.minimo, 'denuncia.minimo', 1), percentual: dn.percentual as number, janelaDias: inteiro(dn.janelaDias, 'denuncia.janelaDias', 1, 90) };

  const limitesTaxa: ConfigApp['limitesTaxa'] = {};
  for (const [rota, v] of Object.entries((bruto.limitesTaxa ?? {}) as Record<string, any>)) {
    limitesTaxa[rota] = {
      maximo: inteiro(v?.maximo, `limitesTaxa.${rota}.maximo`, 1),
      janelaSegundos: inteiro(v?.janelaSegundos, `limitesTaxa.${rota}.janelaSegundos`, 1),
    };
  }

  return {
    nomeApp: texto(bruto.nomeApp, 'nomeApp'),
    urlSite,
    termos: documento(bruto.termos, 'termos'),
    privacidade: documento(bruto.privacidade, 'privacidade'),
    versaoMinima: {
      android: versaoMinima(bruto.versaoMinima?.android, 'versaoMinima.android'),
      ios: versaoMinima(bruto.versaoMinima?.ios, 'versaoMinima.ios'),
    },
    metodosLogin: metodos,
    google: { clientIds: clientIds as string[] },
    categorias,
    regiao: { cepInicio: r.cepInicio, cepFim: r.cepFim },
    limites,
    planos,
    feed,
    denuncia,
    limitesTaxa,
  };
}

/** Métodos que o app pode mostrar: o Google só entra com cliente OAuth configurado (senão o botão falharia sempre). */
export function metodosLoginOferecidos(app: ConfigApp): ConfigApp['metodosLogin'] {
  return app.metodosLogin.filter((m) => m !== 'google' || app.google.clientIds.length > 0);
}
