// Registra as rotas de definicoes.ts no Fastify, com os hooks de tenant, sessão e termos.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hashToken } from '../../auth/segredos.js';
import { caminhoFastify, type DefRota } from '../contrato.js';
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import * as auth from './auth.js';
import * as conta from './conta.js';
import { DIA_MS, HORA_MS, type DepsV1, type Handler } from './contexto.js';
import { rotasV1, type OperacaoV1 } from './definicoes.js';
import * as ofertas from './ofertas.js';
import * as preferencias from './preferencias.js';
import * as push from './push.js';

export type { DepsV1 } from './contexto.js';

const handlers: Record<OperacaoV1, Handler> = {
  obterConfiguracao: ofertas.obterConfiguracao,
  pedirCodigoEmail: auth.pedirCodigoEmail,
  verificarCodigoEmail: auth.verificarCodigoEmail,
  entrarComGoogle: auth.entrarComGoogle,
  sair: auth.sair,
  obterUsuario: conta.obterUsuario,
  aceitarTermos: conta.aceitarTermos,
  definirConsentimentoNotificacoes: conta.definirConsentimentoNotificacoes,
  excluirConta: conta.excluirConta,
  obterPreferencias: preferencias.obterPreferencias,
  salvarPreferencias: preferencias.salvarPreferencias,
  listarFeed: ofertas.listarFeed,
  obterOferta: ofertas.obterOferta,
  registrarDispositivo: push.registrarDispositivo,
  registrarAberturaEntrega: push.registrarAberturaEntrega,
};

const BEARER = /^Bearer ([A-Za-z0-9_-]{20,200})$/;

export function registrarV1(app: FastifyInstance, deps: DepsV1): void {
  app.decorateRequest('tenant', null as never);
  app.decorateRequest('sessao', null);

  // A resposta depende do tenant e da sessão e carrega dado pessoal: proxy ou CDN não pode guardar
  // nem entregar a resposta de um tenant (ou usuário) para outro.
  app.addHook('onSend', async (req, reply) => {
    if (req.url.startsWith('/v1/')) {
      reply.header('cache-control', 'no-store');
      reply.header('vary', 'X-Tenant, Authorization');
    }
  });

  async function resolverTenant(req: FastifyRequest): Promise<void> {
    const slug = req.headers['x-tenant'];
    const tenant = typeof slug === 'string' ? await deps.tenants.resolver(slug) : null;
    if (tenant === null) throw new ErroApi(400, 'TENANT_INVALIDO', 'Cabeçalho X-Tenant ausente ou desconhecido.');
    req.tenant = tenant;
  }

  async function exigirSessao(req: FastifyRequest): Promise<void> {
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    const agora = deps.agora();
    const sessao = token === undefined ? null : await repo.buscarSessao(deps.db, req.tenant.id, hashToken(token), agora);
    if (sessao === null) throw new ErroApi(401, 'SESSAO_INVALIDA', 'Sessão ausente, expirada ou revogada.');
    // Validade deslizante: quem usa o app não é deslogado. Grava no máximo uma vez por hora.
    if (agora.getTime() - sessao.ultimoUsoEm.getTime() > HORA_MS) {
      const expiraEm = new Date(agora.getTime() + req.tenant.config.app.auth.sessaoDias * DIA_MS);
      await repo.renovarSessao(deps.db, req.tenant.id, sessao.id, agora, expiraEm);
    }
    req.sessao = sessao;
  }

  async function exigirTermos(req: FastifyRequest): Promise<void> {
    if (req.sessao?.usuario.termosVersao !== req.tenant.config.app.documentos.termos.versao) {
      throw new ErroApi(403, 'TERMOS_PENDENTES', 'Aceite a versão vigente dos termos.');
    }
  }

  for (const def of rotasV1 as readonly DefRota[]) {
    const handler = handlers[def.operacao as OperacaoV1];
    const onRequest = [resolverTenant];
    if (def.auth !== 'nenhuma') onRequest.push(exigirSessao);
    if (def.auth === 'sessao_termos') onRequest.push(exigirTermos);
    app.route({
      method: def.metodo,
      url: caminhoFastify(def.caminho),
      // onRequest roda antes da leitura do corpo: sem sessão, 401 antes de qualquer validação.
      onRequest,
      schema: {
        ...(def.params ? { params: def.params } : {}),
        ...(def.query ? { querystring: def.query } : {}),
        ...(def.corpo ? { body: def.corpo } : {}),
        response: Object.fromEntries(
          Object.entries(def.respostas)
            .filter(([, r]) => r.esquema !== undefined)
            .map(([status, r]) => [status, r.esquema]),
        ),
      },
      handler: (req, reply) => handler(req, reply, deps),
    });
  }
}
