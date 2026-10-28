import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { carregarChaveCredenciais, cifrar, decifrar, type ChaveCredenciais } from './cifra.js';

const chave = (versao = 'v1'): ChaveCredenciais => ({ versao, chave: randomBytes(32) });

describe('cifra das credenciais (AES-256-GCM)', () => {
  it('cifra e decifra, e o texto cifrado não contém o segredo', () => {
    const k = chave();
    const s = cifrar('{"appToken":"SEGREDO-123"}', k, 'a:b');
    expect(s.textoCifrado.toString('latin1')).not.toContain('SEGREDO');
    expect(s.iv).toHaveLength(12);
    expect(s.tag).toHaveLength(16);
    expect(decifrar(s, [k], 'a:b')).toBe('{"appToken":"SEGREDO-123"}');
  });

  it('cada cifragem usa um IV novo', () => {
    const k = chave();
    expect(cifrar('x', k, 'a').iv.equals(cifrar('x', k, 'a').iv)).toBe(false);
  });

  it('linha trocada de lugar (AAD diferente) não decifra', () => {
    const k = chave();
    const s = cifrar('segredo', k, 'tenant1:fonteA');
    expect(() => decifrar(s, [k], 'tenant1:fonteB')).toThrow(/não pôde ser decifrada/);
  });

  it('dado alterado não decifra, e o erro não vaza o conteúdo', () => {
    const k = chave();
    const s = cifrar('segredo-longo', k, 'a');
    s.textoCifrado[0] = s.textoCifrado[0]! ^ 0xff;
    expect(() => decifrar(s, [k], 'a')).toThrow(/não pôde ser decifrada/);
    try { decifrar(s, [k], 'a'); } catch (e) { expect((e as Error).message).not.toContain('segredo'); }
  });

  it('chave errada não decifra', () => {
    const s = cifrar('segredo', chave(), 'a');
    expect(() => decifrar(s, [chave()], 'a')).toThrow(/não pôde ser decifrada/);
  });

  it('gira a chave: o segredo antigo continua legível pela versão antiga', () => {
    const antiga = chave('v1');
    const nova = chave('v2');
    const s = cifrar('segredo', antiga, 'a');
    expect(decifrar(s, [nova, antiga], 'a')).toBe('segredo');
    expect(() => decifrar(s, [nova], 'a')).toThrow(/versão v1 não disponível/);
  });

  describe('carregarChaveCredenciais', () => {
    it('lê 32 bytes em base64 e a versão', () => {
      const k = randomBytes(32).toString('base64');
      const c = carregarChaveCredenciais({ CREDENTIALS_KEY: k, CREDENTIALS_KEY_VERSION: 'v7' });
      expect(c.versao).toBe('v7');
      expect(c.chave).toHaveLength(32);
    });
    it('recusa ausente, curta e versão estranha', () => {
      expect(() => carregarChaveCredenciais({})).toThrow(/CREDENTIALS_KEY/);
      expect(() => carregarChaveCredenciais({ CREDENTIALS_KEY: randomBytes(16).toString('base64') })).toThrow(/32 bytes/);
      expect(() => carregarChaveCredenciais({ CREDENTIALS_KEY: randomBytes(32).toString('base64'), CREDENTIALS_KEY_VERSION: 'v 1!' })).toThrow(/VERSION/);
    });
  });
});
