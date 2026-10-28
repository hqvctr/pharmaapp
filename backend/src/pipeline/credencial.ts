// CLI administrativo: grava as credenciais de uma fonte, cifradas, para um tenant. O valor nunca é impresso.
//   node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente
//       lê FONTE_<FONTE>_<CAMPO> do ambiente (ex.: FONTE_LOMADEE_APPTOKEN, FONTE_LOMADEE_SOURCEID)
//   echo '{"appToken":"...","sourceId":"..."}' | node dist/pipeline/credencial.js --tenant padrao --fonte lomadee --stdin
//   ... --pedir        pergunta cada campo no terminal, sem mostrar o que é digitado ou colado
//   ... --verificar    confere que dá para decifrar e mostra só os nomes dos campos
// Precisa de CREDENTIALS_KEY (32 bytes em base64) e DATABASE_URL. Nunca passe o valor como argumento.
import { parseArgs } from 'node:util';
import pg from 'pg';
import { gravarCredenciaisFonte, lerCredenciaisFonte } from '../fontes/credenciais.js';
import { fabricaDo } from '../fontes/registro.js';
import { carregarChaveCredenciais } from '../shared/cifra.js';
import { carregarConfigTenant } from '../shared/tenantConfig.js';
import * as repo from './repositorio.js';

async function lerStdin(): Promise<string> {
  const partes: Buffer[] = [];
  for await (const p of process.stdin) partes.push(p as Buffer);
  return Buffer.concat(partes).toString('utf8');
}

/** Lê uma linha do terminal sem mostrá-la (cola e Enter). Só funciona com terminal interativo. */
async function pedirEscondido(pergunta: string): Promise<string> {
  const entrada = process.stdin;
  if (!entrada.isTTY) throw new Error('--pedir precisa de um terminal interativo (no Docker, use "run" sem "-T")');
  process.stderr.write(pergunta);
  entrada.setRawMode(true);
  entrada.resume();
  entrada.setEncoding('utf8');
  return new Promise<string>((resolver, rejeitar) => {
    let digitado = '';
    const fim = (): void => {
      entrada.setRawMode(false);
      entrada.pause();
      entrada.removeListener('data', aoReceber);
      process.stderr.write('\n');
    };
    const aoReceber = (trecho: string): void => {
      for (const c of trecho) {
        if (c === '\r' || c === '\n') {
          fim();
          resolver(digitado.trim());
          return;
        }
        if (c === '\u0003') {
          fim();
          rejeitar(new Error('Cancelado'));
          return;
        }
        if (c === '\u007f' || c === '\b') digitado = digitado.slice(0, -1);
        else if (c >= ' ') digitado += c;
      }
    };
    entrada.on('data', aoReceber);
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      tenant: { type: 'string' },
      fonte: { type: 'string' },
      'de-ambiente': { type: 'boolean' },
      stdin: { type: 'boolean' },
      pedir: { type: 'boolean' },
      verificar: { type: 'boolean' },
    },
  });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  if (!values.tenant || !values.fonte) throw new Error('Uso: --tenant <slug> --fonte <nome> (--pedir | --de-ambiente | --stdin | --verificar)');
  const modos = [values['de-ambiente'], values.stdin, values.pedir, values.verificar].filter(Boolean).length;
  if (modos !== 1) throw new Error('Escolha exatamente um: --pedir, --de-ambiente, --stdin ou --verificar');

  const config = await carregarConfigTenant(values.tenant);
  const bloco = config.fontes[values.fonte];
  if (bloco === undefined) throw new Error(`Tenant sem configuração da fonte ${values.fonte}`);
  const fabrica = fabricaDo(bloco.adaptador);
  const chave = carregarChaveCredenciais();

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const tenantId = await repo.buscarTenant(pool, values.tenant);
    const fonte = await repo.buscarFonte(pool, tenantId, values.fonte);
    if (values.verificar) {
      const c = await lerCredenciaisFonte(pool, [chave], tenantId, fonte.id);
      if (c === null) throw new Error(`Fonte ${values.fonte} sem credencial gravada`);
      console.log(JSON.stringify({ fonte: values.fonte, campos: Object.keys(c).sort(), vazios: Object.entries(c).filter(([, v]) => v === '').map(([k]) => k) }));
      return;
    }
    let campos: Record<string, string>;
    if (values.pedir) {
      campos = {};
      for (const c of fabrica.credenciais) campos[c] = await pedirEscondido(`${values.fonte} - ${c} (cole e aperte Enter; nada aparece na tela): `);
    } else if (values['de-ambiente']) {
      campos = Object.fromEntries(
        fabrica.credenciais.map((c) => [c, process.env[`FONTE_${values.fonte!.toUpperCase().replace(/-/g, '_')}_${c.toUpperCase()}`] ?? '']),
      );
    } else {
      campos = JSON.parse(await lerStdin()) as Record<string, string>;
    }
    const gravados = await gravarCredenciaisFonte(pool, chave, fabrica, tenantId, fonte.id, campos, null);
    console.log(JSON.stringify({ fonte: values.fonte, gravados, chaveVersao: chave.versao }));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
