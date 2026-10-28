// /v1/auth/email/codigo, /v1/auth/email/verificar, /v1/auth/renovar e /v1/auth/sair (openapi.yaml, tag auth).
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { type ArmazenamentoCodigos } from '../../auth/codigos.js';
import { type EnviadorEmail } from '../../auth/enviador.js';
import { criarSessao, ErroSessaoRevogadaPorReuso, renovarSessao, revogarSessao, type ParDeTokens } from '../../auth/sessoes.js';
import { chaveEmail, hmacCodigo, iguais, novoCodigo } from '../../auth/tokens.js';
import { acharOuCriarPorEmail, montarUsuario } from '../../auth/usuarios.js';
import { comTransacao } from '../../db/transacao.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import type { LimitadorTaxa } from '../limiteTaxa.js';
import { exigirSessao } from '../sessao.js';
import { tenantDaRequisicao, type RegistroTenants, type TenantAtivo } from '../tenants.js';

export interface DepsAuth {
  db: pg.Pool;
  tenants: RegistroTenants;
  limitador: LimitadorTaxa;
  codigos: ArmazenamentoCodigos;
  enviador: EnviadorEmail;
  /** Chave do HMAC do código de e-mail (segredo; só em variável de ambiente). */
  chaveHmac: Buffer;
  agora: () => Date;
}

const VALIDADE_CODIGO_S = 600;
const REENVIAR_EM_S = 60;
const MAX_TENTATIVAS = 5;
const PADRAO_LIMITE = { maximo: 20, janelaSegundos: 3600 };
const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

function limite(t: TenantAtivo, nome: string) {
  return t.config.app.limitesTaxa[nome] ?? PADRAO_LIMITE;
}

/** Redis ou provedor fora do ar não derruba a API: o login responde 503 e o app tenta de novo. */
async function redisOu503<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ErroApi) throw err;
    throw new ErroApi('servico_indisponivel', undefined, undefined, 30);
  }
}

async function limitar(d: DepsAuth, t: TenantAtivo, nome: string, chave: string): Promise<number | null> {
  const { maximo, janelaSegundos } = limite(t, nome);
  return redisOu503(d.limitador.usar(`${nome}:${chave}`, maximo, janelaSegundos));
}

function corpoObjeto(req: FastifyRequest): Record<string, unknown> {
  const b = req.body;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) throw new ErroApi('requisicao_malformada');
  return b as Record<string, unknown>;
}

function lerEmail(b: Record<string, unknown>, campos: CampoInvalido[]): string {
  const bruto = b.email;
  const email = typeof bruto === 'string' ? bruto.trim().toLowerCase() : '';
  if (email.length === 0 || email.length > 254 || !EMAIL.test(email)) campos.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' });
  return email;
}

function sessaoJson(par: ParDeTokens, contaNova: boolean, usuario: unknown) {
  return {
    access_token: par.accessToken,
    access_expira_em: par.accessExpiraEm.toISOString(),
    refresh_token: par.refreshToken,
    refresh_expira_em: par.refreshExpiraEm.toISOString(),
    conta_nova: contaNova,
    usuario,
  };
}

