#!/usr/bin/env node
// "Storybook" de conferência do tema, sem emulador: desenha no Chromium (Playwright) as telas principais do app em claro
// e escuro, com as cores, a tipografia e as formas lidas de Tema.kt, a fonte de res/font e as artes pelos mesmos
// recortes de scripts/gerar-arte-kv.sh. É uma APROXIMAÇÃO dos componentes do Material 3; a conferência real é no aparelho.
//
// Uso: node scripts/conferencia-visual.mjs <pasta de saída>   (precisa do pacote playwright com o Chromium)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter } from './svg-para-vector.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(RAIZ, 'app/app/src/main');

// ---------------------------------------------------------------------------------------------------- tema (de Tema.kt)
const tema = readFileSync(join(APP, 'java/br/com/economae/Tema.kt'), 'utf8');
function esquema(nome) {
  const bloco = tema.match(new RegExp(`val ${nome}: ColorScheme = \\w+\\(([\\s\\S]*?)\\n\\)`))[1];
  return Object.fromEntries([...bloco.matchAll(/(\w+) = Color\(0xFF([0-9A-Fa-f]{6})\)/g)].map((m) => [m[1], `#${m[2]}`]));
}
const PESOS = { Normal: 400, Medium: 500, SemiBold: 600, Bold: 700 };
const tipos = Object.fromEntries([...tema.matchAll(/(\w+) = estilo\((\d+), (\d+), FontWeight\.(\w+)(?:, (-?[\d.]+))?\)/g)]
  .map((m) => [m[1], { t: +m[2], l: +m[3], p: PESOS[m[4]], e: +(m[5] ?? 0) }]));
const formas = Object.fromEntries([...tema.matchAll(/(\w+) = RoundedCornerShape\((\d+)\.dp\)/g)].map((m) => [m[1], +m[2]]));

// ---------------------------------------------------------------------------------------------------- artes (de gerar-arte-kv.sh)
const artes = {};
for (const linha of readFileSync(join(RAIZ, 'scripts/gerar-arte-kv.sh'), 'utf8').split('\n')) {
  const m = linha.match(/^c \$KV\/(\S+)\s+\$D\/(\w+)\.xml\s+(.*)$/);
  if (!m) continue;
  const args = m[3].match(/--[\w-]+ ('[^']*'|\S+)/g).map((a) => a.split(' ')).map(([k, v]) => [k, v.replace(/'/g, '')]);
  const op = {};
  for (const [k, v] of args) {
    const nums = v.split(',').map(Number);
    if (k === '--recorte') op.recorte = nums;
    else if (k === '--modo') op.modo = v;
    else if (k === '--tela') op.tela = [nums[0], nums[1], nums[2] ?? 0];
    else if (k === '--so-cor') op.soCor = v.split(',');
    else if (k === '--excluir-cor') op.excluirCor = v.split(',');
    else if (k === '--fundo') op.fundo = v;
    else if (k === '--cor-unica') op.corUnica = v;
  }
  artes[m[2]] = converter(readFileSync(join(RAIZ, 'docs/design/kv', m[1]), 'utf8'), op).previa;
}
const arte = (nome, l, a, extra = '') => artes[nome].replace(/width="[\d.]+" height="[\d.]+"/, `width="${l}" height="${a}" preserveAspectRatio="xMidYMid meet" ${extra}`);

