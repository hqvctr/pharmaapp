// POST /v1/auth/google contra um Postgres de verdade, com ID tokens assinados por chaves locais. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChavesGoogleIndisponiveis, VerificadorGoogleJwks } from '../auth/google.js';
import { CLIENTE_GOOGLE_TESTE, emitirIdToken, parDeChaves } from '../auth/testeGoogle.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;
const A = parDeChaves('chave-a');
const B = parDeChaves('chave-b');
const google = new VerificadorGoogleJwks(
  async () => {
    return { chaves: [A.jwk], validadeSegundos: 3600 };
  },
  () => t.e.agora,
);
const t = ambienteDeTeste('teste_google', { google, clientIdsGoogle: [CLIENTE_GOOGLE_TESTE] });
const { e } = t;
const TENANT = { 'x-tenant': 'padrao' };
// Cada teste sai de um IP próprio: o limite de 20/h por IP é do app inteiro e não pode misturar um teste com o outro.
let ip = '10.0.0.0';
let n = 0;
beforeEach(() => { n += 1; ip = `10.0.${Math.floor(n / 250)}.${n % 250}`; });
const entrar = (idToken: unknown, extra: Record<string, unknown> = {}, cab: Record<string, string> = TENANT) => t.chamar('POST', '/v1/auth/google', {}, { id_token: idToken, ...extra }, cab, ip);
const token = (conteudo: Record<string, unknown> = {}, p = A) => emitirIdToken(p, e.agora, conteudo);
const usuarios = async () => (await e.pool.query(`SELECT id, email, google_sub, email_verificado_em FROM users ORDER BY criado_em, id`)).rows;

