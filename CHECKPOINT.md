# Checkpoint

## Firebase levantado para o push; ligar-push.bat (2026-10-30)

Relatório do Cowork (`docs/juridico/fontes/firebase-push-2026-10-30.md`, chave de API mascarada): FCM V1 ativada, app `br.com.economae.debug` já registrado (falta o SHA-1 `7C:1C:...:36:A6` do APK de prévia), conta de serviço `firebase-adminsdk` com o papel certo e duas chaves antigas de origem desconhecida. Nada foi alterado. `scripts/windows/ligar-push.bat` liga o push sem abrir o `.env`. O responsável deu autorização total ao Cowork para concluir a etapa no Firebase; prompt entregue em 30/10 (SHA-1, chave de API, chave da conta de serviço salva em `segredos/`, código da fase 4 no computador). **App com push ainda não feito:** a instalação do Android SDK neste ambiente foi barrada pela permissão do ambiente.

## Fase 4, parte 1: despachante de avisos e push no servidor (2026-10-30, DECISIONS 100)

`backend/src/despachante/`: avisos de promoção excepcional para quem vê o alerta (categoria escolhida ou produto seguido, CEP com entrega), avisos dos seguidos (queda acima de X%, voltou ao estoque, menor preço em 180 dias, promoção acabando) e envio pelo FCM (API HTTP v1, sem SDK) com consentimento, aparelho de sessão viva, silenciamento, horário de silêncio (o push espera), anti-repetição de 24 h por produto e limite diário. Roda no processo do coletor (depois de cada coleta e a cada 10 min) ou à mão (`dist/despachante/despachar.js`). Migration 0014 (`alerts.avisos_gerados_em`, `avisos.push`/`push_em`, estado dos seguidos; `deliveries` saiu); contrato 1.4.0 (`Aviso.push`, só acréscimo; lint ok); config `app.push`. 732 testes passam (34 novos, 15 contra Postgres); 23 mutações das regras quebram o teste certo. **Push desligado** até a chave da conta de serviço (o responsável baixa; `docs/operacao/push.md`), e **o app ainda não recebe push** (próximo passo; prompt do Cowork para registrar o app no Firebase). As regras de produto (silêncio adiado, 24 h, 12 h, preço-base) são propostas, a confirmar.

## Revisão do backend: o que falta (2026-10-29)

Revisão do backend contra o PRODUTO.md, os contratos e o BACKLOG. `scripts/pronto-fase3.sh` estava **falhando** e foi consertado: (1) o lint do `admin.yaml` acusava 2 erros (duas `description` com vírgula dentro de mapa em linha, que o YAML quebrava em chaves falsas) e 2 avisos (exemplo de `GET /v1/admin/lojas` sem `propria` e `areas_entrega_total`), todos vindos da D98; (2) a checagem da provisão esperava 2 lojas, e `config/vinculos/padrao.json` tem 7 desde a D91: agora conta as lojas do próprio arquivo. Com Postgres 16 local: lint ok, 698 testes passam, **FASE 3 (parte 1): PRONTO**. Uma rodada isolada da suíte falhou e não se repetiu em 5 outras (BACKLOG). Rotas do contrato: só faltam as 4 que dependem de fora (Apple, comprovante e webhooks das lojas de apps). O grosso do que falta é a fase 4 (despachante de push, avisos dos seguidos, central de avisos alimentada, `deliveries`), retenção de `price_history`, adaptador da Shopee, assinatura e hospedagem.

## Início no modelo das lojas, API 1.3.0 e app 0.4.0 (2026-10-29, DECISIONS 99)

Forma do feed definida com o responsável (Shopee, Mercado Livre, Amazon como base). API: consulta única dos cartões (`backend/src/api/catalogo.ts`), ordens e filtros novos em `GET /v1/produtos`, `GET /v1/inicio` (fileiras) e `GET /v1/categorias` (contagem por CEP para o cadastro), contrato 1.3.0 (lint ok), migration 0013 (índice do histórico por produto); 698 testes do backend passam. App 0.4.0: Início com CEP, fileiras, vistos recentemente e grade "Para você"; cartão com queda, "antes", preço por unidade, lojas e selo de 180 dias; categoria e pesquisa com ordenar e filtrar; cadastro com CEP primeiro e contagem por categoria; 44 testes do app passam (inclusive o que desenha as telas na JVM). Mesma chave (SHA-1 `7C:1C:...:36:A6`). **Não testado no celular**; para funcionar, o computador precisa da API nova (`atualizar.bat`). Shopee: aguardando o acesso à Open API (pedido pelo formulário).

## Shopee: Open API lida, acesso pendente (2026-10-29)

O Cowork leu a documentação da Open API com a conta logada (`docs/juridico/fontes/shopee-open-api-2026-10-29.md`; resumo em `docs/operacao/redes-afiliados.md`; linha nova em `SOURCES.md`). A documentação abre, mas **a conta não tem acesso à API** (AppID e Secret vazios). O pedido de acesso é pelo formulário de contato da Shopee e fica com o responsável, via Cowork. GraphQL num único endpoint; assinatura `sha256(AppId + Timestamp + corpo + Secret)`, **conferida com o exemplo da documentação**; limite de 8.000 chamadas por hora; feed diário FULL/DELTA. **Não há GTIN, marca, estoque, frete nem região**, e há uma foto só. A conta aparece como "Empresarial", sem CNPJ, a conferir. Nenhum código de adaptador ainda.

## Teste do app no celular aprovado e Shopee ativa (2026-10-29)

O responsável testou no celular o app 0.3.2 (o que veio das DECISIONS 91 a 97: catálogo e categorias do KV, navegação por categoria e subcategoria, Início, Favoritos, galeria e visor de fotos com zoom, oferta manual sem "-0%") e informou que **tudo funciona**. A inscrição de afiliado da **Shopee foi aprovada** (conta ativa). Próximo passo, combinado com o responsável: **Shopee primeiro** (o Cowork lê a Open API com a conta logada e devolve `shopee-open-api-2026-10-29.md`; depois vem o adaptador em `backend/src/fontes/`). A forma do feed e o cadastro voltam em seguida.

## Painel do operador, versão final, com financeiro (2026-10-29, DECISIONS 98)

Painel em `/operador/` refeito: menu lateral com contadores, Visão geral, Alertas, Triagem e Denúncias com abas e busca, Ofertas manuais com prévia do app,
Produtos, **Lojas com cadastro de loja própria e área de entrega**, **Financeiro** (lançamentos, importação de CSV, gráficos de receita por mês e fonte,
cliques e receita por clique), Fontes, Operadores (só leitura, D2) e Auditoria com filtros; claro/escuro e celular. API `admin.yaml` 1.1.0 (só acréscimos),
migration 0012. 688 testes passam (inclusive 6 no Chromium, operando todas as telas). **Não testado no navegador do responsável nem com dados reais**;
nenhuma receita está lançada (a da Lomadee precisa ser lançada ou importada do relatório dela). Passo a passo: `docs/operacao/area-do-operador.md`.

## Identidade visual do KV no app (2026-10-29, DECISIONS 90)

App 0.2.0 com o visual do KV (`docs/design/kv/`, regras em `docs/design/identidade-visual.md`): tema Material 3 claro e escuro em `Tema.kt` (cores do KV com ajustes para WCAG AA, conferidos por `TemaTest`), fonte Inter embutida (OFL), cantos do KV, ícone adaptativo com versão monocromática, tela de abertura, onda e ilustração na entrada, artes nos estados vazios, selos novos (DESTAQUE, DEMONSTRAÇÃO, queda). Só visual: nenhuma chamada da API mudou; 560 testes do backend, 13 do app e 6 do conversor passam; mesma chave (SHA-1 `7C:1C:...:36:A6`) e pacote, então instala por cima. Conferido só no Chromium (`scripts/conferencia-visual.mjs`), **não num aparelho**. A dúvida de produto que o KV levanta (público mães/bebês × categorias de hoje) está no BACKLOG.

## App Android de prévia (2026-10-28, DECISIONS 86)

`app/` (Kotlin + Compose) compila (`scripts/gerar-apk.sh`), passa em 8 testes unitários e no lint, e o fluxo inteiro dele está coberto por `appPrevia.integracao.test.ts` contra a API real. **Nunca rodou num aparelho** (este ambiente não tem emulador): o primeiro teste de verdade é o seu. APK assinado com a chave de prévia; para o login com Google funcionar falta o cliente Android com o SHA-1 dela (prompt do Cowork). Para o celular alcançar a API: `docs/operacao/testar-no-celular.md` (Wi-Fi ou túnel `tunel.bat`, ambos escritos sem poder rodar o Docker do Windows).

