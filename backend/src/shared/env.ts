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
