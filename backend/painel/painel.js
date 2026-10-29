// Painel web do operador (admin.yaml). Sem biblioteca e sem build: módulos do navegador, DOM montado com textContent (nada de innerHTML
// com dado vindo da API), sessão só em sessionStorage (fechou a aba, saiu). Lógica de formulário em logica.js (testada à parte).
import { centavosParaReais, errosDaApi, montarPedidoOfertaManual, ROTULO_CODIGO } from '/operador/logica.js';

const TENANT = document.querySelector('meta[name="tenant"]')?.content ?? 'padrao';
const $conteudo = document.getElementById('conteudo');
const $menu = document.getElementById('menu');
const $quem = document.getElementById('quem');
const $aviso = document.getElementById('aviso');

// ------------------------------------------------------------------------------------------------ DOM
/** h('div', { class: 'x', onclick }, 'texto', outroNo) */
function h(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
  return e;
}
const limpar = (no) => { while (no.firstChild) no.removeChild(no.firstChild); return no; };
let avisoTimer;
function avisar(texto) {
  $aviso.textContent = texto; $aviso.hidden = false;
  clearTimeout(avisoTimer); avisoTimer = setTimeout(() => { $aviso.hidden = true; }, 4500);
}
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const campo = (rotulo, entrada, nome, dica) => h('div', {}, h('label', { for: entrada.id }, rotulo), entrada, dica ? h('div', { class: 'suave' }, dica) : null, h('div', { class: 'erro', 'data-erro': nome, role: 'alert' }));

// ------------------------------------------------------------------------------------------------ API
const lerSessao = () => { try { return JSON.parse(sessionStorage.getItem('sessao') ?? 'null'); } catch { return null; } };
const guardarSessao = (s) => (s ? sessionStorage.setItem('sessao', JSON.stringify(s)) : sessionStorage.removeItem('sessao'));
let renovando = null;

async function chamar(metodo, caminho, corpo, extra = {}, autenticado = true) {
  const cab = { 'X-Tenant': TENANT, Accept: 'application/json', ...extra };
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

/** Como `chamar`, mas já devolve o corpo ou lança Error com a mensagem para mostrar. Sessão caída volta ao login. */
async function pedir(metodo, caminho, corpo, extra) {
  const r = await chamar(metodo, caminho, corpo, extra);
  if (r.status === 401) { guardarSessao(null); entrar(); throw new Error('Sua sessão acabou. Entre de novo.'); }
  if (!r.ok) { const e = new Error(r.corpo?.mensagem ?? `Erro ${r.status}`); e.resposta = r.corpo; e.status = r.status; throw e; }
  return r.corpo;
}

// ------------------------------------------------------------------------------------------------ entrada
function entrar(mensagem) {
  $menu.hidden = true; $quem.hidden = true;
  const form = h('form', { class: 'cartao login', novalidate: true });
  const email = h('input', { id: 'email', type: 'email', autocomplete: 'username', required: true });
  const codigo = h('input', { id: 'codigo', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}' });
  const erro = h('div', { class: 'caixa-erro', role: 'alert', hidden: true });
  const info = h('div', { class: 'suave' });
  const botao = h('button', { class: 'principal', type: 'submit' }, 'Enviar código');
  const blocoCodigo = h('div', { hidden: true }, campo('Código de 6 dígitos', codigo, 'codigo', 'Chega no e-mail; vale 10 minutos.'));
  let etapa = 'email';
  form.append(h('h1', {}, 'Entrar'), mensagem ? h('div', { class: 'caixa-aviso' }, mensagem) : null, campo('E-mail do operador', email, 'email'), blocoCodigo, erro, info, h('div', { class: 'linha' }, botao));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    erro.hidden = true; botao.disabled = true;
    try {
      if (etapa === 'email') {
        const r = await chamar('POST', '/v1/admin/auth/email/codigo', { email: email.value.trim() }, {}, false);
        if (r.status === 202) { etapa = 'codigo'; blocoCodigo.hidden = false; codigo.focus(); botao.textContent = 'Entrar'; info.textContent = 'Se o e-mail for de um operador, o código foi enviado.'; }
        else throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um pouco.' : (r.corpo?.mensagem ?? `Erro ${r.status}`));
      } else {
        const r = await chamar('POST', '/v1/admin/auth/email/verificar', { email: email.value.trim(), codigo: codigo.value.trim() }, {}, false);
        if (!r.ok) throw new Error(r.corpo?.mensagem ?? `Erro ${r.status}`);
        guardarSessao({ access: r.corpo.access_token, refresh: r.corpo.refresh_token });
        iniciar();
      }
    } catch (e) { erro.textContent = e.message; erro.hidden = false; } finally { botao.disabled = false; }
  });
  limpar($conteudo).append(form);
  email.focus();
}

