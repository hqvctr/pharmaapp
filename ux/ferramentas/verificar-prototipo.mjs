// Verifica o protótipo em todos os estados × fonte 100%/200% × tema claro/escuro: erros de JavaScript,
// rolagem horizontal, elementos que vazam do quadro e alvos de toque menores que 48 px.
// Uso: npm i playwright@1 && node ux/ferramentas/verificar-prototipo.mjs [caminho-do-chromium]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const url = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prototipo.html');
const b = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {});
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => m.type() === 'error' && erros.push(m.text()));
await p.goto(url);
const telas = await p.evaluate(() => Object.fromEntries(Object.entries(TELAS).map(([k, t]) => [k, Object.keys(t.estados)])));
const problemas = [];
for (const [tela, estados] of Object.entries(telas)) for (const est of estados) for (const escala of [1, 2]) for (const tema of ['claro', 'escuro']) {
  await p.evaluate(([t, e, s, m]) => { E.escala = s; E.tema = m; E.expandida = false; ir(t, e, false); }, [tela, est, escala, tema]);
  const r = await p.evaluate(() => {
    const t = document.getElementById('tela');
    const over = t.scrollWidth > t.clientWidth + 1;
    const pequenos = [...t.querySelectorAll('button, input, select, a, [role=checkbox], [role=radio]')].filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.height < 47.5 || b.width < 47.5); }).map(el => (el.className || el.tagName) + ':' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ` ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const nav = [...document.querySelectorAll('#navegacao button')].filter(el => el.getBoundingClientRect().height < 47.5).length;
    // Elementos que vazam para a direita da tela.
    const tr = t.getBoundingClientRect();
    const vazam = [...t.querySelectorAll('*')].filter(el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.right > tr.right + 1 && !el.closest('.regua'); }).slice(0, 3).map(el => el.className || el.tagName);
    return { over, pequenos, nav, vazam };
  });
  if (r.over || r.pequenos.length || r.nav || r.vazam.length) problemas.push(`${tela}:${est} escala=${escala} ${tema} ${r.over ? 'ROLAGEM-H ' : ''}${r.vazam.length ? 'VAZA ' + r.vazam.join(',') + ' ' : ''}${r.pequenos.length ? 'ALVO<48 ' + r.pequenos.join(' | ') : ''}${r.nav ? ' NAV<48' : ''}`);
}
// Navegação por clique: notificação → detalhe → loja → voltar → retorno.
await p.evaluate(() => { E.escala = 1; E.tema = 'claro'; ir('bloqueio', 'N1', false); });
await p.click('.notif .miolo'); const t1 = await p.evaluate(() => E.tela + ':' + E.estado);
await p.click('[data-acao=loja]'); await p.click('[data-acao=voltar-app]'); const t2 = await p.evaluate(() => E.tela + ':' + E.estado);
await p.click('#navegacao [data-aba=avisos]'); const t3 = await p.evaluate(() => E.tela);
console.log('fluxo:', t1, '→', t2, '→', t3);
// Primeiro uso da versão 2: entrar por código → termos 18+ → categorias → tamanho → CEP → permissão → ofertas.
// Os estados "nenhuma categoria" e "sem tamanho" visitados acima limpam as escolhas; o fluxo começa do padrão.
await p.evaluate(() => { E.escala = 1; E.tema = 'claro'; E.categorias = new Set(['fraldas_lencos', 'higiene_cuidados_bebe', 'alimentacao_infantil']); E.tamanhos = new Set(['G']); E.filtroCat = null; ir('boasVindas', 'padrao', false); });
const onde = () => p.evaluate(() => E.tela + ':' + E.estado);
const passos = [];
await p.click('text=Começar');
await p.fill('#campo-email', 'mae@exemplo.com'); await p.click('[data-acao=enviar-codigo]');
await p.fill('#campo-codigo', '123456'); await p.click('[data-acao=verificar-codigo]'); passos.push(await onde());
if (!(await p.isDisabled('.rodape-fixo .botao-principal'))) problemas.push('termos: botão habilitado antes do aceite');
await p.click('[data-acao=aceitar]'); await p.click('.rodape-fixo .botao-principal');
await p.click('.rodape-fixo .botao-principal'); passos.push(await onde());
await p.click('.rodape-fixo .botao-principal');
await p.fill('#campo-cep', '01310100'); await p.click('[data-acao=cep-continuar]');
await p.click('[data-acao=pedir-permissao]'); await p.click('[data-acao=permitir]'); passos.push(await onde());
if (passos.join() !== 'termos:padrao,tamanho:alguns,ofertas:com') problemas.push('primeiro uso: ' + passos.join(' → '));
await p.click('[data-filtro=alimentacao_infantil]');
const aviso = await p.$eval('.aviso-legal', (e) => e.textContent).catch(() => '');
if (!aviso.startsWith('O Ministério da Saúde informa')) problemas.push('aviso da NBCAL ausente no filtro de alimentação');
console.log('primeiro uso:', passos.join(' → '));
console.log('erros JS:', erros.length ? erros : 'nenhum');
console.log('estados verificados:', Object.values(telas).flat().length, '× 2 escalas × 2 temas');
console.log(problemas.length ? problemas.join('\n') : 'sem problemas de rolagem, vazamento ou alvo');
await b.close();
if (erros.length || problemas.length) process.exit(1);
