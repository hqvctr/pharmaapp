// Coletor em ciclo: roda a coleta de todas as fontes ativas a cada N minutos, para sempre, e mantém a lista de
// medicamentos (CMED) em dia. Pensado para ficar ligado no computador do operador (Docker) ou num servidor.
//   node dist/pipeline/ciclo.js
// Ambiente: DATABASE_URL, CREDENTIALS_KEY (+ CREDENTIALS_KEY_VERSION), TENANT (padrão "padrao"),
//   DADOS (pasta de dados, padrão "data"), INTERVALO_COLETA_MIN (padrão 120), LISTA_MAX_DIAS (padrão 7).
// Um ciclo com erro não derruba o coletor: o erro vai para o log e o próximo ciclo tenta de novo.
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { atualizarListas, listaEstaVelha } from '../normalizador/atualizarListas.js';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import { carregarChaveCredenciais } from '../shared/cifra.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { coletarFontes, type ResultadoFonte } from './coletarFontes.js';

export interface DependenciasCiclo {
  agora: () => Date;
  log: (msg: string) => void;
  /** Verdadeiro se a lista de medicamentos não existe ou está velha demais. */
  listaVelha: (agora: Date) => Promise<boolean>;
  /** Baixa e converte a lista da CMED. */
  atualizarLista: () => Promise<{ versao: string; gtins: number }>;
  carregarListas: () => Promise<ListasMedicamentos>;
  coletar: (listas: ListasMedicamentos, agora: Date) => Promise<{ resultados: ResultadoFonte[]; falhou: boolean }>;
}

export interface ResumoCiclo {
  inicio: string;
  fim: string;
  listaAtualizada: boolean;
  falhou: boolean;
  erro?: string;
  fontes: Array<{ fonte: string; coletadas?: number; bloqueadas?: number; erros?: number; erro?: string }>;
}

/** Um ciclo: lista de medicamentos em dia → coleta de todas as fontes ativas. Nunca lança. */
export async function executarCiclo(d: DependenciasCiclo): Promise<ResumoCiclo> {
  const inicio = d.agora();
  const resumo: ResumoCiclo = { inicio: inicio.toISOString(), fim: inicio.toISOString(), listaAtualizada: false, falhou: false, fontes: [] };
  try {
    let precisaDaLista = false;
    if (await d.listaVelha(inicio)) {
      try {
        const r = await d.atualizarLista();
        resumo.listaAtualizada = true;
        d.log(`Lista de medicamentos atualizada (${r.versao}, ${r.gtins} códigos)`);
      } catch (err) {
        // Sem internet na hora ou página da CMED mudada: segue com a lista que já existe, se existir.
        precisaDaLista = true;
        d.log(`Não consegui atualizar a lista de medicamentos: ${(err as Error).message}`);
      }
    }
    let listas: ListasMedicamentos;
    try {
      listas = await d.carregarListas();
    } catch (err) {
      throw new Error(precisaDaLista ? `Sem lista de medicamentos e não consegui baixar: ${(err as Error).message}` : (err as Error).message);
    }
    const { resultados, falhou } = await d.coletar(listas, inicio);
    resumo.falhou = falhou;
    resumo.fontes = resultados.map((r) => ({
      fonte: r.fonte,
      ...(r.resumo ? { coletadas: r.resumo.coletadas, bloqueadas: r.resumo.bloqueadas, erros: r.resumo.erros } : {}),
      ...(r.erro ? { erro: r.erro } : {}),
    }));
  } catch (err) {
    resumo.falhou = true;
    resumo.erro = err instanceof Error ? err.message : String(err);
    d.log(`Ciclo com erro: ${resumo.erro}`);
  }
  resumo.fim = d.agora().toISOString();
  return resumo;
}

export interface OpcoesLoop {
  intervaloMs: number;
  ciclo: () => Promise<ResumoCiclo>;
  aoTerminarCiclo?: (r: ResumoCiclo) => Promise<void>;
  /** Depois de um ciclo que nem chegou a coletar (sem credencial, sem internet), tenta de novo mais cedo. */
  novaTentativaMs?: number;
  /** Espera `ms` ou até o sinal abortar. */
  dormir: (ms: number, sinal: AbortSignal) => Promise<void>;
  sinal: AbortSignal;
}

