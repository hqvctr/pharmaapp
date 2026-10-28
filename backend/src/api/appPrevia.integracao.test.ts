// Repete, chamada por chamada, o que o app de prévia (pasta `app/`) faz: mesmos caminhos, cabeçalhos, corpos e campos lidos da resposta.
// Se o contrato mudar de um jeito que quebre o app, este teste quebra antes. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('fluxo do app de prévia (Postgres)', () => {
  const t = ambienteDeTeste('teste_app_previa');
  const { e } = t;
  const H = { 'x-tenant': 'padrao' }; // o app manda X-Tenant em toda chamada
  let auth: Record<string, string> = {};
  const get = (url: string, anon = false) => t.chamar('GET', url, anon ? {} : auth, undefined, H);
  const put = (url: string, corpo: unknown) => t.chamar('PUT', url, auth, corpo, H);
  const post = (url: string, corpo?: unknown, extra: Record<string, string> = {}, anon = false) => t.chamar('POST', url, anon ? {} : auth, corpo, { ...H, ...extra });
  const del = (url: string, corpo?: unknown) => t.chamar('DELETE', url, auth, corpo, H);

  it('login por código → termos → preferências → feed → detalhe → ações → busca → produto → avisos → conta → exclusão', async () => {
    // --- dados do mundo: uma loja com cobertura, um produto, uma oferta e um alerta com prova
    const { loja, fonte } = await t.loja({ nome: 'Drogasil' });
    const produto = await t.produto({ nome: 'Fralda Huggies M 60 un', marca: 'Huggies', marcaChave: 'huggies' });
    const oferta = await t.oferta({ produto, loja, fonte, preco: 5990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, frete: ['conhecido', 1290] });
    const alerta = await t.alerta({ oferta, loja, decisao: 'notificar', preco: 5990 });
    await e.pool.query(`UPDATE alerts SET prova_menor_centavos = 6490, prova_maior_centavos = 8990, prova_dias = 37, rotulo_condicao = 'Leve 3, pague 2' WHERE id = $1`, [alerta]);
    await t.historico(produto, loja, '2026-10-30T15:00:00Z', 100, 6000);
    await t.historico(produto, loja, '2026-10-31T15:00:00Z', 95, 5700);

    // --- tela de entrada: testar conexão
    const cfg = (await get('/v1/configuracao', true)).json();
    expect(typeof cfg.nome_app).toBe('string');
    expect(cfg.metodos_login).toEqual(expect.arrayContaining(['email']));
    expect(cfg.categorias.every((c: { slug: string; rotulo: string }) => c.slug && c.rotulo)).toBe(true);
    expect(cfg.termos.versao && cfg.termos.url && cfg.privacidade.url).toBeTruthy();

    // --- e-mail + código
    const email = 'previa@exemplo.com';
    expect((await post('/v1/auth/email/codigo', { email }, {}, true)).statusCode).toBe(202);
    const v = await post('/v1/auth/email/verificar', { email, codigo: e.enviados[0]!.codigo }, {}, true);
    expect(v.statusCode).toBe(200);
    expect(typeof v.json().access_token).toBe('string');
    expect(typeof v.json().refresh_token).toBe('string');
    auth = { authorization: `Bearer ${v.json().access_token}` };

    // --- seguirFluxo: /me → termos pendentes
    const me = (await get('/v1/me')).json();
    expect(me.termos_pendentes).toBe(true);
    expect(me.plano.ceps_permitidos).toBe(1);
    const aceite = await put('/v1/me/consentimentos', { termos_versao: cfg.termos.versao, notificacoes: true });
    expect(aceite.statusCode).toBe(200);
    expect((await get('/v1/me')).json()).toMatchObject({ termos_pendentes: false, notificacoes_consentidas: true });

    // --- preferências vazias → onboarding → salvar como o app salva (silencio e limite_diario voltam como vieram)
    const pref0 = (await get('/v1/preferencias')).json();
    expect(pref0.categorias).toEqual([]);
    const salvo = await put('/v1/preferencias', { categorias: ['higiene_bebe'], ceps: ['14020260'], silencio: pref0.silencio ?? null, limite_diario: pref0.limite_diario ?? null });
    expect(salvo.statusCode).toBe(200);
    expect((await put('/v1/preferencias', { categorias: ['higiene_bebe'], ceps: ['00000001'], silencio: null, limite_diario: null })).json().codigo).toBe('cep_fora_da_regiao');

    // --- feed
    const feed = (await get('/v1/alertas?limite=30')).json();
    const a = feed.itens.find((i: { id: string }) => i.id === alerta);
    expect(a).toBeDefined();
    expect(a).toMatchObject({ destaque: true, situacao: 'ativa', rotulo_condicao: 'Leve 3, pague 2', produto: { nome: 'Fralda Huggies M 60 un', embalagem: { quantidade: 60, unidade: 'un' } }, loja: { rede: 'Drogasil' } });
    expect(typeof a.queda).toBe('number');
    expect(typeof a.preco_referencia_centavos).toBe('number');
    expect((await get('/v1/alertas?limite=30&categoria=higiene_bebe')).json().itens.map((i: { id: string }) => i.id)).toContain(alerta);

    // --- detalhe + evento aberto (Idempotency-Key novo)
    const chave = randomUUID();
    expect((await post(`/v1/alertas/${alerta}/eventos`, { tipo: 'aberto', origem: 'feed' }, { 'idempotency-key': chave })).statusCode).toBe(204);
    const d = (await get(`/v1/alertas/${alerta}`)).json();
    expect(d.prova).toEqual({ menor_preco_centavos: 6490, maior_preco_centavos: 8990, dias_medidos: 37 });
    expect(d.cobertura).toMatchObject({ cep: '14020260', prazo_dias: 3 });
    expect(d.frete).toEqual({ status: 'conhecido', centavos: 1290 });
    expect(Array.isArray(d.advertencias)).toBe(true);
    expect(d.link).toMatch(/^https:\/\/lmdee\.link\//);
    expect(d.link_afiliado).toBe(true);
    expect(d.avaliacao).toBeNull();
    expect(d.seguido).toBe(false);
    for (const tipo of ['clicado', 'compartilhado']) expect((await post(`/v1/alertas/${alerta}/eventos`, { tipo, origem: 'feed' }, { 'idempotency-key': randomUUID() })).statusCode).toBe(204);

    // --- avaliação, denúncia, silenciar
    expect((await put(`/v1/alertas/${alerta}/avaliacao`, { valor: 'util' })).statusCode).toBe(200);
    expect((await get(`/v1/alertas/${alerta}`)).json().avaliacao.valor).toBe('util');
    expect((await put(`/v1/alertas/${alerta}/denuncia`, { motivo: 'preco_errado' })).statusCode).toBeLessThan(300);
    expect((await get(`/v1/alertas/${alerta}`)).json().denuncia.motivo).toBe('preco_errado');

    // --- busca → produto → histórico → seguir
    const busca = (await get('/v1/produtos?limite=30&q=' + encodeURIComponent('huggies'))).json();
    expect(busca.itens[0]).toMatchObject({ id: produto, menor_preco_centavos: 5990, seguido: false });
    const pg = (await get(`/v1/produtos/${produto}`)).json();
    expect(pg.ofertas[0]).toMatchObject({ preco_centavos: 5990, alerta_id: alerta, frete: { status: 'conhecido' } });
    expect(pg.ofertas[0].link).toMatch(/^https:/);
    expect(pg.seguimento).toBeNull();
    const hist = (await get(`/v1/produtos/${produto}/historico`)).json();
    expect(hist.series[0].pontos.map((p: { preco_embalagem_centavos: number }) => p.preco_embalagem_centavos)).toEqual([6000, 5700]);
    const avisosPadrao = { promocao_excepcional: true, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false };
    expect((await put(`/v1/seguidos/${produto}`, { avisos: avisosPadrao })).statusCode).toBe(201);
    expect((await get(`/v1/produtos/${produto}`)).json().seguimento).not.toBeNull();
    expect((await get('/v1/seguidos?limite=50')).json().itens[0].produto.id).toBe(produto);

    // --- silenciar a loja e ver na lista da conta; remover
    expect((await put(`/v1/silenciamentos/loja/${loja}`, { alcance: 'push' })).statusCode).toBe(201);
    const sil = (await get('/v1/silenciamentos')).json().itens[0];
    expect(sil).toMatchObject({ tipo: 'loja', alvo: loja, alcance: 'push' });
    expect((await del(`/v1/silenciamentos/${sil.tipo}/${sil.alvo}`)).statusCode).toBe(204);

    // --- avisos: o app lê nao_lidos com limite=1, lista, marca por ids e "todos até agora" (Instant.toString, com nanos)
    await t.aviso({ userId: me.id, produto, loja, alerta, tipo: 'queda_percentual', criadoEm: new Date(e.agora.getTime() - 60_000) });
    await t.aviso({ userId: me.id, produto, loja: null, tipo: 'voltou_estoque', preco: null, queda: null, criadoEm: new Date(e.agora.getTime() - 30_000) });
    const av1 = (await get('/v1/avisos?limite=1')).json();
    expect(av1.nao_lidos).toBe(2);
    const lista = (await get('/v1/avisos?limite=50')).json();
    expect(lista.itens[0]).toMatchObject({ tipo: 'voltou_estoque', loja: null, alerta_id: null });
    expect(lista.itens[1].alerta_id).toBe(alerta);
    expect((await post('/v1/avisos/leitura', { ids: [lista.itens[0].id] })).statusCode).toBe(204);
    expect((await get('/v1/avisos?limite=1')).json().nao_lidos).toBe(1);
    expect((await post('/v1/avisos/leitura', { ate: new Date(e.agora.getTime() + 5000).toISOString().replace('Z', '123456Z') })).statusCode).toBe(204);
    expect((await get('/v1/avisos?limite=1')).json().nao_lidos).toBe(0);

    // --- conta: consentimento de notificações, exportar, sair, entrar de novo, excluir
    expect((await put('/v1/me/consentimentos', { notificacoes: false })).statusCode).toBe(200);
    const exp = await get('/v1/me/exportacao');
    expect(exp.statusCode).toBe(200);
    expect(JSON.parse(exp.body).conta.email).toBe(email);
    expect((await post('/v1/auth/sair')).statusCode).toBe(204);
    expect((await get('/v1/me')).statusCode).toBe(401);

    e.enviados.length = 0;
    e.agora = new Date(e.agora.getTime() + 120_000);
    await post('/v1/auth/email/codigo', { email }, {}, true);
    const v2 = await post('/v1/auth/email/verificar', { email, codigo: e.enviados[0]!.codigo }, {}, true);
    auth = { authorization: `Bearer ${v2.json().access_token}` };
    expect((await del('/v1/me', { confirmacao: 'excluir' })).statusCode).toBe(204);
    expect((await get('/v1/me')).statusCode).toBe(401);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM users WHERE lower(email) = $1`, [email])).rows[0].n).toBe(0);
  });

  it('o access que venceu (401 sessao_expirada) é renovado com o refresh, como o app faz, e o par antigo deixa de valer', async () => {
    const email = 'renova@exemplo.com';
    await post('/v1/auth/email/codigo', { email }, {}, true);
    const s = (await post('/v1/auth/email/verificar', { email, codigo: e.enviados.at(-1)!.codigo }, {}, true)).json();
    e.agora = new Date(e.agora.getTime() + 3600_001);
    const vencido = await t.chamar('GET', '/v1/me', { authorization: `Bearer ${s.access_token}` }, undefined, H);
    expect(vencido.statusCode).toBe(401);
    expect(vencido.json().codigo).toBe('sessao_expirada');
    const novo = await post('/v1/auth/renovar', { refresh_token: s.refresh_token }, {}, true);
    expect(novo.statusCode).toBe(200);
    expect((await t.chamar('GET', '/v1/me', { authorization: `Bearer ${novo.json().access_token}` }, undefined, H)).statusCode).toBe(200);
  });
});
