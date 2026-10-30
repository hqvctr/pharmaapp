// Central de avisos contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, INICIO, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('avisos (Postgres)', () => {
  const t = ambienteDeTeste('teste_avisos');
  const { e } = t;
  const minutos = (n: number) => new Date(e.agora.getTime() - n * 60_000);
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);

  async function cenario() {
    const p = await t.pessoa();
    const { loja, fonte } = await t.loja({ nome: 'Drogasil' });
    const produto = await t.produto();
    const oferta = await t.oferta({ produto, loja, fonte });
    return { p, loja, fonte, produto, oferta };
  }

  describe('GET /v1/avisos', () => {
    it('lista do mais novo para o mais antigo, com produto, loja, alerta e total de não lidos', async () => {
      const { p, loja, produto, oferta } = await cenario();
      const alerta = await t.alerta({ oferta, loja });
      const velho = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(30), lido: minutos(5) });
      const novo = await t.aviso({ userId: p.userId, produto, loja, alerta, tipo: 'promocao_excepcional', origem: 'categoria', criadoEm: minutos(1), queda: 0.3344 });
      const semLoja = await t.aviso({ userId: p.userId, produto, loja: null, tipo: 'voltou_estoque', preco: null, queda: null, criadoEm: minutos(10), validaAte: minutos(-60) });
      const r = await t.chamar('GET', '/v1/avisos', p.auth);
      expect(r.statusCode).toBe(200);
      expect(r.headers['cache-control']).toBe('no-store');
      expect(ids(r)).toEqual([novo, semLoja, velho]);
      const d = r.json();
      expect(d).toMatchObject({ nao_lidos: 2, proximo_cursor: null });
      expect(d.itens[0]).toEqual({
        id: novo, tipo: 'promocao_excepcional', origem: 'categoria', criado_em: minutos(1).toISOString(), lido_em: null,
        produto: expect.objectContaining({ id: produto, nome: 'Fralda Pampers G' }),
        loja: { id: loja, nome: 'Drogasil (online)', rede: 'Drogasil', tipo: 'online' },
        alerta_id: alerta, preco_centavos: 5990, queda: 0.3344, valida_ate: null,
        // Aviso gravado à mão no teste: o despachante não passou por ele.
        push: { situacao: 'pendente', em: null },
      });
      expect(d.itens[1]).toMatchObject({ loja: null, alerta_id: null, preco_centavos: null, queda: null, valida_ate: minutos(-60).toISOString() });
      expect(d.itens[2].lido_em).toBe(minutos(5).toISOString());
    });

    it('nao_lidos=true filtra a lista, mas o total de não lidos continua o da pessoa toda', async () => {
      const { p, loja, produto } = await cenario();
      await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(3), lido: minutos(1) });
      const aberto = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(2) });
      const so = await t.chamar('GET', '/v1/avisos?nao_lidos=true', p.auth);
      expect(ids(so)).toEqual([aberto]);
      expect(so.json().nao_lidos).toBe(1);
      expect(ids(await t.chamar('GET', '/v1/avisos?nao_lidos=false', p.auth))).toHaveLength(2);
    });

    it('só mostra os avisos da própria pessoa e do próprio tenant', async () => {
      const { p, loja, produto } = await cenario();
      const outra = await t.pessoa();
      await t.aviso({ userId: outra.userId, produto, loja });
      const meu = await t.aviso({ userId: p.userId, produto, loja });
      expect(ids(await t.chamar('GET', '/v1/avisos', p.auth))).toEqual([meu]);
      expect((await t.chamar('GET', '/v1/avisos', p.auth)).json().nao_lidos).toBe(1);
    });

    it('esconde aviso de medicamento, de loja ou marca silenciadas com "tudo" e de alerta rejeitado ou em revisão; silêncio só de push não esconde', async () => {
      const { p, loja, fonte, produto, oferta } = await cenario();
      const visivel = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(50) });
      const remedio = await t.produto({ categoria: 'medicamento', marcaChave: 'rem', marca: 'Rem' });
      await t.aviso({ userId: p.userId, produto: remedio, loja, criadoEm: minutos(49) });
      const mudo = await t.loja({ nome: 'Mudo' });
      await t.aviso({ userId: p.userId, produto, loja: mudo.loja, criadoEm: minutos(48) });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'tudo')`, [e.tenantId, p.userId, mudo.loja]);
      const marcaMuda = await t.produto({ marca: 'Muda', marcaChave: 'muda' });
      await t.aviso({ userId: p.userId, produto: marcaMuda, loja, criadoEm: minutos(47) });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES ($1,$2,'marca','muda','tudo')`, [e.tenantId, p.userId]);
      for (const revisao of ['rejeitado', 'pendente']) {
        const o2 = await t.oferta({ produto, loja, fonte });
        await t.aviso({ userId: p.userId, produto, loja, alerta: await t.alerta({ oferta: o2, loja, revisao }), criadoEm: minutos(46) });
      }
      const so_push = await t.loja({ nome: 'SoPush' });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'push')`, [e.tenantId, p.userId, so_push.loja]);
      const dePush = await t.aviso({ userId: p.userId, produto, loja: so_push.loja, criadoEm: minutos(45) });
      const aprovado = await t.aviso({ userId: p.userId, produto, loja, alerta: await t.alerta({ oferta, loja, revisao: 'aprovado' }), criadoEm: minutos(44) });
      const r = await t.chamar('GET', '/v1/avisos', p.auth);
      expect(ids(r).sort()).toEqual([visivel, dePush, aprovado].sort());
      expect(r.json().nao_lidos).toBe(3);
    });

    it('pagina por cursor sem repetir nem pular, inclusive com a mesma data; valida os parâmetros; exige termos', async () => {
      const { p, loja, produto } = await cenario();
      const todos: string[] = [];
      for (let i = 0; i < 5; i += 1) todos.push(await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(i < 2 ? 0 : i) }));
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let volta = 0; volta < 5; volta += 1) {
        const r = await t.chamar('GET', `/v1/avisos?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, p.auth);
        vistos.push(...ids(r));
        cursor = r.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos).toHaveLength(5);
      expect(new Set(vistos)).toEqual(new Set(todos));
      for (const q of ['?limite=0', '?limite=51', '?nao_lidos=talvez', '?cursor=zzz']) {
        const r = await t.chamar('GET', `/v1/avisos${q}`, p.auth);
        expect(r.statusCode, q).toBe(422);
        expect(r.json().codigo).toBe('validacao');
      }
      expect((await t.chamar('GET', '/v1/avisos', (await t.pessoa({ termos: false })).auth)).json().codigo).toBe('termos_pendentes');
      expect((await t.chamar('GET', '/v1/avisos', {})).statusCode).toBe(401);
    });
  });

  describe('POST /v1/avisos/leitura', () => {
    it('por ids: marca só os pedidos, mantém o lido_em de quem já estava lido, ignora id desconhecido e de outra pessoa', async () => {
      const { p, loja, produto } = await cenario();
      const outra = await t.pessoa();
      const a = await t.aviso({ userId: p.userId, produto, loja });
      const b = await t.aviso({ userId: p.userId, produto, loja });
      const lido = await t.aviso({ userId: p.userId, produto, loja, lido: minutos(500) });
      const alheio = await t.aviso({ userId: outra.userId, produto, loja });
      const lidoEm = async (id: string) => (await e.pool.query(`SELECT lido_em FROM avisos WHERE id = $1`, [id])).rows[0].lido_em as Date | null;
      const r = await t.chamar('POST', '/v1/avisos/leitura', p.auth, { ids: [a, lido, alheio, randomUUID()] });
      expect(r.statusCode).toBe(204);
      expect((await lidoEm(a))?.toISOString()).toBe(e.agora.toISOString());
      expect(await lidoEm(b)).toBeNull();
      expect((await lidoEm(lido))?.toISOString()).toBe(minutos(500).toISOString());
      expect(await lidoEm(alheio)).toBeNull();
      // Repetir não muda nada.
      e.agora = new Date(e.agora.getTime() + 60_000);
      const auth = await t.reabrir(p.userId);
      expect((await t.chamar('POST', '/v1/avisos/leitura', auth, { ids: [a] })).statusCode).toBe(204);
      expect((await lidoEm(a))?.toISOString()).toBe(INICIO.toISOString()); // manteve a primeira data
      expect((await t.chamar('GET', '/v1/avisos', auth)).json().nao_lidos).toBe(1);
    });

    it('até um instante: marca os criados até ele (inclusive) e deixa os mais novos', async () => {
      const { p, loja, produto } = await cenario();
      const outra = await t.pessoa();
      const antigo = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(20) });
      const limite = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(10) });
      const novo = await t.aviso({ userId: p.userId, produto, loja, criadoEm: minutos(1) });
      const alheio = await t.aviso({ userId: outra.userId, produto, loja, criadoEm: minutos(20) });
      const r = await t.chamar('POST', '/v1/avisos/leitura', p.auth, { ate: minutos(10).toISOString() });
      expect(r.statusCode).toBe(204);
      const estado = async (id: string) => (await e.pool.query(`SELECT lido_em IS NOT NULL AS lido FROM avisos WHERE id = $1`, [id])).rows[0].lido as boolean;
      expect([await estado(antigo), await estado(limite), await estado(novo), await estado(alheio)]).toEqual([true, true, false, false]);
    });

    it('valida o corpo: um dos dois campos, ids de 1 a 100 uuids, data e hora, sem campo extra; objeto ou 400', async () => {
      const { p } = await cenario();
      const ruins: unknown[] = [{}, { ids: [] }, { ids: ['x'] }, { ids: 'x' }, { ids: Array.from({ length: 101 }, () => randomUUID()) }, { ate: 'ontem' }, { ate: '2026-10-27' }, { ate: 5 }, { ids: [randomUUID()], ate: minutos(1).toISOString() }, { ids: [randomUUID()], extra: 1 }];
      for (const corpo of ruins) {
        const r = await t.chamar('POST', '/v1/avisos/leitura', p.auth, corpo);
        expect(r.statusCode, JSON.stringify(corpo)).toBe(422);
        expect(r.json().codigo).toBe('validacao');
      }
      expect((await t.chamar('POST', '/v1/avisos/leitura', p.auth, [1])).statusCode).toBe(400);
      expect((await t.chamar('POST', '/v1/avisos/leitura', (await t.pessoa({ termos: false })).auth, { ids: [randomUUID()] })).json().codigo).toBe('termos_pendentes');
      expect((await t.chamar('POST', '/v1/avisos/leitura', {}, { ids: [randomUUID()] })).statusCode).toBe(401);
    });
  });
});
