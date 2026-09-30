// Esquemas JSON da API v1. São a fonte única: validam a requisição, serializam a resposta
// (campo fora do esquema não sai) e geram o contrato OpenAPI em openapi/v1.json.
export type Esquema = Record<string, unknown>;

/** Esquemas com nome viram components/schemas no contrato; aqui são objetos comuns. */
export const nomeados = new Map<Esquema, string>();
function nomear<T extends Esquema>(nome: string, e: T): T {
  nomeados.set(e, nome);
  return e;
}

export function objeto(propriedades: Record<string, Esquema>, opcionais: string[] = [], anulavel = false): Esquema {
  return {
    type: anulavel ? ['object', 'null'] : 'object',
    properties: propriedades,
    required: Object.keys(propriedades).filter((k) => !opcionais.includes(k)),
    additionalProperties: false,
  };
}
const texto = (extra: Esquema = {}): Esquema => ({ type: 'string', ...extra });
const textoOuNulo = (extra: Esquema = {}): Esquema => ({ type: ['string', 'null'], ...extra });
const inteiro = (extra: Esquema = {}): Esquema => ({ type: 'integer', ...extra });
const booleano: Esquema = { type: 'boolean' };
const lista = (itens: Esquema, extra: Esquema = {}): Esquema => ({ type: 'array', items: itens, ...extra });
const uuid = texto({ format: 'uuid' });
const instante = texto({ format: 'date-time' });
const instanteOuNulo = textoOuNulo({ format: 'date-time' });

