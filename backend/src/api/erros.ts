// Toda resposta de erro da API tem a forma { erro: { codigo, mensagem } }; o app decide pelo código.
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly cabecalhos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
}

export function corpoErro(codigo: string, mensagem: string): { erro: { codigo: string; mensagem: string } } {
  return { erro: { codigo, mensagem } };
}
