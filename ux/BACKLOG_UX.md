# Backlog de UX — o que ficou de fora e por quê

Data: 2026-09-28. Cada item diz por que não entrou agora, de que depende e em que fase cabe
(fases do `CHECKPOINT.md`). Os itens B-01 a B-11 são **dependências de dado**: a interface já está
desenhada e implementada com dados de exemplo, e só funciona de verdade quando o dado existir
(PROPOSTA_UX seção 11).

## Dependências de dado (a interface espera por elas)

| # | Item | Por que ficou de fora | Depende de | Fase |
|---|---|---|---|---|
| B-01 | **Usuário sem conta.** Permitir `users.email` nulo e marcar conta anônima do aparelho; e-mail/Google só para sincronizar e assinar. | Mudança de esquema e de autenticação; a demanda desta fase era interface. | Decisão do método de login (`BACKLOG.md`, fase 0) | 3 |
| B-02 | **Campos da prova no alerta e na API:** piso do período, dias medidos, economia na compra mínima, queda, mín./máx. do período e série diária de 90 dias. Hoje só a mediana é gravada (`0002`); o resto vive no texto `alerts.motivo`. | É contrato de API, que precisa de aprovação antes das telas (`CHECKPOINT.md`). | Contrato OpenAPI da fase 3 | 3 |
| B-03 | **Nome de exibição da loja e imagem do produto.** Coluna `stores.nome_exibicao`; campo de imagem em `OfertaBruta` (a Lomadee tem `thumbnail`); cache e WebP ≤ 12 KB. | O adaptador descarta a imagem hoje; guardar imagem de terceiro pede ler os termos da fonte. | Vinculação real da Lomadee; termos em `SOURCES.md` | 2–3 |
| B-04 | **Oferta encerrada:** marcar indisponível quando some da coleta; guardar quando acabou e o preço depois do aviso. | Já estava no `BACKLOG.md` (fase 2); a interface de "Encerrada" e "O preço mudou" está pronta. | Coletor agendado | 2–3 |
| B-05 | **Nome curto do produto:** marca + nome sem embalagem (o normalizador já tem `removerEmbalagem`), com revisão manual para os mais avisados. | Título cru da fonte é longo e mistura embalagem; afeta o limite de 30 caracteres. | Normalizador | 3 |
| B-06 | **Remédio sem receita:** campos de substância, registro na Anvisa e titular para o formato de lista de preço; parecer jurídico sobre mostrar "preço normal" e selo em remédio. | Sem parecer, a proposta usa o formato mais restritivo (lista de preço + advertência, sem prova). | Parecer jurídico (`BACKLOG.md`) | 5 |
| B-07 | **Retorno "O preço bateu?"**: tabela de respostas e uso na reputação da loja. | A pergunta está desenhada; guardar e usar a resposta é backend. | B-01 | 4 |
| B-08 | **Preço sem condição** para oferta "só com cartão", para mostrar os dois. | A fonte não informa o preço sem cartão; inventar seria pior que omitir. | Fonte que forneça os dois preços | 5 |
| B-09 | **Resumo do dia e dias de coleta por região** persistidos (`ResumoColeta` hoje só existe em memória). | Sem isso, os estados "Nada passou no teste hoje" e "Começando a medir" não têm números. | Pipeline | 3 |
| B-10 | **Cobertura por usuário servida pela API** (modo, prazo, distância), para a linha "Entrega no seu CEP em até 3 dias". | `verificarCobertura` existe, mas não é chamado por usuário. | CEP → coordenada (P3) | 5 |
| B-11 | **Silêncio e limite diário aplicados no despachante**, com fila das 8h ordenada pelos mais fortes. | A interface promete; quem cumpre é o servidor. | Despachante e FCM | 4 |

## Funcionalidade adiada

