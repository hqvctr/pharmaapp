# economae — alertas de promoção

App Android + backend próprio para mães, da gestação aos primeiros anos do bebê: notifica só promoção
comprovadamente excepcional de fraldas, higiene, alimentação infantil e gestação, de loja confiável e que
chega (ou está perto) do CEP do usuário. Medicamentos e produtos cuja promoção a NBCAL veda não entram.

Estado atual e próximo passo: veja [CHECKPOINT.md](CHECKPOINT.md).
Decisões já tomadas: [DECISIONS.md](DECISIONS.md). Pendências fora de fase: [BACKLOG.md](BACKLOG.md).
Fontes e base legal: [SOURCES.md](SOURCES.md). Termos e privacidade: [docs/juridico](docs/juridico/termos-e-privacidade.md).

## Rodar em desenvolvimento

Pré-requisitos: Docker com Compose v2, Node 22.22.2.

```bash
cp .env.example .env          # defina POSTGRES_PASSWORD e AUTH_CODIGO_CHAVE
docker compose up -d --build --wait
curl http://127.0.0.1:3000/health
(cd backend && npm ci && npm test)
```

Os testes de integração da API rodam só com `TEST_DATABASE_URL` apontando para um banco cujo nome
termina em `_teste` (o esquema é apagado); `scripts/pronto-fase3.sh` faz isso sozinho.

## API

Contrato: [backend/openapi/v1.json](backend/openapi/v1.json), gerado de `backend/src/api/v1/definicoes.ts`
por `npm run contrato`. O teste falha se o arquivo divergir do código; toda mudança de rota aparece no
diff do contrato. A versão aprovada (1.0.0) está congelada em `backend/openapi/v1-aprovado.json`: o
teste também falha se o contrato atual quebrar algo dela. A v1 só cresce por acréscimo. Toda requisição leva `X-Tenant: <slug>`; as autenticadas, `Authorization: Bearer <token>`.

Login em desenvolvimento: `POST /v1/auth/email/codigo` e o código aparece no log da API
(`EMAIL_MODO=log`, recusado em produção). Produção: `EMAIL_MODO=brevo` (ver
[docs/operacao/google-cloud.md](docs/operacao/google-cloud.md)). Atrás de proxy reverso, `TRUST_PROXY=true`.

Critério de pronto de cada fase: `scripts/pronto-faseN.sh`.

## App Android

Pré-requisitos: JDK 17 ou mais novo e o SDK do Android (Android Studio instala os dois).

```bash
cd android
./gradlew :app:testDebugUnitTest   # testes JVM, inclui os modelos conferidos contra o contrato
./gradlew :app:assembleDebug       # APK em app/build/outputs/apk/debug/
```

O build de debug fala com o backend local: no emulador, `http://10.0.2.2:3000/`; em outro endereço,
`./gradlew :app:assembleDebug -Peconomae.apiUrl=http://<ip>:3000/`. Login com Google e push precisam
dos passos 4 e 5 de [docs/operacao/google-cloud.md](docs/operacao/google-cloud.md) (cliente OAuth
Android e `app/google-services.json`, que fica fora do git). Sem eles o app funciona com login por
código e sem notificações.

Push no backend: `node backend/dist/push/despachar.js --tenant economae`, depois de cada coleta.
Em desenvolvimento (`FCM_MODO=log`) as notificações saem no log.

## Estrutura

```
backend/
  migrations/        SQL puro, aplicado em ordem pelo serviço `migrate`
  config/tenants/    configuração de negócio por tenant (limiares, pesos, categorias)
  fixtures/          casos do motor (com config própria), gravações da Lomadee, listas de teste
  openapi/           contrato v1 gerado (não editar à mão)
  src/api/           servidor HTTP (Fastify); v1/ tem rotas, esquemas e handlers
  src/auth/          código por e-mail, sessão, ID token do Google, limite de taxa
  src/curadoria/     motor de curadoria e cobertura (módulo puro)
  src/fontes/        contrato SourceAdapter e adaptadores (Lomadee)
  src/normalizador/  embalagem, chaves de produto, triagem de medicamento e da NBCAL
  src/avaliador/     histórico diário e deduplicação de alerta
  src/pipeline/      coleta ponta a ponta e SQL
  src/db/            runner de migration
  src/shared/        leitura de ambiente
  src/push/          despacho de push (regras, FCM, SQL)
android/             app Android (Kotlin, Compose), módulo único app/
docs/                operação (Google Cloud, Brevo, prompt do Cowork) e requisitos jurídicos
docker-compose.yml   postgres, redis, migrate, api
```

## Subir um cliente novo (tenant)

Passos disponíveis até agora (a lista cresce a cada fase):

1. Inserir o tenant: `INSERT INTO tenants (slug, nome) VALUES ('<slug>', '<nome>');`
   O slug aceita apenas `a-z`, `0-9` e `-`.
2. Copiar `backend/config/tenants/economae.json` para `backend/config/tenants/<slug>.json` e ajustar
   limiares, pesos do score, categorias e raio/custo de deslocamento. Para validar o arquivo novo,
   chamar `carregarConfigTenant('<slug>')` (a API faz isso no primeiro pedido do tenant e falha alto se
   algo estiver errado).
3. No mesmo arquivo, ajustar `medicamentos` e `fontes` (mapa de categorias da fonte para as do app).
4. Cadastrar fontes (`sources`), lojas aprovadas (`stores` + `store_service_areas`) e o vínculo
   fonte → loja (`store_source_refs`). Modelo em `scripts/fase2/seed.sql`.
5. No bloco `nbcal`: termos que bloqueiam a oferta, categorias que exigem a advertência e o texto dela.
   No bloco `medicamentos`, `exibir: false` tira todo medicamento do app.
6. No bloco `app`: nome, versão e URL dos termos e da política de privacidade, rótulo de cada categoria
   (a API recusa o tenant se faltar rótulo), faixas de CEP da região, CEPs por plano, limites do feed e do login. Para login com
   Google, pôr em `app.auth.googleClientIds` o client ID Web que o app usa como `serverClientId`.
7. O app do tenant envia o slug no cabeçalho `X-Tenant`. Reiniciar a API depois de mudar o JSON.
