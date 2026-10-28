// Erro único do contrato (openapi.yaml, schema Erro): {codigo, mensagem, campos?}. O app testa `codigo`.

export type CodigoErro =
  | 'requisicao_malformada'
  | 'tenant_ausente'
  | 'tenant_desconhecido'
  | 'nao_autenticado'
  | 'sessao_expirada'
  | 'sessao_revogada'
  | 'credencial_invalida'
  | 'termos_pendentes'
  | 'plano_insuficiente'
  | 'metodo_login_indisponivel'
  | 'nao_encontrado'
  | 'termos_desatualizados'
  | 'limite_atingido'
  | 'idempotencia_conflito'
  | 'comprovante_de_outra_conta'
  | 'comprovante_invalido'
  | 'validacao'
  | 'codigo_invalido'
  | 'codigo_expirado'
  | 'cep_fora_da_regiao'
  | 'muitas_requisicoes'
  | 'servico_indisponivel'
  | 'erro_interno';

export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

export interface CorpoErro {
  codigo: CodigoErro;
  mensagem: string;
  campos?: CampoInvalido[];
}

const MENSAGENS: Record<CodigoErro, string> = {
  requisicao_malformada: 'Não foi possível ler o pedido.',
  tenant_ausente: 'Cabeçalho X-Tenant ausente.',
  tenant_desconhecido: 'Aplicativo não reconhecido.',
  nao_autenticado: 'Entre na sua conta para continuar.',
  sessao_expirada: 'Sua sessão expirou. Entre de novo.',
  sessao_revogada: 'Sua sessão foi encerrada. Entre de novo.',
  credencial_invalida: 'Não foi possível validar o login.',
  termos_pendentes: 'Aceite os termos de uso para continuar.',
  plano_insuficiente: 'Este recurso é do plano premium.',
  metodo_login_indisponivel: 'Este método de entrada não está disponível.',
  nao_encontrado: 'Não encontrado.',
  termos_desatualizados: 'Os termos mudaram. Leia a versão nova.',
  limite_atingido: 'Limite atingido.',
  idempotencia_conflito: 'Este pedido já foi enviado com outro conteúdo.',
  comprovante_de_outra_conta: 'Este comprovante pertence a outra conta.',
  comprovante_invalido: 'Comprovante inválido.',
  validacao: 'Confira os campos destacados.',
  codigo_invalido: 'Código incorreto.',
  codigo_expirado: 'Código expirado. Peça outro.',
  cep_fora_da_regiao: 'Ainda não atendemos este CEP.',
  muitas_requisicoes: 'Muitas tentativas. Aguarde um pouco.',
  servico_indisponivel: 'Serviço temporariamente indisponível. Tente de novo em instantes.',
  erro_interno: 'Algo deu errado do nosso lado. Tente de novo.',
};

const STATUS: Record<CodigoErro, number> = {
  requisicao_malformada: 400,
  tenant_ausente: 400,
  tenant_desconhecido: 404,
  nao_autenticado: 401,
  sessao_expirada: 401,
  sessao_revogada: 401,
  credencial_invalida: 401,
  termos_pendentes: 403,
  plano_insuficiente: 403,
  metodo_login_indisponivel: 403,
  nao_encontrado: 404,
  termos_desatualizados: 409,
  limite_atingido: 409,
  idempotencia_conflito: 409,
  comprovante_de_outra_conta: 409,
  comprovante_invalido: 422,
  validacao: 422,
  codigo_invalido: 422,
  codigo_expirado: 422,
  cep_fora_da_regiao: 422,
  muitas_requisicoes: 429,
  servico_indisponivel: 503,
  erro_interno: 500,
};

export class ErroApi extends Error {
  readonly status: number;
  constructor(
    readonly codigo: CodigoErro,
    mensagem: string = MENSAGENS[codigo],
    readonly campos?: CampoInvalido[],
    /** Segundos para o cabeçalho Retry-After (429 e 503). */
    readonly retryAfter?: number,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = STATUS[codigo];
  }

  corpo(): CorpoErro {
    return this.campos === undefined
      ? { codigo: this.codigo, mensagem: this.message }
      : { codigo: this.codigo, mensagem: this.message, campos: this.campos };
  }
}
