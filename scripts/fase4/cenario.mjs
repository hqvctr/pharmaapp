// Cenário do critério de pronto da fase 4: o caminho que o app faz até receber um push.
// Uso: node cenario.mjs <url-base> <log-da-api> <comando de despacho...>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [base, arquivoLog, ...despacho] = process.argv.slice(2);
let falhou = false;
function confere(descricao, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${descricao}${ok ? '' : ` (esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)})`}`);
  if (!ok) falhou = true;
}
async function api(metodo, caminho, { token, corpo } = {}) {
  const res = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      'x-tenant': 'economae',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : null };
}
const codigoNoLog = (email) =>
  /codigo=(\d{6})/.exec(readFileSync(arquivoLog, 'utf8').split('\n').filter((l) => l.includes(`para=${email} `)).at(-1) ?? '')?.[1];
function despachar() {
  const saida = execFileSync(despacho[0], despacho.slice(1), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(saida.trim().split('\n').at(-1));
}

async function mae(email, prefs, { consentir = true, aparelho = true } = {}) {
  await api('POST', '/v1/auth/email/codigo', { corpo: { email } });
  const { corpo } = await api('POST', '/v1/auth/email/verificar', { corpo: { email, codigo: codigoNoLog(email) } });
  const token = corpo.token;
  const cfg = (await api('GET', '/v1/configuracao')).corpo;
  await api('PUT', '/v1/eu/termos', { token, corpo: { versao: cfg.documentos.termos.versao } });
  await api('PUT', '/v1/preferencias', { token, corpo: { silencio: null, limiteDiario: null, ...prefs } });
  if (consentir) await api('PUT', '/v1/eu/notificacoes', { token, corpo: { consentidas: true } });
  const r = aparelho ? await api('PUT', '/v1/dispositivos', { token, corpo: { token: `fcm-${email}-${'x'.repeat(24)}`, plataforma: 'android' } }) : null;
  return { token, cadastro: r?.status };
}

const ana = await mae('ana@exemplo.com', { categorias: ['higiene_cuidados_bebe'], ceps: ['14010000'] });
confere('app cadastra o aparelho depois do consentimento', ana.cadastro, 204);
await mae('bia@exemplo.com', { categorias: ['higiene_cuidados_bebe'], ceps: ['14010000'] }, { consentir: false });
await mae('cris@exemplo.com', { categorias: ['fraldas_lencos'], ceps: ['14010000'] });

const r1 = despachar();
confere('despacho: 1 push (alerta notificar da loja aprovada, para quem escolheu a categoria e consentiu)', [r1.alertas, r1.enviadas, r1.falhas], [1, 1, 0]);
const r2 = despachar();
confere('segundo despacho não repete', r2.enviadas, 0);

const entregas = await api('GET', '/v1/feed', { token: ana.token });
confere('feed continua mostrando a oferta que virou push', entregas.corpo.itens.filter((i) => i.decisao === 'notificar').length, 1);

confere('logout da Ana', (await api('POST', '/v1/auth/sair', { token: ana.token })).status, 204);
process.exit(falhou ? 1 : 0);