## Login com Google ligado (2026-10-28)

O Cowork devolveu o relatório (`docs/juridico/fontes/google-login-2026-10-28.md`): o ID de cliente Web `economae-servidor` já existia e está em `app.google.clientIds` do tenant `padrao`. `/v1/configuracao` passa a oferecer `google`. Nada foi criado nem alterado no Google Cloud. Pendente do lado do responsável: publicar a tela de consentimento quando for hora (hoje só a conta de teste entra) e, na fase 6, o cliente Android de release.

## Fase 3, parte 3: área do operador (2026-10-28, DECISIONS 83)

`/v1/admin` no ar: login do operador, alertas, lojas, fontes (inclusive credencial só de escrita), denúncias, triagem (com liberação respeitada pela coleta), ofertas manuais (lista e encerramento), busca de produto e auditoria. 21 das 22 operações; falta o cadastro de oferta manual (fase 5) e a **tela** do painel. `contrato.test.ts` guarda quais operações dos contratos ainda não têm rota.
Mutações em todos os blocos (login, sessões, alertas, lojas/fontes, moderação, normalizador, ofertas/busca/auditoria) quebram o teste certo.

## Fase 3, parte 2l: login com Google (2026-10-28, DECISIONS 82)

`POST /v1/auth/google` no ar, **desligado até o ID de cliente web entrar em `app.google.clientIds`** (vem do Cowork; ver `docs/operacao/login-google.md`). Verificação própria do ID token (RS256, JWKS com cache, audiência, validade, nonce), testada com chaves locais e por 14 mutações do verificador, 7 da conta e 5 da rota.

## Fase 3, parte 2k: prova do alerta (2026-10-28, DECISIONS 81)

O pipeline grava menor, maior e dias medidos na criação do alerta (migration 0007) e a API devolve `prova`. Testado de ponta a ponta com o pipeline de verdade (20 dias de coleta, queda, alerta) e por mutação (janela, dia corrente, contagem de dias, produto, mapeamento).

## Fase 3, parte 2j: exportação dos dados (2026-10-28, DECISIONS 80)

`GET /v1/me/exportacao` no ar (tudo da conta, sem token de push nem hash de comprovante, 1 por hora, vale com termos pendentes). Um teste confere que toda tabela da pessoa está na exportação ou na lista de fora.
444 testes (104 contra Postgres de verdade); 13 mutações quebram o teste certo.
**Rotas internas do contrato concluídas, menos as que dependem de fora:** assinatura (comprovante e webhooks das lojas de apps), login Google, admin. **Falta no motor:** `prova`; despachante de push e avisos dos seguidos (fase 4).

## Fase 3, parte 2i: dispositivo de push (2026-10-28, DECISIONS 79)

`PUT`/`DELETE /v1/dispositivo` no ar (token preso à sessão, sem consentimento não grava, o mesmo token passa de uma conta para a outra, 30/h por sessão).
440 testes (100 contra Postgres de verdade); 15 mutações quebram o teste certo.
**Falta nas rotas:** exportação, assinatura; admin; login Google.

## Fase 3, parte 2h: central de avisos (2026-10-28, DECISIONS 78)

`GET /v1/avisos` e `POST /v1/avisos/leitura` no ar. Nada cria aviso ainda (despachante: fase 4); os testes inserem as linhas.
433 testes (93 contra Postgres de verdade); 16 mutações (categoria, silêncio de loja e de marca, silêncio só de push, revisão do alerta, outra pessoa, total, ordem, cursor, filtro de não lidos, `lido_em` mantido, ids de outra pessoa, `ate` inclusivo, os dois campos, limite de ids) quebram o teste certo.
**Falta nas rotas:** dispositivo (push), exportação, assinatura; admin; login Google.

## Fase 3, parte 2g: produtos (2026-10-28, DECISIONS 77)

`GET /v1/produtos`, `/v1/produtos/{id}` e `/v1/produtos/{id}/historico` no ar (pesquisa por texto e GTIN, página com ofertas e link rastreado, histórico por loja).
425 testes (85 contra Postgres de verdade); onze mutações (advertência, categoria, marca e loja silenciadas, relevância, janela, conversão da embalagem, limite de taxa, trava de marca no histórico, GTIN exato) quebram o teste certo.
**Falta nas rotas:** avisos (central), dispositivo (push), exportação, assinatura; admin; login Google.

## Fase 3, parte 2f: silenciamentos e seguidos (2026-10-28, DECISIONS 76)

`GET`/`PUT`/`DELETE /v1/silenciamentos`, `GET /v1/seguidos`, `PUT`/`DELETE /v1/seguidos/{produto_id}` no ar; migration 0006. O feed passa a refletir o que a pessoa silencia e segue (teste de ponta a ponta pela API).
412 testes (72 contra Postgres de verdade); nove mutações (loja de outro tenant, ttetos, remoção de qualquer pessoa, seguir produto com advertência ou medicamento, faixa do percentual, `criado_em` regravado, lista de qualquer pessoa) quebram o teste certo.
**Falta nas rotas:** produtos (pesquisa, página, histórico), avisos (central), dispositivo (push), assinatura, exportação; admin; login Google. **Falta no motor:** `prova`; os avisos dos seguidos (queda_percentual, voltou_estoque etc.) só são guardados, ninguém os dispara ainda (fase 4, push).

## Fase 3, parte 2e: avaliação e denúncia do alerta (2026-10-28, DECISIONS 75)

`PUT /v1/alertas/{id}/avaliacao` e `PUT /v1/alertas/{id}/denuncia` no ar, com a regra de esconder por limite (config `app.denuncia`), caso de denúncia para o operador e limite de 20 por dia. Corrigido no pipeline:
a oferta escondida volta quando o preço muda. 400 testes (60 contra Postgres de verdade); sete mutações (limite `>`, sem percentual, sem janela, caso resolvido esconde de novo, data da avaliação, pipeline não solta, encerrada aceita) quebram o teste certo.
**Falta nas rotas:** produtos (pesquisa, página, histórico), seguidos, silenciamentos, avisos, dispositivo (push), assinatura, exportação; admin (fila de denúncias etc.); login Google.

## Shopee: inscrição enviada (2026-10-28)

O responsável se inscreveu como afiliado (pessoa física); resposta por e-mail em até 3 dias (31/10/2026; depois disso, contato com a Shopee). A documentação da Open API só abre após a aprovação. Nada de código da Shopee ainda.

## Fase 3, parte 2d: feed, detalhe e eventos do alerta (2026-10-28, DECISIONS 74)

`GET /v1/alertas`, `GET /v1/alertas/{id}`, `POST /v1/alertas/{id}/eventos` no ar, com o link rastreado da Lomadee gerado no detalhe (`api/linkOferta.ts`, `api/encurtadorProducao.ts`). O app já consegue mostrar uma oferta de verdade.
**Achado e corrigido:** o pipeline não gravava as advertências da NBCAL nem a chave da marca; agora grava (`products.advertencias`, `marca_chave`) e o feed só mostra produto com advertência se o texto legal é conhecido.
Conferido: 391 testes (51 contra Postgres de verdade); oito mutações nas regras (advertência sem texto, trava de marca, categoria de medicamento, filtro de tenant, alerta rejeitado/pendente, silenciamento, preço da oferta mudado, idempotência)
quebram cada uma o teste certo; servidor real (Postgres, Redis e a Lomadee de verdade pelo proxy): login por código, termos, preferências, feed, detalhe com `https://lmdee.link/...` gerado e reaproveitado, evento 204, sem token nem chave no log.
**Falta:** avaliação e denúncia do alerta, produtos/histórico/pesquisa, seguidos, silenciamentos, avisos, dispositivo, exportação; `prova` (gravar menor/maior/dias na criação do alerta); loja física (geocodificação de CEP); imagem do produto (a fonte não entrega); login Google.

## Fase 3, parte 2c: conta, consentimentos e preferências (2026-10-28, DECISIONS 73)

`GET`/`DELETE /v1/me`, `PUT /v1/me/consentimentos`, `GET`/`PUT /v1/preferencias` no ar (`api/rotas/conta.ts`, `api/rotas/preferencias.ts`, `api/corpo.ts`). Com o aceite de termos funcionando, as demais rotas autenticadas deixam de dar 403.
Conferido: 361 testes (27 contra Postgres de verdade, `PG_TESTE_URL`); cinco mutações (leitura sem filtrar a pessoa, sem teto do plano, sem bloqueio por termos, data do consentimento regravada, exclusão que não apaga) quebram os testes;
a exclusão em cascata foi provada com preferências, assinatura, sessão e aparelho, sem tocar em outra conta. Mensagens de erro alinhadas aos exemplos do contrato.
**Falta nesta área:** exportação de dados (`GET /v1/me/exportacao`), silenciamentos, seguidos, avisos, dispositivo; feed, detalhe e eventos do alerta (onde entra `linkRastreadoDaOferta`); login Google.

