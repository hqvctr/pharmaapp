# economae — alertas de promoção

App Android + backend próprio que notifica só promoção comprovadamente excepcional, nas categorias
escolhidas, de loja confiável e que chega (ou está perto) do CEP do usuário.

Estado atual e próximo passo: veja [CHECKPOINT.md](CHECKPOINT.md).
Decisões já tomadas: [DECISIONS.md](DECISIONS.md). Pendências fora de fase: [BACKLOG.md](BACKLOG.md).
Fontes e base legal: [SOURCES.md](SOURCES.md).

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
diff do contrato. Toda requisição leva `X-Tenant: <slug>`; as autenticadas, `Authorization: Bearer <token>`.

Login em desenvolvimento: `POST /v1/auth/email/codigo` e o código aparece no log da API
(`EMAIL_MODO=log`, recusado em produção). Atrás de proxy reverso, `TRUST_PROXY=true`.

Critério de pronto de cada fase: `scripts/pronto-faseN.sh`.

## Estrutura

```
backend/
  migrations/        SQL puro, aplicado em ordem pelo serviço `migrate`
  config/tenants/    configuração de negócio por tenant (limiares, pesos, categorias)
  fixtures/          casos versionados do motor de curadoria e da cobertura
  openapi/           contrato v1 gerado (não editar à mão)
  src/api/           servidor HTTP (Fastify); v1/ tem rotas, esquemas e handlers
  src/auth/          código por e-mail, sessão, ID token do Google, limite de taxa
  src/curadoria/     motor de curadoria e cobertura (módulo puro)
  src/fontes/        contrato SourceAdapter e adaptadores (Lomadee)
  src/normalizador/  embalagem, chaves de produto, triagem de medicamento
  src/avaliador/     histórico diário e deduplicação de alerta
  src/pipeline/      coleta ponta a ponta e SQL
  src/db/            runner de migration
  src/shared/        leitura de ambiente
docker-compose.yml   postgres, redis, migrate, api
```

## Subir um cliente novo (tenant)

Passos disponíveis até agora (a lista cresce a cada fase):

1. Inserir o tenant: `INSERT INTO tenants (slug, nome) VALUES ('<slug>', '<nome>');`
   O slug aceita apenas `a-z`, `0-9` e `-`.
2. Copiar `backend/config/tenants/padrao.json` para `backend/config/tenants/<slug>.json` e ajustar
   limiares, pesos do score, categorias e raio/custo de deslocamento. Rodar `./scripts/pronto-fase1.sh`
   continua validando o arquivo padrão; para validar o novo, trocar o caminho no teste ou chamar
   `validarConfigCuradoria` sobre ele.
3. No mesmo arquivo, ajustar `medicamentos` e `fontes` (mapa de categorias da fonte para as do app).
4. Cadastrar fontes (`sources`), lojas aprovadas (`stores` + `store_service_areas`) e o vínculo
   fonte → loja (`store_source_refs`). Modelo em `scripts/fase2/seed.sql`.
5. No bloco `app`: nome, versão e URL dos termos, rótulo de cada categoria (a API recusa subir se
   faltar rótulo), faixas de CEP da região, CEPs por plano, limites do feed e do login. Para login com
   Google, pôr em `app.auth.googleClientIds` o client ID Web que o app usa como `serverClientId`.
6. O app do tenant envia o slug no cabeçalho `X-Tenant`. Reiniciar a API depois de mudar o JSON.
