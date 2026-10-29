// Alertas de demonstração (docs/operacao/testar-no-celular.md) contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from '../api/testeAmbiente.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { criarDemonstracao, removerDemonstracao } from './demo.js';

const executar = URL_BASE ? describe : describe.skip;

executar('alertas de demonstração (Postgres)', () => {
  const t = ambienteDeTeste('teste_demo');
  const { e } = t;
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);

  async function mundo() {
    const { loja, fonte } = await t.loja({ nome: 'Demo Farma' });
    const bebe = await t.produto({ nome: 'Fralda Demo', categoria: 'bebe' });
    const pessoal = await t.produto({ nome: 'Shampoo Demo', categoria: 'mamae', marca: 'X', marcaChave: 'x' });
    const remedio = await t.produto({ nome: 'Remédio Demo', categoria: 'medicamento', marca: 'R', marcaChave: 'r' });
    const nbcal = await t.produto({ nome: 'Papinha Demo', categoria: 'bebe', advertencias: ['nbcal_apos_6_meses'], marca: 'N', marcaChave: 'n' });
    const velha = await t.produto({ nome: 'Velha Demo', categoria: 'bebe', marca: 'V', marcaChave: 'v' });
    const o = {
      bebe: await t.oferta({ produto: bebe, loja, fonte, preco: 5990 }),
      pessoal: await t.oferta({ produto: pessoal, loja, fonte, preco: 2490 }),
      remedio: await t.oferta({ produto: remedio, loja, fonte }),
      nbcal: await t.oferta({ produto: nbcal, loja, fonte }),
      velha: await t.oferta({ produto: velha, loja, fonte, coletadaEm: new Date(e.agora.getTime() - 10 * 3600_000) }),
    };
    return { loja, fonte, produtos: { bebe, pessoal, remedio, nbcal, velha }, ofertas: o };
  }

  it('cria alertas só em oferta que o feed mostraria de verdade, aparecem no feed da pessoa marcados como demonstração, e removem sem deixar rastro', async () => {
    const config = await carregarConfigTenant('padrao');
    const w = await mundo();
    const p = await t.pessoa({ categorias: ['bebe', 'mamae'] });
    const antes = ids(await t.chamar('GET', '/v1/alertas', p.auth));
    const r = await criarDemonstracao(e.pool, e.tenantId, config, e.agora, 8);
    // Elegíveis: fralda e shampoo (remédio, advertência legal e oferta velha ficam de fora).
    expect(r.criados).toBe(2);
    const feed = (await t.chamar('GET', '/v1/alertas', p.auth)).json().itens as Array<Record<string, any>>;
    const demo = feed.filter((a) => !antes.includes(a.id));
    expect(demo.map((a) => a.produto.id).sort()).toEqual([w.produtos.bebe, w.produtos.pessoal].sort());
    for (const a of demo) {
      expect(a.rotulo_condicao).toBe('DEMONSTRAÇÃO');
      expect(a.situacao).toBe('ativa');
      expect(a.queda).toBeGreaterThan(0.15);
      expect(a.prova).toMatchObject({ dias_medidos: 3 });
    }
    expect(demo.filter((a) => a.destaque)).toHaveLength(2); // os dois primeiros são destaque
    // Repetir não duplica.
    expect((await criarDemonstracao(e.pool, e.tenantId, config, e.agora, 8)).criados).toBe(0);
    // Quem interagiu (evento, avaliação, denúncia) não impede a remoção.
    const alerta = demo[0]!.id as string;
    await t.chamar('POST', `/v1/alertas/${alerta}/eventos`, p.auth, { tipo: 'aberto', origem: 'feed' }, { 'idempotency-key': '6f1c6d1e-1b2a-4c3d-8e9f-0a1b2c3d4e5f' });
    await t.chamar('PUT', `/v1/alertas/${alerta}/avaliacao`, p.auth, { valor: 'util' });
    await t.chamar('PUT', `/v1/alertas/${alerta}/denuncia`, p.auth, { motivo: 'preco_errado' });
    await t.aviso({ userId: p.userId, produto: w.produtos.bebe, alerta });
    expect(await removerDemonstracao(e.pool, e.tenantId)).toBe(2);
    expect(ids(await t.chamar('GET', '/v1/alertas', p.auth))).toEqual(antes);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM alerts WHERE motivo LIKE 'DEMO:%'`)).rows[0].n).toBe(0);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM avisos WHERE alert_id IS NULL AND user_id = $1`, [p.userId])).rows[0].n).toBe(1); // o aviso fica, sem o alerta
    expect(await removerDemonstracao(e.pool, e.tenantId)).toBe(0);
  });

  it('respeita a quantidade, reparte entre categorias e não toca em alerta de verdade', async () => {
    const config = await carregarConfigTenant('padrao');
    const { loja, fonte } = await t.loja({ nome: 'Demo Farma 2' });
    for (let i = 0; i < 4; i += 1) await t.oferta({ produto: await t.produto({ nome: `Bebe ${i}`, categoria: 'bebe', marca: `b${i}`, marcaChave: `b${i}` }), loja, fonte });
    for (let i = 0; i < 4; i += 1) await t.oferta({ produto: await t.produto({ nome: `Pessoal ${i}`, categoria: 'mamae', marca: `p${i}`, marcaChave: `p${i}` }), loja, fonte });
    await e.pool.query(`UPDATE offers SET disponivel = false WHERE store_id <> $1`, [loja]); // só as deste teste
    // Loja sem área de entrega não aparece no feed de ninguém, então não ganha alerta de demonstração.
    const semArea = await t.loja({ nome: 'Sem area', faixa: null });
    const semAreaProduto = await t.produto({ nome: 'Sem area produto', marca: 'sa', marcaChave: 'sa' });
    await t.oferta({ produto: semAreaProduto, loja: semArea.loja, fonte: semArea.fonte });
    const oferta = await t.oferta({ produto: await t.produto({ nome: 'Real', marca: 'real', marcaChave: 'real' }), loja, fonte });
    const real = await t.alerta({ oferta, loja, decisao: 'notificar' });
    const r = await criarDemonstracao(e.pool, e.tenantId, config, e.agora, 4);
    expect(r.criados).toBe(4);
    expect(r.porCategoria).toEqual({ bebe: 2, mamae: 2 });
    const cats = (await e.pool.query(`SELECT p.categoria FROM alerts a JOIN offers o ON o.id = a.offer_id JOIN products p ON p.id = o.product_id WHERE a.motivo LIKE 'DEMO:%' AND o.store_id = $1`, [loja])).rows.map((x) => x.categoria).sort();
    expect(cats).toEqual(['bebe', 'bebe', 'mamae', 'mamae']);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM alerts a JOIN offers o ON o.id = a.offer_id WHERE a.motivo LIKE 'DEMO:%' AND o.store_id = $1`, [semArea.loja])).rows[0].n).toBe(0);
    await removerDemonstracao(e.pool, e.tenantId);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM alerts WHERE id = $1`, [real])).rows[0].n).toBe(1);
  });

  it('loja sem área de entrega não ganha alerta de demonstração, mesmo com vaga de sobra', async () => {
    const config = await carregarConfigTenant('padrao');
    await e.pool.query(`UPDATE offers SET disponivel = false`);
    const semArea = await t.loja({ nome: 'Sem area 2', faixa: null });
    const comArea = await t.loja({ nome: 'Com area' });
    const a = await t.produto({ nome: 'A sem area', marca: 'asa', marcaChave: 'asa' });
    const b = await t.produto({ nome: 'B com area', marca: 'bca', marcaChave: 'bca' });
    await t.oferta({ produto: a, loja: semArea.loja, fonte: semArea.fonte });
    const ofertaB = await t.oferta({ produto: b, loja: comArea.loja, fonte: comArea.fonte });
    const r = await criarDemonstracao(e.pool, e.tenantId, config, e.agora, 30);
    expect(r.criados).toBe(1);
    expect((await e.pool.query(`SELECT offer_id FROM alerts WHERE motivo LIKE 'DEMO:%'`)).rows.map((x) => x.offer_id)).toEqual([ofertaB]);
  });

  it('sem oferta elegível não cria nada e avisa', async () => {
    const config = await carregarConfigTenant('padrao');
    await e.pool.query(`UPDATE offers SET coletada_em = now() - interval '30 days'`);
    const r = await criarDemonstracao(e.pool, e.tenantId, config, e.agora, 8);
    expect(r).toEqual({ criados: 0, semOfertaElegivel: true, porCategoria: {} });
  });
});
