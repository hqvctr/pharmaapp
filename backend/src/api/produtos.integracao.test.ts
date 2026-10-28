// Pesquisa, página e histórico de produto contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, DROGASMIL, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('produtos (Postgres)', () => {
  const t = ambienteDeTeste('teste_produtos');
  const { e } = t;
  const nomes = (r: { json(): { itens: Array<{ nome: string }> } }) => r.json().itens.map((i) => i.nome);
  const buscar = (auth: Record<string, string>, q: string) => t.chamar('GET', `/v1/produtos?q=${encodeURIComponent(q)}`, auth);

  /** Produto com uma oferta ativa e coberta, pronto para aparecer na pesquisa. */
  async function comOferta(o: Parameters<typeof t.produto>[0] & { preco?: number } = {}) {
    const { loja, fonte } = await t.loja();
    const produto = await t.produto(o);
    const oferta = await t.oferta({ produto, loja, fonte, preco: o.preco });
    return { produto, loja, fonte, oferta };
  }

  describe('GET /v1/produtos (pesquisa)', () => {
    it('acha por palavras do nome ou da marca, sem acento nem caixa, e por GTIN; devolve o menor preço e se é seguido', async () => {
      const p = await t.pessoa();
      const { produto } = await comOferta({ nome: 'Shampoo Hidratação Profunda 400 ml', marca: 'Elseve', marcaChave: 'elseve', categoria: 'cuidados_pessoais', preco: 2490, gtin: '7891234567895' });
      const { loja, fonte } = await t.loja({ nome: 'PromoFarma' });
      await t.oferta({ produto, loja, fonte, preco: 1990 }); // outra loja, mais barata
      await t.pessoa(); // ruído
      await comOferta({ nome: 'Outro Shampoo', marca: 'Outra', marcaChave: 'outra', categoria: 'cuidados_pessoais', gtin: '7890000000001' });
      for (const q of ['hidratacao', 'HIDRATAÇÃO profunda', 'elseve shampoo', 'sham']) expect(nomes(await buscar(p.auth, q)), q).toContain('Shampoo Hidratação Profunda 400 ml');
      const porGtin = await buscar(p.auth, '7891234567895');
      expect(nomes(porGtin)).toEqual(['Shampoo Hidratação Profunda 400 ml']);
      expect(porGtin.json().itens[0]).toMatchObject({ id: produto, menor_preco_centavos: 1990, seguido: false, marca: { chave: 'elseve', nome: 'Elseve' }, embalagem: { quantidade: 60, unidade: 'un' } });
      await t.chamar('PUT', `/v1/seguidos/${produto}`, p.auth, { avisos: { promocao_excepcional: true, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false } });
      expect((await buscar(p.auth, '7891234567895')).json().itens[0].seguido).toBe(true);
      expect(nomes(await buscar(p.auth, 'xyzinexistente'))).toEqual([]);
    });

    it('ordena por relevância: nome que começa com o texto, depois palavra no meio, depois o resto', async () => {
      const p = await t.pessoa();
      await comOferta({ nome: 'Kit Sabonete Granado', marca: 'Granado', marcaChave: 'granado', categoria: 'cuidados_pessoais' });
      await comOferta({ nome: 'Sabonete Líquido Dove', marca: 'Dove', marcaChave: 'dove', categoria: 'cuidados_pessoais' });
      await comOferta({ nome: 'Refil de Sabonete', marca: 'Lux', marcaChave: 'lux', categoria: 'cuidados_pessoais' });
      const r = await buscar(p.auth, 'sabonete');
      expect(nomes(r).filter((n) => /abonete/.test(n))).toEqual(['Sabonete Líquido Dove', 'Kit Sabonete Granado', 'Refil de Sabonete'].sort((a, b) => ranque(a) - ranque(b) || a.localeCompare(b)));
      function ranque(n: string) { return n.toLowerCase().startsWith('sabonete') ? 1 : n.toLowerCase().includes(' sabonete') ? 2 : 3; }
    });

    it('esconde produto sem oferta, medicamento, com advertência legal, de marca silenciada, de outro tenant e (com a categoria) de fora do filtro', async () => {
      const p = await t.pessoa();
      const base = 'Zeta';
      const ok = await comOferta({ nome: `${base} Normal`, marca: 'Zeta', marcaChave: 'zeta' });
      await t.produto({ nome: `${base} Sem Oferta` });
      await comOferta({ nome: `${base} Remédio`, categoria: 'medicamentos_isentos' });
      await comOferta({ nome: `${base} Cereal`, advertencias: ['nbcal_apos_6_meses'] });
      await comOferta({ nome: `${base} Silenciada`, marca: 'Muda', marcaChave: 'muda' });
      const { loja: lo, fonte: fo } = await t.loja({ t: e.outroTenantId });
      await t.oferta({ t: e.outroTenantId, produto: await t.produto({ t: e.outroTenantId, nome: `${base} Alheio` }), loja: lo, fonte: fo });
      await comOferta({ nome: `${base} Limpeza`, categoria: 'limpeza', marca: 'Ype', marcaChave: 'ype' });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES ($1,$2,'marca','muda','tudo')`, [e.tenantId, p.userId]);
      expect(nomes(await buscar(p.auth, base)).sort()).toEqual([`${base} Limpeza`, `${base} Normal`].sort());
      expect(nomes(await t.chamar('GET', `/v1/produtos?q=${base}&categoria=limpeza`, p.auth))).toEqual([`${base} Limpeza`]);
      expect(ok).toBeDefined();
    });

    it('loja silenciada com "tudo" tira o produto da pesquisa quando era a única; sem cobertura o preço sai null mas o produto aparece', async () => {
      const p = await t.pessoa();
      const unica = await comOferta({ nome: 'Wax Loja Única', marca: 'Wax', marcaChave: 'wax' });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'tudo')`, [e.tenantId, p.userId, unica.loja]);
      expect(nomes(await buscar(p.auth, 'Wax Loja'))).toEqual([]);
      const { loja, fonte } = await t.loja({ faixa: ['01000000', '09999999', 2] });
      const longe = await t.produto({ nome: 'Wax Longe', marca: 'Wax', marcaChave: 'wax' });
      await t.oferta({ produto: longe, loja, fonte });
      const r = await buscar(p.auth, 'Wax Longe'); // o CEP da pessoa (14...) está fora da faixa da loja
      expect(r.json().itens[0]).toMatchObject({ id: longe, menor_preco_centavos: null });
    });

    it('páginas por cursor sem repetir; limite; texto com curingas não vira padrão; validação; 30 por minuto; termos pendentes', async () => {
      const p = await t.pessoa();
      for (let i = 0; i < 5; i++) await comOferta({ nome: `Pag ${i} Fralda`, marca: 'Pag', marcaChave: 'pag' });
      const vistos: string[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const r = await t.chamar('GET', `/v1/produtos?q=Fralda%20Pag&limite=2${cursor ? `&cursor=${cursor}` : ''}`, p.auth);
        expect(r.statusCode).toBe(200);
        vistos.push(...nomes(r));
        cursor = r.json().proximo_cursor;
        paginas += 1;
      } while (cursor !== null && paginas < 10);
      expect(vistos).toHaveLength(5);
      expect(new Set(vistos).size).toBe(5);
      expect(paginas).toBe(3);

      expect(nomes(await buscar(p.auth, '%%'))).toEqual([]);
      expect(nomes(await buscar(p.auth, '__'))).toEqual([]);
      for (const q of ['', 'a', 'x'.repeat(101)]) expect((await buscar(p.auth, q)).json().campos[0].campo, q).toBe('q');
      expect((await t.chamar('GET', '/v1/produtos', p.auth)).statusCode).toBe(422);
      expect((await t.chamar('GET', '/v1/produtos?q=ab&categoria=Ruim!', p.auth)).statusCode).toBe(422);
      expect((await t.chamar('GET', '/v1/produtos?q=ab&cursor=lixo', p.auth)).statusCode).toBe(422);
      expect((await t.chamar('GET', '/v1/produtos?q=ab&limite=51', p.auth)).statusCode).toBe(422);

      const outro = await t.pessoa();
      for (let i = 0; i < 30; i++) expect((await buscar(outro.auth, 'fralda')).statusCode).toBe(200);
      const barrada = await buscar(outro.auth, 'fralda');
      expect(barrada.statusCode).toBe(429);
      expect(barrada.headers['retry-after']).toBeDefined();
      expect((await buscar((await t.pessoa({ termos: false })).auth, 'fralda')).json().codigo).toBe('termos_pendentes');
      expect((await t.chamar('GET', '/v1/produtos?q=ab', {})).statusCode).toBe(401);
    });
  });

  describe('GET /v1/produtos/{id} (página)', () => {
    it('mostra as ofertas atuais, menor preço primeiro, com link rastreado, frete, cobertura e o alerta ativo', async () => {
      const p = await t.pessoa();
      const produto = await t.produto({ nome: 'Fralda Huggies M', marca: 'Huggies', marcaChave: 'huggies' });
      const a = await t.loja({ nome: 'Cara' });
      const b = await t.loja({ nome: 'Barata' });
      const cara = await t.oferta({ produto, loja: a.loja, fonte: a.fonte, preco: 8990, frete: ['conhecido', 1290] });
      const barata = await t.oferta({ produto, loja: b.loja, fonte: b.fonte, preco: 5990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 } });
      const alerta = await t.alerta({ oferta: barata, loja: b.loja, preco: 5990 });
      await t.historico(produto, b.loja, '2026-10-20T15:00:00Z', 99.8);
      const r = await t.chamar('GET', `/v1/produtos/${produto}`, p.auth);
      expect(r.statusCode).toBe(200);
      const d = r.json();
      expect(d).toMatchObject({ id: produto, nome: 'Fralda Huggies M', historico_desde: '2026-10-20', seguimento: null });
      expect(d.ofertas.map((o: { loja: { nome: string } }) => o.loja.nome)).toEqual(['Barata (online)', 'Cara (online)']);
      expect(d.ofertas[0]).toMatchObject({
        preco_centavos: 5990, rotulo_condicao: 'Leve 3, pague 2', link: `https://lmdee.link/${barata.slice(0, 8)}`, link_afiliado: true, alerta_id: alerta,
        frete: { status: 'a_confirmar', centavos: null }, cobertura: { modo: 'entrega_por_cep', cep: '14020260', prazo_dias: 3 },
      });
      expect(d.ofertas[1]).toMatchObject({ preco_centavos: 8990, frete: { status: 'conhecido', centavos: 1290 }, alerta_id: null, rotulo_condicao: null });
      expect(cara).toBeDefined();
    });

    it('só lista oferta ativa, coberta, na validade, recente e de loja não silenciada; link que falha tira só aquela oferta', async () => {
      const p = await t.pessoa();
      const produto = await t.produto();
      const ok = await t.loja({ nome: 'Boa' });
      const okOferta = await t.oferta({ produto, loja: ok.loja, fonte: ok.fonte, preco: 5000 });
      const ruins: Array<Parameters<typeof t.oferta>[0]> = [];
      for (const extra of [{ disponivel: false }, { validaAte: new Date('2026-11-01T11:00:00Z') }, { escondida: true }, { coletadaEm: new Date('2026-11-01T05:00:00Z') }]) {
        const l = await t.loja();
        ruins.push({ produto, loja: l.loja, fonte: l.fonte, ...extra });
      }
      for (const r of ruins) await t.oferta(r);
      const longe = await t.loja({ faixa: ['01000000', '09999999', 2] });
      await t.oferta({ produto, loja: longe.loja, fonte: longe.fonte });
      const muda = await t.loja({ nome: 'Muda' });
      await t.oferta({ produto, loja: muda.loja, fonte: muda.fonte });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'tudo')`, [e.tenantId, p.userId, muda.loja]);
      const falha = await t.loja({ nome: 'Falha' });
      const falhaOferta = await t.oferta({ produto, loja: falha.loja, fonte: falha.fonte, preco: 6000 });
      e.linkFalhaPara.add(falhaOferta);
      const d = (await t.chamar('GET', `/v1/produtos/${produto}`, p.auth)).json();
      expect(d.ofertas.map((o: { loja: { nome: string } }) => o.loja.nome)).toEqual(['Boa (online)']);
      expect(okOferta).toBeDefined();
    });

    it('mostra os avisos da pessoa quando ela segue o produto', async () => {
      const p = await t.pessoa();
      const { produto } = await comOferta();
      const avisos = { promocao_excepcional: true, queda_percentual: 25, voltou_estoque: true, menor_preco_180d: false, promocao_acabando: true };
      await t.chamar('PUT', `/v1/seguidos/${produto}`, p.auth, { avisos });
      expect((await t.chamar('GET', `/v1/produtos/${produto}`, p.auth)).json().seguimento).toEqual(avisos);
    });

    it('404 para produto inexistente, de outro tenant, medicamento, com advertência legal e de marca silenciada; 403 com termos pendentes', async () => {
      const p = await t.pessoa();
      const remedio = await t.produto({ categoria: 'medicamentos_isentos' });
      const cereal = await t.produto({ advertencias: ['nbcal_apos_6_meses'] });
      const alheio = await t.produto({ t: e.outroTenantId });
      const muda = await t.produto({ marca: 'Muda', marcaChave: 'muda2' });
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES ($1,$2,'marca','muda2','tudo')`, [e.tenantId, p.userId]);
      for (const id of [randomUUID(), 'nao-e-uuid', remedio, cereal, alheio, muda]) {
        const r = await t.chamar('GET', `/v1/produtos/${id}`, p.auth);
        expect(r.statusCode, id).toBe(404);
        expect(r.json().codigo).toBe('nao_encontrado');
      }
      const produto = await t.produto();
      expect((await t.chamar('GET', `/v1/produtos/${produto}`, (await t.pessoa({ termos: false })).auth)).json().codigo).toBe('termos_pendentes');
    });
  });

  describe('GET /v1/produtos/{id}/historico', () => {
    it('um ponto por dia fechado: menor preço por unidade da família, convertido para a embalagem deste produto', async () => {
      const p = await t.pessoa();
      const { loja } = await t.loja({ nome: 'Hist' });
      const familia = `fam-${randomUUID()}`;
      const g = await t.produto({ familia, quantidade: 60, nome: 'Fralda G 60' });
      const gg = await t.produto({ familia, quantidade: 120, nome: 'Fralda G 120' });
      // 30/10: duas leituras de embalagens diferentes (vale o menor por unidade); 31/10: uma; hoje (01/11): não entra.
      await t.historico(g, loja, '2026-10-30T15:00:00Z', 100);
      await t.historico(gg, loja, '2026-10-30T18:00:00Z', 90);
      await t.historico(g, loja, '2026-10-31T15:00:00Z', 95);
      await t.historico(g, loja, '2026-11-01T10:00:00Z', 50);
      const r = await t.chamar('GET', `/v1/produtos/${g}/historico`, p.auth);
      expect(r.statusCode).toBe(200);
      const d = r.json();
      expect(d).toMatchObject({ produto_id: g, dias: 180 });
      expect(d.series).toHaveLength(1);
      expect(d.series[0].loja).toMatchObject({ nome: 'Hist (online)' });
      expect(d.series[0].desde).toBe('2026-10-30');
      expect(d.series[0].pontos).toEqual([
        { dia: '2026-10-30', preco_por_unidade_centavos: 90, preco_embalagem_centavos: 5400 }, // 90 × 60
        { dia: '2026-10-31', preco_por_unidade_centavos: 95, preco_embalagem_centavos: 5700 },
      ]);
      // Para a embalagem de 120 o mesmo ponto vale o dobro.
      expect((await t.chamar('GET', `/v1/produtos/${gg}/historico`, p.auth)).json().series[0].pontos[0].preco_embalagem_centavos).toBe(10800);
    });

    it('janela em dias, filtro por loja, uma série por loja e loja silenciada fora', async () => {
      const p = await t.pessoa();
      const familia = `fam-${randomUUID()}`;
      const prod = await t.produto({ familia });
      const a = await t.loja({ nome: 'A' });
      const b = await t.loja({ nome: 'B' });
      const mudo = await t.loja({ nome: 'Mudo' });
      for (const l of [a, b, mudo]) await t.oferta({ produto: prod, loja: l.loja, fonte: l.fonte });
      for (const l of [a, b, mudo]) {
        await t.historico(prod, l.loja, '2026-10-01T15:00:00Z', 120); // 31 dias atrás
        await t.historico(prod, l.loja, '2026-10-24T15:00:00Z', 110); // 8 dias atrás: passa do corte do SQL, mas está fora de 7 dias
        await t.historico(prod, l.loja, '2026-10-29T15:00:00Z', 100);
      }
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'tudo')`, [e.tenantId, p.userId, mudo.loja]);
      const todas = (await t.chamar('GET', `/v1/produtos/${prod}/historico`, p.auth)).json();
      expect(todas.series.map((s: { loja: { nome: string } }) => s.loja.nome).sort()).toEqual(['A (online)', 'B (online)']);
      expect(todas.series[0].pontos.map((x: { dia: string }) => x.dia)).toEqual(['2026-10-01', '2026-10-24', '2026-10-29']);
      const curta = (await t.chamar('GET', `/v1/produtos/${prod}/historico?dias=7`, p.auth)).json();
      expect(curta.dias).toBe(7);
      expect(curta.series[0].pontos.map((x: { dia: string }) => x.dia)).toEqual(['2026-10-29']);
      expect(curta.series[0].desde).toBe('2026-10-01'); // `desde` é o primeiro dia coletado, não o da janela
      const so = (await t.chamar('GET', `/v1/produtos/${prod}/historico?loja_id=${a.loja}`, p.auth)).json();
      expect(so.series).toHaveLength(1);
      expect(so.series[0].loja.id).toBe(a.loja);
    });

    it('loja só de marca fora da lista da fonte (trava do Lomadee) não entra no histórico', async () => {
      const p = await t.pessoa();
      const familia = `fam-${randomUUID()}`;
      const prod = await t.produto({ familia });
      const fonte = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,'lomadee','A',120,'SP','alta','teste',true) RETURNING id`, [e.tenantId])).rows[0].id as string;
      const lojas: Record<string, string> = {};
      for (const [nome, idExterno] of [['Liberada', DROGASMIL], ['Barrada', 'marca-fora-da-lista']] as const) {
        const loja = (await e.pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1,$2,$2,'online') RETURNING id`, [e.tenantId, nome])).rows[0].id as string;
        await e.pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [e.tenantId, fonte, idExterno, loja]);
        await t.historico(prod, loja, '2026-10-29T15:00:00Z', 100);
        lojas[nome] = loja;
      }
      const r = (await t.chamar('GET', `/v1/produtos/${prod}/historico`, p.auth)).json();
      expect(r.series.map((s: { loja: { id: string } }) => s.loja.id)).toEqual([lojas.Liberada]);
    });

    it('validação e 404', async () => {
      const p = await t.pessoa();
      const { produto } = await comOferta();
      for (const q of ['?dias=0', '?dias=181', '?dias=abc', '?loja_id=nao-uuid']) expect((await t.chamar('GET', `/v1/produtos/${produto}/historico${q}`, p.auth)).statusCode, q).toBe(422);
      expect((await t.chamar('GET', `/v1/produtos/${randomUUID()}/historico`, p.auth)).statusCode).toBe(404);
      expect((await t.chamar('GET', `/v1/produtos/${produto}/historico`, (await t.pessoa({ termos: false })).auth)).json().codigo).toBe('termos_pendentes');
      expect((await t.chamar('GET', `/v1/produtos/${produto}/historico`, p.auth)).json().series).toEqual([]);
    });
  });
});
