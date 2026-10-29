// Fonte TIPO A: API de afiliados da Lomadee (documentação: https://docs.lomadee.com.br/api-reference/introduction).
//
// Servidor https://api.lomadee.com.br, chave no cabeçalho `x-api-key`, produtos em GET /affiliate/products com
// page, limit (1 a 100), isAvailable e organizationIds (a "loja" é a marca/organização). Limite de 60 pedidos
// por minuto por chave.
//
// FORMATO CONFERIDO EM RESPOSTAS REAIS (2026-10-28, Drogasmil e PromoFarma) e que DIVERGE da documentação:
//  - a resposta é só { data: Produto[] }: não há `count`; a última página é a que vem com menos de `limit` itens;
//  - `pricing[].price` e `listPrice` vêm em REAIS decimais (96.99), não em centavos;
//  - `categories` fica no PRODUTO, como [{ id, name }] com nomes em inglês (medicines, hygiene, health_beauty,
//    cosmetics, food_beverages, commerce_retail, industry_production...); na opção vem vazio;
//  - `options[].ean` veio preenchido (numérico) em 100% dos itens; `options[].brands` veio vazio.
// O `url` do produto é a página da loja, sem rastreio: o link rastreado exige o encurtador (escopo
// shortener:write), ainda não ligado; por isso `linkAfiliado` é false.
import type { HttpGetJson, OfertaBruta, ResultadoColeta, SourceAdapter } from './contrato.js';
import { HttpGravado } from './gravacoes.js';
import type { FabricaFonte } from './registro.js';

export interface ConfigLomadee {
  baseUrl: string;
  /** Ids das marcas (organizações) da Lomadee que o operador vinculou e aprovou. */
  organizacoes: string[];
  /** 1 a 100. */
  tamanhoPagina: number;
  maxPaginas: number;
  /** Categorias que não dizem nada sobre o produto (ex.: commerce_retail); ficam de fora na escolha da categoria. */
  categoriasGenericas: readonly string[];
  /**
   * Produto com várias variações (tamanho, cor) vira UMA oferta, a da variação disponível mais barata, com o nome do produto
   * (sem o da variação) e sem EAN. Sem isto, cada variação é um produto à parte (3.858 produtos da UP Kids viram 25 mil).
   */
  colapsarOpcoes?: boolean;
}

interface Pagina {
  data?: unknown;
}

export const CATEGORIAS_GENERICAS_PADRAO: readonly string[] = ['commerce_retail', 'industry_production', 'services'];

export class LomadeeAdapter implements SourceAdapter {
  readonly tipo = 'A' as const;

  constructor(
    private readonly http: HttpGetJson,
    private readonly config: ConfigLomadee,
  ) {}

