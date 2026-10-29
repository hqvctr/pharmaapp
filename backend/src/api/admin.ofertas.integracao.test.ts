// Ofertas manuais, busca de produto e auditoria na área do operador contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { registrarAuditoria } from './auditoria.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('admin: ofertas manuais, produtos e auditoria (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_ofertas');
  const { e } = t;
  const minutos = (n: number) => new Date(e.agora.getTime() - n * 60_000);
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);

  async function manual(op: { operadorId: string }, o: { t?: string; disponivel?: boolean; validaAte?: Date | null; condicao?: object | null; frete?: [string, number | null]; criadoEm?: Date; padrao?: boolean } = {}) {
    const tenant = o.t ?? e.tenantId;
    const { loja, fonte } = await t.loja({ t: tenant, nome: 'Farmácia Manual' });
    const produto = await t.produto({ t: tenant, nome: 'Fralda Huggies M', marca: 'Huggies', marcaChave: 'huggies' });
    const oferta = await t.oferta({ t: tenant, produto, loja, fonte, preco: 5990, disponivel: o.disponivel, validaAte: o.validaAte, condicao: o.condicao, frete: o.frete });
    await e.pool.query(`UPDATE offers SET criada_por = $2, criado_em = $3, validade_padrao_aplicada = $4 WHERE id = $1`, [oferta, op.operadorId, o.criadoEm ?? minutos(10), o.padrao ?? false]);
    const alerta = await t.alerta({ t: tenant, oferta, loja, decisao: 'somente_feed' });
    return { oferta, loja, produto, alerta };
  }

  describe('ofertas manuais', () => {
    it('lista só as manuais ativas, no formato do contrato, com o rótulo da condição, o frete e o alerta', async () => {
      const op = await t.operador();
      const m = await manual(op, { condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, frete: ['conhecido', 1290], validaAte: new Date(e.agora.getTime() + 86_400_000), padrao: true });
      const encerrada = await manual(op, { disponivel: false });
      const vencida = await manual(op, { validaAte: minutos(1) });
      const coletada = await t.loja({ nome: 'Coletada' });
      const prod = await t.produto();
      const daFonte = await t.oferta({ produto: prod, loja: coletada.loja, fonte: coletada.fonte });
      const outro = await manual(await t.operador({ t: e.outroTenantId }), { t: e.outroTenantId });
      const r = await t.chamar('GET', '/v1/admin/ofertas-manuais', op.auth);
      expect(r.statusCode).toBe(200);
      expect(ids(r)).toContain(m.oferta);
      for (const fora of [encerrada.oferta, vencida.oferta, daFonte, outro.oferta]) expect(ids(r)).not.toContain(fora);
      expect(r.json().itens.find((i: { id: string }) => i.id === m.oferta)).toEqual({
        id: m.oferta, produto: expect.objectContaining({ id: m.produto, nome: 'Fralda Huggies M' }), loja: { id: m.loja, nome: 'Farmácia Manual (online)', rede: 'Farmácia Manual', tipo: 'online' },
        preco_centavos: 5990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, rotulo_condicao: 'Leve 3, pague 2', frete: { status: 'conhecido', centavos: 1290 },
        valida_de: null, valida_ate: new Date(e.agora.getTime() + 86_400_000).toISOString(), validade_padrao_aplicada: true, link: 'https://www.drogasmil.com.br/p/x', link_afiliado: false,
        disponivel: true, alerta_id: m.alerta, criada_por: { id: op.operadorId, nome: op.nome }, criada_em: minutos(10).toISOString(),
      });
      const todas = await t.chamar('GET', '/v1/admin/ofertas-manuais?ativas=false', op.auth);
      for (const dentro of [m.oferta, encerrada.oferta, vencida.oferta]) expect(ids(todas)).toContain(dentro);
      expect(ids(todas)).not.toContain(daFonte);
      expect((await t.chamar('GET', '/v1/admin/ofertas-manuais?ativas=talvez', op.auth)).statusCode).toBe(422);
    });

    it('frete que não é conhecido não vaza centavos; sem condição o rótulo é null', async () => {
      const op = await t.operador();
      const m = await manual(op, { frete: ['a_confirmar', 500] }); // o banco aceita o valor guardado; a API não o mostra
      const item = (await t.chamar('GET', '/v1/admin/ofertas-manuais', op.auth)).json().itens.find((i: { id: string }) => i.id === m.oferta);
      expect(item).toMatchObject({ frete: { status: 'a_confirmar', centavos: null }, condicao: null, rotulo_condicao: null });
    });

    it('pagina da mais nova para a mais antiga, sem repetir', async () => {
      const op = await t.operador();
      for (let i = 0; i < 4; i += 1) await manual(op, { criadoEm: minutos(300 + i) });
      const total = (await e.pool.query(`SELECT count(*)::int AS n FROM offers WHERE tenant_id = $1 AND criada_por IS NOT NULL AND disponivel AND valida_ate IS NULL`, [e.tenantId])).rows[0].n as number;
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/ofertas-manuais?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos.length).toBeGreaterThanOrEqual(total);
      expect(new Set(vistos).size).toBe(vistos.length);
    });

    it('encerrar marca indisponível, tira o alerta do feed, audita uma vez e é idempotente; a linha fica', async () => {
      const op = await t.operador();
      const m = await manual(op);
      const p = await t.pessoa();
      expect((await t.chamar('GET', '/v1/alertas', p.auth)).json().itens.map((i: { id: string }) => i.id)).toContain(m.alerta);
      expect((await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${m.oferta}`, op.auth)).statusCode).toBe(204);
      expect((await e.pool.query(`SELECT disponivel FROM offers WHERE id = $1`, [m.oferta])).rows[0].disponivel).toBe(false);
      expect((await t.chamar('GET', '/v1/alertas', p.auth)).json().itens.map((i: { id: string }) => i.id)).not.toContain(m.alerta);
      expect((await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${m.oferta}`, op.auth)).statusCode).toBe(204);
      const log = (await e.pool.query(`SELECT acao, alvo_tipo, operador_id FROM auditoria WHERE alvo_id = $1`, [m.oferta])).rows;
      expect(log).toEqual([{ acao: 'oferta_manual_encerrada', alvo_tipo: 'oferta', operador_id: op.operadorId }]);
    });

    it('não encerra oferta coletada por fonte, de outro tenant, inexistente nem id ruim (404); exige operador', async () => {
      const op = await t.operador();
      const l = await t.loja();
      const prod = await t.produto();
      const daFonte = await t.oferta({ produto: prod, loja: l.loja, fonte: l.fonte });
      const doOutro = await manual(await t.operador({ t: e.outroTenantId }), { t: e.outroTenantId });
      for (const id of [daFonte, doOutro.oferta, randomUUID(), 'nao-uuid']) expect((await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${id}`, op.auth)).statusCode, id).toBe(404);
      expect((await e.pool.query(`SELECT disponivel FROM offers WHERE id = ANY($1::uuid[])`, [[daFonte, doOutro.oferta]])).rows.every((r) => r.disponivel === true)).toBe(true);
      const m = await manual(op);
      expect((await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${m.oferta}`, {})).statusCode).toBe(401);
      expect((await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${m.oferta}`, (await t.pessoa()).auth)).statusCode).toBe(401);
    });
  });

  describe('produtos', () => {
    it('acha por nome, marca e GTIN, sem acento nem caixa, só do tenant e só o que o app oferece', async () => {
      const op = await t.operador();
      const shampoo = await t.produto({ nome: 'Shampoo Hidratação Profunda 400 ml', marca: 'Elseve', marcaChave: 'elseve', categoria: 'mamae', gtin: '7891234567895' });
      await t.produto({ nome: 'Shampoo Hidratação do Outro', t: e.outroTenantId });
      await t.produto({ nome: 'Shampoo Remédio', categoria: 'medicamento', marcaChave: 'rem', marca: 'Rem' });
      for (const q of ['hidratacao profunda', 'ELSEVE', 'sham', '7891234567895']) {
        const r = await t.chamar('GET', `/v1/admin/produtos?q=${encodeURIComponent(q)}`, op.auth);
        expect(r.statusCode, q).toBe(200);
        expect(ids(r), q).toContain(shampoo);
      }
      const r = await t.chamar('GET', '/v1/admin/produtos?q=shampoo', op.auth);
      expect(r.json().itens.map((i: { nome: string }) => i.nome)).not.toContain('Shampoo Hidratação do Outro');
      expect(r.json().itens.map((i: { nome: string }) => i.nome)).not.toContain('Shampoo Remédio');
      expect(r.json().itens.find((i: { id: string }) => i.id === shampoo)).toEqual({
        id: shampoo, nome: 'Shampoo Hidratação Profunda 400 ml', marca: { chave: 'elseve', nome: 'Elseve' }, categoria: 'mamae', subcategoria: null, gtin: '7891234567895', embalagem: { quantidade: 60, unidade: 'un' }, imagem_url: null,
      });
      expect(ids(await t.chamar('GET', '/v1/admin/produtos?q=7891234567895', op.auth))).toEqual([shampoo]);
    });

    it('acha produto sem marca (a Lomadee não manda marca: a coluna vem nula)', async () => {
      const op = await t.operador();
      const semMarca = await t.produto({ nome: 'Body Bebê Sem Marca', marca: null, marcaChave: null });
      expect(ids(await t.chamar('GET', '/v1/admin/produtos?q=body%20bebe', op.auth))).toContain(semMarca);
    });

    it('não vira padrão com curingas, pagina por deslocamento e valida', async () => {
      const op = await t.operador();
      const a = await t.produto({ nome: 'Item 100% algodão' });
      await t.produto({ nome: 'Item sintético' });
      expect(ids(await t.chamar('GET', `/v1/admin/produtos?q=${encodeURIComponent('100%')}`, op.auth))).toEqual([a]);
      expect(ids(await t.chamar('GET', `/v1/admin/produtos?q=${encodeURIComponent('%%')}`, op.auth))).toEqual([]);
      for (let i = 0; i < 5; i += 1) await t.produto({ nome: `Paginado ${i}` });
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 10; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/produtos?q=paginado&limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos).toHaveLength(5);
      expect(new Set(vistos).size).toBe(5);
      for (const q of ['', '?q=a', `?q=${'x'.repeat(101)}`, '?q=ok&limite=0', '?q=ok&cursor=zzz']) expect((await t.chamar('GET', `/v1/admin/produtos${q}`, op.auth)).statusCode, q).toBe(422);
      expect((await t.chamar('GET', '/v1/admin/produtos?q=ok', {})).statusCode).toBe(401);
    });
  });

  describe('auditoria', () => {
    it('lista as ações do tenant, mais recentes primeiro, com quem fez; filtra por operador, ação e período; pagina', async () => {
      const a = await t.operador({ nome: 'Ana' });
      const b = await t.operador({ nome: 'Beto' });
      const alvo = randomUUID();
      for (const [op, acao, atras] of [[a, 'alerta_revisado', 50], [b, 'loja_status_definido', 40], [a, 'fonte_status_definido', 30], [b, 'alerta_revisado', 20]] as const) {
        await registrarAuditoria(e.pool, { tenantId: e.tenantId, operadorId: op.operadorId, acao, alvoTipo: 'alerta', alvoId: alvo, em: minutos(atras), detalhe: { x: atras } });
      }
      const outro = await t.operador({ t: e.outroTenantId });
      await registrarAuditoria(e.pool, { tenantId: e.outroTenantId, operadorId: outro.operadorId, acao: 'alerta_revisado', alvoTipo: 'alerta', alvoId: randomUUID(), em: minutos(1) });
      const lista = async (q: string) => (await t.chamar('GET', `/v1/admin/auditoria${q}`, a.auth)).json();
      const tudo = await lista('');
      const meus = tudo.itens.filter((i: { alvo_id: string }) => i.alvo_id === alvo);
      expect(meus.map((i: { detalhe: { x: number } }) => i.detalhe.x)).toEqual([20, 30, 40, 50]);
      expect(meus[0]).toEqual({ id: expect.any(String), em: minutos(20).toISOString(), operador: { id: b.operadorId, nome: 'Beto' }, acao: 'alerta_revisado', alvo_tipo: 'alerta', alvo_id: alvo, detalhe: { x: 20 } });
      expect(tudo.itens.map((i: { operador: { id: string } }) => i.operador.id)).not.toContain(outro.operadorId);
      const soAna = await lista(`?operador_id=${a.operadorId}`);
      expect(soAna.itens.every((i: { operador: { id: string } }) => i.operador.id === a.operadorId)).toBe(true);
      expect(soAna.itens.filter((i: { alvo_id: string }) => i.alvo_id === alvo)).toHaveLength(2);
      const revisoes = await lista('?acao=alerta_revisado');
      expect(revisoes.itens.every((i: { acao: string }) => i.acao === 'alerta_revisado')).toBe(true);
      const periodo = await lista(`?desde=${encodeURIComponent(minutos(40).toISOString())}&ate=${encodeURIComponent(minutos(30).toISOString())}`);
      expect(periodo.itens.filter((i: { alvo_id: string }) => i.alvo_id === alvo).map((i: { detalhe: { x: number } }) => i.detalhe.x)).toEqual([30, 40]);
      // Paginação sem repetir.
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/auditoria?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, a.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos).toHaveLength(tudo.itens.length);
      expect(new Set(vistos).size).toBe(vistos.length);
    });

    it('valida os filtros e exige operador', async () => {
      const a = await t.operador();
      for (const q of ['?acao=x', '?operador_id=abc', '?desde=ontem', '?ate=2026-10-27', '?limite=0', '?cursor=zzz']) expect((await t.chamar('GET', `/v1/admin/auditoria${q}`, a.auth)).statusCode, q).toBe(422);
      expect((await t.chamar('GET', '/v1/admin/auditoria', {})).statusCode).toBe(401);
      expect((await t.chamar('GET', '/v1/admin/auditoria', (await t.pessoa()).auth)).statusCode).toBe(401);
    });
  });
});
