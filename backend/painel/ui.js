// Peças de interface do painel do operador. DOM sempre por createElement/textContent: dado da API nunca vira HTML (DECISIONS 96).
// Nada de atributo `style` (a CSP só aceita a folha do painel): medidas dinâmicas vão por CSSOM (`el.style.x = ...`), que a CSP permite.

/** h('div', { class: 'x', onclick }, 'texto', outroNo) */
export function h(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'hidden') e[k] = Boolean(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  anexar(e, filhos);
  return e;
}
/** Como `append`, mas ignora null/false/undefined (o `append` do navegador escreveria "null" na tela). */
export function anexar(e, ...filhos) {
  for (const f of filhos.flat(Infinity)) if (f !== null && f !== undefined && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
  return e;
}
export const limpar = (no) => { while (no.firstChild) no.removeChild(no.firstChild); return no; };
export const trocar = (no, ...filhos) => anexar(limpar(no), filhos);

const NS = 'http://www.w3.org/2000/svg';
/** Elemento SVG (atributos sempre por setAttribute). */
export function s(tag, attrs = {}, ...filhos) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, String(v));
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
  return e;
}

// ------------------------------------------------------------------------------------------------ ícones (traço de 24 px)
const ICONES = {
  inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M10 21v-6h4v6'],
  alerta: ['M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  triagem: ['M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', 'M9 12l2 2 4-4'],
  denuncia: ['M4 21V4', 'M4 4h12l-2 4 2 4H4'],
  oferta: ['M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', 'M7.5 7.5h.01'],
  produto: ['M21 8 12 3 3 8v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  loja: ['M3 9l1.5-5h15L21 9', 'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z', 'M5 13v8h14v-8', 'M10 21v-4h4v4'],
  financeiro: ['M3 3v18h18', 'M7 15l4-4 3 3 6-6', 'M16 8h4v4'],
  fonte: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'],
  pessoas: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  auditoria: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6', 'M8 13h8', 'M8 17h5'],
  mais: ['M12 5v14', 'M5 12h14'],
  buscar: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  fechar: ['M18 6 6 18', 'M6 6l12 12'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  sair: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  sol: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'],
  lua: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  ok: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  link: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'M15 3h6v6', 'M10 14 21 3'],
  atualizar: ['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v6h-6'],
  aviso: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  relogio: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  importar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  tabela: ['M3 3h18v18H3z', 'M3 9h18', 'M3 15h18', 'M9 3v18'],
  grafico: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  lixo: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  editar: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
  mapa: ['M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z', 'M9 3v15', 'M15 6v15'],
  seta: ['M9 18l6-6-6-6'],
  teclado: ['M2 6h20v12H2z', 'M6 10h.01', 'M10 10h.01', 'M14 10h.01', 'M18 10h.01', 'M7 14h10'],
};
export function icone(nome, tamanho = 20) {
  return s('svg', { class: 'icone', width: tamanho, height: tamanho, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' },
    (ICONES[nome] ?? ICONES.info).map((d) => s('path', { d })));
}

// ------------------------------------------------------------------------------------------------ peças
export const botao = (texto, attrs = {}, nomeIcone) => h('button', { type: 'button', ...attrs }, nomeIcone ? icone(nomeIcone, 18) : null, texto ? h('span', {}, texto) : null);
export const selo = (texto, tipo = '') => h('span', { class: `selo ${tipo}`.trim() }, texto);
export const vazio = (titulo, texto, ...acoes) => h('div', { class: 'vazio' }, h('div', { class: 'vazio-arte' }, icone('ok', 28)), h('h3', {}, titulo), texto ? h('p', {}, texto) : null, acoes.length ? h('div', { class: 'linha centro' }, acoes) : null);
export const carregando = (linhas = 3) => h('div', { class: 'esqueleto', 'aria-busy': 'true', 'aria-label': 'Carregando' }, Array.from({ length: linhas }, () => h('div', { class: 'esqueleto-linha' })));
export const caixa = (tipo, ...conteudo) => h('div', { class: `caixa caixa-${tipo}`, role: tipo === 'erro' ? 'alert' : undefined }, icone(tipo === 'erro' ? 'aviso' : tipo === 'ok' ? 'ok' : tipo === 'aviso' ? 'aviso' : 'info', 18), h('div', {}, conteudo));

/** Campo com rótulo, dica e lugar para erro (`data-erro=nome`). */
export function campo(rotulo, entrada, nome, dica) {
  entrada.id ||= `c-${nome.replace(/[^\w]/g, '_')}`;
  const idDica = dica ? `${entrada.id}-dica` : null;
  if (idDica) entrada.setAttribute('aria-describedby', idDica);
  return h('div', { class: 'campo' }, h('label', { for: entrada.id }, rotulo), entrada, dica ? h('div', { class: 'dica', id: idDica }, dica) : null, h('div', { class: 'erro', 'data-erro': nome, role: 'alert' }));
}
export const entrada = (attrs = {}) => h('input', { type: 'text', ...attrs });
export const seletor = (opcoes, attrs = {}, atual) => h('select', attrs, opcoes.map(([v, t]) => h('option', { value: v, selected: v === atual }, t)));

/** Marca os erros de campo dentro de `raiz` ({ nome: mensagem }) e foca o primeiro. */
export function marcarErros(raiz, mapa) {
  let primeiro = null;
  for (const e of raiz.querySelectorAll('[data-erro]')) {
    e.textContent = mapa[e.dataset.erro] ?? '';
    const ctrl = e.parentElement?.querySelector('input,select,textarea');
    if (ctrl) { if (mapa[e.dataset.erro]) { ctrl.setAttribute('aria-invalid', 'true'); primeiro ??= ctrl; } else ctrl.removeAttribute('aria-invalid'); }
  }
  primeiro?.focus();
  return primeiro !== null;
}

/** Abas segmentadas: [[id, rótulo, contagem?]] → elemento; `aoTrocar(id)`. */
export function abas(itens, atual, aoTrocar, rotulo = 'Filtro') {
  const raiz = h('div', { class: 'abas', role: 'tablist', 'aria-label': rotulo });
  const desenhar = (sel) => trocar(raiz, itens.map(([id, texto, n]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': id === sel ? 'true' : 'false', class: id === sel ? 'ativa' : '',
    onclick: () => { desenhar(id); aoTrocar(id); },
  }, texto, n !== undefined && n !== null ? h('span', { class: 'contagem' }, String(n)) : null)));
  desenhar(atual);
  return raiz;
}

/** Caixa de busca com atraso; "/" no teclado foca a busca da tela. */
export function busca(placeholder, aoBuscar, atraso = 150) {
  const i = h('input', { type: 'search', placeholder, 'aria-label': placeholder, class: 'busca-entrada', 'data-busca': '1' });
  let t;
  i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => aoBuscar(i.value), atraso); });
  return h('label', { class: 'busca' }, icone('buscar', 18), i);
}

