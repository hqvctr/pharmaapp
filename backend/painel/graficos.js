// Gráficos do painel em SVG puro (sem biblioteca, por causa da CSP e do "sem build"). Seguem as regras de visualização do projeto:
// cor por entidade em ordem fixa (classes .serie-N, definidas no CSS para claro e escuro), um eixo só, colunas de até 24 px com a
// ponta arredondada e 2 px de folga entre segmentos, linhas de 2 px, grade fina, legenda com 2+ séries, dica no passar do mouse e
// no foco do teclado, e sempre uma tabela gêmea (o gráfico nunca é o único jeito de ler um valor).
import { marcasDoEixo } from '/operador/logica.js';
import { h, s, trocar, botao } from '/operador/ui.js';

const ALTURA = 240, M_ESQ = 70, M_DIR = 16, M_TOPO = 22, M_BAIXO = 30;

/** Redesenha quando a largura do contêiner muda (o SVG é desenhado na largura real para o texto não encolher no celular). */
function responsivo(alvo, desenhar) {
  let largura = 0;
  const ro = new ResizeObserver(() => {
    const l = Math.floor(alvo.clientWidth);
    if (l > 0 && Math.abs(l - largura) > 4) { largura = l; desenhar(l); }
  });
  ro.observe(alvo);
  return ro;
}

function legenda(series) {
  return h('ul', { class: 'legenda', 'aria-label': 'Legenda' }, series.map((x) => h('li', {}, h('span', { class: `chave ${x.classe}`, 'aria-hidden': 'true' }), x.nome)));
}

/** Gráfico + botão "Ver tabela" (alterna com a tabela gêmea). */
function moldura(titulo, series, desenharGrafico, tabela, comLegenda = true) {
  const area = h('div', { class: 'grafico-area' });
  const dica = h('div', { class: 'grafico-dica', role: 'status', hidden: true });
  const corpoGrafico = h('div', { class: 'grafico' }, area, dica);
  const corpoTabela = h('div', { class: 'tabela-rolagem', hidden: true }, tabela);
  const alternar = botao('Ver tabela', { class: 'discreto pequeno', 'aria-pressed': 'false', onclick: () => {
    const verTabela = corpoTabela.hidden;
    corpoTabela.hidden = !verTabela; corpoGrafico.hidden = verTabela;
    alternar.setAttribute('aria-pressed', String(verTabela));
    alternar.querySelector('span').textContent = verTabela ? 'Ver gráfico' : 'Ver tabela';
  } }, 'tabela');
  responsivo(area, (largura) => trocar(area, desenharGrafico(largura, dica)));
  return h('figure', { class: 'figura' },
    h('figcaption', { class: 'figura-topo' }, h('span', { class: 'figura-titulo' }, titulo), alternar),
    comLegenda && series.length > 1 ? legenda(series) : null, corpoGrafico, corpoTabela);
}

function mostrarDica(dica, area, x, linhas) {
  trocar(dica, linhas.map((l) => (l.nodeType ? l : h('div', {}, l))));
  dica.hidden = false;
  const larg = dica.offsetWidth, max = area.clientWidth;
  dica.style.left = `${Math.max(4, Math.min(max - larg - 4, x - larg / 2))}px`;
}
const linhaDica = (classe, nome, valor) => h('div', { class: 'dica-linha' }, classe ? h('span', { class: `chave ${classe}`, 'aria-hidden': 'true' }) : null, h('span', { class: 'dica-nome' }, nome), h('strong', {}, valor));

/** Retângulo com só as duas pontas de cima arredondadas (raio 4), base reta na linha de base. */
function colunaArredondada(x, y, l, alt, r = 4) {
  const rr = Math.min(r, alt, l / 2);
  return `M${x},${y + alt} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + l - rr} Q${x + l},${y} ${x + l},${y + rr} V${y + alt} Z`;
}

function eixoY(largura, max, formato, alturaUtil) {
  const marcas = marcasDoEixo(max);
  const topo = marcas.at(-1) || 1;
  const y = (v) => M_TOPO + alturaUtil - (v / topo) * alturaUtil;
  const g = s('g', { class: 'eixo' }, marcas.map((v) => s('g', {},
    s('line', { x1: M_ESQ, x2: largura - M_DIR, y1: y(v), y2: y(v), class: v === 0 ? 'base' : 'grade-linha' }),
    s('text', { x: M_ESQ - 8, y: y(v) + 4, 'text-anchor': 'end' }, formato(v)))));
  return { g, y, topo };
}

/**
 * Colunas empilhadas por categoria (ex.: receita por mês, empilhada por fonte).
 * series: [{ nome, classe: 'serie-1', valores: number[] }] na ordem fixa; categorias: rótulos do eixo x.
 */
