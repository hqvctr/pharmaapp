// Cria, se ainda não existirem, as fontes e as lojas de um tenant a partir de config/vinculos/<slug>.json.
// Pode rodar quantas vezes quiser: o que já existe não é alterado (o operador pode ter mudado status ou reputação).
//   node dist/pipeline/provisionar.js --tenant padrao
// Não grava credencial (veja pipeline/credencial.ts).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DIR_CONFIG } from '../shared/tenantConfig.js';
import * as repo from './repositorio.js';

const STATUS = ['aprovada', 'em_observacao', 'bloqueada'] as const;
type Status = (typeof STATUS)[number];

export interface FonteVinculo {
  nome: string;
  tipo: 'A' | 'B' | 'C' | 'D' | 'E';
  frequenciaMinutos: number;
  regiao: string;
  statusConfianca: Status;
  confiabilidade: 'alta' | 'media' | 'baixa';
  baseLegal: string;
  ativa: boolean;
}

export interface LojaVinculo {
  fonte: string;
  idExterno: string;
  rede: string;
  nome: string;
  tipo: 'online';
  status: Status;
  reputacao: number;
  faixasCep: Array<{ inicio: string; fim: string; prazoDias: number }>;
}

export interface Vinculos {
  fontes: FonteVinculo[];
  lojas: LojaVinculo[];
}

export interface ResumoProvisao {
  fontesCriadas: string[];
  lojasCriadas: string[];
}

function obj(v: unknown, onde: string): Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Vínculos inválidos: ${onde}`);
  return v as Record<string, unknown>;
}
function txt(v: unknown, onde: string): string {
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`Vínculos inválidos: ${onde}`);
  return v;
}
function um<T extends string>(v: unknown, opcoes: readonly T[], onde: string): T {
  if (typeof v !== 'string' || !(opcoes as readonly string[]).includes(v)) throw new Error(`Vínculos inválidos: ${onde}`);
  return v as T;
}

export function validarVinculos(bruto: unknown): Vinculos {
  const raiz = obj(bruto, 'arquivo');
  if (!Array.isArray(raiz.fontes) || !Array.isArray(raiz.lojas)) throw new Error('Vínculos inválidos: faltam "fontes" e "lojas"');
  const fontes = raiz.fontes.map((f, i): FonteVinculo => {
    const o = obj(f, `fontes[${i}]`);
    const freq = o.frequenciaMinutos;
    if (typeof freq !== 'number' || !Number.isInteger(freq) || freq <= 0) throw new Error(`Vínculos inválidos: fontes[${i}].frequenciaMinutos`);
    if (typeof o.ativa !== 'boolean') throw new Error(`Vínculos inválidos: fontes[${i}].ativa`);
    const nome = txt(o.nome, `fontes[${i}].nome`);
    if (!/^[a-z0-9-]+$/.test(nome)) throw new Error(`Vínculos inválidos: fontes[${i}].nome`);
    return {
      nome,
      tipo: um(o.tipo, ['A', 'B', 'C', 'D', 'E'], `fontes[${i}].tipo`),
      frequenciaMinutos: freq,
      regiao: txt(o.regiao, `fontes[${i}].regiao`),
      statusConfianca: um(o.statusConfianca, STATUS, `fontes[${i}].statusConfianca`),
      confiabilidade: um(o.confiabilidade, ['alta', 'media', 'baixa'], `fontes[${i}].confiabilidade`),
      baseLegal: txt(o.baseLegal, `fontes[${i}].baseLegal`),
      ativa: o.ativa,
    };
  });
  const nomes = new Set(fontes.map((f) => f.nome));
  if (nomes.size !== fontes.length) throw new Error('Vínculos inválidos: fonte repetida');
  const vistos = new Set<string>();
  const lojas = raiz.lojas.map((l, i): LojaVinculo => {
    const o = obj(l, `lojas[${i}]`);
    const fonte = txt(o.fonte, `lojas[${i}].fonte`);
    if (!nomes.has(fonte)) throw new Error(`Vínculos inválidos: lojas[${i}] usa a fonte "${fonte}", que não está em "fontes"`);
    const idExterno = txt(o.idExterno, `lojas[${i}].idExterno`);
    if (vistos.has(`${fonte}|${idExterno}`)) throw new Error(`Vínculos inválidos: lojas[${i}] repetida`);
    vistos.add(`${fonte}|${idExterno}`);
    const reputacao = o.reputacao;
    if (typeof reputacao !== 'number' || reputacao < 0 || reputacao > 1) throw new Error(`Vínculos inválidos: lojas[${i}].reputacao`);
    if (!Array.isArray(o.faixasCep) || o.faixasCep.length === 0) throw new Error(`Vínculos inválidos: lojas[${i}].faixasCep`);
    const faixasCep = o.faixasCep.map((fx, j) => {
      const f = obj(fx, `lojas[${i}].faixasCep[${j}]`);
      const inicio = txt(f.inicio, `lojas[${i}].faixasCep[${j}].inicio`);
      const fim = txt(f.fim, `lojas[${i}].faixasCep[${j}].fim`);
      if (!/^[0-9]{8}$/.test(inicio) || !/^[0-9]{8}$/.test(fim) || inicio > fim) throw new Error(`Vínculos inválidos: lojas[${i}].faixasCep[${j}]`);
      const prazoDias = f.prazoDias;
      if (typeof prazoDias !== 'number' || !Number.isInteger(prazoDias) || prazoDias < 0) throw new Error(`Vínculos inválidos: lojas[${i}].faixasCep[${j}].prazoDias`);
      return { inicio, fim, prazoDias };
    });
    return {
      fonte,
      idExterno,
      rede: txt(o.rede, `lojas[${i}].rede`),
      nome: txt(o.nome, `lojas[${i}].nome`),
      tipo: um(o.tipo, ['online'], `lojas[${i}].tipo`),
      status: um(o.status, STATUS, `lojas[${i}].status`),
      reputacao,
      faixasCep,
    };
  });
  return { fontes, lojas };
}

export async function carregarVinculos(slug: string, dir: string = DIR_CONFIG): Promise<Vinculos> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Slug de tenant inválido: ${slug}`);
  return validarVinculos(JSON.parse(await readFile(path.join(dir, 'vinculos', `${slug}.json`), 'utf8')));
}

