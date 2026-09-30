// Envio de push. Produção: FCM HTTP v1 com conta de serviço (token OAuth assinado com node:crypto).
// Desenvolvimento e testes: log.
import { createSign } from 'node:crypto';
import type { MensagemPush } from './regras.js';

export type ResultadoEnvio = { tipo: 'ok' } | { tipo: 'token_invalido' } | { tipo: 'erro'; detalhe: string };

export interface OpcoesAndroid {
  canal: string;
  /** Mesma tag substitui a notificação anterior da mesma oferta. */
  tag: string;
  validadeSegundos: number;
}

export interface EnviadorPush {
  enviar(token: string, m: MensagemPush, android: OpcoesAndroid): Promise<ResultadoEnvio>;
}

export class EnviadorPushLog implements EnviadorPush {
  readonly enviados: Array<{ token: string; mensagem: MensagemPush }> = [];

  constructor(private readonly escrever: (linha: string) => void = () => {}) {}

  async enviar(token: string, m: MensagemPush): Promise<ResultadoEnvio> {
    this.enviados.push({ token, mensagem: m });
    this.escrever(`[push-dev] token=${token.slice(0, 12)}… titulo=${JSON.stringify(m.titulo)} corpo=${JSON.stringify(m.corpo)}`);
    return { tipo: 'ok' };
  }
}

/** Campos usados do JSON da conta de serviço (Firebase → Configurações → Contas de serviço). */
export interface ContaServico {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const ESCOPO = 'https://www.googleapis.com/auth/firebase.messaging';
const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');

export class EnviadorFcm implements EnviadorPush {
  private acesso: { token: string; expiraMs: number } | null = null;

  constructor(
    private readonly conta: ContaServico,
    private readonly buscar: typeof fetch = fetch,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  private async tokenDeAcesso(): Promise<string> {
    const t = this.agora().getTime();
    if (this.acesso !== null && this.acesso.expiraMs - 60_000 > t) return this.acesso.token;
    const aud = this.conta.token_uri ?? 'https://oauth2.googleapis.com/token';
    const iat = Math.floor(t / 1000);
    const dados = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: this.conta.client_email, scope: ESCOPO, aud, iat, exp: iat + 3600 })}`;
    const assinatura = createSign('RSA-SHA256').update(dados).sign(this.conta.private_key).toString('base64url');
    const res = await this.buscar(aud, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${dados}.${assinatura}` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Token OAuth do Google recusado: HTTP ${res.status}`);
    const corpo = (await res.json()) as { access_token: string; expires_in: number };
    this.acesso = { token: corpo.access_token, expiraMs: t + corpo.expires_in * 1000 };
    return corpo.access_token;
  }

  async enviar(token: string, m: MensagemPush, android: OpcoesAndroid): Promise<ResultadoEnvio> {
    let res: Response;
    try {
      res = await this.buscar(`https://fcm.googleapis.com/v1/projects/${this.conta.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await this.tokenDeAcesso()}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: m.titulo, body: m.corpo },
            data: m.dados,
            android: {
              priority: 'HIGH',
              ttl: `${android.validadeSegundos}s`,
              notification: { channel_id: android.canal, tag: android.tag },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      return { tipo: 'erro', detalhe: `FCM inacessível: ${(err as Error).message}` };
    }
    if (res.ok) return { tipo: 'ok' };
    const corpo = (await res.json().catch(() => ({}))) as { error?: { status?: string; details?: Array<{ errorCode?: string }> } };
    const codigo = corpo.error?.details?.find((d) => d.errorCode)?.errorCode ?? corpo.error?.status ?? '';
    // Token que o aparelho não usa mais (app desinstalado, dados apagados): sai do banco.
    if (res.status === 404 && codigo === 'UNREGISTERED') return { tipo: 'token_invalido' };
    return { tipo: 'erro', detalhe: `FCM HTTP ${res.status}${codigo ? ` ${codigo}` : ''}` };
  }
}
