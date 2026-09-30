// Dados da conta: termos, consentimento de notificação e exclusão (LGPD).
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import { emTransacao, sessaoDe, visaoUsuario, type Handler } from './contexto.js';

async function usuarioAtual(req: Parameters<Handler>[0], deps: Parameters<Handler>[2]): Promise<unknown> {
  const u = await repo.buscarUsuario(deps.db, req.tenant.id, sessaoDe(req).usuario.id, deps.agora());
  if (u === null) throw new ErroApi(401, 'SESSAO_INVALIDA', 'Conta não encontrada.');
  return visaoUsuario(u, req.tenant.config.app);
}

export const obterUsuario: Handler = async (req, _reply, deps) => visaoUsuario(sessaoDe(req).usuario, req.tenant.config.app);

export const aceitarTermos: Handler = async (req, _reply, deps) => {
  const vigente = req.tenant.config.app.documentos.termos.versao;
  const { versao } = req.body as { versao: string };
  if (versao !== vigente) {
    throw new ErroApi(409, 'TERMOS_DESATUALIZADOS', `A versão vigente dos termos é ${vigente}.`);
  }
  await repo.registrarAceiteTermos(deps.db, req.tenant.id, sessaoDe(req).usuario.id, versao, deps.agora());
  return usuarioAtual(req, deps);
};

export const definirConsentimentoNotificacoes: Handler = async (req, _reply, deps) => {
  const { consentidas } = req.body as { consentidas: boolean };
  await repo.registrarConsentimento(deps.db, req.tenant.id, sessaoDe(req).usuario.id, consentidas, deps.agora());
  return usuarioAtual(req, deps);
};

export const excluirConta: Handler = async (req, reply, deps) => {
  await emTransacao(deps.db, (c) => repo.excluirConta(c, req.tenant.id, sessaoDe(req).usuario.id));
  return reply.code(204).send();
};
