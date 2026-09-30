# Proposta de UX — economae

Fase 5. Data: 2026-09-28. Base: DOSSIE_UX.md (fases 1–3), AUDITORIA.md (fase 4),
SUPOSICOES.md. Cada decisão relevante aponta a evidência entre colchetes:
`[R#]` reclamação de avaliação (DOSSIE 2.1) · `[U#]`/`[A#]` problema da auditoria ·
`[S-#]` suposição · `[código]` arquivo do repositório · `[P: …]` dado público (DOSSIE 2.5).

Critério de decisão (DOSSIE 3.4): *isso ajuda a pessoa a ver, em um segundo, que o aviso vale a
pena, ou ajuda o app a só avisar quando vale?*

Entregáveis desta fase: esta proposta · `design-tokens/` · `prototipo.html` · `android/` ·
`UX_COPY.md` · `MEDICAO.md` · `BACKLOG_UX.md`.

---

## 0. A proposta em três apostas

1. **A notificação carrega a prova.** Todo aviso diz o preço, quanto está abaixo do normal *nesta
   loja* e que é o menor preço em 6 meses — medido pelo app, não anunciado pela loja. Nenhum
   concorrente brasileiro faz isso na notificação [DOSSIE 2.2].
2. **A Régua de preço é a única invenção visual.** Uma barra que mostra de onde a onde o preço
   variou nos últimos meses, com o preço normal marcado e o preço de hoje na ponta. Tudo o mais é
   Material 3 padrão [princípio 10].