## Redes de afiliados: leitura no navegador (2026-10-28)

Mercado Livre: sem API de afiliados e com cláusulas que impedem histórico, comparação e mistura de fontes: só vitrine manual. Magalu: sem API, só pessoa física: fora. **Shopee: nenhuma cláusula contra o app, aceita pessoa física, "aplicativos" contam como mídia:
próxima fonte**, mas a Open API só aparece com login e a comissão de apps de ofertas é "sob consulta". Awin espera o CNPJ. Detalhes e trechos em `docs/operacao/redes-afiliados.md`.

## Redes de afiliados: leitura do Cowork (2026-10-28)

Confirmado o caminho da Amazon (formulário de Atendimento para Associados; Creators API só para quem já tem vendas qualificadas; cache de 24 h, 1 h para ofertas) e, na Awin BR, as farmácias que existem
(Pague Menos 5%, Drogal 4%, Araujo, Venancio, Indiana) e a regra que pesa: **vários anunciantes não aceitam pessoa física**, e o projeto não tem CNPJ. Mercado Livre e Shopee seguem sem leitura oficial (o Cowork não usou o navegador).
Detalhes e decisões pendentes em `docs/operacao/redes-afiliados.md` e no BACKLOG.

## Redes de afiliados: levantamento público (2026-10-28)

`docs/operacao/redes-afiliados.md`. Achado principal, de fonte oficial: a política brasileira da Amazon (14/04/2026, item 6(y)) proíbe rastreamento e alerta de preços sem aprovação da Amazon, e o app é isso;
em julho de 2026 a Amazon já cobrou isso de comparadores na Europa. Awin tem API de feed (idiomas listados sem pt_BR, a conferir) e é a candidata mais forte para cobertura ampla; Mercado Livre e Shopee bloquearam
a leitura automática e vão para o Cowork; as grandes farmácias provavelmente não estão em nenhuma rede de afiliados. Nada foi cadastrado nem codificado.

## Brevo testada com envio real (2026-10-28)

Chave no segredo de rede, remetente `economae` verificado. Dois e-mails reais para a caixa de testes (um direto pelo `EnviadorBrevo`, um pelo servidor completo com Postgres e Redis):
ambos `delivered` segundo a Brevo; o segundo pedido seguido não gerou mensagem (limite de 1/min com o provedor real). A Brevo reescreve o "De" gmail.com para
`@12291020.brevosend.com`. **Conferido pelo Cowork no Gmail: Caixa de entrada, SPF/DKIM/DMARC pass. BREVO ENCERRADA para o lançamento**; falta só a etapa `verificar` com código real (só chega à caixa do responsável) e testar Outlook/Yahoo.
Detalhes em `docs/operacao/login-por-email.md`.

## Lomadee: marcas, tipos de canal e cobertura (2026-10-28, DECISIONS 72)

Relatório do Cowork em `docs/juridico/fontes/lomadee-marcas-2026-10-28.md`. As sete grandes redes de farmácia não existem na conta (nada a candidatar); cada marca define os tipos de canal
que aceita, e a Drogasmil não aceita Aplicativo Mobile, então o canal "Comparador de Preços" é o certo e **não** será trocado. Código: o encurtador só gera link para as marcas em
`fontes.lomadee.marcasPermitidasParaLink` (Drogasmil e PromoFarma) e recusa as outras antes de chamar a Lomadee. Sondagem do catálogo pela API (só leitura): fraldas e higiene do bebê
praticamente não vêm da Lomadee; falta decidir a segunda fonte (BACKLOG). 334 testes (+14 com Postgres).

## Fase 3, parte 2b: login por e-mail e sessões (2026-10-28, DECISIONS 71)

`POST /v1/auth/email/codigo`, `/email/verificar`, `/renovar`, `/sair` no ar, mais `api/sessao.ts` (`exigirSessao`: Bearer, tenant pela sessão, termos pendentes → 403)
para as próximas rotas. Código: `backend/src/auth/` (tokens, códigos, envio, sessões, usuários) e `api/rotas/auth.ts`; migration 0005; guia em `docs/operacao/login-por-email.md`.
Conferido: 346 testes (14 deles contra Postgres de verdade, `PG_TESTE_URL`; o `pronto-fase3.sh` agora os roda); 4 mutações de segurança (sem checagem de audiência,
reuso sem revogar, revogação desfeita no rollback, refresh revogado aceito) quebram os testes; servidor real com Postgres 16 e Redis: ciclo código → sessão → renovar →
reuso derrubando tudo, sem e-mail em chave do Redis e sem token no log. Um defeito achado e corrigido no caminho: tentativas barradas pelo limite de 1/min gastavam o de 5/h.
**Não conferido:** envio real pela Brevo (nenhuma conta usada) e o teto diário dela; o contrato ainda não é validado automaticamente contra as respostas.
**Falta:** conta Brevo + remetente verificado + `AUTH_HMAC_KEY` no `.env` (ver o guia); login Google (decisão D4, vínculo com e-mail igual, ainda aberta); `me`, consentimentos,
exportação e exclusão; preferências; depois feed e detalhe, onde entra `linkRastreadoDaOferta`.

## Windows atualizado (2026-10-28, tarde)

Cowork guiou a atualização de `C:\economae` para a branch atual: contêineres recriados sem perder dados, `status.bat` com a contagem nova ("1 de 14 dias"),
energia em "Nunca suspender". O serviço `api` do compose também subiu no computador do responsável (só em `127.0.0.1`).

## Coleta no Windows conferida (2026-10-28)

Relatório do Cowork (`coleta-windows-2026-10-28.md`): a coleta **já estava instalada e rodando** no computador do responsável desde 27/10 às 23:11
(Docker Desktop 4.97.0, `C:\economae`, `.env` existente), com 7 ciclos seguidos "ok" a cada 2 horas, 1739 itens da Lomadee por ciclo e nenhum erro.
Ninguém precisou colar a chave de novo. O `status.bat` (rodado pelo responsável) mostrou 747 produtos, 762 ofertas, 1524 preços, 727 barrados, 0 alertas.
Os números estranhados se explicam: 1524 = 762 ofertas × 2 dias de calendário (o histórico grava a primeira observação do dia e toda mudança, DECISIONS 27);
762 de 1739 é o que sobra depois dos 727 barrados e dos itens de categoria sem mapa (BACKLOG, achados da primeira coleta).
**Corrigido:** o `status.bat` contava o tempo corrido desde a primeira coleta ("0 de 14 dias" nas primeiras 24 h, e contaria 14 mesmo com a coleta parada por dias);
agora conta dias fechados com preço guardado, no fuso do tenant, igual ao motor. Conferido num Postgres de verdade. 305 testes.
Os `.bat` ainda não foram *instalados do zero* num Windows, mas `status.bat` e o coletor em ciclo estão provados no computador real.
Para o `status.bat` novo valer lá, o responsável precisa atualizar a pasta `C:\economae` com a versão da branch atual (baixar o zip de novo e substituir os arquivos, mantendo o `.env`).

## Canal da Lomadee criado (2026-10-28)

Pelo Cowork, conta de Nathália Fávaro Cândido: canal `economae` (Comparador de Preços), ID `7633b2c1-98a7-45c9-adea-e529dc67cc87`, ativo,
metatag validada (`site/index.html`). A API já lista o canal para a chave do projeto. `fontes.lomadee.canalId` gravado em `padrao.json`.
**Encurtador testado de verdade (mesmo dia):** link `lmdee.link` devolvido, escopo de escrita ok, mesmo link ao repetir. **Falta:** ligar `linkRastreadoDaOferta` na saída da oferta (parte 2 da fase 3); a Lomadee ainda pode analisar o canal depois do "Ativo".

## Fase 3, parte 2a: fundação do servidor e `/v1/configuracao` (2026-10-28, DECISIONS 69 e 70)

Duas frentes em paralelo, porque o canal da Lomadee pede o link do app e o app ainda não existe.

