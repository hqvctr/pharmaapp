// Regras puras do despacho de push: horário de silêncio, limite do dia e texto da notificação.
import { reais } from '../curadoria/formato.js';

const formatadoresHora = new Map<string, Intl.DateTimeFormat>();

/** "HH:MM" do instante no fuso dado. */
export function horaLocal(instante: Date, fuso: string): string {
  let f = formatadoresHora.get(fuso);
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatadoresHora.set(fuso, f);
  }
  return f.format(instante);
}

/** Silêncio de 22:00 a 07:00 atravessa a meia-noite; o fim é exclusivo. */
export function emSilencio(hora: string, inicio: string | null, fim: string | null): boolean {
  if (inicio === null || fim === null || inicio === fim) return false;
  return inicio < fim ? hora >= inicio && hora < fim : hora >= inicio || hora < fim;
}

export function limiteDoDia(escolhido: number | null, padrao: number, maximo: number): number {
  return Math.min(escolhido ?? padrao, maximo);
}

/** O que a notificação precisa mostrar; vem da mesma visão da oferta que a API entrega ao app. */
export interface OfertaParaPush {
  ofertaId: string;
  produto: { nome: string };
  loja: { nome: string };
  precoEfetivoCentavos: number;
  precoReferenciaCentavos: number;
  queda: number;
  condicao: string | null;
  avisos: string[];
}

export interface MensagemPush {
  titulo: string;
  corpo: string;
  dados: Record<string, string>;
}

function encurtar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Preço por embalagem (nunca por litro), a condição quando houver (obrigatória, decisão 12) e o aviso
 * legal quando houver (NBCAL, decisão 46). O aviso vai inteiro: não pode ser cortado.
 */
export function montarMensagem(o: OfertaParaPush, entregaId: string): MensagemPush {
  const partes = [
    ...(o.condicao ? [o.condicao] : []),
    `${reais(o.precoEfetivoCentavos)} (referência ${reais(o.precoReferenciaCentavos)}, ${Math.round(o.queda * 100)}% abaixo)`,
    o.loja.nome,
  ];
  const corpo = [partes.join(' · '), ...o.avisos].join('\n');
  return {
    titulo: encurtar(o.produto.nome, 65),
    corpo,
    dados: { tipo: 'oferta', ofertaId: o.ofertaId, entregaId },
  };
}
