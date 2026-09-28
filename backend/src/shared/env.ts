// Leitura de variáveis de ambiente. Segredos só entram por aqui, nunca por código.

export interface EnvConfig {
  databaseUrl: string;
  redisUrl: string;
  apiPort: number;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const port = Number(env.API_PORT ?? '3000');
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid API_PORT: ${env.API_PORT}`);
  }
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    redisUrl: required(env, 'REDIS_URL'),
    apiPort: port,
  };
}

export interface EnvApi {
  /** Chave do HMAC dos códigos de login. */
  codigoChave: Buffer;
  emailModo: 'log';
  trustProxy: boolean;
}

/** Variáveis que só a API usa. Em produção, recusa o envio de e-mail pelo log. */
export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): EnvApi {
  const chave = required(env, 'AUTH_CODIGO_CHAVE');
  if (chave.length < 32) throw new Error('AUTH_CODIGO_CHAVE precisa de ao menos 32 caracteres');
  const modo = env.EMAIL_MODO ?? 'log';
  if (modo !== 'log') throw new Error(`EMAIL_MODO desconhecido: ${modo}`);
  if (env.NODE_ENV === 'production') {
    throw new Error('EMAIL_MODO=log escreve o código de login no log; não serve para produção (provedor de e-mail pendente)');
  }
  return { codigoChave: Buffer.from(chave, 'utf8'), emailModo: modo, trustProxy: env.TRUST_PROXY === 'true' };
}
