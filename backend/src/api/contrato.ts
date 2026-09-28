// Definição declarativa das rotas e geração do contrato OpenAPI a partir dela.
// A mesma definição registra a rota no Fastify, então o contrato não diverge do servidor.
import { nomeados, type Esquema } from './esquemas.js';

/**
 * nenhuma: só exige X-Tenant.
 * sessao: exige sessão válida do mesmo tenant.
 * sessao_termos: além disso, exige a versão vigente dos termos aceita.
 */
export type Autenticacao = 'nenhuma' | 'sessao' | 'sessao_termos';

export interface Resposta {
  descricao: string;
  esquema?: Esquema;
}

export interface DefRota {
  operacao: string;
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Estilo OpenAPI: /v1/ofertas/{id}. */
  caminho: string;
  resumo: string;
  descricao?: string;
  auth: Autenticacao;
  params?: Esquema;
  query?: Esquema;
  corpo?: Esquema;
  respostas: Record<number, Resposta>;
  /** Códigos de erro específicos da rota, por status (os comuns entram sozinhos). */
  erros?: Record<number, string[]>;
}

export function caminhoFastify(caminho: string): string {
  return caminho.replace(/\{(\w+)\}/g, ':$1');
}

/** Erros que toda rota pode devolver, conforme a autenticação. */
export function errosComuns(def: DefRota): Record<number, string[]> {
  const e: Record<number, string[]> = { 400: ['TENANT_INVALIDO'] };
  if (def.params || def.query || def.corpo) e[400]!.push('REQUISICAO_INVALIDA');
  if (def.auth !== 'nenhuma') e[401] = ['SESSAO_INVALIDA'];
  if (def.auth === 'sessao_termos') e[403] = ['TERMOS_PENDENTES'];
  return e;
}

export function todosOsErros(def: DefRota): Record<number, string[]> {
  const e = errosComuns(def);
  for (const [status, codigos] of Object.entries(def.erros ?? {})) {
    e[Number(status)] = [...(e[Number(status)] ?? []), ...codigos];
  }
  return e;
}

const MENSAGEM_STATUS: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Sem sessão válida',
  403: 'Proibido',
  404: 'Não encontrado',
  409: 'Conflito',
  422: 'Valor recusado pela regra de negócio',
  429: 'Limite de tentativas; ver Retry-After',
  503: 'Dependência indisponível',
};

function comRefs(e: unknown, raiz: unknown): unknown {
  if (Array.isArray(e)) return e.map((x) => comRefs(x, raiz));
  if (typeof e !== 'object' || e === null) return e;
  if (e !== raiz && nomeados.has(e as Esquema)) return { $ref: `#/components/schemas/${nomeados.get(e as Esquema)}` };
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, comRefs(v, raiz)]));
}

function parametros(onde: 'path' | 'query', esquema: Esquema | undefined): unknown[] {
  if (esquema === undefined) return [];
  const props = esquema.properties as Record<string, Esquema>;
  const obrigatorios = new Set(esquema.required as string[]);
  return Object.entries(props).map(([nome, s]) => {
    const { description, ...schema } = s;
    return { name: nome, in: onde, required: obrigatorios.has(nome), ...(description ? { description } : {}), schema: comRefs(schema, null) };
  });
}

export function gerarOpenApi(rotas: readonly DefRota[], versao: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of rotas) {
    const respostas: Record<string, unknown> = {};
    for (const [status, resp] of Object.entries(r.respostas)) {
      respostas[status] = {
        description: resp.descricao,
        ...(resp.esquema ? { content: { 'application/json': { schema: comRefs(resp.esquema, null) } } } : {}),
      };
    }
    for (const [status, codigos] of Object.entries(todosOsErros(r))) {
      respostas[status] = {
        description: `${MENSAGEM_STATUS[Number(status)] ?? 'Erro'}. Códigos: ${codigos.join(', ')}.`,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
      };
    }
    paths[r.caminho] ??= {};
    paths[r.caminho]![r.metodo.toLowerCase()] = {
      operationId: r.operacao,
      summary: r.resumo,
      ...(r.descricao ? { description: r.descricao } : {}),
      ...(r.auth === 'nenhuma' ? { security: [] } : {}),
      parameters: [{ $ref: '#/components/parameters/Tenant' }, ...parametros('path', r.params), ...parametros('query', r.query)],
      ...(r.corpo ? { requestBody: { required: true, content: { 'application/json': { schema: comRefs(r.corpo, null) } } } } : {}),
      responses: Object.fromEntries(Object.entries(respostas).sort(([a], [b]) => Number(a) - Number(b))),
    };
  }
  const schemas = Object.fromEntries(
    [...nomeados.entries()].map(([e, nome]) => [nome, comRefs(e, e)] as const).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  return {
    openapi: '3.1.0',
    info: {
      title: 'economae API',
      version: versao,
      description:
        'Contrato entre o app Android e o backend. Gerado de backend/src/api/v1/definicoes.ts por `npm run contrato`; ' +
        'o teste falha se este arquivo divergir do código. Dinheiro sempre em centavos inteiros. Toda rota exige o ' +
        'cabeçalho X-Tenant; rotas com sessão exigem Authorization: Bearer.',
    },
    security: [{ sessao: [] }],
    paths,
    components: {
      securitySchemes: { sessao: { type: 'http', scheme: 'bearer', description: 'Token opaco devolvido pelo login.' } },
      parameters: {
        Tenant: {
          name: 'X-Tenant',
          in: 'header',
          required: true,
          description: 'Slug do tenant, fixo no build do app.',
          schema: { type: 'string', pattern: '^[a-z0-9-]+$' },
        },
      },
      schemas,
    },
  };
}
