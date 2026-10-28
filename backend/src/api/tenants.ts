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
  /** Para rotas com login: o tenant vem da sessão, não de cabeçalho. */
  porId(id: string): Promise<TenantAtivo | null>;
}

/** Tenant existe no banco (linha em `tenants`) e tem config em `config/tenants/<slug>.json`. */
export class RegistroTenantsBanco implements RegistroTenants {
  private readonly cache = new Map<string, TenantAtivo>();
  private readonly cachePorId = new Map<string, TenantAtivo>();

  constructor(
    private readonly db: Db,
    private readonly carregar: (slug: string) => Promise<ConfigTenant> = (s) => carregarConfigTenant(s),
  ) {}

  async obter(slug: string): Promise<TenantAtivo | null> {
    const guardado = this.cache.get(slug);
    if (guardado !== undefined) return guardado;
    const r = await this.db.query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [slug]);
    return r.rowCount === 1 ? this.guardar(r.rows[0]!.id, slug) : null;
  }

  async porId(id: string): Promise<TenantAtivo | null> {
    const guardado = this.cachePorId.get(id);
    if (guardado !== undefined) return guardado;
    const r = await this.db.query<{ slug: string }>('SELECT slug FROM tenants WHERE id = $1', [id]);
    return r.rowCount === 1 ? this.guardar(id, r.rows[0]!.slug) : null;
  }

  // Só tenant que existe no banco chega aqui, então o cache não cresce com lixo mandado por quem ataca.
  private async guardar(id: string, slug: string): Promise<TenantAtivo> {
    const tenant = { id, slug, config: await this.carregar(slug) };
    this.cache.set(slug, tenant);
    this.cachePorId.set(id, tenant);
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
