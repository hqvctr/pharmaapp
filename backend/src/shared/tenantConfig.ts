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
import { compilarTriagemPorNome, normalizarTexto, type ModoMedicamentos, type TriagemPorNome } from '../normalizador/medicamentos.js';
import { compilarRegrasNbcal, type RegrasNbcal } from '../normalizador/nbcal.js';
import { validarConfigApp, type ConfigApp } from './configApp.js';

export const DIR_CONFIG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../config');

/**
 * Bloco `fontes.<nome>` do tenant. `adaptador` escolhe o módulo em `fontes/registro.ts` (padrão: o próprio
 * nome); o resto é a config daquele adaptador, validada por ele. Segredo nunca entra aqui.
 */
export interface ConfigFonte {
  adaptador: string;
  /** Categoria da fonte (normalizada) → categoria do app. Fora do mapa: ignorada. */
  mapaCategorias: Record<string, string>;
  [campo: string]: unknown;
}

export interface ConfigTenant {
  slug: string;
  fuso: string;
  curadoria: ConfigCuradoria;
  cobertura: ConfigCobertura;
  deduplicacao: ConfigDeduplicacao;
  medicamentos: { categoria: string; notificar: boolean; modo: ModoMedicamentos; triagemPorNome: TriagemPorNome };
  nbcal: RegrasNbcal;
  fontes: Record<string, ConfigFonte>;
  app: ConfigApp;
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
  // Parecer da RDC 96/2008: só `desligado` está implementado. `lista` e `propaganda` exigem GTIN na fonte,
  // dados da CMED, quadro de advertência e revisão de advogado; até lá a carga recusa para não publicar sem cumprir.
  if (bruto.medicamentos.modo !== 'desligado') {
    throw new Error(`Config inválida: medicamentos.modo = ${JSON.stringify(bruto.medicamentos.modo)} (só "desligado" está implementado)`);
  }
  const triagemPorNome = compilarTriagemPorNome(bruto.medicamentos.triagemPorNome);
  const curadoria = validarConfigCuradoria(bruto.curadoria);
  const fontes: Record<string, ConfigFonte> = {};
  for (const [nome, bloco] of Object.entries((bruto.fontes ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!/^[a-z0-9-]+$/.test(nome)) throw new Error(`Config inválida: nome de fonte "${nome}"`);
    const adaptador = bloco.adaptador ?? nome;
    if (typeof adaptador !== 'string') throw new Error(`Config inválida: fontes.${nome}.adaptador`);
    const mapa = bloco.mapaCategorias as Record<string, string> | undefined;
    if (mapa === undefined || typeof mapa !== 'object') throw new Error(`Config inválida: fontes.${nome}.mapaCategorias`);
    fontes[nome] = {
      ...bloco,
      adaptador,
      mapaCategorias: Object.fromEntries(
        Object.entries(mapa).map(([k, v]) => {
          if (curadoria.categorias[v] === undefined) throw new Error(`Config inválida: categoria "${v}" não existe em curadoria`);
          return [normalizarTexto(k), v];
        }),
      ),
    };
  }
  return {
    slug: bruto.slug,
    fuso: bruto.fuso ?? 'America/Sao_Paulo',
    curadoria,
    cobertura: validarConfigCobertura(bruto.cobertura),
    deduplicacao: dedup,
    medicamentos: { ...bruto.medicamentos, triagemPorNome },
    nbcal: compilarRegrasNbcal(bruto.nbcal),
    fontes,
    app: validarConfigApp(bruto.app, curadoria, bruto.medicamentos.categoria),
  };
}
