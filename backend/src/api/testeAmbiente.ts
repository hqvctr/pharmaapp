// Ambiente compartilhado dos testes de integração das rotas (Postgres de verdade; pula sem PG_TESTE_URL). Não é um teste.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import type { VerificadorGoogle } from '../auth/google.js';
import { criarSessao, criarSessaoOperador } from '../auth/sessoes.js';
import { iguais } from '../auth/tokens.js';
import { migrate } from '../db/migrate.js';
import { buildApp } from './app.js';
import { ErroApi } from './erros.js';
import type { ProvedorLinkOferta } from './linkOferta.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import type { ChaveCredenciais } from '../shared/cifra.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { RegistroTenantsBanco } from './tenants.js';

export const URL_BASE = process.env.PG_TESTE_URL;
export const VIGENTE = '2026-10-28';
export const DROGASMIL = 'd855f505-7e26-4961-a182-c2139aeadd2c'; // marca liberada em fontes.lomadee.marcasPermitidasParaLink
export const INICIO = new Date('2026-11-01T12:00:00Z');

export function ambienteDeTeste(prefixo: string, opcoes: { google?: VerificadorGoogle; clientIdsGoogle?: string[]; chaveCredenciais?: ChaveCredenciais; listasMedicamentos?: (() => Promise<ListasMedicamentos>) | null } = {}) {
  const nomeBanco = `${prefixo}_${process.pid}_${Date.now()}`;
  const e = {
    pool: undefined as unknown as pg.Pool,
    app: undefined as unknown as ReturnType<typeof buildApp>,
    tenantId: '',
    outroTenantId: '',
    agora: INICIO,
    seq: 0,
    linkFalhaPara: new Set<string>(),
    chamadasLink: [] as string[],
    /** E-mails de código enviados (app e operador), na ordem. */
    enviados: [] as Array<{ para: string; codigo: string; nomeApp: string }>,
  };
  let admin: pg.Client;
  const links: ProvedorLinkOferta = {
    resolver: async (_t, o) => {
      e.chamadasLink.push(o.id);
      if (e.linkFalhaPara.has(o.id)) throw new ErroApi('servico_indisponivel', undefined, undefined, 60);
      return { link: `https://lmdee.link/${o.id.slice(0, 8)}`, afiliado: true };
    },
  };

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${nomeBanco}`);
    e.pool = new pg.Pool({ connectionString: `${URL_BASE}/${nomeBanco}`, max: 5 });
    // O DROP DATABASE ... FORCE do fim do teste derruba conexões ociosas; sem este ouvinte o erro vira "Unhandled Error" e reprova a rodada.
    e.pool.on('error', () => {});
    const c = await e.pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    e.tenantId = (await e.pool.query(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
    e.outroTenantId = (await e.pool.query(`INSERT INTO tenants (slug, nome) VALUES ('outro', 'Outro') RETURNING id`)).rows[0].id;
    const relogio = () => e.agora.getTime();
    e.app = buildApp({
      healthChecks: [],
      tenants: new RegistroTenantsBanco(e.pool, async (slug) => {
        // O tenant de apoio 'outro' (isolamento entre tenants) usa a config do padrão.
        const c = await carregarConfigTenant(slug === 'outro' ? 'padrao' : slug);
        return opcoes.clientIdsGoogle === undefined ? c : { ...c, app: { ...c.app, google: { clientIds: opcoes.clientIdsGoogle } } };
      }),
      limitador: new LimitadorMemoria(relogio),
      links,
      // As listas de teste (fixtures) por padrão; `null` simula o servidor sem a lista da primeira coleta.
      ...(opcoes.listasMedicamentos === null ? {} : { listasMedicamentos: opcoes.listasMedicamentos ?? (() => carregarListasMedicamentos('fixtures/medicamentos/listas_teste.json')) }),
      ...(opcoes.chaveCredenciais ? { chaveCredenciais: opcoes.chaveCredenciais } : {}),
      auth: { db: e.pool, codigos: new CodigosMemoria(iguais, relogio), enviador: { enviarCodigo: async (para, codigo, nomeApp) => { e.enviados.push({ para, codigo, nomeApp }); } }, ...(opcoes.google ? { google: opcoes.google } : {}), chaveHmac: Buffer.alloc(32, 9), agora: () => e.agora },
    });
  });
  beforeEach(() => {
    e.agora = INICIO;
    e.linkFalhaPara.clear();
    e.chamadasLink.length = 0;
    e.enviados.length = 0;
  });
  afterAll(async () => {
    await e.pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  const h = {
    e,
    /** Sessão nova para a conta, no instante atual do relógio (o access dura 1 h). */
    async reabrir(userId: string) {
      return { authorization: `Bearer ${(await criarSessao(e.pool, e.tenantId, userId, e.agora)).accessToken}` };
    },
    /** Operador do tenant (ou de `t`) com sessão no instante atual do relógio. */
    async operador(o: { t?: string; nome?: string; email?: string; ativo?: boolean } = {}) {
      e.seq += 1;
      const tenant = o.t ?? e.tenantId;
      const email = o.email ?? `op${e.seq}@exemplo.com`;
      const id = (await e.pool.query(`INSERT INTO operadores (tenant_id, email, nome, ativo) VALUES ($1,$2,$3,$4) RETURNING id`, [tenant, email, o.nome ?? `Operador ${e.seq}`, o.ativo ?? true])).rows[0].id as string;
      const par = await criarSessaoOperador(e.pool, tenant, id, e.agora, 7);
      return { operadorId: id, email, nome: o.nome ?? `Operador ${e.seq}`, auth: { authorization: `Bearer ${par.accessToken}` }, refreshToken: par.refreshToken };
    },
    async pessoa(o: { ceps?: string[]; categorias?: string[]; termos?: boolean } = {}) {
      e.seq += 1;
      const userId = (
        await e.pool.query(
          `INSERT INTO users (tenant_id, email, email_verificado_em, termos_versao, termos_aceitos_em) VALUES ($1,$2,now(),$3,$4) RETURNING id`,
          [e.tenantId, `t${e.seq}@exemplo.com`, o.termos === false ? null : VIGENTE, o.termos === false ? null : e.agora],
        )
      ).rows[0].id as string;
      await e.pool.query(`INSERT INTO user_preferences (user_id, tenant_id, categorias, ceps) VALUES ($1,$2,$3::text[],$4::char(8)[])`, [userId, e.tenantId, o.categorias ?? ['bebe', 'mamae'], o.ceps ?? ['14020260']]);
      return { userId, auth: await h.reabrir(userId) };
    },
    /** Loja online com a fonte própria (sem trava de marca) e uma faixa de CEP. */
    async loja(o: { nome?: string; t?: string; faixa?: [string, string, number] | null } = {}) {
      const t = o.t ?? e.tenantId;
      const fonte = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,$2,'A',120,'SP','alta','teste',true) RETURNING id`, [t, `teste-${randomUUID()}`])).rows[0].id as string;
      const loja = (await e.pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1,$2,$3,'online') RETURNING id`, [t, o.nome ?? 'Drogasmil', `${o.nome ?? 'Drogasmil'} (online)`])).rows[0].id as string;
      await e.pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [t, fonte, randomUUID(), loja]);
      const f = o.faixa === undefined ? (['01000000', '19999999', 3] as [string, string, number]) : o.faixa;
      if (f !== null) await e.pool.query(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1,$2,$3,$4,$5)`, [t, loja, f[0], f[1], f[2]]);
      return { loja, fonte };
    },
    async produto(o: { t?: string; nome?: string; marca?: string; marcaChave?: string | null; categoria?: string; quantidade?: number; unidade?: string; gtin?: string | null; familia?: string; advertencias?: string[]; subcategoria?: string | null; imagemUrl?: string | null; imagens?: string[] } = {}): Promise<string> {
      return (
        await e.pool.query(
          `INSERT INTO products (tenant_id, gtin, chave_hash, familia_chave, marca, marca_chave, nome, categoria, quantidade, unidade, advertencias, subcategoria, imagem_url, imagens)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::text[],$12,$13,$14::text[]) RETURNING id`,
          [o.t ?? e.tenantId, o.gtin ?? null, randomUUID(), o.familia ?? randomUUID(), o.marca ?? 'Pampers', o.marcaChave === undefined ? 'pampers' : o.marcaChave, o.nome ?? 'Fralda Pampers G', o.categoria ?? 'bebe', o.quantidade ?? 60, o.unidade ?? 'un', o.advertencias ?? [], o.subcategoria ?? null, o.imagemUrl ?? null, o.imagens ?? []],
        )
      ).rows[0].id;
    },
    async oferta(o: { t?: string; produto: string; loja: string; fonte: string; preco?: number; disponivel?: boolean; validaAte?: Date | null; coletadaEm?: Date; escondida?: boolean; frete?: [string, number | null]; condicao?: object | null }): Promise<string> {
      return (
        await e.pool.query(
          `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos, preco_por_unidade_centavos, condicao, frete_status, frete_centavos, disponivel, valida_ate, link, coletada_em, escondida_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'https://www.drogasmil.com.br/p/x',$13,$14) RETURNING id`,
          [o.t ?? e.tenantId, o.produto, o.loja, o.fonte, randomUUID(), o.preco ?? 5990, (o.preco ?? 5990) / 60, o.condicao ? JSON.stringify(o.condicao) : null, o.frete?.[0] ?? 'a_confirmar', o.frete?.[1] ?? null, o.disponivel ?? true, o.validaAte ?? null, o.coletadaEm ?? new Date(e.agora.getTime() - 3600_000), o.escondida ? e.agora : null],
        )
      ).rows[0].id;
    },
    async alerta(o: { t?: string; oferta: string; loja: string; preco?: number; revisao?: string; decisao?: string }): Promise<string> {
      return (
        await e.pool.query(
          `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos, preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar, criado_em, revisao_situacao, revisao_em)
           VALUES ($1,$2,$3,$4,80,$5,'teste',$6,99.8,149.7,false,$7,$8,$9) RETURNING id`,
          [o.t ?? e.tenantId, o.oferta, o.loja, randomUUID(), o.decisao ?? 'notificar', o.preco ?? 5990, e.agora, o.revisao ?? 'nao_exigida', o.revisao === 'aprovado' || o.revisao === 'rejeitado' ? e.agora : null],
        )
      ).rows[0].id;
    },
    async aviso(o: { t?: string; userId: string; produto: string; loja?: string | null; alerta?: string | null; tipo?: string; origem?: string; preco?: number | null; queda?: number | null; validaAte?: Date | null; criadoEm?: Date; lido?: Date | null }): Promise<string> {
      return (
        await e.pool.query(
          `INSERT INTO avisos (tenant_id, user_id, tipo, origem, product_id, store_id, alert_id, preco_centavos, queda, valida_ate, criado_em, lido_em)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [o.t ?? e.tenantId, o.userId, o.tipo ?? 'queda_percentual', o.origem ?? 'seguido', o.produto, o.loja ?? null, o.alerta ?? null, o.preco === undefined ? 5990 : o.preco, o.queda === undefined ? 0.25 : o.queda, o.validaAte ?? null, o.criadoEm ?? e.agora, o.lido ?? null],
        )
      ).rows[0].id;
    },
    async historico(produto: string, loja: string, observadoEm: string, precoPorUnidade: number, precoEmbalagem = 5990) {
      await e.pool.query(`INSERT INTO price_history (tenant_id, product_id, store_id, preco_centavos, preco_por_unidade_centavos, observado_em) VALUES ($1,$2,$3,$4,$5,$6)`, [e.tenantId, produto, loja, precoEmbalagem, precoPorUnidade, observadoEm]);
    },
    chamar(method: 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE', url: string, auth: Record<string, string>, payload?: unknown, extra: Record<string, string> = {}, ip?: string) {
      return e.app.inject({ method, url, headers: { ...auth, ...extra }, ...(payload !== undefined ? { payload: payload as never } : {}), ...(ip !== undefined ? { remoteAddress: ip } : {}) });
    },
  };
  return h;
}
