// POST /v1/admin/ofertas-manuais contra um Postgres de verdade (admin.yaml). Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;
const horas = (n: number) => new Date(Date.parse('2026-11-01T12:00:00Z') + n * 3600_000);

executar('admin: cadastro de oferta manual (Postgres)', () => {
  const t = ambienteDeTeste('teste_ofertamanual');
  const { e } = t;

  const pedido = (extra: Record<string, unknown> = {}) => ({
    loja_id: '', preco_centavos: 4990, condicao: null, frete: { status: 'nao_se_aplica', centavos: null }, valida_de: null,
    valida_ate: horas(48).toISOString(), link: 'https://loja.exemplo.test/encarte', link_afiliado: false, ...extra,
  });
  const novoProduto = (extra: Record<string, unknown> = {}) => ({ nome: 'Fralda Teste Manual G 60 un', marca: 'Marca Manual', categoria: 'bebe', subcategoria: 'fraldas', gtin: null, embalagem: { quantidade: 60, unidade: 'un' }, ...extra });
  const postar = (auth: Record<string, string>, corpo: unknown, chave: string = randomUUID()) => t.chamar('POST', '/v1/admin/ofertas-manuais', auth, corpo, { 'idempotency-key': chave });
  const contar = async (sql: string, params: unknown[] = []) => (await e.pool.query(sql, params)).rows[0].n as number;

  async function cenario() {
    const op = await t.operador();
    const { loja, fonte } = await t.loja({ nome: 'Mercado do Bairro' });
    return { op, loja, fonte, base: (extra: Record<string, unknown> = {}) => pedido({ loja_id: loja, produto_novo: novoProduto(), ...extra }) };
  }

  it('cadastra produto novo: 201 no formato do contrato, oferta do operador, alerta somente_feed sem notificar e auditoria', async () => {
    const { op, loja, base } = await cenario();
    const r = await postar(op.auth, base({ condicao: { tipo: 'leve_pague', leve: 3, pague: 2 } }));
    expect(r.statusCode).toBe(201);
    const o = r.json();
    expect(o).toMatchObject({
      preco_centavos: 4990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, rotulo_condicao: 'Leve 3, pague 2', frete: { status: 'nao_se_aplica', centavos: null },
      valida_de: null, validade_padrao_aplicada: false, link: 'https://loja.exemplo.test/encarte', link_afiliado: false, disponivel: true,
      loja: { id: loja, nome: 'Mercado do Bairro (online)', tipo: 'online' }, criada_por: { id: op.operadorId, nome: op.nome }, criada_em: '2026-11-01T12:00:00.000Z',
      produto: { nome: 'Fralda Teste Manual G 60 un', categoria: 'bebe', subcategoria: 'fraldas', embalagem: { quantidade: 60, unidade: 'un' }, marca: { nome: 'Marca Manual', chave: 'marca-manual' } },
    });
    expect(o.valida_ate).toBe(horas(48).toISOString());
    const alerta = (await e.pool.query(`SELECT decisao, score, motivo, rotulo_condicao, preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar FROM alerts WHERE id = $1`, [o.alerta_id])).rows[0];
    expect(alerta).toMatchObject({ decisao: 'somente_feed', score: 0, rotulo_condicao: 'Leve 3, pague 2', entrega_a_confirmar: false });
    expect(Number(alerta.preco_efetivo_por_unidade)).toBeCloseTo((4990 / 60) * (2 / 3), 3);
    expect(Number(alerta.preco_referencia_por_unidade)).toBeCloseTo(Number(alerta.preco_efetivo_por_unidade), 3);
    expect(alerta.motivo).toContain(op.nome);
    const linha = (await e.pool.query(`SELECT criada_por, coletada_em, validade_padrao_aplicada, preco_por_unidade_centavos FROM offers WHERE id = $1`, [o.id])).rows[0];
    expect(linha.criada_por).toBe(op.operadorId);
    expect(linha.validade_padrao_aplicada).toBe(false);
    expect(Number(linha.preco_por_unidade_centavos)).toBeCloseTo(4990 / 60, 3);
    const aud = (await e.pool.query(`SELECT acao, alvo_tipo, alvo_id, detalhe FROM auditoria WHERE alvo_id = $1`, [o.id])).rows;
    expect(aud).toHaveLength(1);
    expect(aud[0]).toMatchObject({ acao: 'oferta_manual_criada', alvo_tipo: 'oferta', detalhe: { produto_novo: true, loja_id: loja, preco_centavos: 4990, validade_padrao_aplicada: false } });
    // A fonte "manual" é do tipo E e fica inativa: o coletor nunca a recolhe nem a esconde.
    expect((await e.pool.query(`SELECT s.nome, s.tipo, s.ativa FROM offers o JOIN sources s ON s.id = o.source_id WHERE o.id = $1`, [o.id])).rows[0]).toEqual({ nome: 'manual', tipo: 'E', ativa: false });
    // Sem push: nada em entregas.
    expect(await contar(`SELECT count(*)::int AS n FROM deliveries WHERE alert_id = $1`, [o.alerta_id])).toBe(0);
  });

  it('sem valida_ate vale o prazo padrão do tenant (7 dias) e a resposta avisa', async () => {
    const { op, base } = await cenario();
    const r = await postar(op.auth, base({ valida_ate: undefined }));
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ validade_padrao_aplicada: true, valida_ate: horas(7 * 24).toISOString() });
    const nulo = await postar(op.auth, base({ valida_ate: null }));
    expect(nulo.json().validade_padrao_aplicada).toBe(true);
  });

  it('produto que já existe: usa o produto_id sem alterá-lo; produto novo igual cai no mesmo produto', async () => {
    const { op, loja, base } = await cenario();
    const existente = await t.produto({ nome: 'Shampoo Infantil 200 ml', marca: 'Baby', marcaChave: 'baby', categoria: 'bebe', quantidade: 0.2, unidade: 'l' });
    const r = await postar(op.auth, pedido({ loja_id: loja, produto_id: existente }));
    expect(r.statusCode).toBe(201);
    expect(r.json().produto).toMatchObject({ id: existente, nome: 'Shampoo Infantil 200 ml', embalagem: { quantidade: 0.2, unidade: 'l' } });
    expect(await contar(`SELECT count(*)::int AS n FROM products WHERE tenant_id = $1 AND nome = 'Shampoo Infantil 200 ml'`, [e.tenantId])).toBe(1);

    const a = await postar(op.auth, base());
    const b = await postar(op.auth, base({ preco_centavos: 4500 }));
    expect(a.json().produto.id).toBe(b.json().produto.id);
    expect(await contar(`SELECT count(*)::int AS n FROM products WHERE tenant_id = $1 AND nome = 'Fralda Teste Manual G 60 un'`, [e.tenantId])).toBe(1);
    expect(a.json().id).not.toBe(b.json().id);
  });

  it('aparece no feed e no preço do produto da pessoa como "sem histórico verificado", e continua depois de 6 h (não é recoletada)', async () => {
    const { op, base } = await cenario();
    const r = await postar(op.auth, base({ valida_ate: horas(72).toISOString(), produto_novo: novoProduto({ nome: 'Lenço Umedecido Exclusivo do Teste 96 un', marca: 'Exclusiva' }) }));
    const p = await t.pessoa({ categorias: ['bebe'] });
    const feed = (await t.chamar('GET', '/v1/alertas?limite=50', p.auth)).json().itens as Array<{ id: string; sem_historico_verificado: boolean; queda: number; destaque: boolean; situacao: string }>;
    const meu = feed.find((a) => a.id === r.json().alerta_id);
    expect(meu).toMatchObject({ sem_historico_verificado: true, queda: 0, destaque: false, situacao: 'ativa' });

    e.agora = horas(30); // 30 h depois: oferta coletada de verdade já teria sumido (limite de 6 h)
    const p2 = await t.pessoa({ categorias: ['bebe'] });
    const depois = (await t.chamar('GET', '/v1/alertas?limite=50', p2.auth)).json().itens as Array<{ id: string }>;
    expect(depois.map((a) => a.id)).toContain(r.json().alerta_id);
    const pagina = (await t.chamar('GET', `/v1/produtos/${r.json().produto.id}`, p2.auth)).json();
    expect(pagina.ofertas.map((o: { preco_centavos: number }) => o.preco_centavos)).toEqual([4990]);
    const lista = (await t.chamar('GET', '/v1/produtos?categoria=bebe&limite=50', p2.auth)).json().itens as Array<{ id: string; menor_preco_centavos: number }>;
    expect(lista.find((i) => i.id === r.json().produto.id)?.menor_preco_centavos).toBe(4990);

    e.agora = horas(80); // passou a validade: some
    const p3 = await t.pessoa({ categorias: ['bebe'] });
    expect(((await t.chamar('GET', '/v1/alertas?limite=50', p3.auth)).json().itens as Array<{ id: string }>).map((a) => a.id)).not.toContain(r.json().alerta_id);
  });

  it('é idempotente por chave: mesma chave e corpo devolvem a mesma oferta; corpo diferente dá 409; duas ao mesmo tempo criam uma só', async () => {
    const { op, base } = await cenario();
    const chave = randomUUID();
    const corpo = base();
    const a = await postar(op.auth, corpo, chave);
    const b = await postar(op.auth, corpo, chave);
    expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
    expect(b.json()).toEqual(a.json());
    expect(await contar(`SELECT count(*)::int AS n FROM offers WHERE criada_por = $1`, [op.operadorId])).toBe(1);
    const conflito = await postar(op.auth, base({ preco_centavos: 1 }), chave);
    expect(conflito.statusCode).toBe(409);
    expect(conflito.json().codigo).toBe('idempotencia_conflito');

    const op2 = await t.operador();
    const chave2 = randomUUID();
    const [x, y] = await Promise.all([postar(op2.auth, corpo, chave2), postar(op2.auth, corpo, chave2)]);
    expect([x.statusCode, y.statusCode]).toEqual([201, 201]);
    expect(x.json().id).toBe(y.json().id);
    expect(await contar(`SELECT count(*)::int AS n FROM offers WHERE criada_por = $1`, [op2.operadorId])).toBe(1);
    expect(await contar(`SELECT count(*)::int AS n FROM auditoria WHERE operador_id = $1 AND acao = 'oferta_manual_criada'`, [op2.operadorId])).toBe(1);

    // Outro operador com a mesma chave não é a mesma requisição.
    const op3 = await t.operador();
    const z = await postar(op3.auth, corpo, chave);
    expect(z.json().id).not.toBe(a.json().id);
  });

  it('chave com mais de 24 h vale como nova', async () => {
    const { op, base } = await cenario();
    const chave = randomUUID();
    const a = await postar(op.auth, base(), chave);
    e.agora = horas(25);
    const op2 = { ...op, auth: await reabrirOperador(op.operadorId) };
    const b = await postar(op2.auth, base({ valida_ate: horas(100).toISOString() }), chave);
    expect(b.statusCode).toBe(201);
    expect(b.json().id).not.toBe(a.json().id);
  });
  async function reabrirOperador(operadorId: string) {
    const { criarSessaoOperador } = await import('../auth/sessoes.js');
    return { authorization: `Bearer ${(await criarSessaoOperador(e.pool, e.tenantId, operadorId, e.agora, 7)).accessToken}` };
  }

  it('barra medicamento e NBCAL pela triagem: 422, registra na fila da triagem, não cria nada e a chave pode ser reusada com o produto corrigido', async () => {
    const { op, base } = await cenario();
    const chave = randomUUID();
    const r = await postar(op.auth, base({ produto_novo: novoProduto({ nome: 'Dipirona 500 mg 20 comprimidos', marca: 'Generico' }) }), chave);
    expect(r.statusCode).toBe(422);
    expect(r.json().codigo).toBe('bloqueado_pela_triagem');
    expect(r.json().campos[0].campo).toBe('produto');
    expect(await contar(`SELECT count(*)::int AS n FROM offers WHERE criada_por = $1`, [op.operadorId])).toBe(0);
    expect(await contar(`SELECT count(*)::int AS n FROM products WHERE nome LIKE 'Dipirona%'`)).toBe(0);
    const fila = (await e.pool.query(`SELECT codigo, titulo, revisao_humana FROM triagem_bloqueios WHERE titulo LIKE 'Dipirona%'`)).rows;
    expect(fila).toHaveLength(1);
    const lista = (await t.chamar('GET', '/v1/admin/triagem', op.auth)).json().itens as Array<{ titulo: string }>;
    expect(lista.map((i) => i.titulo)).toContain('Dipirona 500 mg 20 comprimidos');

    const nbcal = await postar(op.auth, base({ produto_novo: novoProduto({ nome: 'Mamadeira 240 ml', marca: 'Bico' }) }));
    expect(nbcal.statusCode).toBe(422);
    expect(nbcal.json().codigo).toBe('bloqueado_pela_triagem');

    // A mesma chave com o produto corrigido passa (a reserva foi desfeita).
    const ok = await postar(op.auth, base(), chave);
    expect(ok.statusCode).toBe(201);
  });

  it('medicamento por GTIN da referência também é barrado, e produto com advertência da NBCAL entra com a advertência gravada', async () => {
    const { op, base } = await cenario();
    const gtin = await postar(op.auth, base({ produto_novo: novoProduto({ nome: 'Produto qualquer 10 un', gtin: '7891000000011' }) }));
    expect(gtin.statusCode).toBe(422);
    const papinha = await postar(op.auth, base({ produto_novo: novoProduto({ nome: 'Papinha de Pera 120g', categoria: 'bebe', subcategoria: 'alimentacao', embalagem: { quantidade: 0.12, unidade: 'kg' } }) }));
    expect(papinha.statusCode).toBe(201);
    const adv = (await e.pool.query(`SELECT advertencias FROM products WHERE id = $1`, [papinha.json().produto.id])).rows[0].advertencias;
    expect(adv).toEqual(['nbcal_apos_6_meses']);
  });

  it('valida o corpo e devolve todos os campos errados de uma vez', async () => {
    const { op, loja, base } = await cenario();
    const erros = async (corpo: unknown, chave?: string) => {
      const r = await postar(op.auth, corpo, chave);
      expect(r.statusCode).toBe(422);
      expect(r.json().codigo).toBe('validacao');
      return (r.json().campos as Array<{ campo: string }>).map((c) => c.campo);
    };
    expect(await erros({})).toEqual(expect.arrayContaining(['produto_id', 'loja_id', 'preco_centavos', 'condicao', 'frete', 'valida_de', 'link', 'link_afiliado']));
    expect(await erros(base({ produto_id: randomUUID() }))).toContain('produto_id'); // os dois ao mesmo tempo
    expect(await erros(base({ preco_centavos: 0 }))).toEqual(['preco_centavos']);
    expect(await erros(base({ preco_centavos: 12.5 }))).toEqual(['preco_centavos']);
    expect(await erros(base({ condicao: { tipo: 'leve_pague', leve: 2, pague: 2 } }))).toEqual(['condicao']);
    expect(await erros(base({ condicao: { tipo: 'nada' } }))).toEqual(['condicao']);
    expect(await erros(base({ frete: { status: 'conhecido', centavos: null } }))).toEqual(['frete']);
    expect(await erros(base({ frete: { status: 'a_confirmar', centavos: 100 } }))).toEqual(['frete']);
    expect(await erros(base({ link: 'http://inseguro.test/x' }))).toEqual(['link']);
    expect(await erros(base({ link: 'javascript:alert(1)' }))).toEqual(['link']);
    expect(await erros(base({ link_afiliado: 'sim' }))).toEqual(['link_afiliado']);
    expect(await erros(base({ valida_ate: horas(-1).toISOString() }))).toEqual(['valida_ate']);
    expect(await erros(base({ valida_de: horas(100).toISOString(), valida_ate: horas(50).toISOString() }))).toEqual(['valida_ate']);
    expect(await erros(base({ valida_de: 'ontem' }))).toEqual(['valida_de']);
    expect(await erros(base({ produto_novo: novoProduto({ categoria: 'medicamentos_isentos' }) }))).toEqual(['produto_novo.categoria']);
    expect(await erros(base({ produto_novo: novoProduto({ subcategoria: 'brinquedos' }) }))).toEqual(['produto_novo.subcategoria']);
    expect(await erros(base({ produto_novo: novoProduto({ embalagem: { quantidade: 0, unidade: 'un' } }) }))).toEqual(['produto_novo.embalagem']);
    expect(await erros(base({ produto_novo: novoProduto({ gtin: '123' }) }))).toEqual(['produto_novo.gtin']);
    expect(await erros(base({ produto_novo: novoProduto({ nome: '  ' }) }))).toEqual(['produto_novo.nome']);
    // Sem Idempotency-Key, ou com chave que não é UUID.
    const semChave = await t.chamar('POST', '/v1/admin/ofertas-manuais', op.auth, base());
    expect(semChave.statusCode).toBe(422);
    expect(semChave.json().campos[0].campo).toBe('Idempotency-Key');
    expect((await postar(op.auth, base(), 'abc')).json().campos[0].campo).toBe('Idempotency-Key');
    expect((await t.chamar('POST', '/v1/admin/ofertas-manuais', op.auth, [1], { 'idempotency-key': randomUUID() })).statusCode).toBe(400);
    void loja;
    expect(await contar(`SELECT count(*)::int AS n FROM offers WHERE criada_por = $1`, [op.operadorId])).toBe(0);
  });

  it('404 para loja ou produto que não existem (ou de outro tenant), 422 para loja bloqueada e para loja da Lomadee; nada é criado', async () => {
    const { op, loja, base } = await cenario();
    expect((await postar(op.auth, base({ loja_id: randomUUID() }))).statusCode).toBe(404);
    expect((await postar(op.auth, pedido({ loja_id: loja, produto_id: randomUUID() }))).statusCode).toBe(404);
    const alheia = await t.loja({ nome: 'De outro tenant', t: e.outroTenantId });
    expect((await postar(op.auth, base({ loja_id: alheia.loja }))).statusCode).toBe(404);
    const produtoAlheio = await t.produto({ t: e.outroTenantId });
    expect((await postar(op.auth, pedido({ loja_id: loja, produto_id: produtoAlheio }))).statusCode).toBe(404);

    await e.pool.query(`UPDATE stores SET status = 'bloqueada' WHERE id = $1`, [loja]);
    const bloqueada = await postar(op.auth, base());
    expect(bloqueada.statusCode).toBe(422);
    expect(bloqueada.json().campos[0].campo).toBe('loja_id');
    await e.pool.query(`UPDATE stores SET status = 'em_observacao' WHERE id = $1`, [loja]);

    // Loja ligada à fonte "lomadee" (com trava de marca): só link rastreado da plataforma, então não cabe cadastro manual.
    const fonteLomadee = (await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,'lomadee','A',120,'SP','alta','teste',false) RETURNING id`, [e.tenantId])).rows[0].id;
    const lojaLomadee = (await t.loja({ nome: 'Marca da Lomadee' })).loja;
    await e.pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [e.tenantId, fonteLomadee, randomUUID(), lojaLomadee]);
    const lomadee = await postar(op.auth, base({ loja_id: lojaLomadee }));
    expect(lomadee.statusCode).toBe(422);
    expect(lomadee.json().campos[0].mensagem).toContain('Lomadee');
    expect(await contar(`SELECT count(*)::int AS n FROM offers WHERE criada_por = $1`, [op.operadorId])).toBe(0);
  });

  it('exige operador: sem token, com token do app ou de operador desativado dá 401', async () => {
    const { base } = await cenario();
    expect((await postar({}, base())).statusCode).toBe(401);
    const p = await t.pessoa();
    expect((await postar(p.auth, base())).statusCode).toBe(401);
    const op = await t.operador();
    await e.pool.query(`UPDATE operadores SET ativo = false WHERE id = $1`, [op.operadorId]);
    expect((await postar(op.auth, base())).statusCode).toBe(401);
  });

  it('encerrar a oferta manual a tira do feed; a linha fica', async () => {
    const { op, base } = await cenario();
    const r = await postar(op.auth, base());
    const del = await t.chamar('DELETE', `/v1/admin/ofertas-manuais/${r.json().id}`, op.auth);
    expect(del.statusCode).toBe(204);
    const p = await t.pessoa({ categorias: ['bebe'] });
    expect(((await t.chamar('GET', '/v1/alertas?limite=50', p.auth)).json().itens as Array<{ id: string }>).map((a) => a.id)).not.toContain(r.json().alerta_id);
    const lista = (await t.chamar('GET', '/v1/admin/ofertas-manuais?ativas=false', op.auth)).json().itens as Array<{ id: string; disponivel: boolean }>;
    expect(lista.find((o) => o.id === r.json().id)?.disponivel).toBe(false);
  });
});

executar('admin: cadastro de oferta manual sem a lista de medicamentos (Postgres)', () => {
  const t = ambienteDeTeste('teste_ofertamanual_sem', { listasMedicamentos: null });
  it('falha fechada: 503 com Retry-After, e nada é criado', async () => {
    const op = await t.operador();
    const { loja } = await t.loja();
    const r = await t.chamar('POST', '/v1/admin/ofertas-manuais', op.auth, {
      loja_id: loja, produto_novo: { nome: 'Fralda X 10 un', marca: null, categoria: 'bebe', embalagem: { quantidade: 10, unidade: 'un' } }, preco_centavos: 1000, condicao: null,
      frete: { status: 'a_confirmar', centavos: null }, valida_de: null, link: 'https://x.test/a', link_afiliado: false,
    }, { 'idempotency-key': randomUUID() });
    expect(r.statusCode).toBe(503);
    expect(r.json().codigo).toBe('servico_indisponivel');
    expect(r.headers['retry-after']).toBeDefined();
    expect((await t.e.pool.query(`SELECT count(*)::int AS n FROM offers WHERE criada_por IS NOT NULL`)).rows[0].n).toBe(0);
  });
});
