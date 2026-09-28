# Checkpoint

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
