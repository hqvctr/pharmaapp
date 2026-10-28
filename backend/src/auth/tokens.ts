// Tokens de sessão (opacos, 256 bits, guardados só como hash) e código de e-mail (6 dígitos, guardado só como HMAC).
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** 32 bytes em base64url: 43 caracteres. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function novoToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** Recusa antes de ir ao banco o que nunca pode ser um token nosso. */
export function pareceToken(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO_TOKEN.test(valor);
}

export function novoCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hmacCodigo(chave: Buffer, tenantId: string, email: string, codigo: string): string {
  return createHmac('sha256', chave).update(`${tenantId}|${email}|${codigo}`).digest('hex');
}

export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Identificador de e-mail para chaves de cache e de limite: o endereço não vai para o Redis em claro. */
export function chaveEmail(tenantId: string, email: string): string {
  return `${tenantId}:${createHash('sha256').update(email).digest('hex').slice(0, 32)}`;
}