// ------------------------------------------------------------------------------------------------ rotas
const SECOES = [
  ['ofertas', 'Ofertas manuais'], ['alertas', 'Alertas'], ['triagem', 'Triagem'], ['denuncias', 'Denúncias'], ['lojas', 'Lojas'], ['fontes', 'Fontes'], ['auditoria', 'Auditoria'],
];
const TELAS = { ofertas: telaOfertas, alertas: telaAlertas, triagem: telaTriagem, denuncias: telaDenuncias, lojas: telaLojas, fontes: telaFontes, auditoria: telaAuditoria };

async function iniciar() {
  if (!lerSessao()) { entrar(); return; }
  let eu;
  try { eu = await pedir('GET', '/v1/admin/me'); } catch { return; }
  limpar($menu).append(...SECOES.map(([id, nome]) => h('a', { href: `#/${id}`, 'data-id': id }, nome)));
  $menu.hidden = false;
  limpar($quem).append(`${eu.nome} (${eu.email})`, h('button', { onclick: async () => { await chamar('POST', '/v1/admin/auth/sair'); guardarSessao(null); entrar(); } }, 'Sair'));
  $quem.hidden = false;
  mostrar();
}

async function mostrar() {
  if (!lerSessao()) return;
  const id = (location.hash.match(/^#\/(\w+)/) ?? [])[1] ?? 'ofertas';
  const tela = TELAS[id] ?? telaOfertas;
  for (const a of $menu.querySelectorAll('a')) { if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  limpar($conteudo).append(h('p', { class: 'suave' }, 'Carregando…'));
  try { await tela(limpar($conteudo)); } catch (e) { limpar($conteudo).append(h('div', { class: 'caixa-erro', role: 'alert' }, e.message)); }
  $conteudo.focus();
}
window.addEventListener('hashchange', mostrar);

/** Lê todas as páginas de uma lista (até `max` itens). */
async function todas(caminho, max = 500) {
  const itens = []; let cursor = null;
  do {
    const r = await pedir('GET', `${caminho}${caminho.includes('?') ? '&' : '?'}limite=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    itens.push(...r.itens); cursor = r.proximo_cursor;
  } while (cursor && itens.length < max);
  return itens;
}

// ------------------------------------------------------------------------------------------------ ofertas manuais
async function telaOfertas(raiz) {
  const [cfg, lojas] = await Promise.all([chamar('GET', '/v1/configuracao', undefined, {}, false), todas('/v1/admin/lojas')]);
  const categorias = cfg.corpo?.categorias ?? [];
  raiz.append(h('h1', {}, 'Ofertas manuais'));
  const aviso = h('div', { class: 'caixa-aviso' }, 'A oferta manual passa pela mesma triagem de medicamento e NBCAL, entra no feed como "sem histórico verificado" e nunca gera notificação. Marca da Lomadee não entra por aqui: o preço dela vem da coleta.');
  raiz.append(aviso);

  const f = { produtoModo: 'existente', produtoId: '', novo: {}, condicao: { tipo: '' }, frete: { status: 'a_confirmar' } };
  let chave = crypto.randomUUID();
  const ent = (id, attrs = {}) => h('input', { id, name: id, ...attrs });
  const sel = (id, opcoes, attrs = {}) => h('select', { id, name: id, ...attrs }, opcoes.map(([v, t]) => h('option', { value: v }, t)));

  // Produto
  const buscaTexto = ent('busca', { type: 'search', placeholder: 'Nome, marca ou código de barras' });
  const resultados = h('ul', { class: 'resultados', hidden: true });
  const escolhido = h('div', { class: 'suave' }, 'Nenhum produto escolhido.');
  const blocoExistente = h('div', {}, h('label', { for: 'busca' }, 'Buscar produto'), h('div', { class: 'linha' }, buscaTexto,
    h('button', { type: 'button', onclick: async () => {
      if (buscaTexto.value.trim().length < 2) return avisar('Digite ao menos 2 letras.');
      try {
        const r = await pedir('GET', `/v1/admin/produtos?q=${encodeURIComponent(buscaTexto.value.trim())}&limite=20`);
        limpar(resultados).hidden = false;
        if (r.itens.length === 0) resultados.append(h('li', { class: 'suave' }, 'Nada encontrado. Use "Produto novo".'));
        for (const p of r.itens) resultados.append(h('li', {}, h('label', { class: 'inline' }, h('input', { type: 'radio', name: 'prod', onchange: () => { f.produtoId = p.id; escolhido.textContent = `Escolhido: ${p.nome} (${p.marca?.nome ?? 'sem marca'}, ${p.embalagem.quantidade} ${p.embalagem.unidade})`; } }), `${p.nome} · ${p.marca?.nome ?? 'sem marca'} · ${p.embalagem.quantidade} ${p.embalagem.unidade}`)));
      } catch (e) { avisar(e.message); }
    } }, 'Buscar')), resultados, escolhido, h('div', { class: 'erro', 'data-erro': 'produto_id', role: 'alert' }));
  const nNome = ent('n_nome', { maxlength: '300' }), nMarca = ent('n_marca', { maxlength: '100' }), nGtin = ent('n_gtin', { inputmode: 'numeric', maxlength: '14' });
  const nCat = sel('n_cat', [['', 'Escolha…'], ...categorias.map((c) => [c.slug, c.rotulo])]);
  const nSub = sel('n_sub', [['', '(sem subcategoria)']]);
  nCat.addEventListener('change', () => {
    const c = categorias.find((x) => x.slug === nCat.value);
    limpar(nSub).append(...[['', '(sem subcategoria)'], ...(c?.subcategorias ?? []).map((s) => [s.slug, s.rotulo])].map(([v, t]) => h('option', { value: v }, t)));
  });
  const nQtd = ent('n_qtd', { inputmode: 'decimal', placeholder: 'ex.: 60 ou 0,4' }), nUn = sel('n_un', [['un', 'unidades (un)'], ['kg', 'quilos (kg)'], ['l', 'litros (l)']]);
  const blocoNovo = h('div', { class: 'grade', hidden: true },
    campo('Nome (com a embalagem, ex.: "Fralda Pampers G 60 un")', nNome, 'produto_novo.nome'), campo('Marca', nMarca, 'produto_novo.marca'),
    campo('Categoria', nCat, 'produto_novo.categoria'), campo('Subcategoria', nSub, 'produto_novo.subcategoria'),
    campo('Quantidade da embalagem', nQtd, 'produto_novo.embalagem'), campo('Unidade', nUn, 'produto_novo.embalagem_unidade'),
    campo('Código de barras (opcional)', nGtin, 'produto_novo.gtin'));
  const modo = (valor, texto) => h('label', {}, h('input', { type: 'radio', name: 'modo', value: valor, checked: valor === 'existente', onchange: () => { f.produtoModo = valor; blocoExistente.hidden = valor !== 'existente'; blocoNovo.hidden = valor !== 'novo'; } }), ' ', texto);

  // Loja, preço, condição, frete, validade, link
  const lSel = sel('loja', [['', 'Escolha…'], ...lojas.filter((l) => l.status !== 'bloqueada').map((l) => [l.id, `${l.nome} (${l.rede})`])]);
  const pPreco = ent('preco', { inputmode: 'decimal', placeholder: '49,90' });
  const cTipo = sel('cond', [['', 'Sem condição'], ['leve_pague', 'Leve N, pague M'], ['quantidade_minima', 'Quantidade mínima'], ['cartao_fidelidade', 'Cartão de fidelidade'], ['app_da_rede', 'Só no app da rede']]);
  const cA = ent('cond_a', { inputmode: 'numeric' }), cB = ent('cond_b', { inputmode: 'numeric' }), cProg = ent('cond_prog', { maxlength: '100' });
  const cExtra = h('div', { class: 'grade' });
  cTipo.addEventListener('change', () => {
    limpar(cExtra);
    if (cTipo.value === 'leve_pague') cExtra.append(campo('Leve', cA, 'condicao_a'), campo('Pague', cB, 'condicao_b'));
    if (cTipo.value === 'quantidade_minima') cExtra.append(campo('A partir de quantas embalagens', cA, 'condicao_a'));
    if (cTipo.value === 'cartao_fidelidade') cExtra.append(campo('Nome do programa', cProg, 'condicao_p'));
  });
  const fTipo = sel('frete_tipo', [['a_confirmar', 'A confirmar'], ['nao_se_aplica', 'Sem frete'], ['conhecido', 'Valor conhecido']]);
  const fValor = ent('frete_valor', { inputmode: 'decimal', placeholder: '12,90', disabled: true });
  fTipo.addEventListener('change', () => { fValor.disabled = fTipo.value !== 'conhecido'; });
  const vDe = ent('valida_de', { type: 'datetime-local' }), vAte = ent('valida_ate', { type: 'datetime-local' });
  const link = ent('link', { type: 'url', placeholder: 'https://…', maxlength: '2048' });
  const afil = h('input', { id: 'afiliado', type: 'checkbox' });

  const caixa = h('div', { 'aria-live': 'polite' });
  const enviar = h('button', { class: 'principal', type: 'submit' }, 'Cadastrar oferta');
  const form = h('form', { class: 'cartao', novalidate: true },
    h('h2', {}, '1. Produto'), h('div', { class: 'inline' }, modo('existente', 'Já está no catálogo'), modo('novo', 'Produto novo')), blocoExistente, blocoNovo,
    h('h2', {}, '2. Loja e preço'),
    h('div', { class: 'grade' }, campo('Loja', lSel, 'loja_id', 'Só aparece o que está em Lojas. Para a loja entregar no feed precisa de área de CEP.'), campo('Preço da embalagem (R$)', pPreco, 'preco_centavos'),
      campo('Condição', cTipo, 'condicao')), cExtra,
    h('div', { class: 'grade' }, campo('Frete', fTipo, 'frete'), campo('Valor do frete (R$)', fValor, 'frete_valor')),
    h('h2', {}, '3. Validade e link'),
    h('div', { class: 'grade' }, campo('Começa em (opcional)', vDe, 'valida_de'), campo('Termina em', vAte, 'valida_ate', 'Sem data de fim, a oferta vale 7 dias.'), campo('Link da oferta', link, 'link')),
    h('div', { class: 'inline' }, h('label', {}, afil, ' O link é de afiliado (rastreado)')), h('div', { class: 'erro', 'data-erro': 'link_afiliado', role: 'alert' }),
    caixa, h('div', { class: 'linha' }, enviar));
  raiz.append(form);

  const marcarErros = (mapa) => { for (const e of form.querySelectorAll('[data-erro]')) e.textContent = mapa[e.dataset.erro] ?? ''; };
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); limpar(caixa); marcarErros({});
    f.novo = { nome: nNome.value, marca: nMarca.value, categoria: nCat.value, subcategoria: nSub.value, gtin: nGtin.value.trim(), quantidade: nQtd.value, unidade: nUn.value };
    f.lojaId = lSel.value; f.preco = pPreco.value;
    f.condicao = { tipo: cTipo.value, leve: cA.value, pague: cB.value, quantidade: cA.value, programa: cProg.value };
    f.frete = { status: fTipo.value, valor: fValor.value };
    f.validaDe = vDe.value; f.validaAte = vAte.value; f.link = link.value; f.linkAfiliado = afil.checked;
    const pedido = montarPedidoOfertaManual(f);
    if (pedido.erros) { marcarErros(pedido.erros); caixa.append(h('div', { class: 'caixa-erro' }, 'Corrija os campos marcados.')); return; }
    enviar.disabled = true;
    try {
      const o = await pedir('POST', '/v1/admin/ofertas-manuais', pedido.corpo, { 'Idempotency-Key': chave });
      chave = crypto.randomUUID(); // próxima oferta = chave nova
      caixa.append(h('div', { class: 'caixa-ok' }, `Cadastrada: ${o.produto.nome} em ${o.loja.nome} por ${centavosParaReais(o.preco_centavos)}, até ${dataHora(o.valida_ate)}.`,
        o.validade_padrao_aplicada ? h('div', {}, 'Você não informou o fim: valeu o prazo padrão de 7 dias.') : null));
      form.reset(); f.produtoId = ''; escolhido.textContent = 'Nenhum produto escolhido.'; limpar(resultados).hidden = true; limpar(cExtra);
      await listaOfertas();
    } catch (e) {
      const { campos, geral } = errosDaApi(e.resposta);
      marcarErros(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k === 'produto' ? 'produto_id' : k, v])));
      if (e.resposta?.codigo === 'bloqueado_pela_triagem') caixa.append(h('div', { class: 'caixa-erro' }, `Barrado pela triagem: ${campos.produto ?? geral}. O item foi para a fila de Triagem; se for falso positivo e puder ser liberado, libere lá e cadastre de novo.`));
      else caixa.append(h('div', { class: 'caixa-erro', role: 'alert' }, e.status === 503 ? `${geral} (tente de novo daqui a pouco)` : geral));
    } finally { enviar.disabled = false; }
  });

  const secao = h('div', {});
  raiz.append(h('h2', {}, 'Ofertas manuais ativas'), secao);
  async function listaOfertas() {
    const itens = await todas('/v1/admin/ofertas-manuais');
    limpar(secao);
    if (itens.length === 0) { secao.append(h('p', { class: 'suave' }, 'Nenhuma oferta manual ativa.')); return; }
    secao.append(h('table', {}, h('thead', {}, h('tr', {}, ['Produto', 'Loja', 'Preço', 'Vale até', 'Por', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, itens.map((o) => h('tr', {}, h('td', {}, o.produto.nome, o.rotulo_condicao ? h('div', { class: 'selo' }, o.rotulo_condicao) : null), h('td', {}, o.loja.nome),
        h('td', {}, centavosParaReais(o.preco_centavos)), h('td', {}, dataHora(o.valida_ate), o.validade_padrao_aplicada ? h('div', { class: 'suave' }, '(prazo padrão)') : null), h('td', {}, o.criada_por.nome),
        h('td', {}, h('button', { class: 'perigo', onclick: async (ev) => {
          if (!confirm(`Encerrar a oferta de "${o.produto.nome}" em ${o.loja.nome}? Ela sai do feed.`)) return;
          ev.target.disabled = true;
          try { await pedir('DELETE', `/v1/admin/ofertas-manuais/${o.id}`); avisar('Oferta encerrada.'); await listaOfertas(); } catch (e) { avisar(e.message); ev.target.disabled = false; }
        } }, 'Encerrar')))))));
  }
  await listaOfertas();
}

// ------------------------------------------------------------------------------------------------ alertas
async function telaAlertas(raiz) {
  raiz.append(h('h1', {}, 'Alertas aguardando aprovação'));
  const itens = await todas('/v1/admin/alertas');
  if (itens.length === 0) { raiz.append(h('p', { class: 'suave' }, 'Nenhum alerta aguardando aprovação.')); return; }
  for (const a of itens) {
    const obs = h('input', { 'aria-label': 'Observação (opcional)', placeholder: 'Observação (opcional)', maxlength: '1000' });
    const cartao = h('div', { class: 'cartao' });
    const decidir = (resultado) => async (ev) => {
      ev.target.disabled = true;
      try { await pedir('PUT', `/v1/admin/alertas/${a.id}/revisao`, { resultado, observacao: obs.value.trim() || null }); cartao.remove(); avisar(resultado === 'aprovado' ? 'Alerta aprovado.' : 'Alerta rejeitado.'); }
      catch (e) { avisar(e.message); ev.target.disabled = false; }
    };
    cartao.append(h('h3', {}, a.produto.nome), h('div', { class: 'suave' }, `${a.loja.nome} · fonte ${a.fonte.nome} · coletado ${dataHora(a.coletada_em)}`),
      h('div', { class: 'linha' }, h('span', { class: 'preco' }, centavosParaReais(a.preco_centavos)), h('span', {}, `antes ${centavosParaReais(a.preco_referencia_centavos)}`), h('span', { class: 'selo alerta' }, `queda ${Math.round(a.queda * 100)}%`),
        a.rotulo_condicao ? h('span', { class: 'selo' }, a.rotulo_condicao) : null, h('span', { class: 'selo' }, `oferta ${a.situacao_oferta}`)),
      h('p', {}, h('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir a página da loja'), h('span', { class: 'suave' }, ' (confira o preço antes de aprovar)')),
      h('div', { class: 'linha' }, obs, h('button', { class: 'principal', onclick: decidir('aprovado') }, 'Aprovar'), h('button', { class: 'perigo', onclick: decidir('rejeitado') }, 'Rejeitar')));
    raiz.append(cartao);
  }
}

// ------------------------------------------------------------------------------------------------ triagem
async function telaTriagem(raiz) {
  raiz.append(h('h1', {}, 'Triagem: o que foi barrado'), h('p', { class: 'suave' }, 'Itens que a triagem de medicamento e NBCAL não deixou entrar. "Liberado" só existe para falso positivo de texto e cautela; vedado e medicamento da lista nunca se liberam.'));
  const itens = (await todas('/v1/admin/triagem')).filter((b) => b.resultado === null);
  if (itens.length === 0) { raiz.append(h('p', { class: 'suave' }, 'Nada para revisar.')); return; }
  for (const b of itens) {
    const obs = h('input', { 'aria-label': 'Observação (opcional)', placeholder: 'Observação (opcional)', maxlength: '1000' });
    const cartao = h('div', { class: 'cartao' });
    const rev = (resultado) => async (ev) => {
      ev.target.disabled = true;
      try { await pedir('PUT', `/v1/admin/triagem/${b.id}/revisao`, { resultado, observacao: obs.value.trim() || null }); cartao.remove(); avisar('Revisão gravada.'); }
      catch (e) { avisar(e.message); ev.target.disabled = false; }
    };
    cartao.append(h('h3', {}, b.titulo), h('div', { class: 'suave' }, `${b.fonte.nome} · visto de ${dataHora(b.primeira_vez_em)} a ${dataHora(b.ultima_vez_em)}`),
      h('div', { class: 'linha' }, h('span', { class: 'selo ruim' }, ROTULO_CODIGO[b.codigo] ?? b.codigo), b.revisao_humana ? h('span', { class: 'selo alerta' }, 'pede revisão humana') : null),
      h('p', {}, b.detalhe),
      h('div', { class: 'linha' }, obs, h('button', { onclick: rev('bloqueio_correto') }, 'Bloqueio correto'), h('button', { onclick: rev('falso_positivo') }, 'Falso positivo'),
        b.liberavel ? h('button', { class: 'principal', onclick: rev('liberado') }, 'Liberar este item') : h('span', { class: 'suave' }, 'não liberável')));
    raiz.append(cartao);
  }
}

// ------------------------------------------------------------------------------------------------ denúncias
async function telaDenuncias(raiz) {
  raiz.append(h('h1', {}, 'Denúncias: ofertas escondidas'), h('p', { class: 'suave' }, 'Oferta que muita gente denunciou some do app. Decida se volta ou fica escondida.'));
  const itens = (await todas('/v1/admin/denuncias')).filter((c) => c.situacao === 'escondida');
  if (itens.length === 0) { raiz.append(h('p', { class: 'suave' }, 'Nenhuma oferta escondida aguardando decisão.')); return; }
  for (const c of itens) {
    const obs = h('input', { 'aria-label': 'Observação (opcional)', placeholder: 'Observação (opcional)', maxlength: '1000' });
    const cartao = h('div', { class: 'cartao' });
    const dec = (resultado) => async (ev) => {
      ev.target.disabled = true;
      try { await pedir('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, { resultado, observacao: obs.value.trim() || null }); cartao.remove(); avisar('Decisão gravada.'); }
      catch (e) { avisar(e.message); ev.target.disabled = false; }
    };
    cartao.append(h('h3', {}, c.oferta.produto.nome), h('div', { class: 'suave' }, `${c.oferta.loja.nome} · ${centavosParaReais(c.oferta.preco_centavos)} · escondida em ${dataHora(c.aberto_em)}`),
      h('p', {}, `${c.denuncias} denúncia(s) de ${c.pessoas_base} pessoa(s) ativas em 7 dias (limite ${c.limite}). Preço errado: ${c.motivos.preco_errado}; sem estoque: ${c.motivos.sem_estoque}.`),
      h('p', {}, h('a', { href: c.oferta.link, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir a página da loja')),
      h('div', { class: 'linha' }, obs, h('button', { class: 'principal', onclick: dec('restaurar') }, 'Restaurar a oferta'), h('button', { class: 'perigo', onclick: dec('manter_escondida') }, 'Manter escondida')));
    raiz.append(cartao);
  }
}

// ------------------------------------------------------------------------------------------------ lojas e fontes
const STATUS = [['aprovada', 'Aprovada'], ['em_observacao', 'Em observação'], ['bloqueada', 'Bloqueada']];
const classeStatus = (s) => (s === 'aprovada' ? 'ok' : s === 'bloqueada' ? 'ruim' : 'alerta');

async function telaLojas(raiz) {
  raiz.append(h('h1', {}, 'Lojas'), h('p', { class: 'suave' }, 'Loja em observação não notifica (só aparece no feed). Bloqueada some de tudo.'));
  const itens = await todas('/v1/admin/lojas');
  raiz.append(h('div', { class: 'cartao' }, h('table', {}, h('thead', {}, h('tr', {}, ['Loja', 'Rede', 'Tipo', 'Reputação', 'Status', ''].map((t) => h('th', {}, t)))),
    h('tbody', {}, itens.map((l) => {
      const s = h('select', { 'aria-label': `Status de ${l.nome}` }, STATUS.map(([v, t]) => h('option', { value: v, selected: v === l.status }, t)));
      const atual = h('span', { class: `selo ${classeStatus(l.status)}` }, STATUS.find(([v]) => v === l.status)?.[1] ?? l.status);
      return h('tr', {}, h('td', {}, l.nome), h('td', {}, l.rede), h('td', {}, l.tipo), h('td', {}, l.reputacao.toFixed(2)), h('td', {}, atual, ' ', s),
        h('td', {}, h('button', { onclick: async (ev) => {
          if (s.value === l.status) return avisar('Sem mudança.');
          if (!confirm(`Mudar "${l.nome}" para ${s.selectedOptions[0].text}?`)) return;
          ev.target.disabled = true;
          try { const r = await pedir('PUT', `/v1/admin/lojas/${l.id}/status`, { status: s.value, observacao: null }); l.status = r.status; atual.className = `selo ${classeStatus(r.status)}`; atual.textContent = STATUS.find(([v]) => v === r.status)[1]; avisar('Status gravado.'); }
          catch (e) { avisar(e.message); } finally { ev.target.disabled = false; }
        } }, 'Salvar')));
    })))));
}

async function telaFontes(raiz) {
  raiz.append(h('h1', {}, 'Fontes de preço'), h('p', { class: 'suave' }, 'A fonte "manual" é a das ofertas cadastradas aqui e fica inativa de propósito (o coletor não a recolhe). A chave da Lomadee não se digita aqui: ela fica no servidor.'));
  const r = await pedir('GET', '/v1/admin/fontes');
  raiz.append(h('div', { class: 'cartao' }, h('table', {}, h('thead', {}, h('tr', {}, ['Fonte', 'Tipo', 'Confiança', 'Ativa', 'Credencial', ''].map((t) => h('th', {}, t)))),
    h('tbody', {}, r.itens.map((f) => {
      const s = h('select', { 'aria-label': `Confiança de ${f.nome}` }, STATUS.map(([v, t]) => h('option', { value: v, selected: v === f.status_confianca }, t)));
      const ativa = h('input', { type: 'checkbox', checked: f.ativa, 'aria-label': `${f.nome} ativa` });
      return h('tr', {}, h('td', {}, f.nome), h('td', {}, f.tipo), h('td', {}, s), h('td', {}, ativa), h('td', {}, f.credencial.definida ? `definida em ${dataHora(f.credencial.atualizada_em)}` : 'não definida'),
        h('td', {}, h('button', { onclick: async (ev) => {
          if (!confirm(`Salvar "${f.nome}": ${s.selectedOptions[0].text}, ${ativa.checked ? 'ativa' : 'inativa'}?`)) return;
          ev.target.disabled = true;
          try { await pedir('PUT', `/v1/admin/fontes/${f.id}/status`, { status_confianca: s.value, ativa: ativa.checked, observacao: null }); avisar('Fonte gravada.'); }
          catch (e) { avisar(e.message); } finally { ev.target.disabled = false; }
        } }, 'Salvar')));
    })))));
}

// ------------------------------------------------------------------------------------------------ auditoria
const ACAO = {
  operador_entrou: 'Entrou', alerta_revisado: 'Revisou alerta', loja_status_definido: 'Mudou status de loja', fonte_status_definido: 'Mudou status de fonte', fonte_credencial_gravada: 'Gravou credencial',
  denuncia_resolvida: 'Resolveu denúncia', triagem_revisada: 'Revisou triagem', triagem_liberada: 'Liberou da triagem', oferta_manual_criada: 'Cadastrou oferta manual', oferta_manual_encerrada: 'Encerrou oferta manual',
};
async function telaAuditoria(raiz) {
  raiz.append(h('h1', {}, 'Auditoria'), h('p', { class: 'suave' }, 'Tudo que mudou algo, com quem fez e quando. Valor de credencial nunca é registrado.'));
  const corpo = h('tbody', {});
  const mais = h('button', { type: 'button' }, 'Carregar mais');
  let cursor = null;
  const carregar = async () => {
    mais.disabled = true;
    const r = await pedir('GET', `/v1/admin/auditoria?limite=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const a of r.itens) corpo.append(h('tr', {}, h('td', {}, dataHora(a.em)), h('td', {}, a.operador.nome), h('td', {}, ACAO[a.acao] ?? a.acao), h('td', {}, `${a.alvo_tipo} ${a.alvo_id.slice(0, 8)}`), h('td', { class: 'suave' }, JSON.stringify(a.detalhe))));
    cursor = r.proximo_cursor; mais.hidden = !cursor; mais.disabled = false;
  };
  mais.addEventListener('click', () => carregar().catch((e) => avisar(e.message)));
  raiz.append(h('div', { class: 'cartao' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Quem', 'O quê', 'Alvo', 'Detalhe'].map((t) => h('th', {}, t)))), corpo)), mais);
  await carregar();
}

iniciar();
