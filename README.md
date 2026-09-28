# Alertas de Promoção

App Android + backend próprio que notifica só promoção comprovadamente excepcional, nas categorias
escolhidas, de loja confiável e que chega (ou está perto) do CEP do usuário.

Estado atual e próximo passo: veja [CHECKPOINT.md](CHECKPOINT.md).
Decisões já tomadas: [DECISIONS.md](DECISIONS.md). Pendências fora de fase: [BACKLOG.md](BACKLOG.md).
Fontes e base legal: [SOURCES.md](SOURCES.md).

## Rodar em desenvolvimento

Pré-requisitos: Docker com Compose v2, Node 22.22.2.

```bash
cp .env.example .env          # defina POSTGRES_PASSWORD
docker compose up -d --build --wait
curl http://127.0.0.1:3000/health
(cd backend && npm ci && npm test)
```

Critério de pronto de cada fase: `scripts/pronto-faseN.sh`.

## Estrutura

```
backend/
  migrations/        SQL puro, aplicado em ordem pelo serviço `migrate`
  config/tenants/    configuração de negócio por tenant (limiares, pesos, categorias)
  fixtures/          casos versionados do motor de curadoria e da cobertura
  src/api/           servidor HTTP (Fastify)
  src/curadoria/     motor de curadoria e cobertura (módulo puro)
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
