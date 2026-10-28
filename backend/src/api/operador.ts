// Cadastro de operador por linha de comando (DECISIONS 40: sem rota na API).
//   node dist/api/operador.js --tenant padrao --email ana@exemplo.com --nome "Ana"      cadastra (ou reativa)
//   node dist/api/operador.js --tenant padrao --email ana@exemplo.com --desativar       desativa (a sessão cai na próxima requisição)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pg from 'pg';
import type { Db } from '../pipeline/repositorio.js';
import { loadEnv } from '../shared/env.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

export type ResultadoOperador = 'criado' | 'reativado' | 'atualizado' | 'desativado' | 'inexistente' | 'ja_desativado';

/** Cadastra o operador do tenant; e-mail já cadastrado é reativado (e o nome atualizado). */
export async function cadastrarOperador(db: Db, tenantSlug: string, emailBruto: string, nome: string): Promise<ResultadoOperador> {
  const email = emailBruto.trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) throw new Error('E-mail inválido.');
  if (nome.trim().length === 0 || nome.length > 100) throw new Error('Informe o nome (até 100 caracteres).');
  const tenant = await db.query(`SELECT id FROM tenants WHERE slug = $1`, [tenantSlug]);
  if (tenant.rowCount !== 1) throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  const tenantId = tenant.rows[0].id as string;
  const atual = await db.query(`SELECT id, ativo FROM operadores WHERE tenant_id = $1 AND lower(email) = $2`, [tenantId, email]);
  if (atual.rowCount === 1) {
    await db.query(`UPDATE operadores SET ativo = true, nome = $3 WHERE tenant_id = $1 AND id = $2`, [tenantId, atual.rows[0].id, nome.trim()]);
    return atual.rows[0].ativo ? 'atualizado' : 'reativado';
  }
  await db.query(`INSERT INTO operadores (tenant_id, email, nome) VALUES ($1, $2, $3)`, [tenantId, email, nome.trim()]);
  return 'criado';
}

export async function desativarOperador(db: Db, tenantSlug: string, emailBruto: string): Promise<ResultadoOperador> {
  const email = emailBruto.trim().toLowerCase();
  const r = await db.query(
    `UPDATE operadores o SET ativo = false FROM tenants t
      WHERE t.id = o.tenant_id AND t.slug = $1 AND lower(o.email) = $2 AND o.ativo RETURNING o.id`,
    [tenantSlug, email],
  );
  if (r.rowCount === 1) return 'desativado';
  const existe = await db.query(`SELECT 1 FROM operadores o JOIN tenants t ON t.id = o.tenant_id WHERE t.slug = $1 AND lower(o.email) = $2`, [tenantSlug, email]);
  return existe.rowCount === 1 ? 'ja_desativado' : 'inexistente';
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tenant: { type: 'string' }, email: { type: 'string' }, nome: { type: 'string' }, desativar: { type: 'boolean' } } });
  if (!values.tenant || !values.email || (!values.desativar && !values.nome)) {
    throw new Error('Uso: --tenant <slug> --email <e-mail> --nome <nome>   ou   --tenant <slug> --email <e-mail> --desativar');
  }
  const client = new pg.Client({ connectionString: loadEnv().databaseUrl });
  await client.connect();
  try {
    const r = values.desativar ? await desativarOperador(client, values.tenant, values.email) : await cadastrarOperador(client, values.tenant, values.email, values.nome!);
    console.log(`Operador ${values.email.toLowerCase()}: ${r}`);
    if (r === 'inexistente') process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
