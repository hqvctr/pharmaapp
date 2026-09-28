import pg from 'pg';
import { Redis } from 'ioredis';
import { loadEnv } from '../shared/env.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });

  const app = buildApp({
    logger: true,
    healthChecks: [
      { name: 'postgres', check: async () => void (await pool.query('SELECT 1')) },
      { name: 'redis', check: async () => void (await redis.ping()) },
    ],
  });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ host: '0.0.0.0', port: env.apiPort });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
