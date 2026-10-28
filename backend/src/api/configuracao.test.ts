import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import type { RegistroTenants, TenantAtivo } from './tenants.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';

let padrao: TenantAtivo;
beforeAll(async () => {
  padrao = { id: '11111111-1111-4111-8111-111111111111', slug: 'padrao', config: await carregarConfigTenant('padrao') };
});

const registro = (): RegistroTenants => ({ obter: async (slug) => (slug === 'padrao' ? padrao : null) });
const nova = (extra = {}) => buildApp({ healthChecks: [], tenants: registro(), ...extra });
const get = (app: ReturnType<typeof nova>, headers: Record<string, string> = { 'x-tenant': 'padrao' }) =>
  app.inject({ method: 'GET', url: '/v1/configuracao', headers });

describe('GET /v1/configuracao', () => {
  it('devolve a forma do contrato, em snake_case, com URLs montadas a partir do site do tenant', async () => {
    const res = await get(nova());
    expect(res.statusCode).toBe(200);
    const c = res.json();
    expect(Object.keys(c).sort()).toEqual(
      ['categorias', 'fuso', 'limites', 'metodos_login', 'nome_app', 'planos', 'privacidade', 'regiao', 'tenant', 'termos', 'versao_minima'].sort(),
    );
    expect(c.tenant).toBe('padrao');
    expect(c.termos.url).toBe(`${padrao.config.app.urlSite}/termos.html`);
    expect(c.privacidade.url).toBe(`${padrao.config.app.urlSite}/privacidade.html`);
    expect(c.regiao).toEqual({ cep_inicio: '01000000', cep_fim: '19999999' });
    expect(Object.keys(c.limites).sort()).toEqual(
      ['ceps_gratuito', 'ceps_premium', 'limite_diario_padrao', 'max_produtos_seguidos', 'max_silenciamentos', 'queda_percentual_max', 'queda_percentual_min'].sort(),
    );
    expect(c.versao_minima).toEqual({ android: null, ios: null });
    expect(c.planos).toEqual([]);
  });

  it('não oferece medicamento nem expõe config interna do tenant', async () => {
    const texto = (await get(nova())).body;
    expect(texto).not.toContain('medicamentos_isentos');
    for (const interno of ['curadoria', 'nbcal', 'triagemPorNome', 'lomadee', 'limiarQueda', 'scoreMinimo']) {
      expect(texto).not.toContain(interno);
    }
  });

  it('manda no-store e Vary em toda resposta, inclusive de erro', async () => {
    for (const res of [await get(nova()), await get(nova(), {})]) {
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['vary']).toBe('X-Tenant, Authorization');
    }
  });

  it('sem X-Tenant: 400 tenant_ausente', async () => {
    const res = await get(nova(), {});
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ codigo: 'tenant_ausente', mensagem: 'Cabeçalho X-Tenant ausente.' });
  });

  it.each(['outro', 'Padrao', 'padrao;drop', 'a'.repeat(65)])('tenant %s: 404 tenant_desconhecido', async (slug) => {
    const res = await get(nova(), { 'x-tenant': slug });
    expect(res.statusCode).toBe(404);
    expect(res.json().codigo).toBe('tenant_desconhecido');
  });

  it('passou do limite: 429 muitas_requisicoes com Retry-After, e o limite é por IP', async () => {
    let agora = 0;
    const app = nova({ limitador: new LimitadorMemoria(() => agora) });
    const { maximo, janelaSegundos } = padrao.config.app.limitesTaxa.configuracao!;
    for (let i = 0; i < maximo; i++) expect((await get(app)).statusCode).toBe(200);
    const barrada = await get(app);
    expect(barrada.statusCode).toBe(429);
    expect(barrada.json().codigo).toBe('muitas_requisicoes');
    expect(barrada.headers['retry-after']).toBe(String(janelaSegundos));

    const outroIp = await app.inject({ method: 'GET', url: '/v1/configuracao', headers: { 'x-tenant': 'padrao' }, remoteAddress: '10.0.0.9' });
    expect(outroIp.statusCode).toBe(200);

    agora = janelaSegundos * 1000 + 1;
    expect((await get(app)).statusCode).toBe(200);
  });

  it('Redis fora do ar: a configuração continua abrindo (falha aberta)', async () => {
    const app = nova({ limitador: { usar: async () => { throw new Error('redis caiu'); } } });
    expect((await get(app)).statusCode).toBe(200);
  });

  it('só confia no X-Forwarded-For quando a API está atrás de proxy confiável', async () => {
    const h = { 'x-tenant': 'padrao', 'x-forwarded-for': '203.0.113.7' };
    const semProxy = nova({ limitador: { usar: async (c: string) => (c.endsWith('203.0.113.7') ? 1 : null) } });
    expect((await semProxy.inject({ method: 'GET', url: '/v1/configuracao', headers: h })).statusCode).toBe(200);
    const comProxy = nova({ trustProxy: true, limitador: { usar: async (c: string) => (c.endsWith('203.0.113.7') ? 1 : null) } });
    expect((await comProxy.inject({ method: 'GET', url: '/v1/configuracao', headers: h })).statusCode).toBe(429);
  });
});

describe('erros do contrato', () => {
  it('rota inexistente: 404 nao_encontrado no formato Erro', async () => {
    const res = await nova().inject({ method: 'GET', url: '/v1/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ codigo: 'nao_encontrado', mensagem: 'Não encontrado.' });
  });

  it('falha inesperada: 500 erro_interno sem vazar a causa', async () => {
    const app = buildApp({
      healthChecks: [],
      tenants: { obter: async () => { throw new Error('senha do banco: segredo'); } },
    });
    const res = await get(app);
    expect(res.statusCode).toBe(500);
    expect(res.json().codigo).toBe('erro_interno');
    expect(res.body).not.toContain('segredo');
  });

  it('JSON ilegível: 400 requisicao_malformada, não 500', async () => {
    const app = nova();
    app.post('/teste', async () => ({}));
    const res = await app.inject({ method: 'POST', url: '/teste', headers: { 'content-type': 'application/json' }, payload: '{quebrado' });
    expect(res.statusCode).toBe(400);
    expect(res.json().codigo).toBe('requisicao_malformada');
  });
});
