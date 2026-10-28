import { describe, expect, it, vi } from 'vitest';
import { CLIENTE_GOOGLE_TESTE, emitirIdToken, parDeChaves, type ParDeChaves } from './testeGoogle.js';
import { ChavesGoogleIndisponiveis, TokenGoogleInvalido, VerificadorGoogleJwks, buscarChavesDoGoogle, type ChavesBuscadas } from './google.js';

const CLIENTE = CLIENTE_GOOGLE_TESTE;
const AGORA = new Date('2026-10-28T15:00:00Z');
const t = Math.floor(AGORA.getTime() / 1000);
const par = parDeChaves;
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const emitir = (p: ParDeChaves, conteudo: Record<string, unknown> = {}, cabecalho: Record<string, unknown> = {}) => emitirIdToken(p, AGORA, conteudo, cabecalho);
const A = par('chave-a');
const B = par('chave-b');

const opcoes = { audiencias: [CLIENTE] };
const chaves = (...ps: Array<ParDeChaves>): ChavesBuscadas => ({ chaves: ps.map((p) => p.jwk), validadeSegundos: 3600 });
const verificador = (buscar = vi.fn(async () => chaves(A)), agora = () => AGORA) => ({ v: new VerificadorGoogleJwks(buscar, agora), buscar });

