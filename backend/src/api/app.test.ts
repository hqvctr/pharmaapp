import { describe, expect, it } from 'vitest';
import { buildApp, type HealthCheck } from './app.js';

const ok = (name: string): HealthCheck => ({ name, check: async () => {} });
const failing = (name: string): HealthCheck => ({
  name,
  check: async () => {
    throw new Error('down');
  },
});

describe('GET /health', () => {
  it('responde 200 quando banco e redis respondem', async () => {
    const app = buildApp({ healthChecks: [ok('postgres'), ok('redis')] });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', checks: { postgres: 'ok', redis: 'ok' } });
  });

  it('responde 503 e aponta a dependência que caiu', async () => {
    const app = buildApp({ healthChecks: [ok('postgres'), failing('redis')] });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'degraded', checks: { postgres: 'ok', redis: 'error' } });
  });
});
