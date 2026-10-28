// /v1/admin/auth/*, /v1/admin/me (admin.yaml, tags auth e operador). Login do operador por código no e-mail; nunca cria conta.
import type { FastifyInstance } from 'fastify';
import { EnvioFalhouError } from '../../../auth/enviador.js';
import { criarSessaoOperador, ErroSessaoRevogadaPorReuso, renovarSessao, revogarSessao, type ParDeTokens } from '../../../auth/sessoes.js';
import { chaveEmail, hmacCodigo, novoCodigo } from '../../../auth/tokens.js';
import { comTransacao } from '../../../db/transacao.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto } from '../../corpo.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { exigirOperador, type OperadorLogado } from '../../sessaoOperador.js';
import { tenantDaRequisicao, type TenantAtivo } from '../../tenants.js';
import type { DepsAuth } from '../auth.js';

const VALIDADE_CODIGO_S = 600;
const REENVIAR_EM_S = 60;
const MAX_TENTATIVAS = 5;
const PADRAO_LIMITE = { maximo: 20, janelaSegundos: 3600 };
const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

/** Código e limites do operador ficam em chaves próprias: o mesmo e-mail na conta do app não divide código nem contagem. */
const dominio = (email: string) => `operador:${email}`;

async function redisOu503<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ErroApi) throw err;
    throw new ErroApi('servico_indisponivel', undefined, undefined, 30);
  }
}

async function limitar(d: DepsAuth, t: TenantAtivo, nome: string, chave: string): Promise<number | null> {
  const { maximo, janelaSegundos } = t.config.app.limitesTaxa[nome] ?? PADRAO_LIMITE;
  return redisOu503(d.limitador.usar(`operador:${nome}:${chave}`, maximo, janelaSegundos));
}

function lerEmail(b: Record<string, unknown>, campos: CampoInvalido[]): string {
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (email.length === 0 || email.length > 254 || !EMAIL.test(email)) campos.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' });
  return email;
}

function sessaoJson(par: ParDeTokens, operador: OperadorLogado) {
  return {
    access_token: par.accessToken,
    access_expira_em: par.accessExpiraEm.toISOString(),
    refresh_token: par.refreshToken,
    refresh_expira_em: par.refreshExpiraEm.toISOString(),
    operador,
  };
}

async function operadorAtivoPorEmail(d: DepsAuth, tenantId: string, email: string): Promise<OperadorLogado | null> {
  const r = await d.db.query(`SELECT id, email, nome, criado_em FROM operadores WHERE tenant_id = $1 AND lower(email) = $2 AND ativo`, [tenantId, email]);
  const o = r.rows[0];
  return o === undefined ? null : { id: o.id, email: o.email, nome: o.nome, criado_em: o.criado_em.toISOString() };
}

