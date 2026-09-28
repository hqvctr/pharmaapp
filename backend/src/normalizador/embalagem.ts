// Extrai o conteúdo da embalagem do título, porque fontes como a Lomadee não o informam.
// Converte para a unidade base (g → kg, ml → l). Dosagem (mg, mcg) nunca é conteúdo.
import type { Embalagem } from '../curadoria/tipos.js';
import { normalizarTexto } from './medicamentos.js';

const MASSA_VOLUME = /(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|lt|litros?)(?![a-z])/;
const MULTIPLO = /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|lt|litros?)(?![a-z])/;
const CONTAGEM =
  /(\d+)\s*(un|und|unid|unidades?|comprimidos?|cp|capsulas?|caps|saches?|fraldas?|tiras?|lencos?|absorventes?)(?![a-z])/;
const KIT = /\bkit\s*(?:com\s*)?(\d+)\b/;

function numero(s: string): number {
  return Number(s.replace(',', '.'));
}

function paraBase(qtd: number, unidade: string): Embalagem {
  switch (unidade) {
    case 'g':
      return { quantidade: qtd / 1000, unidade: 'kg' };
    case 'kg':
      return { quantidade: qtd, unidade: 'kg' };
    case 'ml':
      return { quantidade: qtd / 1000, unidade: 'l' };
    default:
      return { quantidade: qtd, unidade: 'l' };
  }
}

export interface EmbalagemExtraida {
  embalagem: Embalagem;
  /** false quando nada foi encontrado e caiu no padrão de 1 unidade. */
  identificada: boolean;
}

export function extrairEmbalagem(titulo: string): EmbalagemExtraida {
  const t = normalizarTexto(titulo);

  const multiplo = MULTIPLO.exec(t);
  if (multiplo) {
    const base = paraBase(numero(multiplo[2]!), multiplo[3]!);
    return { embalagem: { ...base, quantidade: base.quantidade * Number(multiplo[1]) }, identificada: true };
  }
  const mv = MASSA_VOLUME.exec(t);
  if (mv) {
    const base = paraBase(numero(mv[1]!), mv[2]!);
    const kit = KIT.exec(t);
    const fator = kit ? Number(kit[1]) : 1;
    return { embalagem: { ...base, quantidade: base.quantidade * fator }, identificada: true };
  }
  const contagem = CONTAGEM.exec(t);
  if (contagem) return { embalagem: { quantidade: Number(contagem[1]), unidade: 'un' }, identificada: true };
  const kit = KIT.exec(t);
  if (kit) return { embalagem: { quantidade: Number(kit[1]), unidade: 'un' }, identificada: true };
  return { embalagem: { quantidade: 1, unidade: 'un' }, identificada: false };
}

/** Título sem os trechos de embalagem: base da chave de família. */
export function removerEmbalagem(titulo: string): string {
  return normalizarTexto(titulo)
    .replace(new RegExp(MULTIPLO.source, 'g'), ' ')
    .replace(new RegExp(MASSA_VOLUME.source, 'g'), ' ')
    .replace(new RegExp(CONTAGEM.source, 'g'), ' ')
    .replace(new RegExp(KIT.source, 'g'), ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
