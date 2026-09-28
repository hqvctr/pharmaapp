import Fastify, { type FastifyInstance } from 'fastify';

// Cada dependência externa entra por interface para que o teste use uma implementação falsa.
export interface HealthCheck {
  name: string;
  check(): Promise<void>;
}

export interface AppDeps {
  healthChecks: HealthCheck[];
  logger?: boolean;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });

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

  return app;
}
