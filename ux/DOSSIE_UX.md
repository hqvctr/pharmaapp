# Dossiê de UX — economae

Documento vivo das fases 1 a 3 do trabalho de UX. Cada afirmação traz a evidência: caminho no
repositório (`arquivo:linha`) ou fonte externa com data de acesso. O que não foi encontrado está
escrito como não encontrado.

- Fase 1 — retrato do produto como ele é hoje (seção 1).
- Fase 2 — pesquisa externa (seção 2).
- Fase 3 — três perfis e a expectativa central (seção 3).

---

## 1. Retrato do produto (fase 1)

Leitura feita em 2026-09-28 sobre o commit `cf6cd26` da branch de trabalho.

### 1.1 O que existe de fato

O repositório tem **só backend**. Não existe app Android, não existe tela, não existe rota de
produto. A única rota HTTP é `GET /health` (`backend/src/api/app.ts:17`). O app Android está
previsto para a fase 4 (`DECISIONS.md`, decisão 1) e o contrato da API para a fase 3
(`CHECKPOINT.md`, "Próximo passo").

O que existe e que o usuário vai sentir, mesmo sem ver:

| Peça | Onde | O que faz para o usuário |
|---|---|---|
| Motor de curadoria | `backend/src/curadoria/motor.ts` | Decide se uma oferta vira alerta a partir do histórico próprio de preço, nunca do desconto anunciado pela loja. |
| Cobertura | `backend/src/curadoria/cobertura.ts` | Decide se a oferta chega ao CEP do usuário (faixa de CEP, raio de entrega, ou retirada até 5 km sem o deslocamento anular a economia). |
| Triagem de medicamento | `backend/src/normalizador/medicamentos.ts` | Bloqueia remédio com prescrição, controlado e "leve X pague Y" em remédio isento. |
| Deduplicação | `backend/src/avaliador/deduplicacao.ts` | Não avisa duas vezes a mesma promoção; só avisa de novo se cair mais 5% ou se a promoção acabou e voltou. |
| Adaptador Lomadee | `backend/src/fontes/lomadee.ts` | Única fonte, com respostas **sintéticas** (`backend/fixtures/lomadee/*`). Drogasil e Droga Raia previstas, aprovação a confirmar (`SOURCES.md`). |

### 1.2 Mapa de telas implícito

Não há tela, mas o modelo de dados obriga a existência destas superfícies. Cada uma é deduzida de
uma tabela ou coluna:

| Superfície | Evidência no modelo | Observação |
|---|---|---|
| Notificação push | `alerts.decisao = 'notificar'`, `deliveries.canal = 'push'` (`0001_schema_inicial.sql:171,186`) | Tabela de token FCM ainda não existe (`BACKLOG.md`). |
| Entrada (login) | `users.email`, `users.google_sub` (`0001:13-14`) | Método por e-mail não decidido (`BACKLOG.md`, fase 0). |
| Aceite de termos | `users.termos_versao`, `termos_aceitos_em` (`0001:16-17`) | — |
| Consentimento de notificação separado | `users.notificacoes_consentidas_em` (`0001:18`, comentário "separados (LGPD)") | O app precisa pedir e registrar isto à parte. |
| Escolha de categorias | `user_preferences.categorias text[]` (`0001:27`) | 8 categorias em `config/tenants/padrao.json`. |
| CEP | `user_preferences.ceps char(8)[]`, até 3; mais de 1 é premium (`0001:29-30`) | "Só o CEP, nunca endereço." Não pede localização do aparelho. |
| Horário de silêncio | `silencio_inicio`, `silencio_fim` (`0001:31-32`) | — |
| Limite diário de avisos | `limite_diario` (`0001:33`) | Nulo = sem limite. |
| Feed de ofertas | Decisões `notificar`, `aguardar_aprovacao`, `somente_feed` vão ao feed (`tipos.ts:95-100`) | `descartar` não aparece em lugar nenhum. |
| Detalhe da oferta | `offers.link`, `condicao`, `frete_status`, `valida_ate`; `alerts.motivo` (`0001`, `0002`) | Link é de afiliado (`lomadee.ts:85-86`). |
| Assinatura | `subscriptions.plano` mensal/anual, origem `google_play` (`0001:195-197`) | Preço e benefícios do premium não estão escritos em lugar nenhum. |
| Exclusão de conta | Decisão 7 do `DECISIONS.md` (cascata) | Exigência da Play para apps com conta. |

**Beco sem saída previsível:** o detalhe da oferta termina num link externo (`offers.link`). Toda
sessão bem-sucedida sai do app. Não há, no modelo, nada que traga o usuário de volta depois
(nenhum registro de "comprei" nem de "não comprei").

### 1.3 O que o modelo de dados permite e impede mostrar

**Permite:**
- Preço da embalagem (`offers.preco_centavos`) e preço por unidade (`preco_por_unidade_centavos`).
- Preço de referência — mediana dos últimos 30 dias — gravado no alerta
  (`alerts.preco_referencia_por_unidade`, `0002:40`).
- Piso de 180 dias, número de dias observados, queda real e economia em reais: calculados em
  `Metricas` (`tipos.ts:102-112`), mas **não gravados** no alerta — só aparecem dentro do texto
  livre `alerts.motivo`.
- Série de preços diária por produto e loja (`price_history`), o que permite um gráfico de
  histórico real.