| # | Item | Por que ficou de fora | Reavaliar quando |
|---|---|---|---|
| B-12 | **Seguir um produto específico** (busca e alerta por item). | Contradiz a curadoria por categoria e abre "por que X não está aqui?"; é o pedido mais comum em Pelando/Zoom, mas também a origem de spam lá (DOSSIE 2.1, R5, R11). | M2 estável ≥ 85% e pedidos recorrentes em avaliação do próprio app |
| B-13 | **Anúncios** com as regras da DECISIONS 75: rede de anúncio com bloqueio de fórmula, mamadeira, bico, chupeta e remédio e sem personalização por gestação. | Decidido em 01/10; falta escolher a rede e ler os termos. | Decisão da rede |
| B-14 | **Assinatura "Tirar os anúncios"** com Google Play Billing e preço vindo da loja (DECISIONS 75). A folha está desenhada com o preço como variável. | Preço não definido. | Fase 6 |
| B-15 | ~~Seletor de CEP para premium~~: feito no protótipo 2.1 e vale para todos (DECISIONS 73). | — | — |
| B-16 | **Editar horário de silêncio** com seletor de hora. Hoje aparece como informação (21h–8h). | Escolha de padrão é mais importante que a edição; S-17 ainda é suposição. | Resultado do teste T3 |
| B-17 | **"Não sei meu CEP" dentro do app.** Hoje abre a busca dos Correios no navegador. | Busca por endereço exigiria base de logradouros (custo, `DECISIONS.md` 21). | Nunca, salvo base gratuita com termos compatíveis |
| B-18 | **Exclusão de conta também pela web** (a Play exige um caminho fora do app para apps com conta). | Não há site. | Antes da publicação |
| B-19 | **Termos de uso e privacidade** (textos). | Texto jurídico, não de UX. | Antes da publicação |
| B-20 | **Ícone do app e identidade visual da marca.** O app usa o ícone padrão do sistema e a cor de marca é provisória. | Nome ainda provisório (`DECISIONS.md` 18). | Nome definitivo |
| B-21 | **Compartilhar como imagem** (cartão com a régua). Hoje compartilha texto e link. | Ganho incerto; custo de gerar imagem em aparelho de entrada. | Se compartilhamento aparecer nas métricas |
| B-22 | **iOS.** | O produto é Android (`DECISIONS.md` 1; `README.md`). | — |

## Qualidade e verificação

| # | Item | Por que ficou de fora |
|---|---|---|
| B-23 | Testes de interface instrumentados (Compose UI Test) e verificação automática de acessibilidade (ATF) no CI. | Exigem emulador; nesta sessão a verificação foi por captura Paparazzi (51 imagens: claro, escuro, 200%) e testes JVM. |
| B-24 | Teste com TalkBack em aparelho real, lendo "R$" com espaço não separável e a descrição completa do cartão. | Sem aparelho nesta sessão (S-30). |
| B-25 | Teste de usabilidade T1 com pessoas dos três perfis. | Depende de recrutamento; é o primeiro teste recomendado (MEDICAO.md). |
| B-26 | Conferir a curva de escala de fonte do protótipo contra um aparelho Android 14+ (S-29). | Só afeta o protótipo. |
| B-27 | Capturas Paparazzi em aparelho menor (320 dp) e em tablet. | Aparelho de referência escolhido pela pesquisa (S-01); telas menores são raras no dado da StatCounter. |
| B-28 | Integrar `node ux/design-tokens/gerar.mjs` ao build do Android (hoje é passo manual antes de compilar). | Evitar Node como dependência do Gradle nesta fase. |

## Versão 2 (2026-09-30), depois das fases 3 e 4

| # | Item | Por que ficou de fora | Depende de |
|---|---|---|---|
| B-29 | **Notificação de gestação escondida com o celular bloqueado** (`VISIBILITY_PRIVATE` + versão pública) no app da fase 4. | Proposta nova (PROPOSTA 14, N9); o app real está em outra branch. | Canal ou categoria no payload do push |
| B-30 | **Cópia offline do feed** com a hora visível. A fase 4 decidiu não guardar feed no aparelho (DECISIONS 61, "preço que muda engana"); a proposta mantém a cópia com "Mostrando as ofertas das HH:MM". | Decisão do responsável. | — |
| B-31 | **Rota para listar os avisos recebidos** (entregas do usuário), para a tela Avisos. | Não existe no contrato 1.2.0. | Acréscimo no contrato |
| B-32 | **Texto do push igual ao da proposta:** preço no título (≤ 30), prova no texto (≤ 40), "preço normal" em vez de "referência", economia em reais. Hoje o título é o nome do produto. | Implementação da fase 4 (`backend/src/push/regras.ts`). | Nenhuma; é mudança de texto no despachante |
| B-33 | **Portar componentes deste `android/` para o app real** (`br.com.economae`): Régua de preço, selo de prova, faixa de condição, chip de economia, estados de silêncio. | O módulo `android/` desta branch foi escrito antes da fase 4 e usa dados de exemplo; o app real está na outra branch. | Decisão de qual base seguir |