/** Ciclo que não chegou a coletar alguma fonte (erro da fonte ou do ciclo todo), diferente de erro numa oferta. */
export function naoChegouAColetar(r: ResumoCiclo): boolean {
  return r.erro !== undefined || r.fontes.some((f) => f.erro !== undefined);
}

/** Roda ciclos até o sinal abortar. O intervalo conta do início de um ciclo ao início do próximo. */
export async function rodarCiclos(o: OpcoesLoop): Promise<void> {
  while (!o.sinal.aborted) {
    const t0 = Date.now();
    const r = await o.ciclo();
    if (o.aoTerminarCiclo) await o.aoTerminarCiclo(r).catch(() => undefined);
    if (o.sinal.aborted) break;
    const espera = o.novaTentativaMs !== undefined && naoChegouAColetar(r) ? Math.min(o.intervaloMs, o.novaTentativaMs) : o.intervaloMs;
    await o.dormir(Math.max(0, espera - (Date.now() - t0)), o.sinal);
  }
}

function dormirReal(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolver) => {
    const t = setTimeout(resolver, ms);
    sinal.addEventListener('abort', () => { clearTimeout(t); resolver(); }, { once: true });
  });
}

function inteiroEnv(nome: string, padrao: number, min: number, max: number): number {
  const bruto = process.env[nome];
  if (bruto === undefined || bruto === '') return padrao;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${nome} inválido: precisa ser um número inteiro entre ${min} e ${max}`);
  return n;
}

/** Grava o resultado do último ciclo (sem segredos) para o comando de status e para o healthcheck do Docker. */
async function gravarEstado(dados: string, r: ResumoCiclo): Promise<void> {
  await mkdir(dados, { recursive: true });
  const destino = path.join(dados, 'ultimo-ciclo.json');
  await writeFile(`${destino}.parcial`, JSON.stringify(r, null, 2));
  await rename(`${destino}.parcial`, destino);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  const tenant = process.env.TENANT ?? 'padrao';
  const dados = process.env.DADOS ?? 'data';
  const intervaloMin = inteiroEnv('INTERVALO_COLETA_MIN', 120, 15, 1440);
  const listaMaxDias = inteiroEnv('LISTA_MAX_DIAS', 7, 1, 60);
  const chave = carregarChaveCredenciais();
  const config = await carregarConfigTenant(tenant);
  const arquivoLista = path.join(dados, 'listas', 'atual.json');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  const parar = new AbortController();
  for (const s of ['SIGTERM', 'SIGINT'] as const) process.on(s, () => parar.abort());
  const log = (m: string): void => console.log(`${new Date().toISOString()} ${m}`);

  log(`Coletor iniciado: tenant ${tenant}, a cada ${intervaloMin} min`);
  try {
    await rodarCiclos({
      intervaloMs: intervaloMin * 60_000,
      novaTentativaMs: 15 * 60_000,
      sinal: parar.signal,
      dormir: dormirReal,
      ciclo: () =>
        executarCiclo({
          agora: () => new Date(),
          log,
          listaVelha: (agora) => listaEstaVelha(arquivoLista, listaMaxDias, agora),
          atualizarLista: async () => {
            const r = await atualizarListas(dados);
            return { versao: r.versao, gtins: r.gtins };
          },
          carregarListas: () => carregarListasMedicamentos(arquivoLista),
          coletar: (listas, agora) =>
            coletarFontes({ pool, tenantSlug: tenant, config, listas, fontes: 'ativas', modo: { tipo: 'banco', chaves: [chave] }, agora, log }),
        }),
      aoTerminarCiclo: async (r) => {
        const totais = r.fontes.map((f) => `${f.fonte}: ${f.erro ? `ERRO ${f.erro}` : `${f.coletadas ?? 0} ofertas`}`).join('; ');
        log(`Ciclo ${r.falhou ? 'com problemas' : 'ok'}${totais ? ` (${totais})` : ''}`);
        await gravarEstado(dados, r);
      },
    });
  } finally {
    await pool.end();
    log('Coletor parado');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
