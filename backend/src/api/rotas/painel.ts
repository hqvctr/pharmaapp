// Painel web do operador: arquivos estáticos de `painel/` servidos em /operador/ (sem build e sem biblioteca). A tela só fala com /v1/admin.
// Lista fixa de arquivos (nada de caminho vindo da requisição) e cabeçalhos de segurança: o painel mexe em preço de oferta e em triagem
// de medicamento, então não aceita script nem estilo que não seja dele, não é aberto em moldura e não vaza o endereço para fora.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';

const ARQUIVOS: Record<string, { arquivo: string; tipo: string }> = {
  '/operador/': { arquivo: 'index.html', tipo: 'text/html; charset=utf-8' },
  '/operador/painel.js': { arquivo: 'painel.js', tipo: 'text/javascript; charset=utf-8' },
  '/operador/logica.js': { arquivo: 'logica.js', tipo: 'text/javascript; charset=utf-8' },
  '/operador/painel.css': { arquivo: 'painel.css', tipo: 'text/css; charset=utf-8' },
};

export const CSP_PAINEL = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

export function rotasPainel(app: FastifyInstance, pasta = process.env.PAINEL_DIR ?? 'painel'): void {
  const raiz = path.resolve(pasta);
  const cache = new Map<string, Buffer>();
  app.get('/operador', async (_req, reply) => reply.redirect('/operador/', 301));
  for (const [rota, { arquivo, tipo }] of Object.entries(ARQUIVOS)) {
    app.get(rota, async (_req, reply) => {
      let corpo = cache.get(arquivo);
      if (corpo === undefined) {
        try {
          corpo = await readFile(path.join(raiz, arquivo));
        } catch {
          return reply.code(404).send({ codigo: 'nao_encontrado', mensagem: 'Painel não instalado neste servidor.' });
        }
        cache.set(arquivo, corpo);
      }
      return reply
        .header('Content-Type', tipo)
        .header('Content-Security-Policy', CSP_PAINEL)
        .header('X-Content-Type-Options', 'nosniff')
        .header('X-Frame-Options', 'DENY')
        .header('Referrer-Policy', 'no-referrer')
        .header('Cross-Origin-Opener-Policy', 'same-origin')
        .send(corpo);
    });
  }
}
