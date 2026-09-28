// CLI: executa um ciclo de coleta para uma fonte de um tenant.
//   node dist/pipeline/coletar.js --tenant padrao --fonte lomadee --gravacoes <dir> [--agora ISO]
// Sem --gravacoes, usaria a API real; a vinculação (credencial por tenant, P2) ainda não existe.
import { parseArgs } from 'node:util';
import pg from 'pg';
import { LomadeeAdapter } from '../fontes/lomadee.js';
import { HttpGravado } from '../fontes/gravacoes.js';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { executarColeta } from './executar.js';
import * as repo from './repositorio.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      tenant: { type: 'string' },
      fonte: { type: 'string' },
      gravacoes: { type: 'string' },
      agora: { type: 'string' },
      'listas-medicamentos': { type: 'string' },
    },
  });
  const databaseUrl = process.env.DATABASE_URL;
  const arquivoListas = values['listas-medicamentos'] ?? process.env.LISTAS_MEDICAMENTOS;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  if (!values.tenant || !values.fonte) throw new Error('Uso: --tenant <slug> --fonte <nome> --gravacoes <dir>');
  if (!arquivoListas) throw new Error('Listas de medicamentos ausentes (--listas-medicamentos ou LISTAS_MEDICAMENTOS): coleta não roda sem elas');
  if (!values.gravacoes) {
    throw new Error('Coleta real ainda não vinculada: credencial por tenant (P2) entra na vinculação da fonte. Use --gravacoes.');
  }
  if (values.fonte !== 'lomadee') throw new Error(`Fonte sem adaptador: ${values.fonte}`);
  // Relógio só pode ser fixado em reprodução de gravações.
  const agora = values.agora ? new Date(values.agora) : new Date();
  if (Number.isNaN(agora.getTime())) throw new Error(`--agora inválido: ${values.agora}`);

  const config = await carregarConfigTenant(values.tenant);
  const cfgLomadee = config.fontes.lomadee;
  if (cfgLomadee === undefined) throw new Error('Tenant sem configuração da fonte lomadee');
  const listas = await carregarListasMedicamentos(arquivoListas);

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const tenantId = await repo.buscarTenant(pool, values.tenant);
    const fonte = await repo.buscarFonte(pool, tenantId, values.fonte);
    const lojas = await repo.buscarLojasDaFonte(pool, tenantId, fonte.id);
    const adapter = new LomadeeAdapter(new HttpGravado(values.gravacoes), {
      baseUrl: cfgLomadee.baseUrl,
      appToken: 'gravacao',
      sourceId: 'gravacao',
      lojas: [...lojas.keys()].sort(),
      tamanhoPagina: cfgLomadee.tamanhoPagina,
      maxPaginas: cfgLomadee.maxPaginas,
    });
    const resumo = await executarColeta({
      pool,
      tenantId,
      fonte,
      lojas,
      adapter,
      config,
      mapaCategorias: cfgLomadee.mapaCategorias,
      listas,
      agora,
      log: (m) => console.error(m),
    });
    console.log(JSON.stringify({ agora: agora.toISOString(), ...resumo }));
    if (resumo.erros > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
