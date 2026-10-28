import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpReal } from './http.js';

let servidor: Server;
let porta: number;
const pedidos: Array<{ url: string; ua: string | undefined; accept: string | undefined; extra: string | undefined }> = [];

beforeAll(async () => {
  servidor = createServer((req, res) => {
    pedidos.push({ url: req.url ?? '', ua: req.headers['user-agent'], accept: req.headers.accept, extra: req.headers['x-chave'] as string | undefined });
    if (req.url?.startsWith('/ok')) { res.setHeader('content-type', 'application/json'); res.end('{"a":1}'); }
    else if (req.url?.startsWith('/erro')) { res.statusCode = 503; res.end('indisponível'); }
    else if (req.url?.startsWith('/html')) { res.end('<html>'); }
    else if (req.url?.startsWith('/redireciona')) { res.statusCode = 302; res.setHeader('location', 'https://outro.test/'); res.end(); }
    else if (req.url?.startsWith('/lento')) { setTimeout(() => res.end('{}'), 500); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  porta = (servidor.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));

const http = (extra = {}) => new HttpReal({ userAgent: 'teste/1', timeoutMs: 200, intervaloMs: 0, ...extra });
const url = (caminho: string) => new URL(`http://127.0.0.1:${porta}${caminho}`);

describe('HttpReal', () => {
  it('lê JSON e envia User-Agent, Accept e cabeçalhos fixos', async () => {
    const r = await http({ cabecalhos: { 'X-Chave': 'valor' } }).get(url('/ok?x=1'));
    expect(r).toEqual({ a: 1 });
    expect(pedidos.at(-1)).toMatchObject({ ua: 'teste/1', accept: 'application/json', extra: 'valor' });
  });

  it('erro HTTP vira mensagem com host e status, sem a URL nem o token', async () => {
    const e = await http().get(new URL(`http://127.0.0.1:${porta}/erro/TOKEN-SECRETO?chave=SEGREDO`)).catch((x: Error) => x);
    expect((e as Error).message).toBe('Fonte 127.0.0.1: HTTP 503');
  });

  it('resposta que não é JSON', async () => {
    await expect(http().get(url('/html'))).rejects.toThrow('resposta não é JSON');
  });

  it('prazo estourado', async () => {
    await expect(http().get(url('/lento'))).rejects.toThrow('sem resposta em 200 ms');
  });

  it('não segue redirecionamento (o token iria para outro host)', async () => {
    await expect(http().get(url('/redireciona'))).rejects.toThrow('falha de rede');
  });

  it('só https, exceto o próprio computador', async () => {
    await expect(http().get(new URL('http://exemplo.test/x'))).rejects.toThrow('só é consultada por https');
  });

  it('falha de rede não vaza a URL', async () => {
    const e = await http().get(new URL('http://127.0.0.1:1/x?token=ABC')).catch((x: Error) => x);
    expect((e as Error).message).toBe('Fonte 127.0.0.1: falha de rede');
  });
});
