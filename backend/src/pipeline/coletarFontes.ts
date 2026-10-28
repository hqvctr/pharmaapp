// Coleta de uma ou várias fontes de um tenant. Usada pelo comando `coletar` e pelo coletor em ciclo.
// Uma fonte com erro não impede as outras; o resultado diz quais falharam.
import type pg from 'pg';
import type { HttpGetJson } from '../fontes/contrato.js';
import { lerCredenciaisFonte } from '../fontes/credenciais.js';
import { HttpReal, PADRAO_HTTP } from '../fontes/http.js';
import { fabricaDo, validarCredenciais } from '../fontes/registro.js';
import type { ListasMedicamentos } from '../normalizador/medicamentos.js';
import type { ChaveCredenciais } from '../shared/cifra.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';
import { executarColeta, type ResumoColeta } from './executar.js';
import * as repo from './repositorio.js';

export type ModoCredencial =
  /** Credenciais cifradas no banco, decifradas com as chaves dadas (servidor próprio). */
  | { tipo: 'banco'; chaves: readonly ChaveCredenciais[] }
  /** A chave é anexada pelo proxy do ambiente de nuvem; o programa nunca a vê. */
  | { tipo: 'proxy' }
  /** Respostas gravadas (testes e critério de pronto). */
  | { tipo: 'gravacoes'; dir: string };

export interface OpcoesColeta {
  pool: pg.Pool;
  tenantSlug: string;
  config: ConfigTenant;
  listas: ListasMedicamentos;
  /** Nomes das fontes, ou 'ativas' para todas as ativas e não bloqueadas. */
  fontes: readonly string[] | 'ativas';
  modo: ModoCredencial;
  agora: Date;
  log: (msg: string) => void;
}

export interface ResultadoFonte {
  fonte: string;
  resumo?: ResumoColeta;
  erro?: string;
}

export async function coletarFontes(o: OpcoesColeta): Promise<{ resultados: ResultadoFonte[]; falhou: boolean }> {
  const tenantId = await repo.buscarTenant(o.pool, o.tenantSlug);
  const nomes = o.fontes === 'ativas' ? await repo.listarFontesAtivas(o.pool, tenantId) : [...o.fontes];
  const resultados: ResultadoFonte[] = [];
  let falhou = false;
  if (nomes.length === 0) o.log('Nenhuma fonte ativa neste tenant');

  for (const nome of nomes) {
    try {
      const bloco = o.config.fontes[nome];
      if (bloco === undefined) throw new Error(`Tenant sem configuração da fonte ${nome}`);
      const fabrica = fabricaDo(bloco.adaptador);
      const fonte = await repo.buscarFonte(o.pool, tenantId, nome);
      const lojas = await repo.buscarLojasDaFonte(o.pool, tenantId, fonte.id);
      const opcoesHttp = { ...PADRAO_HTTP, ...(typeof bloco.intervaloMs === 'number' ? { intervaloMs: bloco.intervaloMs } : {}) };

      let http: HttpGetJson;
      let credenciais: Record<string, string>;
      if (o.modo.tipo === 'gravacoes') {
        if (fabrica.httpGravado === undefined) throw new Error(`O adaptador ${fabrica.adaptador} não reproduz gravações`);
        http = fabrica.httpGravado(o.modo.dir);
        credenciais = Object.fromEntries(fabrica.credenciais.map((c) => [c, 'gravacao']));
      } else if (o.modo.tipo === 'proxy') {
        credenciais = {};
        http = new HttpReal(opcoesHttp);
      } else {
        const lidas = await lerCredenciaisFonte(o.pool, o.modo.chaves, tenantId, fonte.id);
        if (lidas === null) throw new Error(`Fonte ${nome} sem credencial gravada (use pipeline/credencial.js)`);
        validarCredenciais(fabrica, lidas);
        credenciais = lidas;
        http = new HttpReal({ ...opcoesHttp, cabecalhos: fabrica.cabecalhos?.(credenciais) ?? {} });
      }
      const adapter = fabrica.criar({ http, config: bloco, credenciais, lojas: [...lojas.keys()] });
      const resumo = await executarColeta({
        pool: o.pool,
        tenantId,
        fonte,
        lojas,
        adapter,
        config: o.config,
        mapaCategorias: bloco.mapaCategorias,
        listas: o.listas,
        agora: o.agora,
        log: (m) => o.log(`[${nome}] ${m}`),
      });
      resultados.push({ fonte: nome, resumo });
      if (resumo.erros > 0) falhou = true;
    } catch (err) {
      falhou = true;
      const erro = err instanceof Error ? err.message : String(err);
      o.log(`[${nome}] ${erro}`);
      resultados.push({ fonte: nome, erro });
    }
  }
  return { resultados, falhou };
}
