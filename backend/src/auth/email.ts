// Envio do código de login. O provedor real ainda não foi escolhido (orçamento zero; ver BACKLOG).
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
