// API v1 ponta a ponta contra Postgres real. Roda só com TEST_DATABASE_URL apontando para um banco
// cujo nome termina em "_teste": o esquema public é apagado e recriado no início.
import { generateKeyPairSync, sign } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MensagemCodigo } from '../auth/email.js';
import { LimitadorMemoria } from '../auth/limitador.js';
import { migrate } from '../db/migrate.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { buildApp } from './app.js';
import { ResolvedorTenantsDb } from './tenants.js';

const URL_TESTE = process.env.TEST_DATABASE_URL;
const AUD = 'cliente-web.apps.googleusercontent.com';
const H = 3_600_000;

describe.skipIf(URL_TESTE === undefined)('API v1 contra Postgres', () => {
  const pool = new pg.Pool({ connectionString: URL_TESTE, max: 5 });
  let agora = new Date('2026-09-28T15:00:00Z');
  const codigos = new Map<string, string>();
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const app = buildApp({
    healthChecks: [],
    v1: {
      db: pool,
      tenants: new ResolvedorTenantsDb(pool, async (slug) => {
        const c = await carregarConfigTenant('padrao');
        c.app.auth.googleClientIds = slug === 'padrao' ? [AUD] : [];
        return { ...c, slug };
      }),
      email: { enviarCodigo: async (m: MensagemCodigo) => void codigos.set(m.para, m.codigo) },
      limitador: new LimitadorMemoria(() => agora),
      chavesGoogle: { chave: async (kid) => (kid === 'k1' ? publicKey : null) },
      codigoChave: Buffer.from('chave-de-teste-com-mais-de-32-caracteres'),
      agora: () => agora,
    },
  });
  const ids: Record<string, string> = {};

  type Req = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string; token?: string; tenant?: string; body?: unknown };
  const req = ({ method = 'GET', url, token, tenant = 'padrao', body }: Req) =>
    app.inject({
      method,
      url,
      headers: { 'x-tenant': tenant, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { payload: body as object } : {}),
    });
  const sql = (q: string, p: unknown[] = []) => pool.query(q, p);

  async function entrarPorCodigo(email: string): Promise<{ token: string; userId: string; novo: boolean }> {
    expect((await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } })).statusCode).toBe(202);
    const r = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: codigos.get(email.toLowerCase()) } });
    expect(r.statusCode).toBe(200);
    return { token: r.json().token, userId: r.json().usuario.id, novo: r.json().novoUsuario };
  }

  async function aceitar(token: string): Promise<void> {
    expect((await req({ method: 'PUT', url: '/v1/eu/termos', token, body: { versao: 'rascunho-2026-09-28' } })).statusCode).toBe(200);
  }

  function idToken(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const dados = `${b64({ alg: 'RS256', kid: 'k1' })}.${b64(payload)}`;
    return `${dados}.${sign('sha256', Buffer.from(dados), privateKey).toString('base64url')}`;
  }
  const google = (sub: string, email: string) =>
    idToken({ iss: 'accounts.google.com', aud: AUD, sub, email, email_verified: true, exp: agora.getTime() / 1000 + 600 });

  beforeAll(async () => {
    if (!/_teste(\?|$)/.test(new URL(URL_TESTE!).pathname)) throw new Error('TEST_DATABASE_URL precisa apontar para banco *_teste');
    const c = await pool.connect();
    try {
      await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await migrate(c);
    } finally {
      c.release();
    }
    await sql(`INSERT INTO tenants (slug, nome) VALUES ('outro', 'Outro tenant')`);
    ids.tenant = (await sql(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
    ids.outroTenant = (await sql(`SELECT id FROM tenants WHERE slug = 'outro'`)).rows[0].id;
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('configuração pública e tenant desconhecido', async () => {
    const r = await req({ url: '/v1/configuracao' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ nome: 'economae', login: { email: true, google: true }, planos: { gratuito: { maxCeps: 1 } } });
    expect(r.json().categorias).toContainEqual({ id: 'limpeza', nome: 'Limpeza' });
    expect((await req({ url: '/v1/configuracao', tenant: 'nao-existe' })).json().erro.codigo).toBe('TENANT_INVALIDO');
  });

  it('código por e-mail: errado, certo, reuso', async () => {
    const email = 'Ana@Exemplo.com';
    expect((await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } })).json()).toEqual({ validadeMinutos: 10 });
    const certo = codigos.get('ana@exemplo.com')!;
    const errado = certo === '000000' ? '111111' : '000000';
    const r1 = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: errado } });
    expect([r1.statusCode, r1.json().erro.codigo]).toEqual([401, 'CODIGO_INVALIDO']);
    const r2 = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email: 'ana@exemplo.com', codigo: certo } });
    expect(r2.statusCode).toBe(200);
    expect(r2.json()).toMatchObject({ novoUsuario: true, usuario: { email: 'ana@exemplo.com', plano: 'gratuito', termos: { pendente: true } } });
    const r3 = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: certo } });
    expect(r3.statusCode).toBe(401);
    // Segundo login não cria outra conta.
    expect((await entrarPorCodigo(email)).novo).toBe(false);
  });

  it('código expira e esgota tentativas', async () => {
    const email = 'bruno@exemplo.com';
    await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } });
    const certo = codigos.get(email)!;
    const errado = certo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: errado } });
    const r = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: certo } });
    expect([r.statusCode, r.json().erro.codigo]).toEqual([429, 'TENTATIVAS_ESGOTADAS']);

    await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } });
    agora = new Date(agora.getTime() + 11 * 60_000);
    const r2 = await req({ method: 'POST', url: '/v1/auth/email/verificar', body: { email, codigo: codigos.get(email) } });
    expect(r2.statusCode).toBe(401);
  });

  it('limite de pedidos de código por e-mail por hora', async () => {
    const email = 'carla@exemplo.com';
    for (let i = 0; i < 5; i++) expect((await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } })).statusCode).toBe(202);
    const r = await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } });
    expect([r.statusCode, r.json().erro.codigo]).toEqual([429, 'LIMITE_EXCEDIDO']);
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    agora = new Date(agora.getTime() + H + 1000);
    expect((await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email } })).statusCode).toBe(202);
  });

  it('requisição inválida e sessão ausente', async () => {
    const r = await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email: 'nao-e-email' } });
    expect([r.statusCode, r.json().erro.codigo]).toEqual([400, 'REQUISICAO_INVALIDA']);
    const extra = await req({ method: 'POST', url: '/v1/auth/email/codigo', body: { email: 'a@b.com', admin: true } });
    expect(extra.statusCode).toBe(400);
    // Sem sessão, 401 vem antes da validação do corpo.
    const s = await req({ method: 'PUT', url: '/v1/preferencias', body: { lixo: 1 } });
    expect([s.statusCode, s.json().erro.codigo]).toEqual([401, 'SESSAO_INVALIDA']);
    expect((await req({ url: '/v1/eu', token: 'x'.repeat(43) })).statusCode).toBe(401);
  });

  it('login com Google: cria, vincula a conta de código e recusa outro Google no mesmo e-mail', async () => {
    const novo = await req({ method: 'POST', url: '/v1/auth/google', body: { idToken: google('g-1', 'dani@exemplo.com') } });
    expect(novo.json()).toMatchObject({ novoUsuario: true, usuario: { email: 'dani@exemplo.com' } });

    const porCodigo = await entrarPorCodigo('edu@exemplo.com');
    const vinculo = await req({ method: 'POST', url: '/v1/auth/google', body: { idToken: google('g-2', 'Edu@Exemplo.com') } });
    expect(vinculo.json()).toMatchObject({ novoUsuario: false, usuario: { id: porCodigo.userId } });

    const outro = await req({ method: 'POST', url: '/v1/auth/google', body: { idToken: google('g-3', 'edu@exemplo.com') } });
    expect([outro.statusCode, outro.json().erro.codigo]).toEqual([409, 'EMAIL_VINCULADO_A_OUTRO_GOOGLE']);
    const ruim = await req({ method: 'POST', url: '/v1/auth/google', body: { idToken: google('g-1', 'dani@exemplo.com') + 'x' } });
    expect(ruim.json().erro.codigo).toBe('TOKEN_GOOGLE_INVALIDO');
    const desligado = await req({ method: 'POST', url: '/v1/auth/google', tenant: 'outro', body: { idToken: google('g-1', 'dani@exemplo.com') } });
    expect(desligado.json().erro.codigo).toBe('LOGIN_GOOGLE_INDISPONIVEL');
  });

  it('termos, consentimento, isolamento de tenant e logout', async () => {
    const { token } = await entrarPorCodigo('fabi@exemplo.com');
    expect((await req({ url: '/v1/preferencias', token })).json().erro.codigo).toBe('TERMOS_PENDENTES');
    const velho = await req({ method: 'PUT', url: '/v1/eu/termos', token, body: { versao: '2020-01-01' } });
    expect([velho.statusCode, velho.json().erro.codigo]).toEqual([409, 'TERMOS_DESATUALIZADOS']);
    await aceitar(token);
    expect((await req({ url: '/v1/preferencias', token })).json()).toEqual({
      categorias: [], ceps: [], silencio: null, limiteDiario: null, completas: false,
    });

    const c1 = await req({ method: 'PUT', url: '/v1/eu/notificacoes', token, body: { consentidas: true } });
    const primeiraData = c1.json().notificacoes.consentidasEm;
    agora = new Date(agora.getTime() + 60_000);
    const c2 = await req({ method: 'PUT', url: '/v1/eu/notificacoes', token, body: { consentidas: true } });
    expect(c2.json().notificacoes.consentidasEm).toBe(primeiraData);
    const c3 = await req({ method: 'PUT', url: '/v1/eu/notificacoes', token, body: { consentidas: false } });
    expect(c3.json().notificacoes).toEqual({ consentidas: false, consentidasEm: null });

    // Token de um tenant não abre sessão em outro.
    expect((await req({ url: '/v1/eu', token, tenant: 'outro' })).statusCode).toBe(401);
    expect((await req({ method: 'POST', url: '/v1/auth/sair', token })).statusCode).toBe(204);
    expect((await req({ url: '/v1/eu', token })).statusCode).toBe(401);
  });

  it('sessão desliza com o uso e expira sem uso', async () => {
    const { token } = await entrarPorCodigo('gabi@exemplo.com');
    agora = new Date(agora.getTime() + 80 * 24 * H);
    expect((await req({ url: '/v1/eu', token })).statusCode).toBe(200);
    agora = new Date(agora.getTime() + 80 * 24 * H);
    expect((await req({ url: '/v1/eu', token })).statusCode).toBe(200);
    agora = new Date(agora.getTime() + 91 * 24 * H);
    expect((await req({ url: '/v1/eu', token })).statusCode).toBe(401);
  });

  it('preferências: região, plano e ida e volta', async () => {
    const { token, userId } = await entrarPorCodigo('hugo@exemplo.com');
    await aceitar(token);
    const put = (body: unknown) => req({ method: 'PUT', url: '/v1/preferencias', token, body });
    const valida = { categorias: ['limpeza', 'cuidados_pessoais'], ceps: ['01310100'], silencio: { inicio: '22:00', fim: '07:00' }, limiteDiario: 3 };

    expect((await put({ ...valida, ceps: ['20040002'] })).json().erro.codigo).toBe('CEP_FORA_DA_REGIAO');
    expect((await put({ ...valida, categorias: ['eletronicos'] })).json().erro.codigo).toBe('CATEGORIA_DESCONHECIDA');
    expect((await put({ ...valida, ceps: ['01310-100'] })).statusCode).toBe(400);
    const doisCeps = { ...valida, ceps: ['01310100', '13560000'] };
    expect((await put(doisCeps)).json().erro.codigo).toBe('LIMITE_DO_PLANO');

    const salvo = await put(valida);
    expect(salvo.json()).toEqual({ ...valida, completas: true });
    expect((await req({ url: '/v1/preferencias', token })).json()).toEqual({ ...valida, completas: true });

    await sql(
      `INSERT INTO subscriptions (tenant_id, user_id, plano, status, origem, iniciada_em, expira_em)
       VALUES ($1, $2, 'premium_mensal', 'ativa', 'google_play', $3, $4)`,
      [ids.tenant, userId, agora, new Date(agora.getTime() + 30 * 24 * H)],
    );
    expect((await req({ url: '/v1/eu', token })).json()).toMatchObject({ plano: 'premium', limites: { maxCeps: 3 } });
    expect((await put(doisCeps)).statusCode).toBe(200);
  });

  describe('feed e detalhe', () => {
    let token = '';

    async function loja(nome: string, status: string, faixa: [string, string, number] | null): Promise<string> {
      const id = (
        await sql(`INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao) VALUES ($1, $2, $2, 'online', $3, 0.9) RETURNING id`, [
          ids.tenant, nome, status,
        ])
      ).rows[0].id;
      if (faixa) {
        await sql(`INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1, $2, $3, $4, $5)`, [
          ids.tenant, id, ...faixa,
        ]);
      }
      return id;
    }

    let seq = 0;
    /** Oferta com N alertas (o último é o que vale), coletada em `coletadaHa` horas atrás. */
    async function oferta(o: {
      loja: string;
      categoria?: string;
      decisao?: string;
      disponivel?: boolean;
      coletadaHa?: number;
      alertas?: number;
      tenant?: string;
      fonte?: string;
    }): Promise<string> {
      seq++;
      const tenant = o.tenant ?? ids.tenant;
      const produto = (
        await sql(
          `INSERT INTO products (tenant_id, chave_hash, familia_chave, nome, categoria, quantidade, unidade)
           VALUES ($1, $2, $2, $3, $4, 0.2, 'l') RETURNING id`,
          [tenant, `p${seq}`, `Produto ${seq} 200ml`, o.categoria ?? 'cuidados_pessoais'],
        )
      ).rows[0].id;
      const coletada = new Date(agora.getTime() - (o.coletadaHa ?? 1) * H);
      const id = (
        await sql(
          `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos, preco_por_unidade_centavos,
                               frete_status, disponivel, link, link_afiliado, coletada_em, ultima_decisao, ultimo_motivo, avaliada_em)
           VALUES ($1, $2, $3, $4, $5, 2000, 10000, 'a_confirmar', $6, 'https://loja/x', true, $7, $8, 'teste', $7) RETURNING id`,
          [tenant, produto, o.loja, o.fonte ?? ids.fonte, `x${seq}`, o.disponivel ?? true, coletada, o.decisao ?? 'notificar'],
        )
      ).rows[0].id;
      for (let i = 0; i < (o.alertas ?? 1); i++) {
        await sql(
          `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos,
                               preco_efetivo_por_unidade, preco_referencia_por_unidade, entrega_a_confirmar, criado_em)
           VALUES ($1, $2, $3, $4, 80, 'notificar', 'teste', 2000, 10000, 15000, true, $5)`,
          [tenant, id, o.loja, `p${seq}`, new Date(coletada.getTime() - (o.alertas ?? 1) * 1000 + i * 1000 + seq)],
        );
      }
      // Histórico de 3 dias para o detalhe.
      for (let d = 3; d >= 1; d--) {
        await sql(
          `INSERT INTO price_history (tenant_id, product_id, store_id, preco_centavos, preco_por_unidade_centavos, observado_em)
           VALUES ($1, $2, $3, 3000, 15000, $4)`,
          [tenant, produto, o.loja, new Date(agora.getTime() - d * 24 * H)],
        );
      }
      return id;
    }

    beforeAll(async () => {
      ids.fonte = (
        await sql(
          `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
           VALUES ($1, 'teste', 'A', 120, 'SP', 'aprovada', 'alta', 'teste', true) RETURNING id`,
          [ids.tenant],
        )
      ).rows[0].id;
      const sp = await loja('Loja SP', 'aprovada', ['01000000', '19999999', 2]);
      const rj = await loja('Loja RJ', 'aprovada', ['20000000', '28999999', 1]);
      const bloqueada = await loja('Loja bloqueada', 'bloqueada', ['01000000', '19999999', 1]);
      ids.ativa = await oferta({ loja: sp });
      ids.duasVezes = await oferta({ loja: sp, alertas: 2 });
      ids.terceira = await oferta({ loja: sp, categoria: 'limpeza' });
      ids.medicamento = await oferta({ loja: sp, categoria: 'medicamentos_isentos', decisao: 'somente_feed' });
      ids.descartada = await oferta({ loja: sp, decisao: 'descartar' });
      ids.indisponivel = await oferta({ loja: sp, disponivel: false });
      ids.velha = await oferta({ loja: sp, coletadaHa: 7 });
      ids.foraDoCep = await oferta({ loja: rj });
      ids.lojaBloqueada = await oferta({ loja: bloqueada });
      ids.categoriaNaoEscolhida = await oferta({ loja: sp, categoria: 'maquiagem' });
      ids.semAlerta = await oferta({ loja: sp, alertas: 0 });

      const outraFonte = (
        await sql(
          `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal)
           VALUES ($1, 'teste', 'A', 120, 'SP', 'alta', 'teste') RETURNING id`,
          [ids.outroTenant],
        )
      ).rows[0].id;
      const lojaOutro = (
        await sql(`INSERT INTO stores (tenant_id, rede, nome, tipo) VALUES ($1, 'X', 'X', 'online') RETURNING id`, [ids.outroTenant])
      ).rows[0].id;
      ids.doOutroTenant = await oferta({ tenant: ids.outroTenant, loja: lojaOutro, fonte: outraFonte });

      ({ token } = await entrarPorCodigo('iris@exemplo.com'));
      await aceitar(token);
    });

    it('sem preferências: 409', async () => {
      expect((await req({ url: '/v1/feed', token })).json().erro.codigo).toBe('PREFERENCIAS_INCOMPLETAS');
    });

    it('mostra só oferta ativa, na categoria, com entrega para o CEP; uma vez por oferta; paginado', async () => {
      const prefs = { categorias: ['cuidados_pessoais', 'limpeza', 'medicamentos_isentos'], ceps: ['14010000'], silencio: null, limiteDiario: null };
      expect((await req({ method: 'PUT', url: '/v1/preferencias', token, body: prefs })).statusCode).toBe(200);

      const vistos: string[] = [];
      let cursor: string | null = null;
      let paginas = 0;
      do {
        const r = await req({ url: `/v1/feed?limite=2${cursor ? `&cursor=${cursor}` : ''}`, token });
        expect(r.statusCode).toBe(200);
        vistos.push(...r.json().itens.map((i: { ofertaId: string }) => i.ofertaId));
        cursor = r.json().proximoCursor;
        paginas++;
      } while (cursor !== null);
      expect(vistos.sort()).toEqual([ids.ativa, ids.duasVezes, ids.terceira, ids.medicamento].sort());
      expect(paginas).toBe(2);

      const item = (await req({ url: '/v1/feed', token })).json().itens.find((i: { ofertaId: string }) => i.ofertaId === ids.ativa);
      expect(item).toMatchObject({
        precoCentavos: 2000,
        precoReferenciaCentavos: 3000,
        queda: 0.3333,
        prazoEntregaDias: 2,
        linkAfiliado: true,
        medicamento: false,
        loja: { nome: 'Loja SP' },
      });
      expect(item).not.toHaveProperty('link');
      const med = (await req({ url: '/v1/feed?categoria=medicamentos_isentos', token })).json().itens;
      expect(med.map((i: { ofertaId: string; medicamento: boolean }) => [i.ofertaId, i.medicamento])).toEqual([[ids.medicamento, true]]);
    });

    it('filtros do feed recusam CEP e categoria fora das preferências', async () => {
      expect((await req({ url: '/v1/feed?cep=01310100', token })).json().erro.codigo).toBe('CEP_NAO_CADASTRADO');
      expect((await req({ url: '/v1/feed?categoria=maquiagem', token })).json().erro.codigo).toBe('CATEGORIA_NAO_ESCOLHIDA');
      expect((await req({ url: '/v1/feed?cursor=abc', token })).json().erro.codigo).toBe('CURSOR_INVALIDO');
    });

    it('detalhe: ativa com link e histórico; encerrada sem link; sem alerta e de outro tenant, 404', async () => {
      const ativa = (await req({ url: `/v1/ofertas/${ids.ativa}`, token })).json();
      expect(ativa).toMatchObject({ ativa: true, link: 'https://loja/x' });
      expect(ativa.historico).toHaveLength(3);
      // 150,00/l no histórico, em embalagem de 200 ml.
      expect(ativa.historico.map((h: { precoEquivalenteCentavos: number }) => h.precoEquivalenteCentavos)).toEqual([3000, 3000, 3000]);
      expect(ativa.historico[2].dia < ativa.historico[0].dia).toBe(false);

      for (const id of [ids.indisponivel, ids.descartada, ids.velha, ids.lojaBloqueada]) {
        expect((await req({ url: `/v1/ofertas/${id}`, token })).json()).toMatchObject({ ativa: false, link: null });
      }
      for (const id of [ids.semAlerta, ids.doOutroTenant, '00000000-0000-4000-8000-000000000000']) {
        expect((await req({ url: `/v1/ofertas/${id}`, token })).json().erro.codigo).toBe('OFERTA_NAO_ENCONTRADA');
      }
      expect((await req({ url: '/v1/ofertas/nao-e-uuid', token })).statusCode).toBe(400);
    });
  });

  it('exclusão de conta apaga dados pessoais', async () => {
    const { token, userId } = await entrarPorCodigo('joao@exemplo.com');
    await aceitar(token);
    await req({ method: 'PUT', url: '/v1/preferencias', token, body: { categorias: ['limpeza'], ceps: ['01310100'], silencio: null, limiteDiario: null } });
    expect((await req({ method: 'DELETE', url: '/v1/eu', token })).statusCode).toBe(204);
    expect((await req({ url: '/v1/eu', token })).statusCode).toBe(401);
    for (const tabela of ['users WHERE id', 'user_preferences WHERE user_id', 'sessoes WHERE user_id']) {
      expect((await sql(`SELECT count(*)::int AS n FROM ${tabela} = $1`, [userId])).rows[0].n).toBe(0);
    }
    expect((await sql(`SELECT count(*)::int AS n FROM auth_codigos WHERE email = 'joao@exemplo.com'`)).rows[0].n).toBe(0);
  });
});