executar('login com Google (Postgres)', () => {
  it('conta nova: cria, devolve sessão que funciona e marca só o método Google; entrar de novo é a mesma conta', async () => {
    const sub = `sub-${randomUUID()}`;
    const r = await entrar(token({ sub, email: 'Nova.Pessoa@Example.com' }));
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
    const d = r.json();
    expect(d.conta_nova).toBe(true);
    expect(d.usuario).toMatchObject({ email: 'nova.pessoa@example.com', metodos_login: ['google'], termos_pendentes: true, notificacoes_consentidas: false });
    expect(d.access_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const me = await t.chamar('GET', '/v1/me', { authorization: `Bearer ${d.access_token}` });
    expect(me.statusCode).toBe(200);
    expect(me.json().id).toBe(d.usuario.id);
    const linha = (await usuarios()).find((u) => u.google_sub === sub);
    expect(linha).toMatchObject({ email: 'nova.pessoa@example.com', email_verificado_em: null });

    const de_novo = await entrar(token({ sub, email: 'Nova.Pessoa@Example.com' }));
    expect(de_novo.json()).toMatchObject({ conta_nova: false, usuario: { id: d.usuario.id } });
    expect(de_novo.json().refresh_token).not.toBe(d.refresh_token);
    // O `sub` manda: se o e-mail do Google mudou, é a mesma conta.
    expect((await entrar(token({ sub, email: 'outro@example.com' }))).json().usuario.id).toBe(d.usuario.id);
    expect((await usuarios()).filter((u) => u.google_sub === sub)).toHaveLength(1);
  });

  it('conta que já existe pelo e-mail é vinculada quando o Google declara o e-mail verificado (sem diferença de caixa)', async () => {
    const p = await t.pessoa();
    const email = (await e.pool.query(`SELECT email FROM users WHERE id = $1`, [p.userId])).rows[0].email as string;
    const sub = `sub-${randomUUID()}`;
    const r = await entrar(token({ sub, email: email.toUpperCase() }));
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ conta_nova: false, usuario: { id: p.userId, metodos_login: ['email', 'google'] } });
    expect((await e.pool.query(`SELECT google_sub FROM users WHERE id = $1`, [p.userId])).rows[0].google_sub).toBe(sub);
  });

  it('recusa e-mail não verificado, ausente ou de conta já ligada a outro Google, sem criar nem vincular nada', async () => {
    const p = await t.pessoa();
    const email = (await e.pool.query(`SELECT email FROM users WHERE id = $1`, [p.userId])).rows[0].email as string;
    const antes = (await usuarios()).length;
    for (const [nome, conteudo] of [
      ['não verificado, e-mail de conta existente', { sub: 's1', email, email_verified: false }],
      ['não verificado, e-mail novo', { sub: 's2', email: 'novo@example.com', email_verified: false }],
      ['sem e-mail', { sub: 's3', email: undefined, email_verified: undefined }],
      ['sem e-mail, mas "verificado"', { sub: 's3b', email: undefined, email_verified: true }],
    ] as const) {
      const r = await entrar(token(conteudo));
      expect(r.statusCode, nome).toBe(401);
      expect(r.json().codigo, nome).toBe('credencial_invalida');
    }
    expect((await e.pool.query(`SELECT google_sub FROM users WHERE id = $1`, [p.userId])).rows[0].google_sub).toBeNull();
    expect((await usuarios()).length).toBe(antes);
    // Já ligada a outro Google: outro `sub` com o mesmo e-mail não entra.
    await e.pool.query(`UPDATE users SET google_sub = 'dono-original' WHERE id = $1`, [p.userId]);
    expect((await entrar(token({ sub: 'intruso', email }))).statusCode).toBe(401);
    expect((await entrar(token({ sub: 'dono-original', email }))).json().usuario.id).toBe(p.userId);
  });

  it('entra pelo sub mesmo quando o e-mail não está verificado', async () => {
    const sub = `sub-${randomUUID()}`;
    const primeira = await entrar(token({ sub, email: 'verificado@example.com' }));
    const r = await entrar(token({ sub, email: 'verificado@example.com', email_verified: false }));
    expect(r.statusCode).toBe(200);
    expect(r.json().usuario.id).toBe(primeira.json().usuario.id);
  });

  it('token ruim vira 401 credencial_invalida e não cria conta: assinatura de outra chave, outro cliente, vencido, nonce errado', async () => {
    const antes = (await usuarios()).length;
    const ruins: Array<[string, string, Record<string, unknown>?]> = [
      ['assinatura', emitirIdToken({ ...B, kid: 'chave-a' }, e.agora, { sub: 'x1' })],
      ['cliente de outro app', token({ sub: 'x2', aud: 'outro.apps.googleusercontent.com' })],
      ['vencido', token({ sub: 'x3', exp: Math.floor(e.agora.getTime() / 1000) - 3600 })],
      ['lixo', 'isto.nao.e-jwt'],
      ['nonce diferente', token({ sub: 'x4', nonce: 'a' }), { nonce: 'b' }],
    ];
    for (const [nome, tk, extra] of ruins) {
      const r = await entrar(tk, extra);
      expect(r.statusCode, nome).toBe(401);
      expect(r.json().codigo, nome).toBe('credencial_invalida');
    }
    expect((await usuarios()).length).toBe(antes);
    expect((await entrar(token({ sub: 'x5', nonce: 'igual' }), { nonce: 'igual' })).statusCode).toBe(200);
  });

  it('valida o corpo e o tenant: 422, 400 e 404', async () => {
    for (const [corpo, campo] of [[{}, 'id_token'], [{ id_token: 5 }, 'id_token'], [{ id_token: '' }, 'id_token'], [{ id_token: 'x'.repeat(4097) }, 'id_token'], [{ id_token: 'a.b.c', nonce: 'n'.repeat(129) }, 'nonce'], [{ id_token: 'a.b.c', nonce: 7 }, 'nonce']] as const) {
      const r = await t.chamar('POST', '/v1/auth/google', {}, corpo, TENANT, ip);
      expect(r.statusCode, JSON.stringify(corpo).slice(0, 40)).toBe(422);
      expect(r.json().campos.map((c: { campo: string }) => c.campo)).toContain(campo);
    }
    expect((await t.chamar('POST', '/v1/auth/google', {}, [1], TENANT, ip)).statusCode).toBe(400);
    expect((await t.chamar('POST', '/v1/auth/google', {}, { id_token: 'a.b.c' }, {}, ip)).json().codigo).toBe('tenant_ausente');
    expect((await t.chamar('POST', '/v1/auth/google', {}, { id_token: 'a.b.c' }, { 'x-tenant': 'nao-existe' }, ip)).statusCode).toBe(404);
  });

  it('duas entradas simultâneas de uma conta nova resultam numa conta só', async () => {
    const sub = `sub-${randomUUID()}`;
    const tk = token({ sub, email: 'corrida@example.com' });
    const [r1, r2] = await Promise.all([entrar(tk), entrar(tk)]);
    expect([r1.statusCode, r2.statusCode]).toEqual([200, 200]);
    expect(r1.json().usuario.id).toBe(r2.json().usuario.id);
    expect((await usuarios()).filter((u) => u.google_sub === sub)).toHaveLength(1);
    expect([r1.json().conta_nova, r2.json().conta_nova].filter(Boolean)).toHaveLength(1);
  });

  it('perde a disputa pelo índice único para outra entrada da mesma conta: repete e entra na conta criada', async () => {
    const sub = `sub-${randomUUID()}`;
    const email = 'disputa@example.com';
    const outra = await e.pool.connect();
    try {
      // Outra conexão está criando a mesma conta e ainda não confirmou: a nossa insere e espera pelo índice único.
      await outra.query('BEGIN');
      await outra.query(`INSERT INTO users (tenant_id, email, google_sub) VALUES ($1, $2, $3)`, [e.tenantId, email, sub]);
      const resposta = entrar(token({ sub, email }));
      await new Promise((r) => setTimeout(r, 300));
      await outra.query('COMMIT');
      const r = await resposta;
      expect(r.statusCode).toBe(200);
      expect(r.json().conta_nova).toBe(false);
      expect((await usuarios()).filter((u) => u.google_sub === sub)).toHaveLength(1);
    } finally {
      outra.release();
    }
  });


  it('20 por hora por IP: o 21º dá 429 com Retry-After, outro IP não é afetado, e a hora seguinte libera', async () => {
    for (let i = 0; i < 20; i += 1) expect((await entrar(token({ sub: `lim${i}`, email: `lim${i}@example.com` }))).statusCode, String(i)).toBe(200);
    const r = await entrar(token({ sub: 'lim20', email: 'lim20@example.com' }));
    expect(r.statusCode).toBe(429);
    expect(r.json().codigo).toBe('muitas_requisicoes');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    expect((await t.chamar('POST', '/v1/auth/google', {}, { id_token: token({ sub: 'lim20', email: 'lim20@example.com' }) }, TENANT, '192.168.9.9')).statusCode).toBe(200);
    e.agora = new Date(e.agora.getTime() + 3601_000);
    expect((await entrar(emitirIdToken(A, e.agora, { sub: 'lim21', email: 'lim21@example.com' }))).statusCode).toBe(200);
  });
});

