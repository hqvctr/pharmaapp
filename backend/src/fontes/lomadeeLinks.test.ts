import { describe, expect, it } from 'vitest';
import type { HttpPostJson } from './contrato.js';
import { encurtadorDaConfig, EncurtadorLomadee, escolherLink, MarcaNaoPermitidaError, SemCanalError } from './lomadeeLinks.js';

const cfg = { dominios: ['lmdee.link'] };
const ORG = 'd855f505-7e26-4961-a182-c2139aeadd2c';

describe('link rastreado da Lomadee', () => {
  it('lista vazia = conta sem canal, com mensagem que diz o que fazer', () => {
    expect(() => escolherLink([], cfg)).toThrow(SemCanalError);
    expect(() => escolherLink([], cfg)).toThrow(/canal/);
  });

  it('pega o primeiro link de domínio aceito', () => {
    expect(escolherLink([{ id: 'c1', shortUrls: ['https://lmdee.link/abc'] }], cfg)).toBe('https://lmdee.link/abc');
    expect(escolherLink([{ id: 'c1', shortUrls: ['https://staging.lmdee.link/abc'] }], cfg)).toBe('https://staging.lmdee.link/abc');
  });

  it('recusa domínio fora da lista, http e texto que não é URL', () => {
    expect(() => escolherLink([{ shortUrls: ['https://malicioso.test/x'] }], cfg)).toThrow(/nenhum link válido/);
    expect(() => escolherLink([{ shortUrls: ['http://lmdee.link/x'] }], cfg)).toThrow(/nenhum link válido/);
    expect(() => escolherLink([{ shortUrls: ['não é url'] }], cfg)).toThrow(/nenhum link válido/);
    expect(() => escolherLink([{ shortUrls: ['https://lmdee.link.malicioso.test/x'] }], cfg)).toThrow(/nenhum link válido/);
  });

  it('resposta real da Lomadee (2026-10-28, canal economae): campos extras são ignorados e o canal bate pelo id', () => {
    const real = [
      {
        id: '7633b2c1-98a7-45c9-adea-e529dc67cc87',
        name: 'economae',
        availableChannel: { id: '66222f2a-8ee8-423c-95e5-1c17de911f31', name: 'PriceComparator' },
        shortUrls: ['https://lmdee.link/xdi8N5UFbSkh'],
      },
    ];
    expect(escolherLink(real, { ...cfg, canalId: '7633b2c1-98a7-45c9-adea-e529dc67cc87' })).toBe('https://lmdee.link/xdi8N5UFbSkh');
    // O id de availableChannel é o do TIPO de canal, não o do canal: configurá-lo por engano não pega link nenhum.
    expect(() => escolherLink(real, { ...cfg, canalId: '66222f2a-8ee8-423c-95e5-1c17de911f31' })).toThrow();
  });

  it('com canal configurado, só usa aquele canal', () => {
    const corpo = [{ id: 'a', shortUrls: ['https://lmdee.link/a'] }, { id: 'b', shortUrls: ['https://lmdee.link/b'] }];
    expect(escolherLink(corpo, { ...cfg, canalId: 'b' })).toBe('https://lmdee.link/b');
    expect(() => escolherLink(corpo, { ...cfg, canalId: 'z' })).toThrow();
  });

  it('mostra a mensagem de bloqueio da Lomadee quando não há link', () => {
    expect(() => escolherLink([{ id: 'a', shortUrls: [], message: 'domínio não permitido' }], cfg)).toThrow(/domínio não permitido/);
  });

  it('formato inesperado', () => {
    expect(() => escolherLink({ erro: 1 }, cfg)).toThrow(/formato/);
  });

  it('envia só marca, tipo e URL (nenhum identificador de pessoa) e valida a entrada', async () => {
    const enviados: unknown[] = [];
    const http: HttpPostJson = { post: async (_u, corpo) => { enviados.push(corpo); return [{ id: 'c', shortUrls: ['https://lmdee.link/z'] }]; } };
    const e = new EncurtadorLomadee(http, { baseUrl: 'https://api.lomadee.com.br/', dominios: ['lmdee.link'], marcasPermitidas: [ORG] });
    expect(await e.linkRastreado(ORG, 'https://www.drogasmil.com.br/x/p')).toBe('https://lmdee.link/z');
    expect(enviados).toEqual([{ organizationId: ORG, type: 'Custom', url: 'https://www.drogasmil.com.br/x/p' }]);
    await expect(e.linkRastreado('x', 'https://a.test')).rejects.toThrow(/organizationId/);
    await expect(e.linkRastreado(ORG, 'http://a.test')).rejects.toThrow(/https/);
  });

  it('marca fora da lista (ex.: Drogaria Rosário, que não aceita Comparador de Preços) nem chega à Lomadee', async () => {
    let chamadas = 0;
    const http: HttpPostJson = { post: async () => { chamadas += 1; return []; } };
    const e = new EncurtadorLomadee(http, { baseUrl: 'https://api.lomadee.com.br/', dominios: ['lmdee.link'], marcasPermitidas: [ORG] });
    const outra = '00000000-0000-4000-8000-000000000000';
    await expect(e.linkRastreado(outra, 'https://www.drogariarosario.com.br/x')).rejects.toBeInstanceOf(MarcaNaoPermitidaError);
    expect(chamadas).toBe(0);
  });

  it('a config exige a lista de marcas permitidas, com ids válidos', () => {
    const http: HttpPostJson = { post: async () => [] };
    const base = { baseUrl: 'https://api.lomadee.com.br/', dominiosLinkRastreado: ['lmdee.link'] };
    expect(() => encurtadorDaConfig(http, base)).toThrow(/marcasPermitidasParaLink/);
    expect(() => encurtadorDaConfig(http, { ...base, marcasPermitidasParaLink: {} })).toThrow(/marcasPermitidasParaLink/);
    expect(() => encurtadorDaConfig(http, { ...base, marcasPermitidasParaLink: { nao_e_uuid: 'X' } })).toThrow(/marcasPermitidasParaLink/);
    expect(() => encurtadorDaConfig(http, { ...base, marcasPermitidasParaLink: { [ORG]: 'Drogasmil' } })).not.toThrow();
  });
});
