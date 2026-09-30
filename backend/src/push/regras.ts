// Regras puras do despacho de push: horário de silêncio, limite do dia e texto da notificação.
import { reais } from '../curadoria/formato.js';
import type { Condicao } from '../curadoria/tipos.js';

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
  produto: { nome: string; categoria: string; tamanhoFralda: string | null };
  loja: { nome: string };
  precoCentavos: number;
  precoEfetivoCentavos: number;
  precoReferenciaCentavos: number;
  queda: number;
  condicao: string | null;
  avisos: string[];
  prova: { menorPrecoCentavos: number; maiorPrecoCentavos: number; diasMedidos: number } | null;
}

/** Contexto que a visão da oferta não carrega: condição estruturada, rótulo da categoria, privacidade. */
export interface ContextoPush {
  condicao: Condicao | null;
  rotuloCategoria: string;
  /** Categoria que revela dado sensível (gestação): o produto não aparece com o celular bloqueado. */
  privado: boolean;
}

export interface MensagemPush {
  /** Até 30 caracteres, começa pelo preço; só o nome do produto é cortado (proposta de UX, seção 2). */
  titulo: string;
  /** Até 40 caracteres: a condição primeiro, senão a prova do desconto. */
  corpo: string;
  /** Notificação aberta: corpo, preço normal, prova, por que chegou e o aviso legal inteiro. */
  expandido: string;
  dados: Record<string, string>;
}

function encurtar(texto: string, max: number): string {
  return texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;
}

export const MAX_TITULO = 30;
export const MAX_CORPO = 40;
const DIAS_SEIS_MESES = 180;

/** Corta o nome na última palavra inteira que couber, para o título caber em 30 caracteres. */
function encaixarNome(nome: string, montar: (n: string) => string): string {
  if (montar(nome).length <= MAX_TITULO) return montar(nome);
  const espaco = MAX_TITULO - montar('').length - 1;
  if (espaco < 3) return montar('').replace(/[ ·]+$/, '');
  let corte = nome.slice(0, espaco);
  if (nome[espaco] !== ' ' && corte.includes(' ')) corte = corte.slice(0, corte.lastIndexOf(' '));
  return montar(`${corte.trimEnd()}…`);
}

function embalagensNaCompra(c: Condicao | null): number {
  if (c?.tipo === 'leve_pague') return c.leve;
  if (c?.tipo === 'quantidade_minima') return c.quantidade;
  return 1;
}

/**
 * Texto do push na forma da proposta de UX (ux/PROPOSTA_UX.md, seção 2), testada no protótipo:
 * título com o preço primeiro, corpo com a condição ou a prova, sem "referência" nem percentual
 * (Inaf: linguagem de gente). Preço sempre por embalagem (decisão 59). O aviso legal vai inteiro no
 * texto expandido (decisão 46); nunca é cortado.
 */
export function montarMensagem(o: OfertaParaPush, entregaId: string, ctx: ContextoPush): MensagemPush {
  const nome = o.produto.tamanhoFralda && !new RegExp(`\\b${o.produto.tamanhoFralda}\\b`).test(o.produto.nome)
    ? `${o.produto.nome} ${o.produto.tamanhoFralda}`
    : o.produto.nome;
  const n = embalagensNaCompra(ctx.condicao);
  const titulo = ctx.condicao?.tipo === 'leve_pague'
    ? encaixarNome(nome, (x) => `${reais(o.precoEfetivoCentavos * n)} por ${n} · ${x}`)
    : encaixarNome(nome, (x) => `${reais(o.precoCentavos)} · ${x}`);

  const economia = reais((o.precoReferenciaCentavos - o.precoEfetivoCentavos) * n);
  const candidatos: string[] = [];
  const c = ctx.condicao;
  if (c?.tipo === 'leve_pague') candidatos.push(`Leve ${c.leve}, pague ${c.pague} · economia de ${economia}`);
  if (c?.tipo === 'quantidade_minima') candidatos.push(`Comprando ${c.quantidade} · economia de ${economia}`);
  if (c?.tipo === 'cartao_fidelidade') candidatos.push(`Com cartão ${c.programa} · ${economia} a menos`, `Só com cartão da loja · ${economia} a menos`);
  if (c?.tipo === 'app_da_rede') candidatos.push(`Só no app da ${o.loja.nome} · ${economia} a menos`, `Só no app da loja · ${economia} a menos`);

  const p = o.prova;
  const menor = p !== null && o.precoEfetivoCentavos <= p.menorPrecoCentavos;
  const seisMeses = p !== null && p.diasMedidos >= DIAS_SEIS_MESES;
  if (p !== null && menor && seisMeses) candidatos.push(`Menor preço em 6 meses: ${economia} a menos`, `Menor em 6 meses: ${economia} a menos`);
  else if (p !== null && menor) candidatos.push(`Menor preço em ${p.diasMedidos} dias: ${economia} a menos`);
  else if (p !== null && seisMeses) candidatos.push(`Quase o menor em 6 meses: ${economia} a menos`);
  candidatos.push(`${economia} abaixo do normal da loja`);
  const corpo = candidatos.find((t) => t.length <= MAX_CORPO) ?? encurtar(candidatos[candidatos.length - 1]!, MAX_CORPO);

  const linhaProva = p === null ? null
    : menor ? (seisMeses ? 'Menor preço dos últimos 6 meses.' : `Menor preço em ${p.diasMedidos} dias de medição.`)
    : 'Perto do menor preço dos últimos meses.';
  const expandido = [
    corpo,
    `Preço normal nesta loja: ${reais(o.precoReferenciaCentavos)}.`,
    ...(linhaProva ? [linhaProva] : []),
    `Você segue ${ctx.rotuloCategoria}.`,
    ...o.avisos,
  ].join('\n');

  return {
    titulo,
    corpo,
    expandido,
    dados: { tipo: 'oferta', ofertaId: o.ofertaId, entregaId, loja: o.loja.nome, privado: ctx.privado ? '1' : '0' },
  };
}