// ---------------------------------------------------------------------------------------------------- componentes (aproximação do M3)
const fonte = (p) => `url(data:font/ttf;base64,${readFileSync(join(APP, `res/font/inter_${p}.ttf`)).toString('base64')})`;
const css = (c) => `
@font-face{font-family:Inter;font-weight:400;src:${fonte('regular')}}@font-face{font-family:Inter;font-weight:500;src:${fonte('medium')}}
@font-face{font-family:Inter;font-weight:600;src:${fonte('semibold')}}@font-face{font-family:Inter;font-weight:700;src:${fonte('bold')}}
*{box-sizing:border-box;margin:0}body{background:#7a7584;font-family:Inter;padding:16px;display:flex;gap:16px;flex-wrap:wrap}
.tela{width:390px;height:844px;background:${c.background};color:${c.onSurface};position:relative;overflow:hidden;border-radius:30px;display:flex;flex-direction:column}
.status{height:28px;padding:6px 22px;font:600 12px Inter;display:flex;justify-content:space-between;color:${c.onSurface};flex:none}
.conteudo{flex:1;overflow:hidden;padding:0 16px;display:flex;flex-direction:column;gap:8px}
${Object.entries(tipos).map(([n, s]) => `.${n}{font-size:${s.t}px;line-height:${s.l}px;font-weight:${s.p};letter-spacing:${s.e}px}`).join('')}
.var{color:${c.onSurfaceVariant}}.pri{color:${c.primary}}.sec{color:${c.secondary}}.ter{color:${c.tertiary}}.err{color:${c.error}}
.botao{background:${c.primary};color:${c.onPrimary};border-radius:${formas.large}px;height:52px;display:flex;align-items:center;justify-content:center}
.contorno{border:1px solid ${c.outline};color:${c.primary};border-radius:999px;height:40px;display:flex;align-items:center;justify-content:center;padding:0 20px}
.campo{border:1px solid ${c.outline};border-radius:${formas.extraSmall}px;height:56px;padding:0 16px;display:flex;align-items:center;color:${c.onSurfaceVariant};position:relative}
.campo b{position:absolute;top:-9px;left:12px;background:${c.background};padding:0 4px;font:400 12px Inter;color:${c.onSurfaceVariant}}
.cartao{background:${c.surfaceContainerLow};border:1px solid ${c.outlineVariant};border-radius:${formas.medium}px;padding:14px;display:flex;flex-direction:column;gap:4px}
.selo{border-radius:${formas.extraSmall}px;padding:3px 8px;display:inline-block}
.chip{height:32px;border-radius:${formas.small}px;border:1px solid ${c.outlineVariant};padding:0 14px;display:flex;align-items:center;color:${c.onSurfaceVariant};white-space:nowrap}
.chip.sel{background:${c.primary};color:${c.onPrimary};border-color:${c.primary}}
.nav{height:80px;background:${c.surfaceContainerLow};display:flex;justify-content:space-around;align-items:center;flex:none;border-top:1px solid ${c.outlineVariant}}
.item{display:flex;flex-direction:column;align-items:center;gap:4px;color:${c.onSurfaceVariant};width:80px}
.item i{width:64px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center}
.item.sel{color:${c.primary}}.item.sel i{background:${c.primaryContainer};color:${c.onPrimaryContainer}}
.topo{height:64px;display:flex;align-items:center;gap:8px;padding:0 4px;flex:none}
.linha{display:flex;justify-content:space-between}.row{display:flex;gap:8px;align-items:center}
.faixa{border-radius:${formas.medium}px;padding:14px}
.switch{width:52px;height:32px;border-radius:16px;background:${c.primary};position:relative;flex:none}.switch:after{content:'';position:absolute;right:4px;top:4px;width:24px;height:24px;border-radius:12px;background:${c.onPrimary}}
hr{border:0;border-top:1px solid ${c.outlineVariant};margin:8px 0}
.aviso{position:absolute;top:8px;left:0;right:0;text-align:center;font:500 10px Inter;color:${c.onSurfaceVariant};opacity:.7}`;

const ic = {
  casa: 'M12 3.2 3 10v10a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1V10z',
  busca: 'M10 3a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  sino: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1z',
  pessoa: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3 0-8 1.5-8 4.5V20h16v-1.5C20 15.5 15 14 12 14z',
  voltar: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z',
};
const icone = (p) => `<svg width="24" height="24" viewBox="0 0 24 24"><path d="${ic[p]}" fill="currentColor"/></svg>`;
const status = '<div class="status"><span>9:41</span><span>▴ ▮</span></div>';
const nav = (ativa) => `<div class="nav">${[['casa', 'Promoções'], ['busca', 'Buscar'], ['sino', 'Avisos'], ['pessoa', 'Conta']]
  .map(([i, n], k) => `<div class="item ${k === ativa ? 'sel' : ''}"><i>${icone(i)}</i><span class="labelMedium">${n}</span></div>`).join('')}</div>`;
const logo = (cls) => `<div class="row" style="gap:${cls === 'displaySmall' ? 10 : 6}px">${arte('marca_coracao', cls === 'displaySmall' ? 35 : 20, cls === 'displaySmall' ? 29 : 17)}<span class="${cls} sec">economae</span></div>`;
const selo = (t, tipo, c, cls = 'labelSmall') => {
  const cor = { Destaque: [c.primary, c.onPrimary], Queda: [c.primaryContainer, c.onPrimaryContainer], Demonstracao: [c.secondaryContainer, c.onSecondaryContainer], Condicao: [c.tertiaryContainer, c.onTertiaryContainer] }[tipo];
  return `<span class="selo ${cls}" style="background:${cor[0]};color:${cor[1]}">${t}</span>`;
};
const cartao = (c, { nome, loja, preco, antes, queda, destaque, rotulo }) => `<div class="cartao">
  <div class="row">${destaque ? selo('DESTAQUE', 'Destaque', c) : ''}${rotulo ? selo(rotulo, rotulo === 'DEMONSTRAÇÃO' ? 'Demonstracao' : 'Condicao', c) : ''}<span style="flex:1"></span>${selo(queda, 'Queda', c)}</div>
  <div class="titleSmall">${nome}</div><div class="bodySmall var">${loja}</div>
  <div class="row" style="align-items:flex-end;gap:10px"><span class="headlineSmall ter">${preco}</span><span class="bodySmall var" style="padding-bottom:4px">antes ${antes}</span></div></div>`;

