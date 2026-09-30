# Checkpoint

## Resultado do Cowork pós-Fase 4 (2026-09-30)

- **Chave de API do app Android** restrita a `br.com.economae.debug` + SHA-1 de debug, com as
  restrições de API como o Firebase criou.
- **API do FCM (V1)** ativa; a legada, desativada.
- **App de release `br.com.economae`** registrado no Firebase. Tomei isso como a confirmação do
  `applicationId` (decisão 62). O `google-services.json` novo, com os dois apps, ficou no computador
  do responsável; o deste ambiente continua só com o debug, o que basta para o critério da fase.
- **Chave da conta de serviço do FCM** criada, fora do git. Para isso o responsável desligou no
  projeto a política `iam.disableServiceAccountKeyCreation`.

**Recomendação sobre a política:** religar a política no projeto já. Ela só impede criar chave nova;
a chave de teste continua funcionando. Se o papel "Administrador da política da organização" foi
dado só para isso, tirar da conta. No deploy, desligar a política só durante a troca da chave.

**Pendente (BACKLOG):** chave de API "Browser" sem restrição; SHA-1 de release, cliente OAuth
de release e restrição da chave para o pacote de release, depois do Play Console.

**Próximo passo:** o teste no emulador (parte 2 de `docs/operacao/prompt-cowork-fase4.md`), com
`FCM_MODO=fcm` e a chave da conta de serviço no `.env`, e o RESULTADO TESTE NO EMULADOR colado aqui.

## Depois do critério da Fase 4: Cowork e teste no emulador (2026-09-30)

`docs/operacao/prompt-cowork-fase4.md` tem duas partes:
- **Prompt do Cowork:** confere a API do FCM (V1) e restringe a chave de API do app Android (pacote +
  SHA-1). Confere o usuário de teste do login com Google. Duas etapas são opcionais: a chave da
  conta de serviço do FCM, só para ver o push chegar, e o app de release `br.com.economae` no
  Firebase, só com o `applicationId` confirmado.
- **Roteiro do teste no emulador** (imagem com Google Play), com o formulário do que devolver.

`scripts/dev-emulador.sh` sobe a API na porta 3000 com um banco próprio (`dev_emulador`) já
alimentado com as lojas fictícias. `despachar` manda os pushes com o `FCM_MODO` do `.env`. Conferido
aqui: `scripts/fase4/cenario.mjs` passou contra essa API usando o `despachar` do script, com 1 push e
sem repetição. As duas travas também funcionam: porta ocupada e `fcm` sem conta de serviço. O
`.gitignore` passou a ignorar o nome padrão da chave da conta de serviço do Firebase.

**Próximo passo:** o responsável roda o prompt do Cowork e o roteiro do emulador e cola os dois
resultados aqui.

## Cliente OAuth Android e Firebase configurados (2026-09-30)

O Cowork rodou `docs/operacao/prompt-cowork-android.md` e devolveu:
- cliente OAuth Android `984598232826-1i256inbmffo8gdkra3m49vmf698u3hv...`;
- app `1:984598232826:android:06850797fd477592849343` no Firebase;
- o `google-services.json`, que ficou em `android/app/`, fora do git.

Conferido antes de usar: o SHA-1 do arquivo é o da chave de debug do projeto, e o cliente Web é o
mesmo do `serverClientId` do app. O APK de debug sai com `PUSH_DISPONIVEL = true`, a configuração do
Firebase embutida e assinatura com o SHA-1 cadastrado.

`./scripts/pronto-fase4.sh` rodou de novo com o Firebase presente e passou inteiro: cenário do push,
173 testes do backend, testes JVM do app com a jornada contra a API local, e o APK de debug.

**Ainda não visto num Android real:**
- login com Google (seletor de contas);
- token FCM e chegada do push, que precisa também do despachante com `FCM_MODO=fcm` e conta de
  serviço (BACKLOG).

**Próximo passo:** abrir o app no emulador do Android Studio (imagem com Google Play) com o backend
local. Seguem pendentes: pacote de release no Firebase e no OAuth, restrição da chave de API,
hospedagem e vinculação real da Lomadee.

## Itens 2 e 3 da Fase 4: OAuth Android e teste do app (2026-09-30)

