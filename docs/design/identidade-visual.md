# Identidade visual do economae (linha criativa do KV)

Fonte: o KV entregue pelo responsável em 2026-10-29, oito telas em SVG (390 × 844), versionadas em `docs/design/kv/`
(`01-boas-vindas` a `08-favoritos`, com o `LEIA-ME.txt` original). Elas são **protótipos estáticos**: produtos, preços e
avaliações são ilustrativos. O app de prévia segue a linha criativa (cores, fonte, formas, tom), não copia as telas.
Onde o código guarda cada coisa: `app/app/src/main/java/br/com/economae/Tema.kt` (cores, tipografia, formas) e
`Componentes.kt` (cartão, selo, logotipo, botão, estado vazio). Nenhuma outra tela tem cor solta.

## Paleta

O KV declara cinco cores principais: **rosa `#F65B91`**, **lilás `#9575CD`**, **verde-água `#58C9BE`**,
**fundo creme `#FFF9F7`** e **texto `#302849`**. As telas usam também tons de apoio, todos daqui:
rosa-claro `#FCE0EA` / `#F8DDE9` / `#FCEAF0`, vinho `#8D3E70`, rosa escuro `#D93C78`, lilás escuro `#5D438F`,
lilás-claro `#E9DFF8` / `#E7DDF8`, verde dos preços `#278B7E`, verde-água claro `#DDF6F1` / `#E5F8F5`, verde escuro `#287F78`,
cinzas de texto `#81798F` / `#9A91A6` / `#6C627D` / `#5D526C`, borda `#F0E9F1` / `#EDE7F1`, pêssego `#FFF0D8`, estrela `#F4B544`.

### Papéis no tema (Material 3)

"Ajustada" = a cor do KV não passava no contraste (abaixo) e foi escurecida ou clareada mantendo o matiz.

| Papel | Claro | Escuro | Origem |
|---|---|---|---|
| primária (botão, chip escolhido, aba ativa, links) | `#CC2E6B`, texto `#FFFFFF` | `#F65B91`, texto `#3B0A20` | rosa do KV; no claro, **ajustada** |
| contêiner primário (faixa "prova", selo de queda, onda da entrada) | `#FCE0EA`, texto `#8D3E70` | `#5A1E40`, texto `#FFD9E4` | KV (claro); escuro derivado |
| secundária (logotipo, frase da marca) | `#5D438F` | `#B39DDB` | lilás escuro do KV (logotipo) |
| contêiner secundário (selo DEMONSTRAÇÃO) | `#E9DFF8`, texto `#5D438F` | `#4A3778`, texto `#E9DFF8` | KV |
| terciária (preços, gráfico de preço) | `#247F73` | `#58C9BE` | verde dos preços `#278B7E` **ajustado**; no escuro, o verde-água do KV |
| contêiner terciário (selo de condição, ex.: "Leve 3, pague 2") | `#DDF6F1`, texto `#1F6B65` | `#1F5A54`, texto `#DDF6F1` | KV; texto **ajustado** (o `#287F78` do KV dá 4,2:1) |
| fundo e superfície | `#FFF9F7` | `#1C1726` | creme do KV; escuro = texto do KV escurecido |
| cartão e barra de navegação (`surfaceContainerLow`) | `#FFFFFF` | `#262033` | KV (cartões brancos) |
| texto | `#302849` | `#F3EEF7` | KV |
| texto secundário (`onSurfaceVariant`) | `#6C627D` | `#CFC6DA` | KV (`#6C627D`); o cinza `#81798F` do KV dá 4,0:1 no creme e não é usado em texto |
| borda de campo e botão contornado (`outline`) | `#8C829D` | `#958CA2` | KV |
| borda de cartão e divisória (`outlineVariant`) | `#EDE7F1` | `#3E3550` | KV (só decorativa) |
| erro | `#B3261E`, contêiner `#FCE8E6` / `#8C1D18` | `#FFB4AB`, contêiner `#93000A` / `#FFDAD6` | padrão do Material 3 (o KV não tem erro); a advertência legal usa o contêiner de erro |