export function colunasEmpilhadas({ titulo, categorias, rotulosLongos = categorias, series, formatoEixo, formatoValor, rotuloTotal = 'Total' }) {
  const totais = categorias.map((_, i) => series.reduce((soma, x) => soma + (x.valores[i] ?? 0), 0));
  const tabela = h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Mês'), series.map((x) => h('th', { scope: 'col', class: 'num' }, x.nome)), h('th', { scope: 'col', class: 'num' }, rotuloTotal))),
    h('tbody', {}, categorias.map((c, i) => h('tr', {}, h('th', { scope: 'row' }, rotulosLongos[i]), series.map((x) => h('td', { class: 'num' }, formatoValor(x.valores[i] ?? 0))), h('td', { class: 'num' }, h('strong', {}, formatoValor(totais[i])))))));

  const desenhar = (largura, dica) => {
    const alturaUtil = ALTURA - M_TOPO - M_BAIXO;
    const { g: eixo, y, topo } = eixoY(largura, Math.max(...totais, 0), formatoEixo, alturaUtil);
    const banda = (largura - M_ESQ - M_DIR) / categorias.length;
    const larg = Math.max(6, Math.min(24, banda * 0.6));
    const passoRotulo = Math.ceil(categorias.length / Math.max(1, Math.floor((largura - M_ESQ) / 46)));
    const maiorI = totais.indexOf(Math.max(...totais));
    const svg = s('svg', { width: largura, height: ALTURA, viewBox: `0 0 ${largura} ${ALTURA}`, role: 'img', 'aria-label': `${titulo}. Use a tabela para ler os valores.` }, eixo);
    categorias.forEach((cat, i) => {
      const cx = M_ESQ + banda * i + banda / 2;
      const x0 = cx - larg / 2;
      let base = M_TOPO + alturaUtil;
      const visiveis = series.map((x, j) => ({ j, v: x.valores[i] ?? 0 })).filter((p) => p.v > 0);
      const grupo = s('g', {});
      visiveis.forEach(({ j, v }, k) => {
        const alt = (v / topo) * alturaUtil;
        const ultimo = k === visiveis.length - 1;
        // 2 px de folga (cor da superfície) entre segmentos: o segmento perde 2 px em cima, menos o do topo.
        const altDesenho = Math.max(1, alt - (ultimo ? 0 : 2));
        const yTopo = base - alt;
        grupo.append(ultimo ? s('path', { d: colunaArredondada(x0, yTopo, larg, altDesenho), class: series[j].classe })
          : s('rect', { x: x0, y: yTopo + 2, width: larg, height: altDesenho, class: series[j].classe }));
        base -= alt;
      });
      // Rótulo seletivo: só no maior mês e no último.
      if (totais[i] > 0 && (i === maiorI || i === categorias.length - 1)) grupo.append(s('text', { x: cx, y: base - 6, 'text-anchor': 'middle', class: 'rotulo-valor' }, formatoEixo(totais[i])));
      if ((i % passoRotulo === 0 && categorias.length - 1 - i >= passoRotulo) || i === categorias.length - 1) grupo.append(s('text', { x: cx, y: ALTURA - 10, 'text-anchor': 'middle', class: 'rotulo-x' }, cat));
      // Alvo de toque/foco: a banda inteira (maior que a coluna).
      const alvo = s('rect', { x: M_ESQ + banda * i, y: M_TOPO, width: banda, height: alturaUtil, class: 'alvo', tabindex: 0, 'aria-label': `${rotulosLongos[i]}: ${formatoValor(totais[i])}` });
      const abrir = () => {
        grupo.classList.add('foco');
        mostrarDica(dica, dica.parentElement, cx, [h('div', { class: 'dica-titulo' }, rotulosLongos[i]),
          ...series.map((x) => (x.valores[i] ? linhaDica(x.classe, x.nome, formatoValor(x.valores[i])) : null)).filter(Boolean),
          linhaDica(null, rotuloTotal, formatoValor(totais[i]))]);
      };
      const fechar = () => { grupo.classList.remove('foco'); dica.hidden = true; };
      alvo.addEventListener('mouseenter', abrir); alvo.addEventListener('focus', abrir);
      alvo.addEventListener('mouseleave', fechar); alvo.addEventListener('blur', fechar);
      svg.append(grupo, alvo);
    });
    return svg;
  };
  return moldura(titulo, series, desenhar, tabela);
}