// ------------------------------------------------------------------------------------------------ avisos (toast)
let $avisos;
export function avisar(texto, tipo = 'ok') {
  $avisos ??= document.getElementById('avisos');
  const a = h('div', { class: `toast toast-${tipo}`, role: tipo === 'erro' ? 'alert' : 'status' }, icone(tipo === 'erro' ? 'aviso' : 'ok', 18), h('span', {}, texto),
    h('button', { type: 'button', class: 'toast-fechar', 'aria-label': 'Fechar aviso', onclick: () => a.remove() }, icone('fechar', 16)));
  $avisos.append(a);
  setTimeout(() => a.classList.add('saindo'), tipo === 'erro' ? 7000 : 4000);
  setTimeout(() => a.remove(), tipo === 'erro' ? 7400 : 4400);
}

// ------------------------------------------------------------------------------------------------ diálogos (<dialog>: foco preso e Esc nativos)
/** Abre um diálogo modal. `montar(fechar)` devolve o conteúdo. Promessa resolve com o valor passado a `fechar`. */
export function dialogo(titulo, montar, { largo = false, lateral = false } = {}) {
  return new Promise((resolver) => {
    const d = h('dialog', { class: `dialogo${largo ? ' largo' : ''}${lateral ? ' lateral' : ''}`, 'aria-labelledby': 'dialogo-titulo' });
    let valor;
    const fechar = (v) => { valor = v; d.close(); };
    d.addEventListener('close', () => { d.remove(); resolver(valor); });
    d.addEventListener('click', (ev) => { if (ev.target === d) fechar(undefined); }); // clique fora fecha
    d.append(h('header', { class: 'dialogo-topo' }, h('h2', { id: 'dialogo-titulo' }, titulo), h('button', { type: 'button', class: 'icone-botao', 'aria-label': 'Fechar', onclick: () => fechar(undefined) }, icone('fechar'))),
      h('div', { class: 'dialogo-corpo' }, montar(fechar)));
    document.body.append(d);
    d.showModal();
  });
}

/** Confirmação: resolve true/false. `perigo` pinta o botão de vermelho. Com `pedirObservacao`, resolve { ok, observacao }. */
export function confirmar(titulo, texto, { sim = 'Confirmar', perigo = false, pedirObservacao = false } = {}) {
  return dialogo(titulo, (fechar) => {
    const obs = pedirObservacao ? h('textarea', { id: 'confirmar-obs', rows: '2', maxlength: '1000', placeholder: 'Opcional: o motivo fica na auditoria' }) : null;
    const ok = h('button', { type: 'button', class: perigo ? 'perigo-cheio' : 'principal', onclick: () => fechar(pedirObservacao ? { ok: true, observacao: obs.value.trim() || null } : true) }, sim);
    setTimeout(() => (obs ?? ok).focus(), 0);
    return h('div', {}, h('p', {}, texto), obs ? campo('Observação', obs, 'obs') : null,
      h('div', { class: 'acoes-dialogo' }, h('button', { type: 'button', onclick: () => fechar(pedirObservacao ? { ok: false } : false) }, 'Voltar'), ok));
  }).then((v) => v ?? (pedirObservacao ? { ok: false } : false));
}

// ------------------------------------------------------------------------------------------------ formatos
export const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const dataCurta = (iso) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '—');
export const numero = (n) => Number(n ?? 0).toLocaleString('pt-BR');
export const porcento = (f, casas = 0) => `${(f * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;

/** Foto do produto (https), com fundo neutro quando não há ou falha. */
export function foto(url, alt = '', classe = 'foto') {
  const caixaFoto = h('div', { class: `${classe} sem-foto` }, icone('produto', 22));
  if (typeof url === 'string' && /^https:\/\//.test(url)) {
    const img = h('img', { src: url, alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.addEventListener('load', () => { caixaFoto.classList.remove('sem-foto'); trocar(caixaFoto, img); });
    img.addEventListener('error', () => img.remove());
  }
  return caixaFoto;
}
