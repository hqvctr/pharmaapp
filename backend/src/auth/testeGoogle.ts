// Chaves e tokens do Google fabricados para teste (par RSA local + JWT RS256 igual ao do Google). Não é um teste.
import { createSign, generateKeyPairSync, type JsonWebKey, type KeyObject } from 'node:crypto';

export const CLIENTE_GOOGLE_TESTE = '1234567890-abc.apps.googleusercontent.com';

export interface ParDeChaves {
  kid: string;
  privateKey: KeyObject;
  jwk: JsonWebKey & { kid: string };
}

export function parDeChaves(kid: string): ParDeChaves {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { kid, privateKey, jwk: { ...(publicKey.export({ format: 'jwk' }) as JsonWebKey), kid, alg: 'RS256', use: 'sig' } };
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** ID token assinado por `p`. `agora` fixa iat e exp; `conteudo` e `cabecalho` sobrescrevem (undefined remove o campo). */
export function emitirIdToken(p: ParDeChaves, agora: Date, conteudo: Record<string, unknown> = {}, cabecalho: Record<string, unknown> = {}): string {
  const t = Math.floor(agora.getTime() / 1000);
  const h = b64({ alg: 'RS256', kid: p.kid, typ: 'JWT', ...cabecalho });
  const c = b64({ iss: 'https://accounts.google.com', aud: CLIENTE_GOOGLE_TESTE, sub: '110169484474386276334', email: 'maria@example.com', email_verified: true, iat: t - 10, exp: t + 3600, ...conteudo });
  const s = createSign('RSA-SHA256').update(`${h}.${c}`).sign(p.privateKey).toString('base64url');
  return `${h}.${c}.${s}`;
}
