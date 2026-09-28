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
| 10 | 1 | Toda comparação de preço é feita em preço por unidade de medida, sempre, não só em categorias marcadas. Com embalagem igual é idêntico ao preço absoluto. | Flag `embalagemVariavel` por categoria (config a mais e risco de categoria mal marcada). |
| 11 | 1 | Histórico é agrupado por `familia_chave` (marca + nome, sem embalagem) + loja, para que embalagens diferentes do mesmo produto se comparem por unidade. | Histórico por `product_id` (embalagem nova começaria sem histórico e a "reduflação" passaria despercebida). |
| 12 | 1 | [confirmada 2026-09-28] Oferta condicional é avaliada pelo preço efetivo por unidade (leve 3 pague 2 → 2/3 do preço); a economia é a da compra mínima exigida; o rótulo da condição é campo obrigatório do resultado. | Descartar toda oferta condicional (perde promoção real de farmácia/mercado). |
| 13 | 1 | [confirmada 2026-09-28] Regra 4 (subida pré-queda): maior preço dos 15 dias anteriores contra a mediana dos 30 dias antes deles; sem essa base, maior alta acumulada dentro da janela. | Maior alta acumulada pura (barraria toda promoção logo após o fim de outra promoção). |
| 14 | 1 | [confirmada 2026-09-28] Decisões possíveis: `notificar`, `aguardar_aprovacao` (fonte abaixo da confiabilidade mínima), `somente_feed` (loja em observação ou score < 70), `descartar` (qualquer condição 1–8 falhou ou loja bloqueada). | Feed com toda oferta coletada (o feed viraria o spam que o app promete evitar). |
| 15 | 1 | Score = 100 × (0,40·queda + 0,20·piso + 0,25·raridade + 0,15·reputação), pesos e escalas em config por tenant. | Score só pela queda (ignoraria raridade e reputação pedidas na especificação). |
| 16 | 1 | Frete (condição 7) é checado no motor quando a fonte informa; deslocamento até loja física é checado na cobertura, por usuário (ida e volta × custo/km em config). | Deslocamento no motor (depende da localização de cada usuário; o motor avalia a oferta, não a audiência). |
| 17 | 1 | [confirmada 2026-09-28] Perecível tem categoria própria (`pereciveis`, limiar 35%) em vez de flag por produto. | Flag `perecivel` por produto (especificação pede configuração por categoria). |
| 18 | 2 | Nome do app: **economae** (provisório; nome só em config e flavor, nunca espalhado no código). | — |
| 19 | 2 | Região inicial: estado de São Paulo (CEPs 01000-000 a 19999-999). | Uma cidade só (Ribeirão Preto): cobertura menor para fonte TIPO A nacional. |
| 20 | 2 | Fonte TIPO A inicial: Mercado Livre. | Amazon (API condicionada a vendas prévias), Awin/Rakuten (aprovação por anunciante). |
