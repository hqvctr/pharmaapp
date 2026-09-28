# Decisões de arquitetura

Uma linha por decisão, com a alternativa descartada. Não reabrir sem fato novo.

| # | Fase | Decisão | Alternativa descartada |
|---|------|---------|------------------------|
| 1 | 0 | Monorepo: `backend/` (Node/TS) e, na fase 4, `android/`. | Repositórios separados (contrato OpenAPI teria que ser sincronizado entre repos). |
| 2 | 0 | Fastify 5 como servidor HTTP; testes via `app.inject`, sem abrir socket. | Express (sem injeção nativa de requisição; teste precisaria de porta real ou supertest). |
| 3 | 0 | Runner de migration próprio (~50 linhas) sobre arquivos `.sql` puros, com advisory lock. | node-pg-migrate / Prisma / Knex (dependência a mais para um problema pequeno; SQL puro é mais auditável). |
| 4 | 0 | Chaves estrangeiras compostas `(tenant_id, id)`: o banco recusa referência cruzada entre tenants. | FK simples por `id` (isolamento dependeria só da disciplina das queries). |
| 5 | 0 | Dinheiro em centavos inteiros; preço por unidade em `numeric(14,4)`. | `float`/`numeric` em reais (erro de arredondamento em soma e mediana). |
| 6 | 0 | Coordenada em `numeric(9,6)` e distância por haversine na aplicação. | PostGIS (imagem maior e extensão a manter; volume do MVP não exige índice espacial). |
| 7 | 0 | Exclusão de conta apaga em cascata preferências, entregas e assinaturas. | Anonimização (mais complexa; métricas agregadas podem ser recalculadas antes da exclusão, se necessário). |
| 8 | 0 | Vitest 3.2.4 e TypeScript 5.9.3 (linhas maduras). | Vitest 5 e TypeScript 7 (majors recentes; risco de ciclo de erro sem ganho para o MVP). |
| 9 | 0 | Serviços coletor/normalizador/avaliador/despachante entram no compose na fase em que existirem. | Subir contêineres vazios desde a fase 0 (preparação especulativa). |
