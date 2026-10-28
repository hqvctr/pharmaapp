import { describe, expect, it } from 'vitest';
import { chaveEmail, hashToken, hmacCodigo, iguais, novoCodigo, novoToken, pareceToken } from './tokens.js';

describe('tokens', () => {
  it('token novo tem 43 caracteres base64url, é único e o hash bate', () => {
    const a = novoToken();
    const b = novoToken();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(hashToken(a.token).equals(a.hash)).toBe(true);
    expect(a.hash.length).toBe(32);
  });

  it.each([undefined, null, 5, '', 'curto', 'a'.repeat(44), `${'a'.repeat(42)}!`, "' OR 1=1 --"])('%s não parece token', (v) => {
    expect(pareceToken(v)).toBe(false);
  });

  it('código tem sempre 6 dígitos, com zeros à esquerda', () => {
    for (let i = 0; i < 2000; i++) expect(novoCodigo()).toMatch(/^[0-9]{6}$/);
  });

  it('HMAC do código depende de tenant, e-mail e código', () => {
    const k = Buffer.alloc(32, 7);
    const base = hmacCodigo(k, 't1', 'a@b.co', '123456');
    expect(hmacCodigo(k, 't1', 'a@b.co', '123456')).toBe(base);
    expect(hmacCodigo(k, 't2', 'a@b.co', '123456')).not.toBe(base);
    expect(hmacCodigo(k, 't1', 'x@b.co', '123456')).not.toBe(base);
    expect(hmacCodigo(k, 't1', 'a@b.co', '123457')).not.toBe(base);
    expect(hmacCodigo(Buffer.alloc(32, 8), 't1', 'a@b.co', '123456')).not.toBe(base);
  });

  it('comparação em tempo constante recusa tamanhos diferentes', () => {
    expect(iguais('abc', 'abc')).toBe(true);
    expect(iguais('abc', 'abd')).toBe(false);
    expect(iguais('abc', 'abcd')).toBe(false);
  });

  it('a chave de e-mail não contém o endereço', () => {
    expect(chaveEmail('t1', 'maria@exemplo.com')).not.toContain('maria');
    expect(chaveEmail('t1', 'maria@exemplo.com')).toBe(chaveEmail('t1', 'maria@exemplo.com'));
    expect(chaveEmail('t1', 'maria@exemplo.com')).not.toBe(chaveEmail('t2', 'maria@exemplo.com'));
  });
});
