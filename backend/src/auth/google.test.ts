import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TokenGoogleInvalido, verificarIdTokenGoogle, type ChavesGoogle } from './google.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const outro = generateKeyPairSync('rsa', { modulusLength: 2048 });
const chaves: ChavesGoogle = { chave: async (kid) => (kid === 'k1' ? publicKey : null) };
const agora = new Date('2026-09-28T12:00:00Z');
const t = agora.getTime() / 1000;
const AUD = 'cliente-web.apps.googleusercontent.com';

const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(payload: Record<string, unknown>, cab: Record<string, unknown> = { alg: 'RS256', kid: 'k1' }, chave: KeyObject = privateKey): string {
  const dados = `${b64(cab)}.${b64(payload)}`;
  return `${dados}.${sign('sha256', Buffer.from(dados), chave).toString('base64url')}`;
}
const valido = { iss: 'https://accounts.google.com', aud: AUD, sub: '1234', email: 'Ana@Exemplo.com', email_verified: true, iat: t - 10, exp: t + 3600 };

describe('verificarIdTokenGoogle', () => {
  it('aceita token válido', async () => {
    expect(await verificarIdTokenGoogle(jwt(valido), [AUD], chaves, agora)).toEqual({ sub: '1234', email: 'Ana@Exemplo.com' });
  });

  it.each([
    ['audiência de outro app', jwt({ ...valido, aud: 'outro' })],
    ['emissor falso', jwt({ ...valido, iss: 'https://evil.example' })],
    ['expirado', jwt({ ...valido, exp: t - 120 })],
    ['e-mail não verificado', jwt({ ...valido, email_verified: false })],
    ['sem sub', jwt({ ...valido, sub: '' })],
    ['assinado por outra chave', jwt(valido, undefined, outro.privateKey)],
    ['kid desconhecido', jwt(valido, { alg: 'RS256', kid: 'k9' })],
    ['alg none', `${b64({ alg: 'none', kid: 'k1' })}.${b64(valido)}.`],
    ['payload adulterado', (() => { const [h, , s] = jwt(valido).split('.'); return `${h}.${b64({ ...valido, sub: '999' })}.${s}`; })()],
    ['lixo', 'abc'],
  ])('recusa: %s', async (_nome, token) => {
    await expect(verificarIdTokenGoogle(token, [AUD], chaves, agora)).rejects.toBeInstanceOf(TokenGoogleInvalido);
  });
});
