// Encurtador da Lomadee para a API em produção. A credencial vem do banco (cifrada, como a do coletor) ou, na nuvem,
// do proxy do ambiente, que anexa a chave sem que o processo a veja.
import { HttpReal, PADRAO_HTTP } from '../fontes/http.js';
import { lerCredenciaisFonte } from '../fontes/credenciais.js';
import { encurtadorDaConfig } from '../fontes/lomadeeLinks.js';
import { fabricaDo } from '../fontes/registro.js';
import * as repo from '../pipeline/repositorio.js';
import type { ChaveCredenciais } from '../shared/cifra.js';
import type { FabricaEncurtador } from './linkOferta.js';

export type ModoCredencialApi = { tipo: 'proxy' } | { tipo: 'banco'; chaves: ChaveCredenciais[] } | { tipo: 'nenhum' };

export function fabricaEncurtadorDeProducao(db: repo.Db, modo: ModoCredencialApi): FabricaEncurtador {
  return async (tenant, nomeFonte, bloco) => {
    if (modo.tipo === 'nenhum') return null;
    const intervaloMs = typeof bloco.intervaloMs === 'number' ? bloco.intervaloMs : PADRAO_HTTP.intervaloMs;
    if (modo.tipo === 'proxy') return encurtadorDaConfig(new HttpReal({ ...PADRAO_HTTP, intervaloMs }), bloco);
    const fonte = await repo.buscarFonte(db, tenant.id, nomeFonte);
    const credenciais = await lerCredenciaisFonte(db, modo.chaves, tenant.id, fonte.id);
    if (credenciais === null) return null;
    const adaptador = typeof bloco.adaptador === 'string' ? bloco.adaptador : nomeFonte;
    const cabecalhos = fabricaDo(adaptador).cabecalhos?.(credenciais) ?? {};
    return encurtadorDaConfig(new HttpReal({ ...PADRAO_HTTP, intervaloMs, cabecalhos }), bloco);
  };
}