/** Tudo numa transação: ou cria tudo o que falta, ou nada. */
export async function provisionar(pool: pg.Pool, slug: string, v: Vinculos): Promise<ResumoProvisao> {
  const cli = await pool.connect();
  const resumo: ResumoProvisao = { fontesCriadas: [], lojasCriadas: [] };
  try {
    await cli.query('BEGIN');
    const tenantId = await repo.buscarTenant(cli, slug);
    const fonteIds = new Map<string, string>();
    for (const f of v.fontes) {
      const ins = await cli.query<{ id: string }>(
        `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id, nome) DO NOTHING RETURNING id`,
        [tenantId, f.nome, f.tipo, f.frequenciaMinutos, f.regiao, f.statusConfianca, f.confiabilidade, f.baseLegal, f.ativa],
      );
      if (ins.rowCount === 1) {
        resumo.fontesCriadas.push(f.nome);
        fonteIds.set(f.nome, ins.rows[0]!.id);
      } else {
        fonteIds.set(f.nome, (await repo.buscarFonte(cli, tenantId, f.nome)).id);
      }
    }
    for (const l of v.lojas) {
      const sourceId = fonteIds.get(l.fonte)!;
      const ja = await cli.query(`SELECT 1 FROM store_source_refs WHERE tenant_id = $1 AND source_id = $2 AND id_externo = $3`, [tenantId, sourceId, l.idExterno]);
      if (ja.rowCount === 1) continue;
      const loja = await cli.query<{ id: string }>(
        `INSERT INTO stores (tenant_id, rede, nome, tipo, status, reputacao) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [tenantId, l.rede, l.nome, l.tipo, l.status, l.reputacao],
      );
      const storeId = loja.rows[0]!.id;
      for (const fx of l.faixasCep) {
        await cli.query(
          `INSERT INTO store_service_areas (tenant_id, store_id, cep_inicio, cep_fim, prazo_dias) VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, storeId, fx.inicio, fx.fim, fx.prazoDias],
        );
      }
      await cli.query(`INSERT INTO store_source_refs (tenant_id, source_id, id_externo, store_id) VALUES ($1, $2, $3, $4)`, [tenantId, sourceId, l.idExterno, storeId]);
      resumo.lojasCriadas.push(l.nome);
    }
    await cli.query('COMMIT');
    return resumo;
  } catch (err) {
    await cli.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    cli.release();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tenant: { type: 'string' } } });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  if (!values.tenant) throw new Error('Uso: --tenant <slug>');
  const vinculos = await carregarVinculos(values.tenant);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    console.log(JSON.stringify(await provisionar(pool, values.tenant, vinculos)));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