describe('verificação do ID token do Google', () => {
  it('aceita token válido e devolve sub, e-mail e se está verificado', async () => {
    const { v } = verificador();
    expect(await v.verificar(emitir(A), opcoes)).toEqual({ sub: '110169484474386276334', email: 'maria@example.com', emailVerificado: true });
    expect(await v.verificar(emitir(A, { email_verified: 'true', iss: 'accounts.google.com' }), opcoes)).toMatchObject({ emailVerificado: true });
    expect(await v.verificar(emitir(A, { email: undefined, email_verified: undefined }), opcoes)).toEqual({ sub: '110169484474386276334', email: null, emailVerificado: false });
    expect(await v.verificar(emitir(A, { email_verified: false }), opcoes)).toMatchObject({ emailVerificado: false });
    expect(await v.verificar(emitir(A, { aud: ['outro', CLIENTE] }), opcoes)).toMatchObject({ sub: expect.any(String) });
  });

  it.each([
    ['assinatura de outra chave', () => emitir({ ...B, kid: 'chave-a' })],
    ['conteúdo adulterado', () => { const [h, , s] = emitir(A).split('.'); return `${h}.${b64({ iss: 'https://accounts.google.com', aud: CLIENTE, sub: 'outro', iat: t, exp: t + 3600 })}.${s}`; }],
    ['algoritmo none', () => { const [, c] = emitir(A).split('.'); return `${b64({ alg: 'none', kid: 'chave-a' })}.${c}.`; }],
    ['algoritmo HS256', () => emitir(A, {}, { alg: 'HS256' })],
    ['sem kid', () => emitir(A, {}, { kid: undefined })],
    ['kid desconhecido', () => emitir({ ...A, kid: 'nao-existe' })],
    ['emissor errado', () => emitir(A, { iss: 'https://evil.example.com' })],
    ['audiência de outro cliente', () => emitir(A, { aud: 'outro.apps.googleusercontent.com' })],
    ['sem audiência', () => emitir(A, { aud: undefined })],
    ['vencido', () => emitir(A, { exp: t - 31 })],
    ['emitido no futuro', () => emitir(A, { iat: t + 600 })],
    ['sem sub', () => emitir(A, { sub: undefined })],
    ['sub vazio', () => emitir(A, { sub: '' })],
    ['sem exp', () => emitir(A, { exp: undefined })],
    ['formato', () => 'abc.def'],
    ['lixo', () => 'a.b.c'],
  ])('recusa: %s', async (_nome, fazer) => {
    const { v } = verificador();
    await expect(v.verificar(fazer(), opcoes)).rejects.toBeInstanceOf(TokenGoogleInvalido);
  });

  it('tolera 30 s de relógio e nada além', async () => {
    const { v } = verificador();
    await expect(v.verificar(emitir(A, { exp: t - 20 }), opcoes)).resolves.toBeDefined();
    await expect(v.verificar(emitir(A, { iat: t + 20 }), opcoes)).resolves.toBeDefined();
  });

  it('nonce: quando o app manda, o token precisa trazer o mesmo; quando não manda, não se exige', async () => {
    const { v } = verificador();
    await expect(v.verificar(emitir(A, { nonce: 'abc' }), { ...opcoes, nonce: 'abc' })).resolves.toBeDefined();
    await expect(v.verificar(emitir(A, { nonce: 'abc' }), { ...opcoes, nonce: 'xyz' })).rejects.toBeInstanceOf(TokenGoogleInvalido);
    await expect(v.verificar(emitir(A), { ...opcoes, nonce: 'abc' })).rejects.toBeInstanceOf(TokenGoogleInvalido);
    await expect(v.verificar(emitir(A, { nonce: 'abc' }), opcoes)).resolves.toBeDefined();
  });

  it('guarda as chaves pela validade e só busca de novo depois dela', async () => {
    let agora = AGORA;
    const { v, buscar } = verificador(vi.fn(async () => chaves(A)), () => agora);
    await v.verificar(emitir(A), opcoes);
    await v.verificar(emitir(A), opcoes);
    expect(buscar).toHaveBeenCalledTimes(1);
    agora = new Date(AGORA.getTime() + 3601_000);
    await v.verificar(emitir(A, { iat: t + 3600, exp: t + 7200 }), opcoes);
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('kid novo (rotação) busca de novo, mas no máximo uma vez por minuto', async () => {
    let agora = AGORA;
    let atual = chaves(A);
    const { v, buscar } = verificador(vi.fn(async () => atual), () => agora);
    await v.verificar(emitir(A), opcoes);
    atual = chaves(A, B);
    // Logo depois da primeira busca, um kid desconhecido não gera outra busca.
    await expect(v.verificar(emitir(B), opcoes)).rejects.toBeInstanceOf(TokenGoogleInvalido);
    expect(buscar).toHaveBeenCalledTimes(1);
    agora = new Date(AGORA.getTime() + 61_000);
    await expect(v.verificar(emitir(B, { iat: t + 61, exp: t + 3700 }), opcoes)).resolves.toBeDefined();
    expect(buscar).toHaveBeenCalledTimes(2);
    // Mil kids aleatórios seguidos: uma busca, no máximo.
    for (let i = 0; i < 20; i += 1) await expect(v.verificar(emitir({ ...A, kid: `x${i}` }, { iat: t + 61, exp: t + 3700 }), opcoes)).rejects.toBeInstanceOf(TokenGoogleInvalido);
    expect(buscar.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('sem conseguir buscar as chaves: erro de indisponibilidade; com chaves antigas, segue com elas', async () => {
    const semRede = verificador(vi.fn(async () => { throw new ChavesGoogleIndisponiveis('sem resposta'); }));
    await expect(semRede.v.verificar(emitir(A), opcoes)).rejects.toBeInstanceOf(ChavesGoogleIndisponiveis);

    let agora = AGORA;
    let cai = false;
    const { v } = verificador(vi.fn(async () => { if (cai) throw new ChavesGoogleIndisponiveis('x'); return chaves(A); }), () => agora);
    await v.verificar(emitir(A), opcoes);
    cai = true;
    agora = new Date(AGORA.getTime() + 3601_000);
    await expect(v.verificar(emitir(A, { iat: t + 3600, exp: t + 7200 }), opcoes)).resolves.toBeDefined();
  });

  it('busca no endereço do Google e lê a validade do Cache-Control', async () => {
    const chamadas: string[] = [];
    const f = (async (url: string) => {
      chamadas.push(String(url));
      return new Response(JSON.stringify({ keys: [A.jwk] }), { status: 200, headers: { 'cache-control': 'public, max-age=21600, must-revalidate' } });
    }) as unknown as typeof fetch;
    const r = await buscarChavesDoGoogle(f);
    expect(chamadas).toEqual(['https://www.googleapis.com/oauth2/v3/certs']);
    expect(r.validadeSegundos).toBe(21600);
    expect(r.chaves).toHaveLength(1);
    await expect(buscarChavesDoGoogle((async () => new Response('x', { status: 500 })) as unknown as typeof fetch)).rejects.toBeInstanceOf(ChavesGoogleIndisponiveis);
    await expect(buscarChavesDoGoogle((async () => new Response('{"a":1}', { status: 200 })) as unknown as typeof fetch)).rejects.toBeInstanceOf(ChavesGoogleIndisponiveis);
    await expect(buscarChavesDoGoogle((async () => { throw new Error('rede'); }) as unknown as typeof fetch)).rejects.toBeInstanceOf(ChavesGoogleIndisponiveis);
  });
});