export function rotasAuth(app: FastifyInstance, d: DepsAuth): void {
  app.post('/v1/auth/email/codigo', async (req, reply) => {
    const tenant = await tenantDaRequisicao(req, d.tenants);
    const espera = await limitar(d, tenant, 'codigoEmailPorIp', `${tenant.slug}:${req.ip}`);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const campos: CampoInvalido[] = [];
    const email = lerEmail(corpoObjeto(req), campos);
    if (campos.length > 0) throw new ErroApi('validacao', undefined, campos);

    const resposta = { expira_em_segundos: VALIDADE_CODIGO_S, reenviar_em_segundos: REENVIAR_EM_S };
    // Limite por e-mail: responde 202 sem enviar, para não revelar nada nem permitir bombardear a caixa de alguém.
    const chave = chaveEmail(tenant.id, email);
    // O limite por hora só conta pedidos que passaram pelo de 1 minuto: tentativa barrada não gasta um dos 5 códigos.
    const minuto = await limitar(d, tenant, 'codigoEmailPorEmailMinuto', chave);
    const hora = minuto === null ? await limitar(d, tenant, 'codigoEmailPorEmailHora', chave) : null;
    if (minuto !== null || hora !== null) return reply.code(202).send(resposta);

    // Cota diária própria do provedor (plano grátis): acima dela, 503 até a janela virar.
    const cota = await limitar(d, tenant, 'emailDiario', tenant.slug);
    if (cota !== null) throw new ErroApi('servico_indisponivel', undefined, undefined, cota);

    const codigo = novoCodigo();
    await redisOu503(d.codigos.guardar(chave, hmacCodigo(d.chaveHmac, tenant.id, email, codigo), VALIDADE_CODIGO_S));
    try {
      await d.enviador.enviarCodigo(email, codigo, tenant.config.app.nomeApp);
    } catch (err) {
      req.log.error({ err: (err as Error).message }, 'envio do código falhou');
      throw new ErroApi('servico_indisponivel', undefined, undefined, 30);
    }
    return reply.code(202).send(resposta);
  });

  app.post('/v1/auth/email/verificar', async (req) => {
    const tenant = await tenantDaRequisicao(req, d.tenants);
    const espera = await limitar(d, tenant, 'verificarPorIp', `${tenant.slug}:${req.ip}`);
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);

    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];
    const email = lerEmail(b, campos);
    const codigo = typeof b.codigo === 'string' ? b.codigo : '';
    if (!/^[0-9]{6}$/.test(codigo)) campos.push({ campo: 'codigo', mensagem: 'O código tem 6 dígitos.' });
    if (campos.length > 0) throw new ErroApi('validacao', undefined, campos);

    const resultado = await redisOu503(
      d.codigos.conferir(chaveEmail(tenant.id, email), hmacCodigo(d.chaveHmac, tenant.id, email, codigo), MAX_TENTATIVAS),
    );
    if (resultado === 'invalido') throw new ErroApi('codigo_invalido');
    if (resultado === 'expirado') throw new ErroApi('codigo_expirado');

    const agora = d.agora();
    const { par, contaNova, userId } = await comTransacao(d.db, async (c) => {
      const u = await acharOuCriarPorEmail(c, tenant.id, email, agora);
      return { par: await criarSessao(c, tenant.id, u.userId, agora), contaNova: u.contaNova, userId: u.userId };
    });
    return sessaoJson(par, contaNova, await montarUsuario(d.db, tenant.id, userId, tenant.config.app, agora));
  });

  app.post('/v1/auth/renovar', async (req) => {
    const refresh = corpoObjeto(req).refresh_token;
    if (typeof refresh !== 'string' || refresh.length === 0 || refresh.length > 128) {
      throw new ErroApi('validacao', undefined, [{ campo: 'refresh_token', mensagem: 'Informe o refresh token.' }]);
    }
    const agora = d.agora();
    const feito = await comTransacao(d.db, async (c) => {
      try {
        return await renovarSessao(c, refresh, agora, async (sessionId, tenantId) => {
          // O tenant só se conhece depois de achar a sessão (o refresh não leva X-Tenant).
          const t = await d.tenants.porId(tenantId);
          if (t === null) throw new ErroApi('nao_autenticado');
          const { maximo, janelaSegundos } = limite(t, 'renovarPorSessao');
          const espera = await redisOu503(d.limitador.usar(`renovarPorSessao:${sessionId}`, maximo, janelaSegundos));
          if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);
        });
      } catch (err) {
        // A revogação por reuso tem de ser gravada (COMMIT) mesmo que a resposta seja 401.
        if (err instanceof ErroSessaoRevogadaPorReuso) return err;
        throw err;
      }
    });
    if (feito instanceof ErroSessaoRevogadaPorReuso) throw feito;
    const tenant = await d.tenants.porId(feito.tenantId);
    if (tenant === null) throw new ErroApi('nao_autenticado');
    return sessaoJson(feito, false, await montarUsuario(d.db, feito.tenantId, feito.userId, tenant.config.app, agora));
  });

  app.post('/v1/auth/sair', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora, { permitirTermosPendentes: true });
    await revogarSessao(d.db, ctx.tenantId, ctx.sessionId, 'saiu', agora);
    return reply.code(204).send();
  });
}