**Item 3, testar o app.** Este ambiente não tem virtualização (sem `/dev/kvm`), então não roda
emulador. Em troca, o app de verdade roda na JVM com Robolectric (decisão 67): a Activity, os
ViewModels, o OkHttp e o DataStore, contra a API local alimentada pelo pipeline. O teste
`JornadaDaMaeTest` percorre login por código → termos → preferências → feed → oferta → conta e
grava uma captura de cada tela em `android/app/build/outputs/roborazzi/`. Entrou em
`scripts/pronto-fase4.sh`, que passou inteiro de novo.

As capturas mostraram dois defeitos, já corrigidos:
- **"R$ 998,00 por l" num protetor de 50 ml.** Agora aparece "R$ 99,80 por 100 ml" (ou por 100 g, ou
  por unidade), com teste.
- **Foto que não carrega deixava um buraco em branco.** Agora o espaço tem fundo neutro, e no
  detalhe some quando a oferta não tem foto.

O que depende do Android real continua sem teste: seletor de contas do Google, permissão de
notificação, notificação chegando e toque, teclado (BACKLOG).

**Item 2, cliente OAuth Android e Firebase.** Não tenho acesso à conta Google. Preparei:
- **Chave de debug do projeto versionada** (decisão 66), com o mesmo SHA-1 em qualquer computador:
  `10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85`.
- **Prompt do Cowork** em `docs/operacao/prompt-cowork-android.md`: cria o cliente OAuth Android de
  `br.com.economae.debug` e registra o app no Firebase. Devolve o `google-services.json` para colar
  aqui; ele vai para `android/app/`, fora do git.

**Próximo passo:** rodar o prompt do Cowork e colar o resultado. Com o `google-services.json`, o
build de debug sai com push.

## Fase 4 — app Android e push (PRONTA; falta testar no aparelho)

**Critério de pronto:** `./scripts/pronto-fase4.sh` (precisa de `ANDROID_HOME`).
1. O pipeline alimenta um banco descartável e a API sobe.
2. `scripts/fase4/cenario.mjs` faz o caminho do app até o push: login, termos, preferências,
   consentimento e cadastro do aparelho, para três mães.
3. O despachante real (`FCM_MODO=log`) manda **1** push, só para quem escolheu a categoria e consentiu.
   Um segundo despacho não repete.
4. Roda a suíte do backend (173 testes, com integração da API e do despacho) e os testes JVM do app
   (18), e gera o APK de debug.

Resultado nesta sessão: tudo verde. O lint do Android deu 1 aviso, o `targetSdk` 36 (decisão 65).

**Backend**
- Contrato **1.2.0**, só com acréscimos, com o teste de compatibilidade contra a 1.0.0 aprovada:
  - `PUT /v1/dispositivos`: token FCM preso à sessão;
  - `POST /v1/entregas/{id}/abertura`: registra o toque na notificação.
- `src/push/`: despacho por tenant com lock (decisões 56–60). Respeita consentimento, termos,
  categoria, tamanho de fralda, CEP do plano, silêncio e limite do dia. Reserva a entrega antes de
  enviar. O texto leva preço por embalagem, condição e aviso da NBCAL. O envio é pela API HTTP v1 do
  FCM com conta de serviço, e token morto sai do banco.
- Os testes de integração pegaram e corrigiram um bug: o limite diário contava duas vezes os envios
  da mesma execução.

**App (`android/`)** — Kotlin 2.4, AGP 9.4, Compose BOM 2026.09, módulo único (decisão 61)
- Telas: entrada (código por e-mail e Google pelo Credential Manager), termos (18+), preferências
  (categorias, tamanho de fralda, CEPs do plano, silêncio, limite), feed com filtro e paginação,
  detalhe com gráfico do histórico e aviso de link de afiliado, e conta (alertas com permissão do
  Android 13+, sair, excluir conta).
- Push: canal "ofertas" e registro do token ao consentir e a cada abertura. O toque na notificação
  abre a oferta e registra a abertura. Sem `google-services.json` o app roda sem push (decisão 63).
- Aviso da NBCAL e rótulo da condição sempre visíveis no feed, no detalhe e na notificação.
- Teste JVM confere cada modelo Kotlin contra `backend/openapi/v1.json` (decisão 64). Um campo
  inventado de propósito derrubou o teste.

**Precisa do responsável**
1. Confirmar o `applicationId` `br.com.economae` (decisão 62): não muda depois de publicar.
2. Criar o cliente OAuth **Android** e registrar o app no Firebase: passos 4 e 5 de
   `docs/operacao/google-cloud.md`. O SHA-1 é o do computador onde o app for compilado.
