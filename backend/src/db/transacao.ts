import type pg from 'pg';

/** Roda `fn` numa transação; desfaz se lançar. */
export async function comTransacao<T>(pool: Pick<pg.Pool, 'connect'>, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}
