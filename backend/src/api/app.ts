import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { corpoErro, ErroApi } from './erros.js';
import { registrarV1, type DepsV1 } from './v1/index.js';

// Cada dependência externa entra por interface para que o teste use uma implementação falsa.
export interface HealthCheck {
  name: string;
  check(): Promise<void>;
}

export interface AppDeps {
  healthChecks: HealthCheck[];
  logger?: boolean;
  /** Atrás de proxy reverso: confiar em X-Forwarded-For para o IP do limite de taxa. */
  trustProxy?: boolean;
  /** Sem v1, sobe só o /health (fase 0). */
  v1?: DepsV1;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: deps.logger ?? false,
    trustProxy: deps.trustProxy ?? false,
    bodyLimit: 16 * 1024,
    ajv: {
      // Campo desconhecido é erro (additionalProperties: false), não é descartado em silêncio.
      customOptions: { removeAdditional: false, coerceTypes: 'array', allErrors: false },
    },
  });

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

  app.setErrorHandler((err: FastifyError | ErroApi, req, reply) => {
    if (err instanceof ErroApi) {
      return reply.code(err.status).headers(err.cabecalhos).send(corpoErro(err.codigo, err.message));
    }
    // Validação de esquema, JSON malformado, content-type errado, corpo grande demais.
    if (err.validation !== undefined || (err.statusCode !== undefined && err.statusCode >= 400 && err.statusCode < 500)) {
      return reply.code(400).send(corpoErro('REQUISICAO_INVALIDA', err.message));
    }
    req.log.error({ err }, 'erro não tratado');
    return reply.code(500).send(corpoErro('ERRO_INTERNO', 'Erro interno.'));
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send(corpoErro('ROTA_INEXISTENTE', 'Rota inexistente.')));

  if (deps.v1 !== undefined) registrarV1(app, deps.v1);
  return app;
}
