// Conversa com /v1/admin. Sessão só em sessionStorage (fechou a aba, saiu; nunca localStorage), renovação automática do access.
const TENANT = document.querySelector('meta[name="tenant"]')?.content ?? 'padrao';

export const lerSessao = () => { try { return JSON.parse(sessionStorage.getItem('sessao') ?? 'null'); } catch { return null; } };
export const guardarSessao = (s) => (s ? sessionStorage.setItem('sessao', JSON.stringify(s)) : sessionStorage.removeItem('sessao'));
let renovando = null;
let aoPerderSessao = () => {};
export const quandoPerderSessao = (f) => { aoPerderSessao = f; };

export async function chamar(metodo, caminho, corpo, extra = {}, autenticado = true) {
  const cab = { 'X-Tenant': TENANT, Accept: 'application/json', ...extra };
  delete cab.__repetido;
  if (corpo !== undefined) cab['Content-Type'] = 'application/json';
  const sessao = lerSessao();
  if (autenticado && sessao) cab.Authorization = `Bearer ${sessao.access}`;
  let r;
  try {
    r = await fetch(caminho, { method: metodo, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo), cache: 'no-store' });
  } catch {
    return { status: 0, corpo: { codigo: 'sem_conexao', mensagem: 'Sem conexão com o servidor. Ele está ligado?' } };
  }
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { json = null; }
  if (autenticado && r.status === 401 && json?.codigo === 'sessao_expirada' && sessao?.refresh && !extra.__repetido) {
    if (await renovar()) return chamar(metodo, caminho, corpo, { ...extra, __repetido: '1' }, autenticado);
  }
  return { status: r.status, corpo: json, ok: r.ok, retryAfter: r.headers.get('Retry-After') };
}

async function renovar() {
  renovando ??= (async () => {
    const s = lerSessao();
    const r = await chamar('POST', '/v1/admin/auth/renovar', { refresh_token: s?.refresh }, {}, false);
    if (r.ok && r.corpo?.access_token) { guardarSessao({ access: r.corpo.access_token, refresh: r.corpo.refresh_token }); return true; }
    guardarSessao(null); return false;
  })();
  try { return await renovando; } finally { renovando = null; }
}

/** Como `chamar`, mas devolve o corpo ou lança Error com a mensagem para mostrar (e.resposta, e.status). Sessão caída volta ao login. */
export async function pedir(metodo, caminho, corpo, extra) {
  const r = await chamar(metodo, caminho, corpo, extra);
  if (r.status === 401) { guardarSessao(null); aoPerderSessao('Sua sessão acabou. Entre de novo.'); throw new Error('Sua sessão acabou. Entre de novo.'); }
  if (!r.ok) { const e = new Error(r.corpo?.mensagem ?? `Erro ${r.status}`); e.resposta = r.corpo; e.status = r.status; throw e; }
  return r.corpo;
}

/** Lê todas as páginas de uma lista (até `max` itens). */
export async function todas(caminho, max = 500) {
  const itens = []; let cursor = null;
  do {
    const r = await pedir('GET', `${caminho}${caminho.includes('?') ? '&' : '?'}limite=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    itens.push(...r.itens); cursor = r.proximo_cursor;
  } while (cursor && itens.length < max);
  return { itens, truncado: cursor !== null };
}
