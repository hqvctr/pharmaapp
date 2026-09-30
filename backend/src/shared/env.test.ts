import { describe, expect, it } from 'vitest';
import { loadApiEnv } from './env.js';

const base = { AUTH_CODIGO_CHAVE: 'x'.repeat(40) };

describe('loadApiEnv', () => {
  it('desenvolvimento usa o log por padrão', () => {
    expect(loadApiEnv(base).email).toEqual({ modo: 'log' });
  });

  it('produção recusa o log', () => {
    expect(() => loadApiEnv({ ...base, NODE_ENV: 'production' })).toThrow(/EMAIL_MODO=brevo/);
  });

  it('brevo exige chave e remetente; cota padrão 280', () => {
    expect(() => loadApiEnv({ ...base, EMAIL_MODO: 'brevo', EMAIL_REMETENTE: 'a@b.com' })).toThrow('BREVO_API_KEY');
    expect(() => loadApiEnv({ ...base, EMAIL_MODO: 'brevo', BREVO_API_KEY: 'k' })).toThrow('EMAIL_REMETENTE');
    const env = loadApiEnv({ ...base, NODE_ENV: 'production', EMAIL_MODO: 'brevo', BREVO_API_KEY: 'k', EMAIL_REMETENTE: 'a@b.com' });
    expect(env.email).toEqual({ modo: 'brevo', apiKey: 'k', remetente: 'a@b.com', nomeRemetente: 'economae', limiteDiario: 280 });
  });

  it('recusa modo desconhecido e chave curta', () => {
    expect(() => loadApiEnv({ ...base, EMAIL_MODO: 'sendgrid' })).toThrow('EMAIL_MODO desconhecido');
    expect(() => loadApiEnv({ AUTH_CODIGO_CHAVE: 'curta' })).toThrow('32');
  });
});