**Servidor.** `GET /v1/configuracao` no ar, conforme o contrato: tenant por `X-Tenant` (400 `tenant_ausente`, 404 `tenant_desconhecido`),
limite 60/min por IP (config `app.limitesTaxa`), `no-store` e `Vary`, erros no formato `Erro`. Peças reaproveitáveis pelas próximas rotas:
`api/erros.ts`, `api/tenants.ts`, `api/limiteTaxa.ts`, `shared/configApp.ts` (bloco `app` do tenant, validado na carga).
Conferido: 303 testes e `tsc` limpos; mutações (tirar `Vary`, tirar o 429) quebram os testes; servidor real contra Postgres 16 e Redis locais
(migrations 0001–0004 aplicadas): 200 com a forma do contrato, a 61ª chamada no minuto dá 429 com `Retry-After`, `/health` ok.
**Não conferido:** o contrato ainda não é validado automaticamente contra a resposta (sem leitor de YAML no projeto; os testes conferem as chaves à mão);
`pronto-fase3.sh` ainda não sobe o servidor (precisa de Redis).

**Lomadee.** `site/` (index, termos, privacidade) e `docs/operacao/site-publico.md`. **Nada foi publicado.** Falta o responsável:
publicar em Cloudflare Pages, criar o canal tipo aplicativo na Lomadee com esse endereço, conferir o escopo `shortener:write`;
só então `EncurtadorLomadee` pode ser testado de verdade (BACKLOG, decisão 68).

**Próximo:** autenticação (código por e-mail com Brevo, Google, sessão e renovação), reaproveitando `api/` desta parte; depois `me`, preferências e o feed,
onde entra `linkRastreadoDaOferta`.

## Triagem NBCAL (2026-10-27, PRONTA; pendente de revisão por advogado)

A partir de [docs/juridico/parecer-d33-nbcal.md](docs/juridico/parecer-d33-nbcal.md) (DECISIONS 35–39).
- `backend/src/normalizador/nbcal.ts`: `triarNbcal` (vedado > cautela > advertência > livre) e
  `compilarRegrasNbcal` (valida a config; falha fechada).
- `backend/config/tenants/padrao.json`: seção `nbcal` com a tabela do parecer, versão
  `parecer-d33-2026-10-27`.
- Normalizador: bloqueios `NBCAL_VEDADO` e `NBCAL_CAUTELA`; `ProdutoNormalizado.advertencias`.
- Pipeline: produto com advertência vira `somente_feed`, com o motivo registrado.
- Testes: `nbcal.test.ts` roda a tabela do parecer contra a config real; `normalizar.test.ts` cobre a
  ordem das triagens. `npm test`: 143 testes passando; `tsc --noEmit` limpo. Pipeline com banco não
  rodado (sem Postgres neste ambiente).
- Pendente: as advertências não são gravadas (`products` não tem coluna; item 16 abaixo). Pesquisa,
  página, seguidos, central, compartilhamento, oferta manual e anúncios ainda não existem; quando
  existirem, aplicam as mesmas regras (parecer, perguntas 5, 6 e 8).

## Fase 3 — contrato do núcleo, rascunho 2 (EM PROPOSTA, aguardando aprovação)

Entregue em 2026-10-27, a partir de [PRODUTO.md](PRODUTO.md) e do rascunho 1 (seção seguinte, superada
onde diverge). Só contrato e documentação: nenhuma rota, migration ou tela.

- `backend/openapi/openapi.yaml` — app (público + usuário), 34 operações, versão `1.0.0-rascunho.2`.
- `backend/openapi/admin.yaml` — operadores, prefixo `/v1/admin`, esquema `operador` (audiência própria),
  22 operações. Reaproveita esquemas do `openapi.yaml` por `$ref` entre arquivos.
- `docs/juridico/nbcal.md` — Lei 11.265/2006 e Decreto 9.579/2018 com os trechos literais que importam,
  o que significam para o app e o que a linha paralela fez diferente (D30–D33).
- `npx @redocly/cli@1.34.5 lint backend/openapi/openapi.yaml backend/openapi/admin.yaml`: 0 erros,
  0 avisos. A regra `no-invalid-media-type-examples` confere todo exemplo contra o esquema (testado
  quebrando um exemplo de propósito).

> **D1 decidida (2026-10-27, DECISIONS 34).** O responsável decidiu que este rascunho e o PRODUTO.md
> prevalecem sobre a linha paralela (`claude/awesome-noether-jruv6b` e `claude/determined-meitner-8zeag7`),
> que tinha um `/v1` aprovado (`v1-aprovado.json`), servidor e app Android das fases 3 e 4. O que lá
> diverge daqui fica superado: foco em mães, medicamento fora do app, sessão de 90 dias, tenant
> `economae`, rotas `/v1/eu`, `/v1/feed`, `/v1/ofertas/{id}`, Brevo. O código daquela linha não está
> nesta branch; reaproveitar algum pedaço dele é escolha de implementação, sempre seguindo este contrato.

### O que mudou em relação ao rascunho 1
- **Escopo.** De 15 para 34 operações no app, mais 22 de operador. Novas: login Google e Apple,
  exportação de dados, silenciamentos, avaliação, denúncia, pesquisa, página e histórico do produto,
  seguidos, central de avisos, comprovante de assinatura, webhooks das lojas de apps e toda a área do
  operador.
- **Feed.** `aguardar_aprovacao` só aparece depois de aprovado por operador (era visível); alerta
  rejeitado, escondido por denúncia ou de loja ou marca silenciada com `alcance: tudo` sai do feed.
- **Alerta.** `avisos: string[]` virou `advertencias: [{codigo, texto}]`, porque "aviso" agora é a
  central de avisos. Entraram `situacao` (`ativa | encerrada | em_revisao`), `preco_referencia_centavos`
  (referência convertida para a embalagem), `sem_historico_verificado` (oferta manual), `seguido` e
  `produto.id` / `produto.marca {chave, nome}` / `produto.gtin`.
- **Detalhe.** Responde também para promoção encerrada (push aberto tarde mostra "encerrada", não 404).
  O histórico saiu do detalhe para `GET /v1/produtos/{id}/historico` (até 180 dias, nos dois planos;
  era 30). O detalhe ganhou `historico_desde`, `valida_de`, `avaliacao` e `denuncia` da pessoa.
- **Conta.** `metodos_login`, `conta_nova` na sessão, `plano {tipo, anuncios, ceps_permitidos,
  assinatura}` no lugar de `premium`/`premium_expira_em`. Exclusão confirma com `confirmacao: excluir`
  (o e-mail de retransmissão da Apple pode ser desconhecido da pessoa).
- **Configuração.** `nome_app`, `fuso`, `metodos_login`, `planos` por loja de apps e mais limites.
- **Dispositivo.** `token_fcm` virou `token`; `plataforma: android | ios`.
- **Erros.** Enum de 12 para 23 códigos, com a lista de rotas de cada um em `CodigoErro`. 400 separado
  de 422 (JSON ilegível × campo inválido); 409, 429 com `Retry-After` e 503 onde cabem.
- **Forma.** Todo erro e todo sucesso têm exemplo; nenhum objeto anônimo repetido; paginação comum
  (`PaginaBase`); idempotência declarada em cada escrita.

### Mapa rota → tabela(s)
"novo" = exige migration (não escrita). Prefixo `/v1` omitido.

| Rota | Tabelas |
|------|---------|
| `GET /configuracao` | `tenants` + config do tenant (termos, rótulos, limites, planos: campos novos no JSON) |
| `POST /auth/email/codigo`, `/verificar` | Redis (código, limites), `users`, `sessions` (novo) |
| `POST /auth/google` | `users.google_sub`, `sessions` (novo) |
| `POST /auth/apple` | `users.apple_sub` (novo), credencial Apple cifrada (novo), `sessions` (novo) |
| `POST /auth/renovar`, `/auth/sair` | `sessions` (novo), `dispositivos` (novo) |
| `GET/DELETE /me`, `PUT /me/consentimentos` | `users`, `subscriptions`, cascata em todas as tabelas do usuário |
| `GET /me/exportacao` | todas as tabelas do usuário |
| `GET/PUT /preferencias` | `user_preferences`, `subscriptions` |
| `/silenciamentos*` | `silenciamentos` (novo), `stores`, marca (novo) |
| `GET /alertas` | `alerts`, `offers`, `products`, `stores`, `store_service_areas`, `user_preferences`, `silenciamentos`, revisão (novo), denúncia (novo), `seguidos` (novo) |
| `GET /alertas/{id}` | idem + `price_history` (`historico_desde`), `avaliacoes`, `denuncias` (novos) |
| `POST /alertas/{id}/eventos` | `alert_events` (novo; `deliveries.canal` só aceita `push`), idempotência (novo) |
| `PUT /alertas/{id}/avaliacao` | `avaliacoes` (novo) |
| `PUT /alertas/{id}/denuncia` | `denuncias`, `casos_denuncia` (novos), `alert_events` |
| `GET /produtos`, `/produtos/{id}` | `products` (índice de busca: novo), `offers`, `stores`, `store_service_areas`, `alerts` |
| `GET /produtos/{id}/historico` | `price_history` por `familia_chave` + loja (DECISIONS 11), `products` |
| `/seguidos*` | `seguidos` (novo), `products` |
| `GET /avisos`, `POST /avisos/leitura` | `avisos` (novo) |
| `POST /assinatura/comprovantes`, webhooks | `subscriptions` (colunas novas) |
| `PUT/DELETE /dispositivo` | `dispositivos` (novo, preso a `sessions`) |
| `/admin/auth/*`, `/admin/me` | `operadores`, `sessions` com audiência (novos) |
| `/admin/alertas*` | `alerts` + revisão (novo), `offers`, `sources`, `stores` |
| `/admin/lojas*` | `stores` |
| `/admin/fontes*` | `sources`, `source_credentials` (novo, DECISIONS 22) |
| `/admin/denuncias*` | `casos_denuncia`, `denuncias` (novos) |
| `/admin/triagem*` | `triagem_bloqueios` (+ resultado e operador: novo) |
| `/admin/ofertas-manuais*`, `/admin/produtos` | `offers`, `products`, `sources` tipo E, `alerts`, idempotência (novo) |
| `/admin/auditoria` | `auditoria` (novo) |

