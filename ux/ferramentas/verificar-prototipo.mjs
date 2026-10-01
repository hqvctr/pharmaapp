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
  await p.evaluate(([t, e, s, m]) => { E.escala = s; E.tema = m; E.expandida = false; TELAS[t].preparar?.(e); ir(t, e, false); }, [tela, est, escala, tema]);
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
// Frete de acordo com o CEP: total com frete no cartão; outro CEP muda o frete e tira a oferta cujo frete come a economia.
await p.evaluate(() => { E.semAnuncios = false; E.ceps = ['01310100']; E.cep = '01310100'; E.filtroCat = null; ir('ofertas', 'com', false); });
const cartao = (id) => p.$eval(`.cartao[data-abrir=${id}]`, (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => null);
const frete = [];
if (!(await cartao('fralda'))?.includes('Frete R$ 9,90 · total R$ 171,30 levando 3')) frete.push('fralda sem frete e total no CEP 01310-100');
await p.click('.chip-cep'); if ((await p.$$('.folha [data-cep]')).length !== 1) frete.push('folha de CEP sem 1 CEP'); await p.keyboard.press('Escape');
await p.evaluate(() => ir('ofertas', 'outroCep', false));
if (await cartao('papinha')) frete.push('papinha visível com frete maior que a economia');
if (!(await cartao('fralda'))?.includes('Frete R$ 14,90')) frete.push('fralda sem o frete de Campinas');
const fora = await p.$eval('.caixa-info[role=note]', (e) => e.textContent).catch(() => '');
if (!fora.includes('ficaram de fora 2 ofertas')) frete.push('explicação das ofertas fora do CEP ausente');
await p.click('.chip-cep'); await p.click('.folha [data-cep="01310100"]');
if (!(await cartao('papinha'))) frete.push('papinha não voltou no CEP 01310-100');
problemas.push(...frete.map((x) => 'frete: ' + x));
console.log('frete por CEP:', frete.length ? frete.join('; ') : 'ok');
// Anúncio leve: aparece no feed com "Tirar os anúncios"; quem assina não vê nenhum.
const anuncio = [];
await p.evaluate(() => { E.semAnuncios = false; E.ceps = ['01310100']; E.cep = '01310100'; ir('ofertas', 'com', false); });
if ((await p.$$('.anuncio')).length !== 1) anuncio.push('feed sem exatamente 1 anúncio');
await p.click('.anuncio-envoltorio [data-acao=sem-anuncios]'); await p.click('[data-acao=assinar]');
await p.evaluate(() => ir('ofertas', 'com', false));
if ((await p.$$('.anuncio')).length) anuncio.push('anúncio para quem assinou');
for (const [t, e] of [['listas', 'com'], ['lista', 'com'], ['convidado', 'padrao'], ['detalhe', 'fralda']]) { await p.evaluate(([t, e]) => { E.semAnuncios = false; TELAS[t].preparar?.(e); ir(t, e, false); }, [t, e]); if ((await p.$$('.anuncio')).length) anuncio.push('anúncio em ' + t); }
problemas.push(...anuncio.map((x) => 'anúncio: ' + x));
console.log('anúncio:', anuncio.length ? anuncio.join('; ') : 'ok');
// Listas: criar → adicionar pela busca, por link e item livre → NBCAL na busca → convidado compra e marca.
const listas = [];
await p.evaluate(() => { E.escala = 1; ir('listas', 'vazio', false); });
await p.click('[data-acao=nova-lista]'); await p.click('[data-tipo-lista=casa_nova]');
if ((await p.inputValue('#campo-nome-lista')) !== 'Casa nova da Ana') listas.push('nome padrão não acompanhou o tipo');
await p.click('[data-tipo-lista=cha_bebe]'); await p.click('[data-acao=criar-lista]');
if ((await onde()) !== 'lista:nova') listas.push('criar não abriu a lista');
await p.click('[data-sugestao="Fralda G"]'); await p.click('[data-add-of=fralda]');
await p.click('[data-acao=adicionar-item]'); await p.click('.folha [data-acao=add-link]');
await p.fill('#campo-link', 'https://www.lojaexemplo.com.br/banheira-com-suporte'); await p.click('[data-acao=ler-link]'); await p.click('[data-acao=add-link-ok]');
await p.click('[data-acao=adicionar-item]'); await p.click('.folha [data-acao=add-busca]');
await p.fill('#campo-busca', 'mamadeira'); await p.click('[data-acao=buscar]');
if (!(await p.textContent('#tela')).includes('NBCAL')) listas.push('busca de mamadeira sem a explicação da NBCAL');
await p.click('#tela [data-acao=add-livre]'); await p.click('[data-acao=add-livre-ok]');
if ((await onde()) !== 'adicionar:livreErro') listas.push('item livre sem nome passou');
await p.fill('#campo-add-nome', 'Body tamanho P'); await p.click('[data-acao=qtd-mais]'); await p.click('[data-acao=add-livre-ok]');
const n = await p.evaluate(() => E.lista.itens.map((x) => (x.of || x.nome) + ':' + x.qtd).join(','));
if (n !== 'fralda:1,Banheira com suporte:1,Body tamanho P:2') listas.push('itens: ' + n);
await p.click('[data-acao=ver-convidado]'); await p.click('[data-acao=conv-comprar][data-item]'); await p.click('[data-acao=voltar-app]');
if ((await onde()) !== 'convidado:voltou') listas.push('volta da loja não perguntou');
await p.click('.retorno [data-acao=conv-ja-comprei]'); await p.fill('#campo-conv-nome', 'Tia Cláudia'); await p.click('[data-acao=conv-confirmar]');
if ((await onde()) !== 'convidado:obrigado' || (await p.evaluate(() => E.lista.itens[0].dados.join()))!== 'Tia Cláudia') listas.push('marcar como presenteado falhou');
problemas.push(...listas.map((x) => 'listas: ' + x));
console.log('listas:', listas.length ? listas.join('; ') : 'ok');
console.log('erros JS:', erros.length ? erros : 'nenhum');
console.log('estados verificados:', Object.values(telas).flat().length, '× 2 escalas × 2 temas');
console.log(problemas.length ? problemas.join('\n') : 'sem problemas de rolagem, vazamento ou alvo');
await b.close();
if (erros.length || problemas.length) process.exit(1);
