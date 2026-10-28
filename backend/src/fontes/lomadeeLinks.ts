// Link rastreado da Lomadee (encurtador). O contrato exige que todo botão que leva a uma marca use o link da
// plataforma (cláusula 10.1 h; DECISIONS 67). Documentação: POST /affiliate/shortener/url, escopo `shortener:write`.
// A Lomadee devolve um conjunto de links por CANAL do afiliado; sem canal cadastrado a resposta é uma lista vazia.
// Nunca vai identificador de pessoa no link (`mdasc` fica de fora): ver DECISIONS 67.
import type { HttpPostJson } from './contrato.js';

export class SemCanalError extends Error {
  constructor() {
    super('A Lomadee não devolveu link: a conta não tem nenhum canal cadastrado (crie um canal de divulgação no painel da Lomadee)');
    this.name = 'SemCanalError';
  }
}

export interface ConfigEncurtador {
  baseUrl: string;
  /** Domínios aceitos para o link devolvido (o resto é recusado, para um link adulterado não chegar ao usuário). */
  dominios: readonly string[];
  /** Canal a usar quando a conta tiver mais de um; sem isso, o primeiro que devolver link. */
  canalId?: string;
}

interface ItemCanal {
  id?: unknown;
  shortUrls?: unknown;
  message?: unknown;
}

export class EncurtadorLomadee {
  constructor(
    private readonly http: HttpPostJson,
    private readonly config: ConfigEncurtador,
  ) {}

  /** Link rastreado para a página do produto numa marca (`organizationId`). */
  async linkRastreado(organizationId: string, urlProduto: string): Promise<string> {
    if (!/^[0-9a-f-]{36}$/i.test(organizationId)) throw new Error('organizationId inválido');
    if (!urlProduto.startsWith('https://')) throw new Error('A URL do produto precisa ser https');
    const corpo = await this.http.post(new URL('affiliate/shortener/url', this.config.baseUrl), {
      organizationId,
      type: 'Custom',
      url: urlProduto,
    });
    return escolherLink(corpo, this.config);
  }
}

/** Escolhe e valida o link na resposta (exportada para teste). */
export function escolherLink(corpo: unknown, config: Pick<ConfigEncurtador, 'dominios' | 'canalId'>): string {
  if (!Array.isArray(corpo)) throw new Error('Resposta do encurtador fora do formato esperado');
  if (corpo.length === 0) throw new SemCanalError();
  const itens = (corpo as ItemCanal[]).filter((i) => config.canalId === undefined || i.id === config.canalId);
  let bloqueio: string | null = null;
  for (const item of itens) {
    const links = Array.isArray(item.shortUrls) ? item.shortUrls.filter((u): u is string => typeof u === 'string') : [];
    for (const l of links) {
      let u: URL;
      try {
        u = new URL(l);
      } catch {
        continue;
      }
      if (u.protocol === 'https:' && config.dominios.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))) return u.toString();
    }
    if (typeof item.message === 'string') bloqueio = item.message;
  }
  throw new Error(bloqueio !== null ? `A Lomadee bloqueou a geração do link: ${bloqueio}` : 'A Lomadee não devolveu nenhum link válido');
}

/** Monta o encurtador a partir do bloco `fontes.lomadee` do tenant. */
export function encurtadorDaConfig(http: HttpPostJson, bloco: Readonly<Record<string, unknown>>): EncurtadorLomadee {
  const dominios = bloco.dominiosLinkRastreado;
  if (typeof bloco.baseUrl !== 'string') throw new Error('Config inválida da Lomadee: baseUrl');
  if (!Array.isArray(dominios) || dominios.length === 0 || !dominios.every((d) => typeof d === 'string')) {
    throw new Error('Config inválida da Lomadee: dominiosLinkRastreado');
  }
  return new EncurtadorLomadee(http, {
    baseUrl: bloco.baseUrl,
    dominios: dominios as string[],
    ...(typeof bloco.canalId === 'string' ? { canalId: bloco.canalId } : {}),
  });
}
