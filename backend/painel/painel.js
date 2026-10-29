// Painel web do operador, versão final (admin.yaml 1.1.0; DECISIONS 96 e 98). Sem biblioteca e sem build: módulos do navegador,
// DOM montado com textContent (nada de innerHTML com dado vindo da API), sessão só em sessionStorage (fechou a aba, saiu).
// Este arquivo é a moldura: login, menu com contadores, rotas, tema e atalhos. Cada tela mora no seu módulo.
import { chamar, guardarSessao, lerSessao, pedir, quandoPerderSessao } from '/operador/api.js';
import { saudacao } from '/operador/logica.js';
import { avisar, botao, caixa, campo, carregando, dialogo, h, icone, limpar, trocar } from '/operador/ui.js';
import { telaFinanceiro } from '/operador/tela-financeiro.js';
import { telaAlertas, telaDenuncias, telaTriagem } from '/operador/telas-moderacao.js';
import { telaLojas, telaOfertas, telaProdutos } from '/operador/telas-catalogo.js';
import { telaAuditoria, telaFontes, telaInicio, telaOperadores } from '/operador/telas-sistema.js';

const $raiz = document.getElementById('app');

// ------------------------------------------------------------------------------------------------ tema (preferência só deste navegador)
const lerTema = () => { try { return localStorage.getItem('tema'); } catch { return null; } };
function aplicarTema(tema) {
  if (tema === 'claro' || tema === 'escuro') document.documentElement.dataset.theme = tema === 'claro' ? 'light' : 'dark';
  else delete document.documentElement.dataset.theme;
}
aplicarTema(lerTema());
const temaEfetivo = () => document.documentElement.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// ------------------------------------------------------------------------------------------------ rotas e menu
const GRUPOS = [
  ['', [['inicio', 'Visão geral', 'inicio']]],
  ['Moderação', [['alertas', 'Alertas', 'alerta', 'alertas'], ['triagem', 'Triagem', 'triagem', 'triagem'], ['denuncias', 'Denúncias', 'denuncia', 'denuncias']]],
  ['Catálogo', [['ofertas', 'Ofertas manuais', 'oferta'], ['produtos', 'Produtos', 'produto'], ['lojas', 'Lojas', 'loja']]],
  ['Negócio', [['financeiro', 'Financeiro', 'financeiro']]],
  ['Sistema', [['fontes', 'Fontes de preço', 'fonte'], ['operadores', 'Operadores', 'pessoas'], ['auditoria', 'Auditoria', 'auditoria']]],
];
const TELAS = {
  inicio: telaInicio, alertas: telaAlertas, triagem: telaTriagem, denuncias: telaDenuncias, ofertas: telaOfertas, produtos: telaProdutos, lojas: telaLojas,
  financeiro: telaFinanceiro, fontes: telaFontes, operadores: telaOperadores, auditoria: telaAuditoria,
};
const TITULOS = Object.fromEntries(GRUPOS.flatMap(([, itens]) => itens.map(([id, nome]) => [id, nome])));

/** Estado que as telas usam: quem está logado, a config pública do tenant e o último resumo (contadores). */
const ctx = {
  eu: null, config: null, resumo: null,
  navegar: (rota) => { if (location.hash === `#/${rota}`) mostrar(); else location.hash = `#/${rota}`; },
  atualizarContadores: () => atualizarContadores(),
};

