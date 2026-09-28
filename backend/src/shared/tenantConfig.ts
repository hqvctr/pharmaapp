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

export interface ConfigTenant {
  slug: string;
  fuso: string;
  curadoria: ConfigCuradoria;
  cobertura: ConfigCobertura;
  deduplicacao: ConfigDeduplicacao;
  medicamentos: { categoria: string; notificar: boolean };
  fontes: { lomadee?: ConfigFonteLomadee };
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
  };
}
