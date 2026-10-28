// CLI: executa um ciclo de coleta para uma ou todas as fontes de um tenant.
//   node dist/pipeline/coletar.js --tenant padrao --fonte lomadee --gravacoes <dir> [--agora ISO]   (reprodução)
//   node dist/pipeline/coletar.js --tenant padrao --fonte lomadee                                    (API real)
//   node dist/pipeline/coletar.js --tenant padrao --todas                                            (todas as ativas)
// Na API real as credenciais saem do banco, cifradas (ver pipeline/credencial.ts), e a chave vem de
// CREDENTIALS_KEY. Uma fonte com erro não impede as outras; o código de saída vira 1 se alguma falhou.
import { parseArgs } from 'node:util';
import pg from 'pg';
import type { HttpGetJson } from '../fontes/contrato.js';
import { lerCredenciaisFonte } from '../fontes/credenciais.js';
import { HttpReal, PADRAO_HTTP } from '../fontes/http.js';
import { fabricaDo, validarCredenciais } from '../fontes/registro.js';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import { carregarChaveCredenciais } from '../shared/cifra.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { executarColeta } from './executar.js';
import * as repo from './repositorio.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      tenant: { type: 'string' },
      fonte: { type: 'string' },
      todas: { type: 'boolean' },
      gravacoes: { type: 'string' },
      agora: { type: 'string' },
      'listas-medicamentos': { type: 'string' },
    },
  });
  const databaseUrl = process.env.DATABASE_URL;
  const arquivoListas = values['listas-medicamentos'] ?? process.env.LISTAS_MEDICAMENTOS;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  if (!values.tenant || (!values.fonte && !values.todas) || (values.fonte && values.todas)) {
    throw new Error('Uso: --tenant <slug> (--fonte <nome> | --todas) [--gravacoes <dir>]');
  }
  if (!arquivoListas) throw new Error('Listas de medicamentos ausentes (--listas-medicamentos ou LISTAS_MEDICAMENTOS): coleta não roda sem elas');
  if (values.gravacoes && values.todas) throw new Error('--gravacoes vale para uma fonte só (--fonte)');
  // Relógio só pode ser fixado em reprodução de gravações.
  if (values.agora && !values.gravacoes) throw new Error('--agora só vale com --gravacoes');
  const agora = values.agora ? new Date(values.agora) : new Date();
  if (Number.isNaN(agora.getTime())) throw new Error(`--agora inválido: ${values.agora}`);

  const config = await carregarConfigTenant(values.tenant);
  const listas = await carregarListasMedicamentos(arquivoListas);
  const chaves = values.gravacoes ? [] : [carregarChaveCredenciais()];

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  let falhou = false;
  try {
    const tenantId = await repo.buscarTenant(pool, values.tenant);
    const nomes = values.fonte ? [values.fonte] : await repo.listarFontesAtivas(pool, tenantId);
    if (nomes.length === 0) console.error('Nenhuma fonte ativa neste tenant');

    for (const nome of nomes) {
      try {
        const bloco = config.fontes[nome];
        if (bloco === undefined) throw new Error(`Tenant sem configuração da fonte ${nome}`);
        const fabrica = fabricaDo(bloco.adaptador);
        const fonte = await repo.buscarFonte(pool, tenantId, nome);
        const lojas = await repo.buscarLojasDaFonte(pool, tenantId, fonte.id);

        let http: HttpGetJson;
        let credenciais: Record<string, string>;
        if (values.gravacoes) {
          if (fabrica.httpGravado === undefined) throw new Error(`O adaptador ${fabrica.adaptador} não reproduz gravações`);
          http = fabrica.httpGravado(values.gravacoes);
          credenciais = Object.fromEntries(fabrica.credenciais.map((c) => [c, 'gravacao']));
        } else {
          const lidas = await lerCredenciaisFonte(pool, chaves, tenantId, fonte.id);
          if (lidas === null) throw new Error(`Fonte ${nome} sem credencial gravada (use pipeline/credencial.js)`);
          validarCredenciais(fabrica, lidas);
          credenciais = lidas;
          http = new HttpReal({
            ...PADRAO_HTTP,
            ...(typeof bloco.intervaloMs === 'number' ? { intervaloMs: bloco.intervaloMs } : {}),
          });
        }
        const adapter = fabrica.criar({ http, config: bloco, credenciais, lojas: [...lojas.keys()] });
        const resumo = await executarColeta({
          pool,
          tenantId,
          fonte,
          lojas,
          adapter,
          config,
          mapaCategorias: bloco.mapaCategorias,
          listas,
          agora,
          log: (m) => console.error(`[${nome}] ${m}`),
        });
        console.log(JSON.stringify({ fonte: nome, agora: agora.toISOString(), ...resumo }));
        if (resumo.erros > 0) falhou = true;
      } catch (err) {
        falhou = true;
        console.error(`[${nome}] ${err instanceof Error ? err.message : err}`);
      }
    }
  } finally {
    await pool.end();
  }
  if (falhou) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
