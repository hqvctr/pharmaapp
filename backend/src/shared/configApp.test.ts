import { describe, expect, it } from 'vitest';
import { validarConfigApp } from './configApp.js';
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
    expect((await carregarConfigTenant('padrao')).app.nomeApp).toBe('economae');
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
    ['limite de taxa zerado', (a: any) => (a.limitesTaxa.configuracao.maximo = 0)],
  ])('recusa: %s', async (_nome, alterar) => {
    expect(await validar(alterar)).toThrow(/Config inválida: app\./);
  });
});
