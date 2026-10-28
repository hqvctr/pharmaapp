// Envio do código por e-mail. Provedor atrás de interface: Brevo em produção, console só em desenvolvimento.

export interface EnviadorEmail {
  /** Lança se o provedor não aceitou o envio. Nunca registra o código nem a chave de API. */
  enviarCodigo(para: string, codigo: string, nomeApp: string): Promise<void>;
}

export class EnvioFalhouError extends Error {
  constructor(motivo: string) {
    super(`Envio de e-mail falhou: ${motivo}`);
    this.name = 'EnvioFalhouError';
  }
}

export interface RemetenteEmail {
  email: string;
  nome: string;
}

/** API transacional da Brevo (POST /v3/smtp/email). Não conferido contra uma conta real. */
export class EnviadorBrevo implements EnviadorEmail {
  constructor(
    private readonly chaveApi: string,
    private readonly remetente: RemetenteEmail,
    private readonly buscar: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async enviarCodigo(para: string, codigo: string, nomeApp: string): Promise<void> {
    let r: Response;
    try {
      r = await this.buscar('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': this.chaveApi, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: this.remetente.email, name: this.remetente.nome },
          to: [{ email: para }],
          subject: `Seu código do ${nomeApp}`,
          textContent: `Seu código do ${nomeApp}: ${codigo}\n\nEle vale por 10 minutos. Se não foi você que pediu, ignore este e-mail.`,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new EnvioFalhouError((err as Error).name === 'TimeoutError' ? 'sem resposta' : 'falha de rede');
    }
    if (!r.ok) throw new EnvioFalhouError(`HTTP ${r.status}`);
  }
}

/** Escreve o código no log do servidor. Só para desenvolvimento local; nunca ligar em produção. */
export class EnviadorConsole implements EnviadorEmail {
  constructor(private readonly escrever: (m: string) => void = console.log) {}
  async enviarCodigo(para: string, codigo: string, nomeApp: string): Promise<void> {
    this.escrever(`[DESENVOLVIMENTO] código do ${nomeApp} para ${para}: ${codigo}`);
  }
}
