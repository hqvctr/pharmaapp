// Verificação do ID token do Google (login pelo Credential Manager do Android).
// Feita com node:crypto: RS256 contra as chaves públicas publicadas pelo Google (JWKS).
import { createPublicKey, verify, type JsonWebKey, type KeyObject } from 'node:crypto';

export const URL_CHAVES_GOOGLE = 'https://www.googleapis.com/oauth2/v3/certs';
const EMISSORES = new Set(['accounts.google.com', 'https://accounts.google.com']);
/** Tolerância de relógio entre o Google e este servidor. */
const FOLGA_SEGUNDOS = 60;

export interface ChavesGoogle {
  /** Chave pública pelo "kid" do cabeçalho; null se o Google não publica esse kid. */
  chave(kid: string): Promise<KeyObject | null>;
}

export interface IdentidadeGoogle {
  sub: string;
  email: string;
}

export class TokenGoogleInvalido extends Error {}

function decodificar(parte: string, oque: string): Record<string, unknown> {
  try {
    const v = JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));
    if (typeof v !== 'object' || v === null) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new TokenGoogleInvalido(`${oque} ilegível`);
  }
}

export async function verificarIdTokenGoogle(
  token: string,
  audiencias: readonly string[],
  chaves: ChavesGoogle,
  agora: Date,
): Promise<IdentidadeGoogle> {
  const partes = token.split('.');
  if (partes.length !== 3) throw new TokenGoogleInvalido('formato de JWT inválido');
  const [h, p, s] = partes as [string, string, string];
  const cabecalho = decodificar(h, 'cabeçalho');
  // Só RS256: nunca aceitar "none" nem algoritmo escolhido pelo token.
  if (cabecalho.alg !== 'RS256' || typeof cabecalho.kid !== 'string') throw new TokenGoogleInvalido('algoritmo ou kid inválido');
  const chave = await chaves.chave(cabecalho.kid);
  if (chave === null) throw new TokenGoogleInvalido('kid desconhecido');
  if (!verify('sha256', Buffer.from(`${h}.${p}`), chave, Buffer.from(s, 'base64url'))) {
    throw new TokenGoogleInvalido('assinatura inválida');
  }

  const c = decodificar(p, 'payload');
  const t = agora.getTime() / 1000;
  if (typeof c.iss !== 'string' || !EMISSORES.has(c.iss)) throw new TokenGoogleInvalido('emissor inválido');
  if (typeof c.aud !== 'string' || !audiencias.includes(c.aud)) throw new TokenGoogleInvalido('audiência inválida');
  if (typeof c.exp !== 'number' || c.exp + FOLGA_SEGUNDOS < t) throw new TokenGoogleInvalido('token expirado');
  if (typeof c.iat === 'number' && c.iat - FOLGA_SEGUNDOS > t) throw new TokenGoogleInvalido('token emitido no futuro');
  if (typeof c.sub !== 'string' || c.sub === '') throw new TokenGoogleInvalido('sub ausente');
  // E-mail não verificado permitiria tomar a conta de quem entrou por código com o mesmo e-mail.
  if (typeof c.email !== 'string' || (c.email_verified !== true && c.email_verified !== 'true')) {
    throw new TokenGoogleInvalido('e-mail ausente ou não verificado');
  }
  return { sub: c.sub, email: c.email };
}

/** Chaves do Google por HTTP, com cache pelo max-age da resposta. */
export class ChavesGoogleHttp implements ChavesGoogle {
  private cache = new Map<string, KeyObject>();
  private validoAteMs = 0;
  private ultimaBuscaMs = 0;

  constructor(
    private readonly buscar: typeof fetch = fetch,
    private readonly url: string = URL_CHAVES_GOOGLE,
  ) {}

  async chave(kid: string): Promise<KeyObject | null> {
    const agora = Date.now();
    // kid desconhecido pode ser rotação de chave: rebusca, no máximo uma vez por minuto.
    if (agora >= this.validoAteMs || (!this.cache.has(kid) && agora - this.ultimaBuscaMs > 60_000)) {
      await this.atualizar(agora);
    }
    return this.cache.get(kid) ?? null;
  }

  private async atualizar(agora: number): Promise<void> {
    this.ultimaBuscaMs = agora;
    const res = await this.buscar(this.url);
    if (!res.ok) throw new Error(`Chaves do Google: HTTP ${res.status}`);
    const corpo = (await res.json()) as { keys?: Array<JsonWebKey & { kid?: string }> };
    const novo = new Map<string, KeyObject>();
    for (const jwk of corpo.keys ?? []) {
      if (typeof jwk.kid === 'string' && jwk.kty === 'RSA') novo.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
    }
    this.cache = novo;
    const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1];
    this.validoAteMs = agora + (maxAge === undefined ? 3600 : Number(maxAge)) * 1000;
  }
}
