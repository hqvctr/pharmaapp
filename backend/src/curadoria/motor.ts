// Motor de curadoria. Decide se uma oferta vira alerta a partir do histórico próprio de preço,
// nunca do desconto anunciado pela loja. Função pura: o "agora" é injetado.
import type { ConfigCuradoria } from './config.js';
import { clamp01, maiorAltaAcumulada, mediana } from './estatistica.js';
import { percentual, reais, reaisPorUnidade } from './formato.js';
import { embalagensNaCompraMinima, precoEfetivoPorUnidade, precoPorUnidade, rotuloCondicao } from './preco.js';
import type {
  ComponentesScore,
  Confiabilidade,
  Decisao,
  EntradaAvaliacao,
  Metricas,
  Reprovacao,
  ResultadoAvaliacao,
} from './tipos.js';

const DIA_MS = 86_400_000;

const NIVEL_CONFIABILIDADE: Record<Confiabilidade, number> = { baixa: 0, media: 1, alta: 2 };

interface Ponto {
  t: number;
  porUnidade: number;
}

export function avaliarOferta(entrada: EntradaAvaliacao, config: ConfigCuradoria, agora: Date): ResultadoAvaliacao {
  const { oferta, historico, loja, fonte } = entrada;
  const reprovacoes: Reprovacao[] = [];
  const t0 = oferta.observadaEm.getTime();
  const unidade = oferta.embalagem.unidade;
  const categoria = config.categorias[oferta.categoria];

  if (categoria === undefined) {
    reprovacoes.push({
      codigo: 'CATEGORIA_NAO_CONFIGURADA',
      detalhe: `categoria "${oferta.categoria}" não está configurada para este tenant`,
    });
  }

  // Regra 8: toda comparação é feita em preço por unidade de medida. Com embalagem idêntica isso
  // equivale ao preço absoluto; com embalagem diferente, é o único jeito de não se enganar.
  const efetivo = precoEfetivoPorUnidade(oferta.precoCentavos, oferta.embalagem, oferta.condicao);

  // Histórico comparável: mesma unidade base, anterior à observação da oferta, dentro da janela do piso.
  const pontos: Ponto[] = historico
    .filter((o) => o.embalagem.unidade === unidade)
    .map((o) => ({ t: o.observadoEm.getTime(), porUnidade: precoPorUnidade(o.precoCentavos, o.embalagem) }))
    .filter((p) => p.t < t0 && p.t >= t0 - config.janelaPisoDias * DIA_MS)
    .sort((a, b) => a.t - b.t);

  // Condição 1: histórico mínimo naquela loja.
  if (pontos.length < config.minObservacoes) {
    reprovacoes.push({
      codigo: 'HISTORICO_INSUFICIENTE',
      detalhe: `${pontos.length} observações em ${config.janelaPisoDias} dias; mínimo ${config.minObservacoes}`,
    });
  }

  const recentes = pontos.filter((p) => p.t >= t0 - config.janelaReferenciaDias * DIA_MS);
  const referencia = recentes.length > 0 ? mediana(recentes.map((p) => p.porUnidade)) : null;
  if (referencia === null) {
    reprovacoes.push({
      codigo: 'SEM_REFERENCIA_RECENTE',
      detalhe: `nenhuma observação nos últimos ${config.janelaReferenciaDias} dias para calcular a referência`,
    });
  }
  const piso = pontos.length > 0 ? Math.min(...pontos.map((p) => p.porUnidade)) : null;
  const quedaReal = referencia !== null ? (referencia - efetivo) / referencia : null;

  // Condição 2: queda real sobre a mediana, no limiar da categoria.
  if (categoria !== undefined && quedaReal !== null && quedaReal < categoria.limiarQueda) {
    reprovacoes.push({
      codigo: 'QUEDA_ABAIXO_DO_LIMIAR',
      detalhe: `queda real de ${percentual(quedaReal)} abaixo do limiar de ${percentual(categoria.limiarQueda)} da categoria ${oferta.categoria}`,
    });
  }

  // Condição 3: preço atual no piso de 180 dias ou até a tolerância acima dele.
  if (piso !== null && efetivo > piso * (1 + config.toleranciaPiso)) {
    reprovacoes.push({
      codigo: 'PRECO_ACIMA_DO_PISO',
      detalhe: `preço efetivo ${reaisPorUnidade(efetivo, unidade)} está ${percentual(efetivo / piso - 1)} acima do piso de ${reaisPorUnidade(piso, unidade)}; tolerância ${percentual(config.toleranciaPiso)}`,
    });
  }

  // Condição 4: preço não pode ter sido inflado logo antes da "promoção".
  const subida = calcularSubidaPreQueda(pontos, t0, config);
  if (subida !== null && subida > config.subidaMaxima) {
    reprovacoes.push({
      codigo: 'SUBIDA_PRE_QUEDA',
      detalhe: `preço subiu ${percentual(subida)} nos ${config.janelaSubidaDias} dias anteriores; máximo ${percentual(config.subidaMaxima)}`,
    });
  }

  // Condição 5: disponível e dentro da validade.
  if (!oferta.disponivel) {
    reprovacoes.push({ codigo: 'INDISPONIVEL', detalhe: 'produto indisponível na loja' });
  }
  if (oferta.validaDe !== null && oferta.validaDe.getTime() > agora.getTime()) {
    reprovacoes.push({ codigo: 'OFERTA_NAO_INICIADA', detalhe: `oferta começa em ${oferta.validaDe.toISOString()}` });
  }
  if (oferta.validaAte !== null && oferta.validaAte.getTime() <= agora.getTime()) {
    reprovacoes.push({ codigo: 'OFERTA_VENCIDA', detalhe: `oferta venceu em ${oferta.validaAte.toISOString()}` });
  }

  // Condição 6 (parte bloqueante): loja bloqueada não aparece em lugar nenhum.
  if (loja.status === 'bloqueada') {
    reprovacoes.push({ codigo: 'LOJA_BLOQUEADA', detalhe: 'loja com status bloqueada' });
  }

  // Condição 7: frete conhecido não pode anular a economia da compra mínima.
  const quantidadeCompra = oferta.embalagem.quantidade * embalagensNaCompraMinima(oferta.condicao);
  const economia = referencia !== null ? Math.round((referencia - efetivo) * quantidadeCompra) : null;
  if (
    oferta.frete.status === 'conhecido' &&
    economia !== null &&
    economia > 0 &&
    oferta.frete.centavos >= economia * config.freteMaximoSobreEconomia
  ) {
    reprovacoes.push({
      codigo: 'FRETE_ANULA_ECONOMIA',
      detalhe: `frete de ${reais(oferta.frete.centavos)} anula a economia de ${reais(economia)}`,
    });
  }

  const componentes =
    referencia !== null && piso !== null && quedaReal !== null
      ? calcularComponentes(efetivo, quedaReal, piso, pontos, loja.reputacao, config)
      : null;
  const score = componentes !== null ? pontuar(componentes, config) : null;

  const metricas: Metricas = {
    observacoes180d: pontos.length,
    precoEfetivoPorUnidade: efetivo,
    precoReferenciaPorUnidade: referencia,
    pisoHistoricoPorUnidade: piso,
    quedaReal,
    subidaPreQueda: subida,
    economiaCentavos: economia,
    limiarQueda: categoria?.limiarQueda ?? null,
  };

  const { decisao, justificativa } = decidir(reprovacoes, score, loja.status, fonte.confiabilidade, config);
  const rotulo = rotuloCondicao(oferta.condicao);
  const entregaAConfirmar = oferta.frete.status === 'a_confirmar';

  return {
    decisao,
    score,
    componentes,
    reprovacoes,
    metricas,
    rotuloCondicao: rotulo,
    entregaAConfirmar,
    motivo: redigirMotivo(justificativa, reprovacoes, metricas, componentes, score, unidade, rotulo, entregaAConfirmar),
  };
}

