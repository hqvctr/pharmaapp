// Toda operação dos contratos (openapi.yaml e admin.yaml) existe como rota, menos as que estão listadas aqui como pendentes.
// Se uma rota nova entra, ela sai da lista; se um contrato ganha operação, o teste falha até alguém decidir.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import { iguais } from '../auth/tokens.js';
import { buildApp } from './app.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const METODOS = ['get', 'put', 'post', 'delete', 'patch'];

function operacoes(arquivo: string): string[] {
  const out: string[] = [];
  let caminho: string | null = null;
  let dentroDePaths = false;
  for (const linha of readFileSync(path.join(RAIZ, 'openapi', arquivo), 'utf8').split('\n')) {
    if (/^paths:/.test(linha)) dentroDePaths = true;
    else if (/^\S/.test(linha) && dentroDePaths) dentroDePaths = false;
    if (!dentroDePaths) continue;
    const c = /^ {2}(\/\S+):\s*$/.exec(linha);
    if (c) caminho = c[1]!;
    const m = /^ {4}(get|put|post|delete|patch):\s*$/.exec(linha);
    if (m && caminho !== null && METODOS.includes(m[1]!)) out.push(`${m[1]!.toUpperCase()} ${caminho}`);
  }
  return out;
}

/** Operações do contrato que ainda não têm rota, com o motivo. */
const PENDENTES: Record<string, string> = {
  'POST /v1/auth/apple': 'só existe com o app de iPhone (metodos_login)',
  'POST /v1/assinatura/comprovantes': 'validação do comprovante nas lojas de apps (depende de conta de desenvolvedor)',
  'POST /v1/webhooks/{tenant}/google-play': 'webhook da loja de apps',
  'POST /v1/webhooks/{tenant}/app-store': 'webhook da loja de apps',
};

describe('rotas x contrato', () => {
  const app = buildApp({
    healthChecks: [],
    tenants: { obter: async () => null, porId: async () => null },
    links: { resolver: async () => ({ link: 'https://x', afiliado: false }) },
    auth: { db: {} as never, codigos: new CodigosMemoria(iguais), enviador: { enviarCodigo: async () => {} }, chaveHmac: Buffer.alloc(32, 1), agora: () => new Date() },
  });
  const todas = [...operacoes('openapi.yaml'), ...operacoes('admin.yaml')];

  it('o leitor acha as operações dos dois contratos', () => {
    expect(todas.length).toBeGreaterThan(50);
    expect(todas).toContain('POST /v1/admin/auth/email/codigo');
    expect(todas).toContain('GET /v1/alertas');
  });

  it('toda operação tem rota, exceto as pendentes (e estas não têm)', () => {
    const sem = todas.filter((op) => {
      const [metodo, caminho] = op.split(' ') as [string, string];
      return !app.hasRoute({ method: metodo as 'GET', url: caminho.replace(/\{(\w+)\}/g, ':$1') });
    });
    expect(sem.sort()).toEqual(Object.keys(PENDENTES).sort());
  });

  it('a lista de pendentes só tem operações que existem no contrato', () => {
    for (const op of Object.keys(PENDENTES)) expect(todas, op).toContain(op);
  });
});
