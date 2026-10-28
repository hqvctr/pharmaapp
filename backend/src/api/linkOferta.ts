// Qual link o botão da oferta abre. Fonte com encurtador (Lomadee) só vira botão com link rastreado (DECISIONS 67, 68, 72);
// as demais usam o link da loja como veio.
import { linkRastreadoDaOferta, OfertaSemLinkError } from '../links/linkRastreado.js';
import { MarcaNaoPermitidaError, type EncurtadorLomadee } from '../fontes/lomadeeLinks.js';
import type { Db } from '../pipeline/repositorio.js';
import type { TenantAtivo, RegistroTenants } from './tenants.js';
import { ErroApi } from './erros.js';

export interface OfertaParaLink {
  id: string;
  link: string;
  link_afiliado: boolean;
  /** Nome da fonte (`sources.nome`). */
  fonte: string;
}

export interface ProvedorLinkOferta {
  /** Lança `servico_indisponivel` se a fonte exige link rastreado e ele não pôde ser gerado agora. */
  resolver(tenantId: string, oferta: OfertaParaLink, agora: Date): Promise<{ link: string; afiliado: boolean }>;
}

/** Fontes que exigem link rastreado → seu encurtador. Fonte fora do mapa usa o link da loja. */
export class ProvedorLinkPorFonte implements ProvedorLinkOferta {
  constructor(
    private readonly db: Db,
    private readonly encurtadores: ReadonlyMap<string, Pick<EncurtadorLomadee, 'linkRastreado'>>,
  ) {}

  async resolver(tenantId: string, oferta: OfertaParaLink, agora: Date): Promise<{ link: string; afiliado: boolean }> {
    const enc = this.encurtadores.get(oferta.fonte);
    if (enc === undefined) return { link: oferta.link, afiliado: oferta.link_afiliado };
    try {
      return { link: await linkRastreadoDaOferta(this.db, enc, tenantId, oferta.id, agora), afiliado: true };
    } catch (err) {
      // Marca fora da lista ou oferta sem vínculo: o feed já as esconde; se chegar aqui, a oferta não existe para a pessoa.
      if (err instanceof MarcaNaoPermitidaError || err instanceof OfertaSemLinkError) throw new ErroApi('nao_encontrado');
      throw new ErroApi('servico_indisponivel', undefined, undefined, 60);
    }
  }
}

/** Monta o encurtador de uma fonte do tenant, ou devolve null se não houver credencial para isso. */
export type FabricaEncurtador = (tenant: TenantAtivo, fonte: string, bloco: Readonly<Record<string, unknown>>) => Promise<Pick<EncurtadorLomadee, 'linkRastreado'> | null>;

/**
 * Provedor de produção: a fonte que tem trava de marca (`marcasPermitidasParaLink`) só entrega link rastreado.
 * Sem credencial para gerá-lo, a resposta é `servico_indisponivel`; o link cru da loja nunca vira botão (DECISIONS 67 e 72).
 */
export class ProvedorLinkDeProducao implements ProvedorLinkOferta {
  private readonly encurtadores = new Map<string, Pick<EncurtadorLomadee, 'linkRastreado'>>();

  constructor(
    private readonly db: Db,
    private readonly tenants: RegistroTenants,
    private readonly fabrica: FabricaEncurtador,
  ) {}

  async resolver(tenantId: string, oferta: OfertaParaLink, agora: Date): Promise<{ link: string; afiliado: boolean }> {
    const tenant = await this.tenants.porId(tenantId);
    if (tenant === null) throw new ErroApi('nao_encontrado');
    const bloco = tenant.config.fontes[oferta.fonte];
    const exigeRastreado = bloco !== undefined && bloco.marcasPermitidasParaLink !== undefined;
    if (!exigeRastreado) return { link: oferta.link, afiliado: oferta.link_afiliado };

    const chave = `${tenantId}:${oferta.fonte}`;
    let enc = this.encurtadores.get(chave);
    if (enc === undefined) {
      const novo = await this.fabrica(tenant, oferta.fonte, bloco).catch(() => null);
      if (novo === null) throw new ErroApi('servico_indisponivel', undefined, undefined, 60);
      this.encurtadores.set(chave, novo);
      enc = novo;
    }
    return new ProvedorLinkPorFonte(this.db, new Map([[oferta.fonte, enc]])).resolver(tenantId, oferta, agora);
  }
}
