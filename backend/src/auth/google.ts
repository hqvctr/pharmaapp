// Verificação do ID token do Google (login "Entrar com Google"): JWT RS256 assinado pelas chaves públicas do Google (JWKS).
// O servidor confere assinatura, emissor, audiência (cliente OAuth do tenant), validade e, quando o app mandou, o nonce.
// Não usa nenhum segredo: o ID de cliente é público.
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { iguais } from './tokens.js';

export interface IdentidadeGoogle {
  /** Identificador estável da pessoa no Google (`sub`); é o que liga a conta, nunca o e-mail. */
  sub: string;
  email: string | null;
  emailVerificado: boolean;
}

export interface OpcoesVerificacao {
  /** IDs de cliente OAuth do tenant aceitos como audiência. */
  audiencias: readonly string[];
  /** Quando o app gerou um nonce para o pedido ao Google, ele tem de voltar igual no token. */
  nonce?: string;
}

export interface VerificadorGoogle {
  /** Lança `TokenGoogleInvalido` (token ruim) ou `ChavesGoogleIndisponiveis` (não deu para buscar as chaves). */
  verificar(idToken: string, opcoes: OpcoesVerificacao): Promise<IdentidadeGoogle>;
}

export class TokenGoogleInvalido extends Error {
  constructor(motivo: string) {
    super(`ID token do Google inválido: ${motivo}`);
    this.name = 'TokenGoogleInvalido';
  }
}

export class ChavesGoogleIndisponiveis extends Error {
  constructor(motivo: string) {
    super(`Chaves do Google indisponíveis: ${motivo}`);
    this.name = 'ChavesGoogleIndisponiveis';
  }
}

export interface ChavesBuscadas {
  chaves: Array<JsonWebKey & { kid?: string }>;
  /** Quanto tempo o Google deixa guardar (cabeçalho Cache-Control: max-age). */
  validadeSegundos: number | null;
}

export type BuscarChaves = () => Promise<ChavesBuscadas>;

export const URL_CHAVES_GOOGLE = 'https://www.googleapis.com/oauth2/v3/certs';
const EMISSORES = new Set(['https://accounts.google.com', 'accounts.google.com']);
const TOLERANCIA_RELOGIO_S = 30;
const VALIDADE_MINIMA_S = 300;
const VALIDADE_PADRAO_S = 3600;
const INTERVALO_MINIMO_ENTRE_BUSCAS_MS = 60_000;

