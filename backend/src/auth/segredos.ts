// Código de login, token de sessão e seus hashes. O banco nunca guarda o valor em claro.
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Seis dígitos, uniformes (randomInt usa rejeição, sem viés de módulo). */
export function gerarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * HMAC com chave do servidor: seis dígitos têm só 10^6 valores, então um hash sem chave
 * seria revertido por força bruta se a tabela vazasse.
 */
export function hashCodigo(chave: Buffer, tenantId: string, email: string, codigo: string): Buffer {
  return createHmac('sha256', chave).update(`${tenantId}\n${email}\n${codigo}`).digest();
}

export function mesmoHash(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 256 bits aleatórios; SHA-256 sem chave basta porque o token não é adivinhável. */
export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}