3. Testar no Android Studio (emulador ou aparelho) com o backend local: este ambiente não tem
   emulador.
4. Ícone do app (hoje é o do sistema).

**Próximo passo:** teste no aparelho e ajustes. Depois, hospedagem (suspensa: depósito do Google
Cloud) e vinculação real da Lomadee, que liberam o teste com usuárias reais.

## Contas configuradas pelo Cowork (2026-09-29)

Recebido o resultado do prompt `docs/operacao/prompt-cowork.md`:
- **Login com Google ligado:** client ID Web `984598232826-so1nrq...apps.googleusercontent.com` em
  `app.auth.googleClientIds`, e `GET /v1/configuracao` passa a responder `login.google = true`. A
  tela de consentimento está **Em teste**: só o usuário de teste cadastrado entra com Google até
  publicar. Ainda não testado com um ID token real, o que depende do app da fase 4.
- **Firebase** adicionado ao projeto `project-79519032-1c32-4dac-a1f`, no plano Spark.
- **Brevo:** conta Free e remetente verificado. O remetente é um endereço do Gmail, com risco de spam
  ou recusa (ver BACKLOG); a chave de API só no deploy. O Brevo mede abertura e não deixa desligar:
  isso foi registrado em `docs/juridico` para a política de privacidade.

**Próximo passo:** Fase 4 (app Android). O client ID Web entra como `serverClientId`, e o client
Android (nome do pacote + SHA-1) é criado lá.

## Google Cloud sem depósito (2026-09-28)

O console do Google Cloud pediu um depósito de R$ 150 (pré-pagamento para ativar o faturamento), que
não está disponível.
- **O projeto não precisa de faturamento.** Login com Google e Firebase/FCM no plano Spark funcionam
  sem ele. O guia (`docs/operacao/google-cloud.md`, seção 3) agora manda criar o projeto pelo console
  do Firebase, que não pede cartão, e ignorar a oferta de faturamento.
- **Hospedagem suspensa** (seção 4 do guia): a VM gratuita exige o faturamento. Não bloqueia nada
  agora; a fase 4 usa o backend local. Decidir antes do teste com usuários reais.

Projeto criado: `project-79519032-1c32-4dac-a1f` (registrado no guia).

**Próximo passo:** Fase 4. Para ligar o login com Google, falta o ID do cliente Web do projeto
(tela de consentimento + cliente "Aplicativo da Web", seção 3 do guia).

## Provedor de e-mail e preparação do Google Cloud (2026-09-28)

**Recebido do responsável:**
- NBCAL validada pela assessoria;
- tamanho de fralda não é dado da criança;
- termos e política em revisão;
- definir o provedor de e-mail gratuito e preparar o Google Cloud.

**Feito (153 testes passando; critério da fase 3 PRONTA):**
- **Brevo** como provedor do código de login (decisão 54). Plano gratuito de 300 e-mails por dia, API
  HTTP e sem cartão; ganhou do Mailjet (200 por dia) e do Resend (100 por dia).
  - `EMAIL_MODO=brevo` com `BREVO_API_KEY` e `EMAIL_REMETENTE`. Produção recusa `EMAIL_MODO=log`.
  - Erro do Brevo nunca expõe a chave nem o destinatário.
  - O e-mail não tem link, só o código.
- **Cota diária própria de 280 e-mails** (decisão 55). Acima dela, o pedido de código responde 503
  `ENVIO_FALHOU` sugerindo o login com Google, em vez de o código vencer na fila do Brevo. Sem mudança
  no contrato.
- `docs/operacao/google-cloud.md`: passo a passo do Brevo (domínio, remetente, chave) e do projeto no
  Google Cloud (tela de consentimento, client ID Web → `app.auth.googleClientIds`, client Android e
  Firebase na fase 4). Traz também a proposta de hospedagem na VM `e2-micro` do nível sempre gratuito.
- DECISIONS 46 e 51, BACKLOG e `docs/juridico` atualizados com as validações da assessoria.

**Não verificado:** o envio real pelo Brevo. Este ambiente não tem chave; os testes usam um `fetch`
falso com o formato da API documentada.

