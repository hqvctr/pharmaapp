// Decide se uma avaliação vira um alerta NOVO ou se é a mesma promoção já alertada (P5).
// Chave: (tenant, família do produto, loja). O chamador busca o último alerta dessa chave e as
// observações posteriores a ele, dentro de uma transação com lock na chave.
import type { Decisao } from '../curadoria/tipos.js';

export type DecisaoAlerta = Exclude<Decisao, 'descartar'>;

export interface ConfigDeduplicacao {
  /** Queda adicional mínima sobre o último alerta para alertar de novo. Ex.: 0,05 = mais 5%. */
  quedaAdicionalMinima: number;
  /** Preço observado depois do alerta ≥ referência × fator significa que a promoção acabou. */
  fatorRetornoAoNormal: number;
}

export interface UltimoAlerta {
  decisao: DecisaoAlerta;
  criadoEm: Date;
  precoEfetivoPorUnidade: number;
  precoReferenciaPorUnidade: number;
  validaAte: Date | null;
}

export interface NovaAvaliacao {
  decisao: Decisao;
  precoEfetivoPorUnidade: number;
}

export type ResultadoDeduplicacao = { gerarAlerta: true; motivo: string } | { gerarAlerta: false; motivo: string };

const NIVEL: Record<DecisaoAlerta, number> = { somente_feed: 0, aguardar_aprovacao: 1, notificar: 2 };

export function deduplicar(
  nova: NovaAvaliacao,
  ultimo: UltimoAlerta | null,
  /** Preços por unidade observados na loja depois de ultimo.criadoEm. */
  precosDepoisDoUltimo: readonly number[],
  agora: Date,
  config: ConfigDeduplicacao,
): ResultadoDeduplicacao {
  if (nova.decisao === 'descartar') return { gerarAlerta: false, motivo: 'avaliação descartada pelo motor' };
  if (ultimo === null) return { gerarAlerta: true, motivo: 'primeiro alerta desta família nesta loja' };

  if (NIVEL[nova.decisao] > NIVEL[ultimo.decisao]) {
    return { gerarAlerta: true, motivo: `decisão subiu de ${ultimo.decisao} para ${nova.decisao}` };
  }
  if (nova.precoEfetivoPorUnidade <= ultimo.precoEfetivoPorUnidade * (1 - config.quedaAdicionalMinima)) {
    return { gerarAlerta: true, motivo: 'preço caiu além do último alerta' };
  }
  const venceu = ultimo.validaAte !== null && ultimo.validaAte.getTime() <= agora.getTime();
  const voltouAoNormal = precosDepoisDoUltimo.some(
    (p) => p >= ultimo.precoReferenciaPorUnidade * config.fatorRetornoAoNormal,
  );
  if (venceu || voltouAoNormal) {
    return {
      gerarAlerta: true,
      motivo: venceu ? 'promoção anterior venceu; esta é uma nova' : 'preço voltou ao normal e caiu de novo',
    };
  }
  return {
    gerarAlerta: false,
    motivo: `mesma promoção já alertada em ${ultimo.criadoEm.toISOString()}`,
  };
}
