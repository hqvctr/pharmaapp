// Mostra, em português simples, como está a coleta: há quantos dias o histórico de preços começou, quanto já foi
// coletado e como foi o último ciclo.
//   node dist/pipeline/status.js [--tenant padrao]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import * as repo from './repositorio.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';

export const DIAS_PARA_ALERTA = 14;

export interface Contagens {
  produtos: number;
  ofertas: number;
  linhasHistorico: number;
  primeiraObservacao: Date | null;
  /** Dias já fechados (fuso do tenant) com algum preço guardado: é o que o motor conta como histórico (DECISIONS 27). */
  diasFechados: number;
  ultimaColeta: Date | null;
  bloqueios: number;
  alertas: number;
}

/** Texto para o operador. `agora` entra como argumento para o teste. */
export function descreverStatus(c: Contagens, ultimoCiclo: { falhou: boolean; fim: string; erro?: string } | null, agora: Date): string[] {
  const linhas: string[] = [];
  if (c.primeiraObservacao === null) {
    linhas.push('Ainda não há nenhum preço guardado. Se o coletor acabou de ligar, espere o primeiro ciclo terminar (alguns minutos).');
  } else {
    const dias = c.diasFechados;
    linhas.push(`Histórico de preços: ${dias} de ${DIAS_PARA_ALERTA} dias.`);
    linhas.push(
      dias >= DIAS_PARA_ALERTA
        ? 'Já dá para avaliar promoções com base no histórico.'
        : `Faltam cerca de ${DIAS_PARA_ALERTA - dias} dias de coleta para os alertas poderem começar.`,
    );
  }
  if (primeiroDiaAberto(c)) linhas.push('O dia de hoje ainda não conta: o histórico só soma dias que já terminaram.');
  linhas.push(`Produtos guardados: ${c.produtos}. Ofertas: ${c.ofertas}. Preços registrados: ${c.linhasHistorico}.`);
  linhas.push(`Itens barrados pela triagem (por exemplo, remédios): ${c.bloqueios}. Alertas criados: ${c.alertas}.`);
  if (c.ultimaColeta !== null) {
    const horas = Math.floor((agora.getTime() - c.ultimaColeta.getTime()) / 3_600_000);
    linhas.push(`Última coleta de preços: há ${horas} hora(s).${horas >= 6 ? ' ATENÇÃO: está demorando; confira se o computador está ligado e o Docker aberto.' : ''}`);
  }
  if (ultimoCiclo !== null) {
    linhas.push(`Último ciclo do coletor: ${ultimoCiclo.falhou ? 'COM PROBLEMA' : 'ok'} (${ultimoCiclo.fim}).${ultimoCiclo.erro ? ` Motivo: ${ultimoCiclo.erro}` : ''}`);
  }
  return linhas;
}

function primeiroDiaAberto(c: Contagens): boolean {
  return c.primeiraObservacao !== null && c.diasFechados === 0;
}

async function contagens(pool: pg.Pool, tenantId: string, fuso: string): Promise<Contagens> {
  const q = async (sql: string): Promise<Record<string, unknown>> => (await pool.query(sql, [tenantId])).rows[0] as Record<string, unknown>;
  const h = await q(`SELECT count(*)::int AS n, min(observado_em) AS primeira FROM price_history WHERE tenant_id = $1`);
  const d = (
    await pool.query(
      `SELECT count(DISTINCT (observado_em AT TIME ZONE $2)::date)::int AS n FROM price_history
        WHERE tenant_id = $1 AND (observado_em AT TIME ZONE $2)::date < (now() AT TIME ZONE $2)::date`,
      [tenantId, fuso],
    )
  ).rows[0] as Record<string, unknown>;
  const p = await q(`SELECT count(*)::int AS n FROM products WHERE tenant_id = $1`);
  const o = await q(`SELECT count(*)::int AS n, max(coletada_em) AS ultima FROM offers WHERE tenant_id = $1`);
  const b = await q(`SELECT count(*)::int AS n FROM triagem_bloqueios WHERE tenant_id = $1`);
  const a = await q(`SELECT count(*)::int AS n FROM alerts WHERE tenant_id = $1`);
  return {
    produtos: Number(p.n),
    ofertas: Number(o.n),
    linhasHistorico: Number(h.n),
    primeiraObservacao: (h.primeira as Date | null) ?? null,
    diasFechados: Number(d.n),
    ultimaColeta: (o.ultima as Date | null) ?? null,
    bloqueios: Number(b.n),
    alertas: Number(a.n),
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tenant: { type: 'string' } } });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  const tenant = values.tenant ?? process.env.TENANT ?? 'padrao';
  let ultimo: { falhou: boolean; fim: string; erro?: string } | null = null;
  try {
    ultimo = JSON.parse(await readFile(path.join(process.env.DADOS ?? 'data', 'ultimo-ciclo.json'), 'utf8'));
  } catch {
    ultimo = null;
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const tenantId = await repo.buscarTenant(pool, tenant);
    const { fuso } = await carregarConfigTenant(tenant);
    for (const l of descreverStatus(await contagens(pool, tenantId, fuso), ultimo, new Date())) console.log(l);
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