**Precisa do responsável**
1. Criar a conta no Brevo e autenticar o domínio ou o remetente.
2. Criar o projeto `economae` no Google Cloud e o client ID Web (seção 3 do guia) e me passar o ID
   do cliente. Não é segredo, entra na config do tenant.
3. **Domínio próprio** (cerca de R$ 40 por ano): recomendado para o e-mail não cair no spam, para o
   endereço dos termos e para a tela de consentimento do Google.
4. ~~Hospedagem na VM `e2-micro`~~: suspensa, ver seção acima.

**Próximo passo:** ver seção acima.

## Aprovação da fase 3 revisada (2026-09-28)

**Aprovado pelo responsável:** a revisão e as decisões 44–50, o contrato v1 e as recomendações da
revisão. Aplicado nesta rodada (critérios das fases 1, 2 e 3 passando; 144 testes):
- **Contrato congelado:** a 1.0.0 aprovada está em `openapi/v1-aprovado.json`. O teste
  `contrato v1 congelado` compara o contrato gerado com ela e falha em qualquer quebra (decisão 53).
  O contrato atual é a 1.1.0, só com acréscimos.
- **Filtro opcional por tamanho de fralda** (decisão 51):
  - o normalizador extrai o tamanho do título (RN a XXXG; EG e EXG viram XG e XXG);
  - `tamanhosFralda` entra nas preferências e é opcional no PUT;
  - o feed filtra e cada item traz `produto.tamanhoFralda`;
  - `GET /v1/configuracao` lista as opções.

  Não pede idade nem data de nascimento.
- **Tenant renomeado** de `padrao` para `economae` (migration 0005; decisão 52). Scripts e testes usam
  `--tenant economae` e `X-Tenant: economae`.

**Continua com o responsável ou com terceiros** (BACKLOG): validação jurídica da NBCAL e do tamanho
de fralda, texto dos termos e da política, provedor de e-mail, projeto no Google Cloud, proposta do
premium, calibração do limiar de queda com dados reais.

**Próximo passo:** Fase 4 — app Android (`android/`) sobre o contrato v1, tabela de dispositivos FCM
(entra como acréscimo no contrato) e despachante de push respeitando consentimento, silêncio e limite
diário.

## Revisão da fase 3 — foco em mães, da gestação aos primeiros anos (2026-09-28)

**Pedido do responsável:** o app mostrava categorias demais (mercearia, perecíveis, limpeza da casa...).
O foco é desconto para mães em produtos para os filhos, da gestação aos primeiros anos. Revisar o
projeto e achar falhas no contrato, no `X-Tenant`, nos termos e na privacidade.

**O que mudou (critérios das fases 1, 2 e 3 passando; 129 testes)**
- Categorias do tenant: só `fraldas_lencos`, `higiene_cuidados_bebe`, `alimentacao_infantil` e
  `gestacao_pos_parto` (decisão 44). Mapa da Lomadee e gravações sintéticas ajustados.
- Medicamento sai do app, mesmo isento (decisão 45, substitui a 28). A triagem da P4 continua.
- **NBCAL (Lei 11.265/2006):** fórmula infantil, mamadeira, bico, chupeta e protetor de mamilo são
  bloqueados na triagem; alimento infantil sai com a advertência do Ministério da Saúde (decisão 46).
  O critério da fase 2 confere o bloqueio de uma mamadeira e de uma fórmula.
- Contrato (`openapi/v1.json`):
  - `avisos` no lugar de `medicamento`;
  - `documentos.termos` e `documentos.privacidade`, separados;
  - `imagemUrl` (migration `0004`);
  - regra de evolução por acréscimo, com respostas tolerantes a campo novo;
  - `Retry-After` documentado;
  - teto do `limite` e ordem do histórico explicados (decisões 48 e 49).
- `X-Tenant`:
  - respostas com `Cache-Control: no-store` e `Vary: X-Tenant, Authorization`;
  - o limite por IP não se multiplica mais trocando o cabeçalho (decisão 50).
- Fixtures do motor com config própria (decisão 47).
- `docs/juridico/termos-e-privacidade.md`: inventário real dos dados e o que os textos precisam cobrir.

**Falhas encontradas que dependem do responsável** (detalhe no BACKLOG, itens "revisão 3")
1. Sem filtro por **tamanho de fralda**, a categoria de fraldas vira spam. Recomendo filtro opcional por
   tamanho, sem pedir data de nascimento.
