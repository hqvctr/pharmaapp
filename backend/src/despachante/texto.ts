// Texto da notificação. Sai do código, em português, só com o que o aviso tem: nome do produto, preço da embalagem, loja e, quando
// há, a queda. Produto com advertência legal e medicamento nunca chegam aqui (enviar.ts e a geração os deixam de fora).
import type { TipoAviso } from './gerar.js';

export interface MensagemPush {
  titulo: string;
  corpo: string;
  /** Vai para o app ao tocar na notificação; só texto (exigência do FCM). */
  dados: Record<string, string>;
  /** Notificações do mesmo produto se substituem no aparelho. */
  colapso: string;
  ttlSegundos: number;
}

export interface AvisoParaTexto {
  id: string;
  tipo: TipoAviso;
  product_id: string;
  alert_id: string | null;
  nome: string;
  loja_nome: string | null;
  preco_centavos: number | null;
  queda: number | null;
  valida_ate: Date | null;
}

const MAX_NOME = 90;
const moeda = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function reais(centavos: number): string {
  return `R$ ${moeda.format(centavos / 100)}`;
}

function encurtar(nome: string): string {
  const limpo = nome.replace(/\s+/g, ' ').trim();
  return limpo.length <= MAX_NOME ? limpo : `${limpo.slice(0, MAX_NOME - 1).trimEnd()}…`;
}

const TITULOS: Record<TipoAviso, string> = {
  promocao_excepcional: 'Promoção excepcional',
  queda_percentual: 'Baixou de preço',
  voltou_estoque: 'Voltou ao estoque',
  menor_preco_180d: 'Menor preço em 180 dias',
  promocao_acabando: 'Promoção acabando',
};

export function montarMensagem(a: AvisoParaTexto, fuso: string, ttlSegundos: number): MensagemPush {
  const pct = a.queda !== null && a.queda > 0 ? Math.round(a.queda * 100) : null;
  let titulo = TITULOS[a.tipo];
  if (a.tipo === 'queda_percentual' && pct !== null) titulo = `Baixou ${pct}%`;
  let corpo = encurtar(a.nome);
  if (a.preco_centavos !== null) corpo += ` por ${reais(a.preco_centavos)}`;
  if (a.loja_nome !== null) corpo += ` na ${a.loja_nome}`;
  if (a.tipo === 'promocao_excepcional' && pct !== null) corpo += ` (${pct}% abaixo do normal)`;
  if (a.tipo === 'promocao_acabando' && a.valida_ate !== null) {
    const ate = new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(a.valida_ate);
    corpo += `, até ${ate.replace(',', ' às')}`;
  }
  const dados: Record<string, string> = { aviso_id: a.id, tipo: a.tipo, produto_id: a.product_id };
  if (a.alert_id !== null) dados.alerta_id = a.alert_id;
  return { titulo, corpo, dados, colapso: a.product_id, ttlSegundos };
}
