// Envio do código de login. Produção: Brevo (API HTTP, plano gratuito de 300 e-mails/dia; decisão 54).
// Desenvolvimento: log.
import type { LimitadorTaxa } from './limitador.js';

export interface MensagemCodigo {
  para: string;
  codigo: string;
  nomeApp: string;
  validadeMinutos: number;
}

export interface EnviadorEmail {
  enviarCodigo(m: MensagemCodigo): Promise<void>;
}

/** Desenvolvimento: escreve o código no log. O servidor recusa este modo em produção. */
export class EnviadorEmailLog implements EnviadorEmail {
  constructor(private readonly escrever: (linha: string) => void) {}

  async enviarCodigo(m: MensagemCodigo): Promise<void> {
    this.escrever(`[email-dev] para=${m.para} codigo=${m.codigo} validade=${m.validadeMinutos}min`);
  }
}

export interface ConfigBrevo {
  apiKey: string;
  /** Endereço verificado no Brevo (remetente único ou domínio autenticado). */
  remetente: string;
  nomeRemetente: string;
  url?: string;
  timeoutMs?: number;
}

export const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

/** Texto do e-mail: só o código e a validade. Nada de link (não vira isca de phishing). */
export function textoCodigo(m: MensagemCodigo): { assunto: string; texto: string; html: string } {
  const assunto = `${m.codigo} é o seu código de acesso ao ${m.nomeApp}`;
  const texto =
    `Seu código de acesso ao ${m.nomeApp} é ${m.codigo}.\n\n` +
    `Ele vale por ${m.validadeMinutos} minutos. Se você não pediu este código, ignore este e-mail.`;
  const html =
    `<p>Seu código de acesso ao ${m.nomeApp} é:</p>` +
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${m.codigo}</p>` +
    `<p>Ele vale por ${m.validadeMinutos} minutos. Se você não pediu este código, ignore este e-mail.</p>`;
  return { assunto, texto, html };
}

export class EnviadorEmailBrevo implements EnviadorEmail {
  constructor(
    private readonly config: ConfigBrevo,
    private readonly buscar: typeof fetch = fetch,
  ) {}

  async enviarCodigo(m: MensagemCodigo): Promise<void> {
    const { assunto, texto, html } = textoCodigo(m);
    let res: Response;
    try {
      res = await this.buscar(this.config.url ?? URL_BREVO, {
        method: 'POST',
        headers: { 'api-key': this.config.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: this.config.remetente, name: this.config.nomeRemetente },
          to: [{ email: m.para }],
          subject: assunto,
          textContent: texto,
          htmlContent: html,
          // Separa o código de login dos demais envios nas estatísticas do Brevo.
          tags: ['codigo-login'],
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
      });
    } catch (err) {
      throw new Error(`Brevo inacessível: ${(err as Error).name}`);
    }
    if (!res.ok) {
      // Só o status e o código de erro do Brevo: nunca a chave, nunca o endereço.
      const corpo = (await res.json().catch(() => ({}))) as { code?: string };
      throw new Error(`Brevo recusou o envio: HTTP ${res.status}${corpo.code ? ` (${corpo.code})` : ''}`);
    }
  }
}

export class CotaDiariaDeEmailEsgotada extends Error {}

/**
 * Cota diária própria, abaixo da do plano: estourado o plano, o Brevo segura o e-mail numa fila e
 * o código vence antes de chegar. Melhor recusar na hora (503) e o app sugerir o login com Google.
 * A janela é o dia em UTC.
 */
export class EnviadorComCotaDiaria implements EnviadorEmail {
  constructor(
    private readonly enviador: EnviadorEmail,
    private readonly limitador: LimitadorTaxa,
    private readonly limiteDiario: number,
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async enviarCodigo(m: MensagemCodigo): Promise<void> {
    const dia = this.agora().toISOString().slice(0, 10);
    const r = await this.limitador.consumir(`email-dia:${dia}`, this.limiteDiario, 86_400);
    if (!r.permitido) throw new CotaDiariaDeEmailEsgotada(`cota diária de ${this.limiteDiario} e-mails esgotada`);
    await this.enviador.enviarCodigo(m);
  }
}
