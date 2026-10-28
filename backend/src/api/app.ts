import Fastify, { type FastifyInstance } from 'fastify';
import { ErroApi } from './erros.js';
import { LimitadorMemoria, type LimitadorTaxa } from './limiteTaxa.js';
import { rotaConfiguracao } from './rotas/configuracao.js';
import type { RegistroTenants } from './tenants.js';

// Cada dependência externa entra por interface para que o teste use uma implementação falsa.
export interface HealthCheck {
  name: string;
  check(): Promise<void>;
}

export interface AppDeps {
  healthChecks: HealthCheck[];
  logger?: boolean;
  /** Sem registro de tenants, só /health responde (a base da fase 0). */
  tenants?: RegistroTenants;
  limitador?: LimitadorTaxa;
  /** true atrás de proxy confiável (Cloudflare Tunnel): sem isso `req.ip` é o do proxy e o limite por IP some. */
  trustProxy?: boolean;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false, trustProxy: deps.trustProxy ?? false });

  // Contrato: toda resposta é no-store e varia por tenant e sessão.
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('Vary', 'X-Tenant, Authorization');
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ErroApi) {
      if (err.retryAfter !== undefined) reply.header('Retry-After', String(err.retryAfter));
      return reply.code(err.status).send(err.corpo());
    }
    const status = (err as { statusCode?: number }).statusCode;
    // Corpo ilegível, tipo de conteúdo errado ou corpo grande demais: erro do cliente, nunca 500.
    if (status !== undefined && status >= 400 && status < 500) {
      return reply.code(400).send(new ErroApi('requisicao_malformada').corpo());
    }
    req.log.error({ err }, 'erro não tratado');
    return reply.code(500).send(new ErroApi('erro_interno').corpo());
  });

  app.setNotFoundHandler((_req, reply) => reply.code(404).send(new ErroApi('nao_encontrado').corpo()));

  app.get('/health', async (_request, reply) => {
    const results: Record<string, 'ok' | 'error'> = {};
    await Promise.all(
      deps.healthChecks.map(async (hc) => {
        try {
          await hc.check();
          results[hc.name] = 'ok';
        } catch {
          results[hc.name] = 'error';
        }
      }),
    );
    const healthy = Object.values(results).every((r) => r === 'ok');
    return reply.code(healthy ? 200 : 503).send({ status: healthy ? 'ok' : 'degraded', checks: results });
  });

  if (deps.tenants !== undefined) {
    const limitador = deps.limitador ?? new LimitadorMemoria();
    rotaConfiguracao(app, deps.tenants, limitador);
  }

  return app;
}
