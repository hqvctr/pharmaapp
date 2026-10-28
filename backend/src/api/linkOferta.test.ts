import { describe, expect, it } from 'vitest';
import { ErroApi } from './erros.js';
import { ProvedorLinkDeProducao } from './linkOferta.js';
import type { RegistroTenants, TenantAtivo } from './tenants.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';

const agora = new Date('2026-11-01T12:00:00Z');

async function cenario(fabrica: ConstructorParameters<typeof ProvedorLinkDeProducao>[2]) {
  const config = await carregarConfigTenant('padrao');
  const tenant: TenantAtivo = { id: 't1', slug: 'padrao', config };
  const tenants: RegistroTenants = { obter: async () => tenant, porId: async () => tenant };
  const consultas: unknown[][] = [];
  // O mínimo do banco que linkRastreadoDaOferta usa: lê a oferta e grava o link.
  const db = {
    query: async (sql: string, params: unknown[]) => {
      consultas.push(params);
      if (sql.startsWith('SELECT'))
        return { rowCount: 1, rows: [{ link: 'https://www.drogasmil.com.br/p', link_rastreado: null, link_rastreado_de: null, id_externo_loja: 'd855f505-7e26-4961-a182-c2139aeadd2c' }] };
      return { rowCount: 1, rows: [] };
    },
  };
  return { provedor: new ProvedorLinkDeProducao(db as never, tenants, fabrica), consultas };
}
const oferta = (fonte: string) => ({ id: 'o1', link: 'https://www.drogasmil.com.br/p', link_afiliado: false, fonte });

describe('provedor de link da oferta (produção)', () => {
  it('fonte com trava de marca devolve o link rastreado e marca como afiliado', async () => {
    const { provedor } = await cenario(async () => ({ linkRastreado: async () => 'https://lmdee.link/abc' }));
    expect(await provedor.resolver('t1', oferta('lomadee'), agora)).toEqual({ link: 'https://lmdee.link/abc', afiliado: true });
  });

  it('sem credencial para gerar o link: 503, nunca o link cru da loja', async () => {
    const { provedor } = await cenario(async () => null);
    const erro = await provedor.resolver('t1', oferta('lomadee'), agora).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect(erro.status).toBe(503);
    expect(erro.retryAfter).toBe(60);
  });

  it('falha ao montar o encurtador também vira 503 e é tentada de novo na próxima vez', async () => {
    let tentativas = 0;
    const { provedor } = await cenario(async () => {
      tentativas += 1;
      if (tentativas === 1) throw new Error('banco fora');
      return { linkRastreado: async () => 'https://lmdee.link/ok' };
    });
    expect((await provedor.resolver('t1', oferta('lomadee'), agora).catch((e) => e)).status).toBe(503);
    expect((await provedor.resolver('t1', oferta('lomadee'), agora)).link).toBe('https://lmdee.link/ok');
  });

  it('o encurtador é montado uma vez por tenant e fonte', async () => {
    let montagens = 0;
    const { provedor } = await cenario(async () => {
      montagens += 1;
      return { linkRastreado: async () => 'https://lmdee.link/x' };
    });
    await provedor.resolver('t1', oferta('lomadee'), agora);
    await provedor.resolver('t1', oferta('lomadee'), agora);
    expect(montagens).toBe(1);
  });

  it('fonte sem trava (fora da config) usa o link da loja como veio', async () => {
    const { provedor } = await cenario(async () => {
      throw new Error('não deveria montar nada');
    });
    expect(await provedor.resolver('t1', { ...oferta('outra'), link_afiliado: true }, agora)).toEqual({ link: 'https://www.drogasmil.com.br/p', afiliado: true });
  });

  it('marca fora da lista vira 404 (o encurtador recusa antes de chamar a Lomadee)', async () => {
    const { MarcaNaoPermitidaError } = await import('../fontes/lomadeeLinks.js');
    const { provedor } = await cenario(async () => ({
      linkRastreado: async () => {
        throw new MarcaNaoPermitidaError('x');
      },
    }));
    expect((await provedor.resolver('t1', oferta('lomadee'), agora).catch((e) => e)).status).toBe(404);
  });
});
