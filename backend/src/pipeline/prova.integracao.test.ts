// A prova do alerta (menor, maior e dias medidos) gravada pelo pipeline, contra um Postgres de verdade. Pula sem PG_TESTE_URL.
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../db/migrate.js';
import type { OfertaBruta, SourceAdapter } from '../fontes/contrato.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';
import { executarColeta } from './executar.js';
import { buscarFonte, buscarLojasDaFonte } from './repositorio.js';

const URL_BASE = process.env.PG_TESTE_URL;
const executar = URL_BASE ? describe : describe.skip;
const DIA = 86_400_000;
const listas = { versao: 'x', porGtin: new Map(), substanciasControladas: new Set(), termosBloqueados: ['zzzxxx'] } as unknown as ListasMedicamentos;

executar('prova do alerta pelo pipeline (Postgres)', () => {
  const nomeBanco = `teste_prova_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let config: ConfigTenant;
  let tenantId: string;
  let loja: string;
  let seq = 0;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: `${URL_BASE}/postgres` });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${nomeBanco}`);
    pool = new pg.Pool({ connectionString: `${URL_BASE}/${nomeBanco}`, max: 4 });
    // O DROP DATABASE ... FORCE do fim do teste derruba conexões ociosas; sem este ouvinte o erro vira "Unhandled Error" e reprova a rodada.
    pool.on('error', () => {});
    const c = await pool.connect();
    try {
      await migrate(c);
    } finally {
      c.release();
    }
    config = await carregarConfigTenant('padrao');
    tenantId = (await pool.query(`SELECT id FROM tenants WHERE slug = 'padrao'`)).rows[0].id;
  });
  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS ${nomeBanco} WITH (FORCE)`);
      await admin.end();
    }
  });

  /** Fonte, loja aprovada e vínculo próprios de cada teste (a chave do produto é a mesma entre os dias). */
  async function cenario() {
    seq += 1;
    const nomeFonte = `fonte-prova-${seq}`;
    await pool.query(`INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa) VALUES ($1,$2,'A',120,'SP','alta','teste',true)`, [tenantId, nomeFonte]);
    loja = (await pool.query(`INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao) VALUES ($1,'RedeProva','Prova','online','aprovada',0.9) RETURNING id`, [tenantId])).rows[0].id;
    const fonte = await buscarFonte(pool, tenantId, nomeFonte);
    await pool.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1,$2,'L1',$3)`, [tenantId, fonte.id, loja]);
    return { fonte, produtoExterno: `P${seq}` };
  }

  async function rodar(c: Awaited<ReturnType<typeof cenario>>, agora: Date, precoCentavos: number) {
    const oferta: OfertaBruta = {
      idExterno: c.produtoExterno, titulo: `Shampoo Prova ${c.produtoExterno} 400 ml`, descricao: null, gtin: null, marca: 'MarcaProva', precoCentavos,
      condicao: null, categoriaFonte: 'hygiene', lojaIdExterno: 'L1', link: 'https://loja.example/p', linkAfiliado: false, disponivel: true,
      validaDe: null, validaAte: null, frete: { status: 'a_confirmar', centavos: null },
    };
    const adapter: SourceAdapter = { tipo: 'A', coletar: async () => ({ ofertas: [oferta], ilegiveis: [] }) };
    return executarColeta({
      pool, tenantId, fonte: c.fonte, lojas: await buscarLojasDaFonte(pool, tenantId, c.fonte.id), adapter, config,
      mapaCategorias: { hygiene: 'cuidados_pessoais' }, listas, agora, log: () => {},
    });
  }

  const alertas = async (c: Awaited<ReturnType<typeof cenario>>) =>
    (await pool.query(
      `SELECT a.prova_menor_centavos AS menor, a.prova_maior_centavos AS maior, a.prova_dias AS dias, a.preco_centavos
         FROM alerts a JOIN offers o ON o.tenant_id = a.tenant_id AND o.id = a.offer_id
        WHERE o.source_id = $1 ORDER BY a.criado_em`,
      [c.fonte.id],
    )).rows;

  it('grava o menor e o maior preço da embalagem na loja e os dias medidos, sem o dia do alerta', async () => {
    const c = await cenario();
    const inicio = new Date('2026-09-01T12:00:00Z');
    // 20 dias de preço entre R$ 78 e R$ 90 (o mais barato e o mais caro ficam fora da janela de subida do motor); depois a queda.
    for (let i = 0; i < 20; i += 1) {
      const preco = i === 4 ? 7800 : i === 2 ? 9000 : 8000;
      const r = await rodar(c, new Date(inicio.getTime() + i * DIA), preco);
      expect(r.alertasCriados, `dia ${i}`).toBe(0);
    }
    const queda = await rodar(c, new Date(inicio.getTime() + 20 * DIA), 4800);
    expect(queda.erros).toBe(0);
    expect(queda.alertasCriados).toBe(1);
    expect(await alertas(c)).toEqual([{ menor: 7800, maior: 9000, dias: 20, preco_centavos: 4800 }]);
  });

  it('a prova é o retrato do momento: coletas seguintes não a mudam', async () => {
    const c = await cenario();
    const inicio = new Date('2026-09-01T12:00:00Z');
    for (let i = 0; i < 20; i += 1) await rodar(c, new Date(inicio.getTime() + i * DIA), 8000);
    await rodar(c, new Date(inicio.getTime() + 20 * DIA), 4800);
    const [antes] = await alertas(c);
    await rodar(c, new Date(inicio.getTime() + 21 * DIA), 4800);
    await rodar(c, new Date(inicio.getTime() + 22 * DIA), 3000);
    expect((await alertas(c))[0]).toEqual(antes);
    expect(antes).toEqual({ menor: 8000, maior: 8000, dias: 20, preco_centavos: 4800 });
  });

  it('olha a janela inteira do motor (180 dias), não só os últimos 30', async () => {
    const c = await cenario();
    const inicio = new Date('2026-05-01T12:00:00Z');
    await rodar(c, inicio, 7000); // 120 dias antes do alerta
    for (let i = 100; i < 120; i += 1) await rodar(c, new Date(inicio.getTime() + i * DIA), 8000);
    expect((await rodar(c, new Date(inicio.getTime() + 120 * DIA), 4800)).alertasCriados).toBe(1);
    expect(await alertas(c)).toEqual([{ menor: 7000, maior: 8000, dias: 21, preco_centavos: 4800 }]);
  });
});
