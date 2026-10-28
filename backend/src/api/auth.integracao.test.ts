// Login por e-mail contra um Postgres de verdade. Pula sozinho sem PG_TESTE_URL (ex.: postgres://usuario@127.0.0.1:5432).
// Cria e apaga um banco próprio; Redis e e-mail são falsos.
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import type { EnviadorEmail } from '../auth/enviador.js';
import { hashToken, iguais, novoToken } from '../auth/tokens.js';
import { migrate } from '../db/migrate.js';
import { buildApp } from './app.js';
import { exigirSessao } from './sessao.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import { RegistroTenantsBanco } from './tenants.js';

const URL_BASE = process.env.PG_TESTE_URL;
const executar = URL_BASE ? describe : describe.skip;

executar('login por e-mail (Postgres)', () => {
  const nomeBanco = `teste_auth_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let tenantId: string;

  let agora = new Date('2026-11-01T12:00:00Z');
  const enviados: Array<{ para: string; codigo: string }> = [];
  let enviadorFalha = false;
  const enviador: EnviadorEmail = {
    enviarCodigo: async (para, codigo) => {
      if (enviadorFalha) throw new Error('provedor fora do ar');
      enviados.push({ para, codigo });
    },
  };
  let app: ReturnType<typeof buildApp>;

  function novoApp() {
    const relogio = () => agora.getTime();
    app = buildApp({
      healthChecks: [],
      tenants: new RegistroTenantsBanco(pool),
      limitador: new LimitadorMemoria(relogio),
      auth: { db: pool, codigos: new CodigosMemoria(iguais, relogio), enviador, chaveHmac: Buffer.alloc(32, 9), agora: () => agora },
    });
    app.get('/teste/protegida', async (req) => {
      const c = await exigirSessao(req, pool, new RegistroTenantsBanco(pool), agora);
      return { user: c.userId };
    });
    app.get('/teste/me', async (req) => {
      const c = await exigirSessao(req, pool, new RegistroTenantsBanco(pool), agora, { permitirTermosPendentes: true });
      return { user: c.userId };
    });
  }

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
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  // Cada teste começa com app, relógio, limites e fila de e-mails novos.
  let ipSeq = 0;
  const reiniciar = () => {
    agora = new Date('2026-11-01T12:00:00Z');
    enviados.length = 0;
    enviadorFalha = false;
    ipSeq += 1;
    novoApp();
  };
  const ip = () => `10.0.0.${ipSeq}`;
  const post = (url: string, payload: unknown, extra: Record<string, string> = { 'x-tenant': 'padrao' }) =>
    app.inject({ method: 'POST', url, payload: payload as never, headers: extra, remoteAddress: ip() });
  const pedirCodigo = (email: string) => post('/v1/auth/email/codigo', { email });
  const entrar = async (email: string) => {
    await pedirCodigo(email);
    const codigo = enviados.at(-1)!.codigo;
    return post('/v1/auth/email/verificar', { email, codigo });
  };
  const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
  const comToken = (url: string, t: string) => app.inject({ method: 'GET', url, headers: bearer(t) });

  it('fluxo completo: código, sessão, conta nova e segundo login na mesma conta', async () => {
    reiniciar();
    const r1 = await pedirCodigo('Maria@Exemplo.com ');
    expect(r1.statusCode).toBe(202);
    expect(r1.json()).toEqual({ expira_em_segundos: 600, reenviar_em_segundos: 60 });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]!.para).toBe('maria@exemplo.com');
    expect(enviados[0]!.codigo).toMatch(/^[0-9]{6}$/);

    const v = await entrar('maria@exemplo.com');
    expect(v.statusCode).toBe(200);
    const s = v.json();
    expect(s.conta_nova).toBe(true);
    expect(s.access_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(s.access_expira_em).toBe('2026-11-01T13:00:00.000Z');
    expect(s.refresh_expira_em).toBe('2026-12-31T12:00:00.000Z');
    expect(s.usuario).toMatchObject({
      email: 'maria@exemplo.com',
      metodos_login: ['email'],
      termos_pendentes: true,
      termos_versao: null,
      notificacoes_consentidas: false,
      plano: { tipo: 'gratuito', anuncios: true, ceps_permitidos: 1, assinatura: null },
    });
    expect(s.usuario.criado_em).toBe('2026-11-01T12:00:00.000Z');

    // O banco guarda só hash: nenhum token em claro.
    const linha = (await pool.query(`SELECT access_hash, refresh_hash FROM sessions WHERE user_id = $1`, [s.usuario.id])).rows[0];
    expect(linha.access_hash.equals(hashToken(s.access_token))).toBe(true);
    expect(JSON.stringify(linha)).not.toContain(s.access_token);

    agora = new Date('2026-11-01T12:05:00Z'); // passou o minuto de espera
    const v2 = await entrar('MARIA@exemplo.com');
    expect(v2.json().conta_nova).toBe(false);
    expect(v2.json().usuario.id).toBe(s.usuario.id);
    expect((await pool.query(`SELECT count(*)::int AS n FROM users WHERE lower(email) = 'maria@exemplo.com'`)).rows[0].n).toBe(1);
  });

  it('código errado: 422 codigo_invalido; cinco erros invalidam; código novo substitui o velho', async () => {
    reiniciar();
    await pedirCodigo('ana@exemplo.com');
    const certo = enviados.at(-1)!.codigo;
    const errado = certo === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await post('/v1/auth/email/verificar', { email: 'ana@exemplo.com', codigo: errado });
      expect(r.statusCode).toBe(422);
      expect(r.json().codigo).toBe('codigo_invalido');
    }
    const depois = await post('/v1/auth/email/verificar', { email: 'ana@exemplo.com', codigo: certo });
    expect(depois.json().codigo).toBe('codigo_expirado');

    agora = new Date('2026-11-01T12:02:00Z');
    await pedirCodigo('ana@exemplo.com');
    const novo = enviados.at(-1)!.codigo;
    if (novo !== certo) expect((await post('/v1/auth/email/verificar', { email: 'ana@exemplo.com', codigo: certo })).json().codigo).toBe('codigo_invalido');
    expect((await post('/v1/auth/email/verificar', { email: 'ana@exemplo.com', codigo: novo })).statusCode).toBe(200);
  });

  it('código vence em 10 minutos', async () => {
    reiniciar();
    await pedirCodigo('bia@exemplo.com');
    const c = enviados.at(-1)!.codigo;
    agora = new Date('2026-11-01T12:10:01Z');
    const r = await post('/v1/auth/email/verificar', { email: 'bia@exemplo.com', codigo: c });
    expect(r.json().codigo).toBe('codigo_expirado');
  });

  it('limites por e-mail respondem 202 sem enviar; por IP respondem 429; cota diária 503', async () => {
    reiniciar();
    await pedirCodigo('lia@exemplo.com');
    const repetido = await pedirCodigo('lia@exemplo.com'); // dentro dos 60 s
    expect(repetido.statusCode).toBe(202);
    expect(enviados).toHaveLength(1);

    // 5 por hora por e-mail: a tentativa barrada acima não gastou nenhum; o 6º envio, mesmo espaçado, não sai.
    for (let i = 1; i <= 4; i++) {
      agora = new Date(agora.getTime() + 61_000);
      await pedirCodigo('lia@exemplo.com');
    }
    expect(enviados.filter((e) => e.para === 'lia@exemplo.com')).toHaveLength(5);
    agora = new Date(agora.getTime() + 61_000);
    expect((await pedirCodigo('lia@exemplo.com')).statusCode).toBe(202);
    expect(enviados.filter((e) => e.para === 'lia@exemplo.com')).toHaveLength(5);
    agora = new Date(agora.getTime() + 3600_000); // nova hora: volta a enviar
    await pedirCodigo('lia@exemplo.com');
    expect(enviados.filter((e) => e.para === 'lia@exemplo.com')).toHaveLength(6);

    reiniciar();
    for (let i = 0; i < 20; i++) expect((await pedirCodigo(`pessoa${i}@exemplo.com`)).statusCode).toBe(202);
    const barrado = await pedirCodigo('pessoa20@exemplo.com');
    expect(barrado.statusCode).toBe(429);
    expect(barrado.json().codigo).toBe('muitas_requisicoes');
    expect(Number(barrado.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('provedor de e-mail fora do ar: 503 com Retry-After', async () => {
    reiniciar();
    enviadorFalha = true;
    const r = await pedirCodigo('zeca@exemplo.com');
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('servico_indisponivel');
    expect(r.headers['retry-after']).toBeDefined();
    expect(r.body).not.toContain('provedor fora do ar');
  });

  it('validação: e-mail inválido e código fora do formato dão 422 com o campo; sem corpo dá 400', async () => {
    reiniciar();
    const a = await post('/v1/auth/email/codigo', { email: 'isso-nao-e-email' });
    expect(a.statusCode).toBe(422);
    expect(a.json().campos).toEqual([{ campo: 'email', mensagem: 'Informe um e-mail válido.' }]);
    const b = await post('/v1/auth/email/verificar', { email: 'a@b.co', codigo: '12345' });
    expect(b.statusCode).toBe(422);
    expect(b.json().campos.map((c: { campo: string }) => c.campo)).toEqual(['codigo']);
    const c = await app.inject({ method: 'POST', url: '/v1/auth/email/codigo', headers: { 'x-tenant': 'padrao' }, remoteAddress: ip() });
    expect(c.statusCode).toBe(400);
    expect((await post('/v1/auth/email/codigo', { email: 'a@b.co' }, {})).json().codigo).toBe('tenant_ausente');
  });

  it('sessão: sem token, token malformado, expirado e sair', async () => {
    reiniciar();
    const s = (await entrar('sess@exemplo.com')).json();
    expect((await app.inject({ method: 'GET', url: '/teste/me' })).json().codigo).toBe('nao_autenticado');
    expect((await comToken('/teste/me', 'lixo')).json().codigo).toBe('nao_autenticado');
    expect((await comToken('/teste/me', novoToken().token)).json().codigo).toBe('nao_autenticado'); // formato certo, mas desconhecido
    expect((await comToken('/teste/me', s.access_token)).statusCode).toBe(200);

    agora = new Date('2026-11-01T13:00:01Z');
    expect((await comToken('/teste/me', s.access_token)).json().codigo).toBe('sessao_expirada');

    agora = new Date('2026-11-01T12:30:00Z');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/sair', headers: bearer(s.access_token) })).statusCode).toBe(204);
    expect((await comToken('/teste/me', s.access_token)).json().codigo).toBe('sessao_revogada');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/sair', headers: bearer(s.access_token) })).statusCode).toBe(401);
  });

  it('sair apaga o aparelho de push preso à sessão', async () => {
    reiniciar();
    const s = (await entrar('push@exemplo.com')).json();
    const sid = (await pool.query(`SELECT id FROM sessions WHERE user_id = $1`, [s.usuario.id])).rows[0].id;
    await pool.query(
      `INSERT INTO dispositivos (tenant_id, user_id, session_id, token, plataforma, versao_app) VALUES ($1,$2,$3,'tok-fcm','android','1.0.0')`,
      [tenantId, s.usuario.id, sid],
    );
    await app.inject({ method: 'POST', url: '/v1/auth/sair', headers: bearer(s.access_token) });
    expect((await pool.query(`SELECT count(*)::int AS n FROM dispositivos WHERE session_id = $1`, [sid])).rows[0].n).toBe(0);
  });

  it('renovar: par novo, access velho morre, refresh velho revoga a sessão inteira (reuso)', async () => {
    reiniciar();
    const s0 = (await entrar('ren@exemplo.com')).json();
    agora = new Date('2026-11-01T12:20:00Z');
    const r = await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s0.refresh_token } });
    expect(r.statusCode).toBe(200);
    const s1 = r.json();
    expect(s1.conta_nova).toBe(false);
    expect(s1.usuario.id).toBe(s0.usuario.id);
    expect(s1.access_token).not.toBe(s0.access_token);
    expect(s1.refresh_token).not.toBe(s0.refresh_token);
    expect(s1.refresh_expira_em).toBe('2026-12-31T12:20:00.000Z'); // reinicia os 60 dias
    expect((await comToken('/teste/me', s0.access_token)).statusCode).toBe(401);
    expect((await comToken('/teste/me', s1.access_token)).statusCode).toBe(200);

    // Alguém apresenta o refresh que já foi usado: a sessão inteira cai, inclusive o par novo.
    const reuso = await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s0.refresh_token } });
    expect(reuso.statusCode).toBe(401);
    expect(reuso.json().codigo).toBe('sessao_revogada');
    expect((await comToken('/teste/me', s1.access_token)).json().codigo).toBe('sessao_revogada');
    const novoRefresh = await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s1.refresh_token } });
    expect(novoRefresh.json().codigo).toBe('sessao_revogada');
    expect((await pool.query(`SELECT revogada_motivo FROM sessions WHERE user_id = $1`, [s0.usuario.id])).rows[0].revogada_motivo).toBe('reuso');
  });

  it('renovar: refresh vencido, desconhecido e malformado', async () => {
    reiniciar();
    const s = (await entrar('venc@exemplo.com')).json();
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: novoToken().token } })).json().codigo).toBe('nao_autenticado');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: 'x' } })).json().codigo).toBe('nao_autenticado');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: {} })).statusCode).toBe(422);
    agora = new Date('2027-01-01T00:00:00Z'); // depois dos 60 dias
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s.refresh_token } })).json().codigo).toBe('sessao_expirada');
  });

  it('renovar: 60 por hora por sessão', async () => {
    reiniciar();
    let s = (await entrar('lim@exemplo.com')).json();
    for (let i = 0; i < 60; i++) {
      const r = await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s.refresh_token } });
      expect(r.statusCode).toBe(200);
      s = r.json();
    }
    const r = await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s.refresh_token } });
    expect(r.statusCode).toBe(429);
    expect(r.headers['retry-after']).toBeDefined();
    // O 429 não gasta o refresh: depois da janela ele ainda vale.
    agora = new Date(agora.getTime() + 3601_000);
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: s.refresh_token } })).statusCode).toBe(200);
  });

  it('token de operador nunca vale no app', async () => {
    reiniciar();
    const op = (await pool.query(`INSERT INTO operadores (tenant_id, email, nome) VALUES ($1,'op@exemplo.com','Op') RETURNING id`, [tenantId])).rows[0].id;
    const a = novoToken();
    const r = novoToken();
    await pool.query(
      `INSERT INTO sessions (tenant_id, audiencia, operador_id, access_hash, access_expira_em, refresh_hash, refresh_expira_em, criada_em)
       VALUES ($1,'operador',$2,$3,$4,$5,$6,$7)`,
      [tenantId, op, a.hash, new Date('2026-11-01T13:00:00Z'), r.hash, new Date('2026-12-31T00:00:00Z'), agora],
    );
    expect((await comToken('/teste/me', a.token)).json().codigo).toBe('nao_autenticado');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/renovar', payload: { refresh_token: r.token } })).json().codigo).toBe('nao_autenticado');
    expect((await app.inject({ method: 'POST', url: '/v1/auth/sair', headers: bearer(a.token) })).statusCode).toBe(401);
  });

  it('termos pendentes: só as rotas de conta respondem até aceitar a versão vigente', async () => {
    reiniciar();
    const s = (await entrar('termos@exemplo.com')).json();
    const bloqueada = await comToken('/teste/protegida', s.access_token);
    expect(bloqueada.statusCode).toBe(403);
    expect(bloqueada.json().codigo).toBe('termos_pendentes');
    expect((await comToken('/teste/me', s.access_token)).statusCode).toBe(200);

    await pool.query(`UPDATE users SET termos_versao = '2026-10-28', termos_aceitos_em = now() WHERE id = $1`, [s.usuario.id]);
    expect((await comToken('/teste/protegida', s.access_token)).statusCode).toBe(200);
    await pool.query(`UPDATE users SET termos_versao = '1999-01-01' WHERE id = $1`, [s.usuario.id]); // versão antiga volta a pedir aceite
    expect((await comToken('/teste/protegida', s.access_token)).statusCode).toBe(403);
  });

  it('assinatura ativa vira plano premium; vencida volta a gratuito', async () => {
    reiniciar();
    const s = (await entrar('prem@exemplo.com')).json();
    await pool.query(
      `INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, expira_em) VALUES ($1,$2,'premium_mensal','ativa','google_play',$3,$4)`,
      [tenantId, s.usuario.id, new Date('2026-10-30T00:00:00Z'), new Date('2026-11-30T00:00:00Z')],
    );
    agora = new Date('2026-11-01T12:05:00Z');
    const premium = (await entrar('prem@exemplo.com')).json().usuario.plano;
    expect(premium).toMatchObject({ tipo: 'premium', anuncios: false, ceps_permitidos: 3 });
    expect(premium.assinatura).toMatchObject({ plano: 'premium_mensal', status: 'ativa', loja: 'google_play' });
    agora = new Date('2026-12-05T12:05:00Z');
    const vencido = (await entrar('prem@exemplo.com')).json().usuario.plano;
    expect(vencido).toMatchObject({ tipo: 'gratuito', anuncios: true, ceps_permitidos: 1 });
  });
});