3. **Silêncio explicado.** Feed vazio vira prova de curadoria ("hoje conferimos 1.284 preços; nenhum
   passou") e a partida a frio vira contagem ("faltam 8 dias de medição") [U02, U06].

---

## 1. Os dez princípios aplicados

| # | Princípio | Decisão | Evidência |
|---|---|---|---|
| 1 | A notificação é a tela principal | Projetada antes de qualquer tela (seção 2); título com o preço primeiro, texto com a prova; toque abre direto o detalhe | Canal único `deliveries.canal = 'push'` [`0001:186`]; R7 |
| 2 | O preço é o herói | Preço atual 40 sp (detalhe) / 30 sp (card), peso 700, cor `texto` (17:1). Preço normal 16 sp, peso 400, `textoSecundario`, **nunca riscado**. Economia em reais em chip próprio, 16 sp 700, com ícone. Três números, três pesos | Tokens `precoDestaque`, `precoCartao`, `precoNormal`, `economia`; A04 |
| 3 | A prova precisa ser visível | Selo de prova + Régua de preço no card, na notificação (texto) e no topo do detalhe. Nada em aba | R6, R13, U01; Keepa e Google Shopping [DOSSIE 2.2] |
| 4 | Condição antes do clique | Faixa de condição **acima** do nome e do preço, com ícone e texto; no leitor de tela é lida primeiro; na notificação abre o texto | R10, A07; `tipos.ts:124` |
| 5 | Ausência de oferta é funcionalidade | Estados "Nada excepcional hoje" e "Começando a medir", com números | U02, U06 |
| 6 | Acessibilidade desde o início | 48 dp, 4,5:1 verificado por script, 200% testado no protótipo, rótulo completo por card, nada só por cor | A01–A10; `design-tokens/gerar.mjs` |
| 7 | Aparelho modesto e internet ruim | Feed ≤ 150 KB na primeira carga, miniatura ≤ 12 KB, esqueleto estático, cache offline do último feed, zero animação obrigatória | [P: TIC 2025, franquia]; S-01; R2 |
| 8 | Linguagem de gente | "Preço normal nesta loja" em vez de "mediana"; "menor preço em 6 meses" em vez de "piso"; nenhum "score", "R$/l", "push", "feed" na interface | U04, U05; [P: Inaf 2024] |
| 9 | Publicidade declarada | Anúncio com forma própria (contorno tracejado, fundo cinza, ícone `campaign`, rótulo "Anúncio"), nunca nas duas primeiras posições, **nunca em notificação**; link de afiliado declarado | R3; Play Ads policy; CDC art. 36 |
| 10 | Convenção onde não importa | Barra de navegação inferior M3 com 3 destinos, top app bar, chips de filtro, campo de texto com máscara, botão principal cheio. Invenção só em: Régua de preço, Selo de prova, faixa de condição, estados de silêncio | Custo de aprendizado; R2 |

---

## 2. A notificação (tela principal)

### 2.1 Anatomia

```
┌───────────────────────────────────────────────┐
│ [ícone mono] economae · Drogaria Central · 14:10  ˅ │  ← subText = loja (≤ 20 car.)
│ R$ 39,90 · Protetor Solare…              [56dp] │  ← título ≤ 30: PREÇO primeiro
│ Menor preço em 6 meses: R$ 20,00 a menos [img] │  ← texto ≤ 40: PROVA
└───────────────────────────────────────────────┘
Expandida (BigTextStyle, ou BigPictureStyle quando houver imagem):
│ Preço normal nesta loja: R$ 59,90.
│ Menor preço dos últimos 6 meses.
│ Entrega no seu CEP em até 3 dias.
│ Conferido às 14:10. Você segue Cuidados pessoais.
│ [ Ver na loja ]  [ Ajustar avisos ]
```

Regras, cada uma com o porquê:

| Regra | Porquê |
|---|---|
| Título = `{preço} · {nome curto}`, máx. 30 caracteres; o nome é cortado, o preço nunca | Diretriz Android de 30 caracteres; o preço é o herói (princípio 2) |
| Texto recolhido = prova em ≤ 40 caracteres; se houver condição, **a condição vem antes** e a prova vai para o expandido | Diretriz de 40 caracteres; princípio 4 |
| `subText` = nome curto da loja | Reconhecer a loja sem abrir [U17, S-10] |
| Ícone grande = miniatura do produto; sem imagem, ícone da categoria em quadrado `provaContainer` | App funciona sem imagem [S-09] |
| Expandido termina com "Você segue {categoria}" | Explica por que chegou [R11] |
| "Conferido às HH:MM" no expandido | Honestidade sobre atraso e estoque [R7, R9, U10] |
| Duas ações: "Ver na loja" (abre o link) e "Ajustar avisos" | Máximo de 3 da diretriz; a segunda dá saída antes de a pessoa desligar tudo [R11] |
| Tocar no corpo abre o **detalhe** do app, não a loja | A prova completa fica a um toque; evita "notificação que não abre" [R7] |
| Nunca: anúncio, "sentimos sua falta", pedido de avaliação, resumo de marketing | Diretriz Android; Play Ads; R3, R5 |
| Canal "Ofertas excepcionais" (importância alta) e canal "Avisos do app" (baixa, só para falha de conta/assinatura) | Pessoa silencia um sem perder o outro |
| Padrão de fábrica: máximo 3 avisos por dia; nada entre 21h e 8h — avisos segurados saem às 8h, os mais fortes primeiro | U07; S-17 |
| Duas ou mais ao mesmo tempo: grupo com resumo "2 ofertas excepcionais" (InboxStyle) | Evita rajada [R5] |

### 2.2 Variações (todas implementadas em `android/.../notificacao/NotificacaoOferta.kt` e simuladas no protótipo)

| Id | Caso | Título (≤ 30) | Texto recolhido (≤ 40) |
|---|---|---|---|
| N1 | Incondicional, sem imagem | `R$ 39,90 · Protetor Solare…` | `Menor preço em 6 meses: R$ 20,00 a menos` |
| N2 | Incondicional, com imagem | igual a N1 | igual a N1; expandida mostra a foto (BigPicture) |
| N3 | Leve 3 pague 2 | `R$ 161,40 por 3 · Fralda Bebê…` | `Leve 3, pague 2 · economia de R$ 78,30` |
| N4 | Só com cartão/app da loja | `R$ 24,90 · Hidratante Pele…` | `Com cartão Vida Mais · R$ 10,00 a menos` |
| N5 | Caiu de novo (dedupe liberou) | `R$ 34,90 · Protetor Solare…` | `Caiu mais: era R$ 39,90 no último aviso` |
| N6 | Retirada na loja | igual a N1 | `Retire a 1,2 km · R$ 12,00 a menos` |
| N7 | Grupo | `2 ofertas excepcionais` | uma linha por oferta (InboxStyle) |

**Como o texto de 40 caracteres é escolhido.** O código tenta uma lista de modelos em ordem e usa
o primeiro que cabe (`TextosNotificacao.kt`, testado em `TextosNotificacaoTest.kt`):
1. `Menor preço em 6 meses: R$ 20,00 a menos` (ou "em 94 dias" quando o histórico tem menos de
   180 dias — nunca promete 6 meses que não mediu);
2. `Menor em 6 meses: R$ 120,00 a menos`;
3. `R$ 120,00 abaixo do normal da loja`.
Com condição, a lista começa pela condição (`Leve 3, pague 2 · economia de R$ 78,30`;
`Com cartão Vida Mais · R$ 10,00 a menos`, caindo para `Só com cartão da loja · …` se o nome do
programa não couber). Nada é abreviado de forma que a pessoa precise adivinhar.

### 2.3 Acessibilidade da notificação

O sistema lê título e texto. Por isso a notificação não usa símbolos soltos ("↓", "−33%"), e o
preço vem formatado em pt-BR ("R$ 39,90", lido "trinta e nove reais e noventa centavos") [A08].

---

## 3. Arquitetura de informação

```
Primeiro uso (uma vez)
  Boas-vindas → O que você compra? (categorias) → Seu CEP → Quer ser avisado? (permissão) ─┐
                                                                                         ▼
Barra inferior (M3 NavigationBar, 3 destinos)
  ├─ Ofertas ────── feed de hoje (Excepcionais · Boas ofertas · Remédios sem receita)
  │                  └─ Detalhe da oferta ── Como verificamos (folha)
  ├─ Avisos ─────── tudo o que já foi avisado, por dia, com "Ativa"/"Encerrada"
  │                  └─ Detalhe da oferta
  └─ Ajustes ────── Categorias · CEP · Avisos (limite, silêncio) · Notificações do sistema
                     · Conta (opcional) · Premium (mais CEPs) · Como verificamos · Termos
                     · Privacidade · Excluir dados/conta

Entradas externas: notificação → Detalhe · link compartilhado → Detalhe
```

| Decisão | Porquê | Descartada |
|---|---|---|
| 3 destinos na barra inferior | Convenção M3 para 3–5 destinos; "Avisos" existe porque notificação some e a pessoa quer rever [review Promobit: "Só mostram 4 notificaçoes, não consigo ver as anteriores"] | Gaveta lateral (esconde destinos; custo de descoberta) |
| Sem busca | O app não é catálogo; busca produziria "por que X não está aqui?" e contradiz a curadoria | Busca por produto (entra em BACKLOG_UX B-12 como "Seguir um produto") |
| Sem conta para usar | Login é a reclamação nº 1 [R1, U16] | Login no primeiro uso |
| Onboarding de 4 passos, sem carrossel | Cada passo coleta um dado necessário; carrossel não coleta nada | Carrossel de 3 telas de apresentação |
| Permissão no passo 4, por botão | Diretriz Android de pedir em contexto e a partir de ação [U03] | Pedir ao abrir o app |

---

## 4. Componentes do diferencial

### 4.1 Cartão de oferta (feed)

Ordem visual **e** de leitura (A07):

```
┌──────────────────────────────────────────────┐
│ ⓘ Leve 3, pague 2 — R$ 161,40 levando 3      │ ← Faixa de condição (se houver)
├──────────────────────────────────────────────┤
│ [ícone/foto]  Fralda Bebê Seco G · 34 un     │ ← nome curto, 2 linhas
│               Farmácia Vida                  │ ← loja (apoio)
│ R$ 53,80 cada   [↘ R$ 78,30 a menos levando 3] │ ← PREÇO 30sp + chip
│ Preço normal nesta loja: R$ 79,90            │ ← subordinado, sem risco
│ ✓ Menor preço em 6 meses                     │ ← Selo de prova
│ ▕━━━━━━━━━━━━━━━━┿━━━━━━━━━━━▏               │ ← Régua de preço (compacta)
│ R$ 53,80            normal R$ 79,90   R$ 84,90│
│ 🚚 Entrega no seu CEP em até 3 dias · 14:10  │ ← cobertura + conferido
└──────────────────────────────────────────────┘
```

- Toda a área do cartão é o alvo de toque (≥ 48 dp de altura, bem acima).
- **Descrição para leitor de tela** (uma frase, gerada, única por card): "Leve 3, pague 2. Fralda
  Bebê Seco G, 34 unidades, na Farmácia Vida. 53 reais e 80 centavos cada levando 3, 161 reais e
  40 no total. Preço normal nesta loja: 79 reais e 90. Economia de 78 reais e 30. Menor preço em 6
  meses. Entrega no seu CEP em até 3 dias. Conferido às 14 horas e 10." [A04]
- Com fonte a 200%, preço e chip de economia **empilham** (FlowRow), a régua mantém altura e os
  rótulos da régua passam para baixo em linha própria [A05].

### 4.2 Selo de prova e Régua de preço (a invenção)

**Selo**: ícone `verified` + texto em `prova` sobre o cartão (8,1:1). Três textos possíveis, na
ordem de força, escolhidos pelos campos da API (S-28):

| Condição nos dados | Texto do selo |
|---|---|
| preço efetivo ≤ piso e ≥ 180 dias medidos | "Menor preço em 6 meses" |
| preço efetivo ≤ piso e N < 180 dias | "Menor preço em N dias de medição" |
| preço efetivo até 5% acima do piso | "Quase o menor preço em 6 meses" (ou "em N dias") |

**Régua**: barra de 6 dp (compacta) ou 10 dp (detalhe) com o intervalo mín.–máx. do período medido.
Marcas: losango no **preço normal** (mediana 30 d) e círculo cheio no **preço de hoje**. Rótulos
em texto abaixo (nunca só a forma) [A02]. A barra usa `provaRegua` (8,1:1) e `contornoSuave` para o
trecho acima do normal. Não é gráfico de linha: um gráfico de 90 dias existe no detalhe, com tabela
"Ver preços dia a dia" como alternativa textual [A04].

Por que régua e não gráfico no card: o gráfico exige leitura de eixo (Inaf: 36% no nível
elementar) e custo de desenho em lista; a régua dá a resposta — "está na ponta de baixo" — em uma
olhada, como a faixa típica do Google Shopping [DOSSIE 2.2]. Descartado: gráfico de linha em todo
card (denso, caro em aparelho de entrada).

### 4.3 Faixa de condição

Fundo `condicaoContainer`, borda esquerda de 4 dp `condicaoBorda`, ícone `info`, texto 14 sp 600.
Sempre traz **o total da compra mínima**: "Leve 3, pague 2 — R$ 161,40 levando 3" [U09]. Textos por
tipo em UX_COPY 4. No card, o preço herói passa a ser o **preço efetivo por embalagem** com o
sufixo "cada", e o total aparece na faixa — assim o número grande é o comparável com o "preço
normal" (princípio 2 sem esconder a condição).

### 4.4 Etiqueta de nível

`notificar` → etiqueta "Excepcional" com ícone de sino e fundo `primariaContainer`.
`somente_feed` e `aguardar_aprovacao` → sem etiqueta; ficam na seção "Boas ofertas" [S-26].
Nunca só cor [U14].

### 4.5 Linha de cobertura

Ícone + texto: "Entrega no seu CEP em até 3 dias" · "Retire na loja a 1,2 km" · "Entrega no seu CEP
— frete a confirmar na loja" (`frete_status = a_confirmar`). Aparece no card, no detalhe e na
notificação expandida [R4, U19].

### 4.6 Anúncio (se houver — S-12)

Forma própria: fundo `anuncioContainer`, contorno **tracejado** `anuncioBorda`, ícone `campaign`,
rótulo "Anúncio" antes do conteúdo, sem régua, sem selo, sem chip de economia, sem etiqueta. Posição
mínima: 3ª no feed, no máximo 1 a cada 6 cartões. Nunca em "Avisos", nunca em notificação [R3;
Play Ads policy].

### 4.7 Remédio sem receita

Seção própria "Remédios sem receita", formato de **lista de preço**: nome, apresentação, loja,
preço — sem selo, sem régua, sem chip, sem etiqueta — e a advertência "SE PERSISTIREM OS SINTOMAS,
O MÉDICO DEVERÁ SER CONSULTADO." em `apoio`. Nunca notifica [`DECISIONS.md` 28; RDC 96/2008; S-27].

---

## 5. Fluxos principais redesenhados

### F1 — Primeiro uso (meta: do toque no ícone ao feed em < 60 s, sem conta)

| Passo | Tela | Dado coletado | Estados |
|---|---|---|---|
| 1 | Boas-vindas: "Só avisamos quando a promoção é de verdade." | — | — |
| 2 | "O que você costuma comprar?" 8 categorias em cartões com ícone, multisseleção | `categorias` | nenhuma escolhida (botão desabilitado com texto "Escolha pelo menos uma") |
| 3 | "Qual é o seu CEP?" teclado numérico, máscara 00000-000 | `ceps[0]` | incompleto · fora de SP ("Ainda não chegamos aí") [U22] · sem rede (salva e confere depois) |
| 4 | "Quer receber o aviso quando aparecer?" com uma notificação de exemplo desenhada; "No máximo 3 por dia. Nunca propaganda." Botões "Quero receber avisos" / "Agora não" | consentimento → `notificacoes_consentidas_em` | aceitou · negou · Android < 13 (sem diálogo do sistema; o texto vira confirmação) |
| 5 | Ofertas | — | ver seção 6.2 |

Descartado: pedir e-mail no passo 1 (R1).

### F2 — Notificação → decisão → loja (o fluxo que mais importa)

1. Notificação (N1–N7). A pessoa decide na tela de bloqueio.
2. Toque → Detalhe já rolado no topo: condição, preço, prova, régua, cobertura, "Conferido às".
   - Se a oferta **acabou** desde o aviso: faixa `erroContainer` no topo "Esta oferta acabou às
     16:40. O preço voltou para R$ 59,90." e o botão principal vira "Ver ofertas de hoje" [R8].
   - Se o preço **mudou**: "O preço mudou para R$ 44,90 às 15:20" antes do preço [R9].
3. "Ver na Drogaria Central" (botão cheio, 56 dp, ícone `open_in_new` indicando saída do app).
4. Ao voltar ao app (mesma sessão, < 30 min): cartão discreto no topo "O preço na loja bateu?"
   Sim / Não / Não comprei. Opcional, some sozinho [U23].

### F3 — Abrir o app sem notificação

Ofertas → resumo do dia no topo ("Hoje conferimos 1.284 preços. 2 passaram.") → cartões → detalhe.

### F4 — Menos avisos sem desligar tudo

Notificação → "Ajustar avisos" → Ajustes › Avisos, com a categoria daquela oferta já destacada:
parar de seguir a categoria, mudar limite (1 · 3 · 5 · sem limite por dia), mudar silêncio [R11].

### F5 — Avisos desligados

Faixa fixa no topo de Ofertas e Avisos: "Os avisos estão desligados. Você só vê as ofertas
abrindo o app." Botão "Ligar avisos": se o sistema ainda deixa pedir, pede; se não, abre a tela de
notificações do app no sistema, com o texto "Toque em Notificações e ative".

### F6 — Segundo CEP (premium)

Ajustes › CEP › "Adicionar outro CEP" → folha explicando o premium com o preço vindo da Play
(nunca texto fixo), período, renovação e como cancelar **antes** do botão [S-11, S-14].

### F7 — Apagar dados

Ajustes › "Apagar meus dados" → confirmação com o que será apagado → apagado. Dois toques, sem
documento [R14; `DECISIONS.md` 7].

---

## 6. Telas e estados

Cada tela abaixo tem os estados carregando, vazio e erro, mais os específicos. Os textos estão em
UX_COPY.md; o protótipo tem um seletor de estado por tela.

### 6.1 Onboarding (4 telas)
Estados: padrão · categorias sem seleção · CEP incompleto · CEP fora de SP · sem rede ao salvar ·
permissão aceita · permissão negada · Android < 13.

### 6.2 Ofertas (feed)

| Estado | O que aparece | Porquê |
|---|---|---|
| Carregando | 3 esqueletos estáticos com a forma do cartão | R2; sem brilho animado (custo) |
| Com ofertas | resumo do dia · Excepcionais · Boas ofertas · Remédios sem receita · (anúncio a partir da 3ª posição) | 4.1–4.7 |
| **Nada excepcional hoje** | Ícone `verified`, título "Nada passou no teste hoje", texto "Conferimos 1.284 preços nas suas categorias. Nenhum era o menor dos últimos meses. Quando for, a gente avisa." + boas ofertas, se houver | U06, princípio 5 |
| **Começando a medir** | Barra de progresso "6 de 14 dias" e texto do porquê | U02, S-25 |
| Sem categorias | "Você não segue nenhuma categoria" + botão "Escolher categorias" | — |
| Sem CEP | "Falta o seu CEP" + campo | — |
| Fora da região | "Ainda não chegamos à sua região. Começamos pelo estado de São Paulo." + "Me avise quando chegar" (salva o CEP) | U22 |
| Erro | "Não deu para carregar as ofertas." + "Tentar de novo"; se houver cópia salva, mostra abaixo com "Mostrando as ofertas das 09:12" | R2 |
| Offline | Faixa "Sem internet. Mostrando as ofertas das 09:12." + cópia salva | Princípio 7 |
| Avisos desligados | Faixa F5 acima de qualquer estado | U03 |
| Gratuito / Premium | Idênticos; premium só muda o seletor de CEP no topo (até 3) | S-11 |

### 6.3 Detalhe da oferta
Estados: carregando (esqueleto) · ativa · condicional · encerrada · preço mudou · entrega a confirmar ·
retirada · remédio (lista + advertência) · erro (com cópia do que veio na notificação) · offline.

### 6.4 Avisos
Estados: carregando · com avisos (por dia, "Ativa"/"Encerrada") · vazio ("Nenhum aviso ainda. Quando
algo excepcional aparecer, fica guardado aqui.") · erro · avisos desligados (faixa F5).

### 6.5 Ajustes
Estados: padrão · sem conta ("Suas escolhas ficam só neste celular. Entre para não perder se
trocar de aparelho.") · com conta · premium ativo · premium pendente/expirado · avisos do sistema
desligados · erro ao salvar (desfaz e avisa).

### 6.6 Como verificamos (folha)
Explica as três checagens em linguagem simples, com os números da oferta aberta. Estados: com oferta
(números reais) · genérica (aberta de Ajustes).

---

## 7. Sistema visual

Fonte única: `design-tokens/tokens.json`. O script `design-tokens/gerar.mjs` gera o CSS do
protótipo e `android/.../ui/theme/Tokens.kt`, e **falha** se qualquer par de contraste obrigatório
ficar abaixo do mínimo (tabela em `design-tokens/README.md`).

- **Cor.** Superfícies quase neutras, marca verde-azulada só em ação primária e etiqueta
  "Excepcional". Preço em `texto` (contraste máximo, não vermelho: vermelho puro tem 4,0:1 [A01]).
  Economia em verde escuro, prova em azul, condição em âmbar — cada uma com ícone e texto.
- **Tipografia.** Fonte do sistema (sem download, S-23), algarismos tabulares nos preços. Escala:
  40 / 30 / 24 / 18 / 16 / 14 sp; 12 sp só para informação repetida. Informação essencial ≥ 14 sp
  (perfil C).
- **Hierarquia do preço (regra fixa):** atual 30–40 sp/700/`texto` > economia 16 sp/700 em chip
  `economiaContainer` > normal 16 sp/400/`textoSecundario`. Três pesos visuais distintos
  [princípio 2].
- **Espaço.** Grade de 4 dp; margem lateral 16 dp; espaço entre cartões 12 dp; padding interno 16 dp.
- **Raio.** Cartão 16 dp; chip e faixa 8 dp; botão total (pílula); folha 28 dp.
- **Elevação.** Cartão nível 0 com contorno `contornoSuave` (mais barato que sombra); folha nível 3.
- **Ícone.** Material Symbols Rounded, 24 dp padrão; mapa por papel em `tokens.json › icone.mapa`.
- **Tema escuro** completo, com os mesmos pares verificados [S-22].

## 8. Movimento mínimo

| Uso | Especificação |
|---|---|
| Troca de destino | fade 150 ms, curva padrão |
| Abrir detalhe | fade + 16 dp de deslocamento, 250 ms |
| Seleção de chip/categoria | cor em 150 ms |
| Esqueleto | estático |
| Qualquer outro | nenhum |

Com "Remover animações" do Android ou `prefers-reduced-motion`, tudo vira 0 ms. Nenhuma informação
depende de movimento [A09].

## 9. Desempenho e offline

- Feed paginado de 20 cartões; primeira carga ≤ 150 KB com miniaturas WebP ≤ 12 KB (56 dp @2x).
- Imagem só carrega com o cartão visível; sem imagem, ícone da categoria (0 KB).
- Último feed, avisos e detalhes abertos ficam salvos no aparelho; sem rede, mostram "das HH:MM".
- Detalhe aberto pela notificação renderiza primeiro com os dados que vieram na própria notificação
  (payload), e completa depois — a pessoa vê preço e prova mesmo com rede lenta.

## 10. Acessibilidade — checklist de aceitação

- [ ] Todo par texto/fundo passa no `gerar.mjs` (4,5:1 texto, 3:1 componente).
- [ ] Todo alvo ≥ 48 × 48 dp; cartão inteiro clicável.
- [ ] Cada cartão expõe **uma** descrição completa (4.1) e esconde os filhos do leitor de tela.
- [ ] Ordem de leitura: condição → produto → preço → prova → cobertura → ação.
- [ ] Fonte a 200%: nenhum texto cortado; preço e chip empilham; botões crescem em altura.
- [ ] Nenhum estado comunicado só por cor (etiqueta, economia, condição, anúncio, encerrada).
- [ ] Moeda e datas formatadas em pt-BR.
- [ ] Nenhuma animação obrigatória; "remover animações" respeitado.
- [ ] Testado com TalkBack e Accessibility Scanner em aparelho de referência (S-01).

## 11. O que a interface exige dos dados (contrato da fase 3)

| Campo | Existe hoje? | Usado em | Item |
|---|---|---|---|
| `precoReferenciaPorUnidade` (mediana 30 d) | sim, em `alerts` | "Preço normal nesta loja" | — |
| `pisoHistoricoPorUnidade`, `diasMedidos`, `economiaCentavos`, `quedaReal` | só em `Metricas` | Selo, chip, notificação | B-02 |
| Série diária 90 d (menor preço do dia) | derivável de `price_history` | Régua, gráfico | B-02 |
| Mín./máx. do período | derivável | Régua | B-02 |
| Nome curto do produto, marca | título cru | Card, notificação | B-05 |
| Nome de exibição da loja | não | Card, notificação | B-03 |
| Imagem | não | Card, notificação | B-03 |
| Encerrada em / preço atual depois do aviso | não | Detalhe, Avisos | B-04 |
| Cobertura por usuário (modo, prazo, distância) | cálculo existe, sem persistência | Linha de cobertura | B-10 |
| Resumo do dia (preços conferidos, aprovados) | contadores em memória | Estado "nada hoje" | B-09 |
| Dias de coleta da região | derivável | Estado "começando a medir" | B-09 |
| Usuário anônimo | não (`email NOT NULL`) | Uso sem conta | B-01 |

A implementação Android (`android/`) usa um modelo de interface (`OfertaUi`) que espelha esta
tabela, com dados de exemplo, para que a fase 3 só precise preencher o repositório.

## 12. Caminhos descartados (uma linha cada)

- Mostrar o "de/por" da loja — é o número que a pessoa não confia [R6; DOSSIE 2.6].
- Selo com percentual grande ("−33%") como herói — percentual engana em base pequena; reais têm peso próprio.
- Gráfico de linha em cada card — leitura de eixo e custo de desenho; ficou no detalhe.
- Temperatura/voto da comunidade — a prova deste produto é dado, não opinião [DOSSIE 2.2].
- Contagem regressiva de validade — validade quase sempre desconhecida [U10, A10].
- Pedir localização do aparelho — CEP basta [R12].
- Carrossel de apresentação — não coleta nada e atrasa o primeiro valor.
- Notificação de "resumo do dia" — seria o segundo tipo de aviso [R5].
- Cor vermelha para preço — contraste 4,0:1 e associação a erro [A01].
- Gaveta de navegação — esconde "Avisos".

## 13. Mudanças em relação às fases anteriores

Nenhuma conclusão das fases 1–4 foi revertida pela pesquisa posterior. Um refinamento: a fase 1
listou "conta Google ou e-mail" como pré-requisito implícito do modelo; a proposta torna a conta
**opcional**, o que exige mudança de esquema (S-13, B-01) — é proposta, não contradição.

## 14. Versão 2 (2026-09-30): alinhamento com as fases 3 e 4

As fases 3 e 4 do produto (branch `claude/awesome-noether-jruv6b`, contrato `backend/openapi/v1.json`
1.2.0) tomaram decisões que mudam a proposta. O protótipo foi atualizado; as mudanças e os motivos:

| Mudou | De | Para | Motivo |
|---|---|---|---|
| Público e categorias | 8 categorias de farmácia e mercado | 4: Fraldas e lenços, Higiene e cuidados do bebê, Alimentação infantil, Gestação e pós-parto | DECISIONS 44 (aprovada) |
| Remédio sem receita | Seção de lista de preço no feed | Fora do app | DECISIONS 45 |
| Aviso legal | Não existia | Aviso do Ministério da Saúde inteiro em alimentação infantil, no cartão, logo abaixo do preço no detalhe, e na notificação expandida | DECISIONS 46 (NBCAL, validada pela assessoria); campo `avisos[]` da API |
| Tamanho de fralda | Não existia | Passo opcional no primeiro uso (só para quem escolheu fraldas), etiqueta "Tamanho G" no cartão e no detalhe, edição em Ajustes | DECISIONS 51; pergunta tamanho, nunca idade |
| Conta | Opcional (S-13) | Obrigatória: código de 6 números no e-mail ou Google, depois termos 18+ | DECISIONS 34 e 38. S-13 foi superada; a proposta reduz o atrito com código sem senha, Google em um toque e sessão de 90 dias |
| Primeiro uso | 4 passos | Boas-vindas → Entrar → Termos → Categorias → Tamanho (se fralda) → CEP → Permissão | As telas novas vêm das regras acima |
| Limite de avisos | 1, 3, 5, sem limite | 1, 3 (padrão), 5, 10 | Teto do tenant (`limiteDiarioMaximo` = 10) e padrão do despachante (DECISIONS 58) |
| Feed | Sem filtro | Chips de filtro por categoria (toque de novo mostra todas) | O feed da API aceita `?categoria=` |
| Detalhe | — | Estado "Esta oferta não existe mais" (404) | Notificação tocada dias depois |

**Novo na proposta, ainda não implementado:**
- **N9: gestação escondida com o celular bloqueado.** "Gestação e pós-parto" revela gravidez por
  inferência (CHECKPOINT, revisão 3). Para essa categoria, a notificação usa `VISIBILITY_PRIVATE` com
  uma versão pública ("Nova oferta excepcional · Desbloqueie o celular para ver"). A categoria ganha
  uma nota explicando isso no primeiro uso (BACKLOG_UX B-29).
- **A1: comparação com o texto que o despachante envia hoje.** A fase 4 põe o nome do produto no
  título e "preço (referência X, Y% abaixo) · loja" no corpo (`backend/src/push/regras.ts`). Recolhida,
  a notificação mostra só o nome e o começo do corpo; o preço fica cortado. A recomendação continua a
  da seção 2: preço no título, "preço normal" em vez de "referência", economia em reais em vez de
  percentual (princípios 2 e 8). Ajuste proposto em BACKLOG_UX B-32.

**Dependências de dado confirmadas no contrato 1.2.0:**
- O detalhe já traz o histórico de 180 dias. Com ele, o app calcula o menor preço, os dias medidos e
  a régua, sem campo novo.
- O item do feed não traz nada disso. O selo e a régua do cartão continuam dependendo do acréscimo
  B-02.
- A tela Avisos precisa de uma rota que liste as entregas do usuário (B-31).

## 15. Implementado no produto real (2026-09-30)

A proposta saiu do protótipo e entrou no código das fases 3 e 4, na mesma branch:
- API 1.3.0 com `prova`, que alimenta o selo e a régua no feed (B-02).
- Push com o texto da seção 2 e montado pelo app (só dados); gestação com versão pública (N9).
- Cartão e detalhe do app com os componentes da seção 4 (`android/.../ui/prova/Prova.kt`).
- Tokens com a marca framboesa do app; o protótipo foi regenerado com ela.

Registrado como DECISIONS 68–72, a confirmar. O que falta está em BACKLOG_UX (estado de 30/09).
