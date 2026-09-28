import { describe, expect, it } from 'vitest';
import { carregarConfigTenant } from '../../shared/tenantConfig.js';
import { validarPreferencias, type PreferenciasEntrada } from './preferencias.js';

const { app } = await carregarConfigTenant('padrao');
const base: PreferenciasEntrada = { categorias: ['limpeza'], ceps: ['01310100'], silencio: { inicio: '22:00', fim: '07:00' }, limiteDiario: 3 };

describe('validarPreferencias', () => {
  it('aceita preferência válida, inclusive silêncio que atravessa a meia-noite', () => {
    expect(validarPreferencias(base, app, false)).toBeNull();
  });

  it.each([
    ['categoria fora da config', { ...base, categorias: ['eletronicos'] }, false, 'CATEGORIA_DESCONHECIDA'],
    ['CEP do Rio de Janeiro', { ...base, ceps: ['20040002'] }, false, 'CEP_FORA_DA_REGIAO'],
    ['dois CEPs no plano gratuito', { ...base, ceps: ['01310100', '13560000'] }, false, 'LIMITE_DO_PLANO'],
    ['limite diário acima do máximo', { ...base, limiteDiario: 11 }, false, 'LIMITE_DIARIO_INVALIDO'],
    ['silêncio vazio', { ...base, silencio: { inicio: '22:00', fim: '22:00' } }, false, 'SILENCIO_INVALIDO'],
  ])('recusa %s', (_nome, p, premium, codigo) => {
    expect(validarPreferencias(p, app, premium)?.codigo).toBe(codigo);
  });

  it('premium pode ter até 3 CEPs', () => {
    expect(validarPreferencias({ ...base, ceps: ['01310100', '13560000', '14010000'] }, app, true)).toBeNull();
  });
});