O app segue o modo do sistema (claro/escuro). O fundo da janela e da tela de abertura está também em
`res/values/colors.xml` e `res/values-night/colors.xml` (mesmo valor do tema).

### Contraste (WCAG 2.x, nível AA)

Texto normal precisa de **4,5:1**; borda de campo e de botão, 3:1. O teste `app/app/src/test/.../TemaTest.kt` confere
todas as combinações que o app usa, nos dois modos (o build falha se uma cair abaixo). O que o KV não passava, e o ajuste:

| Combinação no KV | Contraste | Ajuste no app |
|---|---|---|
| texto branco sobre rosa `#F65B91` (botão "Começar", selo "-32%") | 3,08:1 | botão e selo em `#CC2E6B` (5,0:1 com branco; 4,8:1 sobre o creme) |
| texto branco sobre lilás `#9575CD` ("Ver ofertas") | 3,68:1 | o app não tem esse botão; lilás em texto só o escuro `#5D438F` (7,6:1) |
| preço `#278B7E` sobre creme | 3,97:1 | `#247F73` (4,6:1) |
| selo `#D93C78` sobre `#FCE0EA` | 3,49:1 | selo de queda com `#8D3E70` sobre `#FCE0EA` (5,6:1), par que o próprio KV usa na faixa "Economize" |
| texto `#287F78` sobre `#DDF6F1` | 4,21:1 | `#1F6B65` |
| cinza `#81798F` sobre creme (texto auxiliar) | 3,98:1 | `#6C627D` (5,5:1) |
| cinza `#9A91A6` (preço antigo, placeholder) | 3,01:1 | `#6C627D` |
| (escuro) logotipo lilás sobre a onda vinho | 4,0:1 com `#7A2350` | contêiner primário escuro `#5A1E40` (5,2:1) |

## Tipografia

