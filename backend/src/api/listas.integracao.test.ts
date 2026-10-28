// Silenciamentos e seguidos contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import { criarSessao } from '../auth/sessoes.js';
import { iguais } from '../auth/tokens.js';
import { migrate } from '../db/migrate.js';
import { buildApp } from './app.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import { RegistroTenantsBanco } from './tenants.js';

const URL_BASE = process.env.PG_TESTE_URL;
const executar = URL_BASE ? describe : describe.skip;
const VIGENTE = '2026-10-28';
const AVISOS = { promocao_excepcional: true, queda_percentual: 20, voltou_estoque: true, menor_preco_180d: false, promocao_acabando: false };

executar('silenciamentos e seguidos (Postgres)', () => {
  const nomeBanco = `teste_listas_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let tenantId: string;
  let outroTenantId: string;
  let app: ReturnType<typeof buildApp>;
  let agora = new Date('2026-11-01T12:00:00Z');
  let seq = 0;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${nomeBanco}`);
    pool = new pg.Pool({ connectionString: `${URL_BASE}/${nomeBanco}`, max: 5 });
    const c = await pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    tenantId = (await pool.query(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
    outroTenantId = (await pool.query(`INSERT INTO tenants (slug, nome) VALUES ('outro', 'Outro') RETURNING id`)).rows[0].id;
    const relogio = () => agora.getTime();
    app = buildApp({
      healthChecks: [],
      tenants: new RegistroTenantsBanco(pool),
      limitador: new LimitadorMemoria(relogio),
      auth: { db: pool, codigos: new CodigosMemoria(iguais, relogio), enviador: { enviarCodigo: async () => {} }, chaveHmac: Buffer.alloc(32, 9), agora: () => agora },
    });
  });
  beforeEach(() => {
    agora = new Date('2026-11-01T12:00:00Z');
  });
  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  async function pessoa(termos = true) {
    seq += 1;
    const userId = (await pool.query(`INSERT INTO users (tenant_id, email, email_verificado_em, termos_versao, termos_aceitos_em) VALUES ($1,$2,now(),$3,$4) RETURNING id`, [tenantId, `l${seq}@exemplo.com`, termos ? VIGENTE : null, termos ? agora : null])).rows[0].id as string;
    return { userId, auth: await reabrir(userId) };
  }
  async function reabrir(userId: string) {
    return { authorization: `Bearer ${(await criarSessao(pool, tenantId, userId, agora)).accessToken}` };
  }
  async function loja(nome = 'Drogasmil', t = tenantId): Promise<string> {
    return (await pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1,$2,$3,'online') RETURNING id`, [t, nome, `${nome} (online)`])).rows[0].id;
  }
  async function produto(o: { t?: string; nome?: string; marca?: string; marcaChave?: string | null; categoria?: string; advertencias?: string[] } = {}): Promise<string> {
    return (
      await pool.query(
        `INSERT INTO products (tenant_id, chave_hash, familia_chave, marca, marca_chave, nome, categoria, quantidade, unidade, advertencias) VALUES ($1,$2,$3,$4,$5,$6,$7,0.4,'l',$8::text[]) RETURNING id`,
        [o.t ?? tenantId, randomUUID(), randomUUID(), o.marca ?? 'Pampers', o.marcaChave === undefined ? 'pampers' : o.marcaChave, o.nome ?? 'Shampoo', o.categoria ?? 'cuidados_pessoais', o.advertencias ?? []],
      )
    ).rows[0].id;
  }
  const chamar = (method: 'GET' | 'PUT' | 'DELETE', url: string, auth: Record<string, string>, payload?: unknown) =>
    app.inject({ method, url, headers: auth, ...(payload !== undefined ? { payload: payload as never } : {}) });

  // ---------------------------------------------------------------- silenciamentos
  describe('/v1/silenciamentos', () => {
    it('silencia loja: 201 ao criar, 200 ao trocar o alcance (a data não muda), lista, remove e repete a remoção', async () => {
      const p = await pessoa();
      const l = await loja('PromoFarma');
      const a = await chamar('PUT', `/v1/silenciamentos/loja/${l}`, p.auth, { alcance: 'push' });
      expect(a.statusCode).toBe(201);
      expect(a.json()).toEqual({ tipo: 'loja', alvo: l, nome: 'PromoFarma (online)', alcance: 'push', criado_em: '2026-11-01T12:00:00.000Z' });
      agora = new Date('2026-11-01T13:00:00Z');
      const b = await chamar('PUT', `/v1/silenciamentos/loja/${l}`, await reabrir(p.userId), { alcance: 'tudo' });
      expect(b.statusCode).toBe(200);
      expect(b.json()).toMatchObject({ alcance: 'tudo', criado_em: '2026-11-01T12:00:00.000Z' });
      const depois = await reabrir(p.userId);
      expect((await chamar('GET', '/v1/silenciamentos', depois)).json().itens).toHaveLength(1);
      expect((await chamar('DELETE', `/v1/silenciamentos/loja/${l}`, depois)).statusCode).toBe(204);
      expect((await chamar('DELETE', `/v1/silenciamentos/loja/${l}`, depois)).statusCode).toBe(204);
      expect((await chamar('GET', '/v1/silenciamentos', depois)).json()).toEqual({ itens: [] });
    });

    it('silencia marca pela chave, com o nome do produto; lista do mais novo para o mais antigo', async () => {
      const p = await pessoa();
      await produto({ marca: 'Huggies', marcaChave: 'huggies' });
      const l = await loja();
      await chamar('PUT', `/v1/silenciamentos/loja/${l}`, p.auth, { alcance: 'push' });
      agora = new Date('2026-11-01T12:05:00Z');
      const r = await chamar('PUT', `/v1/silenciamentos/marca/huggies`, await reabrir(p.userId), { alcance: 'tudo' });
      expect(r.statusCode).toBe(201);
      expect(r.json()).toMatchObject({ tipo: 'marca', alvo: 'huggies', nome: 'Huggies', alcance: 'tudo' });
      expect((await chamar('GET', '/v1/silenciamentos', await reabrir(p.userId))).json().itens.map((i: { tipo: string }) => i.tipo)).toEqual(['marca', 'loja']);
      expect((await chamar('DELETE', '/v1/silenciamentos/marca/huggies', p.auth)).statusCode).toBe(204);
    });

    it('alvo que não existe dá 404; tipo, alvo ou alcance inválidos dão 422', async () => {
      const p = await pessoa();
      expect((await chamar('PUT', `/v1/silenciamentos/loja/${randomUUID()}`, p.auth, { alcance: 'tudo' })).statusCode).toBe(404);
      expect((await chamar('PUT', '/v1/silenciamentos/loja/nao-e-uuid', p.auth, { alcance: 'tudo' })).statusCode).toBe(404);
      expect((await chamar('PUT', '/v1/silenciamentos/marca/marca-que-nao-existe', p.auth, { alcance: 'tudo' })).statusCode).toBe(404);
      const outroTenant = await loja('Alheia', outroTenantId);
      expect((await chamar('PUT', `/v1/silenciamentos/loja/${outroTenant}`, p.auth, { alcance: 'tudo' })).statusCode).toBe(404);
      const tipo = await chamar('PUT', '/v1/silenciamentos/produto/x', p.auth, { alcance: 'tudo' });
      expect(tipo.statusCode).toBe(422);
      expect(tipo.json().campos[0].campo).toBe('tipo');
      expect((await chamar('PUT', '/v1/silenciamentos/marca/Marca_Ruim', p.auth, { alcance: 'tudo' })).json().campos[0].campo).toBe('alvo');
      const l = await loja();
      expect((await chamar('PUT', `/v1/silenciamentos/loja/${l}`, p.auth, { alcance: 'sempre' })).json().campos[0].campo).toBe('alcance');
      expect((await chamar('DELETE', '/v1/silenciamentos/produto/x', p.auth)).statusCode).toBe(422);
    });

    it('teto de 50: o 51º dá 409 limite_atingido, mas trocar o alcance de um existente continua valendo', async () => {
      const p = await pessoa();
      const primeira = await loja('Primeira');
      await chamar('PUT', `/v1/silenciamentos/loja/${primeira}`, p.auth, { alcance: 'push' });
      await pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) SELECT $1, 'R', 'Em massa ' || g, 'online' FROM generate_series(1, 49) g`, [tenantId]);
      await pool.query(
        `INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance)
         SELECT $1, $2, 'loja', s.id, 'push' FROM (SELECT id FROM stores WHERE tenant_id = $1 AND nome LIKE 'Em massa %' LIMIT 49) s`,
        [tenantId, p.userId],
      );
      expect((await pool.query(`SELECT count(*)::int AS n FROM silenciamentos WHERE user_id = $1`, [p.userId])).rows[0].n).toBe(50);
      const nova = await loja('Nova');
      const r = await chamar('PUT', `/v1/silenciamentos/loja/${nova}`, p.auth, { alcance: 'push' });
      expect(r.statusCode).toBe(409);
      expect(r.json().codigo).toBe('limite_atingido');
      expect((await chamar('PUT', `/v1/silenciamentos/loja/${primeira}`, p.auth, { alcance: 'tudo' })).statusCode).toBe(200);
    });

    it('cada pessoa vê e remove só o que é seu; termos pendentes dão 403; sem login 401', async () => {
      const a = await pessoa();
      const b = await pessoa();
      const l = await loja();
      await chamar('PUT', `/v1/silenciamentos/loja/${l}`, a.auth, { alcance: 'tudo' });
      expect((await chamar('GET', '/v1/silenciamentos', b.auth)).json().itens).toEqual([]);
      await chamar('DELETE', `/v1/silenciamentos/loja/${l}`, b.auth);
      expect((await chamar('GET', '/v1/silenciamentos', a.auth)).json().itens).toHaveLength(1);
      expect((await chamar('GET', '/v1/silenciamentos', (await pessoa(false)).auth)).json().codigo).toBe('termos_pendentes');
      expect((await app.inject({ method: 'GET', url: '/v1/silenciamentos' })).statusCode).toBe(401);
    });
  });

  // ---------------------------------------------------------------- seguidos
  describe('/v1/seguidos', () => {
    it('segue (201), troca os avisos (200, criado_em fixo e atualizado_em novo), deixa de seguir (204, idempotente)', async () => {
      const p = await pessoa();
      const prod = await produto({ nome: 'Shampoo Elseve 400 ml', marca: 'Elseve', marcaChave: 'elseve' });
      const a = await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, { avisos: AVISOS });
      expect(a.statusCode).toBe(201);
      expect(a.json()).toMatchObject({
        produto: { id: prod, nome: 'Shampoo Elseve 400 ml', marca: { chave: 'elseve', nome: 'Elseve' }, categoria: 'cuidados_pessoais', embalagem: { quantidade: 0.4, unidade: 'l' } },
        avisos: AVISOS, criado_em: '2026-11-01T12:00:00.000Z', atualizado_em: '2026-11-01T12:00:00.000Z',
      });
      agora = new Date('2026-11-02T09:00:00Z');
      const novos = { ...AVISOS, queda_percentual: null, menor_preco_180d: true };
      const b = await chamar('PUT', `/v1/seguidos/${prod}`, await reabrir(p.userId), { avisos: novos });
      expect(b.statusCode).toBe(200);
      expect(b.json()).toMatchObject({ avisos: novos, criado_em: '2026-11-01T12:00:00.000Z', atualizado_em: '2026-11-02T09:00:00.000Z' });
      expect((await pool.query(`SELECT count(*)::int AS n FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0].n).toBe(1);
      const depois = await reabrir(p.userId);
      expect((await chamar('DELETE', `/v1/seguidos/${prod}`, depois)).statusCode).toBe(204);
      expect((await chamar('DELETE', `/v1/seguidos/${prod}`, depois)).statusCode).toBe(204);
      expect((await chamar('DELETE', `/v1/seguidos/${randomUUID()}`, depois)).statusCode).toBe(204);
      expect((await chamar('DELETE', '/v1/seguidos/nao-e-uuid', depois)).statusCode).toBe(204);
      expect((await pool.query(`SELECT count(*)::int AS n FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0].n).toBe(0);
    });

    it('lista do mais novo para o mais antigo, em páginas por cursor sem repetir nem perder', async () => {
      const p = await pessoa();
      const seguidos: string[] = [];
      for (let i = 0; i < 5; i++) {
        const prod = await produto({ nome: `Produto ${i}` });
        agora = new Date(2026, 10, 1, 12, i); // cada um um minuto depois
        await chamar('PUT', `/v1/seguidos/${prod}`, await reabrir(p.userId), { avisos: AVISOS });
        seguidos.unshift(prod);
      }
      const vistos: string[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      const auth = await reabrir(p.userId);
      do {
        const r = await chamar('GET', `/v1/seguidos?limite=2${cursor ? `&cursor=${cursor}` : ''}`, auth);
        expect(r.statusCode).toBe(200);
        vistos.push(...r.json().itens.map((i: { produto: { id: string } }) => i.produto.id));
        cursor = r.json().proximo_cursor;
        paginas += 1;
      } while (cursor !== null && paginas < 10);
      expect(vistos).toEqual(seguidos);
      expect(paginas).toBe(3);
      for (const q of ['?limite=0', '?limite=51', '?cursor=lixo']) expect((await chamar('GET', `/v1/seguidos${q}`, auth)).statusCode, q).toBe(422);
    });

    it('validação dos avisos: tipos, faixa do percentual (5 a 90) e campos que faltam', async () => {
      const p = await pessoa();
      const prod = await produto();
      expect((await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, {})).json().campos[0].campo).toBe('avisos');
      const ruim = await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, { avisos: { promocao_excepcional: 'sim', queda_percentual: 4 } });
      expect(ruim.statusCode).toBe(422);
      expect(ruim.json().campos.map((c: { campo: string }) => c.campo)).toEqual(
        ['avisos.promocao_excepcional', 'avisos.voltou_estoque', 'avisos.menor_preco_180d', 'avisos.promocao_acabando', 'avisos.queda_percentual'],
      );
      for (const q of [4, 91, 10.5, '20']) expect((await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, { avisos: { ...AVISOS, queda_percentual: q } })).statusCode, String(q)).toBe(422);
      for (const q of [5, 90, null]) expect((await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, { avisos: { ...AVISOS, queda_percentual: q } })).statusCode, String(q)).toBeLessThan(300);
      expect((await chamar('PUT', `/v1/seguidos/${prod}`, p.auth, { avisos: { ...AVISOS, queda_percentual: undefined } })).statusCode).toBe(422);
    });

    it('só se segue produto do app: medicamento, produto com advertência legal, outro tenant e id inexistente dão 404', async () => {
      const p = await pessoa();
      const remedio = await produto({ categoria: 'medicamentos_isentos', nome: 'Dipirona' });
      const nbcal = await produto({ nome: 'Cereal infantil', advertencias: ['nbcal_apos_6_meses'] });
      const alheio = await produto({ t: outroTenantId });
      for (const id of [remedio, nbcal, alheio, randomUUID(), 'nao-e-uuid']) {
        const r = await chamar('PUT', `/v1/seguidos/${id}`, p.auth, { avisos: AVISOS });
        expect(r.statusCode, id).toBe(404);
        expect(r.json().codigo).toBe('nao_encontrado');
      }
      expect((await pool.query(`SELECT count(*)::int AS n FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0].n).toBe(0);
    });

    it('teto de 100: o 101º dá 409, mas trocar os avisos de um seguido continua valendo', async () => {
      const p = await pessoa();
      const primeiro = await produto({ nome: 'Primeiro' });
      await chamar('PUT', `/v1/seguidos/${primeiro}`, p.auth, { avisos: AVISOS });
      await pool.query(
        `INSERT INTO products (tenant_id, chave_hash, familia_chave, marca, nome, categoria, quantidade, unidade)
         SELECT $1, gen_random_uuid()::text, gen_random_uuid()::text, 'M', 'Em massa ' || g, 'limpeza', 1, 'un' FROM generate_series(1, 99) g`,
        [tenantId],
      );
      await pool.query(
        `INSERT INTO seguidos (tenant_id, user_id, product_id) SELECT $1, $2, id FROM products WHERE tenant_id = $1 AND nome LIKE 'Em massa %'`,
        [tenantId, p.userId],
      );
      expect((await pool.query(`SELECT count(*)::int AS n FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0].n).toBe(100);
      const extra = await produto({ nome: 'Extra' });
      const r = await chamar('PUT', `/v1/seguidos/${extra}`, p.auth, { avisos: AVISOS });
      expect(r.statusCode).toBe(409);
      expect(r.json().codigo).toBe('limite_atingido');
      expect((await chamar('PUT', `/v1/seguidos/${primeiro}`, p.auth, { avisos: { ...AVISOS, voltou_estoque: false } })).statusCode).toBe(200);
    });

    it('cada pessoa vê só os próprios seguidos; termos pendentes dão 403', async () => {
      const a = await pessoa();
      const b = await pessoa();
      const prod = await produto();
      await chamar('PUT', `/v1/seguidos/${prod}`, a.auth, { avisos: AVISOS });
      expect((await chamar('GET', '/v1/seguidos', b.auth)).json().itens).toEqual([]);
      await chamar('DELETE', `/v1/seguidos/${prod}`, b.auth);
      expect((await chamar('GET', '/v1/seguidos', a.auth)).json().itens).toHaveLength(1);
      expect((await chamar('GET', '/v1/seguidos', (await pessoa(false)).auth)).json().codigo).toBe('termos_pendentes');
      expect((await chamar('PUT', `/v1/seguidos/${prod}`, (await pessoa(false)).auth, { avisos: AVISOS })).statusCode).toBe(403);
    });
  });
});
