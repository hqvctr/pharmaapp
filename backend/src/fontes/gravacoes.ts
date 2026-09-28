// HttpGetJson que responde com arquivos gravados, para testes e para o critério de pronto.
// Mapeia ".../offer/_store/<loja>?page=<n>" para "<dir>/loja-<loja>-pagina-<n>.json".
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { HttpGetJson } from './contrato.js';

export class HttpGravado implements HttpGetJson {
  readonly pedidos: string[] = [];

  constructor(private readonly dir: string) {}

  async get(url: URL): Promise<unknown> {
    const loja = /\/offer\/_store\/([^/]+)$/.exec(url.pathname)?.[1];
    const pagina = url.searchParams.get('page');
    if (loja === undefined || pagina === null) throw new Error(`Sem gravação para o caminho ${url.pathname}`);
    const arquivo = path.join(this.dir, `loja-${decodeURIComponent(loja)}-pagina-${pagina}.json`);
    this.pedidos.push(path.basename(arquivo));
    return JSON.parse(await readFile(arquivo, 'utf8'));
  }
}