export function rotasAdminAuth(app: FastifyInstance, d: DepsAuth): void {
  app.post('/v1/admin/auth/email/codigo', async (req, reply) => {
    const tenant = await tenantDaRequisicao(req, d.tenants);
    const espera = await limitar(d, tenant, 'codigoEmailPorIp', `${tenant.slug}:${req.ip}`);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const campos: CampoInvalido[] = [];
    const email = lerEmail(corpoObjeto(req), campos);
    if (campos.length > 0) throw new ErroApi('validacao', undefined, campos);

    const resposta = { expira_em_segundos: VALIDADE_CODIGO_S, reenviar_em_segundos: REENVIAR_EM_S };
    const chave = chaveEmail(tenant.id, dominio(email));
    const minuto = await limitar(d, tenant, 'codigoEmailPorEmailMinuto', chave);
    const hora = minuto === null ? await limitar(d, tenant, 'codigoEmailPorEmailHora', chave) : null;
    if (minuto !== null || hora !== null) return reply.code(202).send(resposta);

    // 202 sempre; e-mail que não é de operador ativo não recebe nada (e a resposta não diz isso).
    if ((await operadorAtivoPorEmail(d, tenant.id, email)) === null) return reply.code(202).send(resposta);

    const cota = await limitar(d, tenant, 'emailDiario', tenant.slug);
    if (cota !== null) throw new ErroApi('servico_indisponivel', undefined, undefined, cota);

    const codigo = novoCodigo();
    await redisOu503(d.codigos.guardar(chave, hmacCodigo(d.chaveHmac, tenant.id, dominio(email), codigo), VALIDADE_CODIGO_S));
    try {
      await d.enviador.enviarCodigo(email, codigo, `${tenant.config.app.nomeApp} (operador)`);
    } catch (err) {
      req.log.error({ err: err instanceof EnvioFalhouError ? err.message : 'falha' }, 'envio do código do operador falhou');
      throw new ErroApi('servico_indisponivel', undefined, undefined, 30);
    }
    return reply.code(202).send(resposta);
  });

  app.post('/v1/admin/auth/email/verificar', async (req) => {
    const tenant = await tenantDaRequisicao(req, d.tenants);
    const espera = await limitar(d, tenant, 'verificarPorIp', `${tenant.slug}:${req.ip}`);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    const email = lerEmail(b, campos);
    const codigo = typeof b.codigo === 'string' ? b.codigo : '';
    if (!/^[0-9]{6}$/.test(codigo)) campos.push({ campo: 'codigo', mensagem: 'O código tem 6 dígitos.' });
    if (campos.length > 0) throw new ErroApi('validacao', undefined, campos);

    // E-mail que não é operador ativo sempre recebe `codigo_invalido`, igual ao código errado: nada revela quem é operador.
    const operador = await operadorAtivoPorEmail(d, tenant.id, email);
    if (operador === null) throw new ErroApi('codigo_invalido');
    const resultado = await redisOu503(d.codigos.conferir(chaveEmail(tenant.id, dominio(email)), hmacCodigo(d.chaveHmac, tenant.id, dominio(email), codigo), MAX_TENTATIVAS));
    if (resultado === 'invalido') throw new ErroApi('codigo_invalido');
    if (resultado === 'expirado') throw new ErroApi('codigo_expirado');

    const agora = d.agora();
    const par = await comTransacao(d.db, async (c) => {
      const p = await criarSessaoOperador(c, tenant.id, operador.id, agora, tenant.config.app.operador.refreshDias);
      await registrarAuditoria(c, { tenantId: tenant.id, operadorId: operador.id, acao: 'operador_entrou', alvoTipo: 'operador', alvoId: operador.id, em: agora });
      return p;
    });
    return sessaoJson(par, operador);
  });

  app.post('/v1/admin/auth/renovar', async (req) => {
    const refresh = corpoObjeto(req).refresh_token;
    if (typeof refresh !== 'string' || refresh.length === 0 || refresh.length > 128) {
      throw new ErroApi('validacao', undefined, [{ campo: 'refresh_token', mensagem: 'Informe o refresh token.' }]);
    }
    const agora = d.agora();
    const feito = await comTransacao(d.db, async (c) => {
      try {
        // O tenant só se conhece depois de achar a sessão (o refresh não leva X-Tenant).
        const diasPorTenant = new Map<string, number>();
        return await renovarSessao(
          c,
          refresh,
          agora,
          async (sessionId, tenantId) => {
            const t = await d.tenants.porId(tenantId);
            if (t === null) throw new ErroApi('nao_autenticado');
            diasPorTenant.set(tenantId, t.config.app.operador.refreshDias);
            const { maximo, janelaSegundos } = t.config.app.limitesTaxa.renovarPorSessao ?? PADRAO_LIMITE;
            const espera = await redisOu503(d.limitador.usar(`operador:renovarPorSessao:${sessionId}`, maximo, janelaSegundos));
            if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);
          },
          { audiencia: 'operador', refreshSegundos: (tenantId) => (diasPorTenant.get(tenantId) ?? 7) * 86400 },
        );
      } catch (err) {
        if (err instanceof ErroSessaoRevogadaPorReuso) return err;
        throw err;
      }
    });
    if (feito instanceof ErroSessaoRevogadaPorReuso) throw feito;
    const o = (await d.db.query(`SELECT id, email, nome, criado_em FROM operadores WHERE tenant_id = $1 AND id = $2`, [feito.tenantId, feito.operadorId])).rows[0];
    return sessaoJson(feito, { id: o.id, email: o.email, nome: o.nome, criado_em: o.criado_em.toISOString() });
  });

  app.post('/v1/admin/auth/sair', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    await revogarSessao(d.db, ctx.tenantId, ctx.sessionId, 'saiu', agora);
    return reply.code(204).send();
  });

  app.get('/v1/admin/me', async (req) => {
    const ctx = await exigirOperador(req, d.db, d.tenants, d.agora());
    return ctx.operador;
  });
}
