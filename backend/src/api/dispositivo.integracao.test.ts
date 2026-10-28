// Registro do token de push contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { beforeEach, describe, expect, it } from 'vitest';
import { criarSessao } from '../auth/sessoes.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;
const CORPO = { token: 'fcm-token-1', plataforma: 'android', versao_app: '1.0.0' };

executar('dispositivo (Postgres)', () => {
  const t = ambienteDeTeste('teste_dispositivo');
  const { e } = t;
  beforeEach(async () => {
    if (e.pool) await e.pool.query(`DELETE FROM dispositivos`);
  });
  const tudo = async () => (await e.pool.query(`SELECT user_id, session_id, token, plataforma, versao_app, registrado_em FROM dispositivos ORDER BY token`)).rows;
  async function comConsentimento() {
    const p = await t.pessoa();
    await e.pool.query(`UPDATE users SET notificacoes_consentidas_em = $2 WHERE id = $1`, [p.userId, e.agora]);
    return p;
  }
  async function outraSessao(userId: string) {
    return { authorization: `Bearer ${(await criarSessao(e.pool, e.tenantId, userId, e.agora)).accessToken}` };
  }

  it('registra, preso à sessão, e repetir não muda nada; trocar o token atualiza a mesma linha', async () => {
    const p = await comConsentimento();
    const r = await t.chamar('PUT', '/v1/dispositivo', p.auth, CORPO);
    expect(r.statusCode).toBe(204);
    expect(r.headers['cache-control']).toBe('no-store');
    const [linha] = await tudo();
    expect(linha).toMatchObject({ user_id: p.userId, token: 'fcm-token-1', plataforma: 'android', versao_app: '1.0.0' });
    expect(linha.registrado_em.toISOString()).toBe(e.agora.toISOString());

    e.agora = new Date(e.agora.getTime() + 600_000);
    const auth = await t.reabrir(p.userId);
    // O reabrir cria outra sessão: a linha da sessão antiga fica, e a nova registra o mesmo token (passa para a nova sessão).
    expect((await t.chamar('PUT', '/v1/dispositivo', auth, CORPO)).statusCode).toBe(204);
    const depois = await tudo();
    expect(depois).toHaveLength(1);
    expect(depois[0].session_id).not.toBe(linha.session_id);
    // Mesma sessão, mesmo token, um minuto depois: mantém a data; token novo: troca o token e a data.
    const registrado = e.agora;
    e.agora = new Date(e.agora.getTime() + 60_000);
    expect((await t.chamar('PUT', '/v1/dispositivo', auth, CORPO)).statusCode).toBe(204);
    expect((await tudo())[0].registrado_em.toISOString()).toBe(registrado.toISOString());
    e.agora = new Date(e.agora.getTime() + 60_000);
    expect((await t.chamar('PUT', '/v1/dispositivo', auth, { token: 'fcm-token-2', plataforma: 'ios', versao_app: '1.1.0' })).statusCode).toBe(204);
    const fim = await tudo();
    expect(fim).toHaveLength(1);
    expect(fim[0]).toMatchObject({ token: 'fcm-token-2', plataforma: 'ios', versao_app: '1.1.0' });
    expect(fim[0].registrado_em.toISOString()).toBe(e.agora.toISOString());
  });

  it('duas sessões da mesma conta com aparelhos diferentes convivem; o mesmo token em outra conta passa para ela', async () => {
    const a = await comConsentimento();
    const a2 = await outraSessao(a.userId);
    await t.chamar('PUT', '/v1/dispositivo', a.auth, { ...CORPO, token: 'tel-A' });
    await t.chamar('PUT', '/v1/dispositivo', a2, { ...CORPO, token: 'tel-B' });
    expect((await tudo()).map((l) => l.token)).toEqual(['tel-A', 'tel-B']);
    const b = await comConsentimento();
    expect((await t.chamar('PUT', '/v1/dispositivo', b.auth, { ...CORPO, token: 'tel-A' })).statusCode).toBe(204);
    const linhas = await tudo();
    expect(linhas.map((l) => [l.token, l.user_id])).toEqual([['tel-A', b.userId], ['tel-B', a.userId]]);
  });

  it('sem consentimento de notificações dá 422 e não grava; depois de consentir, registra', async () => {
    const p = await t.pessoa();
    const r = await t.chamar('PUT', '/v1/dispositivo', p.auth, CORPO);
    expect(r.statusCode).toBe(422);
    expect(r.json()).toMatchObject({ codigo: 'validacao', campos: [{ campo: 'token' }] });
    expect(await tudo()).toEqual([]);
    expect((await t.chamar('PUT', '/v1/me/consentimentos', p.auth, { notificacoes: true })).statusCode).toBe(200);
    expect((await t.chamar('PUT', '/v1/dispositivo', p.auth, CORPO)).statusCode).toBe(204);
    expect(await tudo()).toHaveLength(1);
    // Revogar o consentimento apaga o token.
    await t.chamar('PUT', '/v1/me/consentimentos', p.auth, { notificacoes: false });
    expect(await tudo()).toEqual([]);
  });

  it('valida o corpo (token, plataforma, versão), exige objeto, login e termos', async () => {
    const p = await comConsentimento();
    const ruins: Array<[unknown, string]> = [
      [{ ...CORPO, token: '' }, 'token'], [{ ...CORPO, token: '   ' }, 'token'], [{ ...CORPO, token: 'x'.repeat(4097) }, 'token'], [{ ...CORPO, token: 5 }, 'token'],
      [{ ...CORPO, plataforma: 'windows' }, 'plataforma'], [{ token: 'a', versao_app: '1' }, 'plataforma'],
      [{ ...CORPO, versao_app: '' }, 'versao_app'], [{ ...CORPO, versao_app: 'v'.repeat(33) }, 'versao_app'],
    ];
    for (const [corpo, campo] of ruins) {
      const r = await t.chamar('PUT', '/v1/dispositivo', p.auth, corpo);
      expect(r.statusCode, campo).toBe(422);
      expect(r.json().campos.map((c: { campo: string }) => c.campo)).toContain(campo);
    }
    expect((await t.chamar('PUT', '/v1/dispositivo', p.auth, { ...CORPO, token: 'x'.repeat(4096), versao_app: 'v'.repeat(32) })).statusCode).toBe(204);
    expect((await t.chamar('PUT', '/v1/dispositivo', p.auth, [1])).statusCode).toBe(400);
    expect((await t.chamar('PUT', '/v1/dispositivo', {}, CORPO)).statusCode).toBe(401);
    const sem = await t.pessoa({ termos: false });
    expect((await t.chamar('PUT', '/v1/dispositivo', sem.auth, CORPO)).json().codigo).toBe('termos_pendentes');
  });

  it('30 registros por hora por sessão; outra sessão tem o seu limite', async () => {
    const p = await comConsentimento();
    for (let i = 0; i < 30; i += 1) expect((await t.chamar('PUT', '/v1/dispositivo', p.auth, { ...CORPO, token: `t${i}` })).statusCode, String(i)).toBe(204);
    const r = await t.chamar('PUT', '/v1/dispositivo', p.auth, CORPO);
    expect(r.statusCode).toBe(429);
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    expect((await t.chamar('PUT', '/v1/dispositivo', await outraSessao(p.userId), CORPO)).statusCode).toBe(204);
  });

  it('DELETE tira só o aparelho desta sessão, é idempotente e vale mesmo com termos pendentes', async () => {
    const p = await comConsentimento();
    const p2 = await outraSessao(p.userId);
    await t.chamar('PUT', '/v1/dispositivo', p.auth, { ...CORPO, token: 'um' });
    await t.chamar('PUT', '/v1/dispositivo', p2, { ...CORPO, token: 'dois' });
    expect((await t.chamar('DELETE', '/v1/dispositivo', p.auth)).statusCode).toBe(204);
    expect((await tudo()).map((l) => l.token)).toEqual(['dois']);
    expect((await t.chamar('DELETE', '/v1/dispositivo', p.auth)).statusCode).toBe(204);
    expect((await t.chamar('DELETE', '/v1/dispositivo', {})).statusCode).toBe(401);
    const sem = await t.pessoa({ termos: false });
    expect((await t.chamar('DELETE', '/v1/dispositivo', sem.auth)).statusCode).toBe(204);
  });

  it('sair da sessão e excluir a conta apagam o aparelho', async () => {
    const p = await comConsentimento();
    await t.chamar('PUT', '/v1/dispositivo', p.auth, CORPO);
    expect((await t.chamar('POST', '/v1/auth/sair', p.auth)).statusCode).toBe(204);
    expect(await tudo()).toEqual([]);
    const q = await comConsentimento();
    await t.chamar('PUT', '/v1/dispositivo', q.auth, { ...CORPO, token: 'q' });
    expect((await t.chamar('DELETE', '/v1/me', q.auth, { confirmacao: 'excluir' })).statusCode).toBe(204);
    expect(await tudo()).toEqual([]);
  });
});