2. A categoria "Gestação e pós-parto" revela gravidez por inferência: é dado sensível. Os textos legais
   e o consentimento precisam tratar disso.
3. A lista NBCAL e o alcance da lei (composto lácteo, foto da embalagem, "leve 3 pague 2" em papinha)
   precisam de validação jurídica.
4. Termos e política não existem; público 18+, link de afiliado, Marco Civil (logs por 6 meses), página
   web de exclusão exigida pelo Google Play.
5. O premium baseado em "mais CEPs" é fraco para esse público.
6. O slug `padrao` iria no app publicado; renomear para `economae` antes da fase 4.

**Próximo passo:** o mesmo da fase 3 — aprovação do contrato revisado e das decisões 44–50, depois a
Fase 4.

## Fase 3 — API do app: contrato, autenticação, preferências, feed e detalhe (PRONTA; contrato aguarda aprovação)

**Critério de pronto:** `./scripts/pronto-fase3.sh`. Num banco descartável (`pronto_fase3`), o pipeline da
fase 2 acumula 20 dias de histórico com o relógio real; a API sobe de verdade e `scripts/fase3/cenario.mjs`
percorre o caminho do app por HTTP (20 checagens): configuração, código por e-mail (lido do log), termos,
consentimento, preferências recusadas por região e por plano, feed com os dois alertas, detalhe com
histórico, coleta seguinte sem a oferta da loja B (sai do feed; detalhe `ativa = false`), logout,
exclusão de conta. Depois roda `npm test` com os testes de integração ligados (`pronto_fase3_teste`).
Resultado nesta sessão: 20/20 OK e 117 testes passando.

**O que ficou pronto**
- `backend/openapi/v1.json`: contrato OpenAPI 3.1 com 13 operações, gerado de
  `src/api/v1/definicoes.ts` + `src/api/esquemas.ts` (`npm run contrato`). Os mesmos esquemas validam a
  requisição (campo desconhecido é 400) e filtram a resposta. O teste falha se o arquivo divergir.
- Autenticação (`src/auth/`, `src/api/v1/auth.ts`): código de 6 dígitos por e-mail (HMAC no banco,
  5 tentativas, só o mais recente vale, limites por e-mail e por IP), login com Google por ID token
  (RS256 com `node:crypto`, vincula a conta de mesmo e-mail), sessão opaca de 90 dias deslizantes, logout.
- Conta: termos com versão vigente obrigatória, consentimento de notificação separado, exclusão de conta.
- Preferências: categorias do tenant, CEPs da região (1 no gratuito, 3 no premium), silêncio, limite diário.
- Feed paginado por cursor e detalhe de oferta com histórico diário convertido para a embalagem.
- Pipeline: oferta ausente de coleta completa vira indisponível (item do BACKLOG da fase 2).
- Migration `0003`: `auth_codigos`, `sessoes`, índice de alerta por oferta. Bloco `app` na config do
  tenant. Dockerfile copia `config/`; compose passa `AUTH_CODIGO_CHAVE` e `EMAIL_MODO=log` à API.

**Como rodar:** `./scripts/pronto-fase3.sh`. Contrato: `cd backend && npm run contrato`.
Decisões 34–43 em DECISIONS.md.

**Verificação neste ambiente:** sem Docker. As fases 1, 2 e 3 foram verificadas com Postgres 16 e Redis
locais, por um substituto do comando `docker compose` fora do repositório. O `docker compose up` com a
API nova não foi exercitado (ver BACKLOG).

**Precisa do responsável**
1. Aprovar o contrato `backend/openapi/v1.json` (congela a v1 para as telas do app; revisado depois,
   ver seção acima). Pontos para olhar:
   login por código + Google (decisão 34, escolha do BACKLOG da fase 0), cabeçalho `X-Tenant`,
   o que o feed mostra (decisão 39) e os preços por embalagem (decisão 41).
2. Escolher o provedor de e-mail com camada gratuita; sem ele a API não sobe em produção.
3. Texto dos termos de uso e da política de privacidade (hoje versão "rascunho", sem URL).
4. Criar o projeto no Google Cloud para o login com Google (client ID Web).

**Próximo passo:** Fase 4 — app Android (`android/`) sobre o contrato aprovado, tabela de dispositivos
FCM e despachante de push respeitando consentimento, silêncio e limite diário.

## Fase 2 — uma fonte ponta a ponta (PRONTA)

