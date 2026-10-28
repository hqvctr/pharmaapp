// Denúncias e triagem na área do operador contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { OfertaBruta, SourceAdapter } from '../fontes/contrato.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { executarColeta } from '../pipeline/executar.js';
import { buscarFonte, buscarLojasDaFonte } from '../pipeline/repositorio.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

const executar = URL_BASE ? describe : describe.skip;

executar('admin: denúncias e triagem (Postgres)', () => {
  const t = ambienteDeTeste('teste_admin_mod');
  const { e } = t;
  const minutos = (n: number) => new Date(e.agora.getTime() - n * 60_000);
  const ids = (r: { json(): { itens: Array<{ id: string }> } }) => r.json().itens.map((i) => i.id);
  const auditoria = async (alvo: string) => (await e.pool.query(`SELECT acao, alvo_tipo, detalhe FROM auditoria WHERE alvo_id = $1 ORDER BY em, ctid`, [alvo])).rows;

  describe('denúncias', () => {
    async function caso(o: { situacao?: string; abertoEm?: Date; t?: string } = {}) {
      const tenant = o.t ?? e.tenantId;
      const { loja, fonte } = await t.loja({ t: tenant, nome: 'Drogasil' });
      const produto = await t.produto({ t: tenant, nome: 'Fralda Huggies M', marca: 'Huggies', marcaChave: 'huggies' });
      const oferta = await t.oferta({ t: tenant, produto, loja, fonte, preco: 5990, escondida: true });
      const alerta = await t.alerta({ t: tenant, oferta, loja, decisao: 'notificar' });
      const resolvido = o.situacao !== undefined && o.situacao !== 'escondida';
      const id = (
        await e.pool.query(
          `INSERT INTO casos_denuncia (tenant_id, alert_id, offer_id, aberto_em, situacao, denuncias, pessoas_base, limite, motivo_preco_errado, motivo_sem_estoque, resolucao, resolucao_em)
           VALUES ($1,$2,$3,$4,$5,3,20,2,2,1,$6,$7) RETURNING id`,
          [tenant, alerta, oferta, o.abertoEm ?? minutos(30), o.situacao ?? 'escondida', resolvido ? (o.situacao === 'restaurada' ? 'restaurar' : 'manter_escondida') : null, resolvido ? minutos(5) : null],
        )
      ).rows[0].id as string;
      return { id, oferta, alerta, loja, produto };
    }
    const escondida = async (oferta: string) => (await e.pool.query(`SELECT escondida_em FROM offers WHERE id = $1`, [oferta])).rows[0].escondida_em !== null;

    it('lista os casos aguardando o operador, no formato do contrato, e só os do tenant', async () => {
      const op = await t.operador();
      const c = await caso();
      const resolvido = await caso({ situacao: 'restaurada' });
      const outro = await caso({ t: e.outroTenantId });
      const r = await t.chamar('GET', '/v1/admin/denuncias', op.auth);
      expect(r.statusCode).toBe(200);
      expect(ids(r)).toContain(c.id);
      expect(ids(r)).not.toContain(resolvido.id);
      expect(ids(r)).not.toContain(outro.id);
      expect(r.json().itens.find((i: { id: string }) => i.id === c.id)).toEqual({
        id: c.id, aberto_em: minutos(30).toISOString(), situacao: 'escondida',
        oferta: {
          id: c.oferta, produto: expect.objectContaining({ id: c.produto, nome: 'Fralda Huggies M' }), loja: { id: c.loja, nome: 'Drogasil (online)', rede: 'Drogasil', tipo: 'online' },
          preco_centavos: 5990, link: 'https://www.drogasmil.com.br/p/x', coletada_em: expect.any(String),
        },
        denuncias: 3, pessoas_base: 20, limite: 2, motivos: { preco_errado: 2, sem_estoque: 1 }, resolucao: null, resolucao_por: null,
      });
      expect(ids(await t.chamar('GET', '/v1/admin/denuncias?situacao=restaurada', op.auth))).toEqual([resolvido.id]);
      expect((await t.chamar('GET', '/v1/admin/denuncias?situacao=x', op.auth)).statusCode).toBe(422);
      expect((await t.chamar('GET', '/v1/admin/denuncias', (await t.pessoa()).auth)).statusCode).toBe(401);
    });

    it('pagina pelos casos do mais novo ao mais antigo, sem repetir', async () => {
      const op = await t.operador();
      for (let i = 0; i < 4; i += 1) await caso({ abertoEm: minutos(100 + i) });
      const total = (await e.pool.query(`SELECT count(*)::int AS n FROM casos_denuncia WHERE tenant_id = $1 AND situacao = 'escondida'`, [e.tenantId])).rows[0].n as number;
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/denuncias?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(vistos).toHaveLength(total);
      expect(new Set(vistos).size).toBe(total);
    });

    it('restaurar devolve a oferta ao feed, registra quem e quando, audita; repetir é 200; o contrário é 409 ja_revisado', async () => {
      const op = await t.operador();
      const c = await caso();
      expect(await escondida(c.oferta)).toBe(true);
      const r = await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, { resultado: 'restaurar', observacao: 'Preço confirmado no site.' });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ situacao: 'restaurada', resolucao: 'restaurar', resolucao_por: { operador: { id: op.operadorId, nome: op.nome }, em: e.agora.toISOString(), observacao: 'Preço confirmado no site.' } });
      expect(await escondida(c.oferta)).toBe(false);
      expect(await auditoria(c.id)).toEqual([{ acao: 'denuncia_resolvida', alvo_tipo: 'caso_denuncia', detalhe: { resultado: 'restaurar', observacao: 'Preço confirmado no site.' } }]);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, { resultado: 'restaurar' })).statusCode).toBe(200);
      const contrario = await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, { resultado: 'manter_escondida' });
      expect(contrario.statusCode).toBe(409);
      expect(contrario.json().codigo).toBe('ja_revisado');
      expect(await escondida(c.oferta)).toBe(false);
      expect(await auditoria(c.id)).toHaveLength(1);
    });

    it('manter escondida deixa a oferta fora do feed, e depois não dá para restaurar', async () => {
      const op = await t.operador();
      const c = await caso();
      const r = await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, { resultado: 'manter_escondida' });
      expect(r.json()).toMatchObject({ situacao: 'mantida_escondida', resolucao: 'manter_escondida' });
      expect(await escondida(c.oferta)).toBe(true);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, { resultado: 'restaurar' })).json().codigo).toBe('ja_revisado');
      expect(await escondida(c.oferta)).toBe(true);
    });

    it('valida, 404 (inclusive de outro tenant, sem mexer na oferta dele) e exige operador', async () => {
      const op = await t.operador();
      const c = await caso();
      const outro = await caso({ t: e.outroTenantId });
      for (const corpo of [{}, { resultado: 'talvez' }, { resultado: 'restaurar', observacao: 'x'.repeat(1001) }]) expect((await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, corpo)).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, op.auth, [1])).statusCode).toBe(400);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${randomUUID()}/resolucao`, op.auth, { resultado: 'restaurar' })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${outro.id}/resolucao`, op.auth, { resultado: 'restaurar' })).statusCode).toBe(404);
      expect(await escondida(outro.oferta)).toBe(true);
      expect((await t.chamar('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, {}, { resultado: 'restaurar' })).statusCode).toBe(401);
      expect(await escondida(c.oferta)).toBe(true);
    });
  });

  describe('triagem', () => {
    async function bloqueio(o: { codigo: string; humana?: boolean; t?: string; ultima?: Date; resultado?: string; fonte?: string; idExterno?: string }) {
      const tenant = o.t ?? e.tenantId;
      const fonte = o.fonte ?? (await t.loja({ t: tenant })).fonte;
      return (
        await e.pool.query(
          `INSERT INTO triagem_bloqueios (tenant_id, source_id, id_externo, titulo, codigo, detalhe, revisao_humana, primeira_vez_em, ultima_vez_em, resultado, revisado_em)
           VALUES ($1,$2,$3,'Produto barrado',$4,'detalhe',$5,$6,$7,$8,$9) RETURNING id`,
          [tenant, fonte, o.idExterno ?? randomUUID(), o.codigo, o.humana ?? false, minutos(500), o.ultima ?? minutos(10), o.resultado ?? null, o.resultado ? minutos(1) : null],
        )
      ).rows[0].id as string;
    }

    it('lista só os não revisados por padrão, com a fonte e o que pode ser liberado', async () => {
      const op = await t.operador();
      const vedado = await bloqueio({ codigo: 'NBCAL_VEDADO' });
      const cautela = await bloqueio({ codigo: 'NBCAL_CAUTELA' });
      const texto = await bloqueio({ codigo: 'TERMO_DE_VENDA_CONTROLADA', humana: true });
      const nome = await bloqueio({ codigo: 'MEDICAMENTO_SEM_REFERENCIA', humana: true });
      const semRef = await bloqueio({ codigo: 'MEDICAMENTO_SEM_REFERENCIA', humana: false });
      const cmed = await bloqueio({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
      const feito = await bloqueio({ codigo: 'NBCAL_CAUTELA', resultado: 'bloqueio_correto' });
      const outro = await bloqueio({ codigo: 'NBCAL_CAUTELA', t: e.outroTenantId });
      const r = await t.chamar('GET', '/v1/admin/triagem', op.auth);
      expect(r.statusCode).toBe(200);
      const lista = r.json().itens as Array<{ id: string; liberavel: boolean }>;
      const liberavel = (id: string) => lista.find((i) => i.id === id)?.liberavel;
      expect([vedado, cautela, texto, nome, semRef, cmed].map(liberavel)).toEqual([false, true, true, true, false, false]);
      expect(lista.map((i) => i.id)).not.toContain(feito);
      expect(lista.map((i) => i.id)).not.toContain(outro);
      expect(lista.find((i) => i.id === texto)).toEqual({
        id: texto, fonte: expect.objectContaining({ tipo: 'A', confiabilidade: 'alta' }), id_externo: expect.any(String), titulo: 'Produto barrado',
        codigo: 'TERMO_DE_VENDA_CONTROLADA', detalhe: 'detalhe', revisao_humana: true, liberavel: true,
        primeira_vez_em: minutos(500).toISOString(), ultima_vez_em: minutos(10).toISOString(), resultado: null, revisao_por: null,
      });
      expect(ids(await t.chamar('GET', '/v1/admin/triagem?revisado=true', op.auth))).toContain(feito);
      expect(ids(await t.chamar('GET', '/v1/admin/triagem?revisado=true', op.auth))).not.toContain(texto);
      expect((await t.chamar('GET', '/v1/admin/triagem?revisado=talvez', op.auth)).statusCode).toBe(422);
    });

    it('pagina pelo mais recente, sem repetir', async () => {
      const op = await t.operador();
      for (let i = 0; i < 5; i += 1) await bloqueio({ codigo: 'NBCAL_CAUTELA', ultima: minutos(200 + i) });
      const total = (await e.pool.query(`SELECT count(*)::int AS n FROM triagem_bloqueios WHERE tenant_id = $1 AND revisado_em IS NULL`, [e.tenantId])).rows[0].n as number;
      const vistos: string[] = [];
      let cursor: string | null = null;
      for (let i = 0; i < 50; i += 1) {
        const p = await t.chamar('GET', `/v1/admin/triagem?limite=2${cursor === null ? '' : `&cursor=${cursor}`}`, op.auth);
        vistos.push(...ids(p));
        cursor = p.json().proximo_cursor;
        if (cursor === null) break;
      }
      expect(new Set(vistos).size).toBe(total);
      expect(vistos).toHaveLength(total);
    });

    it('bloqueio_correto e falso_positivo só registram a revisão (qualquer código); audita como triagem_revisada', async () => {
      const op = await t.operador();
      const a = await bloqueio({ codigo: 'NBCAL_VEDADO' });
      const b = await bloqueio({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' });
      const ra = await t.chamar('PUT', `/v1/admin/triagem/${a}/revisao`, op.auth, { resultado: 'bloqueio_correto', observacao: 'Medicamento tarjado.' });
      expect(ra.statusCode).toBe(200);
      expect(ra.json()).toMatchObject({ resultado: 'bloqueio_correto', revisao_por: { operador: { id: op.operadorId }, em: e.agora.toISOString(), observacao: 'Medicamento tarjado.' } });
      expect((await t.chamar('PUT', `/v1/admin/triagem/${b}/revisao`, op.auth, { resultado: 'falso_positivo' })).json().resultado).toBe('falso_positivo');
      expect(await auditoria(a)).toEqual([{ acao: 'triagem_revisada', alvo_tipo: 'triagem', detalhe: { resultado: 'bloqueio_correto', codigo: 'NBCAL_VEDADO', observacao: 'Medicamento tarjado.' } }]);
      // O item continua barrado: falso positivo não libera.
      expect((await e.pool.query(`SELECT count(*)::int AS n FROM triagem_bloqueios WHERE id = $1 AND resultado = 'liberado'`, [b])).rows[0].n).toBe(0);
    });

    it('liberar vale só para cautela da NBCAL e filtro de texto; vedado e GTIN da CMED dão 422 liberacao_nao_permitida e nada é gravado', async () => {
      const op = await t.operador();
      const cautela = await bloqueio({ codigo: 'NBCAL_CAUTELA' });
      const texto = await bloqueio({ codigo: 'TERMO_DE_VENDA_CONTROLADA', humana: true });
      for (const [codigo, id] of [['NBCAL_VEDADO', await bloqueio({ codigo: 'NBCAL_VEDADO' })], ['MEDICAMENTO_COM_PRESCRICAO', await bloqueio({ codigo: 'MEDICAMENTO_COM_PRESCRICAO' })], ['SUBSTANCIA_CONTROLADA', await bloqueio({ codigo: 'SUBSTANCIA_CONTROLADA' })], ['MEDICAMENTO_SEM_REFERENCIA sem texto', await bloqueio({ codigo: 'MEDICAMENTO_SEM_REFERENCIA' })]] as const) {
        const r = await t.chamar('PUT', `/v1/admin/triagem/${id}/revisao`, op.auth, { resultado: 'liberado' });
        expect(r.statusCode, codigo).toBe(422);
        expect(r.json().codigo, codigo).toBe('liberacao_nao_permitida');
        expect((await e.pool.query(`SELECT resultado FROM triagem_bloqueios WHERE id = $1`, [id])).rows[0].resultado, codigo).toBeNull();
        expect(await auditoria(id)).toEqual([]);
      }
      for (const id of [cautela, texto]) {
        const r = await t.chamar('PUT', `/v1/admin/triagem/${id}/revisao`, op.auth, { resultado: 'liberado', observacao: 'Falso positivo.' });
        expect(r.statusCode).toBe(200);
        expect(r.json().resultado).toBe('liberado');
        expect((await auditoria(id))[0]!.acao).toBe('triagem_liberada');
      }
    });

    it('repetir o resultado é 200 sem mexer; outro resultado é 409 ja_revisado; 404, validação e login', async () => {
      const op = await t.operador();
      const id = await bloqueio({ codigo: 'NBCAL_CAUTELA' });
      await t.chamar('PUT', `/v1/admin/triagem/${id}/revisao`, op.auth, { resultado: 'liberado' });
      e.agora = new Date(e.agora.getTime() + 600_000);
      const op2 = await t.operador();
      const repete = await t.chamar('PUT', `/v1/admin/triagem/${id}/revisao`, op2.auth, { resultado: 'liberado', observacao: 'outra' });
      expect(repete.statusCode).toBe(200);
      expect(repete.json().revisao_por).toMatchObject({ operador: { id: op.operadorId }, observacao: null });
      const outro = await t.chamar('PUT', `/v1/admin/triagem/${id}/revisao`, op2.auth, { resultado: 'bloqueio_correto' });
      expect(outro.statusCode).toBe(409);
      expect(outro.json().codigo).toBe('ja_revisado');
      expect(await auditoria(id)).toHaveLength(1);
      const fresco = await bloqueio({ codigo: 'NBCAL_CAUTELA' });
      for (const corpo of [{}, { resultado: 'x' }, { resultado: 'liberado', observacao: 'x'.repeat(1001) }]) expect((await t.chamar('PUT', `/v1/admin/triagem/${fresco}/revisao`, op2.auth, corpo)).statusCode).toBe(422);
      expect((await t.chamar('PUT', `/v1/admin/triagem/${randomUUID()}/revisao`, op2.auth, { resultado: 'liberado' })).statusCode).toBe(404);
      const deOutro = await bloqueio({ codigo: 'NBCAL_CAUTELA', t: e.outroTenantId });
      expect((await t.chamar('PUT', `/v1/admin/triagem/${deOutro}/revisao`, op2.auth, { resultado: 'liberado' })).statusCode).toBe(404);
      expect((await t.chamar('PUT', `/v1/admin/triagem/${fresco}/revisao`, {}, { resultado: 'liberado' })).statusCode).toBe(401);
    });

    it('de ponta a ponta: o item barrado por texto é liberado pelo operador e entra na próxima coleta; o vedado segue barrado', async () => {
      const op = await t.operador();
      const config = await carregarConfigTenant('padrao');
      const listas = { versao: 'x', porGtin: new Map(), substanciasControladas: new Set(), termosBloqueados: ['tarja preta'] } as unknown as ListasMedicamentos;
      const nomeFonte = `fonte-lib-${randomUUID()}`;
      await e.pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,$2,'A',120,'SP','alta','teste',true)`, [e.tenantId, nomeFonte]);
      const loja = (await e.pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao) VALUES ($1,'RedeLib','Lib','online','aprovada',0.9) RETURNING id`, [e.tenantId])).rows[0].id as string;
      const fonte = await buscarFonte(e.pool, e.tenantId, nomeFonte);
      await e.pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,'L1',$3)`, [e.tenantId, fonte.id, loja]);
      const oferta = (id: string, titulo: string): OfertaBruta => ({
        idExterno: id, titulo, descricao: null, gtin: null, marca: 'MarcaLib', precoCentavos: 5000, condicao: null, categoriaFonte: 'hygiene', lojaIdExterno: 'L1',
        link: 'https://loja.example/p', linkAfiliado: false, disponivel: true, validaDe: null, validaAte: null, frete: { status: 'a_confirmar', centavos: null },
      });
      const rodar = async () => {
        const adapter: SourceAdapter = { tipo: 'A', coletar: async () => ({ ofertas: [oferta('TEXTO', 'Shampoo Liberavel tarja preta 400 ml'), oferta('VEDADO', 'Mamadeira Vedada 240ml tarja preta'), oferta('OUTRO', 'Sabonete Outro tarja preta 90 g')], ilegiveis: [] }) };
        return executarColeta({ pool: e.pool, tenantId: e.tenantId, fonte, lojas: await buscarLojasDaFonte(e.pool, e.tenantId, fonte.id), adapter, config, mapaCategorias: { hygiene: 'cuidados_pessoais' }, listas, agora: e.agora, log: () => {} });
      };
      const produtos = async () => (await e.pool.query(`SELECT p.nome FROM offers o JOIN products p ON p.id = o.product_id WHERE o.source_id = $1 ORDER BY p.nome`, [fonte.id])).rows.map((r) => r.nome);
      expect((await rodar()).bloqueadas).toBe(3);
      expect(await produtos()).toEqual([]);
      const lista = (await t.chamar('GET', '/v1/admin/triagem', op.auth)).json().itens as Array<{ id: string; id_externo: string; codigo: string; fonte: { id: string } }>;
      const doTexto = lista.find((i) => i.fonte.id === fonte.id && i.id_externo === 'TEXTO')!;
      const doVedado = lista.find((i) => i.fonte.id === fonte.id && i.id_externo === 'VEDADO');
      expect(doTexto.codigo).toBe('TERMO_DE_VENDA_CONTROLADA');
      // O item de mamadeira é barrado pelo texto primeiro (a triagem de medicamento roda antes da NBCAL).
      expect(doVedado?.codigo).toBe('TERMO_DE_VENDA_CONTROLADA');
      expect((await t.chamar('PUT', `/v1/admin/triagem/${doTexto.id}/revisao`, op.auth, { resultado: 'liberado' })).statusCode).toBe(200);
      const depois = await rodar();
      // Só o item liberado entra: o do mesmo bloqueio (texto) em outra oferta continua barrado.
      expect(depois.bloqueadas).toBe(2);
      expect(await produtos()).toEqual(['Shampoo Liberavel tarja preta 400 ml']);
      expect(depois.erros).toBe(0);
      // Liberar o texto do vedado não o destrava: cai na NBCAL.
      expect((await t.chamar('PUT', `/v1/admin/triagem/${doVedado!.id}/revisao`, op.auth, { resultado: 'liberado' })).statusCode).toBe(200);
      expect((await rodar()).bloqueadas).toBe(2);
      expect(await produtos()).toEqual(['Shampoo Liberavel tarja preta 400 ml']);
      expect((await e.pool.query(`SELECT codigo FROM triagem_bloqueios WHERE source_id = $1 AND id_externo = 'VEDADO' ORDER BY codigo`, [fonte.id])).rows.map((r) => r.codigo)).toEqual(['NBCAL_VEDADO', 'TERMO_DE_VENDA_CONTROLADA']);
    });
  });
});