### O que exigia migration (escrita em `0003_api_nucleo.sql`, 2026-10-27)
1. `sessions`: hash do access e do refresh, audiência (`app | operador`), cadeia de rotação, revogação.
2. `users.apple_sub` (único por tenant) e credencial Apple cifrada para revogação.
3. `operadores` (tenant, e-mail, nome) e `auditoria` (operador, ação, alvo, detalhe JSON, data).
4. `silenciamentos` (usuário, tipo, alvo, alcance) e marca normalizada (`products.marca_chave` ou tabela
   `marcas`).
5. `seguidos` (usuário, produto, os cinco avisos) e `avisos` (central, com `lido_em`).
6. `alert_events` (usuário, alerta, tipo, origem, data, chave de idempotência) e tabela de chaves de
   idempotência para a oferta manual.
7. `avaliacoes` e `denuncias` (uma por pessoa por oferta e preço) e `casos_denuncia` (oferta escondida,
   situação, resolução).
8. Revisão do alerta: situação, operador (FK), data, observação. Hoje `alerts.aprovado_por` é texto
   e não há rejeição.
9. `triagem_bloqueios`: `resultado`, `revisado_por`.
10. `dispositivos` (token, plataforma `android | ios`, versão, `sessao_id`).
11. `subscriptions`: `origem` aceita `app_store`; colunas do comprovante (hash, id da transação original,
    `produto_loja_id`) com unicidade por loja; mapeamento de estados (D23).
12. `source_credentials` (aprovada na P2, ainda não criada).
13. Índice de busca textual em `products` (ex.: `pg_trgm`, extensão do próprio Postgres).
14. `offers`: `criada_por` (oferta manual) e marca de oferta escondida por denúncia.
15. Fora do banco: config do tenant ganha rótulo de categoria, termos (versão e URL), métodos de login,
    limites e planos.
16. `products.advertencias` (códigos `nbcal_*` da triagem), para preencher `Alerta.advertencias`; hoje a
    triagem calcula e o pipeline usa, mas não grava.

### Rota → fase
| Fase | Rotas |
|------|-------|
| 3 (API) | `configuracao`; `auth/email/*`, `auth/google`, `auth/renovar`, `auth/sair`; `me`, `me/consentimentos`, `me/exportacao`; `preferencias`; `silenciamentos*`; `alertas*` (feed, detalhe, eventos, avaliação, denúncia); `produtos*`; `seguidos*` (cadastro; o despacho dos avisos é fase 4); admin: `auth/*`, `me`, `alertas*`, `lojas*`, `fontes*`, `denuncias*`, `triagem*`, `produtos`, `auditoria` |
| 4 (app/push) | `dispositivo`; `avisos`, `avisos/leitura`; despacho dos avisos de seguidos |
| 5 (oferta manual/CEP) | admin `ofertas-manuais*`; cobertura por distância (CEP → coordenada) dentro de `alertas` e `produtos` |
| 6 (publicação) | `assinatura/comprovantes`, `webhooks/*`; `auth/apple` só quando houver app de iPhone |

### Pontos de extensão (módulos futuros, sem rota)
O núcleo já garante: ids UUID estáveis, produto como recurso próprio (`/v1/produtos/{id}`), cursor
opaco em toda lista, erro único com enum que só cresce, tenant no token, e o app ignorando campo e
valor de enum desconhecidos.
- **Listas de presente.** Recurso novo `/v1/listas` (`tipo: presente | compras`, itens por
  `produto_id`). O convidado sem conta abre `GET /v1/listas/publicas/{token}` (token aleatório de 256
  bits, guardado como hash, revogável) e marca "vou dar" com nome opcional ou anônimo, sem conta e
  com o mínimo de dados. Encaixa em `ProdutoResumo` e nos limites de `Configuracao.limites`. Dados de
  criança: decisão em aberto 7 do PRODUTO.md.
- **Lista de compras.** A mesma `/v1/listas` com `tipo: compras`, privada.
- **Comparador entre lojas.** Já existe a base em `Produto.ofertas` (por loja, menor preço primeiro).
  O comparador agrupa por família (`familia_chave`) com preço por unidade: `GET /v1/produtos/{id}/comparacao`.
- **Página da loja.** `GET /v1/lojas/{id}` a partir de `LojaResumo.id`: reputação, ofertas ativas
  (cursor) e `Cobertura` para os CEPs da pessoa. O silenciamento de loja já usa o mesmo id.
- **Comentários nas ofertas.** `/v1/alertas/{id}/comentarios`, reaproveitando a fila de
  `casos_denuncia` do operador para moderação; exige bloqueio de usuário (decisão quando o módulo vier).
- **Preço-alvo.** Campo opcional novo em `ConfigAvisosProduto` (`preco_alvo_centavos`) e valor novo de
  `TipoAviso` (`preco_alvo`). As duas mudanças são aditivas.
- **Benefícios extras do premium.** Novos campos em `PlanoUsuario` e `Limites`; nada muda nos existentes.

