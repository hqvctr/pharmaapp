// Alertas, lojas e fontes na área do operador contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomBytes, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { lerCredenciaisFonte } from '../fontes/credenciais.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;
const CHAVE = { versao: 'v1', chave: randomBytes(32) };

executar('admin: alertas, lojas e fontes (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_cad', { chaveCredenciais: CHAVE });
  const { e } = t;
  const minutos = (n: number) => new Date(e.agora.getTime() - n * 60_000);
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);
  const auditoria = async (alvo: string) => (await e.pool.query(`SELECT acao, alvo_tipo, detalhe FROM auditoria WHERE alvo_id = $1 ORDER BY em, ctid`, [alvo])).rows;

  async function cenario(o: { decisao?: string; revisao?: string; preco?: number } = {}) {
    const op = await t.operador();
    const { loja, fonte } = await t.loja({ nome: 'Drogasil' });
    const produto = await t.produto({ nome: 'Fralda Huggies M', marca: 'Huggies', marcaChave: 'huggies' });
    const oferta = await t.oferta({ produto, loja, fonte, preco: o.preco ?? 5990 });
    const alerta = await t.alerta({ oferta, loja, decisao: o.decisao ?? 'aguardar_aprovacao', revisao: o.revisao ?? 'pendente', preco: o.preco ?? 5990 });
    return { op, loja, fonte, produto, oferta, alerta };
  }

  describe('alertas', () => {
    it('lista os pendentes por padrão, no formato do contrato (campos estruturados, sem motivo nem score)', async () => {
      const c = await cenario();
      const r = await t.chamar('GET', '/v1/admin/alertas', c.op.auth);
      expect(r.statusCode).toBe(200);
      expect(ids(r)).toContain(c.alerta);
      const a = r.json().itens.find((i: { id: string }) => i.id === c.alerta);
      expect(a).toMatchObject({
        decisao: 'aguardar_aprovacao', revisao: 'pendente', revisao_por: null, situacao_oferta: 'ativa', preco_centavos: 5990,
        produto: { id: c.produto, nome: 'Fralda Huggies M', marca: { chave: 'huggies', nome: 'Huggies' } },
        loja: { id: c.loja, rede: 'Drogasil', nome: 'Drogasil (online)', tipo: 'online', status: 'em_observacao' },
        fonte: { tipo: 'A', confiabilidade: 'alta', status_confianca: 'em_observacao' },
        link: 'https://www.drogasmil.com.br/p/x', link_afiliado: false,
      });
      expect(a.preco_referencia_centavos).toBe(8982);
      expect(a.queda).toBeCloseTo(0.3333, 3);
      expect(a).not.toHaveProperty('motivo');
      expect(a).not.toHaveProperty('score');
      expect(r.json().proximo_cursor).toBeNull();
    });

    it('filtra por revisão e decisão, pagina por cursor e só mostra o próprio tenant', async () => {
      const c = await cenario();
      const apr = await t.alerta({ oferta: c.oferta, loja: c.loja, decisao: 'aguardar_aprovacao', revisao: 'aprovado' });
      const feed = await t.alerta({ oferta: c.oferta, loja: c.loja, decisao: 'somente_feed' });
      expect(ids(await t.chamar('GET', '/v1/admin/alertas?revisao=aprovado', c.op.auth))).toContain(apr);
      expect(ids(await t.chamar('GET', '/v1/admin/alertas?revisao=aprovado', c.op.auth))).not.toContain(c.alerta);
      expect(ids(await t.chamar('GET', '/v1/admin/alertas?revisao=nao_exigida&decisao=somente_feed', c.op.auth))).toContain(feed);
      expect(ids(await t.chamar('GET', '/v1/admin/alertas?revisao=nao_exigida&decisao=notificar', c.op.auth))).not.toContain(feed);
      // Outro tenant não aparece.
      const outroLoja = await t.loja({ t: e.outroTenantId });
      const outroProd = await t.produto({ t: e.outroTenantId });
      const outroOferta = await t.oferta({ t: e.outroTenantId, produto: outroProd, loja: outroLoja.loja, fonte: outroLoja.fonte });
      const outro = await t.alerta({ t: e.outroTenantId, oferta: outroOferta, loja: outroLoja.loja, revisao: 'pendente' });
      expect(ids(await t.chamar('GET', '/v1/admin/alertas', c.op.auth))).not.toContain(outro);
      // Paginação sem repetir nem pular.
      const todos = (await e.pool.query(`SELECT count(*)::int AS n FROM alerts WHERE tenant_id = $1 AND revisao_situacao = 'pendente'`, [e.tenantId])).rows[0].n as number;
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/alertas?limite=1${cursor === null ? '' : `&cursor=${cursor}`}`, c.op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos).toHaveLength(todos);
      expect(new Set(vistos).size).toBe(todos);
      for (const q of ['?revisao=x', '?decisao=descartar', '?limite=0', '?cursor=zzz']) expect((await t.chamar('GET', `/v1/admin/alertas${q}`, c.op.auth)).statusCode, q).toBe(422);
    });

    it('detalhe: 404 para inexistente, id ruim e outro tenant; mostra a situação da oferta (encerrada, escondida)', async () => {
      const c = await cenario();
      const d = await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, c.op.auth);
      expect(d.statusCode).toBe(200);
      expect(d.json().id).toBe(c.alerta);
      for (const id of [randomUUID(), 'nao-uuid']) expect((await t.chamar('GET', `/v1/admin/alertas/${id}`, c.op.auth)).statusCode).toBe(404);
      const op2 = await t.operador({ t: e.outroTenantId });
      expect((await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, op2.auth)).statusCode).toBe(404);
      await e.pool.query(`UPDATE offers SET disponivel = false WHERE id = $1`, [c.oferta]);
      expect((await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, c.op.auth)).json().situacao_oferta).toBe('encerrada');
      await e.pool.query(`UPDATE offers SET disponivel = true, escondida_em = now() WHERE id = $1`, [c.oferta]);
      expect((await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, c.op.auth)).json().situacao_oferta).toBe('escondida_por_denuncia');
      await e.pool.query(`UPDATE offers SET escondida_em = NULL, preco_centavos = 4000 WHERE id = $1`, [c.oferta]);
      expect((await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, c.op.auth)).json().situacao_oferta).toBe('encerrada');
      await e.pool.query(`UPDATE offers SET preco_centavos = 5990, valida_ate = $2 WHERE id = $1`, [c.oferta, minutos(1)]);
      expect((await t.chamar('GET', `/v1/admin/alertas/${c.alerta}`, c.op.auth)).json().situacao_oferta).toBe('encerrada');
    });

    it('aprovar: grava quem, quando e a observação, audita, e o alerta passa a aparecer no feed da pessoa', async () => {
      const c = await cenario();
      const p = await t.pessoa();
      expect((await t.chamar('GET', '/v1/alertas', p.auth)).json().itens.map((i: { id: string }) => i.id)).not.toContain(c.alerta);
      const r = await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, { resultado: 'aprovado', observacao: '  Preço conferido no site.  ' });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ revisao: 'aprovado', revisao_por: { operador: { id: c.op.operadorId }, em: e.agora.toISOString(), observacao: 'Preço conferido no site.' } });
      expect(await auditoria(c.alerta)).toEqual([{ acao: 'alerta_revisado', alvo_tipo: 'alerta', detalhe: { revisao: { de: 'pendente', para: 'aprovado' }, observacao: 'Preço conferido no site.' } }]);
      expect((await t.chamar('GET', '/v1/alertas', p.auth)).json().itens.map((i: { id: string }) => i.id)).toContain(c.alerta);
      // Repetir devolve 200 sem mexer (nem na data, nem na auditoria).
      e.agora = new Date(e.agora.getTime() + 600_000);
      const auth = (await t.operador()).auth;
      const de_novo = await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, auth, { resultado: 'aprovado', observacao: 'outra' });
      expect(de_novo.statusCode).toBe(200);
      expect(de_novo.json().revisao_por.observacao).toBe('Preço conferido no site.');
      expect(await auditoria(c.alerta)).toHaveLength(1);
    });

    it('rejeitar vale para qualquer decisão, inclusive depois de aprovado, e tira do feed; aprovar depois de rejeitado dá 409 ja_revisado', async () => {
      const c = await cenario();
      const p = await t.pessoa();
      expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, { resultado: 'aprovado' })).statusCode).toBe(200);
      const rej = await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, { resultado: 'rejeitado', observacao: null });
      expect(rej.statusCode).toBe(200);
      expect(rej.json()).toMatchObject({ revisao: 'rejeitado', revisao_por: { observacao: null } });
      expect((await t.chamar('GET', '/v1/alertas', p.auth)).json().itens.map((i: { id: string }) => i.id)).not.toContain(c.alerta);
      const volta = await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, { resultado: 'aprovado' });
      expect(volta.statusCode).toBe(409);
      expect(volta.json().codigo).toBe('ja_revisado');
      expect((await auditoria(c.alerta)).map((l) => l.detalhe.revisao)).toEqual([{ de: 'pendente', para: 'aprovado' }, { de: 'aprovado', para: 'rejeitado' }]);
      // Rejeitar o que não passa por aprovação também vale.
      const feed = await cenario({ decisao: 'somente_feed', revisao: 'nao_exigida' });
      expect((await t.chamar('PUT', `/v1/admin/alertas/${feed.alerta}/revisao`, feed.op.auth, { resultado: 'rejeitado' })).json().revisao).toBe('rejeitado');
    });

    it('aprovar só vale para aguardar_aprovacao (estado_conflitante) e para oferta ainda ativa (oferta_encerrada); nada é gravado na recusa', async () => {
      const feed = await cenario({ decisao: 'somente_feed', revisao: 'nao_exigida' });
      const r1 = await t.chamar('PUT', `/v1/admin/alertas/${feed.alerta}/revisao`, feed.op.auth, { resultado: 'aprovado' });
      expect(r1.statusCode).toBe(409);
      expect(r1.json().codigo).toBe('estado_conflitante');
      const c = await cenario();
      for (const [nome, sql] of [['saiu do ar', `UPDATE offers SET disponivel = false`], ['venceu', `UPDATE offers SET valida_ate = now() - interval '1 day'`], ['preço mudou', `UPDATE offers SET preco_centavos = 4000`], ['escondida', `UPDATE offers SET escondida_em = now()`]] as const) {
        await e.pool.query(`${sql} WHERE id = $1`, [c.oferta]);
        const r = await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, { resultado: 'aprovado' });
        expect(r.statusCode, nome).toBe(409);
        expect(r.json().codigo, nome).toBe('oferta_encerrada');
        await e.pool.query(`UPDATE offers SET disponivel = true, valida_ate = NULL, preco_centavos = 5990, escondida_em = NULL WHERE id = $1`, [c.oferta]);
      }
      expect((await e.pool.query(`SELECT revisao_situacao FROM alerts WHERE id = $1`, [c.alerta])).rows[0].revisao_situacao).toBe('pendente');
      expect(await auditoria(c.alerta)).toEqual([]);
    });

    it('valida o corpo; 404; 401 sem token de operador; token do app não vale', async () => {
      const c = await cenario();
      for (const corpo of [{}, { resultado: 'talvez' }, { resultado: 'aprovado', observacao: 'x'.repeat(1001) }, { resultado: 'aprovado', observacao: 5 }]) {
        expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, corpo)).statusCode, JSON.stringify(corpo).slice(0, 30)).toBe(422);
      }
      expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, c.op.auth, [1])).statusCode).toBe(400);
      expect((await t.chamar('PUT', `/v1/admin/alertas/${randomUUID()}/revisao`, c.op.auth, { resultado: 'aprovado' })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, {}, { resultado: 'aprovado' })).statusCode).toBe(401);
      expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, (await t.pessoa()).auth, { resultado: 'aprovado' })).statusCode).toBe(401);
      const outroTenant = await t.operador({ t: e.outroTenantId });
      expect((await t.chamar('PUT', `/v1/admin/alertas/${c.alerta}/revisao`, outroTenant.auth, { resultado: 'aprovado' })).statusCode).toBe(404);
    });
  });

  describe('lojas', () => {
    it('lista, filtra por status, pagina e não mostra outro tenant; formato do contrato', async () => {
      const op = await t.operador();
      const a = await t.loja({ nome: 'LojaA' });
      const b = await t.loja({ nome: 'LojaB' });
      await e.pool.query(`UPDATE stores SET status = 'bloqueada', cnpj = '12345678000199', autorizacao_sanitaria = 'AFE 123', reputacao = 0.75 WHERE id = $1`, [b.loja]);
      const outra = await t.loja({ t: e.outroTenantId });
      const todas = (await t.chamar('GET', '/v1/admin/lojas', op.auth)).json();
      expect(todas.itens.map((l: { id: string }) => l.id)).toContain(a.loja);
      expect(todas.itens.map((l: { id: string }) => l.id)).not.toContain(outra.loja);
      expect(todas.itens.find((l: { id: string }) => l.id === b.loja)).toEqual({
        id: b.loja, rede: 'LojaB', nome: 'LojaB (online)', cnpj: '12345678000199', tipo: 'online', status: 'bloqueada', reputacao: 0.75,
        autorizacao_sanitaria: 'AFE 123', criado_em: expect.any(String),
      });
      expect(ids(await t.chamar('GET', '/v1/admin/lojas?status=bloqueada', op.auth))).toContain(b.loja);
      expect(ids(await t.chamar('GET', '/v1/admin/lojas?status=bloqueada', op.auth))).not.toContain(a.loja);
      const total = todas.itens.length;
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/lojas?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(new Set(vistos).size).toBe(total);
      expect(vistos).toHaveLength(total);
      expect((await t.chamar('GET', '/v1/admin/lojas?status=x', op.auth)).statusCode).toBe(422);
    });

    it('define o status (aprovar, observar, bloquear), audita antes e depois, e repetir não faz nada', async () => {
      const op = await t.operador();
      const l = await t.loja({ nome: 'Status' });
      await e.pool.query(`UPDATE stores SET status = 'em_observacao' WHERE id = $1`, [l.loja]);
      const r = await t.chamar('PUT', `/v1/admin/lojas/${l.loja}/status`, op.auth, { status: 'aprovada', observacao: 'Autorização sanitária conferida.' });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ id: l.loja, status: 'aprovada' });
      expect((await e.pool.query(`SELECT status FROM stores WHERE id = $1`, [l.loja])).rows[0].status).toBe('aprovada');
      expect((await t.chamar('PUT', `/v1/admin/lojas/${l.loja}/status`, op.auth, { status: 'aprovada' })).statusCode).toBe(200);
      expect((await t.chamar('PUT', `/v1/admin/lojas/${l.loja}/status`, op.auth, { status: 'bloqueada' })).json().status).toBe('bloqueada');
      expect((await auditoria(l.loja)).map((x) => [x.acao, x.detalhe.status])).toEqual([
        ['loja_status_definido', { de: 'em_observacao', para: 'aprovada' }],
        ['loja_status_definido', { de: 'aprovada', para: 'bloqueada' }],
      ]);
      expect((await auditoria(l.loja))[0]!.detalhe.observacao).toBe('Autorização sanitária conferida.');
    });

    it('valida, 404 (inclusive loja de outro tenant) e exige operador', async () => {
      const op = await t.operador();
      const l = await t.loja();
      const outra = await t.loja({ t: e.outroTenantId });
      for (const corpo of [{}, { status: 'ok' }, { status: 'aprovada', observacao: 'x'.repeat(1001) }]) expect((await t.chamar('PUT', `/v1/admin/lojas/${l.loja}/status`, op.auth, corpo)).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/lojas/${randomUUID()}/status`, op.auth, { status: 'aprovada' })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/lojas/${outra.loja}/status`, op.auth, { status: 'bloqueada' })).statusCode).toBe(404);
      expect((await e.pool.query(`SELECT status FROM stores WHERE id = $1`, [outra.loja])).rows[0].status).toBe('em_observacao');
      expect((await t.chamar('PUT', `/v1/admin/lojas/${l.loja}/status`, {}, { status: 'aprovada' })).statusCode).toBe(401);
      expect((await t.chamar('GET', '/v1/admin/lojas', (await t.pessoa()).auth)).statusCode).toBe(401);
    });
  });

  describe('fontes', () => {
    async function fonteLomadee() {
      const op = await t.operador();
      const nome = 'lomadee';
      const existe = await e.pool.query(`SELECT id FROM sources WHERE tenant_id = $1 AND nome = $2`, [e.tenantId, nome]);
      const id = existe.rowCount === 1 ? (existe.rows[0].id as string) : ((await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,$2,'A',120,'SP','alta','teste',false) RETURNING id`, [e.tenantId, nome])).rows[0].id as string);
      return { op, id };
    }

    it('lista as fontes do tenant com o estado da credencial (sem valor)', async () => {
      const { op, id } = await fonteLomadee();
      const outro = await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal) VALUES ($1,'de-outro','A',60,'SP','alta','x') RETURNING id`, [e.outroTenantId]);
      const r = await t.chamar('GET', '/v1/admin/fontes', op.auth);
      expect(r.statusCode).toBe(200);
      const f = r.json().itens.find((x: { id: string }) => x.id === id);
      expect(f).toEqual({ id, nome: 'lomadee', tipo: 'A', confiabilidade: 'alta', status_confianca: 'em_observacao', frequencia_minutos: 120, regiao: 'SP', ativa: false, credencial: { definida: false, atualizada_em: null, atualizada_por: null } });
      expect(r.json().itens.map((x: { id: string }) => x.id)).not.toContain(outro.rows[0].id);
    });

    it('define confiança e ativação, audita e repetir não faz nada', async () => {
      const { op, id } = await fonteLomadee();
      const r = await t.chamar('PUT', `/v1/admin/fontes/${id}/status`, op.auth, { status_confianca: 'aprovada', ativa: true, observacao: 'Termos lidos.' });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ id, status_confianca: 'aprovada', ativa: true });
      expect((await t.chamar('PUT', `/v1/admin/fontes/${id}/status`, op.auth, { status_confianca: 'aprovada', ativa: true })).statusCode).toBe(200);
      expect((await auditoria(id)).filter((x) => x.acao === 'fonte_status_definido')).toEqual([
        { acao: 'fonte_status_definido', alvo_tipo: 'fonte', detalhe: { status_confianca: { de: 'em_observacao', para: 'aprovada' }, ativa: { de: false, para: true }, observacao: 'Termos lidos.' } },
      ]);
      for (const corpo of [{}, { status_confianca: 'aprovada' }, { status_confianca: 'x', ativa: true }, { status_confianca: 'aprovada', ativa: 'sim' }]) expect((await t.chamar('PUT', `/v1/admin/fontes/${id}/status`, op.auth, corpo)).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/fontes/${randomUUID()}/status`, op.auth, { status_confianca: 'aprovada', ativa: true })).statusCode).toBe(404);
    });

    it('grava a credencial cifrada (só escrita): nunca volta em resposta nem na auditoria; a coleta consegue ler', async () => {
      const { op, id } = await fonteLomadee();
      const segredo = `segredo-${randomUUID()}`;
      const campos = (await import('../fontes/registro.js')).fabricaDo('lomadee').credenciais;
      const valores = Object.fromEntries(campos.map((c) => [c, `${segredo}-${c}`]));
      const r = await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, { valores });
      expect(r.statusCode).toBe(204);
      expect(r.body).toBe('');
      const lida = await lerCredenciaisFonte(e.pool, [CHAVE], e.tenantId, id);
      expect(lida).toEqual(valores);
      const bruto = (await e.pool.query(`SELECT texto_cifrado FROM source_credentials WHERE source_id = $1`, [id])).rows[0].texto_cifrado as Buffer;
      expect(bruto.toString('utf8')).not.toContain(segredo);
      const lista = await t.chamar('GET', '/v1/admin/fontes', op.auth);
      expect(lista.body).not.toContain(segredo);
      expect(lista.json().itens.find((x: { id: string }) => x.id === id).credencial).toEqual({ definida: true, atualizada_em: expect.any(String), atualizada_por: { id: op.operadorId, nome: op.nome } });
      const log = await e.pool.query(`SELECT detalhe::text AS d FROM auditoria WHERE alvo_id = $1 AND acao = 'fonte_credencial_gravada'`, [id]);
      expect(log.rows).toHaveLength(1);
      expect(log.rows[0].d).not.toContain(segredo);
      expect(JSON.parse(log.rows[0].d)).toEqual({ campos: [...campos].sort() });
      // Substitui por inteiro.
      const novo = Object.fromEntries(campos.map((c) => [c, `novo-${c}`]));
      expect((await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, { valores: novo })).statusCode).toBe(204);
      expect(await lerCredenciaisFonte(e.pool, [CHAVE], e.tenantId, id)).toEqual(novo);
    });

    it('recusa credencial com campo que a fonte não usa, campo faltando, vazio, corpo ruim; sem adaptador configurado; fonte inexistente', async () => {
      const { op, id } = await fonteLomadee();
      const campos = (await import('../fontes/registro.js')).fabricaDo('lomadee').credenciais;
      const completo = Object.fromEntries(campos.map((c) => [c, 'x']));
      for (const [nome, valores] of [
        ['campo desconhecido', { ...completo, invento: 'x' }],
        ['falta campo', Object.fromEntries(campos.slice(1).map((c) => [c, 'x']))],
        ['campo vazio', { ...completo, [campos[0]!]: '   ' }],
        ['vazio', {}],
        ['valor não é texto', { ...completo, [campos[0]!]: 5 }],
        ['valor enorme', { ...completo, [campos[0]!]: 'x'.repeat(4097) }],
        ['não é objeto', 'x'],
      ] as const) {
        const r = await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, { valores });
        expect(r.statusCode, nome).toBe(422);
        expect(r.json().codigo, nome).toBe('validacao');
      }
      expect((await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, {})).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, [1])).statusCode).toBe(400);
      expect((await e.pool.query(`SELECT count(*)::int AS n FROM source_credentials WHERE source_id = $1`, [id])).rows[0].n).toBe(1); // a do teste anterior; nada novo
      const semConfig = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal) VALUES ($1,'sem-config','A',60,'SP','alta','x') RETURNING id`, [e.tenantId])).rows[0].id;
      expect((await t.chamar('PUT', `/v1/admin/fontes/${semConfig}/credencial`, op.auth, { valores: completo })).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/fontes/${randomUUID()}/credencial`, op.auth, { valores: completo })).statusCode).toBe(404);
      // Fonte de outro tenant é como se não existisse (e nada é gravado para ela).
      const deOutro = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal) VALUES ($1,'lomadee','A',60,'SP','alta','x') RETURNING id`, [e.outroTenantId])).rows[0].id;
      expect((await t.chamar('PUT', `/v1/admin/fontes/${deOutro}/credencial`, op.auth, { valores: completo })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/fontes/${deOutro}/status`, op.auth, { status_confianca: 'aprovada', ativa: true })).statusCode).toBe(404);
      expect((await e.pool.query(`SELECT count(*)::int AS n FROM source_credentials WHERE source_id = $1`, [deOutro])).rows[0].n).toBe(0);
    });
  });
});

executar('admin: credencial sem chave configurada (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_semchave');
  it('503 servico_indisponivel e nada é gravado', async () => {
    const op = await t.operador();
    const id = (await t.e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal) VALUES ($1,'lomadee','A',60,'SP','alta','x') RETURNING id`, [t.e.tenantId])).rows[0].id;
    const campos = (await import('../fontes/registro.js')).fabricaDo('lomadee').credenciais;
    const r = await t.chamar('PUT', `/v1/admin/fontes/${id}/credencial`, op.auth, { valores: Object.fromEntries(campos.map((c) => [c, 'x'])) });
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('servico_indisponivel');
    expect((await t.e.pool.query(`SELECT count(*)::int AS n FROM source_credentials`)).rows[0].n).toBe(0);
  });
});
