// Fonte TIPO A: API de afiliados da Lomadee (documentação: https://docs.lomadee.com.br/api-reference/introduction).
//
// Servidor https://api.lomadee.com.br, chave no cabeçalho `x-api-key` (escopos products:read e brands:read),
// produtos em GET /affiliate/products com page, limit (1 a 100), isAvailable e organizationIds. A resposta é
// { data: Produto[], count } (count = total que casa com o filtro). Cada produto tem `options`; cada opção
// tem `ean`, `pricing[{ listPrice, price }]` em CENTAVOS, `categories`, `brands`, `seller`. O limite é de 60
// pedidos por minuto por chave.
//
// O QUE AINDA É PRESUMIDO (a documentação não define; ver na primeira resposta real): a forma dos itens de
// `categories` e `brands` (aqui aceita texto ou objeto com `name`/`description`). O `url` do produto não é
// link rastreado: gerar o link de afiliado exige o encurtador (escopo shortener:write), ainda não ligado;
// por isso `linkAfiliado` é false.
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
}

interface Pagina {
  data?: unknown;
  count?: unknown;
}

export class LomadeeAdapter implements SourceAdapter {
  readonly tipo = 'A' as const;

  constructor(
    private readonly http: HttpGetJson,
    private readonly config: ConfigLomadee,
  ) {}

  async coletar(): Promise<ResultadoColeta> {
    const resultado: ResultadoColeta = { ofertas: [], ilegiveis: [] };
    for (const org of this.config.organizacoes) {
      let lidos = 0;
      for (let pagina = 1; pagina <= this.config.maxPaginas; pagina++) {
        const url = new URL('affiliate/products', this.config.baseUrl);
        url.searchParams.set('organizationIds', org);
        url.searchParams.set('isAvailable', 'true');
        url.searchParams.set('page', String(pagina));
        url.searchParams.set('limit', String(this.config.tamanhoPagina));

        // A URL nunca entra em erro; o HttpReal já devolve só o host e o status.
        const corpo = (await this.http.get(url)) as Pagina;
        if (!Array.isArray(corpo.data) || typeof corpo.count !== 'number') {
          throw new Error(`Lomadee marca ${org} página ${pagina}: resposta fora do formato esperado`);
        }
        for (const [i, item] of corpo.data.entries()) {
          const lido = parseProduto(item);
          resultado.ofertas.push(...lido.ofertas);
          for (const erro of lido.erros) resultado.ilegiveis.push({ referencia: `marca ${org} página ${pagina} item ${i}`, erro });
        }
        lidos += corpo.data.length;
        if (corpo.data.length === 0 || lidos >= corpo.count) break;
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
export function parseProduto(item: unknown): { ofertas: OfertaBruta[]; erros: string[] } {
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
    for (const [i, bruta] of opcoes.entries()) {
      try {
        const o = bruta as Record<string, unknown>;
        const precos = Array.isArray(o.pricing) ? (o.pricing as Array<Record<string, unknown>>) : [];
        const preco = precos[0]?.price;
        if (typeof preco !== 'number' || !Number.isInteger(preco) || preco <= 0) throw new Error('campo pricing[0].price ausente ou inválido');
        const nomeOpcao = typeof o.name === 'string' ? o.name.trim() : '';
        const ean = typeof o.ean === 'string' && /^[0-9]{8,14}$/.test(o.ean.trim()) ? o.ean.trim() : null;
        const categorias = Array.isArray(o.categories) ? o.categories : [];
        const marcas = Array.isArray(o.brands) ? o.brands : [];
        ofertas.push({
          idExterno: `${id}:${texto(o.id, 'options[].id')}`,
          titulo: nomeOpcao !== '' && !nome.toLowerCase().includes(nomeOpcao.toLowerCase()) ? `${nome} ${nomeOpcao}` : nome,
          descricao,
          gtin: ean,
          marca: nomeDe(marcas[0]),
          precoCentavos: preco,
          condicao: null,
          categoriaFonte: nomeDe(categorias[0]) ?? '',
          lojaIdExterno: organizacao,
          link,
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
  criar({ http, config, lojas }) {
    if (typeof config.baseUrl !== 'string') throw new Error('Config inválida da Lomadee: baseUrl');
    return new LomadeeAdapter(http, {
      baseUrl: config.baseUrl,
      organizacoes: [...lojas].sort(),
      tamanhoPagina: inteiroEntre(config.tamanhoPagina, 'tamanhoPagina', 1, 100),
      maxPaginas: inteiroEntre(config.maxPaginas, 'maxPaginas', 1, 1000),
    });
  },
  httpGravado: (dir) => new HttpGravado(dir),
};
