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

export type ConfigEmail =
  | { modo: 'log' }
  | { modo: 'brevo'; apiKey: string; remetente: string; nomeRemetente: string; limiteDiario: number };

export interface EnvApi {
  /** Chave do HMAC dos códigos de login. */
  codigoChave: Buffer;
  email: ConfigEmail;
  trustProxy: boolean;
}

/** Variáveis que só a API usa. Em produção, o código de login só sai por e-mail de verdade. */
export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): EnvApi {
  const chave = required(env, 'AUTH_CODIGO_CHAVE');
  if (chave.length < 32) throw new Error('AUTH_CODIGO_CHAVE precisa de ao menos 32 caracteres');
  const modo = env.EMAIL_MODO ?? 'log';
  let email: ConfigEmail;
  if (modo === 'log') {
    if (env.NODE_ENV === 'production') {
      throw new Error('EMAIL_MODO=log escreve o código de login no log; em produção use EMAIL_MODO=brevo');
    }
    email = { modo };
  } else if (modo === 'brevo') {
    const remetente = required(env, 'EMAIL_REMETENTE');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(remetente)) throw new Error('EMAIL_REMETENTE inválido');
    // Plano gratuito do Brevo: 300 por dia, somando todos os e-mails da conta. Folga para testes manuais.
    const limiteDiario = Number(env.EMAIL_LIMITE_DIARIO ?? '280');
    if (!Number.isInteger(limiteDiario) || limiteDiario <= 0) throw new Error('EMAIL_LIMITE_DIARIO inválido');
    email = {
      modo,
      apiKey: required(env, 'BREVO_API_KEY'),
      remetente,
      nomeRemetente: env.EMAIL_REMETENTE_NOME ?? 'economae',
      limiteDiario,
    };
  } else {
    throw new Error(`EMAIL_MODO desconhecido: ${modo} (use log ou brevo)`);
  }
  return { codigoChave: Buffer.from(chave, 'utf8'), email, trustProxy: env.TRUST_PROXY === 'true' };
}
