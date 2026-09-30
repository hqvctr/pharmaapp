// Carrega config/tenants/<slug>.json. Todo valor de negócio vem daqui.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validarConfigCobertura,
  validarConfigCuradoria,
  type ConfigCobertura,
  type ConfigCuradoria,
} from '../curadoria/config.js';
import type { ConfigDeduplicacao } from '../avaliador/deduplicacao.js';
import { normalizarTexto } from '../normalizador/medicamentos.js';

export const DIR_CONFIG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config');

export interface ConfigFonteLomadee {
  baseUrl: string;
  tamanhoPagina: number;
  maxPaginas: number;
  mapaCategorias: Record<string, string>;
}

export interface FaixaCepRegiao {
  inicio: string;
  fim: string;
}

/** Bloco "app": tudo que a API expõe ao aplicativo ou usa para validar o que ele envia. */
export interface DocumentoLegal {
  versao: string;
  /** Null enquanto o texto não estiver publicado (bloqueia a publicação do app; ver BACKLOG). */
  url: string | null;
}

export interface ConfigApp {
  nome: string;
  /** Termos são aceitos pelo usuário; a política de privacidade é informada, com versão. */
  documentos: { termos: DocumentoLegal; privacidade: DocumentoLegal };
  rotulosCategorias: Record<string, string>;
  regiao: { nome: string; faixasCep: FaixaCepRegiao[] };
  planos: { gratuito: { maxCeps: number }; premium: { maxCeps: number } };
  limiteDiarioMaximo: number;
  feed: { idadeMaximaColetaHoras: number; tamanhoPaginaPadrao: number; tamanhoPaginaMaximo: number };
  /**
   * idadeMaximaAlertaHoras: alerta mais velho que isso não vira push (quem estava em silêncio perde).
   * limiteDiarioPadrao: pushes por dia para quem não escolheu limite.
   */
  /**
   * categoriasPrivadas: categorias que revelam dado sensível (gestação). O push dessas categorias não
   * mostra o produto com o celular bloqueado (proposta de UX, N9).
   */
  push: { idadeMaximaAlertaHoras: number; limiteDiarioPadrao: number; canalAndroid: string; categoriasPrivadas: string[] };
  auth: {
    codigoValidadeMinutos: number;
    codigoTentativas: number;
    codigosPorHora: number;
    codigosPorHoraPorIp: number;
    sessaoDias: number;
    /** Audiências aceitas no ID token do Google. Vazio: login com Google desligado. */
    googleClientIds: string[];
  };
}

/** Lei 11.265/2006 (NBCAL): produtos cuja promoção comercial é vedada ou exige advertência. */
export interface ConfigNbcal {
  base: string;
  /** Termo no título ou descrição bloqueia a oferta (falha fechada). */
  termosVedados: string[];
  /** Categorias cuja oferta só aparece com o aviso abaixo. */
  categoriasComAviso: string[];
  aviso: string;
}

export interface ConfigTenant {
  slug: string;
  fuso: string;
  curadoria: ConfigCuradoria;
  cobertura: ConfigCobertura;
  deduplicacao: ConfigDeduplicacao;
  /**
   * categoria: categoria interna que a triagem usa para medicamento (não precisa existir na curadoria).
   * exibir: false tira todo medicamento do app, mesmo isento de prescrição.
   */
  medicamentos: { categoria: string; exibir: boolean; notificar: boolean };
  nbcal: ConfigNbcal;
  fontes: { lomadee?: ConfigFonteLomadee };
  app: ConfigApp;
}

function validarConfigNbcal(bruto: unknown, curadoria: ConfigCuradoria): ConfigNbcal {
  const n = bruto as ConfigNbcal;
  const textos = (v: unknown): v is string[] => Array.isArray(v) && v.every((t) => typeof t === 'string' && t.trim() !== '');
  if (!textos(n?.termosVedados) || n.termosVedados.length === 0) throw new Error('Config inválida: nbcal.termosVedados');
  if (!textos(n.categoriasComAviso) || n.categoriasComAviso.some((c) => curadoria.categorias[c] === undefined)) {
    throw new Error('Config inválida: nbcal.categoriasComAviso');
  }
  if (typeof n.aviso !== 'string' || n.aviso === '') throw new Error('Config inválida: nbcal.aviso');
  return n;
}

function inteiroPositivo(nome: string, v: unknown): void {
  if (!(Number.isInteger(v) && (v as number) > 0)) throw new Error(`Config inválida: app.${nome} deve ser inteiro positivo`);
}

