// O painel web do operador de verdade: sobe a API, abre o painel num navegador (Playwright/Chromium) e opera como uma pessoa operaria.
// Pula sem PG_TESTE_URL e sem o pacote `playwright` com o Chromium instalado (o que há no ambiente de desenvolvimento, não no Docker).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, expect as vitestExpect, it } from 'vitest';
import { CSP_PAINEL } from './rotas/painel.js';
import { ambienteDeTeste, URL_BASE } from './testeAmbiente.js';

function carregarPlaywright(): any | null {
  const candidatos = [import.meta.url];
  try { candidatos.push(`file://${execSync('npm root -g', { encoding: 'utf8' }).trim()}/`); } catch { /* sem npm global */ }
  for (const base of candidatos) {
    try { return createRequire(base)('playwright'); } catch { /* tenta o próximo */ }
  }
  return null;
}
const playwright = carregarPlaywright();
/** PAINEL_FOTOS=/pasta guarda imagens das telas para olhar (não é parte da conferência). */
const foto = async (page: any, nome: string) => { if (process.env.PAINEL_FOTOS) await page.screenshot({ path: `${process.env.PAINEL_FOTOS}/${nome}.png`, fullPage: true }); };
/** O `expect` do vitest não conhece o do Playwright: espera por polling o texto de um seletor. */
const textoDe = async (loc: any): Promise<string> => (await loc.allTextContents()).join(' ').replace(/\u00a0/g, ' ');
const temTexto = (loc: any, texto: string) => vitestExpect.poll(() => textoDe(loc), { timeout: 8000 }).toContain(texto);
const contagem = (loc: any, n: number) => vitestExpect.poll(() => loc.count(), { timeout: 8000 }).toBe(n);
const executar = URL_BASE && playwright ? describe : describe.skip;

const ARQUIVOS = ['painel.js', 'logica.js', 'painel.css', 'ui.js', 'api.js', 'graficos.js', 'telas-moderacao.js', 'telas-catalogo.js', 'telas-sistema.js', 'tela-financeiro.js'];

