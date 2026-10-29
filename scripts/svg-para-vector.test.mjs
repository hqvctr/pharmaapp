// node --test scripts/svg-para-vector.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caixaDoPath, converter, paraCaminho } from './svg-para-vector.mjs';

const svg = (corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style> text { fill: #000; } .rosa { fill: #F65B91; } </style>${corpo}</svg>`;

test('retângulo com cantos vira path com arcos e a caixa certa', () => {
  const r = paraCaminho({ tipo: 'rect', a: { x: '10', y: '20', width: '30', height: '40', rx: '5' } });
  assert.match(r.d, /^M15,20H35A5,5 0 0 1 40,25V55/);
  assert.deepEqual(r.caixa, [10, 20, 40, 60]);
});

test('caixa do path segue comandos absolutos, relativos, H e V', () => {
  assert.deepEqual(caixaDoPath('M0 0 H390 V160 Q270 210 190 130 Z'), [0, 0, 390, 210]);
  assert.deepEqual(caixaDoPath('m10,10 l5,5 h10 v-20'), [10, -5, 25, 15]);
});

test('recorte "dentro" pega só o que cabe; cor da classe e opções de cor funcionam', () => {
  const entrada = svg('<rect width="100" height="100" fill="#FFF9F7"/><circle cx="50" cy="50" r="10" class="rosa"/><circle cx="20" cy="20" r="5" fill="#9575CD"/><text x="1" y="1">oi</text>');
  const r = converter(entrada, { recorte: [40, 40, 20, 20] });
  assert.deepEqual(r.usados, [1]);
  assert.match(r.xml, /android:fillColor="#FFF65B91"/);
  assert.match(r.avisos[0], /1 <text>/);
  const mono = converter(entrada, { recorte: [0, 0, 100, 100], modo: 'cruza', excluirCor: ['#fff9f7'], corUnica: '#000000' });
  assert.deepEqual(mono.usados, [1, 2]);
  assert.doesNotMatch(mono.xml, /F65B91|9575CD/);
});

test('encaixe na tela centraliza sem distorcer', () => {
  const r = converter(svg('<rect x="0" y="0" width="20" height="10" fill="#000"/>'), { recorte: [0, 0, 20, 10], tela: [108, 108, 4] });
  assert.match(r.xml, /android:viewportWidth="108"/);
  assert.match(r.xml, /translateX="4" android:translateY="29" android:scaleX="5" android:scaleY="5"/);
});

test('gradiente linear simples vira <gradient> do aapt', () => {
  const entrada = svg('<defs><linearGradient id="g" x1="0" y1="0" x2="10" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F65B91"/><stop offset="1" stop-color="#9575CD"/></linearGradient></defs><rect width="10" height="10" fill="url(#g)"/>');
  const r = converter(entrada, { recorte: [0, 0, 10, 10] });
  assert.match(r.xml, /xmlns:aapt/);
  assert.match(r.xml, /<item android:offset="1" android:color="#FF9575CD" \/>/);
});

test('filtro, máscara e transform são recusados (rasterizar à parte)', () => {
  for (const extra of ['<filter id="f"/>', '<mask id="m"/>', '<g transform="rotate(4)"></g>']) {
    assert.throws(() => converter(svg(`${extra}<rect width="10" height="10" fill="#000"/>`), { recorte: [0, 0, 10, 10] }), /rasterize|transform/);
  }
});
