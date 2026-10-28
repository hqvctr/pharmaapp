// Conta, consentimentos e preferências contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import { criarSessao } from '../auth/sessoes.js';
import { iguais } from '../auth/tokens.js';
import { migrate } from '../db/migrate.js';
import { buildApp } from './app.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import { RegistroTenantsBanco } from './tenants.js';

const URL_BASE = process.env.PG_TESTE_URL;
const executar = URL_BASE ? describe : describe.skip;
const VIGENTE = '2026-10-28'; // app.termos.versao do tenant padrão

executar('conta e preferências (Postgres)', () => {
  const nomeBanco = `teste_conta_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let tenantId: string;
  let app: ReturnType<typeof buildApp>;
  let agora = new Date('2026-11-01T12:00:00Z');
  let seq = 0;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${nomeBanco}`);
    pool = new pg.Pool({ connectionString: `${URL_BASE}/${nomeBanco}`, max: 5 });
    // O DROP DATABASE ... FORCE do fim do teste derruba conexões ociosas; sem este ouvinte o erro vira "Unhandled Error" e reprova a rodada.
    pool.on('error', () => {});
    const c = await pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    tenantId = (await pool.query(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
    const relogio = () => agora.getTime();
    app = buildApp({
      healthChecks: [],
      tenants: new RegistroTenantsBanco(pool),
      limitador: new LimitadorMemoria(relogio),
      auth: {
        db: pool,
        codigos: new CodigosMemoria(iguais, relogio),
        enviador: { enviarCodigo: async () => {} },
        chaveHmac: Buffer.alloc(32, 9),
        agora: () => agora,
      },
    });
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  /** Conta com sessão pronta, sem passar pelo e-mail. */
  async function novaConta(opcoes: { aceitouTermos?: boolean } = {}) {
    seq += 1;
    const u = (
      await pool.query(
        `INSERT INTO users (tenant_id, email, email_verificado_em, termos_versao, termos_aceitos_em)
         VALUES ($1, $2, now(), $3, $4) RETURNING id`,
        [tenantId, `pessoa${seq}@exemplo.com`, opcoes.aceitouTermos ? VIGENTE : null, opcoes.aceitouTermos ? agora : null],
      )
    ).rows[0].id as string;
    const sessao = await criarSessao(pool, tenantId, u, agora);
    return { userId: u, auth: { authorization: `Bearer ${sessao.accessToken}` } };
  }
  /** Sessão nova para a mesma conta, no instante atual do relógio (o access dura 1 h; os testes avançam dias). */
  async function reabrir(userId: string) {
    const sessao = await criarSessao(pool, tenantId, userId, agora);
    return { authorization: `Bearer ${sessao.accessToken}` };
  }
  const chamar = (method: 'GET' | 'PUT' | 'DELETE', url: string, auth: Record<string, string>, payload?: unknown) =>
    app.inject({ method, url, headers: auth, ...(payload !== undefined ? { payload: payload as never } : {}) });

  describe('/v1/me', () => {
    it('responde com os termos pendentes e exige login', async () => {
      const { auth } = await novaConta();
      const r = await chamar('GET', '/v1/me', auth);
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ termos_pendentes: true, termos_versao: null, notificacoes_consentidas: false, plano: { tipo: 'gratuito' } });
      expect((await app.inject({ method: 'GET', url: '/v1/me' })).json().codigo).toBe('nao_autenticado');
    });
  });

  describe('/v1/me/consentimentos', () => {
    it('aceitar os termos libera a conta; repetir não muda a data; versão velha dá 409', async () => {
      const { auth } = await novaConta();
      const a = await chamar('PUT', '/v1/me/consentimentos', auth, { termos_versao: VIGENTE });
      expect(a.statusCode).toBe(200);
      expect(a.json()).toMatchObject({ termos_pendentes: false, termos_versao: VIGENTE, termos_aceitos_em: '2026-11-01T12:00:00.000Z', notificacoes_consentidas: false });

      agora = new Date('2026-11-02T08:00:00Z');
      const b = await chamar('PUT', '/v1/me/consentimentos', await reabrir(a.json().id), { termos_versao: VIGENTE });
      expect(b.json().termos_aceitos_em).toBe('2026-11-01T12:00:00.000Z');

      const velha = await chamar('PUT', '/v1/me/consentimentos', await reabrir(a.json().id), { termos_versao: '2020-01-01' });
      expect(velha.statusCode).toBe(409);
      expect(velha.json()).toEqual({ codigo: 'termos_desatualizados', mensagem: 'Os termos mudaram. Leia a versão nova.' });
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('notificações: consentir grava a data, repetir não muda, revogar zera e apaga o aparelho de push', async () => {
      const { auth, userId } = await novaConta({ aceitouTermos: true });
      const sid = (await pool.query(`SELECT id FROM sessions WHERE user_id = $1`, [userId])).rows[0].id;
      await pool.query(
        `INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app) VALUES ($1,$2,$3,$4,'android','1.0.0')`,
        [tenantId, userId, sid, `tok-${userId}`],
      );
      const on = await chamar('PUT', '/v1/me/consentimentos', auth, { notificacoes: true });
      expect(on.json()).toMatchObject({ notificacoes_consentidas: true, notificacoes_consentidas_em: '2026-11-01T12:00:00.000Z' });
      agora = new Date('2026-11-03T09:00:00Z');
      const depois = await reabrir(userId);
      expect((await chamar('PUT', '/v1/me/consentimentos', depois, { notificacoes: true })).json().notificacoes_consentidas_em).toBe('2026-11-01T12:00:00.000Z');

      const off = await chamar('PUT', '/v1/me/consentimentos', depois, { notificacoes: false });
      expect(off.json()).toMatchObject({ notificacoes_consentidas: false, notificacoes_consentidas_em: null });
      expect((await pool.query(`SELECT count(*)::int AS n FROM dispositivos WHERE user_id = $1`, [userId])).rows[0].n).toBe(0);

      const outra = await chamar('PUT', '/v1/me/consentimentos', depois, { notificacoes: true });
      expect(outra.json().notificacoes_consentidas_em).toBe('2026-11-03T09:00:00.000Z'); // consentimento novo, data nova
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('corpo vazio ou com tipo errado dá 422 com o campo; sem corpo dá 400', async () => {
      const { auth } = await novaConta();
      const vazio = await chamar('PUT', '/v1/me/consentimentos', auth, {});
      expect(vazio.statusCode).toBe(422);
      expect(vazio.json().codigo).toBe('validacao');
      const ruim = await chamar('PUT', '/v1/me/consentimentos', auth, { termos_versao: 5, notificacoes: 'sim' });
      expect(ruim.json().campos.map((c: { campo: string }) => c.campo)).toEqual(['termos_versao', 'notificacoes']);
      expect((await app.inject({ method: 'PUT', url: '/v1/me/consentimentos', headers: auth })).statusCode).toBe(400);
    });
  });

  describe('DELETE /v1/me', () => {
    it('exige a confirmação; apaga a conta e tudo em cascata sem tocar nas outras', async () => {
      const a = await novaConta({ aceitouTermos: true });
      const b = await novaConta({ aceitouTermos: true });
      for (const c of [a, b]) {
        await pool.query(`INSERT INTO user_preferences (user_id, tenant_id, categorias) VALUES ($1,$2,'{limpeza}')`, [c.userId, tenantId]);
        await pool.query(
          `INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em) VALUES ($1,$2,'premium_mensal','ativa','google_play',now())`,
          [tenantId, c.userId],
        );
      }
      expect((await chamar('DELETE', '/v1/me', a.auth, {})).statusCode).toBe(422);
      expect((await chamar('DELETE', '/v1/me', a.auth, { confirmacao: 'sim' })).json().campos[0].campo).toBe('confirmacao');
      expect((await pool.query(`SELECT count(*)::int AS n FROM users WHERE id = $1`, [a.userId])).rows[0].n).toBe(1);

      const r = await chamar('DELETE', '/v1/me', a.auth, { confirmacao: 'excluir' });
      expect(r.statusCode).toBe(204);
      for (const tabela of ['users', 'user_preferences', 'subscriptions', 'sessions']) {
        const col = tabela === 'users' ? 'id' : 'user_id';
        expect((await pool.query(`SELECT count(*)::int AS n FROM ${tabela} WHERE ${col} = $1`, [a.userId])).rows[0].n).toBe(0);
      }
      expect((await chamar('GET', '/v1/me', a.auth)).json().codigo).toBe('nao_autenticado'); // o token morreu junto
      // A outra conta segue inteira.
      for (const tabela of ['user_preferences', 'subscriptions', 'sessions']) {
        expect((await pool.query(`SELECT count(*)::int AS n FROM ${tabela} WHERE user_id = $1`, [b.userId])).rows[0].n).toBe(1);
      }
      expect((await chamar('GET', '/v1/me', b.auth)).statusCode).toBe(200);
    });

    it('vale mesmo com os termos pendentes', async () => {
      const { auth } = await novaConta();
      expect((await chamar('DELETE', '/v1/me', auth, { confirmacao: 'excluir' })).statusCode).toBe(204);
    });
  });

  describe('/v1/preferencias', () => {
    const base = { categorias: ['higiene_bebe', 'limpeza'], ceps: ['14020260'], silencio: { inicio: '22:00', fim: '07:00' }, limite_diario: 3 };

    it('com os termos pendentes: 403 termos_pendentes', async () => {
      const { auth } = await novaConta();
      const r = await chamar('GET', '/v1/preferencias', auth);
      expect(r.statusCode).toBe(403);
      expect(r.json().codigo).toBe('termos_pendentes');
      expect((await chamar('PUT', '/v1/preferencias', auth, base)).statusCode).toBe(403);
    });

    it('conta nova devolve preferências vazias; salvar, ler e substituir', async () => {
      const { auth } = await novaConta({ aceitouTermos: true });
      expect((await chamar('GET', '/v1/preferencias', auth)).json()).toEqual({ categorias: [], ceps: [], silencio: null, limite_diario: null, ceps_ignorados_pelo_plano: [] });

      const salvo = await chamar('PUT', '/v1/preferencias', auth, base);
      expect(salvo.statusCode).toBe(200);
      expect(salvo.json()).toEqual({ ...base, ceps_ignorados_pelo_plano: [] });
      expect((await chamar('GET', '/v1/preferencias', auth)).json()).toEqual({ ...base, ceps_ignorados_pelo_plano: [] });
      expect((await chamar('PUT', '/v1/preferencias', auth, base)).json()).toEqual({ ...base, ceps_ignorados_pelo_plano: [] }); // idempotente

      const novo = { categorias: [], ceps: [], silencio: null, limite_diario: null };
      expect((await chamar('PUT', '/v1/preferencias', auth, novo)).json()).toEqual({ ...novo, ceps_ignorados_pelo_plano: [] });
    });

    it('cada pessoa vê só as próprias preferências', async () => {
      const a = await novaConta({ aceitouTermos: true });
      const b = await novaConta({ aceitouTermos: true });
      await chamar('PUT', '/v1/preferencias', a.auth, base);
      expect((await chamar('GET', '/v1/preferencias', b.auth)).json().categorias).toEqual([]);
    });

    it('validação: categoria desconhecida (inclusive medicamento), repetida, CEP malformado, silêncio e limite', async () => {
      const { auth } = await novaConta({ aceitouTermos: true });
      const r = await chamar('PUT', '/v1/preferencias', auth, {
        categorias: ['limpeza', 'medicamentos_isentos', 'limpeza', 5],
        ceps: ['1402026', 'abc'],
        silencio: { inicio: '25:00', fim: '07:00' },
        limite_diario: 0,
      });
      expect(r.statusCode).toBe(422);
      expect(r.json().codigo).toBe('validacao');
      expect(r.json().campos.map((c: { campo: string }) => c.campo)).toEqual(
        ['categorias[1]', 'categorias[2]', 'categorias[3]', 'ceps[0]', 'ceps[1]', 'silencio', 'limite_diario'],
      );
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, silencio: { inicio: '22:00', fim: '22:00' } })).statusCode).toBe(422);
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, limite_diario: 1.5 })).statusCode).toBe(422);
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, limite_diario: 99999 })).statusCode).toBe(422);
      expect((await chamar('PUT', '/v1/preferencias', auth, { categorias: [] })).statusCode).toBe(422); // faltam campos obrigatórios
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, ceps: ['14020260', '14020260'] })).json().campos[0].campo).toBe('ceps[1]');
    });

    it('CEP fora da região: 422 cep_fora_da_regiao com o campo', async () => {
      const { auth } = await novaConta({ aceitouTermos: true });
      const r = await chamar('PUT', '/v1/preferencias', auth, { ...base, ceps: ['20000000'] }); // fora de 01000000 a 19999999
      expect(r.statusCode).toBe(422);
      expect(r.json()).toEqual({ codigo: 'cep_fora_da_regiao', mensagem: 'Ainda não atendemos este CEP.', campos: [{ campo: 'ceps[0]', mensagem: 'Ainda não atendemos este CEP.' }] });
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, ceps: ['01000000', '19999999'] })).statusCode).not.toBe(422); // as bordas valem
    });

    it('plano gratuito: 1 CEP; premium: até 3; mais de 3 é erro de validação', async () => {
      const { auth, userId } = await novaConta({ aceitouTermos: true });
      const dois = await chamar('PUT', '/v1/preferencias', auth, { ...base, ceps: ['14020260', '01310100'] });
      expect(dois.statusCode).toBe(403);
      expect(dois.json()).toEqual({ codigo: 'plano_insuficiente', mensagem: 'Seu plano permite 1 CEP.' });

      await pool.query(
        `INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, expira_em) VALUES ($1,$2,'premium_mensal','ativa','google_play',$3,$4)`,
        [tenantId, userId, new Date('2026-10-30T00:00:00Z'), new Date('2026-11-30T00:00:00Z')],
      );
      const tres = { ...base, ceps: ['14020260', '01310100', '13010000'] };
      expect((await chamar('PUT', '/v1/preferencias', auth, tres)).json().ceps).toEqual(tres.ceps);
      expect((await chamar('PUT', '/v1/preferencias', auth, { ...base, ceps: [...tres.ceps, '11010000'] })).statusCode).toBe(422);

      // Premium vence: os 3 CEPs ficam guardados, mas só 1 vale e os outros aparecem como ignorados.
      agora = new Date('2026-12-05T12:00:00Z');
      const auth2 = await reabrir(userId);
      const depois = (await chamar('GET', '/v1/preferencias', auth2)).json();
      expect(depois.ceps).toEqual(['14020260']);
      expect(depois.ceps_ignorados_pelo_plano).toEqual(['01310100', '13010000']);
      // O campo é só de leitura: o PUT o ignora.
      const put = await chamar('PUT', '/v1/preferencias', auth2, { ...base, ceps_ignorados_pelo_plano: ['99999999'] });
      expect(put.statusCode).toBe(200);
      expect(put.json().ceps_ignorados_pelo_plano).toEqual([]);
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('silêncio que cruza a meia-noite e limite diário null são aceitos', async () => {
      const { auth } = await novaConta({ aceitouTermos: true });
      const r = await chamar('PUT', '/v1/preferencias', auth, { ...base, silencio: { inicio: '23:30', fim: '06:15' }, limite_diario: null });
      expect(r.json()).toMatchObject({ silencio: { inicio: '23:30', fim: '06:15' }, limite_diario: null });
    });
  });
});