executar('painel do operador no navegador (Postgres + Chromium)', () => {
  const t = ambienteDeTeste('teste_painel');
  const { e } = t;
  let base = '';
  let browser: any;

  beforeAll(async () => {
    base = await e.app.listen({ port: 0, host: '127.0.0.1' });
    browser = await playwright.chromium.launch();
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
    await e.app.close();
  });

  /** Página com a sessão do operador já na aba e vigia de erro no console (inclusive violação da CSP). */
  async function abrir(op: { auth: { authorization: string }; refreshToken: string }, rota: string, opcoes: Record<string, unknown> = {}) {
    const ctx = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', ...opcoes });
    const page = await ctx.newPage();
    const problemas: string[] = [];
    // 4xx esperados (422 da triagem, por exemplo) o navegador registra como recurso que falhou; o resto é problema.
    page.on('console', (m: any) => { if ((m.type() === 'error' || m.type() === 'warning') && !/status of 4\d\d/.test(m.text())) problemas.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (err: Error) => problemas.push(`pageerror: ${err.message}`));
    await page.goto(`${base}/operador/`);
    await page.evaluate((s: object) => sessionStorage.setItem('sessao', JSON.stringify(s)), { access: op.auth.authorization.replace('Bearer ', ''), refresh: op.refreshToken });
    await page.goto(`${base}/operador/#/${rota}`);
    await page.reload();
    await page.waitForSelector('.lateral');
    return { ctx, page, problemas };
  }
  /** Botão do diálogo de confirmação aberto. */
  const confirmarDialogo = async (page: any, texto: string) => { await page.locator('dialog[open] button', { hasText: texto }).click(); await contagem(page.locator('dialog[open]'), 0); };

  it('serve só os arquivos do painel, com cabeçalhos de segurança; o resto de /operador/ não existe', async () => {
    const r = await fetch(`${base}/operador/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toBe(CSP_PAINEL);
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('content-type')).toContain('text/html');
    expect((await fetch(`${base}/operador`, { redirect: 'manual' })).status).toBe(301);
    for (const a of ARQUIVOS) expect((await fetch(`${base}/operador/${a}`)).status, a).toBe(200);
    for (const caminho of ['/operador/../package.json', '/operador/%2e%2e/package.json', '/operador/index.html', '/operador/painel.js.map', '/operador/.env', '/operador/telas.js']) expect((await fetch(`${base}${caminho}`)).status, caminho).toBe(404);
  });

  it('entra com o código, vê a visão geral, cadastra loja própria e oferta manual, vê a triagem barrar, encerra e passa por todas as telas sem erro no console', async () => {
    const op = await t.operador({ email: 'operador.painel@exemplo.com', nome: 'Operadora Painel' });
    const ctx = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    // Foto do produto vem do site da loja (https): aqui uma imagem local faz o papel dela.
    await ctx.route('https://**/*', (r: any) => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#9ec5f4"/></svg>' }));
    const page = await ctx.newPage();
    const problemas: string[] = [];
    page.on('console', (m: any) => { if ((m.type() === 'error' || m.type() === 'warning') && !/status of 4\d\d/.test(m.text())) problemas.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (err: Error) => problemas.push(`pageerror: ${err.message}`));
    const falsos = e.enviados.length;

    // --- entrar
    await page.goto(`${base}/operador/`);
    await foto(page, '00-login');
    await page.fill('#email', op.email);
    await page.click('button:has-text("Enviar código")');
    await page.waitForSelector('#codigo:visible');
    await expect.poll(() => e.enviados.length).toBe(falsos + 1);
    await page.fill('#codigo', e.enviados.at(-1)!.codigo);
    await page.click('button:has-text("Entrar")');
    await page.waitForSelector('.grade-pendencias');
    await temTexto(page.locator('#quem'), 'Operadora Painel');
    await temTexto(page.locator('h1'), 'Operadora');
    // O token fica só na aba (sessionStorage), nunca em localStorage.
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['sessao']);
    await foto(page, '01-inicio');

    // --- loja própria pela tela (com faixa de CEP por atalho e uma digitada)
    await page.click('nav a:has-text("Lojas")');
    await page.click('#topo-acoes button:has-text("Nova loja")');
    const dlg = page.locator('dialog[open]');
    await dlg.locator('#c-nome').fill('Mercado Painel');
    await dlg.locator('button:has-text("Cadastrar loja")').click();
    await temTexto(dlg.locator('[data-erro="areas_entrega"]'), 'ao menos uma faixa');
    await dlg.locator('button.chip:has-text("Estado de SP")').click();
    await dlg.locator('button:has-text("Adicionar faixa")').click();
    await dlg.locator('input[aria-label="CEP inicial"]').nth(1).fill('20000-000');
    await dlg.locator('input[aria-label="CEP final"]').nth(1).fill('20999-999');
    await foto(page, '02-nova-loja');
    await dlg.locator('button:has-text("Cadastrar loja")').click();
    await contagem(page.locator('dialog[open]'), 0);
    await temTexto(page.locator('main tbody'), 'Mercado Painel');
    expect(await textoDe(page.locator('main'))).not.toMatch(/\bnull\b|undefined|\[object/);
    const loja = (await e.pool.query(`SELECT id FROM stores WHERE nome = 'Mercado Painel'`)).rows[0].id as string;
    expect((await e.pool.query(`SELECT cep_inicio, cep_fim FROM store_service_areas WHERE store_id = $1 ORDER BY cep_inicio`, [loja])).rows).toEqual([{ cep_inicio: '01000000', cep_fim: '19999999' }, { cep_inicio: '20000000', cep_fim: '20999999' }]);

    // --- detalhe: aprovar a loja e corrigir a área
    await page.locator('main tbody tr', { hasText: 'Mercado Painel' }).click();
    const lateral = page.locator('dialog.lateral[open]');
    await lateral.locator('[role="tablist"][aria-label="Status da loja"] button:has-text("Aprovada")').click();
    await lateral.locator('button:has-text("Salvar status")').click();
    await expect.poll(async () => (await e.pool.query(`SELECT status FROM stores WHERE id = $1`, [loja])).rows[0].status).toBe('aprovada');
    await lateral.locator('button[aria-label="Remover faixa"]').nth(1).click();
    await lateral.locator('button:has-text("Salvar área de entrega")').click();
    await expect.poll(async () => (await e.pool.query(`SELECT count(*)::int AS n FROM store_service_areas WHERE store_id = $1`, [loja])).rows[0].n).toBe(1);
    await foto(page, '03-detalhe-loja');
    await page.keyboard.press('Escape');
    await contagem(page.locator('dialog[open]'), 0);

    // --- oferta manual com produto novo
    await page.click('nav a:has-text("Ofertas manuais")');
    await page.click('#topo-acoes button:has-text("Nova oferta")');
    await page.check('input[name="modo"][value="novo"]');
    await page.fill('#n_nome', 'Fralda do Painel G 60 un');
    await page.fill('#n_marca', 'Marca Painel');
    await page.selectOption('#n_cat', 'bebe');
    await page.selectOption('#n_sub', 'fraldas');
    await page.fill('#n_qtd', '60');
    await page.fill('#n_img', 'https://cdn.exemplo.test/fralda.jpg');
    await page.selectOption('#loja', { label: 'Mercado Painel' });
    await page.fill('#preco', '49,90');
    await page.selectOption('#cond', 'leve_pague');
    await page.fill('#cond_a', '3');
    await page.fill('#cond_b', '2');
    await page.fill('#valida_ate', '2026-11-10T10:00');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/encarte');
    await temTexto(page.locator('.previa-app'), 'Leve 3, pague 2');
    await temTexto(page.locator('.previa-app'), 'R$ 49,90');
    await foto(page, '04-nova-oferta');
    await page.click('button:has-text("Cadastrar oferta")');
    await temTexto(page.locator('.caixa-ok'), 'Fralda do Painel G 60 un em Mercado Painel por R$');
    const linha = (await e.pool.query(`SELECT o.preco_centavos, o.condicao, o.link, o.criada_por, o.store_id, p.imagem_url FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome = 'Fralda do Painel G 60 un'`)).rows;
    expect(linha).toHaveLength(1);
    expect(linha[0]).toMatchObject({ preco_centavos: 4990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, link: 'https://mercadopainel.exemplo.test/encarte', criada_por: op.operadorId, store_id: loja, imagem_url: 'https://cdn.exemplo.test/fralda.jpg' });

    // --- campo errado: o painel avisa antes de mandar
    await page.check('input[name="modo"][value="novo"]');
    await page.fill('#n_nome', 'Sem preço');
    await page.click('button:has-text("Cadastrar oferta")');
    await temTexto(page.locator('[data-erro="preco_centavos"]'), 'Informe o preço em reais');
    await temTexto(page.locator('[data-erro="link"]'), 'https://');

    // --- triagem barra medicamento
    await page.fill('#n_nome', 'Dipirona 500 mg 20 comprimidos');
    await page.selectOption('#n_cat', 'bebe');
    await page.fill('#n_qtd', '20');
    await page.selectOption('#loja', { label: 'Mercado Painel' });
    await page.fill('#preco', '9,90');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/dipirona');
    await page.click('button:has-text("Cadastrar oferta")');
    await temTexto(page.locator('.caixa-erro'), 'Barrado pela triagem');

    // --- texto com HTML aparece como texto e não executa (XSS)
    await page.fill('#n_nome', '<img src=x onerror="window.__xss=1"> Fralda XSS 10 un');
    await page.fill('#n_qtd', '10');
    await page.fill('#preco', '19,90');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/xss');
    await page.click('button:has-text("Cadastrar oferta")');
    await page.waitForSelector('.caixa-ok');
    await page.click('#topo-acoes button:has-text("Ver ofertas")');
    await temTexto(page.locator('main .lista-cartoes'), '<img src=x onerror="window.__xss=1"> Fralda XSS 10 un');
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    expect(await page.locator('main img[src="x"]').count()).toBe(0);

    // --- encerrar pela lista (com confirmação)
    const alvo = page.locator('main article', { hasText: 'Fralda do Painel G 60 un' });
    await alvo.locator('button:has-text("Encerrar")').click();
    await confirmarDialogo(page, 'Encerrar');
    await contagem(alvo, 0);
    expect((await e.pool.query(`SELECT o.disponivel FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome = 'Fralda do Painel G 60 un'`)).rows[0].disponivel).toBe(false);
    await page.click('main [role="tab"]:has-text("Encerradas")');
    await temTexto(page.locator('main .lista-cartoes'), 'Fralda do Painel G 60 un');

    // --- produtos: buscar e começar uma oferta a partir do produto
    await page.click('nav a:has-text("Produtos")');
    await page.waitForSelector('main .grade-produtos');
    await page.fill('main [data-busca]', 'fralda painel');
    await temTexto(page.locator('main .grade-produtos'), 'Fralda do Painel G 60 un');
    await page.waitForSelector('main .produto img[src="https://cdn.exemplo.test/fralda.jpg"]');
    await foto(page, '05-produtos');
    await page.locator('main .produto', { hasText: 'Fralda do Painel G 60 un' }).locator('button:has-text("Criar oferta manual")').click();
    await temTexto(page.locator('.escolhido'), 'Fralda do Painel G 60 un');

    // --- as outras telas abrem e mostram o que esperam
    await page.click('nav a:has-text("Triagem")');
    await temTexto(page.locator('main'), 'Dipirona 500 mg 20 comprimidos');
    await temTexto(page.locator('main'), 'Medicamento');
    await foto(page, '06-triagem');
    await page.click('nav a:has-text("Alertas")');
    await temTexto(page.locator('main'), 'Nenhum alerta aguardando');
    await page.click('nav a:has-text("Denúncias")');
    await temTexto(page.locator('main'), 'Nenhuma oferta escondida');
    await page.click('nav a:has-text("Fontes de preço")');
    await temTexto(page.locator('main'), 'manual');
    await page.click('nav a:has-text("Operadores")');
    await temTexto(page.locator('main tbody'), 'Operadora Painel');
    await temTexto(page.locator('main tbody'), 'você');
    await page.click('nav a:has-text("Auditoria")');
    await temTexto(page.locator('main .linha-tempo'), 'Cadastrou oferta manual');
    await temTexto(page.locator('main .linha-tempo'), 'Encerrou oferta manual');
    await temTexto(page.locator('main .linha-tempo'), 'Cadastrou uma loja');
    await temTexto(page.locator('main .linha-tempo'), 'status: em observação → aprovada');
    await page.selectOption('#f_acao', 'loja_areas_definidas');
    await temTexto(page.locator('main .linha-tempo'), 'Mudou a área de entrega');
    await foto(page, '07-auditoria');

    // --- atalho de teclado: g + i volta à visão geral
    await page.locator('main').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('g');
    await page.keyboard.press('i');
    await page.waitForSelector('.grade-pendencias');
    await temTexto(page.locator('.atividade'), 'Operadora Painel');

    // --- tema escuro: escolha guardada só como preferência (nunca a sessão)
    await page.click('button[aria-label="Alternar tema claro ou escuro"]');
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['tema']);
    await foto(page, '08-inicio-escuro');

    // --- sair: volta ao login e a sessão some
    await page.click('button:has-text("Sair")');
    await page.waitForSelector('#email');
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 120_000);

  it('financeiro: lança, importa CSV, desenha os gráficos com tabela gêmea, marca como recebida e cancela', async () => {
    const op = await t.operador({ nome: 'Gestora Financeira' });
    await e.pool.query(`DELETE FROM receitas`);
    const { page, ctx, problemas } = await abrir(op, 'financeiro');
    await temTexto(page.locator('main'), 'Nenhuma receita lançada no período');
    await foto(page, '09-financeiro-vazio');

    // lançar
    await page.click('#topo-acoes button:has-text("Lançar receita")');
    const dlg = page.locator('dialog[open]');
    await dlg.locator('#r_fonte').selectOption('afiliado_lomadee');
    await dlg.locator('#r_data').fill('2026-10-20');
    await dlg.locator('#r_valor').fill('1.234,56');
    await dlg.locator('#r_desc').fill('Comissões de outubro');
    await dlg.locator('button:has-text("Lançar")').click();
    await contagem(page.locator('dialog[open]'), 0);
    await temTexto(page.locator('main table'), 'Comissões de outubro');

    // importar (uma linha com erro primeiro: nada entra; depois o arquivo certo)
    await page.click('#topo-acoes button:has-text("Importar CSV")');
    const imp = page.locator('dialog[open]');
    await imp.locator('#csv').setInputFiles({ name: 'ruim.csv', mimeType: 'text/csv', buffer: Buffer.from('data;valor\n31/10/2026;abc\n') });
    await temTexto(imp, 'linha 2: valor "abc" inválido');
    expect(await imp.locator('button:has-text("Importar")').isDisabled()).toBe(true);
    const csv = 'data;fonte;valor;status;descricao;referencia\n05/09/2026;lomadee;300,00;paga;Setembro;S-1\n12/10/2026;anúncios;150,00;aprovada;AdMob outubro;A-10\n01/11/2026;lomadee;99,90;pendente;Novembro parcial;N-1\n';
    await imp.locator('#csv').setInputFiles({ name: 'relatorio.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await temTexto(imp, '3 lançamento(s)');
    await foto(page, '10-importar');
    await imp.locator('button:has-text("Importar")').click();
    await contagem(page.locator('dialog[open]'), 0);
    expect((await e.pool.query(`SELECT count(*)::int AS n FROM receitas`)).rows[0].n).toBe(4);

    // gráficos e tabela gêmea
    await page.waitForSelector('main figure svg');
    await temTexto(page.locator('main .legenda'), 'Afiliado · Lomadee');
    await temTexto(page.locator('main .legenda'), 'Anúncios');
    await temTexto(page.locator('main .barras-h'), 'Afiliado · Lomadee');
    await page.locator('main .alvo[tabindex="0"]').last().focus();
    await temTexto(page.locator('main .grafico-dica'), 'novembro de 2026');
    await foto(page, '11-financeiro');
    await page.locator('main figure button:has-text("Ver tabela")').first().click();
    await temTexto(page.locator('main figure table'), 'R$ 1.234,56');

    // marcar como recebida e cancelar
    const linhaOut = page.locator('main tr', { hasText: 'Comissões de outubro' });
    await linhaOut.locator('button:has-text("Recebida")').click();
    await expect.poll(async () => (await e.pool.query(`SELECT status FROM receitas WHERE descricao = 'Comissões de outubro'`)).rows[0].status).toBe('recebida');
    await page.locator('main tr', { hasText: 'AdMob outubro' }).locator('button[aria-label^="Cancelar"]').click();
    await confirmarDialogo(page, 'Cancelar lançamento');
    await expect.poll(async () => (await e.pool.query(`SELECT status FROM receitas WHERE referencia = 'A-10'`)).rows[0].status).toBe('cancelada');
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 90_000);

  it('aprova um alerta pendente e rejeita outro (com confirmação), com observação na auditoria; o contador do menu acompanha', async () => {
    const op = await t.operador({ nome: 'Revisora' });
    const { loja, fonte } = await t.loja({ nome: 'Loja do Alerta' });
    const mk = async (nome: string) => {
      const produto = await t.produto({ nome, marca: nome, marcaChave: nome.toLowerCase().replace(/\W/g, '-'), categoria: 'bebe' });
      const oferta = await t.oferta({ produto, loja, fonte, preco: 3000 });
      return { produto, alerta: await t.alerta({ oferta, loja, decisao: 'aguardar_aprovacao', revisao: 'pendente', preco: 3000 }) };
    };
    const a = await mk('Produto Para Aprovar');
    const b = await mk('Produto Para Rejeitar');
    const { page, ctx, problemas } = await abrir(op, 'alertas');
    await temTexto(page.locator('main'), 'Produto Para Aprovar');
    await temTexto(page.locator('[data-contador="alertas"]'), '2');
    await foto(page, '12-alertas');
    const cA = page.locator('article', { hasText: 'Produto Para Aprovar' });
    await cA.locator('input.observacao').fill('Preço conferido na loja.');
    await cA.locator('button:has-text("Aprovar")').click();
    await contagem(cA, 0);
    const cB = page.locator('article', { hasText: 'Produto Para Rejeitar' });
    await cB.locator('button:has-text("Rejeitar")').click();
    await confirmarDialogo(page, 'Rejeitar');
    await contagem(cB, 0);
    await temTexto(page.locator('main'), 'Nenhum alerta aguardando');
    await expect.poll(() => page.locator('[data-contador="alertas"]').isHidden()).toBe(true);
    const linhas = (await e.pool.query(`SELECT id, revisao_situacao FROM alerts WHERE id = ANY($1::uuid[])`, [[a.alerta, b.alerta]])).rows;
    expect(Object.fromEntries(linhas.map((l) => [l.id, l.revisao_situacao]))).toEqual({ [a.alerta]: 'aprovado', [b.alerta]: 'rejeitado' });
    const aud = (await e.pool.query(`SELECT detalhe FROM auditoria WHERE alvo_id = $1`, [a.alerta])).rows;
    expect(JSON.stringify(aud)).toContain('Preço conferido na loja.');
    await page.click('main [role="tab"]:has-text("Aprovados")');
    await temTexto(page.locator('main'), 'Aprovado por Revisora');
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 60_000);

  it('no celular: menu recolhido que abre e fecha, sem rolagem lateral', async () => {
    const op = await t.operador({ nome: 'No Celular' });
    const { page, ctx, problemas } = await abrir(op, 'inicio', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.waitForSelector('.grade-pendencias');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await foto(page, '13-celular');
    await page.click('button[aria-label="Abrir o menu"]');
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('menu-aberto'))).toBe(true);
    await foto(page, '14-celular-menu');
    await page.click('nav a:has-text("Lojas")');
    await expect.poll(() => page.evaluate(() => document.body.classList.contains('menu-aberto'))).toBe(false);
    await temTexto(page.locator('h1'), 'Lojas');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 60_000);

  it('sessão que o servidor derrubou volta ao login com aviso, sem travar a tela', async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${base}/operador/`);
    await page.evaluate((tok: string) => sessionStorage.setItem('sessao', JSON.stringify({ access: tok, refresh: 'invalido' })), 'token-invalido');
    await page.reload();
    await page.waitForSelector('#email');
    await temTexto(page.locator('h1'), 'Entrar');
    await ctx.close();
  }, 60_000);
});
