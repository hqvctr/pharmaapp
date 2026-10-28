// Leitura do corpo das rotas: objeto JSON ou 400; erros de campo viram 422 com o caminho do campo (contrato, `Erro.campos`).
import type { FastifyRequest } from 'fastify';
import { ErroApi, type CampoInvalido } from './erros.js';

export function corpoObjeto(req: FastifyRequest): Record<string, unknown> {
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) throw new ErroApi('requisicao_malformada');
  return b as Record<string, unknown>;
}

export function falhaDeValidacao(campos: CampoInvalido[]): ErroApi {
  return new ErroApi('validacao', undefined, campos);
}