export const Cep = nomear('Cep', texto({ pattern: '^[0-9]{8}$', description: 'CEP com 8 dígitos, sem hífen.' }));
const Hora = texto({ pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$', description: 'HH:MM, no fuso do tenant.' });
const Decisao = texto({ enum: ['notificar', 'aguardar_aprovacao', 'somente_feed'] });
const Unidade = texto({ enum: ['kg', 'l', 'un'] });
const TamanhoFralda = texto({ enum: ['RN', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG'] });

export const Erro = nomear(
  'Erro',
  objeto({ erro: objeto({ codigo: texto({ description: 'Estável; o app decide por ele.' }), mensagem: texto() }) }),
);

const Documento = nomear(
  'Documento',
  objeto({ versao: texto(), url: textoOuNulo({ description: 'null enquanto o texto não estiver publicado.' }) }),
);

export const Configuracao = nomear(
  'Configuracao',
  objeto({
    nome: texto(),
    documentos: {
      ...objeto({ termos: Documento, privacidade: Documento }),
      description: 'Termos: o usuário aceita a versão (PUT /v1/eu/termos). Privacidade: informada com link e versão.',
    },
    categorias: lista(objeto({ id: texto(), nome: texto() })),
    regiao: objeto({ nome: texto() }),
    planos: objeto({
      gratuito: objeto({ maxCeps: inteiro() }),
      premium: objeto({ maxCeps: inteiro() }),
    }),
    limiteDiarioMaximo: inteiro(),
    tamanhosFralda: lista(objeto({ id: TamanhoFralda, nome: texto() }), { description: 'Opções do filtro de tamanho de fralda.' }),
    login: objeto({ email: booleano, google: booleano }),
  }),
);

export const Usuario = nomear(
  'Usuario',
  objeto({
    id: uuid,
    email: texto(),
    plano: texto({ enum: ['gratuito', 'premium'] }),
    limites: objeto({ maxCeps: inteiro() }),
    termos: objeto({
      versaoVigente: texto(),
      versaoAceita: textoOuNulo(),
      aceitosEm: instanteOuNulo,
      pendente: { ...booleano, description: 'true enquanto a versão aceita não for a vigente.' },
    }),
    notificacoes: objeto({ consentidas: booleano, consentidasEm: instanteOuNulo }),
  }),
);

export const Sessao = nomear(
  'Sessao',
  objeto({
    token: texto({ description: 'Enviar em Authorization: Bearer <token>.' }),
    expiraEm: { ...instante, description: 'Renovada a cada uso; expira após o período sem uso.' },
    novoUsuario: booleano,
    usuario: Usuario,
  }),
);

export const PedidoCodigo = objeto({ email: texto({ format: 'email', maxLength: 254 }) });
export const CodigoEnviado = objeto({ validadeMinutos: inteiro() });
export const VerificacaoCodigo = objeto({
  email: texto({ format: 'email', maxLength: 254 }),
  codigo: texto({ pattern: '^[0-9]{6}$' }),
});
export const LoginGoogle = objeto({ idToken: texto({ minLength: 1, maxLength: 4096 }) });
export const AceiteTermos = objeto({ versao: texto({ minLength: 1 }) });
export const ConsentimentoNotificacoes = objeto({ consentidas: booleano });

const camposPreferencias = {
  categorias: lista(texto(), { uniqueItems: true, maxItems: 50 }),
  ceps: lista(Cep, { uniqueItems: true, maxItems: 3, description: 'O primeiro é o principal; o plano limita a quantidade.' }),
  silencio: objeto({ inicio: Hora, fim: Hora }, [], true),
  limiteDiario: { type: ['integer', 'null'], minimum: 1 },
  tamanhosFralda: lista(TamanhoFralda, {
    uniqueItems: true,
    maxItems: 7,
    description: 'Filtro opcional de fraldas. Vazio ou ausente: todos os tamanhos. Fralda sem tamanho identificado aparece sempre.',
  }),
};
export const Preferencias = nomear('Preferencias', objeto(camposPreferencias, ['tamanhosFralda']));
export const PreferenciasSalvas = nomear(
  'PreferenciasSalvas',
  objeto({ ...camposPreferencias, completas: { ...booleano, description: 'Tem ao menos uma categoria e um CEP; o feed exige.' } }),
);

const camposOferta = {
  ofertaId: uuid,
  produto: objeto({
    nome: texto(),
    marca: textoOuNulo(),
    categoria: texto(),
    embalagem: objeto({ quantidade: { type: 'number' }, unidade: Unidade }),
    tamanhoFralda: { ...TamanhoFralda, type: ['string', 'null'], enum: [...(TamanhoFralda.enum as string[]), null] },
  }),
  loja: objeto({ id: uuid, nome: texto(), rede: texto(), tipo: texto({ enum: ['online', 'fisica'] }) }),
  precoCentavos: inteiro({ description: 'Preço anunciado de uma embalagem.' }),
  precoEfetivoCentavos: inteiro({ description: 'Preço por embalagem sob a condição (ex.: leve 3 pague 2).' }),
  precoReferenciaCentavos: inteiro({ description: 'Preço de referência da mesma embalagem no histórico da loja.' }),
  queda: { type: 'number', description: 'Fração de queda do preço efetivo sobre a referência (0,3 = 30%).' },
  precoPorUnidade: objeto({ centavos: { type: 'number' }, unidade: Unidade }),
  condicao: textoOuNulo({ description: 'Rótulo obrigatório de exibir quando a oferta é condicional.' }),
  frete: objeto({ status: texto({ enum: ['conhecido', 'a_confirmar', 'nao_se_aplica'] }), centavos: { type: ['integer', 'null'] } }),
  validaAte: instanteOuNulo,
  decisao: Decisao,
  score: inteiro({ minimum: 0, maximum: 100 }),
  avisos: lista(texto(), {
    description: 'Textos obrigatórios por lei (ex.: advertência do Ministério da Saúde da NBCAL). O app exibe junto da oferta, sem alterar nem ocultar.',
  }),
  imagemUrl: textoOuNulo({ description: 'Foto do produto hospedada pela loja (https).' }),
  linkAfiliado: { ...booleano, description: 'true: o app precisa informar que o link é de afiliado.' },
  alertadaEm: instante,
  coletadaEm: instante,
  prova: objeto(
    {
      menorPrecoCentavos: inteiro({ description: 'Menor preço desta embalagem na loja no período medido antes do alerta (até 180 dias).' }),
      maiorPrecoCentavos: inteiro({ description: 'Maior preço desta embalagem na loja no mesmo período.' }),
      diasMedidos: inteiro({ minimum: 0, description: 'Dias com preço observado no período. Abaixo de 180, o app diz "em N dias", nunca "em 6 meses".' }),
    },
    [],
    true,
  ),
};

export const ItemFeed = nomear(
  'ItemFeed',
  objeto({ ...camposOferta, prazoEntregaDias: { type: ['integer', 'null'], description: 'Menor prazo para os CEPs consultados.' } }),
);
export const Feed = nomear(
  'Feed',
  objeto({ itens: lista(ItemFeed), proximoCursor: textoOuNulo({ description: 'null: não há mais páginas.' }) }),
);
export const QueryFeed = objeto(
  {
    cep: { ...Cep, description: 'Um dos CEPs do usuário; sem ele, vale qualquer CEP do usuário.' },
    categoria: texto({ description: 'Uma das categorias do usuário.' }),
    cursor: texto({ maxLength: 200 }),
    limite: inteiro({ minimum: 1, maximum: 100, description: 'O tenant tem teto próprio (hoje 50); acima dele a página vem menor.' }),
  },
  ['cep', 'categoria', 'cursor', 'limite'],
);

export const DetalheOferta = nomear(
  'DetalheOferta',
  objeto({
    ...camposOferta,
    ativa: { ...booleano, description: 'false: a promoção acabou; o app mostra como encerrada e sem link.' },
    link: textoOuNulo({ description: 'null quando a oferta não está ativa.' }),
    historico: lista(
      objeto({
        dia: texto({ format: 'date' }),
        precoEquivalenteCentavos: inteiro({ description: 'Menor preço do dia, convertido para esta embalagem.' }),
      }),
      { description: 'Dias fechados (sem o dia de hoje), do mais antigo ao mais recente, na loja da oferta.' },
    ),
  }),
);
export const ParamsOferta = objeto({ id: uuid });

export const RegistroDispositivo = objeto({
  token: texto({ minLength: 20, maxLength: 4096, description: 'Token de registro do FCM.' }),
  plataforma: texto({ enum: ['android'] }),
});
export const ParamsEntrega = objeto({ id: uuid });
