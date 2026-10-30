// Uma rodada do despachante: avisos dos alertas novos → avisos dos seguidos (só depois de coleta completa) → push dos pendentes →
// retenção da central. Roda no mesmo processo do coletor (depois de cada coleta e a cada poucos minutos) ou à mão:
//   node dist/despachante/despachar.js [--seguidos]
// Ambiente: DATABASE_URL, TENANT (padrão "padrao"), FCM_CONTA_SERVICO (caminho do JSON da conta de serviço; sem ele, sem push).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { enviadorDoAmbiente, type EnviadorPush } from './fcm.js';
import { avaliarSeguidos, gerarAvisosDeAlertas, type Tenant } from './gerar.js';
import { enviarPendentes, type ResumoEnvio } from './enviar.js';

const DIA = 86_400_000;

export interface ResumoDespacho {
  /** Outra rodada do mesmo tenant estava em andamento: esta não fez nada. */
  pulou: boolean;
  alertas?: { alertas: number; avisos: number };
  seguidos?: { pessoas: number; avisos: number };
  envio?: ResumoEnvio;
  avisosApagados?: number;
  pushLigado: boolean;
}

export interface OpcoesDespacho {
  /** Avaliar os seguidos (voltou ao estoque, queda...). Só depois de uma coleta que chegou a todas as fontes. */
  avaliarSeguidos: boolean;
  enviador: EnviadorPush | null;
  log?: (m: string) => void;
}

export async function despachar(pool: pg.Pool, t: Tenant, agora: Date, o: OpcoesDespacho): Promise<ResumoDespacho> {
  const log = o.log ?? (() => {});
  // Uma rodada por tenant de cada vez, entre processos (coletor e comando manual): trava do Postgres presa a uma conexão.
  const trava = await pool.connect();
  try {
    const livre = (await trava.query(`SELECT pg_try_advisory_lock(hashtext('despachante'), hashtext($1)) AS ok`, [t.tenantId])).rows[0].ok as boolean;
    if (!livre) return { pulou: true, pushLigado: o.enviador !== null };
    try {
      const resumo: ResumoDespacho = { pulou: false, pushLigado: o.enviador !== null };
      resumo.alertas = await gerarAvisosDeAlertas(pool, t, agora);
      if (o.avaliarSeguidos) resumo.seguidos = await avaliarSeguidos(pool, t, agora);
      resumo.envio = await enviarPendentes(pool, t, agora, o.enviador, log);
      const limite = new Date(agora.getTime() - t.config.app.push.avisosRetencaoDias * DIA);
      resumo.avisosApagados = (await pool.query(`DELETE FROM avisos WHERE tenant_id = $1 AND criado_em < $2`, [t.tenantId, limite])).rowCount ?? 0;
      return resumo;
    } finally {
      await trava.query(`SELECT pg_advisory_unlock(hashtext('despachante'), hashtext($1))`, [t.tenantId]);
    }
  } finally {
    trava.release();
  }
}

/** Linha de log de uma rodada, sem dado de pessoa. */
export function descreverDespacho(r: ResumoDespacho): string {
  if (r.pulou) return 'Despachante: outra rodada em andamento';
  const partes = [`${r.alertas?.avisos ?? 0} avisos de ${r.alertas?.alertas ?? 0} alertas`];
  if (r.seguidos) partes.push(`${r.seguidos.avisos} avisos de seguidos`);
  const destinos = Object.entries(r.envio?.destinos ?? {}).map(([k, v]) => `${k} ${v}`).join(', ');
  partes.push(r.pushLigado ? `push: ${destinos || 'nada a enviar'}` : 'push desligado (sem FCM_CONTA_SERVICO)');
  if (r.envio?.aguardandoSilencio) partes.push(`${r.envio.aguardandoSilencio} esperando o fim do silêncio`);
  if (r.envio?.erroConfig) partes.push(`ERRO no FCM: ${r.envio.erroConfig}`);
  return `Despachante: ${partes.join('; ')}`;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  const slug = process.env.TENANT ?? 'padrao';
  const config = await carregarConfigTenant(slug);
  const enviador = await enviadorDoAmbiente();
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  pool.on('error', (err) => console.warn(`Conexão ociosa com o Postgres caiu: ${err.message}`));
  try {
    const tenant = (await pool.query(`SELECT id FROM tenants WHERE slug = $1`, [slug])).rows[0];
    if (tenant === undefined) throw new Error(`Tenant não encontrado: ${slug}`);
    const r = await despachar(pool, { tenantId: tenant.id, config }, new Date(), {
      avaliarSeguidos: process.argv.includes('--seguidos'),
      enviador,
      log: (m) => console.log(m),
    });
    console.log(descreverDespacho(r));
    console.log(JSON.stringify(r));
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
