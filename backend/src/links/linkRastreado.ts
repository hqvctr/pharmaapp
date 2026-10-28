// Link que o botão da oferta abre. Se a fonte tem encurtador (Lomadee), é o link rastreado, gerado na primeira vez
// e guardado; sem link rastreado a oferta NÃO vira botão (contrato da Lomadee, cláusula 10.1 h; DECISIONS 67).
import type { Db } from '../pipeline/repositorio.js';
import type { EncurtadorLomadee } from '../fontes/lomadeeLinks.js';

export class OfertaSemLinkError extends Error {
  constructor() {
    super('Oferta não encontrada');
    this.name = 'OfertaSemLinkError';
  }
}

interface Linha {
  link: string;
  link_rastreado: string | null;
  link_rastreado_de: string | null;
  id_externo_loja: string;
}

/** Devolve o link rastreado da oferta, gerando e guardando se ainda não existir ou se o link da loja mudou. */
export async function linkRastreadoDaOferta(
  db: Db,
  encurtador: Pick<EncurtadorLomadee, 'linkRastreado'>,
  tenantId: string,
  offerId: string,
  agora: Date,
): Promise<string> {
  const r = await db.query<Linha>(
    `SELECT o.link, o.link_rastreado, o.link_rastreado_de, ref.id_externo AS id_externo_loja
       FROM offers o
       JOIN store_source_refs ref ON ref.tenant_id = o.tenant_id AND ref.source_id = o.source_id AND ref.store_id = o.store_id
      WHERE o.tenant_id = $1 AND o.id = $2`,
    [tenantId, offerId],
  );
  if (r.rowCount !== 1) throw new OfertaSemLinkError();
  const o = r.rows[0]!;
  if (o.link_rastreado !== null && o.link_rastreado_de === o.link) return o.link_rastreado;
  const novo = await encurtador.linkRastreado(o.id_externo_loja, o.link);
  await db.query(
    `UPDATE offers SET link_rastreado = $3, link_rastreado_de = $4, link_rastreado_em = $5 WHERE tenant_id = $1 AND id = $2`,
    [tenantId, offerId, novo, o.link, agora],
  );
  return novo;
}
