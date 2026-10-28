// Leitura de variáveis de ambiente. Segredos só entram por aqui, nunca por código.

export interface EnvConfig {
  databaseUrl: string;
  redisUrl: string;
  apiPort: number;
  /** API atrás de proxy confiável (TRUST_PROXY=1): usa X-Forwarded-For para o IP do limite de taxa. */
  trustProxy: boolean;
  /** Login por e-mail. Sem `authHmacKey` as rotas de login não sobem. */
  authHmacKey: string | null;
  brevoApiKey: string | null;
  emailRemetente: string | null;
  emailRemetenteNome: string;
  /** AUTH_EMAIL_CONSOLE=1: escreve o código no log em vez de enviar. Só desenvolvimento. */
  emailConsole: boolean;
  /** LOMADEE_PELO_PROXY=1: a chave da Lomadee é anexada pelo proxy do ambiente (nuvem); sem isso a API lê a credencial do banco. */
  lomadeePeloProxy: boolean;
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
    trustProxy: env.TRUST_PROXY === '1',
    authHmacKey: env.AUTH_HMAC_KEY && env.AUTH_HMAC_KEY.length > 0 ? env.AUTH_HMAC_KEY : null,
    brevoApiKey: env.BREVO_API_KEY && env.BREVO_API_KEY.length > 0 ? env.BREVO_API_KEY : null,
    emailRemetente: env.EMAIL_REMETENTE && env.EMAIL_REMETENTE.length > 0 ? env.EMAIL_REMETENTE : null,
    emailRemetenteNome: env.EMAIL_REMETENTE_NOME && env.EMAIL_REMETENTE_NOME.length > 0 ? env.EMAIL_REMETENTE_NOME : 'economae',
    emailConsole: env.AUTH_EMAIL_CONSOLE === '1',
    lomadeePeloProxy: env.LOMADEE_PELO_PROXY === '1',
  };
}