### Decisões em aberto
Cada uma com recomendação (R) e alternativa descartada (A). Os números são citados nos YAML.
- D1. **Decidida** (DECISIONS 34): este contrato e o PRODUTO.md prevalecem sobre a linha paralela. Descartado: manter o `/v1` aprovado de lá.
- D2. Cadastro de operador. R: lista mantida por comando de linha, sem rota, no MVP. A: rota de convite (sem níveis de permissão, qualquer conta de operador comprometida criaria outras).
- D3. Validade do refresh do operador. R: 7 dias, em config. A: 60 dias como no app (a conta aprova push para a base toda).
- D4. Login social com e-mail de conta já existente. R: vincular à conta existente quando o provedor declara o e-mail verificado (campo de cada provedor a verificar). A: contas separadas (duas contas e dois premiums para a mesma pessoa).
- D5. Login social sem e-mail (`users.email` é obrigatório). R: aceitar o e-mail de retransmissão da Apple; se o provedor não entregar e-mail, recusar com `credencial_invalida`. A: tornar `users.email` opcional.
- D6. Provedor de e-mail do código. R: escolher só depois de verificar limites, termos e entrega sem domínio próprio. A linha paralela registrou Brevo, mas não verifiquei. A: nenhuma (bloqueia produção, não o desenvolvimento).
- D7. Medicamento fora do feed. R: não aparece na pesquisa, não pode ser seguido e não gera aviso na central ("só no feed, sem push"). A: pesquisável e seguível sem avisos.
- D8. Página do produto com oferta fora de cobertura. R: só ofertas cobertas para um CEP do plano, como no feed (`OfertaAtual.cobertura` obrigatório). A: mostrar todas com "não entrega no seu CEP" (exigiria `cobertura` nulo).
- D9. Premium vencido com mais CEPs que o plano. R: manter guardados e ignorar (`ceps_ignorados_pelo_plano`). A: apagar os CEPs extras.
- D10. `limite_diario: null`. R: vale um padrão do tenant em config; o responsável escolhe o valor. A: sem limite.
- D11. Política de privacidade. R: documento e versão próprios, campo aditivo `privacidade` em `/v1/configuracao`. A: só os termos.
- D12. Retenção da central de avisos. R: 90 dias (proposto), em config. A: guardar para sempre.
- D13. Imagem do produto. R: `imagem_url` opcional vinda da fonte (só https), aditivo, com coluna nova. A: sem imagem.
- D14. Link compartilhado. Os termos da Lomadee sobre link de afiliado não foram lidos. R: ler antes do app da fase 4; se proibir, criar `link_compartilhamento` (aditivo). A: redirecionador próprio (exige domínio; orçamento zero).
- D15. Marca. A Lomadee não traz marca estruturada (`products.marca` nulo). R: `marca_chave` normalizada, preenchida quando houver marca; sem marca, o produto não pode ser silenciado por marca. A: silenciar por texto livre (casaria marcas erradas).
- D16. Operador e score. R: o operador também não vê `motivo` nem score, só campos estruturados; se faltar, gravar os componentes no alerta e expor estruturado. A: mostrar o `motivo` ao operador.
- D17. Revisão de alerta. R: rejeitar depois de aprovar é permitido; aprovar depois de rejeitar não (409). A: troca livre de resultado.
- D18. Loja que passa a aprovada. R: sem efeito retroativo; a próxima coleta reavalia e a deduplicação já permite subir a decisão (DECISIONS 25). A: reavaliar os alertas na hora.
- D19. Denúncia depois de restaurar. R: ignorar novas denúncias da mesma oferta até o preço mudar. A: recomeçar a contagem na hora.
- D20. Falso positivo na triagem. R: só registrar e ajustar as listas versionadas à mão (falha fechada). A: liberar o item por exceção (risco legal).
- D21. `valida_ate` na oferta manual. R: obrigatória, com prazo máximo em config. A: opcional (oferta ficaria no feed sem fim).
- D22. Limites de taxa propostos, em config: configuração 60/min por IP, renovar 60/h por sessão, eventos 300/h, denúncias 20/dia, busca 30/min, comprovantes 10/h, exportação 1/h, dispositivo 30/h por sessão; chaves de idempotência por 24 h. R: aprovar como valores iniciais. A: um limite global único.
- D23. Estados da assinatura. O enum atual (`ativa`, `cancelada`, `expirada`, `pendente`) pode não cobrir carência, pausa e estorno das lojas. R: mapear depois de ler a documentação de cada loja; valor novo é aditivo. A: expor o estado cru de cada loja.
- D24. Excluir a conta com assinatura ativa. R: o app avisa que é preciso cancelar na loja; a API não bloqueia a exclusão. A: bloquear a exclusão (LGPD).
- D25. Atualização obrigatória do app. R: campo aditivo `versao_minima` por plataforma em `/v1/configuracao`. A: nenhum mecanismo.
- D26. Cadastro de loja, faixa de CEP e vínculo fonte → loja. Não há rota; sem faixa, a loja online não entra no feed de ninguém. R: comando de provisionamento na fase 3, rota de operador depois. A: rota já no contrato.
- D27. Tetos de config: `queda_percentual` de 5 a 90, 100 seguidos, 50 silenciamentos (exemplos do contrato). R: o responsável confirma os valores. A: sem teto.
- D28. Rede de anúncios e consentimento de anúncio personalizado. Nada escolhido nem verificado. R: anúncio não personalizado até existir consentimento próprio, separado dos termos e do push. A: personalizado por padrão.
- D29. Exigências das lojas de apps (login com Apple quando há login social, exclusão de conta, assinatura): conferir as regras vigentes antes da fase 6. R: o contrato já tem as rotas; só falta a verificação. A: nenhuma.
- D30. [decidida 2026-10-27: R, DECISIONS 35] NBCAL, produtos vedados (Lei 11.265/2006, art. 4º; Decreto 9.579/2018, art. 5º, que cita "descontos de preço" e "meios eletrônicos"; ver [docs/juridico/nbcal.md](docs/juridico/nbcal.md)). R: triagem em falha fechada, em todo produto, sobre título e descrição: fórmula infantil para lactentes e de seguimento para lactentes, fórmula para recém-nascido de alto risco, mamadeira, bico, chupeta e kit que contenha algum deles nunca aparecem (feed, pesquisa, produto, seguidos, avisos, push). A: deixar a curadoria decidir pelo desconto.
- D31. [decidida 2026-10-27: R, DECISIONS 36] NBCAL, produtos com advertência obrigatória (Decreto, art. 6º). Dois textos: "aleitamento até os 2 anos" para leites, bebidas vegetais e fórmula de seguimento para crianças na primeira infância; "após os 6 meses" para papinha e cereal infantil. Exibição em moldura, caixa alta, negrito, ≥ 20% do maior caractere, mín. 2 mm (já no esquema `Advertencia`). R: esses produtos aparecem só no feed, sem push, porque o push do sistema não cumpre a forma exigida. A: push com o texto no corpo (era o da linha paralela).
- D32. [decidida 2026-10-27: R, DECISIONS 37] Leite comum em `mercearia`. O inciso VI do art. 3º do decreto alcança todo leite fluido ou em pó e bebida vegetal, não só produto de bebê. R: a triagem marca o produto pelo tipo, em qualquer categoria, e aplica a D31. A: advertência só nas categorias de bebê (deixaria leite UHT e bebida de soja sem o texto obrigatório).
- D33. [decidida 2026-10-27: recomendações do parecer, DECISIONS 38] Pontos que a norma não resolve, para a assessoria: se o app é "promoção comercial"; composto lácteo e leite condensado; protetor de mamilo (bloqueado na linha paralela, mas ausente da lei e do decreto); fórmula para necessidades dietoterápicas; vedação também na pesquisa e na página do produto. R: falha fechada (bloquear) em tudo que estiver em dúvida até a resposta. A: liberar até a resposta. Minuta de resposta em [docs/juridico/parecer-d33-nbcal.md](docs/juridico/parecer-d33-nbcal.md), pendente de revisão por advogado.

### Inconsistências entre contrato e banco
1. `deliveries.canal` só aceita `push`: eventos de feed, central e produto, e o compartilhamento, não
   cabem; o contrato pede `alert_events`.
2. `alerts` não tem estado de revisão: `aprovado_por` é texto livre e não há rejeição.
3. `subscriptions.origem` só aceita `google_play` e não guarda o comprovante, então não há como detectar
   `comprovante_de_outra_conta`.
4. `users` não tem `apple_sub`, e `email NOT NULL` depende da D5.
5. `products.marca` é texto nulo, sem chave: `Marca.chave` não tem coluna (D15).
6. `offers.disponivel` nunca vira `false` (BACKLOG, fase 2): `situacao: encerrada`, o filtro do feed e o
   aviso "voltou ao estoque" dependem disso.
7. `offers` não tem marca de "escondida por denúncia" nem `criada_por` (oferta manual); `id_externo` é
   obrigatório e a oferta manual vai precisar de um id gerado.
8. Loja online sem `store_service_areas` não é coberta para ninguém (D26). Hoje só o seed de teste da
   fase 2 (`scripts/fase2/seed.sql`) cadastra faixas; não há caminho para cadastrar as das lojas reais.
9. `preco_referencia_centavos` e a economia da cobertura por retirada não estão em `alerts`; saem de
   `preco_referencia_por_unidade × products.quantidade`.
10. `historico_desde` fica limitado pela retenção de 180 dias de `price_history`.
11. `triagem_bloqueios` não tem resultado nem quem revisou.
12. Config do tenant sem rótulo de categoria, termos, métodos de login, limites e planos.
13. Exclusão em cascata (DECISIONS 7) precisa valer para todas as tabelas novas do usuário; a
    contagem de denúncias cai quando quem denunciou exclui a conta.

**Decisões D2–D29 respondidas (2026-10-27, DECISIONS 40–50).** Resumo: todas seguiram a recomendação, exceto
D6 (Brevo por enquanto), D7 (aguarda consulta jurídica; vale a opção restritiva), D15 (lista de marcas dos
produtos cadastrados), D20 (listas + liberação pelo operador, só para cautela e texto) e D21 (`valida_ate`
opcional, com aviso).

**Contrato ajustado às decisões (2026-10-27).** `redocly lint` dos dois arquivos: 0 erros, 0 avisos (testado
quebrando um exemplo de propósito). Mudanças:
- `openapi.yaml`: `privacidade` e `versao_minima {android, ios}` em `Configuracao` (D11, D25);
  `limites.limite_diario_padrao` (D10, exemplo 3); `ProdutoResumo.imagem_url` opcional, só https (D13);
  descrição de `marca` pela lista do tenant (D15).
- `admin.yaml`: `valida_ate` deixa de ser obrigatório no pedido da oferta manual; a resposta traz
  `validade_padrao_aplicada` (D21). Triagem: `BloqueioTriagem.liberavel`, resultado `liberado`, código de erro
  `liberacao_nao_permitida` (422) e ação de auditoria `triagem_liberada` (D20).
