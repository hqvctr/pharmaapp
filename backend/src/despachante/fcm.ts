// Envio de push pelo Firebase Cloud Messaging (API HTTP v1), sem SDK: o token de acesso sai de uma conta de serviço do Google
// (JWT assinado com RS256 trocado em oauth2.googleapis.com) e cada mensagem é um POST em messages:send.
// A conta de serviço é um arquivo JSON fora do repositório (FCM_CONTA_SERVICO); a chave privada e o token do aparelho nunca vão
// para log nem para mensagem de erro.
import { sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { MensagemPush } from './texto.js';

export type ResultadoEnvio =
  | { tipo: 'ok' }
  /** O aparelho não existe mais para o FCM (app desinstalado, token trocado, outro projeto): apagar o registro. */
  | { tipo: 'token_invalido' }
  /** Rede, limite ou instabilidade do FCM: tentar de novo mais tarde. */
  | { tipo: 'falha_temporaria'; motivo: string }
  /** O FCM recusou esta mensagem: tentar de novo não adianta. */
  | { tipo: 'falha_mensagem'; motivo: string }
  /** Credencial ou projeto errados: parar de enviar até alguém corrigir. */
  | { tipo: 'falha_config'; motivo: string };

export interface EnviadorPush {
  enviar(token: string, m: MensagemPush): Promise<ResultadoEnvio>;
}

export interface ContaServico {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

/** Lê o JSON da conta de serviço baixado do Google Cloud. Recusa o que não for conta de serviço, sem citar o conteúdo. */
export function lerContaServico(json: string): ContaServico {
  let c: any;
  try {
    c = JSON.parse(json);
  } catch {
    throw new Error('FCM_CONTA_SERVICO: o arquivo não é JSON');
  }
  if (c?.type !== 'service_account') throw new Error('FCM_CONTA_SERVICO: o arquivo não é de conta de serviço (type service_account)');
  for (const campo of ['project_id', 'client_email', 'private_key'] as const) {
    if (typeof c[campo] !== 'string' || c[campo] === '') throw new Error(`FCM_CONTA_SERVICO: falta ${campo}`);
  }
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(c.project_id)) throw new Error('FCM_CONTA_SERVICO: project_id inválido');
  const tokenUri = typeof c.token_uri === 'string' && c.token_uri.startsWith('https://') ? c.token_uri : 'https://oauth2.googleapis.com/token';
  return { projectId: c.project_id, clientEmail: c.client_email, privateKey: c.private_key, tokenUri };
}

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url');
const ESCOPO = 'https://www.googleapis.com/auth/firebase.messaging';

/** Erro do pedido de token: credencial recusada (config) ou falha passageira. */
class ErroToken extends Error {
  constructor(msg: string, readonly config: boolean) {
    super(msg);
  }
}

export interface OpcoesFcm {
  fetch?: typeof fetch;
  agora?: () => Date;
  timeoutMs?: number;
}

export class EnviadorFcm implements EnviadorPush {
  private readonly http: typeof fetch;
  private readonly agora: () => Date;
  private readonly timeoutMs: number;
  private acesso: { token: string; expiraEm: number } | null = null;

  constructor(private readonly conta: ContaServico, o: OpcoesFcm = {}) {
    this.http = o.fetch ?? fetch;
    this.agora = o.agora ?? (() => new Date());
    this.timeoutMs = o.timeoutMs ?? 10_000;
  }

  private async tokenDeAcesso(): Promise<string> {
    const agora = this.agora().getTime();
    if (this.acesso !== null && this.acesso.expiraEm - 60_000 > agora) return this.acesso.token;
    const iat = Math.floor(agora / 1000);
    const cabecalho = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const corpo = b64url(JSON.stringify({ iss: this.conta.clientEmail, scope: ESCOPO, aud: this.conta.tokenUri, iat, exp: iat + 3600 }));
    let assinatura: string;
    try {
      assinatura = b64url(sign('RSA-SHA256', Buffer.from(`${cabecalho}.${corpo}`), this.conta.privateKey));
    } catch {
      throw new ErroToken('chave privada da conta de serviço ilegível', true);
    }
    let r: Response;
    try {
      r = await this.http(this.conta.tokenUri, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabecalho}.${corpo}.${assinatura}` }).toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error',
      });
    } catch (err) {
      throw new ErroToken(`pedido de token falhou (${(err as Error).name})`, false);
    }
    const j: any = await r.json().catch(() => null);
    if (!r.ok || typeof j?.access_token !== 'string') {
      // 400/401 com invalid_grant ou invalid_client: conta apagada, chave revogada, relógio errado.
      const config = r.status === 400 || r.status === 401 || r.status === 403;
      throw new ErroToken(`token recusado (HTTP ${r.status}${typeof j?.error === 'string' ? `, ${j.error}` : ''})`, config);
    }
    const expiraEm = agora + (Number.isFinite(j.expires_in) ? Number(j.expires_in) : 3600) * 1000;
    this.acesso = { token: j.access_token, expiraEm };
    return j.access_token;
  }

  async enviar(token: string, m: MensagemPush): Promise<ResultadoEnvio> {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      let acesso: string;
      try {
        acesso = await this.tokenDeAcesso();
      } catch (err) {
        const e = err as ErroToken;
        return e.config ? { tipo: 'falha_config', motivo: e.message } : { tipo: 'falha_temporaria', motivo: e.message };
      }
      const mensagem = {
        message: {
          token,
          notification: { title: m.titulo, body: m.corpo },
          data: m.dados,
          android: {
            priority: 'HIGH',
            ttl: `${m.ttlSegundos}s`,
            collapse_key: m.colapso,
            notification: { channel_id: 'avisos', tag: m.colapso },
          },
        },
      };
      let r: Response;
      try {
        r = await this.http(`https://fcm.googleapis.com/v1/projects/${this.conta.projectId}/messages:send`, {
          method: 'POST',
          headers: { authorization: `Bearer ${acesso}`, 'content-type': 'application/json' },
          body: JSON.stringify(mensagem),
          signal: AbortSignal.timeout(this.timeoutMs),
          redirect: 'error',
        });
      } catch (err) {
        return { tipo: 'falha_temporaria', motivo: `envio falhou (${(err as Error).name})` };
      }
      if (r.ok) return { tipo: 'ok' };
      const j: any = await r.json().catch(() => null);
      const codigo: string | undefined = (j?.error?.details as any[] | undefined)?.find((d) => typeof d?.errorCode === 'string')?.errorCode;
      const status: string = typeof j?.error?.status === 'string' ? j.error.status : '';
      const texto: string = typeof j?.error?.message === 'string' ? j.error.message : '';
      // O token de acesso pode ter caído antes da hora: pede outro uma vez.
      if (r.status === 401 && tentativa === 0) {
        this.acesso = null;
        continue;
      }
      if (codigo === 'UNREGISTERED' || codigo === 'SENDER_ID_MISMATCH' || r.status === 404) return { tipo: 'token_invalido' };
      if (r.status === 400 && /registration token/i.test(texto)) return { tipo: 'token_invalido' };
      if (r.status === 401 || r.status === 403 || codigo === 'THIRD_PARTY_AUTH_ERROR') return { tipo: 'falha_config', motivo: `FCM recusou a credencial (HTTP ${r.status} ${status})` };
      if (r.status === 429 || r.status >= 500) return { tipo: 'falha_temporaria', motivo: `FCM indisponível (HTTP ${r.status} ${status})` };
      return { tipo: 'falha_mensagem', motivo: `FCM recusou a mensagem (HTTP ${r.status} ${codigo ?? status})` };
    }
    return { tipo: 'falha_config', motivo: 'FCM recusou o token de acesso duas vezes' };
  }
}

/**
 * Enviador real a partir do ambiente: `FCM_CONTA_SERVICO` é o caminho do JSON da conta de serviço. Sem a variável o push fica
 * desligado (null): os avisos continuam na central e o push expira sem sair. Variável apontando para arquivo ruim é erro.
 */
export async function enviadorDoAmbiente(env: NodeJS.ProcessEnv = process.env): Promise<EnviadorPush | null> {
  const caminho = env.FCM_CONTA_SERVICO;
  if (caminho === undefined || caminho.trim() === '') return null;
  let json: string;
  try {
    json = await readFile(caminho, 'utf8');
  } catch {
    throw new Error('FCM_CONTA_SERVICO: não consegui ler o arquivo');
  }
  return new EnviadorFcm(lerContaServico(json));
}