- Condição da oferta com rótulo pronto (`preco.ts:38-50`): "Leve 3, pague 2", "Preço com cartão
  fidelidade X", "Preço exclusivo no app da rede", "Preço na compra de N unidades".
- Validade (`valida_ate`) e "entrega a confirmar" (`entrega_a_confirmar`).
- Prazo de entrega por faixa de CEP (`store_service_areas.prazo_dias`).

**Impede ou dificulta:**
- **Imagem de produto:** não existe coluna de imagem em `products` nem campo no contrato
  `OfertaBruta` (`fontes/contrato.ts:7-24`). A Lomadee devolve `thumbnail` (vazio nos fixtures) e o
  adaptador descarta. Hoje a interface não tem foto para mostrar.
- **Nome amigável da loja:** `stores.nome` existe ("Farmácia Teste A (online)" no seed), mas não
  há logotipo nem nome curto.
- **Nome amigável do produto:** `products.nome` é o título cru da fonte ("Protetor Solar Facial FPS
  50 Marca X 50ml"); `marca` pode ser nula (`0002:4`).
- **Nome amigável da categoria:** as chaves são técnicas (`higiene_intima`, `cuidados_pessoais`,
  `medicamentos_isentos`). Não há rótulo de exibição.
- **Oferta encerrada:** oferta que some da coleta não vira indisponível (`BACKLOG.md`, fase 2). O
  feed pode mostrar promoção que acabou.
- **Selo de prova estruturado:** o que prova a promoção (mediana, piso, dias observados) só existe
  em texto livre técnico.

### 1.4 Regras de negócio que o usuário vai sentir

1. **Silêncio por construção.** Para notificar, a oferta precisa de 14 dias com observação
   naquela loja, queda real ≥ 25% sobre a mediana de 30 dias (35% em perecíveis), preço no piso de
   180 dias com tolerância de 5%, nenhuma alta maior que 10% nos 15 dias anteriores, e score ≥ 70
   (`config/tenants/padrao.json`; `motor.ts:48-122`). O usuário vai receber pouco aviso. Isso é o
   produto, mas vai parecer defeito se a interface não explicar.
2. **Partida a frio.** Com fonte nova, nada notifica nos primeiros 14 dias de coleta
   (`minObservacoes: 14`; `DECISIONS.md` 27). Quem instala no primeiro dia de operação não recebe
   nada por duas semanas.
3. **Oferta que não notifica aparece no feed.** Loja em observação ou score entre o mínimo e 70 →
   `somente_feed` (`motor.ts:201-209`). O feed tem, portanto, dois níveis de força: "avisada" e
   "boa, mas não excepcional".
4. **Medicamento nunca notifica** até validação jurídica (`medicamentos.notificar = false`;
   `DECISIONS.md` 28), e a RDC 96/2008 exige advertência ao divulgar preço de isento
   (`BACKLOG.md`).
5. **Condição sempre acompanha o preço.** O rótulo é "campo obrigatório do resultado"
   (`DECISIONS.md` 12; `tipos.ts:124`).
6. **Mesma promoção não é avisada duas vezes** (`DECISIONS.md` 25). Promoção longa aparece uma vez.
7. **Frete e deslocamento podem anular a promoção** (`motor.ts:114-126`; `cobertura.ts:99-107`).
   Quando o frete não é conhecido, a oferta segue com "entrega a confirmar".
8. **CEP define o que chega.** Sem CEP, a cobertura não tem como decidir (`cobertura.ts:66`).
9. **Premium:** mais de um CEP (até 3). É a única regra de premium escrita no código
   (`0001:29`).

### 1.5 Estados possíveis, por superfície (deduzidos)

| Superfície | Estados que o código torna possíveis |
|---|---|
| Notificação | incondicional; condicional; com validade; entrega a confirmar; retirada na loja; sem imagem (sempre, hoje); fora do horário de silêncio (retida); acima do limite diário (retida) |
| Feed | primeiro uso sem CEP; partida a frio (sistema com menos de 14 dias); sem oferta hoje; só `somente_feed`; com avisadas; oferta encerrada; carregando; erro; offline com dados antigos |
| Detalhe | avisada; só no feed; aguardando aprovação; medicamento (sem push, com advertência); condicional; validade próxima; encerrada; entrega a confirmar; retirada a X km |
| Preferências | nenhuma categoria; CEP inválido; CEP fora da região (fora de SP, `DECISIONS.md` 19); segundo CEP em conta gratuita |
| Permissão de notificação | não pedida; concedida; negada; negada permanentemente (Android 13+) |
| Conta | sem conta; gratuita; premium ativa; premium pendente; premium expirada/cancelada (`subscriptions.status`) |

### 1.6 Todo texto de interface existente

Não existe texto de interface escrito para o usuário. Existem textos internos que, se vazarem para
a tela, estão errados para o público:

| Texto | Onde | Problema para interface |
|---|---|---|
| `Leve ${leve}, pague ${pague}` | `preco.ts:42` | Bom. Linguagem de gôndola. |
| `Preço com cartão fidelidade ${programa}` | `preco.ts:44` | Bom; "cartão fidelidade" é termo do varejo. |
| `Preço exclusivo no app da rede` | `preco.ts:46` | "Rede" é jargão; o usuário conhece "app da Drogasil". |
| `Preço na compra de ${n} unidades` | `preco.ts:48` | Bom. |
| `Aprovada para notificação.` / `Somente feed: ...` | `motor.ts:195-214` | Texto de auditoria. Não é para usuário. |
| `Queda real de 32,0% sobre a mediana de referência (R$ 1.598,00/l → ...)` | `motor.ts:229-231` | "Mediana", "R$/l" e "score" são jargão; preço por litro de protetor assusta (`BACKLOG.md`). |
| `deslocamento de 3,2 km custa R$ 5,12 e anula a economia de R$ 4,00` | `cobertura.ts:104` | Ideia boa, linguagem técnica. |
| Nomes de categoria (`cuidados_pessoais` etc.) | `padrao.json` | Chaves, não rótulos. |

### 1.7 Permissões e momento

- **Notificação (`POST_NOTIFICATIONS`, Android 13+):** indispensável. O banco registra o
  consentimento separado do aceite de termos (`0001:18`), então o pedido precisa ser um passo
  próprio. Momento ainda não definido.
- **Localização do aparelho:** não é pedida. O produto trabalha só com CEP digitado (`0001:29`).
  É uma vantagem de privacidade a preservar.
- **Conta Google ou e-mail:** `google_sub` e `email` (`0001:13-14`).

### 1.8 Onde o app fala fora dele

- **Push** (fase 4): o canal principal. Todo alerta `notificar` vira push, respeitando silêncio e
  limite diário.
- **E-mail:** só login, se o método por e-mail for adotado (indefinido).
- **Loja da operadora:** o link de afiliado leva o usuário ao site/app da farmácia.
- **Google Play:** ficha do app e assinatura.

### 1.9 As três perguntas

**Que trabalho o usuário contrata este app para fazer?**
"Me avise quando um produto que eu já compro estiver *de verdade* mais barato, numa loja que
entrega onde eu moro, sem eu ter que ficar olhando preço." A evidência é o próprio README ("notifica
só promoção comprovadamente excepcional, nas categorias escolhidas, de loja confiável e que chega
ao CEP do usuário") e o fato de o motor ignorar o desconto anunciado e usar só o histórico próprio
(`motor.ts:1-2`). O trabalho não é "achar ofertas"; é **filtrar ofertas e poupar vigilância**.

**Qual é o momento exato em que ele decide se o app é útil ou não?**
Os **segundos diante da primeira notificação**, na tela de bloqueio ou na aba de notificações,
antes de tocar. Ali ele decide duas coisas: se o produto é dele (categoria certa) e se o preço é
mesmo bom. Um segundo momento, anterior e mais perigoso, é **a primeira abertura depois da
instalação**: o motor exige 14 dias de histórico e queda ≥ 25%, então é provável que nesse
instante não haja nada a mostrar.

**O que, na construção atual, mais atrapalha esse momento?**
1. **A prova não chega à interface.** O que distingue o app — mediana de 30 dias, piso de 180
   dias, dias observados — só existe como texto técnico em `alerts.motivo`. Sem campo estruturado,
   a notificação vira "mais uma oferta".
2. **O primeiro contato é silencioso.** Partida a frio de 14 dias e limiar alto significam feed
   vazio e nenhum push na primeira semana, sem nada no produto que explique isso.
3. **Faltam os ingredientes de reconhecimento rápido:** sem imagem de produto, sem nome curto de
   loja, com título cru da fonte. Numa notificação, reconhecer o produto em um segundo depende
   exatamente disso.

---

## 2. Pesquisa externa (fase 2)

Todas as fontes foram acessadas em **2026-09-28**, salvo indicação. Números são citados como a
fonte publicou; onde a fonte não informa amostra ou método, isso está dito.

### 2.1 Avaliações de uma e duas estrelas (fonte principal de requisito)

**Método.** Com a biblioteca `google-play-scraper` 10.x, foram lidas as 900 avaliações mais
recentes de cada um de 14 apps na Google Play Brasil (idioma pt, país br), e separadas as de nota
1 ou 2: **3.642 avaliações**. Cada uma foi classificada por expressões regulares por tema (script
reproduzível descrito em `ux/SUPOSICOES.md`, S-20) e cada tema foi conferido lendo amostras. A
classificação por palavra-chave **erra para menos** (uma reclamação escrita de outro jeito não
entra), então os números abaixo são piso, não total. O período varia por app: apps de muita
avaliação cobrem semanas (Drogasil: 19/08 a 27/09/2026); apps de pouca avaliação cobrem anos
(Tiendeo: 2021 a 2026).

| App (pacote) | Nota na loja | Instalações | Aval. ≤2★ na amostra | Período |
|---|---|---|---|---|
| Drogasil (`br.com.drogasil`) | 4,85 | 10 mi+ | 256 de 900 | 08–09/2026 |
| Raia (`br.com.drogaraia`) | 4,84 | 10 mi+ | 287 | 08–09/2026 |
| Pague Menos (`br.com.paguemenos.anjodaguarda`) | 4,78 | 5 mi+ | 225 | 07–09/2026 |
| Drogaria São Paulo (`br.com.app.meuvivasaude.descontos`) | 4,79 | 5 mi+ | 332 | 08–09/2026 |
| Méliuz (`br.com.meliuz`) | 4,70 | 10 mi+ | 150 | 09/2026 |
| Pelando (`com.tippingcanoe.pelando`) | 4,63 | 1 mi+ | 396 | 2023–2026 |
| Promobit (`br.com.promobit.app`) | 4,59 | 1 mi+ | 249 | 2024–2026 |
| Pechinchou (`br.com.pechinchou.pechinchou`) | 4,78 | 1 mi+ | 78 | 2023–2026 |
| Zoom (`com.zoom.zoomandroid`) | 4,62 | 10 mi+ | 342 | 2025–2026 |
| Buscapé (`br.com.buscape.MainPack`) | 4,61 | 10 mi+ | 221 | 2025–2026 |
| Pão de Açúcar Mais (`br.com.paodeacucarmais`) | 4,82 | 5 mi+ | 168 | 2025–2026 |
| Tiendeo (`com.geomobile.tiendeo`) | 4,21 | 10 mi+ | 214 | 2021–2026 |
| Menor Preço Brasil (`br.gov.rs.procergs.mpbr`) | 2,72 | 100 mil+ | 580 | 2020–2026 |
| Cuponomia (`com.cuponomia`) | 4,83 | 1 mi+ | 144 | 2025–2026 |

**Reclamações recorrentes → requisito deste projeto.** Contagem = avaliações ≤2★ que casaram com o
tema (piso). As citações são literais, com app, nota e data; nomes de autor omitidos.

| # | Tema | Contagem | Onde mais aparece | Citação representativa | Requisito derivado |
|---|---|---|---|---|---|
| R1 | Entrar/sair da conta, senha, código | 297 | Menor Preço Brasil 91, Raia 50, Pelando 36, Drogasil 30 | "se ficar sem acessar tem que fazer o login novamente e quando coloca a senha e usuário fica só carregando nunca entra" (Drogasil, 1★, 25/09/2026) | **Nada de conta para ver oferta.** Feed e detalhe funcionam sem login; conta só para sincronizar preferências e assinar. Sessão não expira sozinha. |
| R2 | Lento, trava, não carrega | 256 | Pelando 40, Promobit 40, Drogasil 40 | "Aplicativo tá cheio de propaganda e deixa ele muito lento" (Drogasil, 1★, 03/09/2026) | Orçamento de peso por tela; esqueleto em vez de tela branca; conteúdo baixado fica disponível sem rede. |
| R3 | Anúncio intrusivo | 148 | Promobit 29, Pelando 26, Zoom 21, Tiendeo 20 | "introduziram notificações pagas de propaganda no app que não podem ser desabilitadas" (Pelando, 1★, 27/01/2026) | **Nenhuma publicidade em notificação, nunca.** Anúncio só no feed, rotulado, com forma visual própria, nunca entre as duas primeiras posições. |
| R4 | Não entrega na minha região | 78 | Drogaria São Paulo 24, Menor Preço 17 | "Fiz todo o processo de criar conta, cadastrar cartão e endereço, para colocar o item no carrinho e só então descobrir que não entregam no meu endereço" (Drogaria São Paulo, 1★, 19/08/2026) | **Cobertura antes do clique**: toda oferta mostra "Entrega no seu CEP" ou "Retirada a X km" já no card e na notificação. |
| R5 | Excesso de notificação | 47 | Zoom 21, Buscapé 10, Pelando 8 | "Mesmo desabilitando todas as notificacoes e deixando apenas o alerta de preço, eh uma notificação de promocao a cada 5minutos" (Zoom, 1★, 04/07/2026) | **Um só tipo de notificação** (oferta excepcional) + limite diário visível e ajustável; nenhuma notificação de marketing, lembrete ou "sentimos sua falta". |
| R6 | Promoção falsa ou preço diferente | 31 | Promobit 9, Pelando 6, Zoom 6 | "de cada 10, umas 8 são promoções FALSAS para gerar cliques" (Promobit, 1★, 02/04/2026) | **Prova visível** em toda oferta: preço normal da loja nos últimos 30 dias e menor preço em 6 meses. |
| R7 | Notificação atrasada ou que não abre | 24 | Pelando 10, Zoom 8 | "o App só envia as notificações umas 6h depois, aí fica fácil perder" (Promobit, 1★, 01/07/2026) | Notificação mostra **"verificado às HH:MM"**; tocar abre direto o detalhe, mesmo com o app fechado; se a oferta já acabou, o detalhe diz isso logo no topo. |
| R8 | Oferta já encerrada ainda listada | 10 | Pechinchou, Promobit | "as promoções já acabou e não sai da grade fica lá tem promoção que já tem 3,4,6,10 meses que já acabou e continua lá" (Pechinchou, 1★, 16/05/2024) | Oferta encerrada sai do feed; no histórico pessoal fica marcada "Encerrada" com data. Depende do BACKLOG "oferta que some". |
| R9 | Indisponível só no fim | 19 | Pague Menos 5, DSP 4 | "Permite que coloque produto no carrinho para so no final dizer que esta indisponível" (Pague Menos, 1★, 08/08/2026) | "Verificado às HH:MM" e aviso de que o estoque é confirmado na loja. |
| R10 | Condição escondida (kit, leve-pague) | 4 (piso) | DSP, Pague Menos | "comprei um e ganhe outro fui retirar a atendente falou que não tinha outro que eu tinha que ter colocado no carrinho" (DSP, 1★, 08/09/2026) | Condição em faixa própria **acima do preço**, com o preço que se paga de fato ("Levando 3: R$ 53,80"). |
| R11 | Irrelevante / "nada a ver" | 16 | Zoom 5, Promobit 4 | "o app fica disparando trocentas notificações com propagandas nada a ver por dia. Resultado: notificações desativa[das]" (Zoom, 1★, 19/03/2026) | Notifica só nas categorias escolhidas; cada notificação diz **por que chegou** ("Você segue Proteção solar"). |
| R12 | Pedido de localização em laço | 41 (inclui outros usos) | Tiendeo 20, Menor Preço 11, Drogasil 4 | "Toda hora aparece na tela pedido de localização mesmo tendo concedido" (Raia, 1★, 25/09/2026) | **Não pedir localização do aparelho.** CEP digitado basta (o produto já foi desenhado assim, `0001:29`). |
| R13 | Histórico de preço escondido atrás de cashback | — (qualitativo) | Buscapé | "até chegar no histórico vc já vai ter lido 'cupom e Cashback' mais de duzentas vezes" (Buscapé, 1★, 01/09/2026) | Histórico de preço na **primeira dobra** do detalhe, não numa aba. |
| R14 | Exclusão de conta difícil | — (qualitativo) | Drogasil | "fui excluir a conta antes de desinstalar o app e simplesmente é necessário preencher um formulário para tal, incluindo anexar RG" (Drogasil, 1★, 06/09/2026) | Excluir conta em dois toques dentro do app, sem documento. |

### 2.2 Apps análogos

| App | Como resolve o mesmo problema | Convenção que usa | Faz bem | Faz mal (evidência) |
|---|---|---|---|---|
| **Drogasil / Raia** (varejo farma) | Ofertas da própria rede, "Suas ofertas" personalizadas | Preço "de/por", selo de %, "Leve+ Pague−" | Marca conhecida gera confiança; retirada na loja | Desconto anunciado sem prova; "ofertas relâmpago" que não mudam o preço ("aparece o banner de oferta relâmpago e o preço continua exatamente o mesmo", Drogasil, 1★, 02/09/2026); anúncio fora do app |
| **Pague Menos / DSP** | Idem | Idem | Cobertura nacional | Indisponível só no fim; kit que falta item; entrega não confirmada antes (R4, R9, R10) |
| **Pelando / Promobit / Pechinchou** (comunidade) | Usuários postam ofertas; voto "esquentar/esfriar" (Pelando) | Feed cronológico, temperatura em graus, comentários | Prova social rápida | Oferta falsa ou velha, notificação atrasada, anúncio pago em push (R3, R6, R7, R8). A prova é opinião, não dado. |
| **Zoom / Buscapé** (comparador + cashback) | Compara preço entre lojas; histórico de preço; alerta de preço (descrição na Play) | Lista de lojas ordenada por preço; gráfico de histórico | Histórico existe | Histórico enterrado atrás de cashback (R13); spam de push mesmo com tudo desligado (R5) |
| **Méliuz / Cuponomia** (cashback) | Devolve % da compra | Saldo, cupons | Ganho concreto em reais | Condições do cashback pouco claras; saldo que "some" (Méliuz, 1★, 27/09/2026) |
| **Tiendeo** (encartes) | Folheto digital da loja perto | Grade de folhetos | Hábito do folheto já existe | Anúncio a cada clique; pede localização |
| **Menor Preço Brasil** (governo RS, nota fiscal) | Preço real das notas fiscais emitidas | Busca por produto e raio | Dado real, não anunciado | Nota 2,72: login gov.br, busca ruim (91 avaliações de login) |
| **Keepa** (EUA, Amazon) | Histórico de preço de 6 bi de produtos; alerta por preço desejado | Gráfico de linha com menor preço histórico | "See through fake discounts… find the lowest historical price in seconds" (descrição na Play) | Gráfico denso, feito para vendedor; nota 4,21 |
| **Google Shopping — price insights** | Classifica preço como baixo, típico ou alto; faixa típica com a oferta posicionada nela | Barra "típico" com marcador | Julgamento pronto em uma palavra + faixa | Não prevê preço futuro (o próprio Google avisa) — [Google Help](https://support.google.com/faqs/answer/10675605), [blog Google](https://blog.google/products-and-platforms/products/shopping/save-money-price-insights-price-alerts/) |
| **GoodRx** (EUA, farmácia) | Preço do mesmo remédio em várias farmácias | Lista de farmácias com preço | Preço por farmácia, sem ruído | Foco em receita; não aplicável ao Brasil |
| **Flipp** (EUA, encartes) | Encartes de várias lojas, lista de compras | Lista + encarte | Integra lista de compras | Não prova se o preço é bom |

**Leitura.** Nenhum análogo brasileiro mostra, na notificação ou no card, a prova de que o desconto é
real. Os que têm histórico (Zoom, Buscapé) o escondem. O padrão mais próximo do diferencial deste
app é a **faixa de preço típico do Google Shopping** e o **menor preço histórico do Keepa** — os
dois fora do Brasil e fora da farmácia. Essa é a lacuna.

### 2.3 Diretrizes de plataforma (restrições de projeto)

| Diretriz | O que diz | Consequência no projeto |
|---|---|---|
| Android — design de notificação ([developer.android.com](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications)) | Título "doesn't exceed 30 characters"; texto "avoids exceeding the 40-character limit"; até 3 ações; ícone pequeno monocromático; não usar notificação para "cross-promotion or advertisement", "encouragement with no direct value", pedido de avaliação | Título ≤ 30 caracteres com o **preço**; texto ≤ 40 com a **prova**; 2 ações no máximo; nada de notificação de marketing. |
| Android — permissão de notificação ([developer.android.com](https://developer.android.com/develop/ui/compose/notifications/notification-permission)) | Desde Android 13 as notificações começam desligadas; pedir "in the correct context, so that it's explicitly clear what the notifications are used for"; bom momento é uma ação do usuário | Pedido de permissão **depois** da escolha de categoria e CEP, disparado pelo botão "Quero receber avisos", com exemplo de notificação na tela. |
| Android — canais | Toda notificação tem canal (API 26+) | Dois canais: "Ofertas excepcionais" (alta) e "Resumo e avisos do app" (baixa). O usuário pode silenciar um sem perder o outro. |
| Google Play — Anúncios ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/9857753)) | "Ads must not simulate or impersonate the user interface of any app feature, such as notifications"; "It must be clear to the user which app is serving each ad" | Anúncio nunca usa a forma do card de oferta nem o selo de prova. |
| Google Play — Comportamento enganoso ([Play](https://play.google.com/about/privacy-security-deception/deceptive-behavior/dishonest-behavior/)) | Metadados e funcionalidade precisam ser exatos | A ficha da loja e o app não podem prometer "todas as promoções"; prometem "só as excepcionais". |
| CDC art. 36 | "A publicidade deve ser veiculada de tal forma que o consumidor, fácil e imediatamente, a identifique como tal" | Rótulo "Anúncio" legível, e declaração de **link de afiliado** no detalhe ("O economae pode ganhar uma comissão se você comprar por este link. Isso não muda o preço nem a escolha das ofertas."). Guia do CONAR para influenciadores reforça a identificação "de plano" ([resumo Baptista Luz](https://baptistaluz.com.br/conar-publicidade-influenciadores-digitais/)). |
| RDC 96/2008 (Anvisa) | Lista de preço de medicamento é permitida com nome, substância, apresentação, registro, titular e preço; propaganda de isento exige a frase "SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO."; vedado "compre 3 pague 2" ([resumo M2Farma](https://m2farma.com/blog/propaganda-medicamentos-rdc-96-2008/)) | Medicamento aparece em **formato de lista de preço**, sem destaque promocional, sem push, com a advertência. O STJ (REsp 2.035.645, 1ª Turma, ago/2024) considerou ilegais pontos da RDC que excedem a Lei 9.294/96 ([STJ](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2024/03092024-STJ-Noticias-Anvisa-extrapolou-sua-competencia-ao-criar-regras-sobre-propaganda-de-remedios.aspx)); a decisão vale para o caso julgado, então o projeto segue a regra mais restritiva até parecer jurídico (`BACKLOG.md`). Não consegui ler o texto integral da RDC (BVS devolveu 503). |
| Assinatura na Play | Não li a política de assinaturas nesta pesquisa | Registrado como suposição S-14; a tela de assinatura segue o mínimo: preço, período, renovação e como cancelar, antes do botão. |

### 2.4 Acessibilidade

| Norma | Requisito | Fonte |
|---|---|---|
| WCAG 2.2 AA | É a Recomendação W3C vigente; WCAG 3 continua rascunho (atualizado em set/2026) | [W3C WAI](https://www.w3.org/WAI/news/2026-09-10/wcag3/) |
| Contraste | 4,5:1 texto pequeno (< 18sp, ou < 14sp negrito); 3:1 texto grande e componentes | [Android Developers — acessibilidade](https://developer.android.com/guide/topics/ui/accessibility/apps) |
| Alvo de toque | Mínimo 48 × 48 dp | idem |
| Rótulo | `contentDescription` descreve propósito, não aparência; único em listas | idem |
| Fonte ampliada | Android 14+ escala até 200%, não linear; usar sp também em altura de linha e testar em 200% | [Android 14 features](https://developer.android.com/about/versions/14/features) |
| Legislação brasileira | Lei Brasileira de Inclusão (13.146/2015) obriga acessibilidade em sítios de empresas; não verifiquei nesta pesquisa se alcança apps | Registrado como S-15 |

### 2.5 Público brasileiro

| Tema | Dado | Fonte |
|---|---|---|
| Fabricante do aparelho (tráfego web móvel, ago/2026) | Samsung 29,4%; Apple 24,5%; Motorola 20,9%; Xiaomi 12,9% | [StatCounter](https://gs.statcounter.com/vendor-market-share/mobile/brazil) |
| Versão do Android (ago/2026) | 16: 25,2%; 15: 22,6%; 13: 15,5%; 14: 14,2%; 12: 7,8%; 11: 6,2% → ~77% em Android 13+, onde a permissão de notificação é pedida em tempo de execução | [StatCounter](https://gs.statcounter.com/android-version-market-share/mobile/brazil) |
| Tela (ago/2026, inclui iPhone) | 414×896 11,6%; 412×915 7,4%; 384×832 7,3%; 393×873 6,3%; 390×844 6,2% | [StatCounter](https://gs.statcounter.com/screen-resolution-stats/mobile/brazil) |
| Acesso só pelo celular | 65% da população usuária; 87% na classe DE; 5% na classe A (TIC Domicílios 2025, campo mar–ago/2025) | [Mobile Time, 09/12/2025](https://www.mobiletime.com.br/noticias/09/12/2025/tic-domicilios-2025/) |
| Franquia de dados | 39% dos que têm celular esgotaram o pacote ao menos uma vez em 3 meses; 68% entre pré-pagos | idem |
| Conexão | Relatório Opensignal jan/2026 avalia Claro, TIM e Vivo (out–dez/2025); não extraí velocidade média confiável da página | [Opensignal](https://insights.opensignal.com/reports/2026/01/brazil/mobile-network-experience) |
| Letramento | Analfabetismo funcional de 29% (15–64 anos) e 36% no nível elementar (Inaf 2024) | [UNICEF Brasil](https://www.unicef.org/brazil/comunicados-de-imprensa/analfabetismo-funcional-nao-apresenta-melhora-e-alcanca-29-por-cento-dos-brasileiros-mesmo-patamar-de-2018-aponta-novo-levantamento-do-inaf) |
| Sensibilidade a preço | Promoção = 17% das compras no 1º tri/2025 (+4,8 p.p.); na classe AB, participação de promoção na cesta foi de 14% para 23% no 2º tri/2025. A página não nomeia o painel | [Kantar](https://www.kantar.com/brazil/inspiration/consumo/2025/consumo-massivo-promocoes-ecommerce) |
| Desconfiança de promoção | 27% dizem já ter sido enganados por "metade do dobro"; 48% monitoravam preços antes da Black Friday 2025. Sem amostra divulgada | [Reclame AQUI](https://blog.reclameaqui.com.br/descubra-se-o-desconto-e-real-na-black-friday/) |
| Inflação pré-promoção | Nas 8 semanas antes da Black Friday 2025: produtos para bebê +147,94%; beleza e perfumaria +27,28% (BigDataCorp, 27,6 mi de produtos) | [InfoMoney, 28/11/2025](https://www.infomoney.com.br/consumo/tudo-pela-metade-do-dobro-veja-as-categorias-que-mais-aumentaram-precos-antes-da-black-friday/) |
| Aparelho mais vendido | Não encontrei ranking de vendas do Brasil com fonte primária confiável; o Galaxy A16 5G foi o Android mais vendido no mundo em 2025 segundo a Counterpoint ([Exame](https://exame.com/tecnologia/apple-lidera-ranking-de-celulares-mais-vendidos-em-2025-aponta-counterpoint/)) | — |

**Aparelho de referência adotado:** Android de entrada da linha Samsung Galaxy A (A0x/A1x), tela
de ~360–384 dp de largura por ~800 dp de altura, 4 GB de RAM, Android 14, rede 4G com franquia
pré-paga. Justificativa e confiança em SUPOSICOES.md (S-01). O protótipo usa o quadro de 390 × 844
pedido; a implementação é validada também em 360 × 800.

### 2.6 Padrões de preço no varejo e onde enganam

| Padrão | Uso comum | Onde engana | Regra de referência | Decisão |
|---|---|---|---|---|
| "De R$ X por R$ Y" | Farmácia e e-commerce | O "de" é escolhido pela loja; pode ter sido inflado ("metade do dobro") | UE, Diretiva Omnibus art. 6a: o preço anterior anunciado deve ser o **menor** dos 30 dias anteriores ([EUR-Lex, guia da Comissão](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=oj:JOC_2021_526_R_0002)) | O app **nunca mostra o "de" da loja**. Mostra "preço normal nesta loja" = mediana dos 30 dias medida pelo próprio app, e o menor preço de 6 meses. |
| Selo "−40%" | Todos | Percentual sobre base inflada; percentual grande sobre valor pequeno | — | Percentual só como apoio; **economia em reais** tem peso próprio. |
| Preço por unidade (R$/kg, R$/l) | Supermercado, por exigência legal | Unidade que não conversa com o produto (R$ 1.598,00/l de protetor, `BACKLOG.md`) | Decreto 5.903/2006: preço com "correção, clareza, precisão, ostensividade e legibilidade" ([Planalto](http://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/decreto/d5903.htm)) | Preço por unidade aparece **na escala do produto** (R$ por 100 ml, por 100 g, por unidade de fralda), nunca por litro de protetor. |
| Leve 3 pague 2 | Farmácia e mercado | O preço destacado é o de uma unidade; a economia exige comprar 3 | — | Mostrar o **total a pagar na compra mínima** e o preço efetivo por unidade. |
| Preço com cartão/app da loja | Farmácia (programa de fidelidade) | Preço condicionado aparece como preço do produto | — | Condição acima do preço, com ícone e texto; nunca só cor. |
| Frete escondido | E-commerce | Economia some no frete | — | Motor já recusa quando o frete anula a economia; a interface diz "Frete a confirmar" quando não sabe. |

---

## 3. Público (fase 3)

Três perfis. Cada afirmação traz a evidência entre colchetes: `[código]` = repositório;
`[R#]` = tema de avaliação da seção 2.1; `[P: …]` = dado público da seção 2.5; `[S-#]` = suposição
registrada, com confiança, em SUPOSICOES.md.

### Perfil A — Quem abastece a casa (compra recorrente de bebê, higiene e cuidado)

- **Contexto e momento de uso.** Compra fralda, higiene do bebê, protetor e itens de cuidado todo
  mês, sempre as mesmas marcas [`padrao.json`: categorias `higiene_bebe`, `cuidados_pessoais`;
  mapa Lomadee "Fraldas", "Higiene do Bebê"]. Vê a notificação em intervalos curtos do dia, na tela
  de bloqueio, e decide ali se abre [S-03, média].
- **Aparelho e conexão.** Android de entrada da linha Galaxy A ou Moto G, 4G pré-pago ou
  controle, pacote que acaba antes do fim do mês [P: StatCounter; P: TIC 2025, 39% / 68%] [S-01].
- **Familiaridade digital.** Usa app de farmácia e de cashback; não compara preço em planilha
  [S-04, média].
- **Quer.** Pagar menos no que já compra, sem gastar tempo pesquisando [P: Kantar, promoção em
  alta na cesta].
- **Teme.** Desconto de mentira — produtos para bebê tiveram a maior alta antes da Black Friday
  2025 (+147,94%) [P: BigDataCorp]; promoção de kit em que falta item [R10]; descobrir no fim que
  não entrega no CEP [R4].
- **Confia quando.** Vê quanto custava nas últimas semanas e quanto economiza em reais; a condição
  está escrita antes [R6, R10].
- **Desinstala no primeiro dia se.** Recebe aviso de categoria que não escolheu [R11]; recebe
  vários avisos no mesmo dia [R5]; é obrigado a criar conta para ver alguma coisa [R1].

### Perfil B — Quem caça promoção (usuário de comunidade e comparador)

- **Contexto e momento de uso.** Já usa Pelando, Promobit ou Zoom com alerta configurado; abre o
  app a partir da notificação e compra rápido [R7: reclama de notificação atrasada, logo usa a
  notificação como gatilho].
- **Aparelho e conexão.** Android intermediário ou superior, Wi-Fi em casa [S-05, baixa].
- **Familiaridade digital.** Alta: sabe ler gráfico de histórico, conhece "metade do dobro"
  [P: Reclame AQUI, 48% monitoravam preço antes da Black Friday].
- **Quer.** Saber se o preço é o menor dos últimos meses, em segundos, sem atravessar cupom e
  cashback [R13].
- **Teme.** Oferta velha ou falsa na lista [R6, R8]; notificação que chega horas depois [R7];
  propaganda disfarçada de oferta [R3].
- **Confia quando.** Vê dado verificável: menor preço do período, dias observados, hora da última
  verificação [Keepa, Google Shopping, seção 2.2].
- **Desinstala no primeiro dia se.** Vê anúncio pago em notificação [R3]; percebe que o app só
  replica o "de/por" da loja [seção 2.2]; o feed vem vazio sem explicação [`DOSSIE` 1.4, regra 2].

### Perfil C — Quem compra na farmácia e tem menos intimidade com app

- **Contexto e momento de uso.** Compra dermocosmético, protetor e remédio isento de prescrição
  na farmácia do bairro ou pelo app da rede [`padrao.json`: `medicamentos_isentos`,
  `cuidados_pessoais`]. Abre o app com calma, em casa [S-06, média].
- **Aparelho e conexão.** Android de entrada, às vezes herdado de alguém da família, fonte do
  sistema ampliada [S-07, média] [P: Android 14 permite 200%].
- **Familiaridade digital.** Baixa a média; lê devagar textos longos. Um em cada três brasileiros
  de 15 a 64 anos é analfabeto funcional e 36% estão no nível elementar [P: Inaf 2024].
- **Quer.** Um aviso simples: qual produto, quanto custa, onde comprar.
- **Teme.** Golpe e pedido de dado pessoal ("Se eu fosse vocês, não faria login do seu .gov nesse
  app duvidoso", Menor Preço Brasil, 1★, 20/10/2022); dificuldade para sair do app ou apagar a
  conta [R14]; pedido de localização insistente [R12].
- **Confia quando.** Reconhece a farmácia pelo nome; o app não pede nada além do CEP [`0001:29`].
- **Desinstala no primeiro dia se.** Letra pequena ou botão pequeno; termo técnico que não entende
  ("score", "mediana", "R$/l") [`motor.ts:229-234`]; cadastro obrigatório [R1].

### 3.4 Expectativa central

> **"Se o economae me avisar, é porque vale a pena — e eu consigo ver isso em um segundo."**

**Se for frustrada.** O único canal que traz o usuário de volta é a notificação
[`deliveries.canal = 'push'`]. O primeiro aviso irrelevante, falso ou vencido quebra a promessa
central; a reação documentada é desligar as notificações ("Resultado: notificações desativa[das]",
Zoom, 1★, 19/03/2026 [R11]). Com as notificações desligadas, o economae vira um feed que o usuário
não tem motivo para abrir, porque por construção ele mostra pouco [DOSSIE 1.4, regra 1]. O caminho
é: **um aviso ruim → notificação desligada → app esquecido → desinstalado**. Não existe segunda
chance barata: no Android 13+ o usuário pode negar a permissão e o app não consegue pedir de novo
sem levar a pessoa às configurações.

**Critério de decisão do projeto:** toda escolha de interface é julgada por uma pergunta —
*isso ajuda a pessoa a ver, em um segundo, que o aviso vale a pena, ou ajuda o app a só avisar
quando vale?* Se não ajuda em nenhuma das duas, sai.
