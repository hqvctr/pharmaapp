#!/usr/bin/env node
// Converte um recorte de um SVG simples (as telas do KV em docs/design/kv/) para VectorDrawable do Android.
// Sem dependências. Aceita: rect (com rx/ry), circle, ellipse, line, polygon, polyline, path e gradiente linear simples
// (fill="url(#id)" para um <linearGradient> com stops). Ignora <text> (texto é desenhado pelo app com a fonte do tema).
// Recusa (para rasterizar à parte): filter, mask, clipPath, image, pattern, radialGradient, transform, opacity de grupo.
//
// Uso:
//   node scripts/svg-para-vector.mjs <entrada.svg> <saida.xml> --recorte x,y,largura,altura [opções]
// Opções:
//   --modo dentro|cruza        dentro: só elementos inteiros no recorte (padrão); cruza: tudo que encosta (o resto é cortado)
//   --tela L,A[,margem]         viewport de saída L×A; o recorte é encaixado no meio, com a margem, sem distorcer
//   --dp L,A                    tamanho intrínseco em dp (padrão: o da tela)
//   --so-cor #hex[,#hex]        só elementos com esse preenchimento ou traço
//   --excluir-cor #hex[,#hex]   tira elementos com esse preenchimento ou traço
//   --fundo #hex                pinta a tela inteira antes do desenho
//   --cor-unica #hex            todas as cores viram esta (ícone monocromático)
//   --previa saida.svg          grava também um SVG do resultado, para conferir no navegador
import { readFileSync, writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------------------------------- leitura do SVG
const NAO_SUPORTADOS = ['filter', 'mask', 'clipPath', 'image', 'pattern', 'radialGradient', 'foreignObject', 'use', 'symbol'];

function atributos(texto) {
  const a = {};
  for (const m of texto.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}

/** Lê o SVG plano das telas do KV: elementos de desenho em ordem, gradientes lineares e classes de cor do <style>. */
export function lerSvg(svg) {
  const problemas = [];
  for (const t of NAO_SUPORTADOS) if (new RegExp(`<${t}[\\s>/]`).test(svg)) problemas.push(`<${t}> não vira VectorDrawable: rasterize esta parte`);
  if (/\stransform\s*=/.test(svg)) problemas.push('atributo transform não suportado: aplique antes de converter ou rasterize');
  if (/<g[\s>][^>]*opacity\s*=/.test(svg)) problemas.push('opacidade de grupo não suportada');

  const classes = {};
  const estilo = svg.match(/<style>([\s\S]*?)<\/style>/);
  if (estilo) for (const m of estilo[1].matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const fill = m[2].match(/fill\s*:\s*(#[0-9a-fA-F]{3,6})/);
    if (fill) classes[m[1]] = fill[1];
  }

  const gradientes = {};
  for (const m of svg.matchAll(/<linearGradient([^>]*)>([\s\S]*?)<\/linearGradient>/g)) {
    const a = atributos(m[1]);
    const stops = [...m[2].matchAll(/<stop([^>]*)\/?>/g)].map((s) => {
      const sa = atributos(s[1]);
      const estiloStop = sa.style ?? '';
      const cor = sa['stop-color'] ?? estiloStop.match(/stop-color\s*:\s*(#[0-9a-fA-F]{3,6})/)?.[1] ?? '#000000';
      const off = sa.offset ?? '0';
      return { cor, offset: off.endsWith('%') ? parseFloat(off) / 100 : parseFloat(off) };
    });
    if (a.gradientUnits !== 'userSpaceOnUse') problemas.push(`gradiente ${a.id}: só gradientUnits="userSpaceOnUse" é suportado`);
    gradientes[a.id] = { x1: num(a.x1), y1: num(a.y1), x2: num(a.x2), y2: num(a.y2), stops };
  }

  // Tira defs, style, title, desc e texto antes de varrer as formas.
  const corpo = svg.replace(/<defs>[\s\S]*?<\/defs>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<(title|desc)[^>]*>[\s\S]*?<\/\1>/g, '');
  const textos = [...corpo.matchAll(/<text\b/g)].length;
  const elementos = [];
  for (const m of corpo.replace(/<text[\s\S]*?<\/text>/g, '').matchAll(/<(rect|circle|ellipse|line|polygon|polyline|path)\b([^>]*?)\/?>/g)) {
    const a = atributos(m[2]);
    if (a.class && !a.fill) for (const c of a.class.split(/\s+/)) if (classes[c]) a.fill = classes[c];
    elementos.push({ tipo: m[1], a, indice: elementos.length });
  }
  return { elementos, gradientes, textos, problemas };
}

const num = (v, padrao = 0) => (v === undefined || v === '' ? padrao : parseFloat(v));

// ---------------------------------------------------------------------------------------------------- formas → path
/** Caminho (sintaxe de path do SVG, que o VectorDrawable aceita) e caixa envolvente de um elemento. */
export function paraCaminho({ tipo, a }) {
  switch (tipo) {
    case 'rect': {
      const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height);
      let rx = a.rx !== undefined ? num(a.rx) : num(a.ry), ry = a.ry !== undefined ? num(a.ry) : rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      const d = rx > 0 || ry > 0
        ? `M${f(x + rx)},${f(y)}H${f(x + w - rx)}A${f(rx)},${f(ry)} 0 0 1 ${f(x + w)},${f(y + ry)}V${f(y + h - ry)}A${f(rx)},${f(ry)} 0 0 1 ${f(x + w - rx)},${f(y + h)}H${f(x + rx)}A${f(rx)},${f(ry)} 0 0 1 ${f(x)},${f(y + h - ry)}V${f(y + ry)}A${f(rx)},${f(ry)} 0 0 1 ${f(x + rx)},${f(y)}Z`
        : `M${f(x)},${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
      return { d, caixa: [x, y, x + w, y + h] };
    }
    case 'circle':
    case 'ellipse': {
      const cx = num(a.cx), cy = num(a.cy);
      const rx = tipo === 'circle' ? num(a.r) : num(a.rx), ry = tipo === 'circle' ? num(a.r) : num(a.ry);
      const d = `M${f(cx - rx)},${f(cy)}A${f(rx)},${f(ry)} 0 1 1 ${f(cx + rx)},${f(cy)}A${f(rx)},${f(ry)} 0 1 1 ${f(cx - rx)},${f(cy)}Z`;
      return { d, caixa: [cx - rx, cy - ry, cx + rx, cy + ry] };
    }
    case 'line': {
      const x1 = num(a.x1), y1 = num(a.y1), x2 = num(a.x2), y2 = num(a.y2);
      return { d: `M${f(x1)},${f(y1)}L${f(x2)},${f(y2)}`, caixa: [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)] };
    }
    case 'polygon':
    case 'polyline': {
      const p = (a.points ?? '').trim().split(/[\s,]+/).map(Number);
      const pares = [];
      for (let i = 0; i + 1 < p.length; i += 2) pares.push([p[i], p[i + 1]]);
      const d = pares.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join('') + (tipo === 'polygon' ? 'Z' : '');
      return { d, caixa: caixaDePontos(pares) };
    }
    case 'path':
      return { d: a.d.trim().replace(/\s+/g, ' '), caixa: caixaDoPath(a.d) };
  }
  throw new Error(`forma não suportada: ${tipo}`);
}

const f = (n) => String(Math.round(n * 1000) / 1000);

function caixaDePontos(pontos) {
  const xs = pontos.map((p) => p[0]), ys = pontos.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Caixa aproximada de um path: os pontos finais e de controle (curvas ficam dentro do casco dos controles). */
export function caixaDoPath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pontos = [];
  let cmd = '', x = 0, y = 0, x0 = 0, y0 = 0, i = 0;
  const n = () => parseFloat(tokens[i++]);
  const tamanhos = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const C = cmd.toUpperCase(), rel = cmd !== C;
    if (C === 'Z') { x = x0; y = y0; continue; }
    if (!(C in tamanhos)) throw new Error(`comando de path desconhecido: ${cmd}`);
    const v = Array.from({ length: tamanhos[C] }, n);
    const bx = rel ? x : 0, by = rel ? y : 0;
    if (C === 'H') { x = bx + v[0]; pontos.push([x, y]); }
    else if (C === 'V') { y = by + v[0]; pontos.push([x, y]); }
    else if (C === 'A') { x = bx + v[5]; y = by + v[6]; pontos.push([x, y]); }
    else {
      for (let k = 0; k < v.length; k += 2) pontos.push([bx + v[k], by + v[k + 1]]);
      x = bx + v[v.length - 2]; y = by + v[v.length - 1];
    }
    if (C === 'M') { x0 = x; y0 = y; cmd = rel ? 'l' : 'L'; }
  }
  return caixaDePontos(pontos);
}

// ---------------------------------------------------------------------------------------------------- conversão
function corAndroid(hex) {
  let h = hex.replace('#', '').toUpperCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return `#FF${h}`;
}

const mesmaCor = (a, b) => a && b && corAndroid(a) === corAndroid(b);

/** Converte. Devolve { xml, previa, usados, avisos }. */
export function converter(svg, op) {
  const { elementos, gradientes, textos, problemas } = lerSvg(svg);
  const [rx, ry, rl, ra] = op.recorte;
  const modo = op.modo ?? 'dentro';
  const tol = 0.5;
  const selecionados = elementos.map((e) => ({ ...e, ...paraCaminho(e) })).filter((e) => {
    const [x1, y1, x2, y2] = e.caixa;
    const dentro = x1 >= rx - tol && y1 >= ry - tol && x2 <= rx + rl + tol && y2 <= ry + ra + tol;
    const cruza = x2 > rx && y2 > ry && x1 < rx + rl && y1 < ry + ra;
    if (!(modo === 'cruza' ? cruza : dentro)) return false;
    const cores = [e.a.fill, e.a.stroke].filter((c) => c && c !== 'none');
    if (op.soCor && !cores.some((c) => op.soCor.some((s) => mesmaCor(c, s)))) return false;
    if (op.excluirCor && cores.some((c) => op.excluirCor.some((s) => mesmaCor(c, s)))) return false;
    return true;
  });
  if (problemas.length && selecionados.length) {
    // Os problemas só importam se o recorte usa algo não suportado; as telas do KV não têm nenhum.
    throw new Error(`SVG com partes que não viram vetor:\n- ${problemas.join('\n- ')}`);
  }

  const [tl, ta, margem] = op.tela ?? [rl, ra, 0];
  const escala = Math.min((tl - 2 * margem) / rl, (ta - 2 * margem) / ra);
  const dx = (tl - rl * escala) / 2 - rx * escala, dy = (ta - ra * escala) / 2 - ry * escala;
  const [dl, da] = op.dp ?? [tl, ta];
  const cor = (c) => corAndroid(op.corUnica ?? c);

  const linhas = [];
  const previa = [];
  if (op.fundo) {
    linhas.push(`    <path android:fillColor="${cor(op.fundo)}" android:pathData="M0,0H${tl}V${ta}H0Z" />`);
    previa.push(`<rect width="${tl}" height="${ta}" fill="${op.corUnica ?? op.fundo}"/>`);
  }
  const grupo = [];
  for (const e of selecionados) {
    const a = e.a;
    const attrs = [];
    let filhos = '';
    const preenchimento = a.fill ?? (e.tipo === 'line' ? 'none' : '#000000');
    const grad = preenchimento.match(/^url\(#(.+)\)$/);
    if (grad) {
      const g = gradientes[grad[1]];
      if (!g) throw new Error(`gradiente ${grad[1]} não encontrado`);
      const stops = g.stops.map((s) => `                <item android:offset="${s.offset}" android:color="${cor(s.cor)}" />`).join('\n');
      filhos = `\n        <aapt:attr name="android:fillColor">\n            <gradient android:type="linear" android:startX="${g.x1}" android:startY="${g.y1}" android:endX="${g.x2}" android:endY="${g.y2}">\n${stops}\n            </gradient>\n        </aapt:attr>\n    `;
    } else if (preenchimento !== 'none') attrs.push(`android:fillColor="${cor(preenchimento)}"`);
    if (a['fill-opacity'] ?? a.opacity) attrs.push(`android:fillAlpha="${a['fill-opacity'] ?? a.opacity}"`);
    if (a.stroke && a.stroke !== 'none') {
      attrs.push(`android:strokeColor="${cor(a.stroke)}"`, `android:strokeWidth="${num(a['stroke-width'], 1)}"`);
      if (a['stroke-linecap']) attrs.push(`android:strokeLineCap="${a['stroke-linecap']}"`);
      if (a['stroke-linejoin']) attrs.push(`android:strokeLineJoin="${a['stroke-linejoin']}"`);
      if (a['stroke-opacity'] ?? a.opacity) attrs.push(`android:strokeAlpha="${a['stroke-opacity'] ?? a.opacity}"`);
    }
    if (a['fill-rule'] === 'evenodd') attrs.push('android:fillType="evenOdd"');
    attrs.push(`android:pathData="${e.d}"`);
    grupo.push(filhos ? `        <path ${attrs.join(' ')}>${filhos.replace(/\n/g, '\n    ')}</path>` : `        <path ${attrs.join(' ')} />`);
    const corPrevia = (c) => (c && c !== 'none' && !c.startsWith('url') && op.corUnica ? op.corUnica : c);
    previa.push(`<path d="${e.d}" fill="${grad ? '#888' : corPrevia(preenchimento)}"${a.stroke && a.stroke !== 'none' ? ` stroke="${corPrevia(a.stroke)}" stroke-width="${num(a['stroke-width'], 1)}" stroke-linecap="${a['stroke-linecap'] ?? 'butt'}"` : ''}/>`);
  }
  linhas.push(`    <group android:translateX="${f(dx)}" android:translateY="${f(dy)}" android:scaleX="${f(escala)}" android:scaleY="${f(escala)}">`, ...grupo, '    </group>');
  const usaGradiente = grupo.some((l) => l.includes('aapt:attr'));
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado por scripts/svg-para-vector.mjs a partir de ${op.origem ?? 'um SVG do KV'} (recorte ${op.recorte.join(',')}). Não edite à mão: rode o script de novo. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"${usaGradiente ? ' xmlns:aapt="http://schemas.android.com/aapt"' : ''}
    android:width="${dl}dp" android:height="${da}dp" android:viewportWidth="${tl}" android:viewportHeight="${ta}">
${linhas.join('\n')}
</vector>
`;
  const svgPrevia = `<svg xmlns="http://www.w3.org/2000/svg" width="${tl * 2}" height="${ta * 2}" viewBox="0 0 ${tl} ${ta}">${previa[0]?.startsWith('<rect') ? previa.shift() : ''}<g transform="translate(${f(dx)} ${f(dy)}) scale(${f(escala)})">${previa.join('')}</g></svg>`;
  const avisos = textos ? [`o arquivo tem ${textos} <text>, que não entram: o texto é desenhado pelo app com a fonte do tema`] : [];
  return { xml, previa: svgPrevia, usados: selecionados.map((e) => e.indice), avisos };
}

// ---------------------------------------------------------------------------------------------------- linha de comando
function opcoes(args) {
  const op = {};
  const lista = (v) => v.split(',');
  const nums = (v) => v.split(',').map(Number);
  for (let i = 0; i < args.length; i += 2) {
    const [k, v] = [args[i], args[i + 1]];
    if (k === '--recorte') op.recorte = nums(v);
    else if (k === '--modo') op.modo = v;
    else if (k === '--tela') { const t = nums(v); op.tela = [t[0], t[1], t[2] ?? 0]; }
    else if (k === '--dp') op.dp = nums(v);
    else if (k === '--so-cor') op.soCor = lista(v);
    else if (k === '--excluir-cor') op.excluirCor = lista(v);
    else if (k === '--fundo') op.fundo = v;
    else if (k === '--cor-unica') op.corUnica = v;
    else if (k === '--previa') op.previa = v;
    else throw new Error(`opção desconhecida: ${k}`);
  }
  if (!op.recorte || op.recorte.length !== 4) throw new Error('falta --recorte x,y,largura,altura');
  return op;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [entrada, saida, ...resto] = process.argv.slice(2);
  if (!entrada || !saida) { console.error('uso: svg-para-vector.mjs <entrada.svg> <saida.xml> --recorte x,y,l,a [opções]'); process.exit(2); }
  const op = { ...opcoes(resto), origem: entrada.replace(/^.*?(docs\/)/, '$1') };
  const r = converter(readFileSync(entrada, 'utf8'), op);
  if (!r.usados.length) { console.error('nenhum elemento no recorte'); process.exit(1); }
  writeFileSync(saida, r.xml);
  if (op.previa) writeFileSync(op.previa, r.previa);
  console.log(`${saida}: ${r.usados.length} forma(s)${r.avisos.length ? ` (${r.avisos.join('; ')})` : ''}`);
}