B-01 (usuário sem conta) sai do backlog: superado pelas DECISIONS 34 e 38. B-06 (remédio) sai: remédio foi tirado do app (DECISIONS 45).

## Estado em 2026-09-30 (depois do merge das fases 3 e 4)

| # | Estado |
|---|---|
| B-02 | **Feito:** `prova` no contrato 1.3.0 (DECISIONS 68). Nome curto do produto (B-05) continua pendente. |
| B-29 | **Feito:** `app.push.categoriasPrivadas` e versão pública da notificação (DECISIONS 71). Depende da configuração de tela bloqueada do aparelho. |
| B-32 | **Feito:** texto do push da proposta (DECISIONS 69) e push só de dados (DECISIONS 70). |
| B-33 | **Feito em parte:** faixa de condição, chip de economia, preço normal sem risco, selo, régua, prova e aviso legal no app real. Faltam: estados "Nada passou no teste hoje" com os números do dia (B-09), "Começando a medir", tela Avisos (B-31), barra inferior com três destinos. |
| B-34 | **Novo:** ícone do app e da notificação ainda são do sistema (`star_on`). |
| B-35 | **Novo:** o app não tem teste de captura em fonte a 200% nem em tema escuro; a jornada roda só no claro, a 100%. |
| B-36 | **Novo: frete por faixa de CEP.** Guardar frete (status, valor) por faixa de CEP da loja, ao lado do prazo (`store_service_areas`); servir no item do feed para o `?cep=` consultado; aplicar FRETE_ANULA_ECONOMIA por CEP; no app, bloco de frete no detalhe e chip de CEP no feed (protótipo 2.1, PROPOSTA 16). Depende de fonte que informe frete por CEP (S-33); até lá vale "Frete a confirmar na loja". |

## Versão 2.2 (2026-10-01): listas, sem premium, anúncio leve

| # | Item | Depende de |
|---|---|---|
| B-37 | **Listas no backend:** tabelas de lista e item (tipo, nome, data, recado, itens com oferta do catálogo, link ou texto livre, quantidade, presenteados com nome opcional), rotas da dona e rota pública do convidado por código do link; apagar junto com a conta. Item do catálogo entra no alerta (N10), no mesmo limite diário. | Acréscimo de contrato |
| B-38 | **Página do convidado na web**, sem conta, leve (aparelho de entrada, 4G pré-pago), fora dos buscadores (`noindex`), com o link de afiliado de cada item. | B-18 (não há site) |
| B-39 | **Alvo de compartilhamento do Android:** receber o link compartilhado do app ou do navegador da loja e abrir "Adicionar item". | B-37 |
| B-40 | **Leitura do link:** nome e foto pelo Open Graph; preço só quando a página informa; respeitar os termos de cada loja e nunca guardar foto de terceiro sem permissão (mesma regra de B-03). | Termos das lojas |
| B-41 | **Comissão nas listas:** gerar o link de afiliado também para link colado, quando a loja estiver na rede (deeplink da Lomadee). | Vinculação da Lomadee |
| B-42 | **Tirar o premium do backend e do app:** `planos.gratuito.maxCeps` = 3 em `economae.json`, o plano `premium` deixa de ser oferecido, `subscriptions` passa a significar "sem anúncios"; a tela Conta do app perde o texto de premium (`ui/conta/Conta.kt`). | DECISIONS 73 |
| B-43 | **Editar a lista:** mudar quantidade, recado e data; encerrar a lista; ver presenteados por pessoa. O protótipo só adiciona e remove item. | B-37 |
