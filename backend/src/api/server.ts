import pg from 'pg';
import { Redis } from 'ioredis';
import { EnviadorComCotaDiaria, EnviadorEmailBrevo, EnviadorEmailLog, type EnviadorEmail } from '../auth/email.js';
import { ChavesGoogleHttp } from '../auth/google.js';
import { LimitadorRedis } from '../auth/limitador.js';
import { loadApiEnv, loadEnv } from '../shared/env.js';
import { buildApp } from './app.js';
import { ResolvedorTenantsDb } from './tenants.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const envApi = loadApiEnv();
  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });
  const limitador = new LimitadorRedis(redis);
  const cfgEmail = envApi.email;
  const email: EnviadorEmail =
    cfgEmail.modo === 'brevo'
      ? new EnviadorComCotaDiaria(new EnviadorEmailBrevo(cfgEmail), limitador, cfgEmail.limiteDiario)
      : new EnviadorEmailLog((linha) => app.log.warn(linha));

  const app = buildApp({
    logger: true,
    trustProxy: envApi.trustProxy,
    healthChecks: [
      { name: 'postgres', check: async () => void (await pool.query('SELECT 1')) },
      { name: 'redis', check: async () => void (await redis.ping()) },
    ],
    v1: {
      db: pool,
      tenants: new ResolvedorTenantsDb(pool),
      email,
      limitador,
      chavesGoogle: new ChavesGoogleHttp(),
      codigoChave: envApi.codigoChave,
      agora: () => new Date(),
    },
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
