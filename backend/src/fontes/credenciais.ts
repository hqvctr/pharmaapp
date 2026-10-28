// Credenciais de fonte por tenant: gravadas cifradas (shared/cifra.ts), lidas só na hora da coleta.
// Uma linha por (tenant, fonte) com um JSON {campo: valor}. Os valores nunca vão para log nem para erro.
import { cifrar, decifrar, type ChaveCredenciais } from '../shared/cifra.js';
import * as repo from '../pipeline/repositorio.js';
import type { FabricaFonte } from './registro.js';

const aad = (tenantId: string, sourceId: string): string => `economae:credencial:${tenantId}:${sourceId}`;

export async function gravarCredenciaisFonte(
  db: repo.Db,
  chave: ChaveCredenciais,
  fabrica: FabricaFonte,
  tenantId: string,
  sourceId: string,
  campos: Readonly<Record<string, string>>,
  operadorId: string | null,
): Promise<string[]> {
  const aceitos = new Set(fabrica.credenciais);
  const desconhecidos = Object.keys(campos).filter((c) => !aceitos.has(c));
  if (desconhecidos.length > 0) throw new Error(`Campos desconhecidos para ${fabrica.adaptador}: ${desconhecidos.join(', ')}`);
  const faltando = fabrica.credenciais.filter((c) => (campos[c] ?? '').trim() === '');
  if (faltando.length > 0) throw new Error(`Campos ausentes para ${fabrica.adaptador}: ${faltando.join(', ')}`);
  const limpos = Object.fromEntries(fabrica.credenciais.map((c) => [c, (campos[c] ?? '').trim()]));
  const segredo = cifrar(JSON.stringify(limpos), chave, aad(tenantId, sourceId));
  await repo.gravarCredencialCifrada(db, tenantId, sourceId, segredo, operadorId);
  return [...fabrica.credenciais];
}

/** Devolve null se a fonte não tem credencial gravada. */
export async function lerCredenciaisFonte(
  db: repo.Db,
  chaves: readonly ChaveCredenciais[],
  tenantId: string,
  sourceId: string,
): Promise<Record<string, string> | null> {
  const c = await repo.lerCredencialCifrada(db, tenantId, sourceId);
  if (c === null) return null;
  const json = decifrar(c, chaves, aad(tenantId, sourceId));
  const obj = JSON.parse(json) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(obj).filter((e): e is [string, string] => typeof e[1] === 'string'));
}