let $menu, $conteudo, $titulo, $lateral;
function moldura() {
  $menu = h('nav', { class: 'menu', 'aria-label': 'Seções do painel' }, GRUPOS.map(([grupo, itens]) => h('div', { class: 'menu-grupo' },
    grupo ? h('div', { class: 'menu-grupo-titulo' }, grupo) : null,
    itens.map(([id, nome, ic, contador]) => h('a', { href: `#/${id}`, 'data-id': id, class: 'menu-item' }, icone(ic), h('span', {}, nome),
      contador ? h('span', { class: 'contador', 'data-contador': contador, hidden: true }) : null)))));
  const fecharMenu = () => document.body.classList.remove('menu-aberto');
  $menu.addEventListener('click', (ev) => { if (ev.target.closest('a')) fecharMenu(); });
  const botaoTema = h('button', { type: 'button', class: 'icone-botao', 'aria-label': 'Alternar tema claro ou escuro', title: 'Tema claro/escuro', onclick: () => {
    const novo = temaEfetivo() === 'dark' ? 'claro' : 'escuro';
    try { localStorage.setItem('tema', novo); } catch { /* sem armazenamento: vale só agora */ }
    aplicarTema(novo); trocar(botaoTema, icone(novo === 'escuro' ? 'sol' : 'lua'));
  } }, icone(temaEfetivo() === 'dark' ? 'sol' : 'lua'));
  $lateral = h('aside', { class: 'lateral' },
    h('div', { class: 'marca' }, h('span', { class: 'marca-logo', 'aria-hidden': 'true' }, 'e'), h('span', {}, 'economae', h('small', {}, 'painel do operador'))),
    $menu,
    h('div', { class: 'lateral-rodape' },
      h('div', { class: 'quem', id: 'quem' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, (ctx.eu.nome ?? '?').trim().charAt(0).toUpperCase()),
        h('span', { class: 'quem-texto' }, h('strong', {}, ctx.eu.nome), h('small', {}, ctx.eu.email))),
      h('div', { class: 'linha' }, botaoTema, botao('Atalhos', { class: 'icone-botao', 'aria-label': 'Atalhos do teclado', title: 'Atalhos do teclado (?)', onclick: atalhos }, 'teclado'),
        botao('Sair', { class: 'discreto', onclick: sair }, 'sair'))));
  $titulo = h('h1', { class: 'topo-titulo', id: 'titulo-tela' });
  $conteudo = h('main', { id: 'conteudo', tabindex: '-1', 'aria-labelledby': 'titulo-tela' });
  trocar($raiz,
    h('a', { href: '#conteudo', class: 'pular', onclick: (ev) => { ev.preventDefault(); $conteudo.focus(); } }, 'Pular para o conteúdo'),
    $lateral, h('div', { class: 'fundo-menu', onclick: fecharMenu }),
    h('div', { class: 'principal-area' },
      h('header', { class: 'topo' }, h('button', { type: 'button', class: 'icone-botao so-celular', 'aria-label': 'Abrir o menu', onclick: () => document.body.classList.toggle('menu-aberto') }, icone('menu')),
        $titulo, h('div', { class: 'topo-acoes', id: 'topo-acoes' })),
      $conteudo));
}

async function sair() {
  await chamar('POST', '/v1/admin/auth/sair');
  guardarSessao(null); clearInterval(relogio); entrar();
}

function atalhos() {
  dialogo('Atalhos do teclado', () => h('dl', { class: 'atalhos' },
    [['/', 'Buscar na tela'], ['g depois i', 'Visão geral'], ['g depois a', 'Alertas'], ['g depois t', 'Triagem'], ['g depois d', 'Denúncias'], ['g depois o', 'Ofertas manuais'],
      ['g depois l', 'Lojas'], ['g depois f', 'Financeiro'], ['Esc', 'Fecha janela aberta'], ['?', 'Esta ajuda']].map(([k, t]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, t)])));
}
let prefixoG = 0;
document.addEventListener('keydown', (ev) => {
  if (!ctx.eu || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName) || ev.target.isContentEditable || document.querySelector('dialog[open]');
  if (digitando) return;
  if (ev.key === '/') { const b = $conteudo.querySelector('[data-busca]'); if (b) { ev.preventDefault(); b.focus(); } return; }
  if (ev.key === '?') { atalhos(); return; }
  if (ev.key === 'g') { prefixoG = Date.now(); return; }
  if (Date.now() - prefixoG < 1200) {
    const rota = { i: 'inicio', a: 'alertas', t: 'triagem', d: 'denuncias', o: 'ofertas', l: 'lojas', f: 'financeiro', p: 'produtos' }[ev.key];
    prefixoG = 0;
    if (rota) ctx.navegar(rota);
  }
});

// ------------------------------------------------------------------------------------------------ contadores (pendências)
let relogio;
async function atualizarContadores() {
  try {
    ctx.resumo = await pedir('GET', '/v1/admin/resumo');
    for (const el of document.querySelectorAll('[data-contador]')) {
      const n = ctx.resumo.pendencias[el.dataset.contador] ?? 0;
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n === 0;
      el.setAttribute('aria-label', `${n} pendente(s)`);
    }
    const total = ctx.resumo.pendencias.alertas + ctx.resumo.pendencias.triagem + ctx.resumo.pendencias.denuncias;
    document.title = `${total > 0 ? `(${total}) ` : ''}economae · painel do operador`;
  } catch { /* contador é ajuda, não bloqueia a tela */ }
  return ctx.resumo;
}

