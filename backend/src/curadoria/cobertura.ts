// Decide se um usuário entra na audiência de uma loja: por faixa de CEP (entrega), por raio de
// entrega da loja física, ou por retirada numa loja física próxima, desde que o deslocamento não
// anule a economia. Função pura; a coordenada do CEP é resolvida fora daqui.
import type { ConfigCobertura } from './config.js';
import { reais } from './formato.js';

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface FaixaCep {
  inicio: string;
  fim: string;
  prazoDias: number;
}

export interface LojaCobertura {
  tipo: 'online' | 'fisica';
  coordenada: Coordenada | null;
  raioEntregaKm: number | null;
  faixasCep: FaixaCep[];
}

export interface LocalUsuario {
  /** 8 dígitos, sem hífen. */
  cep: string;
  /** Centróide aproximado do CEP. Null quando ainda não foi resolvido. */
  coordenada: Coordenada | null;
}

export type ResultadoCobertura =
  | { coberto: true; modo: 'entrega_por_cep'; prazoDias: number }
  | { coberto: true; modo: 'entrega_por_raio'; distanciaKm: number }
  | { coberto: true; modo: 'retirada_na_loja'; distanciaKm: number; custoDeslocamentoCentavos: number }
  | { coberto: false; codigo: 'FORA_DE_COBERTURA' | 'DESLOCAMENTO_ANULA_ECONOMIA' | 'CEP_SEM_COORDENADA'; detalhe: string };

const RAIO_TERRA_KM = 6371.0088;

export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const rad = (g: number): number => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export function normalizarCep(cep: string): string {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) throw new Error(`CEP inválido: ${cep}`);
  return digitos;
}

export function verificarCobertura(
  loja: LojaCobertura,
  usuario: LocalUsuario,
  economiaCentavos: number,
  config: ConfigCobertura,
): ResultadoCobertura {
  const cep = normalizarCep(usuario.cep);

  const faixa = loja.faixasCep
    .filter((f) => cep >= f.inicio && cep <= f.fim)
    .sort((a, b) => a.prazoDias - b.prazoDias)[0];
  if (faixa !== undefined) return { coberto: true, modo: 'entrega_por_cep', prazoDias: faixa.prazoDias };

  if (loja.tipo === 'online' || loja.coordenada === null) {
    return { coberto: false, codigo: 'FORA_DE_COBERTURA', detalhe: `CEP ${cep} fora das faixas de entrega da loja` };
  }
  if (usuario.coordenada === null) {
    return {
      coberto: false,
      codigo: 'CEP_SEM_COORDENADA',
      detalhe: `CEP ${cep} sem coordenada; não é possível medir distância até a loja física`,
    };
  }

  const distancia = distanciaKm(loja.coordenada, usuario.coordenada);
  if (loja.raioEntregaKm !== null && distancia <= loja.raioEntregaKm) {
    return { coberto: true, modo: 'entrega_por_raio', distanciaKm: distancia };
  }
  if (distancia <= config.raioRetiradaKm) {
    // Ida e volta até a loja.
    const custo = Math.round(distancia * 2 * config.custoDeslocamentoPorKmCentavos);
    if (custo >= economiaCentavos) {
      return {
        coberto: false,
        codigo: 'DESLOCAMENTO_ANULA_ECONOMIA',
        detalhe: `deslocamento de ${distancia.toFixed(1)} km custa ${reais(custo)} e anula a economia de ${reais(economiaCentavos)}`,
      };
    }
    return { coberto: true, modo: 'retirada_na_loja', distanciaKm: distancia, custoDeslocamentoCentavos: custo };
  }
  return {
    coberto: false,
    codigo: 'FORA_DE_COBERTURA',
    detalhe: `loja física a ${distancia.toFixed(1)} km; raio de retirada ${config.raioRetiradaKm} km e sem entrega para o CEP ${cep}`,
  };
}
