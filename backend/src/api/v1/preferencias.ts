// Preferências do usuário: categorias, CEPs (só o CEP, nunca endereço), silêncio e limite diário.
import type { ConfigApp } from '../../shared/tenantConfig.js';
import { ErroApi } from '../erros.js';
import * as repo from '../repositorio.js';
import { sessaoDe, type Handler } from './contexto.js';

export interface PreferenciasEntrada {
  categorias: string[];
  ceps: string[];
  silencio: { inicio: string; fim: string } | null;
  limiteDiario: number | null;
}

/** Regras de negócio que o esquema JSON não expressa, porque dependem do tenant e do plano. */
export function validarPreferencias(p: PreferenciasEntrada, app: ConfigApp, premium: boolean): ErroApi | null {
  const desconhecida = p.categorias.find((c) => app.rotulosCategorias[c] === undefined);
  if (desconhecida !== undefined) return new ErroApi(422, 'CATEGORIA_DESCONHECIDA', `Categoria desconhecida: ${desconhecida}.`);
  const fora = p.ceps.find((cep) => !app.regiao.faixasCep.some((f) => cep >= f.inicio && cep <= f.fim));
  if (fora !== undefined) return new ErroApi(422, 'CEP_FORA_DA_REGIAO', `CEP ${fora} fora da região atendida (${app.regiao.nome}).`);
  const maxCeps = app.planos[premium ? 'premium' : 'gratuito'].maxCeps;
  if (p.ceps.length > maxCeps) return new ErroApi(403, 'LIMITE_DO_PLANO', `O plano atual permite ${maxCeps} CEP(s).`);
  if (p.limiteDiario !== null && p.limiteDiario > app.limiteDiarioMaximo) {
    return new ErroApi(422, 'LIMITE_DIARIO_INVALIDO', `O limite diário vai até ${app.limiteDiarioMaximo}.`);
  }
  if (p.silencio !== null && p.silencio.inicio === p.silencio.fim) {
    return new ErroApi(422, 'SILENCIO_INVALIDO', 'Início e fim do silêncio não podem ser iguais.');
  }
  return null;
}

function visao(p: repo.LinhaPreferencias | null): Record<string, unknown> {
  const v = p ?? { categorias: [], ceps: [], silencioInicio: null, silencioFim: null, limiteDiario: null };
  return {
    categorias: v.categorias,
    ceps: v.ceps,
    silencio: v.silencioInicio === null || v.silencioFim === null ? null : { inicio: v.silencioInicio, fim: v.silencioFim },
    limiteDiario: v.limiteDiario,
    completas: v.categorias.length > 0 && v.ceps.length > 0,
  };
}

export const obterPreferencias: Handler = async (req, _reply, deps) =>
  visao(await repo.obterPreferencias(deps.db, req.tenant.id, sessaoDe(req).usuario.id));

export const salvarPreferencias: Handler = async (req, _reply, deps) => {
  const p = req.body as PreferenciasEntrada;
  const { usuario } = sessaoDe(req);
  const erro = validarPreferencias(p, req.tenant.config.app, usuario.premium);
  if (erro !== null) throw erro;
  const linha: repo.LinhaPreferencias = {
    categorias: p.categorias,
    ceps: p.ceps,
    silencioInicio: p.silencio?.inicio ?? null,
    silencioFim: p.silencio?.fim ?? null,
    limiteDiario: p.limiteDiario,
  };
  await repo.salvarPreferencias(deps.db, req.tenant.id, usuario.id, linha, deps.agora());
  return visao(linha);
};
