// Pesquisa de UX (fase 2): baixa as 900 avaliações mais recentes de cada app da Google Play BR.
// Uso: npm i google-play-scraper@10 && node coletar-avaliacoes.mjs <appId...>  → gera reviews.json (não versionado).
import gplay from 'google-play-scraper';
import fs from 'node:fs';
const apps = process.argv.slice(2);
const out = {};
for (const id of apps) {
  try {
    const info = await gplay.app({appId:id, lang:'pt', country:'br'});
    let all = []; let token;
    for (let p=0;p<6;p++){
      const r = await gplay.reviews({appId:id, lang:'pt', country:'br', sort: gplay.sort.NEWEST, num:200, paginate:true, nextPaginationToken: token});
      all = all.concat(r.data); token = r.nextPaginationToken; if(!token) break;
    }
    const low = all.filter(r=>r.score<=2);
    out[id] = {title: info.title, score: info.score, ratings: info.ratings, installs: info.installs, updated: info.updated, sample: all.length, low: low.map(r=>({s:r.score,d:r.date,t:r.text}))};
    console.log(id, info.title, info.score?.toFixed(2), info.installs, 'amostra', all.length, 'baixas', low.length);
  } catch(e){ console.log(id,'ERRO',e.message); }
}
fs.writeFileSync('reviews.json', JSON.stringify(out,null,1));
