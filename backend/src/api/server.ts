import pg from 'pg';
import { Redis } from 'ioredis';
import { loadEnv } from '../shared/env.js';
import { buildApp } from './app.js';
import { LimitadorRedis } from './limiteTaxa.js';
import { RegistroTenantsBanco } from './tenants.js';
import { ProvedorLinkDeProducao } from './linkOferta.js';
import { fabricaEncurtadorDeProducao, type ModoCredencialApi } from './encurtadorProducao.js';
import { carregarChaveCredenciais, type ChaveCredenciais } from '../shared/cifra.js';
import { CodigosRedis } from '../auth/codigos.js';
import { VerificadorGoogleJwks } from '../auth/google.js';
import { EnviadorBrevo, EnviadorConsole, type EnviadorEmail } from '../auth/enviador.js';
import { iguais } from '../auth/tokens.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });
  const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });

  let enviador: EnviadorEmail | null = null;
  if (env.emailConsole) enviador = new EnviadorConsole();
  else if (env.brevoApiKey !== null && env.emailRemetente !== null) {
    enviador = new EnviadorBrevo(env.brevoApiKey, { email: env.emailRemetente, nome: env.emailRemetenteNome });
  }
  if (env.authHmacKey !== null && env.authHmacKey.length < 32) throw new Error('AUTH_HMAC_KEY precisa ter ao menos 32 caracteres');
  const auth =
    env.authHmacKey !== null && enviador !== null
      ? { db: pool, codigos: new CodigosRedis(redis, iguais), enviador, chaveHmac: Buffer.from(env.authHmacKey), google: new VerificadorGoogleJwks(), agora: () => new Date() }
      : undefined;
  if (auth === undefined) console.warn('Login por e-mail DESLIGADO: faltam AUTH_HMAC_KEY e (BREVO_API_KEY + EMAIL_REMETENTE ou AUTH_EMAIL_CONSOLE=1).');

  const tenants = new RegistroTenantsBanco(pool);
  let modoCredencial: ModoCredencialApi = { tipo: 'nenhum' };
  let chaveCredenciais: ChaveCredenciais | undefined;
  if (env.lomadeePeloProxy) modoCredencial = { tipo: 'proxy' };
  else {
    try {
      chaveCredenciais = carregarChaveCredenciais();
      modoCredencial = { tipo: 'banco', chaves: [chaveCredenciais] };
    } catch {
      console.warn('Sem CREDENTIALS_KEY nem LOMADEE_PELO_PROXY: ofertas da Lomadee não terão link rastreado e o detalhe responderá 503.');
    }
  }
  const links = new ProvedorLinkDeProducao(pool, tenants, fabricaEncurtadorDeProducao(pool, modoCredencial));

  const app = buildApp({
    logger: true,
    trustProxy: env.trustProxy,
    tenants,
    links,
    ...(chaveCredenciais !== undefined ? { chaveCredenciais } : {}),
    limitador: new LimitadorRedis(redis),
    ...(auth !== undefined ? { auth } : {}),
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