**Critério de pronto:** `./scripts/pronto-fase2.sh`. Num banco descartável (`pronto_fase2`), roda o
pipeline 22 vezes sobre respostas gravadas da Lomadee: 13 dias de preço normal, 7 dias com o shampoo
inflado e duas coletas no dia da promoção. Confere 9 condições no banco e roda `npm test`.

**O que ficou pronto**
- `src/fontes/contrato.ts`: contrato `SourceAdapter` único. `src/fontes/lomadee.ts`: adaptador TIPO A
  (paginação por loja aprovada, itens ilegíveis separados, token nunca em mensagem de erro).
- `src/normalizador/`: embalagem extraída do título, chaves de produto e família, mapa de categorias
  por tenant, triagem de medicamento (P4) antes de tudo.
- `src/avaliador/`: histórico diário (P1), deduplicação (P5) sob lock no Postgres.
- `src/pipeline/`: repositório SQL, orquestrador (uma transação por oferta), comando `coletar`.
- Migration `0002`: vínculo fonte → loja aprovada, oferta por id externo com última decisão,
  alerta com cópia de preço, tabela `triagem_bloqueios`.
- Medicamento só no feed (config `medicamentos.notificar = false`).

**Como rodar:** `./scripts/pronto-fase2.sh`. Comando isolado:
`node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --gravacoes <dir> --listas-medicamentos <arquivo> [--agora ISO]`.

**Em aberto:** vinculação real da Lomadee (cadastro, P2, formato real da resposta), listas reais de
medicamentos (CMED e Portaria 344), itens `[fase 2]` do BACKLOG.

**Próximo passo:** Fase 3 — contrato OpenAPI, autenticação, preferências, feed, detalhe de oferta.
O contrato congelado precisa de aprovação do responsável antes das telas do app.

## Entre fases 1 e 2 — decisões recebidas e pendentes (2026-09-28)

**Confirmado pelo responsável:** impacto de cronograma das 14 observações aceito; interpretações 12, 13,
14 e 17 do DECISIONS confirmadas; nome `economae`; região estado de SP; TIPO A = Mercado Livre.

**Atualização (2026-09-28, depois):** orçamento zero. P2–P5 aprovadas. P4 implementada em
`backend/src/normalizador/medicamentos.ts` e P5 em `backend/src/avaliador/deduplicacao.ts`, ambas puras
e testadas (`npm test`: 58 testes). P2 fica para quando a primeira API for vinculada. Pendentes: P1
(leitura de "14 observações" como 14 dias), P6 e a escolha da fonte TIPO A (Mercado Livre ou
rede de afiliados de farmácia).

**Propostas** — versão revisada em 2026-09-28 (a primeira versão tinha
erros; ver conversa da sessão):
- P1. Coleta a cada 2 h (config por fonte). `price_history` grava a primeira observação de cada dia
  e toda mudança de preço; nunca "só quando muda" (dia sem linha sumiria da contagem). O avaliador
  entrega ao motor uma observação por **dia fechado** (fuso America/Sao_Paulo), com o **menor**
  preço do dia; o dia corrente não entra no histórico, é a oferta. "14 observações" passa a ser lido
  como "14 dias com observação" — reinterpretação da especificação, depende de aprovação.
- P2. Credencial por fonte e por tenant (tabela `source_credentials`, cifrada com AES-256-GCM via
  `node:crypto`, chave `CREDENTIALS_KEY` por env, com id de versão da chave). Token inicial entra por
  comando administrativo, não por variável global. Renovação sob lock no Postgres (duas instâncias
  renovando juntas quebram a cadeia). Apps/autorizações separados para desenvolvimento e produção.
- P3. CEP → coordenada: CEP Aberto só depois de ler os termos e registrar em SOURCES.md se o cache é
  permitido. Cache por CEP (não por usuário). Aceitar erro de posição em CEP geral de cidade pequena.
  Só necessário na fase 5.
- P4. Medicamento, falha fechada, aplicado a **todo** produto, não só à categoria de medicamentos:
  (a) GTIN encontrado na lista CMED → é medicamento → só passa se classificado como isento de
  prescrição; (b) filtro de texto independente no título/descrição (tarja, receita, controlado,
  retenção) bloqueia e manda para revisão; (c) produto na categoria de medicamentos sem GTIN ou sem
  correspondência na CMED → bloqueado. Listas versionadas com data de download.