/** Linhas ao longo do tempo (ex.: cliques por dia). Mira vertical + dica no ponto mais próximo do mouse; setas do teclado andam. */
export function linhas({ titulo, rotulos, rotulosLongos = rotulos, series, formatoEixo, formatoValor }) {
  const tabela = h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Dia'), series.map((x) => h('th', { scope: 'col', class: 'num' }, x.nome)))),
    h('tbody', {}, rotulos.map((_, i) => h('tr', {}, h('th', { scope: 'row' }, rotulosLongos[i]), series.map((x) => h('td', { class: 'num' }, formatoValor(x.valores[i] ?? 0)))))));
  const desenhar = (largura, dica) => {
    const alturaUtil = ALTURA - M_TOPO - M_BAIXO;
    const max = Math.max(0, ...series.flatMap((x) => x.valores));
    const { g: eixo, y } = eixoY(largura, max, formatoEixo, alturaUtil);
    const n = rotulos.length;
    const x = (i) => M_ESQ + (n <= 1 ? 0 : (i / (n - 1)) * (largura - M_ESQ - M_DIR));
    const svg = s('svg', { width: largura, height: ALTURA, viewBox: `0 0 ${largura} ${ALTURA}`, role: 'img', 'aria-label': `${titulo}. Use a tabela para ler os valores.`, tabindex: 0 }, eixo);
    const passo = Math.ceil(n / Math.max(1, Math.floor((largura - M_ESQ) / 64)));
    rotulos.forEach((r, i) => { if ((i % passo === 0 && n - 1 - i >= passo) || i === n - 1) svg.append(s('text', { x: x(i), y: ALTURA - 10, 'text-anchor': i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle', class: 'rotulo-x' }, r)); });
    for (const serie of series) {
      const d = serie.valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg.append(s('path', { d, class: `traco ${serie.classe}` }));
      const ult = serie.valores.length - 1;
      svg.append(s('circle', { cx: x(ult), cy: y(serie.valores[ult] ?? 0), r: 4, class: `ponto ${serie.classe}` }));
    }
    const mira = s('line', { y1: M_TOPO, y2: M_TOPO + alturaUtil, class: 'mira', visibility: 'hidden' });
    const pontos = series.map((serie) => s('circle', { r: 4, class: `ponto ${serie.classe}`, visibility: 'hidden' }));
    svg.append(mira, ...pontos);
    let atual = -1;
    const marcar = (i) => {
      atual = Math.max(0, Math.min(n - 1, i));
      mira.setAttribute('x1', x(atual)); mira.setAttribute('x2', x(atual)); mira.setAttribute('visibility', 'visible');
      series.forEach((serie, j) => { pontos[j].setAttribute('cx', x(atual)); pontos[j].setAttribute('cy', y(serie.valores[atual] ?? 0)); pontos[j].setAttribute('visibility', 'visible'); });
      mostrarDica(dica, dica.parentElement, x(atual), [h('div', { class: 'dica-titulo' }, rotulosLongos[atual]), ...series.map((serie) => linhaDica(serie.classe, serie.nome, formatoValor(serie.valores[atual] ?? 0)))]);
    };
    const esconder = () => { mira.setAttribute('visibility', 'hidden'); pontos.forEach((p) => p.setAttribute('visibility', 'hidden')); dica.hidden = true; };
    const alvo = s('rect', { x: M_ESQ, y: M_TOPO, width: Math.max(1, largura - M_ESQ - M_DIR), height: alturaUtil, class: 'alvo' });
    alvo.addEventListener('mousemove', (ev) => {
      const caixa = svg.getBoundingClientRect();
      marcar(Math.round(((ev.clientX - caixa.left - M_ESQ) / Math.max(1, largura - M_ESQ - M_DIR)) * (n - 1)));
    });
    alvo.addEventListener('mouseleave', esconder);
    svg.addEventListener('focus', () => marcar(n - 1));
    svg.addEventListener('blur', esconder);
    svg.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); marcar(atual - 1); }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); marcar(atual + 1); }
    });
    svg.append(alvo);
    return svg;
  };
  return moldura(titulo, series, desenhar, tabela);
}

/** Barras horizontais (participação de cada fonte). Cada barra é uma entidade com a cor dela; o nome fica na linha, o valor na ponta. */
export function barrasHorizontais({ titulo, itens, formatoValor }) {
  const total = itens.reduce((soma, i) => soma + i.valor, 0);
  const max = Math.max(1, ...itens.map((i) => i.valor));
  const lista = h('ul', { class: 'barras-h' }, itens.map((i) => {
    const barra = h('span', { class: `barra-h ${i.classe}` });
    barra.style.width = `${Math.max(i.valor > 0 ? 1.5 : 0, (i.valor / max) * 100)}%`;
    return h('li', {}, h('span', { class: 'barra-nome' }, h('span', { class: `chave ${i.classe}`, 'aria-hidden': 'true' }), i.nome),
      h('span', { class: 'barra-trilho' }, barra),
      h('span', { class: 'barra-valor' }, formatoValor(i.valor), h('span', { class: 'suave' }, total > 0 ? ` · ${Math.round((i.valor / total) * 100)}%` : '')));
  }));
  return h('figure', { class: 'figura' }, h('figcaption', { class: 'figura-topo' }, h('span', { class: 'figura-titulo' }, titulo)), lista);
}
