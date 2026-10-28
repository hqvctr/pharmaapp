// HttpGetJson que responde com arquivos gravados, para testes e para o critério de pronto.
// Mapeia ".../affiliate/products?organizationIds=<org>&page=<n>" para "<dir>/org-<org>-pagina-<n>.json".
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { HttpGetJson } from './contrato.js';

export class HttpGravado implements HttpGetJson {
  readonly pedidos: string[] = [];

  constructor(private readonly dir: string) {}

  async get(url: URL): Promise<unknown> {
    const org = url.searchParams.get('organizationIds');
    const pagina = url.searchParams.get('page');
    if (!url.pathname.endsWith('/affiliate/products') || org === null || pagina === null) {
      throw new Error(`Sem gravação para o caminho ${url.pathname}`);
    }
    const arquivo = path.join(this.dir, `org-${org}-pagina-${pagina}.json`);
    this.pedidos.push(path.basename(arquivo));
    return JSON.parse(await readFile(arquivo, 'utf8'));
  }
}
