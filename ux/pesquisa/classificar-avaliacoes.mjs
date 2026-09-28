// Pesquisa de UX (fase 2): classifica as avaliações de nota 1–2 de reviews.json por tema, via expressão regular.
// A contagem é piso: reclamação escrita de outro jeito não entra. Resultado agregado em resumo-avaliacoes.json e DOSSIE_UX.md 2.1.
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('reviews.json'));
const T = {
  A_notif_excesso: /(notifica\w*[^.]{0,60}(demais|muit|excess|toda hora|o dia todo|a cada|n[aã]o para|spam|in[uú]te|propaganda)|(muit|excess|demais|spam)[^.]{0,30}notifica|spam)/i,
  B_notif_atraso_ou_falha: /(notifica\w*[^.]{0,80}(demora|atras|horas depois|\d+ ?h(oras)? depois|n[aã]o cheg|nunca cheg|n[aã]o recebo|n[aã]o abre)|(n[aã]o recebo|n[aã]o recebi|nunca recebi)[^.]{0,40}(notifica|alerta)|alerta[^.]{0,60}(n[aã]o funciona|nunca|n[aã]o chega|n[aã]o avisa))/i,
  C_promo_falsa_ou_preco_errado: /(promo\w*[^.]{0,40}(falsa|fake|engan|mentir)|(falsa|fake|engan)[^.]{0,30}promo|pre[cç]o[^.]{0,40}(errado|diferente|n[aã]o (é|e) o mesmo|dobro)|oferta\w*[^.]{0,30}(falsa|fake|engan|n[aã]o existe))/i,
  D_oferta_encerrada_na_lista: /((promo|oferta|an[uú]ncio)\w*[^.]{0,60}(j[aá] acabou|encerrad|expirad|antig|desatualizad|n[aã]o existe mais|n[aã]o vale(m)? mais)|esgotad)/i,
  E_anuncio_intrusivo: /(an[uú]ncio|propaganda|publicidade|pop.?up|patrocin)/i,
  F_lento_trava: /(trava|travando|lento|lerdo|pesad|n[aã]o carrega|demora (pra|para) (abrir|carregar)|fecha sozinho)/i,
  G_login: /(login|logar|deslog|senha|c[oó]digo de|n[aã]o consigo (entrar|acessar))/i,
  H_nao_entrega_regiao: /(n[aã]o entrega\w*|n[aã]o atende\w*|minha (cidade|regi[aã]o)|meu cep|fora da (área|area|regi))/i,
  I_indisponivel_no_fim: /(indispon[ií]vel|sem estoque|n[aã]o tem (no )?estoque|falta\w*[^.]{0,20}(item|itens|oferta))/i,
  J_condicao_oculta: /(condi[cç]\w+[^.]{0,40}(n[aã]o|escondid|clara|mi[uú]d)|s[oó] (vale|v[aá]lido) (para|pra)|letra mi[uú]da|kit|leve \d|compre \d|ganhe outro)/i,
  K_irrelevante: /(n[aã]o (me )?interess|irrelevant|nada a ver|coisa(s)? cara|s[oó] (tem )?coisa cara)/i,
  L_permissao_localizacao: /(localiza[cç][aã]o|gps)/i,
};
const rows=[]; const ex={}; const tot={}; let N=0;
for (const [id,a] of Object.entries(d)) {
  const c={app:a.title.split(/[:\-]/)[0].trim(), n:a.low.length}; N+=a.low.length;
  for (const t in T){ c[t.slice(0,1)]=0; }
  for (const r of a.low){ const s=(r.t||'').replace(/\s+/g,' '); for (const [t,re] of Object.entries(T)) if(re.test(s)){c[t.slice(0,1)]++; tot[t]=(tot[t]||0)+1; (ex[t]??=[]).push(`[${c.app}, ${r.s}★, ${r.d.slice(0,10)}] ${s.slice(0,220)}`);} }
  rows.push(c);
}
console.table(rows); console.log('TOTAL', N, tot);
// Exemplos ficam só localmente (texto de terceiros): fs.writeFileSync('ex2.json', ...)
for (const t of ['B_notif_atraso_ou_falha','D_oferta_encerrada_na_lista','J_condicao_oculta','K_irrelevante','H_nao_entrega_regiao','L_permissao_localizacao']) { console.log('\n==',t); ex[t]?.slice(0,8).forEach(x=>console.log('-',x)); }
