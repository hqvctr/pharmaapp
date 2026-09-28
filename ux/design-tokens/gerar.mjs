// Gera, a partir de tokens.json, o CSS do protótipo, o Kotlin do tema Android e a tabela de contraste.
// Falha (exit 1) se algum par de contraste obrigatório ficar abaixo do mínimo em qualquer tema.
// Uso: node ux/design-tokens/gerar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../..');
const t = JSON.parse(fs.readFileSync(path.join(aqui, 'tokens.json'), 'utf8'));
const TEMAS = ['claro', 'escuro'];

// ---------- contraste (WCAG 2.x, luminância relativa) ----------
function luminancia(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}
function razao(a, b) {
  const x = luminancia(a);
  const y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function cor(tema, nome) {
  if (nome.startsWith('marca.')) return t.marca[tema][nome.slice(6)];
  const v = t.cor[tema][nome];
  if (v === undefined) throw new Error(`token de cor inexistente: ${nome}`);
  return v;
}

const linhas = [];
let falhas = 0;
for (const [frente, fundo, minimo] of t.contraste.pares) {
  const r = TEMAS.map((tema) => razao(cor(tema, frente), cor(tema, fundo)));
  const ok = r.every((x) => x >= minimo);
  if (!ok) falhas++;
  linhas.push(`| \`${frente}\` sobre \`${fundo}\` | ${minimo}:1 | ${r[0].toFixed(2)}:1 | ${r[1].toFixed(2)}:1 | ${ok ? 'passa' : '**FALHA**'} |`);
}

// ---------- CSS ----------
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
function blocoCores(tema) {
  const out = [];
  for (const [k, v] of Object.entries(t.cor[tema])) out.push(`  --cor-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(t.marca[tema])) out.push(`  --marca-${kebab(k)}: ${v};`);
  return out.join('\n');
}
const css = [];
css.push('/* GERADO por ux/design-tokens/gerar.mjs a partir de tokens.json. Não editar à mão. */');
css.push(':root {');
css.push(blocoCores('claro'));
css.push(`  --fonte-familia: ${t.tipografia.familia};`);
// Tipografia: tamanhos em px para 100%, e blocos [data-fonte="1.3"] e [data-fonte="2"] com a curva
// NÃO LINEAR do Android 14+ (texto grande cresce menos). A tabela é uma aproximação da
// FontScaleConverter do AOSP; ver ux/design-tokens/README.md.
const CURVAS = {
  '1.3': { de: [8, 10, 12, 14, 18, 20, 24, 30, 100], para: [10.4, 13, 15.6, 18.2, 23.4, 26, 31.2, 39, 100] },
  '2': { de: [8, 10, 12, 14, 18, 20, 24, 30, 100], para: [16, 20, 24, 26, 30, 34, 36, 38, 100] },
};
function escalar(sp, curva) {
  const { de, para } = curva;
  if (sp <= de[0]) return (sp * para[0]) / de[0];
  for (let i = 1; i < de.length; i++) {
    if (sp <= de[i]) return para[i - 1] + ((sp - de[i - 1]) / (de[i] - de[i - 1])) * (para[i] - para[i - 1]);
  }
  return sp;
}
for (const [k, e] of Object.entries(t.tipografia.estilos)) {
  css.push(`  --tipo-${kebab(k)}-tamanho: ${e.tamanho}px;`);
  css.push(`  --tipo-${kebab(k)}-altura: ${e.altura}px;`);
  css.push(`  --tipo-${kebab(k)}-peso: ${e.peso};`);
}
for (const [k, v] of Object.entries(t.espaco)) if (!k.startsWith('$')) css.push(`  --espaco-${k}: ${v}px;`);
for (const [k, v] of Object.entries(t.raio)) css.push(`  --raio-${k}: ${v}px;`);
for (const [k, v] of Object.entries(t.elevacao)) if (!k.startsWith('$')) css.push(`  --elevacao-${kebab(k)}: ${v}px;`);
for (const [k, v] of Object.entries(t.alvo)) css.push(`  --alvo-${kebab(k)}: ${v}px;`);
for (const [k, v] of Object.entries(t.icone.tamanho)) css.push(`  --icone-${k}: ${v}px;`);
for (const [k, v] of Object.entries(t.movimento.duracao)) css.push(`  --duracao-${k}: ${v}ms;`);
for (const [k, v] of Object.entries(t.movimento.curva)) css.push(`  --curva-${k}: cubic-bezier(${v.join(', ')});`);
css.push('}');
for (const [escala, curva] of Object.entries(CURVAS)) {
  css.push(`[data-fonte="${escala}"] {`);
  for (const [k, e] of Object.entries(t.tipografia.estilos)) {
    const tam = escalar(e.tamanho, curva);
    // Altura de linha acompanha a proporção original do estilo.
    css.push(`  --tipo-${kebab(k)}-tamanho: ${tam.toFixed(1)}px;`);
    css.push(`  --tipo-${kebab(k)}-altura: ${((tam * e.altura) / e.tamanho).toFixed(1)}px;`);
  }
  css.push('}');
}
css.push('[data-tema="escuro"] {');
css.push(blocoCores('escuro'));
css.push('}');
css.push('@media (prefers-reduced-motion: reduce) {');
css.push('  :root { --duracao-curta: 0ms; --duracao-media: 0ms; }');
css.push('}');
fs.mkdirSync(path.join(aqui, 'build'), { recursive: true });
fs.writeFileSync(path.join(aqui, 'build/tokens.css'), css.join('\n') + '\n');

// ---------- Kotlin ----------
const kt = [];
const argb = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
kt.push('// GERADO por ux/design-tokens/gerar.mjs a partir de ux/design-tokens/tokens.json. Não editar à mão.');
kt.push('package app.promocao.ui.theme');
kt.push('');
kt.push('import androidx.compose.runtime.Immutable');
kt.push('import androidx.compose.ui.graphics.Color');
kt.push('import androidx.compose.ui.text.font.FontWeight');
kt.push('import androidx.compose.ui.unit.dp');
kt.push('import androidx.compose.ui.unit.sp');
kt.push('');
const nomesCor = Object.keys(t.cor.claro);
const nomesMarca = Object.keys(t.marca.claro);
kt.push('/** Papéis de cor semânticos do app. Um valor por tema. */');
kt.push('@Immutable');
kt.push('data class CoresEconomae(');
for (const n of nomesMarca) kt.push(`    val ${n}: Color,`);
for (const n of nomesCor) kt.push(`    val ${n}: Color,`);
kt.push(')');
kt.push('');
for (const tema of TEMAS) {
  kt.push(`val Cores${tema === 'claro' ? 'Claras' : 'Escuras'} = CoresEconomae(`);
  for (const n of nomesMarca) kt.push(`    ${n} = ${argb(t.marca[tema][n])},`);
  for (const n of nomesCor) kt.push(`    ${n} = ${argb(t.cor[tema][n])},`);
  kt.push(')');
  kt.push('');
}
kt.push('/** Estilos de texto em sp. Ver Type.kt para os TextStyle montados. */');
kt.push('object TipoTokens {');
for (const [k, e] of Object.entries(t.tipografia.estilos)) {
  kt.push(`    /** ${e.uso} */`);
  kt.push(`    val ${k} = EstiloToken(${e.tamanho}.sp, ${e.altura}.sp, FontWeight(${e.peso}), tabular = ${e.tabular})`);
}
kt.push('}');
kt.push('');
kt.push('object Espaco {');
for (const [k, v] of Object.entries(t.espaco)) if (!k.startsWith('$')) kt.push(`    val e${k} = ${v}.dp`);
kt.push('}');
kt.push('');
kt.push('object Raio {');
for (const [k, v] of Object.entries(t.raio)) kt.push(`    val ${k} = ${v}.dp`);
kt.push('}');
kt.push('');
kt.push('object Elevacao {');
for (const [k, v] of Object.entries(t.elevacao)) if (!k.startsWith('$')) kt.push(`    val ${k} = ${v}.dp`);
kt.push('}');
kt.push('');
kt.push('object Alvo {');
for (const [k, v] of Object.entries(t.alvo)) kt.push(`    val ${k} = ${v}.dp`);
kt.push('}');
kt.push('');
kt.push('object IconeTamanho {');
for (const [k, v] of Object.entries(t.icone.tamanho)) kt.push(`    val ${k} = ${v}.dp`);
kt.push('}');
kt.push('');
kt.push('object Movimento {');
for (const [k, v] of Object.entries(t.movimento.duracao)) kt.push(`    const val ${k}Ms = ${v}`);
kt.push('}');
const destinoKt = path.join(raiz, 'android/app/src/main/java/app/promocao/ui/theme/Tokens.kt');
fs.mkdirSync(path.dirname(destinoKt), { recursive: true });
fs.writeFileSync(destinoKt, kt.join('\n') + '\n');

// ---------- protótipo: injeta o CSS entre marcadores (arquivo único, abre sem instalar nada) ----------
const prototipo = path.join(raiz, 'ux/prototipo.html');
if (fs.existsSync(prototipo)) {
  const html = fs.readFileSync(prototipo, 'utf8');
  const novo = html.replace(/\/\* tokens:inicio \*\/[\s\S]*\/\* tokens:fim \*\//, `/* tokens:inicio */\n${css.join('\n')}\n/* tokens:fim */`);
  fs.writeFileSync(prototipo, novo);
}

// ---------- tabela de contraste ----------
const tabela = [
  '| Par | Mínimo | Claro | Escuro | Resultado |',
  '|---|---|---|---|---|',
  ...linhas,
].join('\n');
fs.writeFileSync(path.join(aqui, 'build/contraste.md'), tabela + '\n');
const readme = path.join(aqui, 'README.md');
if (fs.existsSync(readme)) {
  const txt = fs.readFileSync(readme, 'utf8');
  const novo = txt.replace(/<!-- contraste:inicio -->[\s\S]*<!-- contraste:fim -->/, `<!-- contraste:inicio -->\n${tabela}\n<!-- contraste:fim -->`);
  fs.writeFileSync(readme, novo);
}

console.log(tabela);
if (falhas > 0) {
  console.error(`\n${falhas} par(es) abaixo do mínimo.`);
  process.exit(1);
}
console.log('\nGerado: build/tokens.css, build/contraste.md, android/.../ui/theme/Tokens.kt');
