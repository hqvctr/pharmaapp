// GET /v1/configuracao: configuração pública do tenant, lida na abertura do app. Sem login.
import type { FastifyInstance } from 'fastify';
import { metodosLoginOferecidos } from '../../shared/configApp.js';
import { ErroApi } from '../erros.js';
import type { LimitadorTaxa } from '../limiteTaxa.js';
import { tenantDaRequisicao, type RegistroTenants, type TenantAtivo } from '../tenants.js';

const LIMITE_PADRAO = { maximo: 60, janelaSegundos: 60 };

export function corpoConfiguracao(t: TenantAtivo) {
  const { app, fuso } = t.config;
  return {
    tenant: t.slug,
    nome_app: app.nomeApp,
    fuso,
    termos: { versao: app.termos.versao, url: app.urlSite + app.termos.caminho },
    privacidade: { versao: app.privacidade.versao, url: app.urlSite + app.privacidade.caminho },
    versao_minima: app.versaoMinima,
    metodos_login: metodosLoginOferecidos(app),
    categorias: app.categorias,
    regiao: { cep_inicio: app.regiao.cepInicio, cep_fim: app.regiao.cepFim },
    limites: {
      ceps_gratuito: app.limites.cepsGratuito,
      ceps_premium: app.limites.cepsPremium,
      max_produtos_seguidos: app.limites.maxProdutosSeguidos,
      max_silenciamentos: app.limites.maxSilenciamentos,
      queda_percentual_min: app.limites.quedaPercentualMin,
      queda_percentual_max: app.limites.quedaPercentualMax,
      limite_diario_padrao: app.limites.limiteDiarioPadrao,
    },
    planos: app.planos.map((p) => ({ plano: p.plano, loja: p.loja, produto_loja_id: p.produtoLojaId })),
  };
}

export function rotaConfiguracao(app: FastifyInstance, tenants: RegistroTenants, limitador: LimitadorTaxa): void {
  app.get('/v1/configuracao', async (req) => {
    const tenant = await tenantDaRequisicao(req, tenants);
    const { maximo, janelaSegundos } = tenant.config.app.limitesTaxa.configuracao ?? LIMITE_PADRAO;
    // Rota pública de leitura: se o Redis cair, o app ainda precisa abrir. Falha aberta aqui; as rotas de login falharão fechadas.
    const espera = await limitador.usar(`configuracao:${tenant.slug}:${req.ip}`, maximo, janelaSegundos).catch((err) => {
      req.log.warn({ err }, 'limite de taxa indisponível; requisição liberada');
      return null;
    });
    if (espera !== null) throw new ErroApi('muitas_requisicoes', undefined, undefined, espera);
    return corpoConfiguracao(tenant);
  });
}