// ------------------------------------------------------------------------------------------------ entrada
function entrar(mensagem) {
  ctx.eu = null; clearInterval(relogio);
  document.body.classList.remove('logado');
  const form = h('form', { class: 'cartao login', novalidate: true });
  const email = h('input', { id: 'email', type: 'email', autocomplete: 'username', required: true, placeholder: 'voce@exemplo.com' });
  const codigo = h('input', { id: 'codigo', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', placeholder: '000000', class: 'codigo' });
  const erro = h('div', { role: 'alert' });
  const info = h('p', { class: 'dica' });
  const enviarBotao = h('button', { class: 'principal largo', type: 'submit' }, 'Enviar código');
  const voltar = h('button', { type: 'button', class: 'discreto', hidden: true, onclick: () => { etapa = 'email'; blocoCodigo.hidden = true; voltar.hidden = true; email.disabled = false; enviarBotao.textContent = 'Enviar código'; info.textContent = ''; email.focus(); } }, 'Usar outro e-mail');
  const blocoCodigo = h('div', { hidden: true }, campo('Código de 6 dígitos', codigo, 'codigo', 'Chega no e-mail e vale 10 minutos.'));
  let etapa = 'email';
  form.append(
    h('div', { class: 'login-marca' }, h('span', { class: 'marca-logo grande', 'aria-hidden': 'true' }, 'e'), h('div', {}, h('strong', {}, 'economae'), h('div', { class: 'dica' }, 'Painel do operador'))),
    h('h1', {}, 'Entrar'), mensagem ? caixa('aviso', mensagem) : null,
    campo('E-mail do operador', email, 'email'), blocoCodigo, erro, info, h('div', { class: 'linha' }, enviarBotao, voltar),
    h('p', { class: 'dica rodape-login' }, 'Sem senha: você recebe um código no e-mail. A sessão vale só nesta aba.'));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    limpar(erro); enviarBotao.disabled = true;
    try {
      if (etapa === 'email') {
        if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) throw new Error('Digite um e-mail válido.');
        const r = await chamar('POST', '/v1/admin/auth/email/codigo', { email: email.value.trim() }, {}, false);
        if (r.status !== 202) throw new Error(r.status === 429 ? 'Muitas tentativas. Espere um pouco.' : (r.corpo?.mensagem ?? `Erro ${r.status}`));
        etapa = 'codigo'; blocoCodigo.hidden = false; voltar.hidden = false; email.disabled = true; codigo.focus(); enviarBotao.textContent = 'Entrar';
        info.textContent = 'Se o e-mail for de um operador, o código foi enviado.';
      } else {
        const r = await chamar('POST', '/v1/admin/auth/email/verificar', { email: email.value.trim(), codigo: codigo.value.trim() }, {}, false);
        if (!r.ok) throw new Error(r.corpo?.mensagem ?? `Erro ${r.status}`);
        guardarSessao({ access: r.corpo.access_token, refresh: r.corpo.refresh_token });
        iniciar();
      }
    } catch (e) { trocar(erro, caixa('erro', e.message)); } finally { enviarBotao.disabled = false; }
  });
  trocar($raiz, h('div', { class: 'tela-login' }, form));
  email.focus();
}
quandoPerderSessao((m) => entrar(m));

// ------------------------------------------------------------------------------------------------ início e troca de tela
async function iniciar() {
  if (!lerSessao()) { entrar(); return; }
  trocar($raiz, h('div', { class: 'tela-login' }, carregando(2)));
  try {
    ctx.eu = await pedir('GET', '/v1/admin/me');
    const cfg = await chamar('GET', '/v1/configuracao', undefined, {}, false);
    ctx.config = cfg.corpo ?? { categorias: [] };
  } catch { return; }
  document.body.classList.add('logado');
  moldura();
  await atualizarContadores();
  clearInterval(relogio);
  relogio = setInterval(() => { if (document.visibilityState === 'visible' && ctx.eu) atualizarContadores(); }, 60_000);
  mostrar();
}

let versaoTela = 0;
async function mostrar() {
  if (!ctx.eu) return;
  const [, rota = 'inicio', consulta = ''] = location.hash.match(/^#\/(\w+)\??(.*)$/) ?? [];
  const id = TELAS[rota] ? rota : 'inicio';
  const params = new URLSearchParams(consulta);
  for (const a of $menu.querySelectorAll('a')) { if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  $titulo.textContent = id === 'inicio' ? `${saudacao()}, ${ctx.eu.nome.split(' ')[0]}` : TITULOS[id];
  limpar(document.getElementById('topo-acoes'));
  const minha = ++versaoTela;
  trocar($conteudo, carregando(4));
  try {
    const tela = h('div', { class: 'tela' });
    await TELAS[id](tela, { ...ctx, params, acoesTopo: document.getElementById('topo-acoes'), atual: () => minha === versaoTela });
    if (minha === versaoTela) trocar($conteudo, tela);
  } catch (e) {
    if (minha === versaoTela) trocar($conteudo, caixa('erro', e.message), botao('Tentar de novo', { onclick: mostrar }, 'atualizar'));
  }
  if (minha === versaoTela) $conteudo.focus({ preventScroll: true });
}
window.addEventListener('hashchange', mostrar);
window.addEventListener('unhandledrejection', (ev) => { if (ev.reason instanceof Error) { avisar(ev.reason.message, 'erro'); ev.preventDefault(); } });

iniciar();
