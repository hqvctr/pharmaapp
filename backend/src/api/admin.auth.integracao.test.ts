// Login do operador (/v1/admin/auth/*, /v1/admin/me) contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;
const TENANT = { 'x-tenant': 'padrao' };

executar('login do operador (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_auth');
  const { e } = t;
  let n = 0;
  const ip = () => `10.1.${Math.floor(++n / 250)}.${n % 250}`;
  const pedir = (email: string, endereco = ip()) => t.chamar('POST', '/v1/admin/auth/email/codigo', {}, { email }, TENANT, endereco);
  const verificar = (email: string, codigo: string, endereco = ip()) => t.chamar('POST', '/v1/admin/auth/email/verificar', {}, { email, codigo }, TENANT, endereco);
  async function operadorSemSessao(o: { ativo?: boolean } = {}) {
    e.seq += 1;
    const email = `entra${e.seq}@exemplo.com`;
    const id = (await e.pool.query(`INSERT INTO operadores (tenant_id, email, nome, ativo) VALUES ($1,$2,'Ana',$3) RETURNING id`, [e.tenantId, email, o.ativo ?? true])).rows[0].id as string;
    return { id, email };
  }

  it('código por e-mail → sessão de operador; o token abre /v1/admin/me e o login fica na auditoria', async () => {
    const op = await operadorSemSessao();
    const r = await pedir(op.email);
    expect(r.statusCode).toBe(202);
    expect(r.json()).toEqual({ expira_em_segundos: 600, reenviar_em_segundos: 60 });
    expect(e.enviados).toHaveLength(1);
    expect(e.enviados[0]).toMatchObject({ para: op.email, nomeApp: 'economae (operador)' });
    const v = await verificar(op.email.toUpperCase(), e.enviados[0]!.codigo);
    expect(v.statusCode).toBe(200);
    const s = v.json();
    expect(s.operador).toMatchObject({ id: op.id, email: op.email, nome: 'Ana' });
    expect(new Date(s.access_expira_em).getTime() - e.agora.getTime()).toBe(3600_000);
    expect(new Date(s.refresh_expira_em).getTime() - e.agora.getTime()).toBe(7 * 86400_000);
    const me = await t.chamar('GET', '/v1/admin/me', { authorization: `Bearer ${s.access_token}` });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ id: op.id, email: op.email, nome: 'Ana' });
    const log = (await e.pool.query(`SELECT acao, alvo_tipo, alvo_id, operador_id FROM auditoria WHERE operador_id = $1`, [op.id])).rows;
    expect(log).toEqual([{ acao: 'operador_entrou', alvo_tipo: 'operador', alvo_id: op.id, operador_id: op.id }]);
    // O código vale uma vez.
    expect((await verificar(op.email, e.enviados[0]!.codigo)).json().codigo).toBe('codigo_expirado');
  });

  it('quem não é operador (ou está desativado) recebe 202 sem e-mail e sempre codigo_invalido; nunca cria conta', async () => {
    const inativo = await operadorSemSessao({ ativo: false });
    const pessoa = await t.pessoa();
    const emailPessoa = (await e.pool.query(`SELECT email FROM users WHERE id = $1`, [pessoa.userId])).rows[0].email as string;
    for (const email of ['ninguem@exemplo.com', inativo.email, emailPessoa]) {
      expect((await pedir(email)).statusCode, email).toBe(202);
      const v = await verificar(email, '123456');
      expect(v.statusCode, email).toBe(422);
      expect(v.json().codigo, email).toBe('codigo_invalido');
    }
    expect(e.enviados).toEqual([]);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM operadores WHERE lower(email) = 'ninguem@exemplo.com'`)).rows[0].n).toBe(0);
  });

  it('o código do operador não vale na conta do app, nem o do app na do operador', async () => {
    const op = await operadorSemSessao();
    await pedir(op.email);
    const codigoOp = e.enviados[0]!.codigo;
    expect((await t.chamar('POST', '/v1/auth/email/verificar', {}, { email: op.email, codigo: codigoOp }, TENANT, ip())).json().codigo).toBe('codigo_expirado');
    await t.chamar('POST', '/v1/auth/email/codigo', {}, { email: op.email }, TENANT, ip());
    const codigoApp = e.enviados[1]!.codigo;
    expect(e.enviados[1]!.nomeApp).toBe('economae');
    if (codigoApp !== codigoOp) expect((await verificar(op.email, codigoApp)).json().codigo).toBe('codigo_invalido');
    expect((await verificar(op.email, codigoOp)).statusCode).toBe(200);
  });

  it('5 tentativas por código; errado dá codigo_invalido e a quinta esgota', async () => {
    const op = await operadorSemSessao();
    await pedir(op.email);
    const certo = e.enviados[0]!.codigo;
    const errado = certo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i += 1) expect((await verificar(op.email, errado)).json().codigo).toBe('codigo_invalido');
    expect((await verificar(op.email, errado)).json().codigo).toBe('codigo_invalido');
    expect((await verificar(op.email, certo)).json().codigo).toBe('codigo_expirado');
  });

  it('1 pedido por minuto e 5 por hora por e-mail (202 sem enviar); 20 por hora por IP', async () => {
    const op = await operadorSemSessao();
    await pedir(op.email);
    await pedir(op.email);
    expect(e.enviados).toHaveLength(1);
    for (let i = 0; i < 6; i += 1) {
      e.agora = new Date(e.agora.getTime() + 61_000);
      await pedir(op.email);
    }
    expect(e.enviados).toHaveLength(5);
    const mesmoIp = '172.16.0.1';
    for (let i = 0; i < 20; i += 1) expect((await pedir(`outro${i}@exemplo.com`, mesmoIp)).statusCode).toBe(202);
    const r = await pedir('outro21@exemplo.com', mesmoIp);
    expect(r.statusCode).toBe(429);
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('valida o corpo e o tenant', async () => {
    expect((await t.chamar('POST', '/v1/admin/auth/email/codigo', {}, { email: 'nao-e-email' }, TENANT, ip())).statusCode).toBe(422);
    expect((await t.chamar('POST', '/v1/admin/auth/email/verificar', {}, { email: 'a@b.co', codigo: '12' }, TENANT, ip())).statusCode).toBe(422);
    expect((await t.chamar('POST', '/v1/admin/auth/email/codigo', {}, [1], TENANT, ip())).statusCode).toBe(400);
    expect((await t.chamar('POST', '/v1/admin/auth/email/codigo', {}, { email: 'a@b.co' }, {}, ip())).json().codigo).toBe('tenant_ausente');
    expect((await t.chamar('POST', '/v1/admin/auth/email/codigo', {}, { email: 'a@b.co' }, { 'x-tenant': 'x' }, ip())).statusCode).toBe(404);
  });

  it('token do app não abre a área do operador e token do operador não abre o app', async () => {
    const pessoa = await t.pessoa();
    const op = await t.operador();
    const r1 = await t.chamar('GET', '/v1/admin/me', pessoa.auth);
    expect(r1.statusCode).toBe(401);
    expect(r1.json().codigo).toBe('nao_autenticado');
    const r2 = await t.chamar('GET', '/v1/me', op.auth);
    expect(r2.statusCode).toBe(401);
    expect(r2.json().codigo).toBe('nao_autenticado');
    expect((await t.chamar('GET', '/v1/admin/me', {})).statusCode).toBe(401);
    expect((await t.chamar('GET', '/v1/admin/me', { authorization: 'Bearer lixo' })).json().codigo).toBe('nao_autenticado');
  });

  it('access vence em 1 h (sessao_expirada); sair revoga (sessao_revogada)', async () => {
    const op = await t.operador();
    expect((await t.chamar('GET', '/v1/admin/me', op.auth)).statusCode).toBe(200);
    expect((await t.chamar('POST', '/v1/admin/auth/sair', op.auth)).statusCode).toBe(204);
    const r = await t.chamar('GET', '/v1/admin/me', op.auth);
    expect(r.statusCode).toBe(401);
    expect(r.json().codigo).toBe('sessao_revogada');
    const outro = await t.operador();
    e.agora = new Date(e.agora.getTime() + 3600_001);
    expect((await t.chamar('GET', '/v1/admin/me', outro.auth)).json().codigo).toBe('sessao_expirada');
  });

  it('renovar: par novo, refresh de uso único, reuso revoga a sessão inteira; refresh do app não renova a do operador', async () => {
    const op = await t.operador();
    const r = await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: op.refreshToken }, {}, ip());
    expect(r.statusCode).toBe(200);
    const novo = r.json();
    expect(novo.operador.id).toBe(op.operadorId);
    expect(novo.refresh_token).not.toBe(op.refreshToken);
    expect(new Date(novo.refresh_expira_em).getTime() - e.agora.getTime()).toBe(7 * 86400_000);
    expect((await t.chamar('GET', '/v1/admin/me', { authorization: `Bearer ${novo.access_token}` })).statusCode).toBe(200);
    // O refresh antigo, usado de novo, é reuso: a sessão inteira cai.
    const reuso = await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: op.refreshToken }, {}, ip());
    expect(reuso.statusCode).toBe(401);
    expect(reuso.json().codigo).toBe('sessao_revogada');
    expect((await t.chamar('GET', '/v1/admin/me', { authorization: `Bearer ${novo.access_token}` })).json().codigo).toBe('sessao_revogada');
    expect((await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: novo.refresh_token }, {}, ip())).json().codigo).toBe('sessao_revogada');

    // Refresh da conta do app não renova nada aqui, e o de operador não renova no app.
    const op2 = await t.operador();
    expect((await t.chamar('POST', '/v1/auth/renovar', {}, { refresh_token: op2.refreshToken }, {}, ip())).statusCode).toBe(401);
    expect((await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: 'x'.repeat(43) }, {}, ip())).statusCode).toBe(401);
    expect((await t.chamar('POST', '/v1/admin/auth/renovar', {}, {}, {}, ip())).statusCode).toBe(422);
  });

  it('refresh antigo de operador apresentado no app não revoga nada (outra audiência, nem existe para o app)', async () => {
    const op = await t.operador();
    const nova = (await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: op.refreshToken }, {}, ip())).json();
    const r = await t.chamar('POST', '/v1/auth/renovar', {}, { refresh_token: op.refreshToken }, {}, ip());
    expect(r.statusCode).toBe(401);
    expect(r.json().codigo).toBe('nao_autenticado');
    expect((await t.chamar('GET', '/v1/admin/me', { authorization: `Bearer ${nova.access_token}` })).statusCode).toBe(200);
  });

  it('operador desativado perde a sessão na hora, no access e no refresh', async () => {
    const op = await t.operador();
    const op2 = await t.operador();
    await e.pool.query(`UPDATE operadores SET ativo = false WHERE id = ANY($1::uuid[])`, [[op.operadorId, op2.operadorId]]);
    const r = await t.chamar('GET', '/v1/admin/me', op.auth);
    expect(r.statusCode).toBe(401);
    expect(r.json().codigo).toBe('sessao_revogada');
    expect((await e.pool.query(`SELECT revogada_motivo FROM sessions WHERE operador_id = $1`, [op.operadorId])).rows[0].revogada_motivo).toBe('operador_desativado');
    const renova = await t.chamar('POST', '/v1/admin/auth/renovar', {}, { refresh_token: op2.refreshToken }, {}, ip());
    expect(renova.json().codigo).toBe('sessao_revogada');
    expect((await e.pool.query(`SELECT revogada_motivo FROM sessions WHERE operador_id = $1`, [op2.operadorId])).rows[0].revogada_motivo).toBe('operador_desativado');
  });

  it('operador de outro tenant não entra por este nem aparece aqui', async () => {
    const outro = await t.operador({ t: e.outroTenantId, email: 'dono@outro.com' });
    expect((await pedir('dono@outro.com')).statusCode).toBe(202);
    expect(e.enviados).toEqual([]);
    expect(outro.auth.authorization).toBeDefined();
  });
});

executar('cadastro de operador por linha de comando (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_cli');
  const { e } = t;
  it('cria, atualiza o nome, desativa e reativa; e-mail em minúsculas; tenant e e-mail inválidos falham', async () => {
    const { cadastrarOperador, desativarOperador } = await import('./operador.js');
    expect(await cadastrarOperador(e.pool, 'padrao', ' Ana@Exemplo.com ', 'Ana')).toBe('criado');
    expect((await e.pool.query(`SELECT email, nome, ativo FROM operadores`)).rows).toEqual([{ email: 'ana@exemplo.com', nome: 'Ana', ativo: true }]);
    expect(await cadastrarOperador(e.pool, 'padrao', 'ANA@exemplo.com', 'Ana Maria')).toBe('atualizado');
    expect(await desativarOperador(e.pool, 'padrao', 'ana@exemplo.com')).toBe('desativado');
    expect(await desativarOperador(e.pool, 'padrao', 'ana@exemplo.com')).toBe('ja_desativado');
    expect(await desativarOperador(e.pool, 'padrao', 'ninguem@exemplo.com')).toBe('inexistente');
    expect(await cadastrarOperador(e.pool, 'padrao', 'ana@exemplo.com', 'Ana Maria')).toBe('reativado');
    expect((await e.pool.query(`SELECT nome, ativo FROM operadores`)).rows).toEqual([{ nome: 'Ana Maria', ativo: true }]);
    await expect(cadastrarOperador(e.pool, 'padrao', 'sem-arroba', 'X')).rejects.toThrow(/E-mail inválido/);
    await expect(cadastrarOperador(e.pool, 'padrao', 'a@b.co', '  ')).rejects.toThrow(/nome/);
    await expect(cadastrarOperador(e.pool, 'nao-existe', 'a@b.co', 'X')).rejects.toThrow(/Tenant não encontrado/);
    // Operador de outro tenant com o mesmo e-mail não é afetado.
    await e.pool.query(`INSERT INTO operadores (tenant_id, email, nome) VALUES ($1, 'ana@exemplo.com', 'Outra')`, [e.outroTenantId]);
    expect(await desativarOperador(e.pool, 'padrao', 'ana@exemplo.com')).toBe('desativado');
    expect((await e.pool.query(`SELECT ativo FROM operadores WHERE tenant_id = $1`, [e.outroTenantId])).rows[0].ativo).toBe(true);
  });
});
