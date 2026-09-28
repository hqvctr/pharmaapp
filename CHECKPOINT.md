# Checkpoint

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
