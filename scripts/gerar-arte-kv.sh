#!/usr/bin/env bash
# Gera os VectorDrawables do app a partir das telas do KV (docs/design/kv/). Rode de novo se o KV mudar.
# Recortes em coordenadas do SVG (390×844). Detalhes e limites: docs/design/identidade-visual.md.
set -euo pipefail
cd "$(dirname "$0")/.."
KV=docs/design/kv
D=app/app/src/main/res/drawable
c() { node scripts/svg-para-vector.mjs "$@"; }

# Ícone adaptativo: coração do logotipo na frente (zona segura de 66dp), onda e círculo da tela de boas-vindas no fundo.
c $KV/01-boas-vindas.svg $D/ic_launcher_frente.xml        --recorte 166,141,58,47 --so-cor '#F65B91' --tela 108,108,30
c $KV/01-boas-vindas.svg $D/ic_launcher_monocromatico.xml --recorte 166,141,58,47 --so-cor '#F65B91' --tela 108,108,30 --cor-unica '#000000'
c $KV/01-boas-vindas.svg $D/ic_launcher_fundo.xml         --recorte 115,60,200,200 --modo cruza --excluir-cor '#F65B91' --tela 108,108,0 --fundo '#FFF9F7'
# Coração do logotipo, ao lado do nome "economae" (o nome é texto, na fonte do tema).
c $KV/01-boas-vindas.svg $D/marca_coracao.xml             --recorte 166,141,58,47 --so-cor '#F65B91' --dp 29,24
# Onda do topo da tela de boas-vindas (uma cor só: o app pinta com a cor do tema).
c $KV/01-boas-vindas.svg $D/arte_onda.xml                 --recorte 0,0,390,210 --modo cruza --so-cor '#FCE0EA' --dp 195,105
# Ilustração da mãe (tela de entrada).
c $KV/01-boas-vindas.svg $D/arte_mae.xml                  --recorte 100,350,190,245 --modo cruza --excluir-cor '#E7DDF8,#FFF9F7' --dp 152,196
# Estados vazios: mamadeira (feed) e carrinho (busca, avisos e o resto), com o quadro verde-água dos produtos do KV.
c $KV/02-inicio.svg      $D/arte_vazio_feed.xml           --recorte 155,481,76,76 --dp 120,120
c $KV/02-inicio.svg      $D/arte_vazio.xml                --recorte 273,481,76,76 --dp 120,120
