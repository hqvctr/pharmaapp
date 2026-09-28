// Fonte TIPO A: API de Ofertas da Lomadee (v3), consultada loja a loja.
//
// FORMATO PRESUMIDO. Endpoint e envelope (requestInfo, pagination) confirmados por biblioteca de
// terceiros; os campos de cada oferta (id, name, price, link, category.name, store.id) ainda não
// foram vistos numa resposta real. Confirmar e ajustar parseOferta na vinculação da fonte.
// A Lomadee não informa GTIN, marca, embalagem, frete nem validade.
import type { HttpGetJson, OfertaBruta, ResultadoColeta, SourceAdapter } from './contrato.js';

export interface ConfigLomadee {
  baseUrl: string;
  appToken: string;
  sourceId: string;
  /** Ids de loja na Lomadee. Só lojas aprovadas pelo operador entram aqui. */
  lojas: string[];
  tamanhoPagina: number;
  maxPaginas: number;
}

interface Envelope {
  requestInfo?: { status?: string; message?: string };
  pagination?: { page?: number; totalPage?: number };
  offers?: unknown[];
}

export class LomadeeAdapter implements SourceAdapter {
  readonly tipo = 'A' as const;

  constructor(
    private readonly http: HttpGetJson,
    private readonly config: ConfigLomadee,
  ) {}

  async coletar(): Promise<ResultadoColeta> {
    const resultado: ResultadoColeta = { ofertas: [], ilegiveis: [] };
    for (const loja of this.config.lojas) {
      for (let pagina = 1; pagina <= this.config.maxPaginas; pagina++) {
        const url = new URL(`v3/${this.config.appToken}/offer/_store/${encodeURIComponent(loja)}`, this.config.baseUrl);
        url.searchParams.set('sourceId', this.config.sourceId);
        url.searchParams.set('page', String(pagina));
        url.searchParams.set('size', String(this.config.tamanhoPagina));

        const corpo = (await this.http.get(url)) as Envelope;
        if (corpo.requestInfo?.status !== 'OK') {
          // Nunca incluir a URL no erro: ela carrega o token.
          throw new Error(`Lomadee loja ${loja} página ${pagina}: status ${corpo.requestInfo?.status ?? 'ausente'}`);
        }
        for (const [i, item] of (corpo.offers ?? []).entries()) {
          try {
            resultado.ofertas.push(parseOferta(item));
          } catch (err) {
            resultado.ilegiveis.push({ referencia: `loja ${loja} página ${pagina} item ${i}`, erro: (err as Error).message });
          }
        }
        const total = corpo.pagination?.totalPage ?? pagina;
        if (pagina >= total) break;
      }
    }
    return resultado;
  }
}

function texto(v: unknown, campo: string): string {
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  if (typeof v === 'number') return String(v);
  throw new Error(`campo ${campo} ausente ou inválido`);
}

export function parseOferta(item: unknown): OfertaBruta {
  const o = item as Record<string, unknown>;
  const loja = o.store as Record<string, unknown> | undefined;
  const categoria = o.category as Record<string, unknown> | undefined;
  const preco = o.price;
  if (typeof preco !== 'number' || !(preco > 0)) throw new Error('campo price ausente ou inválido');
  return {
    idExterno: texto(o.id, 'id'),
    titulo: texto(o.name, 'name'),
    descricao: null,
    gtin: null,
    marca: null,
    precoCentavos: Math.round(preco * 100),
    condicao: null,
    categoriaFonte: texto(categoria?.name, 'category.name'),
    lojaIdExterno: texto(loja?.id, 'store.id'),
    link: texto(o.link, 'link'),
    // Link devolvido pela API de afiliado já é rastreado.
    linkAfiliado: true,
    // Presente na lista de ofertas da loja = disponível.
    disponivel: true,
    validaDe: null,
    validaAte: null,
    frete: { status: 'a_confirmar' },
  };
}
