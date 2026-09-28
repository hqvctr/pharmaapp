// Aplica os arquivos .sql de migrations/ em ordem lexical, cada um em sua própria transação.
// Runner próprio para evitar dependência: são poucas linhas e SQL puro é mais fácil de auditar.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from '../shared/env.js';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export async function migrate(client: pg.ClientBase, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
  const applied = new Set(
    (await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name),
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const newlyApplied: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      newlyApplied.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    }
  }
  return newlyApplied;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const client = new pg.Client({ connectionString: env.databaseUrl });
  await client.connect();
  try {
    // Lock consultivo impede duas instâncias migrando ao mesmo tempo.
    await client.query('SELECT pg_advisory_lock(727274)');
    const done = await migrate(client);
    console.log(done.length ? `Applied: ${done.join(', ')}` : 'No pending migrations');
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
