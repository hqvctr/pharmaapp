import type { Confiabilidade } from './tipos.js';

// Todo valor de negócio do motor vem daqui. Os valores reais ficam em config/tenants/<slug>.json.

export interface ConfigCategoria {
  limiarQueda: number;
  perecivel: boolean;
}

export interface PesosScore {
  queda: number;
  piso: number;
  raridade: number;
  reputacao: number;
}

export interface ConfigCuradoria {
  minObservacoes: number;
  janelaReferenciaDias: number;
  janelaPisoDias: number;
  toleranciaPiso: number;
  janelaSubidaDias: number;
  janelaBaseSubidaDias: number;
  subidaMaxima: number;
  quedaNotaMaxima: number;
  pesosScore: PesosScore;
  scoreMinimoNotificar: number;
  confiabilidadeMinimaNotificar: Confiabilidade;
  freteMaximoSobreEconomia: number;
  categorias: Record<string, ConfigCategoria>;
}

export interface ConfigCobertura {
  raioRetiradaKm: number;
  custoDeslocamentoPorKmCentavos: number;
}

function assertFraction(name: string, value: unknown): number {
  if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
    throw new Error(`Config inválida: ${name} deve ser número entre 0 e 1`);
  }
  return value;
}

function assertPositive(name: string, value: unknown): number {
  if (typeof value !== 'number' || !(value > 0)) {
    throw new Error(`Config inválida: ${name} deve ser número positivo`);
  }
  return value;
}

/** Valida o bloco "curadoria" do arquivo do tenant. Falha cedo em vez de avaliar com valor errado. */
export function validarConfigCuradoria(raw: unknown): ConfigCuradoria {
  const c = raw as ConfigCuradoria;
  assertPositive('minObservacoes', c.minObservacoes);
  assertPositive('janelaReferenciaDias', c.janelaReferenciaDias);
  assertPositive('janelaPisoDias', c.janelaPisoDias);
  assertPositive('janelaSubidaDias', c.janelaSubidaDias);
  assertPositive('janelaBaseSubidaDias', c.janelaBaseSubidaDias);
  assertFraction('toleranciaPiso', c.toleranciaPiso);
  assertFraction('subidaMaxima', c.subidaMaxima);
  assertFraction('quedaNotaMaxima', c.quedaNotaMaxima);
  assertPositive('freteMaximoSobreEconomia', c.freteMaximoSobreEconomia);
  if (!(c.scoreMinimoNotificar >= 0 && c.scoreMinimoNotificar <= 100)) {
    throw new Error('Config inválida: scoreMinimoNotificar deve estar entre 0 e 100');
  }
  if (!['alta', 'media', 'baixa'].includes(c.confiabilidadeMinimaNotificar)) {
    throw new Error('Config inválida: confiabilidadeMinimaNotificar');
  }
  const p = c.pesosScore;
  const soma = [p.queda, p.piso, p.raridade, p.reputacao].reduce((a, b) => a + assertFraction('pesosScore', b), 0);
  if (Math.abs(soma - 1) > 1e-9) throw new Error(`Config inválida: pesosScore soma ${soma}, deveria somar 1`);
  for (const [nome, cat] of Object.entries(c.categorias ?? {})) {
    assertFraction(`categorias.${nome}.limiarQueda`, cat.limiarQueda);
    if (typeof cat.perecivel !== 'boolean') throw new Error(`Config inválida: categorias.${nome}.perecivel`);
  }
  return c;
}

export function validarConfigCobertura(raw: unknown): ConfigCobertura {
  const c = raw as ConfigCobertura;
  assertPositive('raioRetiradaKm', c.raioRetiradaKm);
  if (!(c.custoDeslocamentoPorKmCentavos >= 0)) throw new Error('Config inválida: custoDeslocamentoPorKmCentavos');
  return c;
}
