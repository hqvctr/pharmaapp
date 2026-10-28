// Tenant da requisição: o app manda o slug em X-Tenant nas rotas sem login (contrato, "Convenções").
import type { FastifyRequest } from 'fastify';
import { ErroApi } from './erros.js';
import type { Db } from '../pipeline/repositorio.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';

export interface TenantAtivo {
  id: string;
  slug: string;
  config: ConfigTenant;
}

export interface RegistroTenants {
  /** null = o banco não conhece o slug. */
  obter(slug: string): Promise<TenantAtivo | null>;
}

/** Tenant existe no banco (linha em `tenants`) e tem config em `config/tenants/<slug>.json`. */
export class RegistroTenantsBanco implements RegistroTenants {
  private readonly cache = new Map<string, TenantAtivo>();

  constructor(
    private readonly db: Db,
    private readonly carregar: (slug: string) => Promise<ConfigTenant> = (s) => carregarConfigTenant(s),
  ) {}

  async obter(slug: string): Promise<TenantAtivo | null> {
    const guardado = this.cache.get(slug);
    if (guardado !== undefined) return guardado;
    const r = await this.db.query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (r.rowCount !== 1) return null;
    // Só slug que existe no banco chega aqui, então o cache não cresce com lixo mandado por quem ataca.
    const tenant = { id: r.rows[0]!.id, slug, config: await this.carregar(slug) };
    this.cache.set(slug, tenant);
    return tenant;
  }
}

const SLUG = /^[a-z0-9-]{1,64}$/;

export async function tenantDaRequisicao(req: FastifyRequest, registro: RegistroTenants): Promise<TenantAtivo> {
  const bruto = req.headers['x-tenant'];
  if (typeof bruto !== 'string' || bruto === '') throw new ErroApi('tenant_ausente');
  if (!SLUG.test(bruto)) throw new ErroApi('tenant_desconhecido');
  const tenant = await registro.obter(bruto);
  if (tenant === null) throw new ErroApi('tenant_desconhecido');
  return tenant;
}
