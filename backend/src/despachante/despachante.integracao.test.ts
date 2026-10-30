// Despachante (fase 4) contra Postgres de verdade: quem recebe aviso de um alerta, o que vira push e por quê, e os avisos dos
// produtos seguidos. O FCM é um enviador falso que guarda as chamadas.
import { beforeEach, describe, expect, it } from 'vitest';
import { ambienteDeTeste, URL_BASE } from '../api/testeAmbiente.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';
import { despachar } from './despachar.js';
import type { EnviadorPush, ResultadoEnvio } from './fcm.js';
import { avaliarSeguidos, gerarAvisosDeAlertas } from './gerar.js';
import { enviarPendentes } from './enviar.js';
import type { MensagemPush } from './texto.js';

const executar = URL_BASE ? describe : describe.skip;

class EnviadorFalso implements EnviadorPush {
  chamadas: Array<{ token: string; m: MensagemPush }> = [];
  respostas = new Map<string, ResultadoEnvio>();
  async enviar(token: string, m: MensagemPush): Promise<ResultadoEnvio> {
    this.chamadas.push({ token, m });
    return this.respostas.get(token) ?? { tipo: 'ok' };
  }
}

executar('despachante (Postgres)', () => {
  const t = ambienteDeTeste('teste_despachante');
  const { e } = t;
  let config: ConfigTenant;
  const tenant = () => ({ tenantId: e.tenantId, config });
  const horas = (n: number) => new Date(e.agora.getTime() + n * 3_600_000);
  const dias = (n: number) => new Date(e.agora.getTime() + n * 86_400_000);
  const avisosDe = async (userId: string) =>
    (await e.pool.query(`SELECT id, tipo, origem, product_id, store_id, alert_id, preco_centavos, queda::float AS queda, push, push_em FROM avisos WHERE user_id = $1 ORDER BY criado_em, id`, [userId])).rows;
  const pushDe = async (id: string) => (await e.pool.query(`SELECT push FROM avisos WHERE id = $1`, [id])).rows[0].push as string;

  // Cada caso começa sem pessoas e sem alerta por passar: quem foi criado num caso não recebe aviso do seguinte.
  beforeEach(async () => {
    await e.pool.query(`DELETE FROM users`);
    await e.pool.query(`UPDATE alerts SET avisos_gerados_em = now() WHERE avisos_gerados_em IS NULL`);
  });

  /** Pessoa com consentimento de notificação e um aparelho registrado pela rota. */
  async function comAparelho(o: { categorias?: string[]; ceps?: string[]; token?: string } = {}) {
    const p = await t.pessoa(o);
    expect((await t.chamar('PUT', '/v1/me/consentimentos', p.auth, { notificacoes: true })).statusCode).toBe(200);
    const token = o.token ?? `token-${p.userId}`;
    expect((await t.chamar('PUT', '/v1/dispositivo', p.auth, { token, plataforma: 'android', versao_app: '0.5.0' })).statusCode).toBe(204);
    return { ...p, token };
  }

  /** Loja, produto e oferta ativa; `alerta` cria um alerta do motor na oferta. */
  async function promocao(o: { categoria?: string; preco?: number; decisao?: string; revisao?: string; nome?: string; marcaChave?: string } = {}) {
    if (config === undefined) config = await carregarConfigTenant('padrao');
    const { loja, fonte } = await t.loja();
    const produto = await t.produto({ categoria: o.categoria ?? 'bebe', nome: o.nome ?? 'Fralda Pampers G', ...(o.marcaChave ? { marcaChave: o.marcaChave } : {}) });
    const oferta = await t.oferta({ produto, loja, fonte, preco: o.preco ?? 5990 });
    const alerta = await t.alerta({ oferta, loja, preco: o.preco ?? 5990, ...(o.decisao ? { decisao: o.decisao } : {}), ...(o.revisao ? { revisao: o.revisao } : {}) });
    return { loja, fonte, produto, oferta, alerta };
  }

  describe('avisos dos alertas', () => {
    it('quem escolheu a categoria e tem entrega no CEP recebe; quem não vê a oferta não', async () => {
      const escolheu = await t.pessoa({ categorias: ['bebe'] });
      const outraCategoria = await t.pessoa({ categorias: ['mamae'] });
      const foraDaArea = await t.pessoa({ categorias: ['bebe'], ceps: ['69900000'] });
      const semTermos = await t.pessoa({ categorias: ['bebe'], termos: false });
      const silenciouTudo = await t.pessoa({ categorias: ['bebe'] });
      const p = await promocao();
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'tudo')`, [e.tenantId, silenciouTudo.userId, p.loja]);

      const r = await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(r.avisos).toBe(1);
      expect(await avisosDe(escolheu.userId)).toEqual([
        expect.objectContaining({ tipo: 'promocao_excepcional', origem: 'categoria', product_id: p.produto, store_id: p.loja, alert_id: p.alerta, preco_centavos: 5990, queda: 0.3333, push: 'pendente', push_em: null }),
      ]);
      for (const x of [outraCategoria, foraDaArea, semTermos, silenciouTudo]) expect(await avisosDe(x.userId)).toEqual([]);
      // O alerta fica marcado: rodar de novo não repete.
      expect((await e.pool.query(`SELECT avisos_gerados_em FROM alerts WHERE id = $1`, [p.alerta])).rows[0].avisos_gerados_em).toEqual(e.agora);
      await e.pool.query(`UPDATE alerts SET avisos_gerados_em = NULL WHERE id = $1`, [p.alerta]);
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(await avisosDe(escolheu.userId)).toHaveLength(1);
    });

    it('alerta cuja oferta já acabou ou mudou de preço não gera aviso', async () => {
      const pessoa = await t.pessoa({ categorias: ['bebe'] });
      const acabou = await promocao();
      const mudou = await promocao();
      await e.pool.query(`UPDATE offers SET disponivel = false WHERE id = $1`, [acabou.oferta]);
      await e.pool.query(`UPDATE offers SET preco_centavos = 5490 WHERE id = $1`, [mudou.oferta]);
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(await avisosDe(pessoa.userId)).toEqual([]);
    });

    it('quem segue o produto decide pelo aviso dele, com a categoria escolhida ou não', async () => {
      const p = await promocao({ categoria: 'infantil' });
      const segueLigado = await t.pessoa({ categorias: ['bebe'] });
      const segueDesligado = await t.pessoa({ categorias: ['infantil'] });
      for (const [x, ligado] of [[segueLigado, true], [segueDesligado, false]] as const) {
        const r = await t.chamar('PUT', `/v1/seguidos/${p.produto}`, x.auth, { avisos: { promocao_excepcional: ligado, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false } });
        expect(r.statusCode).toBe(201);
      }
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(await avisosDe(segueLigado.userId)).toEqual([expect.objectContaining({ origem: 'seguido', alert_id: p.alerta })]);
      expect(await avisosDe(segueDesligado.userId)).toEqual([]);
    });

    it('só feed, rejeitado e velho demais não geram aviso; aguardando aprovação espera o operador', async () => {
      const pessoa = await t.pessoa({ categorias: ['bebe'] });
      const soFeed = await promocao({ decisao: 'somente_feed' });
      const rejeitado = await promocao({ decisao: 'aguardar_aprovacao', revisao: 'rejeitado' });
      const velho = await promocao();
      await e.pool.query(`UPDATE alerts SET criado_em = $2 WHERE id = $1`, [velho.alerta, horas(-49)]);
      const aguardando = await promocao({ decisao: 'aguardar_aprovacao', revisao: 'pendente' });
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(await avisosDe(pessoa.userId)).toEqual([]);
      const marcado = async (id: string) => (await e.pool.query(`SELECT avisos_gerados_em IS NOT NULL AS m FROM alerts WHERE id = $1`, [id])).rows[0].m;
      expect([await marcado(soFeed.alerta), await marcado(rejeitado.alerta), await marcado(velho.alerta), await marcado(aguardando.alerta)]).toEqual([true, true, true, false]);

      // Aprovado pelo operador, gera.
      expect(await avisosDe(pessoa.userId)).toEqual([]);
      await e.pool.query(`UPDATE alerts SET revisao_situacao = 'aprovado', revisao_em = $2 WHERE id = $1`, [aguardando.alerta, e.agora]);
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      expect(await avisosDe(pessoa.userId)).toEqual([expect.objectContaining({ alert_id: aguardando.alerta })]);
    });
  });

  describe('push', () => {
    it('com consentimento e aparelho, sai; o texto tem produto, preço, loja e queda', async () => {
      const p = await comAparelho({ categorias: ['bebe'] });
      const promo = await promocao({ nome: 'Fralda Pampers Confort Sec G 60 unidades' });
      const fcm = new EnviadorFalso();
      const r = await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(r.envio?.destinos).toEqual({ enviado: 1 });
      expect(fcm.chamadas).toHaveLength(1);
      expect(fcm.chamadas[0]!.token).toBe(p.token);
      expect(fcm.chamadas[0]!.m).toMatchObject({
        titulo: 'Promoção excepcional',
        corpo: 'Fralda Pampers Confort Sec G 60 unidades por R$ 59,90 na Drogasmil (33% abaixo do normal)',
        dados: { tipo: 'promocao_excepcional', produto_id: promo.produto, alerta_id: promo.alerta },
        colapso: promo.produto,
      });
      expect(await avisosDe(p.userId)).toEqual([expect.objectContaining({ push: 'enviado', push_em: e.agora })]);
      // A central mostra o que aconteceu com o push.
      const central = (await t.chamar('GET', '/v1/avisos', p.auth)).json();
      expect(central.itens[0].push).toEqual({ situacao: 'enviado', em: e.agora.toISOString() });
    });

    it('sem consentimento, sem aparelho, loja silenciada só de push e produto com advertência legal não saem', async () => {
      const semConsentimento = await t.pessoa({ categorias: ['bebe'] });
      const semAparelho = await t.pessoa({ categorias: ['bebe'] });
      expect((await t.chamar('PUT', '/v1/me/consentimentos', semAparelho.auth, { notificacoes: true })).statusCode).toBe(200);
      const silenciou = await comAparelho({ categorias: ['bebe'] });
      const promo = await promocao();
      await e.pool.query(`INSERT INTO silenciamentos (tenant_id, user_id, tipo, loja_id, alcance) VALUES ($1,$2,'loja',$3,'push')`, [e.tenantId, silenciou.userId, promo.loja]);
      const fcm = new EnviadorFalso();
      await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(fcm.chamadas).toEqual([]);
      expect((await avisosDe(semConsentimento.userId))[0].push).toBe('sem_consentimento');
      expect((await avisosDe(semAparelho.userId))[0].push).toBe('sem_aparelho');
      expect((await avisosDe(silenciou.userId))[0].push).toBe('silenciado');

      const comAdvertencia = await comAparelho({ categorias: ['bebe'] });
      const produto = await t.produto({ categoria: 'bebe', advertencias: ['NBCAL_ALEITAMENTO_2_ANOS'] });
      const aviso = await t.aviso({ userId: comAdvertencia.userId, produto, loja: promo.loja, tipo: 'voltou_estoque', preco: 5990 });
      await t.oferta({ produto, loja: promo.loja, fonte: promo.fonte });
      await enviarPendentes(e.pool, tenant(), e.agora, fcm);
      expect(await pushDe(aviso)).toBe('advertencia_legal');
      expect(fcm.chamadas).toEqual([]);
    });

    it('o mesmo produto não repete push sem novidade; limite diário da pessoa', async () => {
      const p = await comAparelho({ categorias: ['bebe'] });
      await e.pool.query(`UPDATE user_preferences SET limite_diario = 2 WHERE user_id = $1`, [p.userId]);
      const a = await promocao();
      const b = await promocao();
      const c = await promocao();
      await t.aviso({ userId: p.userId, produto: a.produto, loja: a.loja, tipo: 'voltou_estoque', preco: 5990 });
      const fcm = new EnviadorFalso();
      await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      const avisos = await avisosDe(p.userId);
      const porProduto = (prod: string) => avisos.filter((x) => x.product_id === prod).map((x) => x.push).sort();
      expect(porProduto(a.produto)).toEqual(['enviado', 'repetido']);
      // b e c nascem no mesmo instante: qual dos dois sai primeiro depende do id; o outro bate no limite de 2.
      expect([...porProduto(b.produto), ...porProduto(c.produto)].sort()).toEqual(['enviado', 'limite_diario']);
      const barrado = porProduto(b.produto)[0] === 'limite_diario' ? b : c;
      expect(fcm.chamadas).toHaveLength(2);
      // No dia seguinte (fuso do tenant) o limite volta; o produto barrado pelo limite nunca virou push, então sai.
      e.agora = horas(25);
      const amanha = await t.aviso({ userId: p.userId, produto: barrado.produto, loja: barrado.loja, tipo: 'voltou_estoque', preco: 5990, criadoEm: e.agora });
      await e.pool.query(`UPDATE offers SET coletada_em = $1`, [horas(-1)]);
      await enviarPendentes(e.pool, tenant(), e.agora, fcm);
      expect(await pushDe(amanha)).toBe('enviado');
    });

    it('repetição: sem abrir o push anterior, só sai mais barato (1%) ou de promoção nova; aberto, sai a qualquer hora', async () => {
      const p = await comAparelho({ categorias: ['bebe'] });
      await e.pool.query(`UPDATE user_preferences SET limite_diario = 10 WHERE user_id = $1`, [p.userId]);
      const promo = await promocao();
      const fcm = new EnviadorFalso();
      await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(fcm.chamadas).toHaveLength(1);
      const novo = async (preco: number) => {
        e.agora = new Date(e.agora.getTime() + 60 * 60_000);
        await e.pool.query(`UPDATE offers SET preco_centavos = $2, coletada_em = $3 WHERE id = $1`, [promo.oferta, preco, e.agora]);
        const id = await t.aviso({ userId: p.userId, produto: promo.produto, loja: promo.loja, tipo: 'voltou_estoque', preco, criadoEm: e.agora });
        await enviarPendentes(e.pool, tenant(), e.agora, fcm);
        return pushDe(id);
      };
      // Não abriu e o preço é o mesmo, mesmo um dia depois: repetido.
      e.agora = horas(24);
      expect(await novo(5990)).toBe('repetido');
      // 1% mais barato: sai.
      expect(await novo(5930)).toBe('enviado');
      // Promoção nova: a mesma loja registrou preço maior depois do último push; ao mesmo preço, sai.
      await t.historico(promo.produto, promo.loja, new Date(e.agora.getTime() + 10 * 60_000).toISOString(), 6990 / 60, 6990);
      expect(await novo(5930)).toBe('enviado');
      // Abriu o push anterior (o aviso ficou lido): sai ao mesmo preço.
      await e.pool.query(`UPDATE avisos SET lido_em = $2 WHERE user_id = $1 AND push = 'enviado'`, [p.userId, e.agora]);
      expect(await novo(5930)).toBe('enviado');
      // Abrir a promoção do produto pelo app (evento "aberto") também conta.
      expect(await novo(5930)).toBe('repetido');
      await e.pool.query(`INSERT INTO alert_events (tenant_id, user_id, alert_id, tipo, origem, ocorrido_em) VALUES ($1,$2,$3,'aberto','feed',$4)`, [e.tenantId, p.userId, promo.alerta, e.agora]);
      expect(await novo(5930)).toBe('enviado');
    });

    it('no horário de silêncio espera; quando acaba, sai; se passar da validade, expira', async () => {
      // 12:00 UTC = 09:00 em São Paulo.
      const p = await comAparelho({ categorias: ['bebe'] });
      await e.pool.query(`UPDATE user_preferences SET silencio_inicio = '22:00', silencio_fim = '09:30' WHERE user_id = $1`, [p.userId]);
      await promocao();
      const fcm = new EnviadorFalso();
      const r = await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(r.envio?.aguardandoSilencio).toBe(1);
      expect((await avisosDe(p.userId))[0].push).toBe('pendente');
      e.agora = new Date(e.agora.getTime() + 31 * 60_000);
      await enviarPendentes(e.pool, tenant(), e.agora, fcm);
      expect((await avisosDe(p.userId))[0].push).toBe('enviado');

      const outra = await comAparelho({ categorias: ['bebe'] });
      await e.pool.query(`UPDATE user_preferences SET silencio_inicio = '09:00', silencio_fim = '23:00' WHERE user_id = $1`, [outra.userId]);
      const promo = await promocao();
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      e.agora = horas(13);
      await e.pool.query(`UPDATE offers SET coletada_em = $1 WHERE id = $2`, [horas(-1), promo.oferta]);
      await enviarPendentes(e.pool, tenant(), e.agora, fcm);
      expect((await avisosDe(outra.userId)).map((x) => x.push)).toEqual(['expirado']);
    });

    it('oferta que acabou ou subiu de preço antes do envio expira', async () => {
      const p = await comAparelho({ categorias: ['bebe'] });
      const subiu = await promocao();
      const acabou = await promocao();
      await gerarAvisosDeAlertas(e.pool, tenant(), e.agora);
      await e.pool.query(`UPDATE offers SET preco_centavos = 6990 WHERE id = $1`, [subiu.oferta]);
      await e.pool.query(`UPDATE offers SET disponivel = false WHERE id = $1`, [acabou.oferta]);
      const fcm = new EnviadorFalso();
      await enviarPendentes(e.pool, tenant(), e.agora, fcm);
      expect((await avisosDe(p.userId)).map((x) => x.push)).toEqual(['expirado', 'expirado']);
      expect(fcm.chamadas).toEqual([]);
    });

    it('token recusado apaga o aparelho; falha passageira deixa pendente; credencial recusada para a rodada', async () => {
      const recusado = await comAparelho({ categorias: ['bebe'] });
      await promocao();
      const fcm = new EnviadorFalso();
      fcm.respostas.set(recusado.token, { tipo: 'token_invalido' });
      const r = await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(r.envio?.aparelhosRemovidos).toBe(1);
      expect((await avisosDe(recusado.userId))[0].push).toBe('sem_aparelho');
      expect((await e.pool.query(`SELECT count(*)::int AS n FROM dispositivos WHERE user_id = $1`, [recusado.userId])).rows[0].n).toBe(0);

      const passageira = await comAparelho({ categorias: ['bebe'] });
      const config = await comAparelho({ categorias: ['bebe'] });
      await promocao();
      fcm.respostas.set(passageira.token, { tipo: 'falha_temporaria', motivo: 'HTTP 503' });
      fcm.respostas.set(config.token, { tipo: 'falha_config', motivo: 'HTTP 403' });
      const r2 = await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect(r2.envio?.erroConfig).toBe('HTTP 403');
      expect((await avisosDe(passageira.userId)).map((x) => x.push)).toEqual(['pendente']);
      expect((await avisosDe(config.userId)).map((x) => x.push)).toEqual(['pendente']);
    });

    it('sem FCM configurado, o aviso fica pendente (e expira); sessão revogada não recebe', async () => {
      const p = await comAparelho({ categorias: ['bebe'] });
      await promocao();
      await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: null });
      expect((await avisosDe(p.userId))[0].push).toBe('pendente');

      const saiu = await comAparelho({ categorias: ['bebe'] });
      await e.pool.query(`UPDATE sessions SET refresh_expira_em = $2 WHERE user_id = $1`, [saiu.userId, horas(-1)]);
      await promocao();
      const fcm = new EnviadorFalso();
      await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: fcm });
      expect((await avisosDe(saiu.userId)).map((x) => x.push)).toEqual(['sem_aparelho']);
      expect(fcm.chamadas.map((c) => c.token)).not.toContain(saiu.token);
    });
  });

  describe('seguidos', () => {
    const avisos = (o: Partial<Record<string, unknown>> = {}) => ({ promocao_excepcional: true, queda_percentual: null, voltou_estoque: false, menor_preco_180d: false, promocao_acabando: false, ...o });

    it('primeira avaliação só guarda o estado; voltou ao estoque avisa na virada', async () => {
      if (config === undefined) config = await carregarConfigTenant('padrao');
      const p = await t.pessoa({ categorias: [] });
      const { loja, fonte } = await t.loja();
      const produto = await t.produto();
      expect((await t.chamar('PUT', `/v1/seguidos/${produto}`, p.auth, { avisos: avisos({ voltou_estoque: true }) })).statusCode).toBe(201);
      e.agora = horas(1);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect((await e.pool.query(`SELECT estoque_visto, estado_em FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0]).toEqual({ estoque_visto: false, estado_em: e.agora });
      await t.oferta({ produto, loja, fonte, coletadaEm: e.agora });
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await avisosDe(p.userId)).toEqual([expect.objectContaining({ tipo: 'voltou_estoque', origem: 'seguido', product_id: produto, store_id: loja, preco_centavos: 5990, push: 'pendente' })]);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await avisosDe(p.userId)).toHaveLength(1);
    });

    it('baixou X% conta do preço normal (mediana de 30 dias); avisa uma vez por queda, de novo se cair mais X pontos ou depois de voltar', async () => {
      if (config === undefined) config = await carregarConfigTenant('padrao');
      const p = await t.pessoa({ categorias: [] });
      const { loja, fonte } = await t.loja();
      const produto = await t.produto();
      const oferta = await t.oferta({ produto, loja, fonte, preco: 10000 });
      const avisada = async () => (await e.pool.query(`SELECT queda_avisada_centavos FROM seguidos WHERE user_id = $1`, [p.userId])).rows[0].queda_avisada_centavos;
      const quedas = async () => (await avisosDe(p.userId)).filter((x) => x.tipo === 'queda_percentual').map((x) => [x.preco_centavos, x.queda])
        .sort((a, b) => b[0] - a[0]); // nascem no mesmo instante: ordem pelo preço, do maior ao menor
      const preco = async (v: number) => e.pool.query(`UPDATE offers SET preco_centavos = $2, coletada_em = $3 WHERE id = $1`, [oferta, v, e.agora]);
      await t.chamar('PUT', `/v1/seguidos/${produto}`, p.auth, { avisos: avisos({ queda_percentual: 10 }) });
      e.agora = horas(1);
      // Histórico curto demais (menos que a base do motor): sem preço normal, nada a avisar.
      await t.historico(produto, loja, dias(-5).toISOString(), 10000 / 60, 10000);
      await avaliarSeguidos(e.pool, tenant(), e.agora); // primeira avaliação, a 100,00
      await preco(8000);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toEqual([]);
      await preco(10000);
      // Com 20 dias de histórico a 100,00 o normal é 100,00.
      await t.historico(produto, loja, dias(-20).toISOString(), 10000 / 60, 10000);
      await preco(9500); // 5%: não basta
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toEqual([]);
      await preco(8900); // 11% abaixo do normal
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toEqual([[8900, 0.11]]);
      expect(await avisada()).toBe(8900);
      await preco(8100); // só mais 8 pontos: não basta
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toHaveLength(1);
      await preco(7800); // mais 11 pontos
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toEqual([[8900, 0.11], [7800, 0.22]]);
      await preco(10000); // voltou ao normal: a próxima queda avisa de novo
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await avisada()).toBeNull();
      await preco(8900);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toHaveLength(3);

      // Mudar os avisos do produto com o preço já abaixo: conta como avisada (a pessoa acabou de ver), sem aviso novo.
      await preco(10000);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      e.agora = horas(2);
      await preco(8900);
      await t.chamar('PUT', `/v1/seguidos/${produto}`, await t.reabrir(p.userId), { avisos: avisos({ queda_percentual: 5 }) });
      e.agora = horas(3);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await quedas()).toHaveLength(3);
      expect(await avisada()).toBe(8900);
    });

    it('menor preço em 180 dias avisa na virada; promoção acabando avisa uma vez por validade', async () => {
      if (config === undefined) config = await carregarConfigTenant('padrao');
      const p = await t.pessoa({ categorias: [] });
      const { loja, fonte } = await t.loja();
      const produto = await t.produto();
      const oferta = await t.oferta({ produto, loja, fonte });
      await t.chamar('PUT', `/v1/seguidos/${produto}`, p.auth, { avisos: avisos({ menor_preco_180d: true, promocao_acabando: true }) });
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await avisosDe(p.userId)).toEqual([]);
      // Vinte dias atrás o produto custava mais: o preço de agora passa a ser o menor da janela.
      await t.historico(produto, loja, dias(-20).toISOString(), 120, 7200);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect(await avisosDe(p.userId)).toEqual([expect.objectContaining({ tipo: 'menor_preco_180d' })]);

      await e.pool.query(`UPDATE offers SET valida_ate = $2 WHERE id = $1`, [oferta, horas(20)]);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      const acabando = (await avisosDe(p.userId)).filter((x) => x.tipo === 'promocao_acabando');
      expect(acabando).toHaveLength(1);
      await e.pool.query(`UPDATE offers SET valida_ate = $2 WHERE id = $1`, [oferta, horas(22)]);
      await avaliarSeguidos(e.pool, tenant(), e.agora);
      expect((await avisosDe(p.userId)).filter((x) => x.tipo === 'promocao_acabando')).toHaveLength(2);
    });
  });

  it('a retenção apaga aviso mais velho que o prazo da central; duas rodadas ao mesmo tempo não se atropelam', async () => {
    if (config === undefined) config = await carregarConfigTenant('padrao');
    const p = await t.pessoa();
    const produto = await t.produto();
    const velho = await t.aviso({ userId: p.userId, produto, criadoEm: dias(-91) });
    const novo = await t.aviso({ userId: p.userId, produto, criadoEm: dias(-89) });
    const trava = await e.pool.connect();
    try {
      await trava.query(`SELECT pg_advisory_lock(hashtext('despachante'), hashtext($1))`, [e.tenantId]);
      expect((await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: null })).pulou).toBe(true);
      await trava.query(`SELECT pg_advisory_unlock(hashtext('despachante'), hashtext($1))`, [e.tenantId]);
    } finally {
      trava.release();
    }
    const r = await despachar(e.pool, tenant(), e.agora, { avaliarSeguidos: false, enviador: null });
    expect(r.avisosApagados).toBeGreaterThanOrEqual(1);
    const restantes = (await e.pool.query(`SELECT id FROM avisos WHERE user_id = $1`, [p.userId])).rows.map((x) => x.id);
    expect(restantes).toEqual([novo]);
    expect(restantes).not.toContain(velho);
  });
});
