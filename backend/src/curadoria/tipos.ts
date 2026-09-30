// Tipos do motor de curadoria. O motor é puro: sem banco, sem rede, sem relógio do sistema.

export type Unidade = 'kg' | 'l' | 'un';
export type Confiabilidade = 'alta' | 'media' | 'baixa';
export type StatusConfianca = 'aprovada' | 'em_observacao' | 'bloqueada';

/** Conteúdo de uma embalagem já normalizado para a unidade base (g → kg, ml → l). */
export interface Embalagem {
  quantidade: number;
  unidade: Unidade;
}

/**
 * Condição estruturada da oferta. O preço da oferta é sempre o preço de UMA embalagem
 * sob a condição; o motor calcula o preço efetivo por unidade de medida.
 */
export type Condicao =
  | { tipo: 'leve_pague'; leve: number; pague: number }
  | { tipo: 'cartao_fidelidade'; programa: string }
  | { tipo: 'app_da_rede' }
  | { tipo: 'quantidade_minima'; quantidade: number };

export type Frete =
  | { status: 'conhecido'; centavos: number }
  | { status: 'a_confirmar' }
  | { status: 'nao_se_aplica' };

export interface OfertaEmAvaliacao {
  categoria: string;
  precoCentavos: number;
  embalagem: Embalagem;
  condicao: Condicao | null;
  frete: Frete;
  disponivel: boolean;
  validaDe: Date | null;
  validaAte: Date | null;
  observadaEm: Date;
}

/** Observação de preço regular (sem condição) do mesmo produto, na mesma loja. */
export interface ObservacaoPreco {
  observadoEm: Date;
  precoCentavos: number;
  embalagem: Embalagem;
}

export interface LojaEmAvaliacao {
  status: StatusConfianca;
  /** 0 a 1. */
  reputacao: number;
}

export interface FonteEmAvaliacao {
  confiabilidade: Confiabilidade;
}

export interface EntradaAvaliacao {
  oferta: OfertaEmAvaliacao;
  historico: ObservacaoPreco[];
  loja: LojaEmAvaliacao;
  fonte: FonteEmAvaliacao;
}

export type CodigoReprovacao =
  | 'CATEGORIA_NAO_CONFIGURADA'
  | 'HISTORICO_INSUFICIENTE'
  | 'SEM_REFERENCIA_RECENTE'
  | 'QUEDA_ABAIXO_DO_LIMIAR'
  | 'PRECO_ACIMA_DO_PISO'
  | 'SUBIDA_PRE_QUEDA'
  | 'INDISPONIVEL'
  | 'OFERTA_NAO_INICIADA'
  | 'OFERTA_VENCIDA'
  | 'LOJA_BLOQUEADA'
  | 'FRETE_ANULA_ECONOMIA';

export interface Reprovacao {
  codigo: CodigoReprovacao;
  detalhe: string;
}

/**
 * notificar: vira alerta e push.
 * aguardar_aprovacao: vai para o feed; push só depois de aprovação humana (fonte de baixa confiabilidade).
 * somente_feed: vai para o feed e nunca notifica (loja em observação ou score abaixo do mínimo).
 * descartar: não aparece em lugar nenhum.
 */
export type Decisao = 'notificar' | 'aguardar_aprovacao' | 'somente_feed' | 'descartar';

export interface Metricas {
  observacoes180d: number;
  precoEfetivoPorUnidade: number;
  precoReferenciaPorUnidade: number | null;
  pisoHistoricoPorUnidade: number | null;
  /** Maior preço por unidade do período medido (para a régua de preço do app). */
  maiorHistoricoPorUnidade: number | null;
  quedaReal: number | null;
  subidaPreQueda: number | null;
  /** Economia em centavos na compra mínima exigida pela condição (1 embalagem se incondicional). */
  economiaCentavos: number | null;
  limiarQueda: number | null;
}

export interface ComponentesScore {
  queda: number;
  piso: number;
  raridade: number;
  reputacao: number;
}

export interface ResultadoAvaliacao {
  decisao: Decisao;
  /** 0 a 100. Null quando faltam dados para calcular. */
  score: number | null;
  componentes: ComponentesScore | null;
  reprovacoes: Reprovacao[];
  metricas: Metricas;
  /** Texto obrigatório na notificação quando a oferta é condicional. */
  rotuloCondicao: string | null;
  entregaAConfirmar: boolean;
  /** Motivo legível, gravado em alerts.motivo para auditoria. */
  motivo: string;
}
