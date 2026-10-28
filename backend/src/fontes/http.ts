// HttpGetJson de produção: fetch com prazo, sem repetir e sem nunca pôr a URL numa mensagem de erro
// (a URL de várias fontes carrega o token).
import type { HttpGetJson, HttpPostJson } from './contrato.js';

export interface OpcoesHttp {
  userAgent: string;
  /** Prazo por pedido. */
  timeoutMs: number;
  /** Pausa antes de cada pedido, para respeitar o limite da fonte. */
  intervaloMs: number;
  /** Cabeçalhos fixos (ex.: chave de API em cabeçalho). Os valores nunca vão para log. */
  cabecalhos?: Readonly<Record<string, string>>;
}

export const PADRAO_HTTP: OpcoesHttp = { userAgent: 'economae-coletor/1.0', timeoutMs: 20_000, intervaloMs: 300 };

export class HttpReal implements HttpGetJson, HttpPostJson {
  constructor(
    private readonly opcoes: OpcoesHttp = PADRAO_HTTP,
    private readonly buscar: typeof fetch = fetch,
  ) {}

  async get(url: URL): Promise<unknown> {
    return this.pedir(url, {});
  }

  async post(url: URL, corpo: unknown): Promise<unknown> {
    return this.pedir(url, { method: 'POST', body: JSON.stringify(corpo), 'content-type': 'application/json' });
  }

  private async pedir(url: URL, extra: { method?: string; body?: string; 'content-type'?: string }): Promise<unknown> {
    if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1') throw new Error('Fonte só é consultada por https');
    if (this.opcoes.intervaloMs > 0) await new Promise((r) => setTimeout(r, this.opcoes.intervaloMs));
    let resposta: Response;
    try {
      resposta = await this.buscar(url, {
        method: extra.method ?? 'GET',
        ...(extra.body !== undefined ? { body: extra.body } : {}),
        headers: {
          Accept: 'application/json',
          'User-Agent': this.opcoes.userAgent,
          ...(extra['content-type'] !== undefined ? { 'Content-Type': extra['content-type'] } : {}),
          ...this.opcoes.cabecalhos,
        },
        signal: AbortSignal.timeout(this.opcoes.timeoutMs),
        redirect: 'error',
      });
    } catch (err) {
      const nome = (err as Error).name;
      throw new Error(nome === 'TimeoutError' ? `Fonte ${url.hostname}: sem resposta em ${this.opcoes.timeoutMs} ms` : `Fonte ${url.hostname}: falha de rede`);
    }
    if (!resposta.ok) throw new Error(`Fonte ${url.hostname}: HTTP ${resposta.status}`);
    try {
      return await resposta.json();
    } catch {
      throw new Error(`Fonte ${url.hostname}: resposta não é JSON`);
    }
  }
}
