// Feed, detalhe e eventos do alerta contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CodigosMemoria } from '../auth/codigos.js';
import { criarSessao } from '../auth/sessoes.js';
import { iguais } from '../auth/tokens.js';
import { migrate } from '../db/migrate.js';
import { TEXTOS_ADVERTENCIA } from '../normalizador/nbcal.js';
import { chaveDaMarca, gravarOferta, gravarProduto } from '../pipeline/repositorio.js';
import { buildApp } from './app.js';
import { ErroApi } from './erros.js';
import type { ProvedorLinkOferta } from './linkOferta.js';
import { LimitadorMemoria } from './limiteTaxa.js';
import { RegistroTenantsBanco } from './tenants.js';

const URL_BASE = process.env.PG_TESTE_URL;
const executar = URL_BASE ? describe : describe.skip;
const VIGENTE = '2026-10-28';
const DROGASMIL = 'd855f505-7e26-4961-a182-c2139aeadd2c'; // marca liberada em fontes.lomadee.marcasPermitidasParaLink
const ROSARIO = '00000000-0000-4000-8000-0000000000aa'; // marca fora da lista (não aceita Comparador de Preços)

executar('feed, detalhe e eventos (Postgres)', () => {
  const nomeBanco = `teste_alertas_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let tenantId: string;
  let outroTenantId: string;
  let sourceId: string;
  let app: ReturnType<typeof buildApp>;
  let agora = new Date('2026-11-01T12:00:00Z');
  const chamadasLink: string[] = [];
  let linkFalha = false;
  const links: ProvedorLinkOferta = {
    resolver: async (_t, o) => {
      chamadasLink.push(o.id);
      if (linkFalha) throw new ErroApi('servico_indisponivel', undefined, undefined, 60);
      return { link: `https://lmdee.link/${o.id.slice(0, 8)}`, afiliado: true };
    },
  };

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${nomeBanco}`);
    pool = new pg.Pool({ connectionString: `${URL_BASE}/${nomeBanco}`, max: 5 });
    // O DROP DATABASE ... FORCE do fim do teste derruba conexões ociosas; sem este ouvinte o erro vira "Unhandled Error" e reprova a rodada.
    pool.on('error', () => {});
    const c = await pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    tenantId = (await pool.query(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
    outroTenantId = (await pool.query(`INSERT INTO tenants (slug, nome) VALUES ('outro', 'Outro') RETURNING id`)).rows[0].id;
    sourceId = await criarFonte(tenantId);
    const relogio = () => agora.getTime();
    app = buildApp({
      healthChecks: [],
      tenants: new RegistroTenantsBanco(pool),
      limitador: new LimitadorMemoria(relogio),
      links,
      auth: { db: pool, codigos: new CodigosMemoria(iguais, relogio), enviador: { enviarCodigo: async () => {} }, chaveHmac: Buffer.alloc(32, 9), agora: () => agora },
    });
  });

  beforeEach(() => {
    agora = new Date('2026-11-01T12:00:00Z'); // um teste que falha no meio não deixa o relógio adiantado para o próximo
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  // ---------------------------------------------------------------- semente
  async function criarFonte(t: string): Promise<string> {
    return (
      await pool.query(
        `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,'lomadee','A',120,'SP','alta','teste',true) RETURNING id`,
        [t],
      )
    ).rows[0].id;
  }
  const fonteDaLoja = new Map<string, string>();
  /** Sem `src`, a loja ganha uma fonte própria sem trava de marca; com `src: sourceId` ela segue as regras da Lomadee. */
  async function criarLoja(o: { t?: string; src?: string; idExterno?: string; nome?: string; faixa?: [string, string, number] | null } = {}): Promise<string> {
    const t = o.t ?? tenantId;
    const src =
      o.src ??
      (await pool.query(
        `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,$2,'A',120,'SP','alta','teste',true) RETURNING id`,
        [t, `teste-${randomUUID()}`],
      )).rows[0].id;
    const loja = (await pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1,$2,$3,'online') RETURNING id`, [t, o.nome ?? 'Drogasmil', `${o.nome ?? 'Drogasmil'} (online)`])).rows[0].id;
    await pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,$3,$4)`, [t, src, o.idExterno ?? DROGASMIL, loja]);
    const f = o.faixa === undefined ? (['01000000', '19999999', 3] as [string, string, number]) : o.faixa;
    if (f !== null) await pool.query(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1,$2,$3,$4,$5)`, [t, loja, f[0], f[1], f[2]]);
    fonteDaLoja.set(loja, src);
    return loja;
  }
  async function criarProduto(o: { t?: string; nome?: string; marca?: string; marcaChave?: string | null; categoria?: string; quantidade?: number; unidade?: string; advertencias?: string[] } = {}): Promise<string> {
    return (
      await pool.query(
        `INSERT INTO products (tenant_id, chave_hash, familia_chave, marca, marca_chave, nome, categoria, quantidade, unidade, advertencias)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[]) RETURNING id`,
        [o.t ?? tenantId, randomUUID(), randomUUID(), o.marca ?? 'Pampers', o.marcaChave === undefined ? 'pampers' : o.marcaChave, o.nome ?? 'Fralda Pampers G 60 un', o.categoria ?? 'bebe', o.quantidade ?? 60, o.unidade ?? 'un', o.advertencias ?? []],
      )
    ).rows[0].id;
  }
  interface Semente {
    t?: string; src?: string; loja: string; produto: string; preco?: number; disponivel?: boolean; validaAte?: Date | null; coletadaEm?: Date;
    escondida?: boolean; manual?: boolean; frete?: [string, number | null]; ofertaPreco?: number;
    decisao?: string; revisao?: string; criadoEm?: Date; efetivo?: number; referencia?: number; rotulo?: string | null;
  }
  async function semear(s: Semente): Promise<{ alerta: string; oferta: string }> {
    const t = s.t ?? tenantId;
    const preco = s.preco ?? 5990;
    const oferta = (
      await pool.query(
        `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos, preco_por_unidade_centavos, frete_status, frete_centavos,
                             disponivel, valida_ate, link, coletada_em, escondida_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [t, s.produto, s.loja, s.src ?? fonteDaLoja.get(s.loja) ?? sourceId, randomUUID(), s.ofertaPreco ?? preco, 99.8333, s.frete?.[0] ?? 'a_confirmar', s.frete?.[1] ?? null,
         s.disponivel ?? true, s.validaAte ?? null, 'https://www.drogasmil.com.br/p/x', s.coletadaEm ?? new Date(agora.getTime() - 3600_000), s.escondida ? agora : null],
      )
    ).rows[0].id;
    if (s.manual) await pool.query(`UPDATE offers SET criada_por = (SELECT id FROM operadores WHERE tenant_id = $1 LIMIT 1) WHERE id = $2`, [t, oferta]);
    const decisao = s.decisao ?? 'notificar';
    const revisao = s.revisao ?? (decisao === 'aguardar_aprovacao' ? 'pendente' : 'nao_exigida');
    const alerta = (
      await pool.query(
        `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos, preco_efetivo_por_unidade, preco_referencia_por_unidade,
                             valida_ate, rotulo_condicao, entrega_a_confirmar, criado_em, revisao_situacao, revisao_em)
         VALUES ($1,$2,$3,$4,80,$5,'teste',$6,$7,$8,$9,$10,false,$11,$12,$13) RETURNING id`,
        [t, oferta, s.loja, randomUUID(), decisao, preco, s.efetivo ?? 99.8333, s.referencia ?? 149.75, s.validaAte ?? null, s.rotulo ?? null, s.criadoEm ?? agora, revisao, revisao === 'aprovado' || revisao === 'rejeitado' ? agora : null],
      )
    ).rows[0].id;
    return { alerta, oferta };
  }
  let seq = 0;
  /** Pessoa com termos aceitos, preferências e sessão. */
  async function pessoa(o: { ceps?: string[]; categorias?: string[]; termos?: boolean; premium?: boolean } = {}) {
    seq += 1;
    const userId = (
      await pool.query(
        `INSERT INTO users (tenant_id, email, email_verificado_em, termos_versao, termos_aceitos_em) VALUES ($1,$2,now(),$3,$4) RETURNING id`,
        [tenantId, `p${seq}@exemplo.com`, o.termos === false ? null : VIGENTE, o.termos === false ? null : agora],
      )
    ).rows[0].id as string;
    await pool.query(`INSERT INTO user_preferences (user_id, tenant_id, categorias, ceps) VALUES ($1,$2,$3::text[],$4::char(8)[])`, [userId, tenantId, o.categorias ?? ['bebe'], o.ceps ?? ['14020260']]);
    if (o.premium) await pool.query(`INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, expira_em) VALUES ($1,$2,'premium_mensal','ativa','google_play',$3,$4)`, [tenantId, userId, new Date('2026-10-30T00:00:00Z'), new Date('2026-12-30T00:00:00Z')]);
    return { userId, auth: await reabrir(userId) };
  }
  async function reabrir(userId: string) {
    return { authorization: `Bearer ${(await criarSessao(pool, tenantId, userId, agora)).accessToken}` };
  }
  const feed = (auth: Record<string, string>, q = '') => app.inject({ method: 'GET', url: `/v1/alertas${q}`, headers: auth });
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);

  /** Cada teste usa produtos e lojas próprios e uma pessoa própria, para os alertas de um não vazarem no feed do outro. */
  async function cenario() {
    const loja = await criarLoja();
    const produto = await criarProduto();
    const p = await pessoa();
    return { loja, produto, p };
  }

  // ---------------------------------------------------------------- feed
  describe('GET /v1/alertas', () => {
    it('devolve o alerta no formato do contrato, com cálculos e cobertura', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto, preco: 5990, decisao: 'notificar', rotulo: 'leve 3 pague 2', validaAte: new Date('2026-11-03T00:00:00Z') });
      const r = await feed(p.auth);
      expect(r.statusCode).toBe(200);
      const a = r.json().itens.find((i: { id: string }) => i.id === alerta);
      expect(a).toMatchObject({
        destaque: true, situacao: 'ativa', preco_centavos: 5990, rotulo_condicao: 'leve 3 pague 2', sem_historico_verificado: false, seguido: false,
        produto: { id: produto, nome: 'Fralda Pampers G 60 un', marca: { chave: 'pampers', nome: 'Pampers' }, categoria: 'bebe', embalagem: { quantidade: 60, unidade: 'un' }, imagem_url: null },
        loja: { id: loja, nome: 'Drogasmil (online)', rede: 'Drogasmil', tipo: 'online' },
        cobertura: { modo: 'entrega_por_cep', cep: '14020260', prazo_dias: 3 },
        advertencias: [], prova: null, valida_ate: '2026-11-03T00:00:00.000Z',
      });
      expect(a.preco_referencia_centavos).toBe(8985); // 149,75 por unidade × 60
      expect(a.queda).toBeCloseTo(0.3333, 3);
      expect(r.json().proximo_cursor).toBeNull();
      expect(r.json().vazio_por).toBeNull();
    });

    it('mostra a prova gravada na criação do alerta (menor, maior e dias medidos), no feed e no detalhe; sem prova é null', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto, preco: 5990, decisao: 'notificar' });
      const { alerta: semProva } = await semear({ loja, produto: await criarProduto(), preco: 5990, decisao: 'notificar' });
      await pool.query(`UPDATE alerts SET prova_menor_centavos = 6490, prova_maior_centavos = 8990, prova_dias = 37 WHERE id = $1`, [alerta]);
      const esperada = { menor_preco_centavos: 6490, maior_preco_centavos: 8990, dias_medidos: 37 };
      const lista = (await feed(p.auth)).json().itens;
      expect(lista.find((i: { id: string }) => i.id === alerta).prova).toEqual(esperada);
      expect(lista.find((i: { id: string }) => i.id === semProva).prova).toBeNull();
      const d = await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth });
      expect(d.json().prova).toEqual(esperada);
    });

    it('somente_feed aparece sem destaque; aguardando aprovação só depois de aprovado; rejeitado nunca', async () => {
      const { loja, produto, p } = await cenario();
      const sf = await semear({ loja, produto, decisao: 'somente_feed' });
      const pend = await semear({ loja, produto, decisao: 'aguardar_aprovacao', revisao: 'pendente' });
      const apr = await semear({ loja, produto, decisao: 'aguardar_aprovacao', revisao: 'aprovado' });
      const rej = await semear({ loja, produto, decisao: 'somente_feed', revisao: 'rejeitado' });
      const r = await feed(p.auth);
      expect(ids(r)).toEqual(expect.arrayContaining([sf.alerta, apr.alerta]));
      expect(ids(r)).not.toContain(pend.alerta);
      expect(ids(r)).not.toContain(rej.alerta);
      expect(r.json().itens.find((i: { id: string }) => i.id === sf.alerta).destaque).toBe(false);
    });

    it('esconde oferta indisponível, vencida, com preço mudado, coleta velha ou escondida por denúncia', async () => {
      const { loja, produto, p } = await cenario();
      const ok = await semear({ loja, produto });
      const ruins = [
        await semear({ loja, produto, disponivel: false }),
        await semear({ loja, produto, validaAte: new Date('2026-11-01T11:59:00Z') }),
        await semear({ loja, produto, preco: 5990, ofertaPreco: 6990 }), // o preço da oferta mudou depois do alerta
        await semear({ loja, produto, coletadaEm: new Date('2026-11-01T05:59:00Z') }), // mais de 6 h sem ser coletada
        await semear({ loja, produto, escondida: true }),
      ];
      const r = await feed(p.auth);
      expect(ids(r)).toContain(ok.alerta);
      for (const ruim of ruins) expect(ids(r)).not.toContain(ruim.alerta);
    });

    it('respeita categoria escolhida, CEP coberto e filtro por categoria', async () => {
      const loja = await criarLoja();
      const bebe = await criarProduto();
      const infantil = await criarProduto({ categoria: 'infantil', nome: 'Detergente', marcaChave: 'ype', marca: 'Ypê' });
      const a1 = await semear({ loja, produto: bebe });
      const a2 = await semear({ loja, produto: infantil });
      const soBebe = await pessoa({ categorias: ['bebe'] });
      expect(ids(await feed(soBebe.auth))).toEqual(expect.arrayContaining([a1.alerta]));
      expect(ids(await feed(soBebe.auth))).not.toContain(a2.alerta);
      const ambas = await pessoa({ categorias: ['bebe', 'infantil'] });
      expect(ids(await feed(ambas.auth))).toEqual(expect.arrayContaining([a1.alerta, a2.alerta]));
      expect(ids(await feed(ambas.auth, '?categoria=infantil'))).toEqual([a2.alerta]);

      const lojaRestrita = await criarLoja({ nome: 'Restrita', faixa: ['01000000', '09999999', 2] });
      const a3 = await semear({ loja: lojaRestrita, produto: bebe });
      expect(ids(await feed((await pessoa({ ceps: ['14020260'] })).auth))).not.toContain(a3.alerta); // CEP fora da faixa da loja
      const dentro = await feed((await pessoa({ ceps: ['01310100'] })).auth);
      expect(dentro.json().itens.find((i: { id: string }) => i.id === a3.alerta).cobertura).toMatchObject({ cep: '01310100', prazo_dias: 2 });
    });

    it('usa só os CEPs que o plano permite: o gratuito conta o primeiro, o premium os três', async () => {
      const loja = await criarLoja({ faixa: ['01000000', '09999999', 2] });
      const produto = await criarProduto();
      const { alerta } = await semear({ loja, produto });
      // O primeiro CEP (14...) não é coberto; o segundo (01...) é.
      const gratuito = await pessoa({ ceps: ['14020260', '01310100'] });
      expect(ids(await feed(gratuito.auth))).not.toContain(alerta);
      const premium = await pessoa({ ceps: ['14020260', '01310100'], premium: true });
      expect(ids(await feed(premium.auth))).toContain(alerta);
    });

    it('silenciamento "tudo" de loja ou de marca some do feed; "push" não', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      await pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'push')`, [tenantId, p.userId, loja]);
      expect(ids(await feed(p.auth))).toContain(alerta);
      await pool.query(`UPDATE silenciamentos SET alcance = 'tudo' WHERE user_id = $1`, [p.userId]);
      expect(ids(await feed(p.auth))).not.toContain(alerta);
      await pool.query(`DELETE FROM silenciamentos WHERE user_id = $1`, [p.userId]);
      await pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, marca_chave, alcance) VALUES ($1,$2,'marca','pampers','tudo')`, [tenantId, p.userId]);
      expect(ids(await feed(p.auth))).not.toContain(alerta);
    });

    it('silenciar e seguir pela API muda o feed: "tudo" esconde, "push" não, e o produto seguido sai com seguido: true', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const put = (url: string, corpo: unknown) => app.inject({ method: 'PUT', url, headers: p.auth, payload: corpo as never });
      const item = async () => (await feed(p.auth)).json().itens.find((i: { id: string }) => i.id === alerta);

      expect((await item()).seguido).toBe(false);
      const avisos = { promocao_excepcional: true, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false };
      expect((await put(`/v1/seguidos/${produto}`, { avisos })).statusCode).toBe(201);
      expect((await item()).seguido).toBe(true);

      expect((await put(`/v1/silenciamentos/loja/${loja}`, { alcance: 'push' })).statusCode).toBe(201);
      expect(await item()).toBeDefined(); // só o push é silenciado
      await put(`/v1/silenciamentos/loja/${loja}`, { alcance: 'tudo' });
      expect(await item()).toBeUndefined();
      await app.inject({ method: 'DELETE', url: `/v1/silenciamentos/loja/${loja}`, headers: p.auth });
      expect(await item()).toBeDefined();

      expect((await put('/v1/silenciamentos/marca/pampers', { alcance: 'tudo' })).statusCode).toBe(201);
      expect(await item()).toBeUndefined(); // a marca do produto também
    });

    it('medicamento nunca aparece, mesmo na preferência', async () => {
      const loja = await criarLoja();
      const remedio = await criarProduto({ categoria: 'medicamentos_isentos', nome: 'Dipirona' });
      const { alerta } = await semear({ loja, produto: remedio });
      const p = await pessoa({ categorias: ['medicamentos_isentos', 'bebe'] });
      expect(ids(await feed(p.auth))).not.toContain(alerta);
    });

    it('produto com advertência da NBCAL só aparece com o texto legal; código sem texto conhecido fica de fora', async () => {
      const loja = await criarLoja();
      const comAdv = await criarProduto({ nome: 'Cereal infantil', advertencias: ['nbcal_apos_6_meses'] });
      const desconhecida = await criarProduto({ nome: 'Outro', advertencias: ['nbcal_inventada'] });
      const a = await semear({ loja, produto: comAdv, decisao: 'somente_feed' });
      const b = await semear({ loja, produto: desconhecida, decisao: 'somente_feed' });
      const r = await feed((await pessoa()).auth);
      expect(r.json().itens.find((i: { id: string }) => i.id === a.alerta).advertencias).toEqual([{ codigo: 'nbcal_apos_6_meses', texto: TEXTOS_ADVERTENCIA.nbcal_apos_6_meses }]);
      expect(ids(r)).not.toContain(b.alerta);
    });

    it('lojas de marca fora da lista (Drogaria Rosário) não aparecem; a liberada aparece', async () => {
      const produto = await criarProduto();
      const rosario = await criarLoja({ src: sourceId, idExterno: ROSARIO, nome: 'Rosário' });
      const drogasmil = await criarLoja({ src: sourceId, idExterno: DROGASMIL, nome: 'Drogasmil' });
      const proibido = await semear({ loja: rosario, produto });
      const liberado = await semear({ loja: drogasmil, produto });
      const r = await feed((await pessoa()).auth);
      expect(ids(r)).toContain(liberado.alerta);
      expect(ids(r)).not.toContain(proibido.alerta);
    });

    it('cada tenant vê só os próprios alertas', async () => {
      const srcOutro = await criarFonte(outroTenantId);
      const lojaOutro = await criarLoja({ t: outroTenantId, src: srcOutro, idExterno: DROGASMIL });
      const produtoOutro = await criarProduto({ t: outroTenantId });
      const { alerta } = await semear({ t: outroTenantId, src: srcOutro, loja: lojaOutro, produto: produtoOutro });
      const { p } = await cenario();
      expect(ids(await feed(p.auth))).not.toContain(alerta);
      expect((await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth })).statusCode).toBe(404);
    });

    it('ordem decrescente, páginas por cursor sem repetir nem perder', async () => {
      await pool.query(`UPDATE offers SET disponivel = false`); // tira do feed o que os outros testes deixaram
      const loja = await criarLoja();
      const produto = await criarProduto();
      const p = await pessoa();
      const criados: string[] = [];
      for (let i = 0; i < 5; i++) criados.push((await semear({ loja, produto, criadoEm: new Date(agora.getTime() - i * 60_000) })).alerta);
      const vistos: string[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const r = await feed(p.auth, `?limite=2${cursor ? `&cursor=${cursor}` : ''}`);
        expect(r.statusCode).toBe(200);
        vistos.push(...ids(r));
        cursor = r.json().proximo_cursor;
        paginas += 1;
      } while (cursor !== null && paginas < 10);
      expect(vistos).toEqual(criados); // mais novo primeiro, sem repetição
      expect(paginas).toBe(3);
    });

    it('lista vazia diz por quê: sem CEPs ou sem categorias', async () => {
      const semCeps = await pessoa({ ceps: [] });
      expect((await feed(semCeps.auth)).json()).toEqual({ itens: [], proximo_cursor: null, vazio_por: 'sem_ceps' });
      const semCat = await pessoa({ categorias: [] });
      expect((await feed(semCat.auth)).json().vazio_por).toBe('sem_categorias');
    });

    it('validação dos parâmetros e termos pendentes', async () => {
      const { p } = await cenario();
      for (const q of ['?limite=0', '?limite=51', '?limite=abc', '?categoria=Inválida!', '?cursor=lixo', `?cursor=${Buffer.from('{"x":1}').toString('base64url')}`]) {
        const r = await feed(p.auth, q);
        expect(r.statusCode, q).toBe(422);
        expect(r.json().codigo).toBe('validacao');
      }
      const pendente = await pessoa({ termos: false });
      expect((await feed(pendente.auth)).json().codigo).toBe('termos_pendentes');
      expect((await app.inject({ method: 'GET', url: '/v1/alertas' })).json().codigo).toBe('nao_autenticado');
    });
  });

  // ---------------------------------------------------------------- detalhe
  describe('GET /v1/alertas/{id}', () => {
    it('devolve o detalhe com link rastreado, frete, histórico e a avaliação e denúncia da pessoa', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta, oferta } = await semear({ loja, produto, frete: ['conhecido', 990] });
      await pool.query(`INSERT INTO price_history (tenant_id, product_id, store_id, preco_centavos, preco_por_unidade_centavos, observado_em) VALUES ($1,$2,$3,7000,116.6,'2026-10-20T15:00:00Z')`, [tenantId, produto, loja]);
      chamadasLink.length = 0;
      const r = await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth });
      expect(r.statusCode).toBe(200);
      const d = r.json();
      expect(d).toMatchObject({ id: alerta, situacao: 'ativa', frete: { status: 'conhecido', centavos: 990 }, link_afiliado: true, historico_desde: '2026-10-20', avaliacao: null, denuncia: null, valida_de: null });
      expect(d.link).toBe(`https://lmdee.link/${oferta.slice(0, 8)}`);
      expect(chamadasLink).toEqual([oferta]);

      await pool.query(`INSERT INTO avaliacoes (tenant_id, user_id, alert_id, valor) VALUES ($1,$2,$3,'util')`, [tenantId, p.userId, alerta]);
      await pool.query(`INSERT INTO denuncias (tenant_id, user_id, alert_id, motivo) VALUES ($1,$2,$3,'preco_errado')`, [tenantId, p.userId, alerta]);
      const de = (await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth })).json();
      expect(de.avaliacao).toMatchObject({ alerta_id: alerta, valor: 'util' });
      expect(de.denuncia).toMatchObject({ alerta_id: alerta, motivo: 'preco_errado' });
    });

    it('promoção encerrada ou em revisão ainda responde, sem gerar link rastreado', async () => {
      const { loja, produto, p } = await cenario();
      const enc = await semear({ loja, produto, disponivel: false });
      const rev = await semear({ loja, produto, escondida: true });
      chamadasLink.length = 0;
      const a = (await app.inject({ method: 'GET', url: `/v1/alertas/${enc.alerta}`, headers: p.auth })).json();
      const b = (await app.inject({ method: 'GET', url: `/v1/alertas/${rev.alerta}`, headers: p.auth })).json();
      expect(a).toMatchObject({ situacao: 'encerrada', link_afiliado: false });
      expect(b.situacao).toBe('em_revisao');
      expect(chamadasLink).toEqual([]);
    });

    it('responde mesmo fora das categorias escolhidas, mas 404 para rejeitado, pendente, inexistente e CEP sem cobertura', async () => {
      const loja = await criarLoja();
      const infantil = await criarProduto({ categoria: 'infantil', nome: 'Detergente' });
      const bebe = await criarProduto();
      const p = await pessoa({ categorias: ['bebe'] });
      const fora = await semear({ loja, produto: infantil });
      const rej = await semear({ loja, produto: bebe, revisao: 'rejeitado', decisao: 'somente_feed' });
      const pend = await semear({ loja, produto: bebe, decisao: 'aguardar_aprovacao' });
      const get = (id: string, auth = p.auth) => app.inject({ method: 'GET', url: `/v1/alertas/${id}`, headers: auth });
      expect((await get(fora.alerta)).statusCode).toBe(200);
      for (const id of [rej.alerta, pend.alerta, randomUUID(), 'nao-e-uuid']) {
        const r = await get(id);
        expect(r.statusCode, id).toBe(404);
        expect(r.json().codigo).toBe('nao_encontrado');
      }
      const semCobertura = await pessoa({ ceps: ['20000000'] });
      expect((await get(fora.alerta, semCobertura.auth)).statusCode).toBe(404);
    });

    it('falha ao gerar o link rastreado: 503 com Retry-After', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      linkFalha = true;
      const r = await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth });
      linkFalha = false;
      expect(r.statusCode).toBe(503);
      expect(r.json().codigo).toBe('servico_indisponivel');
      expect(r.headers['retry-after']).toBe('60');
    });

    it('oferta manual sai como sem histórico verificado', async () => {
      const { loja, produto, p } = await cenario();
      await pool.query(`INSERT INTO operadores (tenant_id, email, nome) VALUES ($1,'op@x.com','Op') ON CONFLICT DO NOTHING`, [tenantId]);
      const { alerta } = await semear({ loja, produto, manual: true, decisao: 'somente_feed' });
      expect((await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth })).json().sem_historico_verificado).toBe(true);
    });
  });

  // ---------------------------------------------------------------- eventos
  describe('POST /v1/alertas/{id}/eventos', () => {
    const postar = (id: string, auth: Record<string, string>, corpo: unknown, chave: string | null = randomUUID()) =>
      app.inject({ method: 'POST', url: `/v1/alertas/${id}/eventos`, headers: { ...auth, ...(chave ? { 'idempotency-key': chave } : {}) }, payload: corpo as never });
    const contar = async (userId: string) => (await pool.query(`SELECT count(*)::int AS n FROM alert_events WHERE user_id = $1`, [userId])).rows[0].n as number;

    it('registra o evento; repetir a chave com o mesmo corpo não grava de novo; corpo diferente dá 409', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const chave = randomUUID();
      const corpo = { tipo: 'clicado', origem: 'feed', ocorrido_em: '2026-11-01T11:59:00Z' };
      expect((await postar(alerta, p.auth, corpo, chave)).statusCode).toBe(204);
      expect(await contar(p.userId)).toBe(1);
      const ev = (await pool.query(`SELECT tipo, origem, ocorrido_em FROM alert_events WHERE user_id = $1`, [p.userId])).rows[0];
      expect(ev.tipo).toBe('clicado');
      expect(ev.origem).toBe('feed');
      expect(ev.ocorrido_em.toISOString()).toBe('2026-11-01T11:59:00.000Z');

      expect((await postar(alerta, p.auth, corpo, chave)).statusCode).toBe(204);
      expect(await contar(p.userId)).toBe(1);
      const conflito = await postar(alerta, p.auth, { ...corpo, tipo: 'aberto' }, chave);
      expect(conflito.statusCode).toBe(409);
      expect(conflito.json().codigo).toBe('idempotencia_conflito');
      expect(await contar(p.userId)).toBe(1);
      expect((await postar(alerta, p.auth, corpo)).statusCode).toBe(204); // outra chave = outro evento
      expect(await contar(p.userId)).toBe(2);
    });

    it('a chave vale 24 h; depois disso um novo corpo é aceito', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const chave = randomUUID();
      await postar(alerta, p.auth, { tipo: 'aberto', origem: 'push' }, chave);
      agora = new Date(agora.getTime() + 25 * 3600_000);
      const auth2 = await reabrir(p.userId);
      // oferta ainda "ativa" para o teste: renova a coleta e a validade no novo instante
      await pool.query(`UPDATE offers SET coletada_em = $1 WHERE tenant_id = $2`, [agora, tenantId]);
      expect((await postar(alerta, auth2, { tipo: 'compartilhado', origem: 'produto' }, chave)).statusCode).toBe(204);
      expect(await contar(p.userId)).toBe(2);
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('hora do aparelho no futuro ou ausente vira a hora do servidor', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      await postar(alerta, p.auth, { tipo: 'aberto', origem: 'push', ocorrido_em: '2030-01-01T00:00:00Z' });
      await postar(alerta, p.auth, { tipo: 'aberto', origem: 'push' });
      const horas = (await pool.query(`SELECT ocorrido_em FROM alert_events WHERE user_id = $1`, [p.userId])).rows.map((r) => r.ocorrido_em.toISOString());
      expect(horas).toEqual([agora.toISOString(), agora.toISOString()]);
    });

    it('validação: cabeçalho, tipo, origem e data; alerta que a pessoa não poderia ver dá 404; termos pendentes dão 403', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const sem = await postar(alerta, p.auth, { tipo: 'aberto', origem: 'push' }, null);
      expect(sem.statusCode).toBe(422);
      expect(sem.json().campos[0].campo).toBe('Idempotency-Key');
      expect((await postar(alerta, p.auth, { tipo: 'aberto', origem: 'push' }, 'nao-uuid')).statusCode).toBe(422);
      const ruim = await postar(alerta, p.auth, { tipo: 'visto', origem: 'tv', ocorrido_em: 'ontem' });
      expect(ruim.json().campos.map((c: { campo: string }) => c.campo)).toEqual(['tipo', 'origem', 'ocorrido_em']);
      expect((await app.inject({ method: 'POST', url: `/v1/alertas/${alerta}/eventos`, headers: { ...p.auth, 'idempotency-key': randomUUID() } })).statusCode).toBe(400);

      const rej = await semear({ loja, produto, revisao: 'rejeitado', decisao: 'somente_feed' });
      expect((await postar(rej.alerta, p.auth, { tipo: 'aberto', origem: 'push' })).statusCode).toBe(404);
      expect((await postar(randomUUID(), p.auth, { tipo: 'aberto', origem: 'push' })).statusCode).toBe(404);
      expect(await contar(p.userId)).toBe(0);
      const pend = await pessoa({ termos: false });
      expect((await postar(alerta, pend.auth, { tipo: 'aberto', origem: 'push' })).json().codigo).toBe('termos_pendentes');
    });
  });


  // ---------------------------------------------------------------- avaliação
  describe('PUT /v1/alertas/{id}/avaliacao', () => {
    const avaliar = (id: string, auth: Record<string, string>, corpo: unknown) => app.inject({ method: 'PUT', url: `/v1/alertas/${id}/avaliacao`, headers: auth, payload: corpo as never });

    it('grava uma por pessoa; repetir o mesmo valor mantém a data; mudar substitui', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const a = await avaliar(alerta, p.auth, { valor: 'util' });
      expect(a.statusCode).toBe(200);
      expect(a.json()).toEqual({ alerta_id: alerta, valor: 'util', avaliado_em: '2026-11-01T12:00:00.000Z' });
      agora = new Date('2026-11-01T15:00:00Z');
      const auth2 = await reabrir(p.userId);
      expect((await avaliar(alerta, auth2, { valor: 'util' })).json().avaliado_em).toBe('2026-11-01T12:00:00.000Z');
      const mudou = await avaliar(alerta, auth2, { valor: 'nao_util' });
      expect(mudou.json()).toMatchObject({ valor: 'nao_util', avaliado_em: '2026-11-01T15:00:00.000Z' });
      expect((await pool.query(`SELECT count(*)::int AS n FROM avaliacoes WHERE alert_id = $1`, [alerta])).rows[0].n).toBe(1);
      const outra = await pessoa();
      await avaliar(alerta, outra.auth, { valor: 'util' });
      expect((await pool.query(`SELECT count(*)::int AS n FROM avaliacoes WHERE alert_id = $1`, [alerta])).rows[0].n).toBe(2);
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('valor inválido dá 422; alerta que a pessoa não poderia ver dá 404; termos pendentes dão 403', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      expect((await avaliar(alerta, p.auth, { valor: 'otimo' })).json().campos[0].campo).toBe('valor');
      expect((await avaliar(alerta, p.auth, {})).statusCode).toBe(422);
      const rej = await semear({ loja, produto, revisao: 'rejeitado', decisao: 'somente_feed' });
      expect((await avaliar(rej.alerta, p.auth, { valor: 'util' })).statusCode).toBe(404);
      expect((await avaliar(randomUUID(), p.auth, { valor: 'util' })).statusCode).toBe(404);
      expect((await avaliar(alerta, (await pessoa({ termos: false })).auth, { valor: 'util' })).json().codigo).toBe('termos_pendentes');
    });
  });

  // ---------------------------------------------------------------- denúncia
  describe('PUT /v1/alertas/{id}/denuncia', () => {
    const denunciar = (id: string, auth: Record<string, string>, motivo: unknown = 'preco_errado') => app.inject({ method: 'PUT', url: `/v1/alertas/${id}/denuncia`, headers: auth, payload: { motivo } });
    const escondida = async (oferta: string) => (await pool.query(`SELECT escondida_em FROM offers WHERE id = $1`, [oferta])).rows[0].escondida_em !== null;
    /** Pessoas que abriram o alerta (a "base de interesse"), sem passar pela API. */
    async function basePessoas(alerta: string, n: number, diasAtras = 1) {
      for (let i = 0; i < n; i++) {
        const u = (await pool.query(`INSERT INTO users (tenant_id, email) VALUES ($1,$2) RETURNING id`, [tenantId, `base-${randomUUID()}@x.com`])).rows[0].id;
        await pool.query(`INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em) VALUES ($1,$2,$3,'aberto','push',$4)`, [tenantId, u, alerta, new Date(agora.getTime() - diasAtras * 86_400_000)]);
      }
    }

    it('primeira denúncia dá 201; repetir troca só o motivo (200) sem contar duas vezes nem mudar a data', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta } = await semear({ loja, produto });
      const a = await denunciar(alerta, p.auth, 'preco_errado');
      expect(a.statusCode).toBe(201);
      expect(a.json()).toEqual({ alerta_id: alerta, motivo: 'preco_errado', denunciado_em: '2026-11-01T12:00:00.000Z' });
      agora = new Date('2026-11-01T14:00:00Z');
      const b = await denunciar(alerta, await reabrir(p.userId), 'sem_estoque');
      expect(b.statusCode).toBe(200);
      expect(b.json()).toEqual({ alerta_id: alerta, motivo: 'sem_estoque', denunciado_em: '2026-11-01T12:00:00.000Z' });
      expect((await pool.query(`SELECT count(*)::int AS n FROM denuncias WHERE alert_id = $1`, [alerta])).rows[0].n).toBe(1);
      agora = new Date('2026-11-01T12:00:00Z');
    });

    it('item de pouca saída: duas pessoas diferentes escondem a oferta e abrem o caso com os números', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta, oferta } = await semear({ loja, produto });
      await denunciar(alerta, p.auth, 'preco_errado');
      expect(await escondida(oferta)).toBe(false);
      await denunciar(alerta, p.auth, 'sem_estoque'); // a mesma pessoa de novo não conta
      expect(await escondida(oferta)).toBe(false);
      const segunda = await pessoa();
      await denunciar(alerta, segunda.auth, 'sem_estoque');
      expect(await escondida(oferta)).toBe(true);
      const caso = (await pool.query(`SELECT situacao, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque FROM casos_denuncia WHERE alert_id = $1`, [alerta])).rows[0];
      expect(caso).toEqual({ situacao: 'escondida', denuncias: 2, pessoas_base: 0, limite: 2, motivo_preco_errado: 0, motivo_sem_estoque: 2 });
      expect(ids(await feed((await pessoa()).auth))).not.toContain(alerta); // some para todos
      expect((await app.inject({ method: 'GET', url: `/v1/alertas/${alerta}`, headers: p.auth })).json().situacao).toBe('em_revisao');
    });

    it('item de muita saída: o limite sobe com a base (10% de 30 pessoas = 3) e só conta abertura recente', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta, oferta } = await semear({ loja, produto });
      await basePessoas(alerta, 30);
      await basePessoas(alerta, 50, 8); // fora da janela de 7 dias: não entra na base
      await denunciar(alerta, p.auth);
      await denunciar(alerta, (await pessoa()).auth);
      expect(await escondida(oferta)).toBe(false);
      await denunciar(alerta, (await pessoa()).auth);
      expect(await escondida(oferta)).toBe(true);
      expect((await pool.query(`SELECT pessoas_base, limite, denuncias FROM casos_denuncia WHERE alert_id = $1`, [alerta])).rows[0]).toEqual({ pessoas_base: 30, limite: 3, denuncias: 3 });
    });

    it('caso já resolvido (restaurado) não esconde de novo com denúncia nova do mesmo alerta', async () => {
      const { loja, produto, p } = await cenario();
      const { alerta, oferta } = await semear({ loja, produto });
      await denunciar(alerta, p.auth);
      await denunciar(alerta, (await pessoa()).auth);
      expect(await escondida(oferta)).toBe(true);
      await pool.query(`UPDATE casos_denuncia SET situacao = 'restaurada', resolucao = 'restaurar', resolucao_em = now() WHERE alert_id = $1`, [alerta]);
      await pool.query(`UPDATE offers SET escondida_em = NULL WHERE id = $1`, [oferta]);
      await denunciar(alerta, (await pessoa()).auth);
      expect(await escondida(oferta)).toBe(false);
    });

    it('o pipeline solta a oferta escondida quando o preço muda, e não quando só é recoletada', async () => {
      const { loja, produto } = await cenario();
      const { oferta } = await semear({ loja, produto, escondida: true });
      const linha = (await pool.query(`SELECT id_externo, source_id FROM offers WHERE id = $1`, [oferta])).rows[0];
      const bruta = (preco: number) => ({
        idExterno: linha.id_externo, titulo: 't', descricao: null, gtin: null, marca: null, precoCentavos: preco, condicao: null, categoriaFonte: 'x',
        lojaIdExterno: 'l', link: 'https://www.drogasmil.com.br/p/x', linkAfiliado: false, disponivel: true, validaDe: null, validaAte: null,
        frete: { status: 'a_confirmar' as const, centavos: null },
      });
      const ids_ = { tenantId, productId: produto, storeId: loja, sourceId: linha.source_id };
      await gravarOferta(pool, ids_, bruta(5990) as never, 99.8, agora); // mesmo preço
      expect(await escondida(oferta)).toBe(true);
      await gravarOferta(pool, ids_, bruta(4990) as never, 83.1, agora); // preço novo
      expect(await escondida(oferta)).toBe(false);
    });

    it('promoção encerrada não se denuncia (404); motivo inválido dá 422; termos pendentes 403', async () => {
      const { loja, produto, p } = await cenario();
      const enc = await semear({ loja, produto, disponivel: false });
      const ativa = await semear({ loja, produto });
      expect((await denunciar(enc.alerta, p.auth)).statusCode).toBe(404);
      expect((await denunciar(ativa.alerta, p.auth, 'chato')).json().campos[0].campo).toBe('motivo');
      expect((await denunciar(ativa.alerta, (await pessoa({ termos: false })).auth)).json().codigo).toBe('termos_pendentes');
    });

    it('limite de 20 denúncias por dia por conta', async () => {
      const { loja, produto, p } = await cenario();
      for (let i = 0; i < 20; i++) {
        const { alerta } = await semear({ loja, produto });
        expect((await denunciar(alerta, p.auth)).statusCode).toBe(201);
      }
      const { alerta } = await semear({ loja, produto });
      const r = await denunciar(alerta, p.auth);
      expect(r.statusCode).toBe(429);
      expect(r.json().codigo).toBe('muitas_requisicoes');
      expect(r.headers['retry-after']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------- pipeline
  describe('gravação do produto pelo pipeline', () => {
    it('grava as advertências da NBCAL e a chave da marca, e atualiza quando o produto já existe', async () => {
      const base = {
        gtin: null, chaveHash: `h-${randomUUID()}`, familiaChave: 'f', marca: 'Nestlé Ninho', nome: 'Cereal', categoria: 'gestacao',
        embalagem: { quantidade: 0.4, unidade: 'kg' as const }, ehMedicamento: false, advertencias: ['nbcal_apos_6_meses' as const],
      };
      const id = await gravarProduto(pool, tenantId, base);
      let linha = (await pool.query(`SELECT advertencias, marca_chave FROM products WHERE id = $1`, [id])).rows[0];
      expect(linha).toEqual({ advertencias: ['nbcal_apos_6_meses'], marca_chave: 'nestle-ninho' });
      await gravarProduto(pool, tenantId, { ...base, advertencias: [] });
      linha = (await pool.query(`SELECT advertencias FROM products WHERE id = $1`, [id])).rows[0];
      expect(linha.advertencias).toEqual([]); // a regra mudou: o banco acompanha
    });

    it('grava subcategoria e foto; coleta sem foto não apaga a que já existe, e a subcategoria acompanha a regra', async () => {
      const base = {
        gtin: null, chaveHash: `h-${randomUUID()}`, familiaChave: 'f', marca: 'Marca', nome: 'Berço', categoria: 'bebe', subcategoria: 'quarto' as string | null,
        imagemUrl: 'https://img.exemplo.test/a.jpg' as string | null, embalagem: { quantidade: 1, unidade: 'un' as const }, ehMedicamento: false, advertencias: [],
      };
      const id = await gravarProduto(pool, tenantId, base);
      const ler = async () => (await pool.query(`SELECT subcategoria, imagem_url FROM products WHERE id = $1`, [id])).rows[0];
      expect(await ler()).toEqual({ subcategoria: 'quarto', imagem_url: 'https://img.exemplo.test/a.jpg' });
      await gravarProduto(pool, tenantId, { ...base, imagemUrl: null });
      expect((await ler()).imagem_url).toBe('https://img.exemplo.test/a.jpg');
      await gravarProduto(pool, tenantId, { ...base, imagemUrl: 'https://img.exemplo.test/b.jpg', subcategoria: null });
      expect(await ler()).toEqual({ subcategoria: null, imagem_url: 'https://img.exemplo.test/b.jpg' });
      // Galeria: a coleta nova troca a lista; coleta sem fotos (lista vazia) não apaga a que já existe.
      const fotos = async () => (await pool.query(`SELECT imagens FROM products WHERE id = $1`, [id])).rows[0].imagens;
      expect(await fotos()).toEqual([]);
      await gravarProduto(pool, tenantId, { ...base, imagens: ['https://img.exemplo.test/1.jpg', 'https://img.exemplo.test/2.jpg'] });
      expect(await fotos()).toEqual(['https://img.exemplo.test/1.jpg', 'https://img.exemplo.test/2.jpg']);
      await gravarProduto(pool, tenantId, { ...base, imagens: [] });
      expect(await fotos()).toHaveLength(2);
      await gravarProduto(pool, tenantId, { ...base, imagens: ['https://img.exemplo.test/3.jpg'] });
      expect(await fotos()).toEqual(['https://img.exemplo.test/3.jpg']);
    });

    it('chave da marca: sem acento, minúscula, hifenizada, null quando não sobra nada', () => {
      expect(chaveDaMarca('Ypê')).toBe('ype');
      expect(chaveDaMarca('  Johnson & Johnson’s Baby ')).toBe('johnson-johnson-s-baby');
      expect(chaveDaMarca('!!!')).toBeNull();
      expect(chaveDaMarca(null)).toBeNull();
    });
  });
});
