import { describe, expect, it } from 'vitest';
import { metodosLoginOferecidos, validarConfigApp } from './configApp.js';
import { carregarConfigTenant } from './tenantConfig.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DIR_CONFIG } from './tenantConfig.js';

const bruto = () => JSON.parse(readFileSync(path.join(DIR_CONFIG, 'tenants', 'padrao.json'), 'utf8'));

async function validar(alterar: (app: any) => void) {
  const b = bruto();
  alterar(b.app);
  const c = await carregarConfigTenant('padrao');
  return () => validarConfigApp(b.app, c.curadoria, b.medicamentos.categoria);
}

describe('config do app (bloco `app` do tenant)', () => {
  it('o padrão carrega', async () => {
    const app = (await carregarConfigTenant('padrao')).app;
    expect(app.nomeApp).toBe('economae');
    expect(app.ofertaManual.validadePadraoDias).toBe(7); // D21
    expect(app.operador.refreshDias).toBe(7); // D3
  });

  it('as quatro categorias do app, com as subcategorias, na ordem do KV', async () => {
    const app = (await carregarConfigTenant('padrao')).app;
    expect(app.categorias.map((c) => c.slug)).toEqual(['gestacao', 'mamae', 'bebe', 'infantil']);
    expect(app.categorias.find((c) => c.slug === 'bebe')!.subcategorias.map((s) => s.slug)).toContain('fraldas');
  });

  it('subcategoria repetida, sem rótulo ou fora de lista é recusada; categoria sem subcategorias vale', async () => {
    expect(await validar((a) => a.categorias[0].subcategorias.push({ ...a.categorias[0].subcategorias[0] }))).toThrow(/subcategorias\[3\]\.slug/);
    expect(await validar((a) => a.categorias[0].subcategorias.push({ slug: 'nova', rotulo: '' }))).toThrow(/rotulo/);
    expect(await validar((a) => { a.categorias[0].subcategorias = 'x'; })).toThrow(/categorias\[0\]\.subcategorias/);
    expect(await validar((a) => { delete a.categorias[0].subcategorias; })).not.toThrow();
  });

  it('categoria de medicamento no app é recusada', async () => {
    const v = await validar((a) => a.categorias.push({ slug: 'medicamentos_isentos', rotulo: 'Remédios' }));
    expect(v).toThrow(/medicamento fica fora do app/);
  });

  it('categoria que o motor não conhece é recusada', async () => {
    expect(await validar((a) => a.categorias.push({ slug: 'brinquedos', rotulo: 'Brinquedos' }))).toThrow(/não existe em curadoria/);
  });

  it.each([
    ['site com barra no fim', (a: any) => (a.urlSite = 'https://exemplo.com/')],
    ['site sem https', (a: any) => (a.urlSite = 'http://exemplo.com')],
    ['caminho sem barra', (a: any) => (a.termos.caminho = 'termos.html')],
    ['versão mínima fora do padrão', (a: any) => (a.versaoMinima.android = '1.0')],
    ['CEPs invertidos', (a: any) => (a.regiao = { cepInicio: '19999999', cepFim: '01000000' })],
    ['3 CEPs no máximo no premium', (a: any) => (a.limites.cepsPremium = 4)],
    ['gratuito maior que premium', (a: any) => (a.limites.cepsGratuito = 3, a.limites.cepsPremium = 2)],
    ['método de login desconhecido', (a: any) => (a.metodosLogin = ['email', 'sms'])],
    ['sem método de login', (a: any) => (a.metodosLogin = [])],
    ['clientIds do Google não é lista', (a: any) => (a.google = { clientIds: 'x' })],
    ['clientId do Google fora do formato', (a: any) => (a.google = { clientIds: ['abc'] })],
    ['clientId do Google repetido', (a: any) => (a.google = { clientIds: ['1-a.apps.googleusercontent.com', '1-a.apps.googleusercontent.com'] })],
    ['clientId do Google que não é texto', (a: any) => (a.google = { clientIds: [5] })],
    ['mais de 5 clientIds do Google', (a: any) => (a.google = { clientIds: [1, 2, 3, 4, 5, 6].map((n) => `${n}-a.apps.googleusercontent.com`) })],
    ['prazo padrão da oferta manual zerado', (a: any) => (a.ofertaManual = { validadePadraoDias: 0 })],
    ['prazo padrão da oferta manual acima de 90 dias', (a: any) => (a.ofertaManual = { validadePadraoDias: 91 })],
    ['limite de taxa zerado', (a: any) => (a.limitesTaxa.configuracao.maximo = 0)],
  ])('recusa: %s', async (_nome, alterar) => {
    expect(await validar(alterar)).toThrow(/Config inválida: app\./);
  });

  it('sem `google` no bloco, nenhum cliente; o Google só é oferecido com cliente OAuth', async () => {
    const b = bruto();
    delete b.app.google;
    const c = await carregarConfigTenant('padrao');
    const app = validarConfigApp(b.app, c.curadoria, b.medicamentos.categoria);
    expect(app.google.clientIds).toEqual([]);
    expect(app.metodosLogin).toContain('google');
    expect(metodosLoginOferecidos(app)).toEqual(['email']);
    expect(metodosLoginOferecidos({ ...app, google: { clientIds: ['1-a.apps.googleusercontent.com'] } })).toEqual(['email', 'google']);
  });
});
