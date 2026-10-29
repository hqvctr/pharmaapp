// Painel do operador, versão final (admin.yaml 1.1.0): resumo, loja própria, operadores e financeiro, contra um Postgres de verdade.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('admin: gestão e financeiro (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_gestao');
  const { e } = t;
  const area = (cep_inicio = '01000000', cep_fim = '09999999', prazo_dias = 2) => ({ cep_inicio, cep_fim, prazo_dias });
  const auditoria = async (acao: string) => (await e.pool.query(`SELECT alvo_id, detalhe, operador_id FROM auditoria WHERE tenant_id = $1 AND acao = $2 ORDER BY em`, [e.tenantId, acao])).rows;

  describe('loja própria', () => {
    it('cadastra loja com área de entrega sob a fonte manual; aparece na lista como própria e aceita oferta manual', async () => {
      const op = await t.operador();
      const r = await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: 'Mercado do Bairro', cnpj: '12.345.678/0001-90', status: 'em_observacao', reputacao: 0.6, areas_entrega: [area(), area('14000000', '14999999', 1)] });
      expect(r.statusCode).toBe(201);
      const l = r.json();
      expect(l).toMatchObject({ nome: 'Mercado do Bairro', rede: 'Mercado do Bairro', cnpj: '12345678000190', tipo: 'online', status: 'em_observacao', reputacao: 0.6, propria: true, fontes: ['manual'], aceita_oferta_manual: true, ofertas_disponiveis: 0 });
      expect(l.areas_entrega).toEqual([area(), area('14000000', '14999999', 1)]);
      const lista = (await t.chamar('GET', '/v1/admin/lojas', op.auth)).json().itens;
      expect(lista.find((x: { id: string }) => x.id === l.id)).toMatchObject({ propria: true, areas_entrega_total: 2 });
      const [aud] = await auditoria('loja_criada');
      expect(aud).toMatchObject({ alvo_id: l.id, operador_id: op.operadorId, detalhe: { nome: 'Mercado do Bairro', areas_entrega: 2 } });
      // A oferta manual nessa loja passa (a loja não é de marca da Lomadee).
      const o = await t.chamar('POST', '/v1/admin/ofertas-manuais', op.auth, {
        produto_novo: { nome: 'Fralda Bairro G 30 un', marca: 'Bairro', categoria: 'bebe', embalagem: { quantidade: 30, unidade: 'un' }, imagem_url: 'https://cdn.loja.test/fralda.jpg' },
        loja_id: l.id, preco_centavos: 3990, condicao: null, frete: { status: 'a_confirmar', centavos: null }, valida_de: null, link: 'https://mercado.test/fralda', link_afiliado: false,
      }, { 'idempotency-key': randomUUID() });
      expect(o.statusCode).toBe(201);
      expect(o.json().produto.imagem_url).toBe('https://cdn.loja.test/fralda.jpg');
      expect((await t.chamar('GET', `/v1/admin/lojas/${l.id}`, op.auth)).json().ofertas_disponiveis).toBe(1);
    });

    it('recusa campos errados todos de uma vez, nome repetido e loja nova bloqueada', async () => {
      const op = await t.operador();
      const r = await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: '', cnpj: '123', status: 'bloqueada', reputacao: 2, areas_entrega: [{ cep_inicio: '0100', cep_fim: '09999999', prazo_dias: -1 }, area('09000000', '01000000')] });
      expect(r.statusCode).toBe(422);
      expect(r.json().campos.map((c: { campo: string }) => c.campo).sort()).toEqual(['areas_entrega[0].cep_inicio', 'areas_entrega[0].prazo_dias', 'areas_entrega[1].cep_fim', 'cnpj', 'nome', 'reputacao', 'status']);
      expect((await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: 'Sem Área', areas_entrega: [] })).json().campos[0].campo).toBe('areas_entrega');
      await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: 'Única', areas_entrega: [area()] });
      const dup = await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: 'ÚNICA', areas_entrega: [area()] });
      expect(dup.json().campos).toEqual([{ campo: 'nome', mensagem: 'Já existe uma loja com este nome.' }]);
    });

    it('edita dados e área de entrega de qualquer loja, com antes e depois na auditoria; repetir não audita de novo; outro tenant é 404', async () => {
      const op = await t.operador();
      const { loja } = await t.loja({ nome: 'Da Coleta' });
      const p = await t.chamar('PATCH', `/v1/admin/lojas/${loja}`, op.auth, { nome: 'Da Coleta (corrigida)', reputacao: 0.8, observacao: 'nome errado' });
      expect(p.statusCode).toBe(200);
      expect(p.json()).toMatchObject({ nome: 'Da Coleta (corrigida)', reputacao: 0.8, propria: false });
      const ed = (await auditoria('loja_editada')).filter((a) => a.alvo_id === loja);
      expect(ed).toHaveLength(1);
      expect(ed[0].detalhe).toEqual({ nome: { de: 'Da Coleta (online)', para: 'Da Coleta (corrigida)' }, reputacao: { de: 0, para: 0.8 }, observacao: 'nome errado' });
      await t.chamar('PATCH', `/v1/admin/lojas/${loja}`, op.auth, { nome: 'Da Coleta (corrigida)' });
      expect((await auditoria('loja_editada')).filter((a) => a.alvo_id === loja)).toHaveLength(1);
      expect((await t.chamar('PATCH', `/v1/admin/lojas/${loja}`, op.auth, {})).statusCode).toBe(422);

      const a = await t.chamar('PUT', `/v1/admin/lojas/${loja}/areas`, op.auth, { areas_entrega: [area('14000000', '14099999', 5)] });
      expect(a.json().areas_entrega).toEqual([area('14000000', '14099999', 5)]);
      await t.chamar('PUT', `/v1/admin/lojas/${loja}/areas`, op.auth, { areas_entrega: [area('14000000', '14099999', 5)] });
      const ar = (await auditoria('loja_areas_definidas')).filter((x) => x.alvo_id === loja);
      expect(ar).toHaveLength(1);
      expect(ar[0].detalhe.areas_entrega).toEqual({ de: ['01000000-19999999:3'], para: ['14000000-14099999:5'] });

      const fora = await t.loja({ t: e.outroTenantId, nome: 'Outra' });
      expect((await t.chamar('GET', `/v1/admin/lojas/${fora.loja}`, op.auth)).statusCode).toBe(404);
      expect((await t.chamar('PATCH', `/v1/admin/lojas/${fora.loja}`, op.auth, { nome: 'x' })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/lojas/${fora.loja}/areas`, op.auth, { areas_entrega: [] })).statusCode).toBe(404);
    });

    it('loja da Lomadee não aceita oferta manual (detalhe avisa)', async () => {
      const op = await t.operador();
      const lomadee = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,'lomadee','A',120,'BR','alta','x',true) ON CONFLICT (tenant_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [e.tenantId])).rows[0].id;
      const loja = (await e.pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1,'Marca','Marca (online)','online') RETURNING id`, [e.tenantId])).rows[0].id;
      await e.pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [e.tenantId, lomadee, randomUUID(), loja]);
      expect((await t.chamar('GET', `/v1/admin/lojas/${loja}`, op.auth)).json()).toMatchObject({ fontes: ['lomadee'], propria: false, aceita_oferta_manual: false });
    });

    it('foto do produto novo só https', async () => {
      const op = await t.operador();
      const loja = (await t.chamar('POST', '/v1/admin/lojas', op.auth, { nome: 'Loja Foto', areas_entrega: [area()] })).json().id;
      const r = await t.chamar('POST', '/v1/admin/ofertas-manuais', op.auth, {
        produto_novo: { nome: 'Lenço X 50 un', marca: null, categoria: 'bebe', embalagem: { quantidade: 50, unidade: 'un' }, imagem_url: 'http://inseguro.test/a.jpg' },
        loja_id: loja, preco_centavos: 990, condicao: null, frete: { status: 'a_confirmar', centavos: null }, valida_de: null, link: 'https://x.test/a', link_afiliado: false,
      }, { 'idempotency-key': randomUUID() });
      expect(r.statusCode).toBe(422);
      expect(r.json().campos.map((c: { campo: string }) => c.campo)).toEqual(['produto_novo.imagem_url']);
    });
  });

  describe('resumo e operadores', () => {
    it('resumo conta as pendências, as lojas sem área e as ofertas manuais; usa o último ciclo quando há', async () => {
      const op = await t.operador();
      const { loja, fonte } = await t.loja({ nome: 'Resumo' });
      await t.loja({ nome: 'Sem Área', faixa: null });
      const produto = await t.produto();
      const oferta = await t.oferta({ produto, loja, fonte });
      await t.alerta({ oferta, loja, decisao: 'aguardar_aprovacao', revisao: 'pendente' });
      const r = await t.chamar('GET', '/v1/admin/resumo', op.auth);
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.pendencias.alertas).toBeGreaterThanOrEqual(1);
      expect(j.lojas.sem_area_entrega).toBeGreaterThanOrEqual(1);
      expect(j.coleta).toMatchObject({ dias_para_alertas: 14, ultimo_ciclo: null });
      expect(typeof j.coleta.dias_historico).toBe('number');
      expect(j.coleta.ultima_coleta_em).not.toBeNull();
      expect(Object.keys(j).sort()).toEqual(['alertas_7_dias', 'catalogo', 'coleta', 'fontes', 'gerado_em', 'lojas', 'ofertas_manuais_ativas', 'pendencias']);
      expect((await t.chamar('GET', '/v1/admin/resumo', {})).statusCode).toBe(401);
    });

    it('lista os operadores do tenant com último acesso e quem é você; não lista de outro tenant', async () => {
      const eu = await t.operador({ nome: 'Ana Gestora' });
      await t.operador({ nome: 'Bruno Inativo', ativo: false });
      await t.operador({ t: e.outroTenantId, nome: 'De Fora' });
      const r = await t.chamar('GET', '/v1/admin/operadores', eu.auth);
      expect(r.statusCode).toBe(200);
      const itens = r.json().itens;
      expect(itens.find((o: { nome: string }) => o.nome === 'Ana Gestora')).toMatchObject({ id: eu.operadorId, ativo: true, voce: true, ultimo_acesso_em: e.agora.toISOString() });
      expect(itens.find((o: { nome: string }) => o.nome === 'Bruno Inativo')).toMatchObject({ ativo: false, voce: false });
      expect(itens.some((o: { nome: string }) => o.nome === 'De Fora')).toBe(false);
      // Ativos primeiro.
      expect(itens.findIndex((o: { ativo: boolean }) => !o.ativo)).toBeGreaterThan(itens.findLastIndex((o: { ativo: boolean }) => o.ativo));
    });
  });

  describe('financeiro', () => {
    const lanc = (extra: Record<string, unknown> = {}) => ({ fonte: 'afiliado_lomadee', competencia: '2026-10-15', valor_centavos: 12345, status: 'confirmada', descricao: 'Comissão de outubro', referencia: null, ...extra });

    it('lança, lista com filtros e edita uma receita, com auditoria; referência repetida na mesma fonte é recusada', async () => {
      const op = await t.operador({ nome: 'Fin' });
      const r = await t.chamar('POST', '/v1/admin/receitas', op.auth, lanc({ referencia: 'TX-1' }));
      expect(r.statusCode).toBe(201);
      expect(r.json()).toMatchObject({ fonte: 'afiliado_lomadee', competencia: '2026-10-15', valor_centavos: 12345, status: 'confirmada', referencia: 'TX-1', criada_por: { id: op.operadorId, nome: 'Fin' }, atualizada_por: null });
      const id = r.json().id;
      expect((await t.chamar('POST', '/v1/admin/receitas', op.auth, lanc({ referencia: 'TX-1' }))).json().campos[0].campo).toBe('referencia');
      expect((await t.chamar('POST', '/v1/admin/receitas', op.auth, lanc({ referencia: 'TX-1', fonte: 'anuncios' }))).statusCode).toBe(201);
      const ruim = await t.chamar('POST', '/v1/admin/receitas', op.auth, { fonte: 'pix', competencia: '2026-02-30', valor_centavos: 0, status: 'paga' });
      expect(ruim.json().campos.map((c: { campo: string }) => c.campo).sort()).toEqual(['competencia', 'fonte', 'status', 'valor_centavos']);

      const lista = await t.chamar('GET', '/v1/admin/receitas?fonte=afiliado_lomadee&desde=2026-10-01&ate=2026-10-31', op.auth);
      expect(lista.json().itens.map((i: { id: string }) => i.id)).toEqual([id]);
      const ed = await t.chamar('PATCH', `/v1/admin/receitas/${id}`, op.auth, { status: 'recebida', valor_centavos: 12000 });
      expect(ed.json()).toMatchObject({ status: 'recebida', valor_centavos: 12000, atualizada_por: { id: op.operadorId } });
      const [aud] = (await auditoria('receita_editada')).filter((a) => a.alvo_id === id);
      expect(aud.detalhe).toEqual({ status: { de: 'confirmada', para: 'recebida' }, valor_centavos: { de: 12345, para: 12000 } });
      const outro = await t.operador({ t: e.outroTenantId });
      expect((await t.chamar('PATCH', `/v1/admin/receitas/${id}`, outro.auth, { status: 'cancelada' })).statusCode).toBe(404);
    });

    it('importa um relatório sem duplicar na segunda vez; linha errada recusa o lote inteiro com o número da linha', async () => {
      const op = await t.operador();
      const itens = [lanc({ referencia: 'IMP-1', competencia: '2026-09-02' }), lanc({ referencia: 'IMP-2', competencia: '2026-09-03', status: 'prevista' }), lanc({ referencia: null, fonte: 'outros', competencia: '2026-09-04' })];
      const r1 = await t.chamar('POST', '/v1/admin/receitas/importacao', op.auth, { itens });
      expect(r1.json()).toEqual({ total: 3, criadas: 3, repetidas: 0 });
      const r2 = await t.chamar('POST', '/v1/admin/receitas/importacao', op.auth, { itens: itens.slice(0, 2) });
      expect(r2.json()).toEqual({ total: 2, criadas: 0, repetidas: 2 });
      const ruim = await t.chamar('POST', '/v1/admin/receitas/importacao', op.auth, { itens: [lanc({ referencia: 'IMP-9' }), lanc({ valor_centavos: -1 }), lanc({ referencia: 'IMP-9' })] });
      expect(ruim.statusCode).toBe(422);
      expect(ruim.json().campos.map((c: { campo: string }) => c.campo)).toEqual(['itens[1].valor_centavos', 'itens[2].referencia']);
      expect((await e.pool.query(`SELECT count(*)::int AS n FROM receitas WHERE referencia = 'IMP-9'`)).rows[0].n).toBe(0);
      expect((await auditoria('receitas_importadas'))).toHaveLength(1);
    });

    it('resumo financeiro agrupa por mês e fonte (cancelada fora do total), conta cliques de afiliado por dia e calcula a receita por clique', async () => {
      const op = await t.operador();
      await e.pool.query(`DELETE FROM receitas`); // os testes de cima também lançam receita em outubro
      // INICIO = 2026-11-01T12:00Z: mês atual 2026-11.
      for (const [fonte, competencia, valor, status] of [
        ['afiliado_lomadee', '2026-11-01', 5000, 'prevista'], ['anuncios', '2026-11-01', 1000, 'recebida'], ['afiliado_lomadee', '2026-10-20', 4000, 'recebida'],
        ['assinatura_google_play', '2026-10-05', 990, 'recebida'], ['afiliado_lomadee', '2026-10-21', 7777, 'cancelada'], ['outros', '2025-01-01', 1, 'recebida'],
      ] as const) await t.chamar('POST', '/v1/admin/receitas', op.auth, { fonte, competencia, valor_centavos: valor, status });
      const pessoa = await t.pessoa();
      const { loja, fonte } = await t.loja({ nome: 'Cliques' });
      const oferta = await t.oferta({ produto: await t.produto(), loja, fonte });
      await e.pool.query(`UPDATE offers SET link_afiliado = true WHERE id = $1`, [oferta]);
      const alerta = await t.alerta({ oferta, loja });
      for (const quando of ['2026-11-01T10:00:00Z', '2026-11-01T11:00:00Z', '2026-10-25T15:00:00Z', '2026-09-01T15:00:00Z']) {
        await e.pool.query(`INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em) VALUES ($1,$2,$3,'clicado','feed',$4)`, [e.tenantId, pessoa.userId, alerta, quando]);
      }
      await e.pool.query(`INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em) VALUES ($1,$2,$3,'aberto','feed','2026-11-01T10:00:00Z')`, [e.tenantId, pessoa.userId, alerta]);

      const r = await t.chamar('GET', '/v1/admin/financeiro?meses=3', op.auth);
      expect(r.statusCode).toBe(200);
      const j = r.json();
      expect(j.periodo).toEqual({ de: '2026-09', ate: '2026-11' });
      expect(j.meses.map((m: { mes: string }) => m.mes)).toEqual(['2026-09', '2026-10', '2026-11']);
      const out = j.meses[1];
      expect(out.total_centavos).toBe(4990);
      expect(out.por_fonte).toMatchObject({ afiliado_lomadee: 4000, assinatura_google_play: 990 });
      expect(out.por_status).toMatchObject({ recebida: 4990, cancelada: 7777 });
      expect(j.mes_atual).toEqual({ mes: '2026-11', total_centavos: 6000, recebido_centavos: 1000, a_receber_centavos: 5000, variacao: 0.2024 });
      expect(j.totais.total_centavos).toBe(10990); // a de 2025 fica fora do período
      expect(j.cliques.dias).toHaveLength(30);
      expect(j.cliques.dias.at(-1)).toEqual({ dia: '2026-11-01', cliques: 2, cliques_afiliado: 2 });
      expect(j.cliques).toMatchObject({ total: 3, afiliado: 3 });
      // Receita de afiliado (não cancelada) dos últimos 30 dias / cliques de afiliado: (5000 + 4000) / 3.
      expect(j.receita_afiliado_por_clique_centavos).toBe(3000);
      expect(j.assinaturas).toEqual({ ativas: 0, por_plano: { premium_mensal: 0, premium_anual: 0 } });
      expect((await t.chamar('GET', '/v1/admin/financeiro?meses=99', op.auth)).statusCode).toBe(422);
      expect((await t.chamar('GET', '/v1/admin/financeiro?ate=2026-13', op.auth)).statusCode).toBe(422);
    });
  });
});
