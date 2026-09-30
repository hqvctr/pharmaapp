// Resolve o slug do cabeçalho X-Tenant para id + configuração. Cache por processo:
// mudar config/tenants/<slug>.json exige reiniciar a API.
import type { Db } from '../pipeline/repositorio.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';

export interface TenantResolvido {
  id: string;
  slug: string;
  config: ConfigTenant;
}

export interface ResolvedorTenants {
  resolver(slug: string): Promise<TenantResolvido | null>;
}

export class ResolvedorTenantsDb implements ResolvedorTenants {
  private readonly cache = new Map<string, Promise<TenantResolvido | null>>();

  constructor(
    private readonly db: Db,
    private readonly carregar: (slug: string) => Promise<ConfigTenant> = carregarConfigTenant,
  ) {}

  resolver(slug: string): Promise<TenantResolvido | null> {
    if (!/^[a-z0-9-]{1,63}$/.test(slug)) return Promise.resolve(null);
    let p = this.cache.get(slug);
    if (p === undefined) {
      p = this.buscar(slug);
      // Só o acerto fica em cache: slug inexistente não pode encher a memória.
      this.cache.set(slug, p);
      p.then(
        (t) => t === null && this.cache.delete(slug),
        () => this.cache.delete(slug),
      );
    }
    return p;
  }

  private async buscar(slug: string): Promise<TenantResolvido | null> {
    const r = await this.db.query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (r.rowCount !== 1) return null;
    // Tenant no banco sem arquivo de config é erro de provisionamento: falha alto (500), não 400.
    return { id: r.rows[0]!.id, slug, config: await this.carregar(slug) };
  }
}
