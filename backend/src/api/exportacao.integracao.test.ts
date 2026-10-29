// Exportação dos dados da conta (LGPD) contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TABELAS_FORA_DA_EXPORTACAO } from './rotas/exportacao.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('exportação (Postgres)', () => {
  const t = ambienteDeTeste('teste_exportacao');
  const { e } = t;
  const minutos = (n: number) => new Date(e.agora.getTime() - n * 60_000);

  /** Uma conta com dado em todas as tabelas dela. */
  async function contaCheia() {
    const p = await t.pessoa({ ceps: ['14020260', '01310100'] });
    await e.pool.query(`UPDATE users SET notificacoes_consentidas_em = $2 WHERE id = $1`, [p.userId, minutos(100)]);
    await e.pool.query(`UPDATE user_preferences SET silencio_inicio = '22:00', silencio_fim = '07:00', limite_diario = 5 WHERE user_id = $1`, [p.userId]);
    const { loja, fonte } = await t.loja({ nome: 'Drogasil' });
    const produto = await t.produto({ nome: 'Fralda Huggies M', marca: 'Huggies', marcaChave: 'huggies' });
    const oferta = await t.oferta({ produto, loja, fonte });
    const alerta = await t.alerta({ oferta, loja });
    await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance, criado_em) VALUES ($1,$2,'loja',$3,'push',$4)`, [e.tenantId, p.userId, loja, minutos(90)]);
    await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance, criado_em) VALUES ($1,$2,'marca','huggies','tudo',$3)`, [e.tenantId, p.userId, minutos(80)]);
    await e.pool.query(`INSERT INTO seguidos (tenant_id, user_id, product_id, promocao_excepcional, queda_percentual, voltou_estoque, menor_preco_180d, promocao_acabando, criado_em, atualizado_em) VALUES ($1,$2,$3,true,20,false,true,false,$4,$4)`, [e.tenantId, p.userId, produto, minutos(70)]);
    const velho = await t.aviso({ userId: p.userId, produto, loja, alerta, criadoEm: minutos(60), lido: minutos(50) });
    const novo = await t.aviso({ userId: p.userId, produto, loja: null, tipo: 'voltou_estoque', preco: null, queda: null, criadoEm: minutos(40) });
    await e.pool.query(`INSERT INTO avaliacoes (tenant_id, user_id, alert_id, valor, avaliado_em) VALUES ($1,$2,$3,'util',$4)`, [e.tenantId, p.userId, alerta, minutos(30)]);
    await e.pool.query(`INSERT INTO denuncias (tenant_id, user_id, alert_id, motivo, denunciado_em) VALUES ($1,$2,$3,'sem_estoque',$4)`, [e.tenantId, p.userId, alerta, minutos(20)]);
    await e.pool.query(`INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em) VALUES ($1,$2,$3,'aberto','push',$4),($1,$2,$3,'clicado','feed',$5)`, [e.tenantId, p.userId, alerta, minutos(15), minutos(10)]);
    await t.chamar('PUT', '/v1/dispositivo', p.auth, { token: 'TOKEN-SECRETO-DE-PUSH', plataforma: 'android', versao_app: '1.2.3' });
    const hash = `HASH-DO-COMPROVANTE-${randomUUID()}`;
    await e.pool.query(
      `INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, expira_em, transacao_original_id) VALUES ($1,$2,'premium_mensal','expirada','google_play',$3,$4,$5)`,
      [e.tenantId, p.userId, minutos(5000), minutos(2000), hash],
    );
    return { p, loja, produto, alerta, velho, novo, hash };
  }

  it('devolve tudo da conta, na forma do contrato, como arquivo, sem token de push nem hash de comprovante', async () => {
    const c = await contaCheia();
    const r = await t.chamar('GET', '/v1/me/exportacao', c.p.auth);
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-disposition']).toBe('attachment; filename="economae-dados.json"');
    expect(r.headers['cache-control']).toBe('no-store');
    const d = r.json();
    expect(Object.keys(d).sort()).toEqual(['assinaturas', 'avaliacoes', 'avisos', 'conta', 'denuncias', 'dispositivos', 'eventos', 'gerado_em', 'preferencias', 'seguidos', 'silenciamentos']);
    expect(d.gerado_em).toBe(e.agora.toISOString());
    expect(d.conta).toMatchObject({ id: c.p.userId, termos_pendentes: false, notificacoes_consentidas: true, plano: { tipo: 'gratuito' } });
    expect(d.preferencias).toEqual({ categorias: ['bebe', 'mamae'], ceps: ['14020260'], silencio: { inicio: '22:00', fim: '07:00' }, limite_diario: 5, ceps_ignorados_pelo_plano: ['01310100'] });
    expect(d.silenciamentos.map((s: { tipo: string; alcance: string; nome: string }) => [s.tipo, s.alcance, s.nome])).toEqual([['marca', 'tudo', 'Huggies'], ['loja', 'push', 'Drogasil (online)']]);
    expect(d.seguidos).toHaveLength(1);
    expect(d.seguidos[0]).toMatchObject({ produto: { id: c.produto }, avisos: { queda_percentual: 20, menor_preco_180d: true, voltou_estoque: false } });
    expect(d.avisos.map((a: { id: string }) => a.id)).toEqual([c.novo, c.velho]);
    expect(d.avisos[1]).toMatchObject({ alerta_id: c.alerta, lido_em: minutos(50).toISOString(), loja: { nome: 'Drogasil (online)' } });
    expect(d.avaliacoes).toEqual([{ alerta_id: c.alerta, valor: 'util', avaliado_em: minutos(30).toISOString() }]);
    expect(d.denuncias).toEqual([{ alerta_id: c.alerta, motivo: 'sem_estoque', denunciado_em: minutos(20).toISOString() }]);
    expect(d.eventos).toEqual([
      { alerta_id: c.alerta, tipo: 'clicado', origem: 'feed', ocorrido_em: minutos(10).toISOString() },
      { alerta_id: c.alerta, tipo: 'aberto', origem: 'push', ocorrido_em: minutos(15).toISOString() },
    ]);
    expect(d.dispositivos).toEqual([{ plataforma: 'android', versao_app: '1.2.3', registrado_em: e.agora.toISOString() }]);
    expect(d.assinaturas).toEqual([{ plano: 'premium_mensal', status: 'expirada', loja: 'google_play', iniciada_em: minutos(5000).toISOString(), expira_em: minutos(2000).toISOString() }]);
    expect(r.body).not.toContain('TOKEN-SECRETO-DE-PUSH');
    expect(r.body).not.toContain(c.hash);
  });

  it('conta vazia devolve listas vazias; só os dados da própria pessoa; avisos escondidos do feed saem na exportação', async () => {
    const outra = await contaCheia();
    const p = await t.pessoa();
    const d = (await t.chamar('GET', '/v1/me/exportacao', p.auth)).json();
    expect(d).toMatchObject({ silenciamentos: [], seguidos: [], avisos: [], avaliacoes: [], denuncias: [], eventos: [], dispositivos: [], assinaturas: [] });
    expect(d.conta.id).toBe(p.userId);
    // Medicamento não aparece na central, mas o aviso é dado da pessoa e sai na exportação.
    const remedio = await t.produto({ categoria: 'medicamento', marcaChave: 'rem', marca: 'Rem' });
    const escondido = await t.aviso({ userId: p.userId, produto: remedio });
    expect((await t.chamar('GET', '/v1/avisos', p.auth)).json().itens).toEqual([]);
    expect((await t.chamar('GET', '/v1/me/exportacao', await t.reabrir(p.userId))).statusCode).toBe(429); // 1 por hora
    e.agora = new Date(e.agora.getTime() + 3_700_000);
    const depois = (await t.chamar('GET', '/v1/me/exportacao', await t.reabrir(p.userId))).json();
    expect(depois.avisos.map((a: { id: string }) => a.id)).toEqual([escondido]);
    expect(depois.conta.id).not.toBe(outra.p.userId);
  });

  it('uma por hora por conta (429 com Retry-After); outra conta tem o seu limite; vale com termos pendentes; exige login', async () => {
    const a = await t.pessoa();
    expect((await t.chamar('GET', '/v1/me/exportacao', a.auth)).statusCode).toBe(200);
    const r = await t.chamar('GET', '/v1/me/exportacao', a.auth);
    expect(r.statusCode).toBe(429);
    expect(r.json().codigo).toBe('muitas_requisicoes');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    const sem = await t.pessoa({ termos: false });
    const rs = await t.chamar('GET', '/v1/me/exportacao', sem.auth);
    expect(rs.statusCode).toBe(200);
    expect(rs.json().conta.termos_pendentes).toBe(true);
    expect((await t.chamar('GET', '/v1/me/exportacao', {})).statusCode).toBe(401);
  });

  it('toda tabela que aponta para a pessoa está na exportação ou na lista de fora, com motivo', async () => {
    const r = await e.pool.query(
      `SELECT DISTINCT c.conrelid::regclass::text AS tabela
         FROM pg_constraint c WHERE c.contype = 'f' AND c.confrelid = 'users'::regclass AND c.conrelid <> 'users'::regclass ORDER BY 1`,
    );
    const tabelas = r.rows.map((x: { tabela: string }) => x.tabela);
    const naExportacao = ['user_preferences', 'subscriptions', 'silenciamentos', 'seguidos', 'alert_events', 'avaliacoes', 'denuncias', 'avisos', 'dispositivos'];
    const esperadas = [...naExportacao, ...Object.keys(TABELAS_FORA_DA_EXPORTACAO)].sort();
    expect(tabelas.sort()).toEqual(esperadas);
    for (const motivo of Object.values(TABELAS_FORA_DA_EXPORTACAO)) expect(motivo.length).toBeGreaterThan(10);
  });
});