  async coletar(): Promise<ResultadoColeta> {
    const resultado: ResultadoColeta = { ofertas: [], ilegiveis: [] };
    for (const org of this.config.organizacoes) {
      for (let pagina = 1; pagina <= this.config.maxPaginas; pagina++) {
        const url = new URL('affiliate/products', this.config.baseUrl);
        url.searchParams.set('organizationIds', org);
        url.searchParams.set('isAvailable', 'true');
        url.searchParams.set('page', String(pagina));
        url.searchParams.set('limit', String(this.config.tamanhoPagina));

        // A URL nunca entra em erro; o HttpReal já devolve só o host e o status.
        const corpo = (await this.http.get(url)) as Pagina;
        if (!Array.isArray(corpo.data)) {
          throw new Error(`Lomadee marca ${org} página ${pagina}: resposta fora do formato esperado`);
        }
        for (const [i, item] of corpo.data.entries()) {
          const lido = parseProduto(item, this.config.categoriasGenericas, this.config.colapsarOpcoes === true);
          resultado.ofertas.push(...lido.ofertas);
          for (const erro of lido.erros) resultado.ilegiveis.push({ referencia: `marca ${org} página ${pagina} item ${i}`, erro });
        }
        // Sem `count`: a última página é a que vem incompleta.
        if (corpo.data.length < this.config.tamanhoPagina) break;
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

/** Nome de uma categoria ou marca: aceita texto ou objeto com name/description. */
function nomeDe(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const campo of ['name', 'description', 'title']) {
      const t = o[campo];
      if (typeof t === 'string' && t.trim() !== '') return t.trim();
    }
  }
  return null;
}

/** Primeira categoria que diz algo sobre o produto; se só houver genéricas, a primeira delas. */
function escolherCategoria(produto: unknown, opcao: unknown, genericas: readonly string[]): string {
  const nomes = [produto, opcao]
    .flatMap((v) => (Array.isArray(v) ? v : []))
    .map(nomeDe)
    .filter((n): n is string => n !== null);
  return nomes.find((n) => !genericas.includes(n)) ?? nomes[0] ?? '';
}

/** Primeira foto https do produto ou da opção (a opção vale mais: é a variação que o preço descreve). */
export function escolherImagem(produto: unknown, opcao: unknown): string | null {
  for (const origem of [opcao, produto]) {
    const imagens = (origem as { images?: unknown } | null)?.images;
    if (!Array.isArray(imagens)) continue;
    for (const i of imagens) {
      const url = typeof i === 'string' ? i : (i as { url?: unknown } | null)?.url;
      if (typeof url === 'string' && /^https:\/\/[^\s]+$/.test(url.trim()) && url.trim().length <= 2048) return url.trim();
    }
  }
  return null;
}

function semHtml(html: unknown): string | null {
  if (typeof html !== 'string') return null;
  const t = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return t === '' ? null : t.slice(0, 1000);
}

/** Um produto da Lomadee vira uma oferta por opção (variação) com preço válido. */
export function parseProduto(
  item: unknown,
  categoriasGenericas: readonly string[] = CATEGORIAS_GENERICAS_PADRAO,
  colapsarOpcoes = false,
): { ofertas: OfertaBruta[]; erros: string[] } {
  const ofertas: OfertaBruta[] = [];
  const erros: string[] = [];
  try {
    const p = item as Record<string, unknown>;
    const id = texto(p.id, 'id');
    const nome = texto(p.name, 'name');
    const link = texto(p.url, 'url');
    const organizacao = texto(p.organizationId, 'organizationId');
    const opcoes = p.options;
    if (!Array.isArray(opcoes) || opcoes.length === 0) throw new Error('campo options ausente ou vazio');
    const descricao = semHtml(p.description);
    const colapsar = colapsarOpcoes && opcoes.length > 1;
    let escolhida: number | null = null;
    if (colapsar) {
      // A variação disponível de menor preço representa o produto.
      let menor = Infinity;
      for (const [i, bruta] of opcoes.entries()) {
        const o = bruta as Record<string, unknown>;
        const preco = (Array.isArray(o.pricing) ? (o.pricing as Array<Record<string, unknown>>) : [])[0]?.price;
        if (o.available === false || o.isAvailable === false || typeof preco !== 'number' || !(preco > 0) || preco >= menor) continue;
        menor = preco;
        escolhida = i;
      }
      if (escolhida === null) throw new Error('nenhuma opção disponível com preço válido');
    }
    for (const [i, bruta] of opcoes.entries()) {
      if (colapsar && i !== escolhida) continue;
      try {
        const o = bruta as Record<string, unknown>;
        const precos = Array.isArray(o.pricing) ? (o.pricing as Array<Record<string, unknown>>) : [];
        const preco = precos[0]?.price;
        // Preço em reais (decimal). Centavos = reais x 100, arredondado.
        if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0 || preco > 1_000_000) throw new Error('campo pricing[0].price ausente ou inválido');
        const nomeOpcao = typeof o.name === 'string' ? o.name.trim() : '';
        const ean = typeof o.ean === 'string' && /^[0-9]{8,14}$/.test(o.ean.trim()) ? o.ean.trim() : null;
        const marcas = Array.isArray(o.brands) ? o.brands : [];
        ofertas.push({
          idExterno: colapsar ? id : `${id}:${texto(o.id, 'options[].id')}`,
          titulo: !colapsar && nomeOpcao !== '' && !nome.toLowerCase().includes(nomeOpcao.toLowerCase()) ? `${nome} ${nomeOpcao}` : nome,
          descricao,
          gtin: colapsar ? null : ean,
          marca: nomeDe(marcas[0]),
          precoCentavos: Math.round(preco * 100),
          condicao: null,
          categoriaFonte: escolherCategoria(p.categories, o.categories, categoriasGenericas),
          lojaIdExterno: organizacao,
          link,
          imagemUrl: escolherImagem(p, o),
          // O url do produto não é link rastreado (exige o encurtador).
          linkAfiliado: false,
          disponivel: p.available !== false && o.available !== false,
          validaDe: null,
          validaAte: null,
          frete: { status: 'a_confirmar' },
        });
      } catch (err) {
        erros.push(`opção ${i}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    erros.push((err as Error).message);
  }
  return { ofertas, erros };
}

function inteiroEntre(v: unknown, campo: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error(`Config inválida da Lomadee: ${campo}`);
  return v;
}

export const fabricaLomadee: FabricaFonte = {
  adaptador: 'lomadee',
  tipo: 'A',
  credenciais: ['apiKey'],
  cabecalhos: (credenciais) => ({ 'x-api-key': credenciais.apiKey ?? '' }),
  urlTeste: (config) => new URL('affiliate/brands?page=1', String(config.baseUrl)),
  criar({ http, config, lojas }) {
    if (typeof config.baseUrl !== 'string') throw new Error('Config inválida da Lomadee: baseUrl');
    return new LomadeeAdapter(http, {
      baseUrl: config.baseUrl,
      organizacoes: [...lojas].sort(),
      tamanhoPagina: inteiroEntre(config.tamanhoPagina, 'tamanhoPagina', 1, 100),
      maxPaginas: inteiroEntre(config.maxPaginas, 'maxPaginas', 1, 1000),
      categoriasGenericas:
        Array.isArray(config.categoriasGenericas) && config.categoriasGenericas.every((c) => typeof c === 'string')
          ? (config.categoriasGenericas as string[])
          : CATEGORIAS_GENERICAS_PADRAO,
      colapsarOpcoes: config.colapsarOpcoes === true,
    });
  },
  httpGravado: (dir) => new HttpGravado(dir),
};
