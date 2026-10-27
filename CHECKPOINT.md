# Checkpoint

## Fase 3 — API do app (EM PROPOSTA, aguardando aprovação)

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
