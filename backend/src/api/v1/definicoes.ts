// Rotas da API v1. Mudar qualquer coisa aqui muda o contrato: rodar `npm run contrato` e revisar o diff.
import type { DefRota } from '../contrato.js';
import * as E from '../esquemas.js';

// 1.0.0 aprovada em 2026-09-28 (openapi/v1-aprovado.json). Acréscimo sobe o segundo número.
export const VERSAO_CONTRATO = '1.1.0';

export const rotasV1 = [
  {
    operacao: 'obterConfiguracao',
    metodo: 'GET',
    caminho: '/v1/configuracao',
    resumo: 'Dados do tenant que o app precisa antes do login',
    descricao: 'Nome, versão e endereço dos termos, categorias com rótulo, região atendida, limites dos planos e métodos de login.',
    auth: 'nenhuma',
    respostas: { 200: { descricao: 'Configuração', esquema: E.Configuracao } },
  },
  {
    operacao: 'pedirCodigoEmail',
    metodo: 'POST',
    caminho: '/v1/auth/email/codigo',
    resumo: 'Envia um código de 6 dígitos para o e-mail',
    descricao:
      'Responde igual para e-mail cadastrado ou não. Só o código mais recente vale. Limites por e-mail e por IP, por hora.',
    auth: 'nenhuma',
    corpo: E.PedidoCodigo,
    respostas: { 202: { descricao: 'Código enviado', esquema: E.CodigoEnviado } },
    erros: { 429: ['LIMITE_EXCEDIDO'], 503: ['ENVIO_FALHOU'] },
  },
  {
    operacao: 'verificarCodigoEmail',
    metodo: 'POST',
    caminho: '/v1/auth/email/verificar',
    resumo: 'Troca e-mail e código por uma sessão',
    descricao: 'Cria a conta no primeiro acesso. Cada código aceita um número limitado de tentativas.',
    auth: 'nenhuma',
    corpo: E.VerificacaoCodigo,
    respostas: { 200: { descricao: 'Sessão criada', esquema: E.Sessao } },
    erros: { 401: ['CODIGO_INVALIDO'], 429: ['TENTATIVAS_ESGOTADAS'] },
  },
  {
    operacao: 'entrarComGoogle',
    metodo: 'POST',
    caminho: '/v1/auth/google',
    resumo: 'Troca um ID token do Google por uma sessão',
    descricao:
      'Aceita só e-mail verificado pelo Google. Se já existe conta com o mesmo e-mail, vincula o Google a ela.',
    auth: 'nenhuma',
    corpo: E.LoginGoogle,
    respostas: { 200: { descricao: 'Sessão criada', esquema: E.Sessao } },
    erros: { 401: ['TOKEN_GOOGLE_INVALIDO'], 403: ['LOGIN_GOOGLE_INDISPONIVEL'], 409: ['EMAIL_VINCULADO_A_OUTRO_GOOGLE'], 503: ['GOOGLE_INDISPONIVEL'] },
  },
  {
    operacao: 'sair',
    metodo: 'POST',
    caminho: '/v1/auth/sair',
    resumo: 'Revoga a sessão atual',
    auth: 'sessao',
    respostas: { 204: { descricao: 'Sessão revogada' } },
  },
  {
    operacao: 'obterUsuario',
    metodo: 'GET',
    caminho: '/v1/eu',
    resumo: 'Conta, plano, termos e consentimento',
    auth: 'sessao',
    respostas: { 200: { descricao: 'Usuário', esquema: E.Usuario } },
  },
  {
    operacao: 'aceitarTermos',
    metodo: 'PUT',
    caminho: '/v1/eu/termos',
    resumo: 'Registra o aceite da versão vigente dos termos',
    descricao: 'O app envia a versão que mostrou; se ela não é mais a vigente, recebe 409 e mostra a nova.',
    auth: 'sessao',
    corpo: E.AceiteTermos,
    respostas: { 200: { descricao: 'Usuário atualizado', esquema: E.Usuario } },
    erros: { 409: ['TERMOS_DESATUALIZADOS'] },
  },
  {
    operacao: 'definirConsentimentoNotificacoes',
    metodo: 'PUT',
    caminho: '/v1/eu/notificacoes',
    resumo: 'Dá ou retira o consentimento para notificações',
    descricao: 'Separado do aceite dos termos (LGPD). Sem consentimento, nenhum push é enviado.',
    auth: 'sessao',
    corpo: E.ConsentimentoNotificacoes,
    respostas: { 200: { descricao: 'Usuário atualizado', esquema: E.Usuario } },
  },
  {
    operacao: 'excluirConta',
    metodo: 'DELETE',
    caminho: '/v1/eu',
    resumo: 'Exclui a conta e todos os dados pessoais',
    descricao: 'Apaga preferências, sessões, entregas, assinaturas e códigos de login. Não tem volta.',
    auth: 'sessao',
    respostas: { 204: { descricao: 'Conta excluída' } },
  },
  {
    operacao: 'obterPreferencias',
    metodo: 'GET',
    caminho: '/v1/preferencias',
    resumo: 'Categorias, CEPs, horário de silêncio e limite diário',
    auth: 'sessao_termos',
    respostas: { 200: { descricao: 'Preferências (vazias se nunca salvas)', esquema: E.PreferenciasSalvas } },
  },
  {
    operacao: 'salvarPreferencias',
    metodo: 'PUT',
    caminho: '/v1/preferencias',
    resumo: 'Substitui as preferências',
    descricao: 'Substituição completa. Mais CEPs que o plano permite: 403. CEP fora da região atendida: 422.',
    auth: 'sessao_termos',
    corpo: E.Preferencias,
    respostas: { 200: { descricao: 'Preferências salvas', esquema: E.PreferenciasSalvas } },
    erros: {
      403: ['LIMITE_DO_PLANO'],
      422: ['CATEGORIA_DESCONHECIDA', 'CEP_FORA_DA_REGIAO', 'LIMITE_DIARIO_INVALIDO', 'SILENCIO_INVALIDO'],
    },
  },
  {
    operacao: 'listarFeed',
    metodo: 'GET',
    caminho: '/v1/feed',
    resumo: 'Promoções vigentes para as categorias e CEPs do usuário',
    descricao:
      'Só promoções aprovadas pela curadoria, ainda disponíveis, coletadas recentemente e com entrega para o CEP. ' +
      'Mais recentes primeiro. Paginação por cursor opaco.',
    auth: 'sessao_termos',
    query: E.QueryFeed,
    respostas: { 200: { descricao: 'Página do feed', esquema: E.Feed } },
    erros: { 400: ['CURSOR_INVALIDO'], 409: ['PREFERENCIAS_INCOMPLETAS'], 422: ['CEP_NAO_CADASTRADO', 'CATEGORIA_NAO_ESCOLHIDA'] },
  },
  {
    operacao: 'obterOferta',
    metodo: 'GET',
    caminho: '/v1/ofertas/{id}',
    resumo: 'Detalhe de uma oferta, com histórico de preço',
    descricao:
      'Responde também para oferta encerrada (ativa = false, sem link), para o app abrir uma notificação antiga. ' +
      'Oferta que nunca passou na curadoria: 404.',
    auth: 'sessao_termos',
    params: E.ParamsOferta,
    respostas: { 200: { descricao: 'Oferta', esquema: E.DetalheOferta } },
    erros: { 404: ['OFERTA_NAO_ENCONTRADA'] },
  },
] as const satisfies readonly DefRota[];

export type OperacaoV1 = (typeof rotasV1)[number]['operacao'];
