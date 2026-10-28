// Cursor opaco das listas (contrato: "Opaco; não montar à mão"): par (data, id) da última linha da página.
import { falhaDeValidacao } from './corpo.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Cursor {
  criadoEm: string;
  id: string;
}

export function codificarCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function lerCursor(bruto: unknown): Cursor | undefined {
  if (bruto === undefined) return undefined;
  const invalido = () => falhaDeValidacao([{ campo: 'cursor', mensagem: 'Cursor inválido.' }]);
  if (typeof bruto !== 'string' || bruto.length > 512) throw invalido();
  try {
    const c = JSON.parse(Buffer.from(bruto, 'base64url').toString('utf8'));
    if (typeof c?.criadoEm !== 'string' || Number.isNaN(Date.parse(c.criadoEm)) || typeof c?.id !== 'string' || !UUID.test(c.id)) throw invalido();
    return { criadoEm: c.criadoEm, id: c.id };
  } catch {
    throw invalido();
  }
}

/** `limite` da query: 1 a 50, padrão 20. Devolve o valor ou o texto do erro de campo. */
export function lerLimite(bruto: unknown): { limite: number } | { erro: string } {
  if (bruto === undefined) return { limite: 20 };
  const n = Number(bruto);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? { limite: n } : { erro: 'Use de 1 a 50.' };
}