- Ainda sem decisão de valor: prazo padrão da oferta manual sem data (config).

**Contrato 1.0.0 APROVADO e congelado (2026-10-27, DECISIONS 51–52).** Prazo padrão da oferta manual sem data: 7 dias.

**Varredura das outras branches (2026-10-27, DECISIONS 53–56).** CEPs 1/3 mantidos; `prova` entrou (contrato
`1.1.0`); código da linha paralela será reaproveitado e adaptado; medicamento fica no feed com advertência
(RDC 96 ainda sem parecer). O que veio de lá sem decisão está no BACKLOG.

**RDC 96 (2026-10-27, DECISIONS 57).** Parecer do consultor salvo em `docs/juridico/parecer-rdc96.md`
(minuta, sem decisão ainda). Achado do código: a Lomadee não envia GTIN, então nenhum isento sobe pelo
caminho "feed com advertência" e o medicamento mal categorizado passa como produto comum.

**Medicamento desligado e trava por substância (2026-10-27, DECISIONS 58).** `medicamentos.modo = "desligado"`
no tenant padrão (a carga recusa outro valor); `MEDICAMENTO_DESLIGADO` e trava RF-12 em
`backend/src/normalizador/medicamentos.ts`; 171 testes passando (`npm test`), `tsc --noEmit` limpo; mutação
conferida (sem a trava, 7 testes falham; sem o desligado, 2). `scripts/pronto-fase2.sh` não foi executado
(sem Docker/Postgres neste ambiente); os dados gravados não mudam de resultado. Documentos para terceiros:
`docs/juridico/religar-medicamento.md`, `consulta-anvisa-minuta.md` (não enviada) e `resumo-advogado-rdc96.md`.

**Parecer da Anvisa (2026-10-27, DECISIONS 59).** Salvo em `docs/juridico/parecer-anvisa.md` (minuta, sem
decisão). Recomenda manter medicamento desligado (já é a decisão 58); sem precedente sobre comparadores;
consulta formal pronta para revisão OAB, mas o projeto ainda não tem CNPJ. A equipe conferiu no texto
oficial o art. 53 da RDC 44, a Lei 15.357 e a nota de 19/08/2026.

## Fontes múltiplas e credenciais (2026-10-28, DECISIONS 61)

O responsável tem login e chave de API da Lomadee e quer habilitar outros canais além dela. Feito (sem a chave, que
nunca passou pelo chat): registro de adaptadores, config genérica por fonte, `coletar --todas`, credenciais cifradas
no banco com comando de gravação que lê o ambiente, HTTP real seguro. `pronto-fase2.sh` ganhou `PRONTO_PG_URL`
e foi **rodado inteiro** com o código novo (9 condições e 193 testes, PRONTA); `pronto-fase3.sh` ganhou o passo 3b
(segredo não aparece na saída nem em claro no banco, chave errada não decifra, `--todas` isola a falha de uma fonte;
mutação conferida). Guia: `docs/operacao/fontes.md`.

**Correção importante (2026-10-28, DECISIONS 62).** O adaptador da Lomadee mirava uma API antiga (`api.lomadee.com`, token
na URL), que não responde. Reescrito para a API de afiliados atual (`api.lomadee.com.br`, `x-api-key`, produtos com `ean` e
preço em centavos), com os dados de teste convertidos. 209 testes; `pronto-fase2.sh` (PRONTA) e `pronto-fase3.sh` (PRONTO)
rodados. A rede do ambiente já está em "Total".

**Chave da Lomadee (DECISIONS 63):** vai em **Segredos de rede** do ambiente de nuvem (o proxy anexa `x-api-key`; a sessão não vê a chave) e a coleta usa `--chave-pelo-proxy`; confirmado que `api.lomadee.com.br` responde (`401 API key is required` sem chave).

**Primeira coleta real da Lomadee (2026-10-28, DECISIONS 64).** A chave (segredo de rede) funcionou já na mesma sessão. Lidas as 134
marcas da conta (Drogasil e Droga Raia não estão) e coletados 1.739 produtos de Drogasmil e PromoFarma em 50 s: 0 ilegíveis, 0
erros, 705 bloqueados pela triagem (611 sem referência da CMED, 57 termos de venda controlada, 34 NBCAL vedado, 3 cautela), 267
em categoria sem mapa, 767 como oferta (todas descartadas: sem 14 dias de histórico). O formato real diferia da documentação
(preço em reais, sem `count`, categorias no produto) e o adaptador foi corrigido; 214 testes; Fases 2 e 3 passando.

**Lista de medicamentos da CMED convertida (2026-10-28, DECISIONS 65).** Conversor de .xlsx (`fflate`) + `scripts/atualizar-listas-medicamentos.sh`;
26.635 linhas → 27.731 códigos de barras, 1.917 isentos, 353 substâncias controladas, em 4 s. Com ela, a coleta real da Lomadee
(1.739 produtos) bloqueia 727 itens: 256 sem referência, 221 de receita, 115 isentos (modo desligado), 57 venda controlada,
41 substância controlada, 37 NBCAL. 71% dos itens de categoria "medicamento" casam por código; o resto continua bloqueado.
232 testes; Fases 2 e 3 passando. Funciona para qualquer farmácia (identifica pelo código de barras).

**Falta para a Lomadee ir ao ar** (BACKLOG): cadastrar o segredo de rede, ler os termos,
primeira chamada real (achar as marcas, guardar uma resposta), ligar o link rastreado, vínculo das lojas. **Outros canais**: dizer quais contas existem; cada um precisa de
termos lidos e de um adaptador (a mesma chave da Lomadee já dá acesso a outras lojas da rede dela).

**Pacote para rodar no computador do responsável (2026-10-28, DECISIONS 66).** O histórico de 14 dias só começa quando algo coleta sem parar,
então a coleta agora roda sozinha a cada 2 horas: `pipeline/ciclo.ts` (coleta todas as fontes ativas, mantém a lista da CMED em dia,
tenta de novo em 15 min se o ciclo nem coletou), `pipeline/provisionar.ts` (cria fonte e lojas a partir de `config/vinculos/`; idempotente),
`pipeline/status.ts` (diz em português quantos dias de histórico já existem), `credencial --pedir` (a chave é digitada/colada sem aparecer),
serviços `provisionar` e `coletor` no compose, `scripts/windows/instalar.bat` e `status.bat`, guia `docs/operacao/instalar-no-seu-computador.md`.
Conferido: 263 testes; `pronto-fase3.sh` (novo passo 3c: provisão, status, `--pedir` sem terminal, ciclo com parada limpa) e `pronto-fase2.sh`
passando; coleta real da Drogasmil e PromoFarma em banco provisionado (1.739 itens; 762 ofertas guardadas, 727 barradas). **Não conferido:** `docker compose up` de
verdade e os `.bat` num Windows (o ambiente não tem o motor do Docker nem Windows); a primeira execução no computador do responsável é o teste.
**Próximo passo imediato:** responsável instala o Docker Desktop e roda `instalar.bat`; depois `status.bat` mostra os dias de histórico. Em paralelo,
a parte 2 da fase 3 (servidor da API) segue como planejado abaixo.

**Link rastreado e decisão de seguir sem a Lomadee (2026-10-28, DECISIONS 67 e 68).** Termos e política lidos (`docs/juridico/lomadee-termos.md`): permitem app
como canal, exigem link rastreado, proíbem vantagem por clique, têm exclusividade com as marcas e cancelamento sem motivo, e não tratam de guardar preços nem
da API. O responsável decidiu seguir sem esperar resposta. Pronto: migration 0004 (`offers.link_rastreado`), `fontes/lomadeeLinks.ts` (encurtador, valida o
domínio devolvido), `links/linkRastreado.ts` (gera e guarda na primeira vez), `HttpReal.post`; 276 testes; fases 2 e 3 passando. **Bloqueio:** a conta da
Lomadee não tem canal cadastrado, então o encurtador devolve lista vazia; falta o responsável criar um canal do tipo aplicativo. Próximo: parte 2 da fase 3
(servidor da API) usando `linkRastreadoDaOferta` na saída da oferta.

## Fase 3, parte 1: banco e critério de pronto (2026-10-27, PRONTA)

**Critério de pronto:** `./scripts/pronto-fase3.sh` (docker compose, como as fases anteriores; sem Docker,
`PRONTO_PG_URL=postgres://usuario@host:porta ./scripts/pronto-fase3.sh` aponta para um Postgres 16). Confere:
1. as migrations 0001 a 0003 pelo runner do projeto;
2. 35 verificações do esquema (`scripts/fase3/esquema.sql`): exclusão de conta em cascata, isolamento entre
   tenants, sessão de uma só audiência, aparelho preso à sessão, restrições dos enums do contrato, busca sem
   acento, unicidades (silenciamento, seguido, caso de denúncia, apple_sub, transação de assinatura);
