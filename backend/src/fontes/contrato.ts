// Contrato único de fonte de oferta. Todo tipo (A a E) devolve a mesma forma.
import type { Condicao, Frete } from '../curadoria/tipos.js';

export type TipoFonte = 'A' | 'B' | 'C' | 'D' | 'E';

/** Oferta como veio da fonte, antes de normalizar. Preço sempre em centavos. */
export interface OfertaBruta {
  idExterno: string;
  titulo: string;
  descricao: string | null;
  gtin: string | null;
  marca: string | null;
  precoCentavos: number;
  condicao: Condicao | null;
  /** Nome da categoria na fonte; o normalizador traduz para a categoria do app. */
  categoriaFonte: string;
  lojaIdExterno: string;
  link: string;
  /** Foto do produto na loja (https). A fonte aponta; o app mostra direto dela, sem copiar o arquivo. */
  imagemUrl?: string | null;
  linkAfiliado: boolean;
  disponivel: boolean;
  validaDe: Date | null;
  validaAte: Date | null;
  frete: Frete;
}

export interface ResultadoColeta {
  ofertas: OfertaBruta[];
  /** Itens que a fonte devolveu mas não puderam ser lidos (formato inesperado). */
  ilegiveis: Array<{ referencia: string; erro: string }>;
}

export interface SourceAdapter {
  readonly tipo: TipoFonte;
  coletar(): Promise<ResultadoColeta>;
}

/** Leitura HTTP injetada: o teste usa respostas gravadas, a produção usa rede. */
export interface HttpGetJson {
  get(url: URL): Promise<unknown>;
}

/** Escrita HTTP injetada (só o encurtador de link usa). */
export interface HttpPostJson {
  post(url: URL, corpo: unknown): Promise<unknown>;
}
