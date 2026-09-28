// Login por código no e-mail e por ID token do Google; logout.
import { TokenGoogleInvalido, verificarIdTokenGoogle, type IdentidadeGoogle } from '../../auth/google.js';
import { gerarCodigo, hashCodigo, mesmoHash, normalizarEmail } from '../../auth/segredos.js';
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import { abrirSessao, DIA_MS, emTransacao, HORA_MS, sessaoDe, visaoUsuario, type Handler } from './contexto.js';

function limiteExcedido(segundos: number): ErroApi {
  const s = Math.max(1, Math.ceil(segundos));
  return new ErroApi(429, 'LIMITE_EXCEDIDO', 'Muitos pedidos de código. Tente mais tarde.', { 'retry-after': String(s) });
}

export const pedirCodigoEmail: Handler = async (req, reply, deps) => {
  const { tenant } = req;
  const cfg = tenant.config.app.auth;
  const email = normalizarEmail((req.body as { email: string }).email);
  const agora = deps.agora();

  const porIp = await deps.limitador.consumir(`codigo-ip:${tenant.id}:${req.ip}`, cfg.codigosPorHoraPorIp, 3600);
  if (!porIp.permitido) throw limiteExcedido(porIp.retryAposSegundos);

  const codigo = gerarCodigo();
  await emTransacao(deps.db, async (c) => {
    await repo.travarEmail(c, tenant.id, email);
    const recentes = await repo.contarCodigosDesde(c, tenant.id, email, new Date(agora.getTime() - HORA_MS));
    if (recentes.n >= cfg.codigosPorHora) {
      throw limiteExcedido((recentes.maisAntigo!.getTime() + HORA_MS - agora.getTime()) / 1000);
    }
    await repo.apagarCodigosVencidos(c, new Date(agora.getTime() - DIA_MS));
    await repo.inserirCodigo(c, {
      tenantId: tenant.id,
      email,
      hash: hashCodigo(deps.codigoChave, tenant.id, email, codigo),
      agora,
      expiraEm: new Date(agora.getTime() + cfg.codigoValidadeMinutos * 60_000),
    });
  });

  try {
    await deps.email.enviarCodigo({ para: email, codigo, nomeApp: tenant.config.app.nome, validadeMinutos: cfg.codigoValidadeMinutos });
  } catch (err) {
    req.log.error({ err }, 'falha ao enviar código de login');
    throw new ErroApi(503, 'ENVIO_FALHOU', 'Não foi possível enviar o e-mail agora.');
  }
  return reply.code(202).send({ validadeMinutos: cfg.codigoValidadeMinutos });
};

type ResultadoVerificacao =
  | { tipo: 'ok'; token: string; expiraEm: Date; userId: string; novo: boolean }
  | { tipo: 'invalido' }
  | { tipo: 'esgotado' };

export const verificarCodigoEmail: Handler = async (req, _reply, deps) => {
  const { tenant } = req;
  const cfg = tenant.config.app.auth;
  const corpo = req.body as { email: string; codigo: string };
  const email = normalizarEmail(corpo.email);
  const agora = deps.agora();

  // A tentativa errada precisa ser gravada: a transação confirma e o erro sai depois.
  const r = await emTransacao<ResultadoVerificacao>(deps.db, async (c) => {
    await repo.travarEmail(c, tenant.id, email);
    const cod = await repo.ultimoCodigo(c, tenant.id, email);
    if (cod === null || cod.usadoEm !== null || cod.expiraEm <= agora) return { tipo: 'invalido' };
    if (cod.tentativas >= cfg.codigoTentativas) return { tipo: 'esgotado' };
    if (!mesmoHash(cod.hash, hashCodigo(deps.codigoChave, tenant.id, email, corpo.codigo))) {
      await repo.registrarTentativa(c, cod.id);
      return { tipo: 'invalido' };
    }
    await repo.marcarCodigoUsado(c, cod.id, agora);
    const existente = await repo.usuarioPorEmail(c, tenant.id, email);
    const userId = existente?.id ?? (await repo.inserirUsuario(c, tenant.id, email, null));
    return { tipo: 'ok', userId, novo: existente === null, ...(await abrirSessao(c, tenant, userId, agora)) };
  });

  if (r.tipo === 'invalido') throw new ErroApi(401, 'CODIGO_INVALIDO', 'Código inválido ou expirado.');
  if (r.tipo === 'esgotado') throw new ErroApi(429, 'TENTATIVAS_ESGOTADAS', 'Tentativas esgotadas. Peça um novo código.');
  return respostaSessao(req.tenant, r, deps);
};

async function respostaSessao(
  tenant: Parameters<Handler>[0]['tenant'],
  r: { token: string; expiraEm: Date; userId: string; novo: boolean },
  deps: Parameters<Handler>[2],
): Promise<unknown> {
  const u = await repo.buscarUsuario(deps.db, tenant.id, r.userId, deps.agora());
  if (u === null) throw new Error('Usuário sumiu logo após o login');
  return { token: r.token, expiraEm: r.expiraEm.toISOString(), novoUsuario: r.novo, usuario: visaoUsuario(u, tenant.config.app) };
}

export const entrarComGoogle: Handler = async (req, _reply, deps) => {
  const { tenant } = req;
  const audiencias = tenant.config.app.auth.googleClientIds;
  if (audiencias.length === 0) throw new ErroApi(403, 'LOGIN_GOOGLE_INDISPONIVEL', 'Login com Google não está habilitado.');
  const agora = deps.agora();

  let id: IdentidadeGoogle;
  try {
    id = await verificarIdTokenGoogle((req.body as { idToken: string }).idToken, audiencias, deps.chavesGoogle, agora);
  } catch (err) {
    if (err instanceof TokenGoogleInvalido) throw new ErroApi(401, 'TOKEN_GOOGLE_INVALIDO', `Token do Google recusado: ${err.message}.`);
    req.log.error({ err }, 'falha ao obter chaves do Google');
    throw new ErroApi(503, 'GOOGLE_INDISPONIVEL', 'Não foi possível validar o login com o Google agora.');
  }
  const email = normalizarEmail(id.email);

  const r = await emTransacao(deps.db, async (c) => {
    await repo.travarEmail(c, tenant.id, email);
    let userId = await repo.usuarioPorGoogle(c, tenant.id, id.sub);
    let novo = false;
    if (userId === null) {
      const existente = await repo.usuarioPorEmail(c, tenant.id, email);
      if (existente === null) {
        userId = await repo.inserirUsuario(c, tenant.id, email, id.sub);
        novo = true;
      } else if (existente.googleSub === null) {
        // O Google verificou o e-mail: vincula à conta criada por código.
        await repo.vincularGoogle(c, tenant.id, existente.id, id.sub);
        userId = existente.id;
      } else {
        return null;
      }
    }
    return { userId, novo, ...(await abrirSessao(c, tenant, userId, agora)) };
  });
  if (r === null) {
    throw new ErroApi(409, 'EMAIL_VINCULADO_A_OUTRO_GOOGLE', 'Este e-mail já está ligado a outra conta Google.');
  }
  return respostaSessao(tenant, r, deps);
};

export const sair: Handler = async (req, reply, deps) => {
  await repo.revogarSessao(deps.db, req.tenant.id, sessaoDe(req).id, deps.agora());
  return reply.code(204).send();
};
