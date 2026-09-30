// Despacho de push contra Postgres real, com cadastro de aparelho pela API. Roda só com
// TEST_DATABASE_URL apontando para banco *_teste; usa o esquema próprio "teste_push".
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LimitadorMemoria } from '../auth/limitador.js';
import { gerarToken, hashToken } from '../auth/segredos.js';
import { buildApp } from '../api/app.js';
import { criarSessao } from '../api/repositorio.js';
import { ResolvedorTenantsDb } from '../api/tenants.js';
import { migrate } from '../db/migrate.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';
import { executarDespacho } from './despachar.js';
import { EnviadorPushLog, type EnviadorPush } from './fcm.js';

const URL_TESTE = process.env.TEST_DATABASE_URL;
const H = 3_600_000;
const TERMOS = 'rascunho-2026-09-28';

describe.skipIf(URL_TESTE === undefined)('despacho de push contra Postgres', () => {
  const pool = new pg.Pool({ connectionString: URL_TESTE, max: 5, options: '-c search_path=teste_push' });
  let agora = new Date('2026-09-30T15:00:00Z'); // 12:00 em São Paulo
  let config: ConfigTenant;
  let tenantId = '';
  let fonteId = '';
  const lojas: Record<string, string> = {};
  const app = buildApp({
    healthChecks: [],
    v1: {
      db: pool,
      tenants: new ResolvedorTenantsDb(pool),
      email: { enviarCodigo: async () => {} },
      limitador: new LimitadorMemoria(() => agora),
      chavesGoogle: { chave: async () => null },
      codigoChave: Buffer.from('chave-de-teste-com-mais-de-32-caracteres'),
      agora: () => agora,
    },
  });
  const sql = (q: string, p: unknown[] = []) => pool.query(q, p);

  // Aparelho cujo token o FCM não reconhece mais.
  const log = new EnviadorPushLog();
  const enviador: EnviadorPush = {
    enviar: async (token, m) => (token.includes('morto') ? { tipo: 'token_invalido' } : log.enviar(token, m)),
  };
  const despachar = () => executarDespacho({ pool, tenantId, config, enviador, agora, log: () => {} });
  const recebidos = (email: string) => log.enviados.filter((e) => e.token.startsWith(`fcm-${email}`)).map((e) => e.mensagem);

  async function mae(o: {
    email: string;
    consentiu?: boolean;
    termos?: string;
    categorias?: string[];
    ceps?: string[];
    tamanhos?: string[];
    silencio?: [string, string];
    limite?: number;
    token?: string;
  }): Promise<{ userId: string; sessao: string }> {
    const userId = (
      await sql(
        `INSERT INTO users (tenant_id, email, termos_versao, termos_aceitos_em, notificacoes_consentidas_em)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tenantId, o.email, TERMOS, agora, o.consentiu === false ? null : agora],
      )
    ).rows[0].id;
    await sql(
      `INSERT INTO user_preferences (tenant_id, user_id, categorias, ceps, tamanhos_fralda, silencio_inicio, silencio_fim, limite_diario)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, userId, o.categorias ?? ['fraldas_lencos', 'alimentacao_infantil'], o.ceps ?? ['14010000'], o.tamanhos ?? [],
        o.silencio?.[0] ?? null, o.silencio?.[1] ?? null, o.limite ?? null],
    );
    const sessao = gerarToken();
    await criarSessao(pool, { tenantId, userId, tokenHash: hashToken(sessao), agora, expiraEm: new Date(agora.getTime() + 90 * 24 * H) });
    const r = await app.inject({
      method: 'PUT',
      url: '/v1/dispositivos',
      headers: { 'x-tenant': 'economae', authorization: `Bearer ${sessao}` },
      payload: { token: o.token ?? `fcm-${o.email}-${'x'.repeat(20)}`, plataforma: 'android' },
    });
    expect(r.statusCode).toBe(204);
    // Termos que mudaram depois do cadastro do aparelho.
    if (o.termos !== undefined) await sql('UPDATE users SET termos_versao = $2 WHERE id = $1', [userId, o.termos]);
    return { userId, sessao };
  }

  let seq = 0;
  async function oferta(o: { categoria?: string; tamanho?: string; decisao?: string; aprovado?: boolean; loja?: string; nome?: string }) {
    seq++;
    const loja = lojas[o.loja ?? 'sp']!;
    const produto = (
      await sql(
        `INSERT INTO products (tenant_id, chave_hash, familia_chave, nome, categoria, quantidade, unidade, tamanho_fralda)
         VALUES ($1, $2, $2, $3, $4, 36, 'un', $5) RETURNING id`,
        [tenantId, `p${seq}`, o.nome ?? `Fralda Marca ${seq} ${o.tamanho ?? ''} 36 Unidades`, o.categoria ?? 'fraldas_lencos', o.tamanho ?? null],
      )
    ).rows[0].id;
    const ofertaId = (
      await sql(
        `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos, preco_por_unidade_centavos,
                             frete_status, disponivel, link, coletada_em, ultima_decisao, ultimo_motivo, avaliada_em)
         VALUES ($1, $2, $3, $4, $5, 4990, 138.61, 'a_confirmar', true, 'https://loja/x', $6, $7, 'teste', $6) RETURNING id`,
        [tenantId, produto, loja, fonteId, `x${seq}`, new Date(agora.getTime() - H), o.decisao ?? 'notificar'],
      )
    ).rows[0].id;
    const alertaId = (
      await sql(
        `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos,
                             preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar, criado_em, aprovado_em)
         VALUES ($1, $2, $3, $4, 80, $5, 'teste', 4990, 138.61, 202.5, true, $6, $7) RETURNING id`,
        [tenantId, ofertaId, loja, `p${seq}`, o.decisao ?? 'notificar', new Date(agora.getTime() - H), o.aprovado ? agora : null],
      )
    ).rows[0].id;
    return { ofertaId, alertaId };
  }

  beforeAll(async () => {
    if (!/_teste(\?|$)/.test(new URL(URL_TESTE!).pathname)) throw new Error('TEST_DATABASE_URL precisa apontar para banco *_teste');
    await sql('DROP SCHEMA IF EXISTS teste_push CASCADE');
    await sql('CREATE SCHEMA teste_push');
    const c = await pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    config = await carregarConfigTenant('economae');
    tenantId = (await sql(`SELECT id FROM tenants WHERE slug = 'economae'`)).rows[0].id;
    fonteId = (
      await sql(
        `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
         VALUES ($1, 'teste', 'A', 120, 'SP', 'aprovada', 'alta', 'teste', true) RETURNING id`,
        [tenantId],
      )
    ).rows[0].id;
    for (const [nome, ini, fim] of [['sp', '01000000', '19999999'], ['rj', '20000000', '28999999']] as const) {
      lojas[nome] = (
        await sql(`INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao) VALUES ($1, $2, $2, 'online', 'aprovada', 0.9) RETURNING id`, [
          tenantId,
          `Farmácia ${nome.toUpperCase()}`,
        ])
      ).rows[0].id;
      await sql(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1, $2, $3, $4, 2)`, [
        tenantId,
        lojas[nome],
        ini,
        fim,
      ]);
    }
  });

  afterAll(async () => {
    await app.close();
    await sql('DROP SCHEMA IF EXISTS teste_push CASCADE');
    await pool.end();
  });

  it('manda só para quem pode receber, e uma vez só', async () => {
    await mae({ email: 'ana' });
    await mae({ email: 'bia', consentiu: false });
    await mae({ email: 'cris', termos: '2020-01-01' });
    await mae({ email: 'dani', categorias: ['gestacao_pos_parto'] });
    await mae({ email: 'eva', ceps: ['20040002'] });
    await mae({ email: 'fabi', tamanhos: ['M'] });
    await mae({ email: 'gabi', tamanhos: ['G', 'XG'] });
    const hugo = await mae({ email: 'hugo' });
    await app.inject({ method: 'POST', url: '/v1/auth/sair', headers: { 'x-tenant': 'economae', authorization: `Bearer ${hugo.sessao}` } });

    await oferta({ tamanho: 'G' });
    await oferta({ decisao: 'somente_feed' });
    await oferta({ decisao: 'aguardar_aprovacao' });
    await oferta({ loja: 'rj' });

    const r = await despachar();
    expect(r).toMatchObject({ enviadas: 3, falhas: 0 });
    expect(recebidos('ana')).toHaveLength(1);
    expect(recebidos('gabi')).toHaveLength(1);
    // CEP do Rio: só a oferta da loja que entrega no Rio.
    // Texto da proposta de UX: preço no título, economia em reais no corpo. Alerta sem prova (inserido
    // sem piso) cai no texto de economia simples; a loja vai nos dados para a linha de cima.
    expect(recebidos('eva').map((m) => [m.corpo, m.dados.loja])).toEqual([['R$ 23,00 abaixo do normal da loja', 'Farmácia RJ']]);
    for (const email of ['bia', 'cris', 'dani', 'fabi', 'hugo']) expect(recebidos(email)).toEqual([]);
    expect(recebidos('ana')[0]!).toMatchObject({ corpo: 'R$ 23,00 abaixo do normal da loja', dados: { loja: 'Farmácia SP', privado: '0' } });
    expect(recebidos('ana')[0]!.titulo.startsWith('R$ 49,90 · ')).toBe(true);

    const entrega = await sql(`SELECT status, enviado_em FROM deliveries WHERE id = $1`, [recebidos('ana')[0]!.dados.entregaId]);
    expect(entrega.rows[0]).toMatchObject({ status: 'enviada' });

    expect(await despachar()).toMatchObject({ enviadas: 0 });
    expect(log.enviados).toHaveLength(3);
  });

  it('alerta aprovado por humano vira push; alimento infantil leva o aviso da NBCAL', async () => {
    const { alertaId } = await oferta({ decisao: 'aguardar_aprovacao', aprovado: true });
    await oferta({ categoria: 'alimentacao_infantil', nome: 'Papinha de Banana Marca P 120g' });
    // Sem tamanho identificado: vai também para quem filtra fralda M (fabi). Ana, fabi e gabi, duas ofertas.
    expect(await despachar()).toMatchObject({ enviadas: 6, noLimiteDoDia: 0 });
    const papinha = recebidos('ana').find((m) => m.titulo.includes('Papinha'))!;
    expect(papinha.expandido).toContain('\nO Ministério da Saúde informa: o aleitamento materno');
    expect((await sql(`SELECT count(*)::int AS n FROM deliveries WHERE alert_id = $1`, [alertaId])).rows[0].n).toBe(3);
  });

  it('silêncio adia sem gravar; limite do dia segura', async () => {
    await mae({ email: 'iris', silencio: ['11:00', '13:00'], limite: 1 });
    await oferta({});
    await oferta({});
    const r = await despachar();
    expect(recebidos('iris')).toEqual([]);
    expect(r!.emSilencio).toBeGreaterThan(0);

    agora = new Date(agora.getTime() + 1.5 * H); // 13:30 em São Paulo
    const depois = await despachar();
    // Havia vários alertas recentes para ela; o limite de 1 por dia segura o resto.
    expect(recebidos('iris')).toHaveLength(1);
    expect(depois!.noLimiteDoDia).toBeGreaterThan(0);
  });

  it('token que o FCM não reconhece sai do banco', async () => {
    await mae({ email: 'joana', token: `fcm-joana-morto-${'x'.repeat(20)}` });
    await oferta({});
    const r = await despachar();
    expect(r!.aparelhosRemovidos).toBe(1);
    expect((await sql(`SELECT count(*)::int AS n FROM dispositivos WHERE token LIKE 'fcm-joana%'`)).rows[0].n).toBe(0);
  });

  it('abertura da notificação é registrada só pela dona da entrega', async () => {
    const kaka = await mae({ email: 'kaka' });
    await oferta({});
    await despachar();
    const entregaId = recebidos('kaka').at(-1)!.dados.entregaId;
    const abrir = (sessao: string) =>
      app.inject({ method: 'POST', url: `/v1/entregas/${entregaId}/abertura`, headers: { 'x-tenant': 'economae', authorization: `Bearer ${sessao}` } });
    const outra = await mae({ email: 'lu', consentiu: false });
    expect((await abrir(outra.sessao)).json().erro.codigo).toBe('ENTREGA_NAO_ENCONTRADA');
    expect((await abrir(kaka.sessao)).statusCode).toBe(204);
    expect((await sql(`SELECT aberto_em FROM deliveries WHERE id = $1`, [entregaId])).rows[0].aberto_em).not.toBeNull();
  });

  it('com outro despacho em andamento, não roda', async () => {
    const outro = await pool.connect();
    try {
      await outro.query('SELECT pg_advisory_lock(hashtextextended($1, 2))', [`despacho|${tenantId}`]);
      expect(await despachar()).toBeNull();
      await outro.query('SELECT pg_advisory_unlock(hashtextextended($1, 2))', [`despacho|${tenantId}`]);
      expect(await despachar()).not.toBeNull();
    } finally {
      outro.release();
    }
  });
});