const fora = ambienteDeTeste('teste_google_fora', {
  google: new VerificadorGoogleJwks(async () => { throw new ChavesGoogleIndisponiveis('teste'); }),
  clientIdsGoogle: [CLIENTE_GOOGLE_TESTE],
});
executar('login com Google com as chaves do Google fora do ar', () => {
  it('503 servico_indisponivel com Retry-After, sem criar conta', async () => {
    const r = await fora.chamar('POST', '/v1/auth/google', {}, { id_token: emitirIdToken(A, fora.e.agora) }, TENANT);
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('servico_indisponivel');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    expect((await fora.e.pool.query(`SELECT count(*)::int AS n FROM users`)).rows[0].n).toBe(0);
  });
});

const semCliente = ambienteDeTeste('teste_google_off', { google });
executar('login com Google desligado (sem cliente OAuth no tenant)', () => {
  it('403 metodo_login_indisponivel e o app não oferece o método em /v1/configuracao', async () => {
    const r = await semCliente.chamar('POST', '/v1/auth/google', {}, { id_token: 'a.b.c' }, TENANT);
    expect(r.statusCode).toBe(403);
    expect(r.json().codigo).toBe('metodo_login_indisponivel');
    const cfg = await semCliente.chamar('GET', '/v1/configuracao', {}, undefined, TENANT);
    expect(cfg.json().metodos_login).toEqual(['email']);
  });
});

executar('configuração com o Google ligado', () => {
  it('oferece o método quando há cliente OAuth', async () => {
    expect((await t.chamar('GET', '/v1/configuracao', {}, undefined, TENANT)).json().metodos_login).toEqual(['email', 'google']);
  });
});