3. a migration 0003 sobre dados da fase 2 (`scripts/fase3/legado.sql`): alerta já aprovado vira `aprovado`,
   aguardando vira `pendente`;
4. lint do contrato (app e operador); 5. `npm test` (171 testes).

Rodado aqui contra Postgres 16.15 local (sem Docker). Mutação conferida: tirar a cascata de `silenciamentos` e
tirar o backfill de `pendente` fazem o critério falhar. Detalhes de desenho: DECISIONS 60.

**Falta na fase 3 (próximas partes, nesta ordem):**
1. servidor da API (Fastify) gerando rotas do contrato, tenant, erros, `Cache-Control`/`Vary`, limites de taxa;
2. autenticação: código por e-mail (Brevo; Redis para código e limites), Google, sessão e renovação, operador;
3. `me`, consentimentos, exportação, exclusão; preferências; silenciamentos;
4. feed, detalhe, eventos, avaliação, denúncia; produtos, histórico, seguidos;
5. admin: alertas, lojas, fontes, denúncias, triagem, produtos, auditoria;
6. comandos de linha: operador e provisionamento de loja e faixa de CEP (D26).
Reaproveitar da linha paralela (`claude/determined-meitner-8zeag7`): código de e-mail, Google, sessões e push, adaptando ao contrato.
`pronto-fase3.sh` cresce a cada parte.

**Próximo passo:** parte 2 da fase 3, o servidor da API com as rotas públicas (`/v1/configuracao`) e a base de tenant e erro.

## Fase 3 — rascunho 1 (SUPERADO pelo rascunho 2 onde diverge)

**Atualização (2026-10-27):** a conversa de produto com o responsável ampliou o escopo (superapp:
seguir produto, pesquisa, listas de presente, iPhone, premium, anúncios). O que o app faz agora está em
[PRODUTO.md](PRODUTO.md). O rascunho abaixo foi escrito ANTES disso e fica superado nos pontos em que
divergir; o prompt para refazer o contrato é [PROMPT_CONTRATO.md](PROMPT_CONTRATO.md). Login passa a
ser e-mail + Google + Apple (Apple só com o app de iPhone); feed esconde alerta aguardando aprovação.

Nada implementado ainda. Entregue só o rascunho do contrato: `backend/openapi/openapi.yaml`
(OpenAPI 3.1, validado com Redocly; 15 operações em `/v1`). Regra da fase: o contrato congelado precisa
de aprovação antes de qualquer rota ou tela.

**Proposta L1 — login por código de 6 dígitos enviado por e-mail** (fecha o item `[fase 0]` do BACKLOG).
- Fluxo: `POST /v1/auth/email/codigo` → `POST /v1/auth/email/verificar` → sessão. A conta nasce no
  primeiro código válido (tabela `users` já tem `email` único por tenant).
- Código guardado só como HMAC no Redis, TTL 10 min, 5 tentativas, 1 pedido/60 s e 5/h por e-mail,
  20/h por IP. Resposta de pedido é sempre 202 (não revela quem tem conta).
- Descartado: **link mágico**. No Android abrir o link dentro do app exige App Links (arquivo
  `assetlinks.json` servido em HTTPS por um domínio nosso) e o link costuma abrir no navegador errado;
  com orçamento zero e sem domínio definido, o código é mais simples e não depende de nada fora do app.
- Descartado por ora: **Google Sign-In**. É melhor para o usuário e não exige envio de e-mail, mas
  precisa de cliente OAuth e da impressão digital do app. Entra depois como endpoint aditivo
  (`users.google_sub` já existe), sem quebrar o contrato.

**Proposta L2 — sessão com tokens opacos, sem JWT.** Access token de 1 h e refresh de 60 dias, ambos
aleatórios de 256 bits, guardados só como hash em tabela `sessions` (migration 0003). Refresh de uso
único com detecção de reuso (reuso revoga a sessão inteira). Motivo: revogação imediata (sair, excluir
conta, token roubado) sem lista de bloqueio; uma consulta por requisição é aceitável no volume do MVP.
Descartado: JWT (revogar antes de expirar exige o mesmo estado no servidor).

**Proposta L3 — tenant.** Rotas públicas (`/v1/configuracao`, `/v1/auth/email/*`) recebem `X-Tenant`
(slug, definido pelo flavor do app). Rota autenticada tira o tenant do token e ignora o cabeçalho.

**Proposta L4 — termos antes de tudo (LGPD).** Até aceitar a versão vigente dos termos, só `/v1/me*` e
`/v1/auth/*` respondem; o resto dá 403 `termos_pendentes`. Aceite de termos e consentimento de
notificação são campos separados (como já está em `users`).

**Proposta L5 — o recurso do app é o alerta.** O feed (`GET /v1/alertas`) lista alertas `notificar`,
`aguardar_aprovacao` e `somente_feed` com oferta ainda disponível e válida, na categoria escolhida e
coberta para algum CEP do usuário (usa `verificarCobertura`). `descartar` nunca aparece. Medicamento
sai com `avisos` preenchido (RDC 96/2008, texto a validar com assessoria jurídica).

**Proposta L6 — `alerts.motivo` não vai para o app.** O texto atual é de auditoria ("Aprovada para
notificação", "R$ 5,00/kg → R$ 3,50/kg"). O contrato expõe campos estruturados (`queda`, preços,
`rotulo_condicao`, `entrega_a_confirmar`) e o app redige a frase. Protetor em R$/l (BACKLOG) fica
resolvido: o app mostra `preco_centavos` da embalagem; preço por unidade é só para comparação.

**O que o contrato inclui:** configuração pública, 4 rotas de autenticação/sessão, conta (consultar,
excluir com confirmação, consentimentos), preferências (GET/PUT inteiro), feed paginado por cursor,
detalhe com histórico de 30 dias, eventos de abertura/clique, registro de token de push (fase 4).
**Fica de fora, de propósito:** superfície administrativa (aprovar alerta/loja, oferta manual TIPO E),
validação de compra do Google Play (fase 6), exportação de dados do titular.

**Perguntas abertas para o responsável**
1. Aprova o contrato como está, ou o que muda? (Lembrete: depois de aprovado, mudança incompatível
   vira `/v2`.)
2. Confirma L1 (código por e-mail) como login do MVP, com Google Sign-In depois?
3. Provedor de envio de e-mail: nenhum escolhido. Precisa ter camada gratuita e entregar sem domínio
   próprio. **Não verifiquei limites nem preços de nenhum provedor**; ver antes de escolher. A
   implementação começa com uma interface `EmailSender` e uma versão que só escreve o código no log,
   então esta pergunta não bloqueia o desenvolvimento, só a ida para produção.
4. Premium: o contrato só diz que mais de 1 CEP exige premium (3 no máximo, regra já comentada em
   `user_preferences`). Há outros limites do plano gratuito (pushes por dia, categorias)? Se houver,
   precisam entrar em `limites` da configuração.
5. O feed deve mostrar também alertas `aguardar_aprovacao` (fonte de baixa confiabilidade) antes da
   aprovação humana? O comentário em `tipos.ts` diz que sim; sem a superfície administrativa, ficariam
   no feed sem ninguém para aprovar. Minha sugestão: não mostrar até existir a aprovação.

**Pontos que o contrato força na implementação (já anotados)**
- Marcar oferta indisponível quando some da coleta (BACKLOG, fase 2). Só depois de coleta completa da
  fonte: página que falha no meio não pode zerar o feed.
- `categorias[].rotulo` precisa entrar no config do tenant (hoje só há o slug).
- `deliveries.canal` hoje só aceita `push`; eventos de clique no feed (`origem: feed`) exigem
  `'feed'` no CHECK.
- Cobertura de loja física precisa da economia em centavos, que `alerts` não guarda (só preço por
  unidade); calcular da quantidade do produto. Loja física só vale com CEP → coordenada (fase 5); até lá
  só entrega por faixa de CEP.

**Plano depois da aprovação:** migration 0003 (`sessions`, `deliveries.canal`, rótulo de categoria,
tabela de dispositivos na fase 4) → autenticação e sessão → preferências → feed e detalhe →
marcação de oferta indisponível → `scripts/pronto-fase3.sh` (sobe a API, percorre login, preferências
e feed contra o banco semeado pela fase 2, e valida as respostas contra o OpenAPI).

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
