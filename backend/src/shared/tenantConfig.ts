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
export interface ConfigApp {
  nome: string;
  termos: { versao: string; url: string | null };
  rotulosCategorias: Record<string, string>;
  regiao: { nome: string; faixasCep: FaixaCepRegiao[] };
  planos: { gratuito: { maxCeps: number }; premium: { maxCeps: number } };
  limiteDiarioMaximo: number;
  feed: { idadeMaximaColetaHoras: number; tamanhoPaginaPadrao: number; tamanhoPaginaMaximo: number };
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

export interface ConfigTenant {
  slug: string;
  fuso: string;
  curadoria: ConfigCuradoria;
  cobertura: ConfigCobertura;
  deduplicacao: ConfigDeduplicacao;
  medicamentos: { categoria: string; notificar: boolean };
  fontes: { lomadee?: ConfigFonteLomadee };
  app: ConfigApp;
}

function inteiroPositivo(nome: string, v: unknown): void {
  if (!(Number.isInteger(v) && (v as number) > 0)) throw new Error(`Config inválida: app.${nome} deve ser inteiro positivo`);
}

export function validarConfigApp(bruto: unknown, curadoria: ConfigCuradoria): ConfigApp {
  const a = bruto as ConfigApp;
  if (typeof a?.nome !== 'string' || a.nome === '') throw new Error('Config inválida: app.nome');
  if (typeof a.termos?.versao !== 'string' || a.termos.versao === '') throw new Error('Config inválida: app.termos.versao');
  if (a.termos.url !== null && typeof a.termos.url !== 'string') throw new Error('Config inválida: app.termos.url');
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
  if (typeof bruto.medicamentos?.categoria !== 'string' || typeof bruto.medicamentos?.notificar !== 'boolean') {
    throw new Error('Config inválida: medicamentos');
  }
  const curadoria = validarConfigCuradoria(bruto.curadoria);
  const lomadee = bruto.fontes?.lomadee as ConfigFonteLomadee | undefined;
  if (lomadee !== undefined) {
    lomadee.mapaCategorias = Object.fromEntries(
      Object.entries(lomadee.mapaCategorias).map(([k, v]) => {
        if (curadoria.categorias[v] === undefined) throw new Error(`Config inválida: categoria "${v}" não existe em curadoria`);
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
    medicamentos: bruto.medicamentos,
    fontes: { lomadee },
    app: validarConfigApp(bruto.app, curadoria),
  };
}