const telas = {
  entrada: (c) => `<div class="tela">${status}
    <div style="position:relative;flex:none">${arte('arte_onda', 390, 210, `style="position:absolute;top:-28px;left:0"`).replace(/fill="#FCE0EA"/g, `fill="${c.primaryContainer}"`)}
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;padding:4px 24px 0">${logo('displaySmall')}
        <div class="titleMedium sec" style="text-align:center;margin-top:8px">Mais amor no seu dia a dia,<br>por menos.</div>
        <div style="margin-top:16px">${arte('arte_mae', 124, 160)}</div>
        <div class="bodyMedium var" style="text-align:center;margin-top:12px">Prévia de teste. Avisos de queda de preço de fraldas, higiene e mais.</div></div></div>
    <div class="conteudo" style="padding:0 24px;gap:12px"><div class="titleMedium" style="margin-top:16px">Servidor</div>
      <div class="campo bodyLarge"><b>Endereço do servidor</b>https://exemplo.trycloudflare.com</div>
      <div class="contorno labelLarge">Testar conexão</div><div class="titleMedium" style="margin-top:8px">Entrar por e-mail</div>
      <div class="campo bodyLarge"><b>Seu e-mail</b>voce@exemplo.com</div><div class="botao labelLarge">Enviar código</div></div></div>`,
  feed: (c) => `<div class="tela">${status}<div class="conteudo" style="padding:0">
    <div style="padding:16px 16px 0">${logo('titleLarge')}</div><div class="titleMedium" style="padding:8px 16px 4px">Promoções para você</div>
    <div class="row labelLarge" style="padding:0 12px;overflow:hidden"><div class="chip sel">Todas</div><div class="chip">Cuidados pessoais</div><div class="chip">Mercearia</div><div class="chip">Bebê</div></div>
    <div style="padding:4px 12px;display:flex;flex-direction:column;gap:10px">
    ${cartao(c, { nome: 'Fralda descartável premium M, pacote com 60', loja: 'Loja A · 60 unidades', preco: 'R$ 59,90', antes: 'R$ 87,90', queda: '-32%', destaque: true, rotulo: 'DEMONSTRAÇÃO' })}
    ${cartao(c, { nome: 'Lenço umedecido 3 pacotes', loja: 'Loja B · 3 × 50 unidades', preco: 'R$ 15,90', antes: 'R$ 19,90', queda: '-20%', rotulo: 'Leve 3, pague 2' })}
    ${cartao(c, { nome: 'Sabonete líquido 400 ml', loja: 'Loja C · 400 ml', preco: 'R$ 12,49', antes: 'R$ 16,90', queda: '-26%' })}
    </div></div>${nav(0)}</div>`,
  'feed-vazio': (c) => `<div class="tela">${status}<div class="conteudo" style="padding:0">
    <div style="padding:16px 16px 0">${logo('titleLarge')}</div><div class="titleMedium" style="padding:8px 16px 4px">Promoções para você</div>
    <div class="row labelLarge" style="padding:0 12px"><div class="chip sel">Todas</div><div class="chip">Cuidados pessoais</div><div class="chip">Mercearia</div></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:12px;padding:24px;text-align:center">${arte('arte_vazio_feed', 120, 120)}
      <div class="bodyLarge">Nenhuma promoção ativa agora. O feed só mostra ofertas coletadas nas últimas horas, das categorias que você marcou.</div>
      <div class="bodyMedium">Categorias que você acompanha: Bebê, Limpeza.</div>
      <div class="bodySmall var">Se nenhuma delas tem oferta coletada agora, a lista fica vazia. Troque em Conta → Categorias e CEP.</div>
      <div class="botao labelLarge" style="width:100%">Mudar categorias e CEP</div><div class="contorno labelLarge" style="width:100%">Atualizar</div></div></div>${nav(0)}</div>`,
  detalhe: (c) => `<div class="tela">${status}<div class="topo"><span style="width:48px;height:48px;display:flex;align-items:center;justify-content:center">${icone('voltar')}</span><span class="titleLarge">Promoção</span></div>
    <div class="conteudo" style="gap:6px"><div class="row" style="gap:6px">${selo('-32%', 'Destaque', c, 'labelLarge')}${selo('DEMONSTRAÇÃO', 'Demonstracao', c, 'labelLarge')}</div>
    <div class="titleLarge">Fralda descartável premium M, pacote com 60</div><div class="bodyMedium var">Loja A · 60 unidades</div>
    <div class="headlineMedium ter">R$ 59,90</div><div class="bodySmall var">Referência: R$ 87,90 (mediana dos últimos 30 dias)</div>
    <div class="faixa" style="background:${c.primaryContainer};color:${c.onPrimaryContainer};margin-top:6px"><div class="labelLarge">Nesta loja, em 21 dias medidos:</div><div class="bodyMedium">menor R$ 59,90 · maior R$ 89,90</div></div>
    <div class="titleMedium" style="margin-top:12px">Entrega e condições</div>
    <div class="linha bodyMedium"><span class="var">Entrega para</span><span>CEP 01310-100</span></div><div class="linha bodyMedium"><span class="var">Prazo</span><span>3 dia(s)</span></div>
    <div class="linha bodyMedium"><span class="var">Frete</span><span>grátis acima de R$ 99,00</span></div>
    <div class="faixa bodyMedium" style="background:${c.errorContainer};color:${c.onErrorContainer};margin-top:8px">Texto legal de advertência do produto, quando houver (exemplo).</div>
    <div class="botao labelLarge" style="margin-top:6px">Ver na loja (link de afiliado)</div><div class="bodySmall var">Este link pode render uma comissão ao economae, sem custo para você.</div>
    <div class="contorno labelLarge">Compartilhar</div></div></div>`,
  conta: (c) => `<div class="tela">${status}<div class="conteudo" style="gap:6px;padding-top:16px"><div class="titleLarge">Conta</div><div class="bodyLarge">voce@exemplo.com</div>
    <div class="bodySmall var">Plano gratuito · 1 CEP(s)</div><div class="bodySmall var">Entrou por: email</div><hr>
    <div class="contorno labelLarge">Categorias e CEP</div><div class="row bodyLarge" style="justify-content:space-between;padding:6px 0"><span>Avisos por notificação</span><span class="switch"></span></div>
    <div class="bodySmall var">O envio de notificações push ainda não existe nesta prévia; esta chave só grava o seu consentimento.</div>
    <div class="titleMedium" style="margin-top:12px">Silenciados</div><div class="bodySmall">Nada silenciado.</div>
    <div class="titleMedium" style="margin-top:12px">Produtos que você segue</div><div class="bodyMedium" style="padding:6px 0">Fralda descartável premium M</div><hr>
    <div class="contorno labelLarge">Exportar meus dados</div><div class="contorno labelLarge">Sair</div><div class="contorno labelLarge"><span class="err">Excluir minha conta</span></div>
    <div class="labelSmall var" style="margin-top:8px">Servidor: https://exemplo.trycloudflare.com<br>Versão 0.2.0-previa</div></div>${nav(3)}</div>`,
};

// ---------------------------------------------------------------------------------------------------- saída
const saida = resolve(process.argv[2] ?? 'conferencia-visual');
mkdirSync(saida, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 2, viewport: { width: 2100, height: 900 } });
for (const [modo, nome] of [['claro', 'CoresClaras'], ['escuro', 'CoresEscuras']]) {
  const c = esquema(nome);
  const corpo = Object.entries(telas).map(([t, f]) => f(c).replace('<div class="tela">', `<div class="tela" id="${t}">`).replace(/<\/div>$/, '<span class="aviso">aproximação · conferir no aparelho</span></div>')).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>${css(c)}</style><body>${corpo}</body>`;
  writeFileSync(join(saida, `conferencia-${modo}.html`), html);
  await pagina.setContent(html);
  await pagina.evaluate(() => document.fonts.ready);
  for (const t of Object.keys(telas)) await pagina.locator(`#${t}`).screenshot({ path: join(saida, `${t}-${modo}.png`) });
  await pagina.screenshot({ path: join(saida, `todas-${modo}.png`), fullPage: true });
  console.log(`${modo}: ${Object.keys(telas).length} telas em ${saida}`);
}
await navegador.close();
