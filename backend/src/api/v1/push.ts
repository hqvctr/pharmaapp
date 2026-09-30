// Aparelhos que recebem push e abertura de notificação.
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import { sessaoDe, type Handler } from './contexto.js';

export const registrarDispositivo: Handler = async (req, reply, deps) => {
  const { token, plataforma } = req.body as { token: string; plataforma: string };
  const sessao = sessaoDe(req);
  await repo.registrarDispositivo(deps.db, {
    tenantId: req.tenant.id,
    userId: sessao.usuario.id,
    sessaoId: sessao.id,
    token,
    plataforma,
    agora: deps.agora(),
  });
  return reply.code(204).send();
};

export const registrarAberturaEntrega: Handler = async (req, reply, deps) => {
  const { id } = req.params as { id: string };
  const ok = await repo.registrarAbertura(deps.db, req.tenant.id, sessaoDe(req).usuario.id, id, deps.agora());
  if (!ok) throw new ErroApi(404, 'ENTREGA_NAO_ENCONTRADA', 'Entrega não encontrada.');
  return reply.code(204).send();
};
