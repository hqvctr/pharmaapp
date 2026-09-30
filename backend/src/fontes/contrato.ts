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
  linkAfiliado: boolean;
  /** Foto do produto (https) ou null. */
  imagemUrl: string | null;
  disponivel: boolean;
  validaDe: Date | null;
  validaAte: Date | null;
  frete: Frete;
}

export interface ResultadoColeta {
  ofertas: OfertaBruta[];
  /** Itens que a fonte devolveu mas não puderam ser lidos (formato inesperado). */
  ilegiveis: Array<{ referencia: string; erro: string }>;
  /**
   * true: a fonte devolveu tudo o que tem; oferta ausente acabou e é marcada indisponível.
   * false (ex.: corte por maxPaginas): ausência não prova nada.
   */
  completa: boolean;
}

export interface SourceAdapter {
  readonly tipo: TipoFonte;
  coletar(): Promise<ResultadoColeta>;
}

/** Leitura HTTP injetada: o teste usa respostas gravadas, a produção usa rede. */
export interface HttpGetJson {
  get(url: URL): Promise<unknown>;
}
