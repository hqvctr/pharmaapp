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
const textoDe = async (loc: any): Promise<string> => (await loc.allTextContents()).join(' ');
const temTexto = (loc: any, texto: string) => vitestExpect.poll(() => textoDe(loc), { timeout: 8000 }).toContain(texto);
const contagem = (loc: any, n: number) => vitestExpect.poll(() => loc.count(), { timeout: 8000 }).toBe(n);
const executar = URL_BASE && playwright ? describe : describe.skip;

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

  it('serve só os arquivos do painel, com cabeçalhos de segurança; o resto de /operador/ não existe', async () => {
    const r = await fetch(`${base}/operador/`);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toBe(CSP_PAINEL);
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('content-type')).toContain('text/html');
    expect((await fetch(`${base}/operador`, { redirect: 'manual' })).status).toBe(301);
    for (const caminho of ['/operador/painel.js', '/operador/logica.js', '/operador/painel.css']) expect((await fetch(`${base}${caminho}`)).status, caminho).toBe(200);
    for (const caminho of ['/operador/../package.json', '/operador/%2e%2e/package.json', '/operador/index.html', '/operador/painel.js.map', '/operador/.env']) expect((await fetch(`${base}${caminho}`)).status, caminho).toBe(404);
  });

  it('entra com o código do e-mail, cadastra oferta manual, vê erro da triagem, encerra, e navega por todas as telas sem erro no console', async () => {
    const op = await t.operador({ email: 'operador.painel@exemplo.com', nome: 'Operadora Painel' });
    const { loja } = await t.loja({ nome: 'Mercado Painel' });
    const ctx = await browser.newContext({ locale: 'pt-BR' });
    const page = await ctx.newPage();
    const problemas: string[] = [];
    // O 422 da triagem é esperado (o navegador o registra como recurso que falhou); qualquer outra coisa no console é problema (inclusive violação da CSP).
    page.on('console', (m: any) => { if ((m.type() === 'error' || m.type() === 'warning') && !/status of 4\d\d/.test(m.text())) problemas.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (err: Error) => problemas.push(`pageerror: ${err.message}`));
    page.on('dialog', (d: any) => d.accept());
    const falsos = e.enviados.length;

    // --- entrar
    await page.goto(`${base}/operador/`);
    await page.fill('#email', op.email);
    await page.click('button:has-text("Enviar código")');
    await page.waitForSelector('#codigo:visible');
    await expect.poll(() => e.enviados.length).toBe(falsos + 1);
    await page.fill('#codigo', e.enviados.at(-1)!.codigo);
    await page.click('button:has-text("Entrar")');
    await page.waitForSelector('text=Ofertas manuais');
    await foto(page, '1-ofertas-vazio');
    await temTexto(page.locator('#quem'), 'Operadora Painel');
    // O token fica só na aba (sessionStorage), nunca em localStorage.
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['sessao']);

    // --- cadastrar produto novo
    await page.check('input[name="modo"][value="novo"]');
    await page.fill('#n_nome', 'Fralda do Painel G 60 un');
    await page.fill('#n_marca', 'Marca Painel');
    await page.selectOption('#n_cat', 'bebe');
    await page.selectOption('#n_sub', 'fraldas');
    await page.fill('#n_qtd', '60');
    await page.selectOption('#loja', { label: 'Mercado Painel (online) (Mercado Painel)' });
    await page.fill('#preco', '49,90');
    await page.selectOption('#cond', 'leve_pague');
    await page.fill('#cond_a', '3');
    await page.fill('#cond_b', '2');
    await page.fill('#valida_ate', '2026-11-10T10:00');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/encarte');
    await page.click('button:has-text("Cadastrar oferta")');
    await page.waitForSelector('.caixa-ok');
    await temTexto(page.locator('.caixa-ok'), 'Fralda do Painel G 60 un em Mercado Painel (online) por R$');
    const linha = (await e.pool.query(`SELECT o.preco_centavos, o.condicao, o.link, o.criada_por, o.store_id FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome = 'Fralda do Painel G 60 un'`)).rows;
    expect(linha).toHaveLength(1);
    expect(linha[0]).toMatchObject({ preco_centavos: 4990, condicao: { tipo: 'leve_pague', leve: 3, pague: 2 }, link: 'https://mercadopainel.exemplo.test/encarte', criada_por: op.operadorId, store_id: loja });
    await contagem(page.locator('table tbody tr', { hasText: 'Fralda do Painel G 60 un' }), 1);

    // --- campo errado: o painel avisa antes de mandar; erro da API aparece no campo certo
    await page.check('input[name="modo"][value="novo"]');
    await page.fill('#n_nome', 'Sem preço');
    await page.click('button:has-text("Cadastrar oferta")');
    await temTexto(page.locator('[data-erro="preco_centavos"]'), 'Informe o preço em reais');
    await temTexto(page.locator('[data-erro="link"]'), 'https://');

    // --- triagem barra medicamento
    await page.fill('#n_nome', 'Dipirona 500 mg 20 comprimidos');
    await page.selectOption('#n_cat', 'bebe');
    await page.fill('#n_qtd', '20');
    await page.selectOption('#loja', { label: 'Mercado Painel (online) (Mercado Painel)' });
    await page.fill('#preco', '9,90');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/dipirona');
    await page.click('button:has-text("Cadastrar oferta")');
    await temTexto(page.locator('.caixa-erro'), 'Barrado pela triagem');
    await foto(page, '2-barrado');

    // --- texto com HTML aparece como texto e não executa (XSS)
    await page.fill('#n_nome', '<img src=x onerror="window.__xss=1"> Fralda XSS 10 un');
    await page.fill('#n_qtd', '10');
    await page.fill('#preco', '19,90');
    await page.fill('#link', 'https://mercadopainel.exemplo.test/xss');
    await page.click('button:has-text("Cadastrar oferta")');
    await page.waitForSelector('.caixa-ok');
    await temTexto(page.locator('table tbody'), '<img src=x onerror="window.__xss=1"> Fralda XSS 10 un');
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    expect(await page.locator('table img').count()).toBe(0);

    // --- encerrar pela lista
    const alvo = page.locator('table tbody tr', { hasText: 'Fralda do Painel G 60 un' });
    await alvo.locator('button:has-text("Encerrar")').click();
    await contagem(alvo, 0);
    expect((await e.pool.query(`SELECT o.disponivel FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome = 'Fralda do Painel G 60 un'`)).rows[0].disponivel).toBe(false);

    await foto(page, '3-lista');
    // --- as outras telas abrem e mostram o que esperam
    await page.click('nav a:has-text("Triagem")');
    await temTexto(page.locator('main'), 'Dipirona 500 mg 20 comprimidos');
    await temTexto(page.locator('main'), 'Medicamento');
    await foto(page, '4-triagem');
    await page.click('nav a:has-text("Alertas")');
    await temTexto(page.locator('main'), 'Nenhum alerta aguardando aprovação');
    await page.click('nav a:has-text("Denúncias")');
    await temTexto(page.locator('main'), 'Nenhuma oferta escondida');
    await page.click('nav a:has-text("Lojas")');
    await temTexto(page.locator('main tbody'), 'Mercado Painel');
    await page.click('nav a:has-text("Fontes")');
    await temTexto(page.locator('main tbody'), 'manual');
    await page.click('nav a:has-text("Auditoria")');
    await temTexto(page.locator('main tbody'), 'Cadastrou oferta manual');
    await temTexto(page.locator('main tbody'), 'Encerrou oferta manual');

    // --- mudar o status de uma loja pela tela
    await page.click('nav a:has-text("Lojas")');
    const linhaLoja = page.locator('main tbody tr', { hasText: 'Mercado Painel' });
    await linhaLoja.locator('select').selectOption('aprovada');
    await linhaLoja.locator('button:has-text("Salvar")').click();
    await expect.poll(async () => (await e.pool.query(`SELECT status FROM stores WHERE id = $1`, [loja])).rows[0].status).toBe('aprovada');

    // --- sair: volta ao login e a sessão some
    await page.click('button:has-text("Sair")');
    await page.waitForSelector('#email');
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 120_000);

  it('aprova um alerta pendente e rejeita outro pela tela, com observação, e a auditoria registra', async () => {
    const op = await t.operador({ nome: 'Revisora' });
    const { loja, fonte } = await t.loja({ nome: 'Loja do Alerta' });
    const mk = async (nome: string) => {
      const produto = await t.produto({ nome, marca: nome, marcaChave: nome.toLowerCase().replace(/\W/g, '-'), categoria: 'bebe' });
      const oferta = await t.oferta({ produto, loja, fonte, preco: 3000 });
      return { produto, alerta: await t.alerta({ oferta, loja, decisao: 'aguardar_aprovacao', revisao: 'pendente', preco: 3000 }) };
    };
    const a = await mk('Produto Para Aprovar');
    const b = await mk('Produto Para Rejeitar');
    const ctx = await browser.newContext({ locale: 'pt-BR' });
    const page = await ctx.newPage();
    const problemas: string[] = [];
    page.on('pageerror', (err: Error) => problemas.push(err.message));
    await page.goto(`${base}/operador/`);
    await page.evaluate((s: object) => sessionStorage.setItem('sessao', JSON.stringify(s)), { access: op.auth.authorization.replace('Bearer ', ''), refresh: op.refreshToken });
    await page.goto(`${base}/operador/#/alertas`);
    await page.reload();
    await temTexto(page.locator('main'), 'Produto Para Aprovar');
    await foto(page, '5-alertas');
    const cA = page.locator('.cartao', { hasText: 'Produto Para Aprovar' });
    await cA.locator('input').fill('Preço conferido na loja.');
    await cA.locator('button:has-text("Aprovar")').click();
    await contagem(cA, 0);
    const cB = page.locator('.cartao', { hasText: 'Produto Para Rejeitar' });
    await cB.locator('button:has-text("Rejeitar")').click();
    await contagem(cB, 0);
    const linhas = (await e.pool.query(`SELECT id, revisao_situacao FROM alerts WHERE id = ANY($1::uuid[])`, [[a.alerta, b.alerta]])).rows;
    expect(Object.fromEntries(linhas.map((l) => [l.id, l.revisao_situacao]))).toEqual({ [a.alerta]: 'aprovado', [b.alerta]: 'rejeitado' });
    const aud = (await e.pool.query(`SELECT detalhe FROM auditoria WHERE alvo_id = $1`, [a.alerta])).rows;
    expect(JSON.stringify(aud)).toContain('Preço conferido na loja.');
    expect(problemas).toEqual([]);
    await ctx.close();
  }, 60_000);

  it('sessão que o servidor derrubou volta ao login com aviso, sem travar a tela', async () => {
    const op = await t.operador();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${base}/operador/`);
    await page.evaluate((tok: string) => sessionStorage.setItem('sessao', JSON.stringify({ access: tok, refresh: 'invalido' })), 'token-invalido');
    await page.reload();
    await page.waitForSelector('#email');
    await temTexto(page.locator('h1'), 'Entrar');
    void op;
    await ctx.close();
  }, 60_000);
});
