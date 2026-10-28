// CLI: executa um ciclo de coleta para uma ou todas as fontes de um tenant.
//   node dist/pipeline/coletar.js --tenant padrao --fonte lomadee --gravacoes <dir> [--agora ISO]   (reprodução)
//   node dist/pipeline/coletar.js --tenant padrao --fonte lomadee                                    (API real)
//   node dist/pipeline/coletar.js --tenant padrao --todas                                            (todas as ativas)
//   ... --chave-pelo-proxy   a chave é anexada pelo proxy do ambiente de nuvem ("segredo de rede"): o programa
//                            nunca a vê, não lê credencial do banco e não manda cabeçalho de autenticação.
// Na API real as credenciais saem do banco, cifradas (ver pipeline/credencial.ts), e a chave vem de
// CREDENTIALS_KEY. Uma fonte com erro não impede as outras; o código de saída vira 1 se alguma falhou.
// Para rodar sozinho a cada 2 horas, veja pipeline/ciclo.ts.
import { parseArgs } from 'node:util';
import pg from 'pg';
import { carregarListasMedicamentos } from '../normalizador/listas.js';
import { carregarChaveCredenciais } from '../shared/cifra.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import { coletarFontes, type ModoCredencial } from './coletarFontes.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      tenant: { type: 'string' },
      fonte: { type: 'string' },
      todas: { type: 'boolean' },
      'chave-pelo-proxy': { type: 'boolean' },
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
  const peloProxy = values['chave-pelo-proxy'] === true;
  if (peloProxy && values.gravacoes) throw new Error('--chave-pelo-proxy não vale com --gravacoes');
  const modo: ModoCredencial = values.gravacoes
    ? { tipo: 'gravacoes', dir: values.gravacoes }
    : peloProxy
      ? { tipo: 'proxy' }
      : { tipo: 'banco', chaves: [carregarChaveCredenciais()] };

  const config = await carregarConfigTenant(values.tenant);
  const listas = await carregarListasMedicamentos(arquivoListas);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const { resultados, falhou } = await coletarFontes({
      pool,
      tenantSlug: values.tenant,
      config,
      listas,
      fontes: values.fonte ? [values.fonte] : 'ativas',
      modo,
      agora,
      log: (m) => console.error(m),
    });
    for (const r of resultados) if (r.resumo) console.log(JSON.stringify({ fonte: r.fonte, agora: agora.toISOString(), ...r.resumo }));
    if (falhou) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
