// Peças comuns das rotas do operador (admin.yaml).
import type { FastifyRequest } from 'fastify';
import { falhaDeValidacao } from '../../corpo.js';
import { lerCursor, lerLimite, UUID, type Cursor } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';

/** `id` do caminho: uuid ou 404 (como as rotas do app). */
export function idDoCaminho(req: FastifyRequest, nome = 'id'): string {
  const id = (req.params as Record<string, string>)[nome];
  if (typeof id !== 'string' || !UUID.test(id)) throw new ErroApi('nao_encontrado');
  return id;
}

/** `observacao` do corpo: texto de até 1000 caracteres, null ou ausente. Devolve o texto limpo ou null. */
export function lerObservacao(b: Record<string, unknown>, campos: CampoInvalido[]): string | null {
  const o = b.observacao;
  if (o === undefined || o === null) return null;
  if (typeof o !== 'string' || o.length > 1000) {
    campos.push({ campo: 'observacao', mensagem: 'Use um texto de até 1000 caracteres.' });
    return null;
  }
  return o.trim() === '' ? null : o.trim();
}

export function lerPagina(q: Record<string, unknown>, campos: CampoInvalido[]): { limite: number; cursor: Cursor | undefined } {
  const l = lerLimite(q.limite);
  if ('erro' in l) campos.push({ campo: 'limite', mensagem: l.erro });
  // Cursor inválido já lança 422 por conta própria; juntar o erro de limite antes disso mantém uma resposta só.
  if (campos.length > 0) throw falhaDeValidacao(campos);
  return { limite: (l as { limite: number }).limite, cursor: lerCursor(q.cursor) };
}

/** Booleano de query (`true`/`false`); outro texto vira erro de campo. */
export function lerBooleano(q: Record<string, unknown>, nome: string, padrao: boolean, campos: CampoInvalido[]): boolean {
  const v = q[nome];
  if (v === undefined) return padrao;
  if (v === 'true') return true;
  if (v === 'false') return false;
  campos.push({ campo: nome, mensagem: 'Use true ou false.' });
  return padrao;
}

export function lerEnum<T extends string>(q: Record<string, unknown>, nome: string, validos: readonly T[], campos: CampoInvalido[]): T | undefined {
  const v = q[nome];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !validos.includes(v as T)) {
    campos.push({ campo: nome, mensagem: `Use um de: ${validos.join(', ')}.` });
    return undefined;
  }
  return v as T;
}

export const STATUS_CONFIANCA = ['aprovada', 'em_observacao', 'bloqueada'] as const;
export type StatusConfianca = (typeof STATUS_CONFIANCA)[number];

export const resumoOperador = (id: string | null, nome: string | null) => (id === null ? null : { id, nome: nome as string });

/** `Revisao` do contrato (quem, quando, observação); null quando ninguém revisou. */
export function revisaoJson(operadorId: string | null, operadorNome: string | null, em: Date | null, observacao: string | null) {
  return operadorId === null || em === null ? null : { operador: { id: operadorId, nome: operadorNome as string }, em: em.toISOString(), observacao };
}

const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Data e hora de query (ISO 8601 com fuso); outro formato vira erro de campo. */
export function lerDataHora(q: Record<string, unknown>, nome: string, campos: CampoInvalido[]): Date | undefined {
  const v = q[nome];
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !DATA_HORA.test(v) || Number.isNaN(Date.parse(v))) {
    campos.push({ campo: nome, mensagem: 'Use data e hora, como 2026-10-27T15:00:00Z.' });
    return undefined;
  }
  return new Date(v);
}
