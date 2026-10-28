import { describe, expect, it } from 'vitest';
import type { HttpGetJson } from './contrato.js';
import { adaptadoresRegistrados, fabricaDo, registrarFabrica, validarCredenciais } from './registro.js';

const http: HttpGetJson = { get: async () => ({}) };

describe('registro de fontes', () => {
  it('a Lomadee está registrada, é TIPO A e exige só a apiKey', () => {
    const f = fabricaDo('lomadee');
    expect(f.tipo).toBe('A');
    expect([...f.credenciais]).toEqual(['apiKey']);
    expect(adaptadoresRegistrados()).toContain('lomadee');
  });

  it('adaptador desconhecido lista os registrados no erro', () => {
    expect(() => fabricaDo('inexistente')).toThrow(/desconhecido: inexistente \(registrados: .*lomadee/);
  });

  it('registrar duas vezes o mesmo adaptador falha', () => {
    expect(() => registrarFabrica(fabricaDo('lomadee'))).toThrow(/já registrado/);
  });

  it('um segundo canal entra só registrando uma fábrica', () => {
    registrarFabrica({
      adaptador: 'canal-de-teste',
      tipo: 'A',
      credenciais: ['chave'],
      criar: () => ({ tipo: 'A', coletar: async () => ({ ofertas: [], ilegiveis: [] }) }),
    });
    const f = fabricaDo('canal-de-teste');
    expect(f.criar({ http, config: {}, credenciais: { chave: 'x' }, lojas: [] }).tipo).toBe('A');
  });

  describe('credenciais', () => {
    it('faltando ou vazio recusa, nomeando só os campos (nunca valores)', () => {
      const f = fabricaDo('lomadee');
      expect(() => validarCredenciais(f, {})).toThrow('Credenciais ausentes para lomadee: apiKey');
      expect(() => validarCredenciais(f, { apiKey: '' })).toThrow(/apiKey/);
      expect(() => validarCredenciais(f, { apiKey: 'lmd_x' })).not.toThrow();
    });
  });

  describe('fábrica da Lomadee', () => {
    const f = fabricaDo('lomadee');
    const base = { baseUrl: 'https://api.exemplo.test/', tamanhoPagina: 100, maxPaginas: 5 };
    it('monta o adaptador com as lojas ordenadas', () => {
      const a = f.criar({ http, config: base, credenciais: { apiKey: 't' }, lojas: ['9002', '9001'] });
      expect(a.tipo).toBe('A');
    });
    it('config inválida falha com o nome do campo', () => {
      expect(() => f.criar({ http, config: { ...base, baseUrl: 5 }, credenciais: {}, lojas: [] })).toThrow(/baseUrl/);
      expect(() => f.criar({ http, config: { ...base, maxPaginas: 0 }, credenciais: {}, lojas: [] })).toThrow(/maxPaginas/);
    });
  });
});
