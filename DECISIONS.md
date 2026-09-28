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
| 21 | 2 | Orçamento zero: só serviços com camada gratuita; nada de API paga (ex.: Google Geocoding). Postgres e Redis rodam no mesmo host, sem serviço gerenciado. | Serviços gerenciados pagos. |
| 22 | 2 | [aprovada] P2 — credencial por fonte e por tenant, cifrada no Postgres (AES-256-GCM, `node:crypto`), renovação sob lock, apps separados para dev e produção. Implementação junto com a primeira API vinculada. | Variável de ambiente global com refresh token (quebra com multi-tenant e com token de uso único). |
| 23 | 2 | [aprovada] P3 — CEP → coordenada pelo CEP Aberto, depois de ler os termos; cache por CEP; necessário só com loja física. | Google Geocoding (pago; termos restringem cache). |
| 24 | 2 | [aprovada] P4 — triagem de medicamento em todo produto, falha fechada; bloqueia também promoção por quantidade em isento de prescrição (RDC 96/2008). | Bloqueio só na categoria de medicamentos. |
| 25 | 2 | [aprovada] P5 — deduplicação por (tenant, família, loja): novo alerta só com queda adicional de 5%, subida de decisão, ou promoção anterior encerrada. | Renotificar a cada 7 dias (promoção longa viraria spam). |
| 26 | 2 | [aprovada] Fonte TIPO A da fase 2: Lomadee (Drogasil e Droga Raia; API de ofertas e de deeplink). Mercado Livre vira segunda fonte TIPO A, para mercearia e limpeza. | Mercado Livre primeiro (fraco em farmácia, busca com 403, sem API de afiliado). |
| 27 | 2 | [aprovada] P1 — "14 observações" = 14 dias com observação; histórico grava a primeira observação do dia e toda mudança; motor recebe o menor preço por unidade de cada dia fechado (fuso do tenant). | Contar cada coleta como observação (histórico mínimo em ~1 dia com coleta a cada 2 h). |
| 28 | 2 | [aprovada] Medicamento aparece só no feed, sem push, até validação jurídica (`medicamentos.notificar = false` por tenant). | Notificar medicamento isento desde o lançamento. |
| 29 | 2 | [aprovada] Oferta manual (TIPO E) sem histórico entra no feed como "sem histórico verificado" e nunca notifica. Implementação na fase 5. | Exigir 14 dias também para a entrada manual (TIPO E perderia a função). |
| 30 | 2 | Fase 2 roda coletor, normalizador e avaliador como módulos separados num único processo, por comando. Fila no Redis entra quando os estágios precisarem rodar em processos separados (despachante, fase 4). | Fila Redis entre estágios desde já (infra sem necessidade medida). |
| 31 | 2 | Oferta é uma linha por (fonte, id externo), atualizada a cada coleta; o alerta guarda cópia de preço, referência e condição para auditoria. | Uma linha de oferta por coleta (duplica o que price_history já guarda). |
| 32 | 2 | Sem GTIN na fonte, embalagem vem do título (mg nunca é conteúdo); família = título sem embalagem. | Exigir GTIN (Lomadee não fornece; nenhuma oferta passaria). |
| 33 | 2 | Categoria da fonte fora do mapa do tenant é ignorada; a triagem de medicamento roda antes, para registrar remédio em categoria não mapeada. | Categoria padrão para não mapeadas (produto fora de escopo viraria alerta). |
| 34 | 3 | Login por código de 6 dígitos no e-mail, mais login com Google (ID token verificado com `node:crypto`). | Link mágico (exige App Links num domínio verificado e falha quando o e-mail é aberto em outro aparelho). |
| 35 | 3 | Sessão por token opaco de 256 bits, só o SHA-256 no banco; validade deslizante de 90 dias (config). | JWT (não revoga sem lista de bloqueio; logout e exclusão de conta precisam valer na hora). |
| 36 | 3 | Contrato OpenAPI gerado dos mesmos esquemas JSON que validam a requisição e serializam a resposta; `openapi/v1.json` versionado e comparado no teste. | YAML escrito à mão (diverge do servidor sem ninguém notar). |
| 37 | 3 | Tenant pelo cabeçalho `X-Tenant` (slug fixo no build do app); a sessão só vale no tenant que a criou. | Subdomínio por tenant (DNS e certificado por cliente). |
| 38 | 3 | Preferências, feed e detalhe exigem a versão vigente dos termos aceita; consentimento de notificação é outro registro, revogável. | Aceite implícito no cadastro (LGPD pede consentimento destacado). |
| 39 | 3 | Feed = uma entrada por oferta (último alerta), com última decisão ≠ descartar, disponível, na validade, coletada nas últimas 6 h, loja e fonte não bloqueadas, entrega por faixa de CEP para um CEP do usuário. Mais recentes primeiro, cursor opaco. | Listar alertas (a mesma oferta repetiria e promoção encerrada ficaria no feed). |
| 40 | 3 | Oferta ausente de uma coleta completa vira indisponível; coleta cortada por `maxPaginas` não marca nada. | Só a idade da coleta (oferta encerrada ficaria até 6 h no feed). |
| 41 | 3 | A API mostra preço por embalagem (anunciado, efetivo sob a condição e referência convertida para a mesma embalagem); preço por unidade só como apoio. | Preço por unidade como principal (R$ 1.598,00/l confunde). |
| 42 | 3 | Limites do login: pedidos por e-mail no Postgres (5/h), por IP no Redis (20/h), 5 tentativas por código, só o código mais recente vale, código guardado como HMAC. | Captcha (serviço externo e atrito no app). |
| 43 | 3 | Plano gratuito 1 CEP, premium 3 (config); CEP fora da região do tenant é recusado; vencido o premium, o feed usa só os CEPs que o plano permite, sem apagar os outros. | Apagar CEPs extras ao vencer o premium (perde a preferência ao renovar). |