/**
 * Compara o maior preço dos N dias anteriores com a mediana do período imediatamente antes deles.
 * Sem base anterior, usa a maior alta acumulada dentro da própria janela.
 * Null quando não há observação na janela (nada a verificar).
 */
function calcularSubidaPreQueda(pontos: Ponto[], t0: number, config: ConfigCuradoria): number | null {
  const inicioJanela = t0 - config.janelaSubidaDias * DIA_MS;
  const janela = pontos.filter((p) => p.t >= inicioJanela).map((p) => p.porUnidade);
  if (janela.length === 0) return null;
  const base = pontos
    .filter((p) => p.t < inicioJanela && p.t >= inicioJanela - config.janelaBaseSubidaDias * DIA_MS)
    .map((p) => p.porUnidade);
  if (base.length > 0) return Math.max(0, Math.max(...janela) / mediana(base) - 1);
  return maiorAltaAcumulada(janela);
}

function calcularComponentes(
  efetivo: number,
  quedaReal: number,
  piso: number,
  pontos: Ponto[],
  reputacao: number,
  config: ConfigCuradoria,
): ComponentesScore {
  const acimaDoPiso = efetivo / piso - 1;
  const comoOuMaisBaratos = pontos.filter((p) => p.porUnidade <= efetivo).length;
  return {
    queda: clamp01(quedaReal / config.quedaNotaMaxima),
    piso: acimaDoPiso <= 0 ? 1 : clamp01(1 - acimaDoPiso / config.toleranciaPiso),
    // Raridade: fração do histórico que foi mais cara que o preço atual.
    raridade: pontos.length > 0 ? 1 - comoOuMaisBaratos / pontos.length : 0,
    reputacao: clamp01(reputacao),
  };
}