/** Busca as chaves públicas no endereço do Google. */
export async function buscarChavesDoGoogle(buscar: typeof fetch = fetch): Promise<ChavesBuscadas> {
  let r: Response;
  try {
    r = await buscar(URL_CHAVES_GOOGLE, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
  } catch {
    throw new ChavesGoogleIndisponiveis('sem resposta');
  }
  if (!r.ok) throw new ChavesGoogleIndisponiveis(`HTTP ${r.status}`);
  let corpo: unknown;
  try {
    corpo = await r.json();
  } catch {
    throw new ChavesGoogleIndisponiveis('resposta ilegível');
  }
  const chaves = (corpo as { keys?: unknown })?.keys;
  if (!Array.isArray(chaves)) throw new ChavesGoogleIndisponiveis('formato inesperado');
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') ?? '');
  return { chaves: chaves as ChavesBuscadas['chaves'], validadeSegundos: m ? Number(m[1]) : null };
}

const b64 = (s: string): Buffer => Buffer.from(s, 'base64url');

function lerJson(parte: string, qual: string): Record<string, unknown> {
  try {
    const v = JSON.parse(b64(parte).toString('utf8'));
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new TokenGoogleInvalido(`${qual} ilegível`);
  }
}

export class VerificadorGoogleJwks implements VerificadorGoogle {
  private chaves = new Map<string, ReturnType<typeof createPublicKey>>();
  private validaAteMs = 0;
  private ultimaBuscaMs = 0;
  private emBusca: Promise<void> | null = null;

  constructor(
    private readonly buscar: BuscarChaves = () => buscarChavesDoGoogle(),
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async verificar(idToken: string, o: OpcoesVerificacao): Promise<IdentidadeGoogle> {
    const partes = idToken.split('.');
    if (partes.length !== 3 || partes.some((p) => p.length === 0)) throw new TokenGoogleInvalido('formato');
    const [h, p, s] = partes as [string, string, string];
    const cabecalho = lerJson(h, 'cabeçalho');
    // Só RS256: aceitar o algoritmo que o token declara abriria caminho para "none" e para troca de algoritmo.
    if (cabecalho.alg !== 'RS256') throw new TokenGoogleInvalido('algoritmo');
    if (typeof cabecalho.kid !== 'string' || cabecalho.kid.length === 0 || cabecalho.kid.length > 128) throw new TokenGoogleInvalido('kid');

    const chave = await this.chavePorKid(cabecalho.kid);
    if (chave === undefined) throw new TokenGoogleInvalido('chave desconhecida');
    let assinaturaOk = false;
    try {
      assinaturaOk = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), chave, b64(s));
    } catch {
      assinaturaOk = false;
    }
    if (!assinaturaOk) throw new TokenGoogleInvalido('assinatura');

    const c = lerJson(p, 'conteúdo');
    if (typeof c.iss !== 'string' || !EMISSORES.has(c.iss)) throw new TokenGoogleInvalido('emissor');
    const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (!aud.some((a) => typeof a === 'string' && o.audiencias.includes(a))) throw new TokenGoogleInvalido('audiência');
    const t = Math.floor(this.agora().getTime() / 1000);
    if (typeof c.exp !== 'number' || c.exp + TOLERANCIA_RELOGIO_S <= t) throw new TokenGoogleInvalido('vencido');
    if (typeof c.iat !== 'number' || c.iat - TOLERANCIA_RELOGIO_S > t) throw new TokenGoogleInvalido('emitido no futuro');
    if (typeof c.sub !== 'string' || c.sub.length === 0 || c.sub.length > 255) throw new TokenGoogleInvalido('sub');
    if (o.nonce !== undefined && (typeof c.nonce !== 'string' || !iguais(c.nonce, o.nonce))) throw new TokenGoogleInvalido('nonce');

    return {
      sub: c.sub,
      email: typeof c.email === 'string' && c.email.length > 0 ? c.email : null,
      emailVerificado: c.email_verified === true || c.email_verified === 'true',
    };
  }

  /** Chave pelo `kid`. Desconhecida: busca de novo, no máximo uma vez por minuto (quem manda `kid` aleatório não gera tráfego). */
  private async chavePorKid(kid: string) {
    const agoraMs = this.agora().getTime();
    if (agoraMs >= this.validaAteMs) await this.atualizar();
    let chave = this.chaves.get(kid);
    if (chave === undefined && agoraMs - this.ultimaBuscaMs >= INTERVALO_MINIMO_ENTRE_BUSCAS_MS) {
      await this.atualizar();
      chave = this.chaves.get(kid);
    }
    return chave;
  }

  private atualizar(): Promise<void> {
    this.emBusca ??= (async () => {
      try {
        const r = await this.buscar();
        const novas = new Map<string, ReturnType<typeof createPublicKey>>();
        for (const k of r.chaves) {
          if (k.kty !== 'RSA' || typeof k.kid !== 'string') continue;
          try {
            novas.set(k.kid, createPublicKey({ key: k, format: 'jwk' }));
          } catch {
            // chave ilegível: ignora só ela
          }
        }
        const agoraMs = this.agora().getTime();
        this.chaves = novas;
        this.ultimaBuscaMs = agoraMs;
        this.validaAteMs = agoraMs + Math.max(VALIDADE_MINIMA_S, r.validadeSegundos ?? VALIDADE_PADRAO_S) * 1000;
      } catch (err) {
        // Com chaves antigas na mão, uma falha de rede não derruba o login: segue com elas e tenta de novo em 1 minuto.
        if (this.chaves.size === 0) throw err;
        const agoraMs = this.agora().getTime();
        this.ultimaBuscaMs = agoraMs;
        this.validaAteMs = agoraMs + INTERVALO_MINIMO_ENTRE_BUSCAS_MS;
      } finally {
        this.emBusca = null;
      }
    })();
    return this.emBusca;
  }
}
