# Prompt: contrato OpenAPI do núcleo

Cole o texto abaixo numa sessão de trabalho. Ele depende de PRODUTO.md.

````text
Você vai escrever o contrato OpenAPI 3.1 do NÚCLEO do "economae", um superapp de compras (Android e
iPhone) que só avisa promoção comprovadamente excepcional. Nenhuma rota, migration ou tela será
escrita antes de uma pessoa aprovar o contrato.

## Leia primeiro, nesta ordem
PRODUTO.md (fonte de verdade do que o app faz), DECISIONS.md (não reabrir), CHECKPOINT.md, BACKLOG.md,
SOURCES.md, backend/migrations/*.sql, backend/config/tenants/padrao.json,
backend/src/curadoria/tipos.ts e cobertura.ts, e o rascunho backend/openapi/openapi.yaml.
Parta do rascunho e do PRODUTO.md; onde divergirem, o PRODUTO.md vence.

## Escopo
Cubra o NÚCLEO descrito em PRODUTO.md (itens 1 a 11). Os módulos do "Mapa dos módulos futuros" NÃO
recebem rota; apenas garanta que nada do núcleo os impeça (ids estáveis, produto como recurso próprio,
paginação por cursor, erro único, tenant) e registre, numa seção "Pontos de extensão", como cada módulo
se encaixaria.
Dois documentos: backend/openapi/openapi.yaml (público + usuário) e backend/openapi/admin.yaml
(operadores, prefixo /v1/admin, esquema de segurança e audiência de token próprios).

## Convenções (já decididas)
- /v1; campo opcional novo e endpoint novo não quebram; quebra vira /v2.
- Português, snake_case, igual às colunas quando existir coluna.
- Dinheiro em centavos inteiros; preço por unidade só para comparação; o app mostra o preço da embalagem.
- Datas ISO 8601 UTC; silêncio em hora local do tenant; CEP com 8 dígitos sem hífen.
- Rotas públicas recebem X-Tenant; as autenticadas tiram o tenant do token. Nada vaza entre tenants.
- Tokens opacos: access de 1 h, refresh de 60 dias de uso único com detecção de reuso.
- Erro único {codigo, mensagem, campos?} com enum estável; liste os códigos e as rotas em que ocorrem.
- Todo endpoint com operationId, exemplos de sucesso e de cada erro relevante, status completos
  (400/401/403/404/409/422/429), segurança correta, limite de taxa e Retry-After onde houver.
- Idempotência declarada (PUT inteiro, eventos, denúncias, oferta manual).
- Reutilize components/schemas; sem objeto anônimo repetido.
- API neutra de plataforma: assinatura com `loja: google_play | app_store`; login `email | google |
  apple`; push com token e `plataforma: android | ios`.
- Não exponha alerts.motivo nem score bruto; exponha campos estruturados.
- LGPD: até aceitar os termos vigentes só /v1/me* e /v1/auth/* respondem (403 termos_pendentes).

## Entregáveis
1. Os dois YAML, válidos em `npx @redocly/cli lint` (erros corrigidos; avisos resolvidos ou justificados).
2. Seção nova no CHECKPOINT.md: o que o contrato cobre, mapa rota → tabela(s), o que exige migration
   (NÃO escreva a migration), tabela rota → fase (3 API, 4 app/push, 5 oferta manual/CEP, 6 publicação).
3. Seção "Pontos de extensão" para os módulos futuros.
4. Decisões em aberto numeradas, uma por linha, com recomendação e alternativa descartada.

## Não faça
- Não implemente código de aplicação nem migration.
- Não invente regra de negócio nem dado de serviço externo (limite, preço, política de Google, Apple,
  Lomadee ou provedor de e-mail): registre como "a verificar".
- Se faltar uma capacidade que um app desse tipo normalmente precisa, NÃO a omita nem a invente:
  liste como decisão em aberto.
- Nenhum segredo ou chave em arquivo, exemplo ou contrato.
- Commit só do contrato e da documentação.

Ao terminar, devolva: o que mudou em relação ao rascunho, as decisões em aberto e qualquer
inconsistência entre contrato e banco.
````
