// Cenário HTTP do critério de pronto da fase 3: o caminho do app contra a API real.
// Uso: node cenario.mjs <url-base> <arquivo-de-log-da-api> <comando de coleta "encerrada"...>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [base, arquivoLog, ...coletaEncerrada] = process.argv.slice(2);
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
      'x-tenant': 'padrao',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : null, cabecalhos: res.headers };
}
/** Em desenvolvimento o código vai para o log da API (EMAIL_MODO=log). */
function codigoNoLog(email) {
  const linhas = readFileSync(arquivoLog, 'utf8').split('\n').filter((l) => l.includes(`para=${email} `));
  return /codigo=(\d{6})/.exec(linhas.at(-1) ?? '')?.[1];
}
const produtos = (feed) => feed.corpo.itens.map((i) => `${i.loja.nome}: ${i.decisao}`).sort();

const cfg = await api('GET', '/v1/configuracao');
confere('configuração pública do tenant', [cfg.status, cfg.corpo.nome, cfg.corpo.regiao.nome], [200, 'economae', 'Estado de São Paulo']);
confere('só categorias do universo mãe e bebê', cfg.corpo.categorias.map((c) => c.id),
  ['fraldas_lencos', 'higiene_cuidados_bebe', 'alimentacao_infantil', 'gestacao_pos_parto']);

const email = 'pronto-fase3@exemplo.com';
confere('pedido de código', (await api('POST', '/v1/auth/email/codigo', { corpo: { email } })).status, 202);
const login = await api('POST', '/v1/auth/email/verificar', { corpo: { email, codigo: codigoNoLog(email) } });
confere('login por código cria a conta', [login.status, login.corpo.novoUsuario, login.corpo.usuario.termos.pendente], [200, true, true]);
const token = login.corpo.token;

confere('sem termos aceitos, feed bloqueado', (await api('GET', '/v1/feed', { token })).corpo.erro.codigo, 'TERMOS_PENDENTES');
const termos = await api('PUT', '/v1/eu/termos', { token, corpo: { versao: cfg.corpo.documentos.termos.versao } });
confere('aceite dos termos', [termos.status, termos.corpo.termos.pendente], [200, false]);
confere('consentimento de notificação separado', (await api('PUT', '/v1/eu/notificacoes', { token, corpo: { consentidas: true } })).corpo.notificacoes.consentidas, true);

confere('feed sem preferências', (await api('GET', '/v1/feed', { token })).corpo.erro.codigo, 'PREFERENCIAS_INCOMPLETAS');
const prefs = { categorias: ['fraldas_lencos', 'higiene_cuidados_bebe', 'alimentacao_infantil'], ceps: ['14010000'], silencio: { inicio: '22:00', fim: '07:00' }, limiteDiario: 3 };
confere('CEP fora da região recusado', (await api('PUT', '/v1/preferencias', { token, corpo: { ...prefs, ceps: ['20040002'] } })).corpo.erro.codigo, 'CEP_FORA_DA_REGIAO');
confere('segundo CEP recusado no plano gratuito', (await api('PUT', '/v1/preferencias', { token, corpo: { ...prefs, ceps: ['14010000', '01310100'] } })).corpo.erro.codigo, 'LIMITE_DO_PLANO');
confere('preferências salvas', (await api('PUT', '/v1/preferencias', { token, corpo: prefs })).corpo.completas, true);

const feed1 = await api('GET', '/v1/feed', { token });
confere('feed: alerta da loja aprovada e o da loja em observação; nada descartado',
  produtos(feed1), ['Farmácia Teste A (online): notificar', 'Farmácia Teste B (online): somente_feed']);
confere('feed não pode ir para cache compartilhado', [feed1.cabecalhos.get('cache-control'), feed1.cabecalhos.get('vary')], ['no-store', 'X-Tenant, Authorization']);
const itemA = feed1.corpo.itens.find((i) => i.decisao === 'notificar');
const itemB = feed1.corpo.itens.find((i) => i.decisao === 'somente_feed');
confere('item do feed traz preço, referência, prazo e foto, sem link', [itemA.precoCentavos, itemA.precoReferenciaCentavos > itemA.precoCentavos, itemA.prazoEntregaDias, itemA.imagemUrl, 'link' in itemA], [4990, true, 3, 'https://imagens.exemplo/A-100.jpg', false]);

const det = await api('GET', `/v1/ofertas/${itemA.ofertaId}`, { token });
confere('detalhe ativo com link de afiliado e ao menos 20 dias de histórico', [det.status, det.corpo.ativa, det.corpo.linkAfiliado, typeof det.corpo.link, det.corpo.historico.length >= 20], [200, true, true, 'string', true]);

console.log('--- coleta seguinte: a oferta da loja B sumiu da fonte');
execFileSync(coletaEncerrada[0], coletaEncerrada.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] });
const feed2 = await api('GET', '/v1/feed', { token });
confere('oferta encerrada sai do feed', produtos(feed2), ['Farmácia Teste A (online): notificar']);
const detB = await api('GET', `/v1/ofertas/${itemB.ofertaId}`, { token });
confere('detalhe da encerrada: ativa = false, sem link', [detB.status, detB.corpo.ativa, detB.corpo.link], [200, false, null]);

confere('logout', (await api('POST', '/v1/auth/sair', { token })).status, 204);
confere('token revogado', (await api('GET', '/v1/eu', { token })).status, 401);
const login2 = await api('POST', '/v1/auth/email/codigo', { corpo: { email } }).then(() =>
  api('POST', '/v1/auth/email/verificar', { corpo: { email, codigo: codigoNoLog(email) } }));
confere('novo login na mesma conta', [login2.status, login2.corpo.novoUsuario], [200, false]);
confere('exclusão da conta', (await api('DELETE', '/v1/eu', { token: login2.corpo.token })).status, 204);
confere('sessão some com a conta', (await api('GET', '/v1/eu', { token: login2.corpo.token })).status, 401);

process.exit(falhou ? 1 : 0);