O KV usa **Inter** (`font-family: Inter, Arial, sans-serif`), pesos 400, 500, 600 e 700. A Inter é livre
(SIL Open Font License 1.1, sem nome reservado), então **vai embutida** no app: `res/font/inter_{regular,medium,semibold,bold}.ttf`,
gerados por `scripts/fonte-inter.py` (recorte latino com pontuação, setas, ★ ☆ ✓; contornos convertidos para TrueType;
~75 KB por peso). A licença vai dentro de cada arquivo (tabela `name`) e em `docs/design/fontes/Inter-OFL.txt`.
Origem usada: pacote `fonts-inter` 4.0 do Ubuntu (o mesmo código de https://github.com/rsms/inter).
**Para trocar de fonte, troque só `FonteDoApp` em `Tema.kt`.**

| Estilo | Tamanho/linha | Peso | Onde (KV → app) |
|---|---|---|---|
| displaySmall | 36/44 | 700 | nome "economae" na entrada (KV: 39) |
| headlineMedium | 28/36 | 700 | preço no detalhe (KV: 27) |
| headlineSmall | 24/32 | 700 | preço no cartão |
| titleLarge | 21/28 | 700 | título de tela, logotipo pequeno (KV: 21) |
| titleMedium | 17/24 | 700 | título de seção e frase da marca (KV: 17) |
| titleSmall | 14/20 | 600 | nome do produto no cartão |
| bodyLarge / Medium / Small | 16/24, 14/20, 12/16 | 400 | textos |
| labelLarge | 15/20 | 700 | botões (KV: 16) |
| labelMedium | 12/16 | 600 | rótulos da barra de navegação |
| labelSmall | 11/16 | 700 | selos (KV: 10; subimos para 11 por legibilidade) |

O KV usa texto de 8 a 10 px em vários lugares; o app não desce de 11 sp.

## Formas

Cantos do KV: selo 7–9, busca e chips 14–15 (chips de 32 de altura, quase pílula), cartão 15, botão grande e faixa 18–20,
moldura do celular 30. No tema (`Formas`): `extraSmall` 8 (selos, campos), `small` 14 (chips), `medium` 16 (cartões e
faixas), `large` 18 (botão principal, 52 de altura como o "Começar"), `extraLarge` 28 (diálogos). Botões secundários
são contornados em pílula. Cartões: brancos sobre o creme, borda de 1 dp `outlineVariant`, sem sombra.

## Logotipo, ícone, abertura e ilustrações

Não há arquivo de logotipo separado: no KV o logotipo é o **coração rosa** (um `path`) mais o nome "economae" em
Inter 700 no lilás escuro. No app: `Logotipo()` (coração vetorial + texto, que o leitor de tela lê).

Tudo vem das telas do KV por `scripts/gerar-arte-kv.sh` (que chama `scripts/svg-para-vector.mjs`):

| Recurso | De onde |
|---|---|
| `ic_launcher_frente` | coração do logotipo, 54 dp dentro da zona segura de 66 dp |
| `ic_launcher_fundo` | creme, onda rosa-claro e círculo verde-água da tela de boas-vindas |
| `ic_launcher_monocromatico` | o coração em uma cor (ícones temáticos do Android 13+) |
| tela de abertura | `core-splashscreen`: o coração sobre o fundo creme (escuro no modo escuro) |
| `marca_coracao` | coração do logotipo |
| `arte_onda` | onda do topo da boas-vindas; o app pinta com `primaryContainer` (funciona no escuro) |
| `arte_mae` | ilustração da mãe (entrada) |
| `arte_vazio_feed` / `arte_vazio` | mamadeira e carrinho no quadro verde-água dos produtos (estados vazios) |

As ilustrações são decorativas (o texto ao lado já diz tudo), então ficam sem `contentDescription` e o leitor de
tela as pula; os ícones da barra também (o rótulo embaixo nomeia a aba). A seta de voltar tem "Voltar"; o selo de
queda é lido como "queda de 32%".

### Limites da conversão SVG → VectorDrawable

O conversor aceita `rect` (com cantos), `circle`, `ellipse`, `line`, `polygon`, `polyline`, `path` e gradiente linear
simples; recusa filtro, máscara, recorte (`clipPath`), imagem, padrão, gradiente radial e `transform`, que teriam de
ser rasterizados (WebP em `res/drawable-nodpi`). **O KV não tem nenhum desses**: tudo virou vetor, nada foi rasterizado.
Texto (`<text>`) não vira vetor: é desenhado pelo app com a fonte do tema. Por isso o pacote de fralda com "baby M" e
o frasco com "care" do KV ficaram de fora das artes (têm texto dentro); se quiser usá-los, peça a versão com o texto
convertido em curvas.

## Tom

Acolhedor e direto, de família ("Mais amor no seu dia a dia, por menos."): frases curtas, sem gritaria de oferta.
O rosa chama a ação e o desconto; o verde é sempre preço; o lilás é a marca; o creme dá calma.

## O que NÃO fazer

- Não usar o rosa `#F65B91` com texto branco no tema claro (3,1:1): use `primary` (`#CC2E6B`).
- Não pôr texto em `#81798F` ou `#9A91A6` (abaixo de 4,5:1): use `onSurfaceVariant`.
- Não escrever cor, tamanho de fonte ou canto direto numa tela: use `MaterialTheme.colorScheme/typography/shapes`
  (ou `Marca` em `Tema.kt` para a cor literal do KV).
- Não usar texto abaixo de 11 sp, mesmo que o KV use 8–10.
- Não riscar o "preço de antes": no app ele é a mediana de 30 dias (referência), não um "de/por" da loja.
- Não embutir fonte sem licença conhecida; a Inter só entra porque é OFL.
- Não editar à mão os XML gerados (`ic_launcher_*`, `arte_*`, `marca_coracao`) nem as fontes: rode os scripts.

## Conferência sem aparelho

`node scripts/conferencia-visual.mjs <pasta>` desenha no Chromium as telas de entrada, feed, feed vazio, detalhe e
conta, em claro e escuro, lendo as cores, a fonte e as formas de `Tema.kt` e as artes pelos mesmos recortes. É uma
aproximação dos componentes do Material 3; **a conferência de verdade é no celular**.
