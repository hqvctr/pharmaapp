// /v1/preferencias (openapi.yaml, tag preferencias). Exige termos aceitos.
import type { FastifyInstance } from 'fastify';
import { montarUsuario } from '../../auth/usuarios.js';
import { corpoObjeto, falhaDeValidacao } from '../corpo.js';
import { ErroApi, type CampoInvalido } from '../erros.js';
import type { Db } from '../../pipeline/repositorio.js';
import { exigirSessao } from '../sessao.js';
import type { DepsAuth } from './auth.js';

const CEP = /^[0-9]{8}$/;
const HORA = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const LIMITE_DIARIO_MAXIMO = 1000; // a coluna é smallint; mais que isso nunca é um pedido razoável

export interface PreferenciasApi {
  categorias: string[];
  ceps: string[];
  silencio: { inicio: string; fim: string } | null;
  limite_diario: number | null;
  ceps_ignorados_pelo_plano: string[];
}

function plural(n: number): string {
  return n === 1 ? '1 CEP' : `${n} CEPs`;
}

export function rotasPreferencias(app: FastifyInstance, d: DepsAuth): void {
  app.get('/v1/preferencias', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const usuario = await montarUsuario(d.db, ctx.tenantId, ctx.userId, ctx.tenant.config.app, agora);
    return lerPreferencias(d.db, ctx.tenantId, ctx.userId, usuario.plano.ceps_permitidos);
  });

  app.put('/v1/preferencias', async (req) => {
    const agora = d.agora();
    const ctx = await exigirSessao(req, d.db, d.tenants, agora);
    const cfg = ctx.tenant.config.app;
    const b = corpoObjeto(req);
    const campos: CampoInvalido[] = [];

    const categorias: string[] = [];
    if (!Array.isArray(b.categorias)) campos.push({ campo: 'categorias', mensagem: 'Envie a lista de categorias.' });
    else {
      const validas = new Set(cfg.categorias.map((c) => c.slug));
      b.categorias.forEach((c: unknown, i: number) => {
        if (typeof c !== 'string' || !validas.has(c)) campos.push({ campo: `categorias[${i}]`, mensagem: 'Categoria desconhecida.' });
        else if (categorias.includes(c)) campos.push({ campo: `categorias[${i}]`, mensagem: 'Categoria repetida.' });
        else categorias.push(c);
      });
    }

    const ceps: string[] = [];
    if (!Array.isArray(b.ceps)) campos.push({ campo: 'ceps', mensagem: 'Envie a lista de CEPs.' });
    else {
      b.ceps.forEach((c: unknown, i: number) => {
        if (typeof c !== 'string' || !CEP.test(c)) campos.push({ campo: `ceps[${i}]`, mensagem: 'O CEP tem 8 dígitos, sem hífen.' });
        else if (ceps.includes(c)) campos.push({ campo: `ceps[${i}]`, mensagem: 'CEP repetido.' });
        else ceps.push(c);
      });
      if (b.ceps.length > cfg.limites.cepsPremium) campos.push({ campo: 'ceps', mensagem: `No máximo ${cfg.limites.cepsPremium} CEPs.` });
    }

    let silencio: { inicio: string; fim: string } | null = null;
    if (b.silencio === undefined) campos.push({ campo: 'silencio', mensagem: 'Envie a janela de silêncio ou null.' });
    else if (b.silencio !== null) {
      const s = b.silencio as Record<string, unknown>;
      if (typeof s !== 'object' || Array.isArray(s) || typeof s.inicio !== 'string' || !HORA.test(s.inicio) || typeof s.fim !== 'string' || !HORA.test(s.fim)) {
        campos.push({ campo: 'silencio', mensagem: 'Use início e fim no formato HH:MM.' });
      } else if (s.inicio === s.fim) campos.push({ campo: 'silencio', mensagem: 'Início e fim não podem ser iguais.' });
      else silencio = { inicio: s.inicio, fim: s.fim };
    }

    let limite: number | null = null;
    if (b.limite_diario === undefined) campos.push({ campo: 'limite_diario', mensagem: 'Envie o limite diário ou null.' });
    else if (b.limite_diario !== null) {
      if (!Number.isInteger(b.limite_diario) || (b.limite_diario as number) < 1 || (b.limite_diario as number) > LIMITE_DIARIO_MAXIMO) {
        campos.push({ campo: 'limite_diario', mensagem: 'Use um número inteiro a partir de 1.' });
      } else limite = b.limite_diario as number;
    }
    if (campos.length > 0) throw falhaDeValidacao(campos);

    const fora: CampoInvalido[] = [];
    ceps.forEach((c, i) => {
      if (c < cfg.regiao.cepInicio || c > cfg.regiao.cepFim) fora.push({ campo: `ceps[${i}]`, mensagem: 'Ainda não atendemos este CEP.' });
    });
    if (fora.length > 0) throw new ErroApi('cep_fora_da_regiao', undefined, fora);

    const usuario = await montarUsuario(d.db, ctx.tenantId, ctx.userId, cfg, agora);
    const permitidos = usuario.plano.ceps_permitidos;
    if (ceps.length > permitidos) throw new ErroApi('plano_insuficiente', `Seu plano permite ${plural(permitidos)}.`);

    await d.db.query(
      `INSERT INTO user_preferences (user_id, tenant_id, categorias, ceps, silencio_inicio, silencio_fim, limite_diario, atualizado_em)
       VALUES ($1, $2, $3::text[], $4::char(8)[], $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET categorias = EXCLUDED.categorias, ceps = EXCLUDED.ceps,
         silencio_inicio = EXCLUDED.silencio_inicio, silencio_fim = EXCLUDED.silencio_fim,
         limite_diario = EXCLUDED.limite_diario, atualizado_em = EXCLUDED.atualizado_em`,
      [ctx.userId, ctx.tenantId, categorias, ceps, silencio?.inicio ?? null, silencio?.fim ?? null, limite, agora],
    );
    return lerPreferencias(d.db, ctx.tenantId, ctx.userId, permitidos);
  });
}

export async function lerPreferencias(db: Db, tenantId: string, userId: string, cepsPermitidos: number): Promise<PreferenciasApi> {
  const r = (
    await db.query(
      `SELECT categorias, ceps, to_char(silencio_inicio, 'HH24:MI') AS inicio, to_char(silencio_fim, 'HH24:MI') AS fim, limite_diario
         FROM user_preferences WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    )
  ).rows[0];
  if (r === undefined) return { categorias: [], ceps: [], silencio: null, limite_diario: null, ceps_ignorados_pelo_plano: [] };
  const ceps: string[] = r.ceps;
  return {
    categorias: r.categorias,
    ceps: ceps.slice(0, cepsPermitidos),
    silencio: r.inicio !== null && r.fim !== null ? { inicio: r.inicio, fim: r.fim } : null,
    limite_diario: r.limite_diario,
    // Guardados, mas que o plano de hoje não usa (ex.: premium vencido).
    ceps_ignorados_pelo_plano: ceps.slice(cepsPermitidos),
  };
}