function pontuar(c: ComponentesScore, config: ConfigCuradoria): number {
  const p = config.pesosScore;
  const bruto = c.queda * p.queda + c.piso * p.piso + c.raridade * p.raridade + c.reputacao * p.reputacao;
  return Math.round(bruto * 100);
}

function decidir(
  reprovacoes: Reprovacao[],
  score: number | null,
  statusLoja: EntradaAvaliacao['loja']['status'],
  confiabilidade: Confiabilidade,
  config: ConfigCuradoria,
): { decisao: Decisao; justificativa: string } {
  if (reprovacoes.length > 0 || score === null) {
    return { decisao: 'descartar', justificativa: 'Descartada' };
  }
  if (statusLoja === 'em_observacao') {
    return { decisao: 'somente_feed', justificativa: 'Somente feed: loja em observação não notifica' };
  }
  if (score < config.scoreMinimoNotificar) {
    return {
      decisao: 'somente_feed',
      justificativa: `Somente feed: score ${score} abaixo do mínimo ${config.scoreMinimoNotificar} para notificar`,
    };
  }
  if (NIVEL_CONFIABILIDADE[confiabilidade] < NIVEL_CONFIABILIDADE[config.confiabilidadeMinimaNotificar]) {
    return {
      decisao: 'aguardar_aprovacao',
      justificativa: `Aguardando aprovação humana: fonte de confiabilidade ${confiabilidade}`,
    };
  }
  return { decisao: 'notificar', justificativa: 'Aprovada para notificação' };
}

function redigirMotivo(
  justificativa: string,
  reprovacoes: Reprovacao[],
  m: Metricas,
  c: ComponentesScore | null,
  score: number | null,
  unidade: EntradaAvaliacao['oferta']['embalagem']['unidade'],
  rotulo: string | null,
  entregaAConfirmar: boolean,
): string {
  if (reprovacoes.length > 0) {
    return `${justificativa}: ${reprovacoes.map((r) => `${r.codigo} (${r.detalhe})`).join('; ')}.`;
  }
  const partes = [
    `${justificativa}.`,
    `Queda real de ${percentual(m.quedaReal!)} sobre a mediana de referência ` +
      `(${reaisPorUnidade(m.precoReferenciaPorUnidade!, unidade)} → ${reaisPorUnidade(m.precoEfetivoPorUnidade, unidade)}).`,
    `Piso histórico ${reaisPorUnidade(m.pisoHistoricoPorUnidade!, unidade)} em ${m.observacoes180d} observações.`,
    `Economia de ${reais(m.economiaCentavos!)} na compra mínima.`,
    `Score ${score} (queda ${c!.queda.toFixed(2)}, piso ${c!.piso.toFixed(2)}, ` +
      `raridade ${c!.raridade.toFixed(2)}, reputação ${c!.reputacao.toFixed(2)}).`,
  ];
  if (rotulo !== null) partes.push(`Condição: ${rotulo}.`);
  if (entregaAConfirmar) partes.push('Entrega a confirmar.');
  return partes.join(' ');
}