export function validarConfigApp(bruto: unknown, curadoria: ConfigCuradoria): ConfigApp {
  const a = bruto as ConfigApp;
  if (typeof a?.nome !== 'string' || a.nome === '') throw new Error('Config inválida: app.nome');
  for (const doc of ['termos', 'privacidade'] as const) {
    const d = a.documentos?.[doc];
    if (typeof d?.versao !== 'string' || d.versao === '') throw new Error(`Config inválida: app.documentos.${doc}.versao`);
    if (d.url !== null && !(typeof d.url === 'string' && d.url.startsWith('https://'))) {
      throw new Error(`Config inválida: app.documentos.${doc}.url deve ser null ou https://`);
    }
  }
  // Toda categoria do motor precisa de rótulo, e nenhum rótulo pode apontar para categoria inexistente.
  const categorias = Object.keys(curadoria.categorias).sort();
  const rotulos = Object.keys(a.rotulosCategorias ?? {}).sort();
  if (categorias.join() !== rotulos.join()) throw new Error('Config inválida: app.rotulosCategorias difere de curadoria.categorias');
  if (!Array.isArray(a.regiao?.faixasCep) || a.regiao.faixasCep.length === 0) throw new Error('Config inválida: app.regiao.faixasCep');
  for (const f of a.regiao.faixasCep) {
    if (!/^[0-9]{8}$/.test(f.inicio) || !/^[0-9]{8}$/.test(f.fim) || f.inicio > f.fim) {
      throw new Error('Config inválida: app.regiao.faixasCep');
    }
  }
  inteiroPositivo('planos.gratuito.maxCeps', a.planos?.gratuito?.maxCeps);
  inteiroPositivo('planos.premium.maxCeps', a.planos?.premium?.maxCeps);
  // O banco limita a 3 CEPs por usuário.
  if (a.planos.premium.maxCeps > 3 || a.planos.gratuito.maxCeps > a.planos.premium.maxCeps) {
    throw new Error('Config inválida: app.planos.*.maxCeps');
  }
  inteiroPositivo('limiteDiarioMaximo', a.limiteDiarioMaximo);
  inteiroPositivo('feed.idadeMaximaColetaHoras', a.feed?.idadeMaximaColetaHoras);
  inteiroPositivo('feed.tamanhoPaginaPadrao', a.feed?.tamanhoPaginaPadrao);
  inteiroPositivo('feed.tamanhoPaginaMaximo', a.feed?.tamanhoPaginaMaximo);
  if (a.feed.tamanhoPaginaPadrao > a.feed.tamanhoPaginaMaximo) throw new Error('Config inválida: app.feed.tamanhoPaginaPadrao');
  inteiroPositivo('push.idadeMaximaAlertaHoras', a.push?.idadeMaximaAlertaHoras);
  inteiroPositivo('push.limiteDiarioPadrao', a.push?.limiteDiarioPadrao);
  if (a.push.limiteDiarioPadrao > a.limiteDiarioMaximo) throw new Error('Config inválida: app.push.limiteDiarioPadrao acima do máximo');
  if (typeof a.push.canalAndroid !== 'string' || a.push.canalAndroid === '') throw new Error('Config inválida: app.push.canalAndroid');
  if (!Array.isArray(a.push.categoriasPrivadas) || a.push.categoriasPrivadas.some((c: unknown) => typeof c !== 'string' || a.rotulosCategorias[c as string] === undefined)) {
    throw new Error('Config inválida: app.push.categoriasPrivadas precisa listar categorias do tenant');
  }
  for (const k of ['codigoValidadeMinutos', 'codigoTentativas', 'codigosPorHora', 'codigosPorHoraPorIp', 'sessaoDias'] as const) {
    inteiroPositivo(`auth.${k}`, a.auth?.[k]);
  }
  if (!Array.isArray(a.auth.googleClientIds) || !a.auth.googleClientIds.every((c) => typeof c === 'string' && c !== '')) {
    throw new Error('Config inválida: app.auth.googleClientIds');
  }
  return a;
}

export async function carregarConfigTenant(slug: string, dir: string = DIR_CONFIG): Promise<ConfigTenant> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Slug de tenant inválido: ${slug}`);
  const bruto = JSON.parse(await readFile(path.join(dir, 'tenants', `${slug}.json`), 'utf8'));
  const dedup = bruto.deduplicacao as ConfigDeduplicacao;
  if (!(dedup.quedaAdicionalMinima > 0 && dedup.quedaAdicionalMinima < 1)) throw new Error('Config inválida: deduplicacao.quedaAdicionalMinima');
  if (!(dedup.fatorRetornoAoNormal > 0 && dedup.fatorRetornoAoNormal <= 1)) throw new Error('Config inválida: deduplicacao.fatorRetornoAoNormal');
  const med = bruto.medicamentos;
  if (typeof med?.categoria !== 'string' || typeof med.exibir !== 'boolean' || typeof med.notificar !== 'boolean') {
    throw new Error('Config inválida: medicamentos');
  }
  const curadoria = validarConfigCuradoria(bruto.curadoria);
  const lomadee = bruto.fontes?.lomadee as ConfigFonteLomadee | undefined;
  if (lomadee !== undefined) {
    lomadee.mapaCategorias = Object.fromEntries(
      Object.entries(lomadee.mapaCategorias).map(([k, v]) => {
        // A categoria de medicamentos pode ficar fora da curadoria: serve só para a triagem.
        if (curadoria.categorias[v] === undefined && v !== med.categoria) {
          throw new Error(`Config inválida: categoria "${v}" não existe em curadoria`);
        }
        return [normalizarTexto(k), v];
      }),
    );
  }
  return {
    slug: bruto.slug,
    fuso: bruto.fuso ?? 'America/Sao_Paulo',
    curadoria,
    cobertura: validarConfigCobertura(bruto.cobertura),
    deduplicacao: dedup,
    medicamentos: med,
    nbcal: validarConfigNbcal(bruto.nbcal, curadoria),
    fontes: { lomadee },
    app: validarConfigApp(bruto.app, curadoria),
  };
}