- P5. Deduplicação por (tenant, família, loja): novo alerta só se o preço efetivo por unidade cair
  mais 5% abaixo do último alerta, ou se a promoção anterior tiver terminado (preço voltou acima da
  referência ou validade encerrou) e voltado. Promoção longa não renotifica. Mudança de decisão para
  cima (somente_feed → notificar, após aprovação de loja ou humana) é permitida. Sem índice único
  sobre preço; a regra roda dentro de transação com lock por chave.
- P6 (novo). Critério de pronto da fase 2: `scripts/pronto-fase2.sh` roda coletor → normalizador →
  avaliador contra respostas gravadas do Mercado Livre (HTTP falso) e histórico semeado de 20 dias,
  e confere no banco: ≥ 1 alerta `notificar`, 1 desconto de mentira descartado, 1 medicamento
  bloqueado, 0 alerta duplicado numa segunda execução. Coleta real fica em comando de integração.

**Riscos abertos da fonte Mercado Livre** (verificar com credencial antes de codar o adapter):
- Relatos públicos desde jan/2026 de 403 no `/sites/MLB/search` para apps comuns. Plano: adapter por
  lista de itens acompanhados via `/items/bulk`, não por busca. A lista precisa ser semeada (mais
  vendidos por categoria, se o endpoint responder; senão, operador), porque só entra alerta de item
  acompanhado há 14 dias.
- Programa de afiliados do ML não tem API oficial de geração de link. Sem link de afiliado automático
  até confirmar um caminho oficial; ferramentas de terceiros não entram.
- Este ambiente de nuvem bloqueia `api.mercadolibre.com` e `www.cepaberto.com` na política de rede.

## Fase 1 — motor de curadoria isolado (PRONTA)

**Critério de pronto:** `./scripts/pronto-fase1.sh` — typecheck + suíte do motor contra os fixtures
versionados em `backend/fixtures/`. A suíte falha se faltar qualquer um dos seis casos obrigatórios.

**O que ficou pronto**
- `backend/src/curadoria/`: módulo puro (sem banco, rede, relógio ou aleatório).
  - `avaliarOferta(entrada, config, agora)`: aplica as 8 condições, calcula score 0–100, decide entre
    `notificar`, `aguardar_aprovacao`, `somente_feed` e `descartar`, e redige o motivo legível.
  - `verificarCobertura(loja, usuario, economia, config)`: faixa de CEP, raio de entrega da loja física
    ou retirada próxima, recusando quando o deslocamento anula a economia.
- `backend/config/tenants/padrao.json`: todos os limiares, janelas, pesos e categorias.
- 18 fixtures de curadoria e 7 de cobertura, incluindo os obrigatórios: desconto de mentira (2),
  sem histórico (2), oferta condicional (2), embalagem diferente (2), oferta vencida/não iniciada (2),
  loja fora de cobertura (2).
- Verificação de mutação feita à mão: afrouxar `subidaMaxima` e `toleranciaPiso` derruba os dois
  casos de desconto de mentira.

**Em aberto:** itens `[fase 1]` do BACKLOG. Parâmetros do projeto ainda em branco (nome do app,
região inicial, fontes prioritárias, orçamento), necessários a partir da fase 2.

**Próximo passo:** Fase 2 — um SourceAdapter TIPO A ponta a ponta. Depende de escolher a fonte e
de ter credencial de API de afiliado (ver pendências no fim da última resposta da sessão).

## Fase 0 — fundação verificável (PRONTA)

**Critério de pronto:** `./scripts/pronto-fase0.sh` — sobe o compose, confere `/health` = 200,
lista migrations aplicadas e roda `npm test`.

**O que ficou pronto**
- Monorepo com `backend/` em Node 22 + TypeScript, dependências com versão exata e lockfile.
- `docker-compose.yml`: Postgres 16.4, Redis 7.4.1, serviço `migrate` (roda e sai) e `api`.
- Migration `0001_schema_inicial.sql` com todas as tabelas do modelo de dados, `tenant_id` em todas
  e FKs compostas `(tenant_id, id)`.
- `GET /health` checando Postgres e Redis, com teste unitário usando dependências falsas.

**Como rodar:** ver README.

**Em aberto:** itens em BACKLOG.md marcados `[fase 0]`.

**Próximo passo:** Fase 1, motor de curadoria como módulo puro.
