# Checkpoint

## Triagem NBCAL (2026-10-27, PRONTA; pendente de revisão por advogado)

A partir de [docs/juridico/parecer-d33-nbcal.md](docs/juridico/parecer-d33-nbcal.md) (DECISIONS 35–39).
- `backend/src/normalizador/nbcal.ts`: `triarNbcal` (vedado > cautela > advertência > livre) e
  `compilarRegrasNbcal` (valida a config; falha fechada).
- `backend/config/tenants/padrao.json`: seção `nbcal` com a tabela do parecer, versão
  `parecer-d33-2026-10-27`.
- Normalizador: bloqueios `NBCAL_VEDADO` e `NBCAL_CAUTELA`; `ProdutoNormalizado.advertencias`.
- Pipeline: produto com advertência vira `somente_feed`, com o motivo registrado.
- Testes: `nbcal.test.ts` roda a tabela do parecer contra a config real; `normalizar.test.ts` cobre a
  ordem das triagens. `npm test`: 143 testes passando; `tsc --noEmit` limpo. Pipeline com banco não
  rodado (sem Postgres neste ambiente).
- Pendente: as advertências não são gravadas (`products` não tem coluna; item 16 abaixo). Pesquisa,
  página, seguidos, central, compartilhamento, oferta manual e anúncios ainda não existem; quando
  existirem, aplicam as mesmas regras (parecer, perguntas 5, 6 e 8).

## Fase 3 — contrato do núcleo, rascunho 2 (EM PROPOSTA, aguardando aprovação)

Entregue em 2026-10-27, a partir de [PRODUTO.md](PRODUTO.md) e do rascunho 1 (seção seguinte, superada
onde diverge). Só contrato e documentação: nenhuma rota, migration ou tela.

- `backend/openapi/openapi.yaml` — app (público + usuário), 34 operações, versão `1.0.0-rascunho.2`.
- `backend/openapi/admin.yaml` — operadores, prefixo `/v1/admin`, esquema `operador` (audiência própria),
  22 operações. Reaproveita esquemas do `openapi.yaml` por `$ref` entre arquivos.
- `docs/juridico/nbcal.md` — Lei 11.265/2006 e Decreto 9.579/2018 com os trechos literais que importam,
  o que significam para o app e o que a linha paralela fez diferente (D30–D33).
- `npx @redocly/cli@1.34.5 lint backend/openapi/openapi.yaml backend/openapi/admin.yaml`: 0 erros,
  0 avisos. A regra `no-invalid-media-type-examples` confere todo exemplo contra o esquema (testado
  quebrando um exemplo de propósito).

> **D1 decidida (2026-10-27, DECISIONS 34).** O responsável decidiu que este rascunho e o PRODUTO.md
> prevalecem sobre a linha paralela (`claude/awesome-noether-jruv6b` e `claude/determined-meitner-8zeag7`),
> que tinha um `/v1` aprovado (`v1-aprovado.json`), servidor e app Android das fases 3 e 4. O que lá
> diverge daqui fica superado: foco em mães, medicamento fora do app, sessão de 90 dias, tenant
> `economae`, rotas `/v1/eu`, `/v1/feed`, `/v1/ofertas/{id}`, Brevo. O código daquela linha não está
> nesta branch; reaproveitar algum pedaço dele é escolha de implementação, sempre seguindo este contrato.

### O que mudou em relação ao rascunho 1
- **Escopo.** De 15 para 34 operações no app, mais 22 de operador. Novas: login Google e Apple,
  exportação de dados, silenciamentos, avaliação, denúncia, pesquisa, página e histórico do produto,
  seguidos, central de avisos, comprovante de assinatura, webhooks das lojas de apps e toda a área do
  operador.
- **Feed.** `aguardar_aprovacao` só aparece depois de aprovado por operador (era visível); alerta
  rejeitado, escondido por denúncia ou de loja ou marca silenciada com `alcance: tudo` sai do feed.
- **Alerta.** `avisos: string[]` virou `advertencias: [{codigo, texto}]`, porque "aviso" agora é a
  central de avisos. Entraram `situacao` (`ativa | encerrada | em_revisao`), `preco_referencia_centavos`
  (referência convertida para a embalagem), `sem_historico_verificado` (oferta manual), `seguido` e
  `produto.id` / `produto.marca {chave, nome}` / `produto.gtin`.
- **Detalhe.** Responde também para promoção encerrada (push aberto tarde mostra "encerrada", não 404).
  O histórico saiu do detalhe para `GET /v1/produtos/{id}/historico` (até 180 dias, nos dois planos;
  era 30). O detalhe ganhou `historico_desde`, `valida_de`, `avaliacao` e `denuncia` da pessoa.
- **Conta.** `metodos_login`, `conta_nova` na sessão, `plano {tipo, anuncios, ceps_permitidos,
  assinatura}` no lugar de `premium`/`premium_expira_em`. Exclusão confirma com `confirmacao: excluir`
  (o e-mail de retransmissão da Apple pode ser desconhecido da pessoa).
- **Configuração.** `nome_app`, `fuso`, `metodos_login`, `planos` por loja de apps e mais limites.
- **Dispositivo.** `token_fcm` virou `token`; `plataforma: android | ios`.
- **Erros.** Enum de 12 para 23 códigos, com a lista de rotas de cada um em `CodigoErro`. 400 separado
  de 422 (JSON ilegível × campo inválido); 409, 429 com `Retry-After` e 503 onde cabem.
- **Forma.** Todo erro e todo sucesso têm exemplo; nenhum objeto anônimo repetido; paginação comum
  (`PaginaBase`); idempotência declarada em cada escrita.

### Mapa rota → tabela(s)
"novo" = exige migration (não escrita). Prefixo `/v1` omitido.

| Rota | Tabelas |
|------|---------|
| `GET /configuracao` | `tenants` + config do tenant (termos, rótulos, limites, planos: campos novos no JSON) |
| `POST /auth/email/codigo`, `/verificar` | Redis (código, limites), `users`, `sessions` (novo) |
| `POST /auth/google` | `users.google_sub`, `sessions` (novo) |
| `POST /auth/apple` | `users.apple_sub` (novo), credencial Apple cifrada (novo), `sessions` (novo) |
| `POST /auth/renovar`, `/auth/sair` | `sessions` (novo), `dispositivos` (novo) |
| `GET/DELETE /me`, `PUT /me/consentimentos` | `users`, `subscriptions`, cascata em todas as tabelas do usuário |
| `GET /me/exportacao` | todas as tabelas do usuário |
| `GET/PUT /preferencias` | `user_preferences`, `subscriptions` |
| `/silenciamentos*` | `silenciamentos` (novo), `stores`, marca (novo) |
| `GET /alertas` | `alerts`, `offers`, `products`, `stores`, `store_service_areas`, `user_preferences`, `silenciamentos`, revisão (novo), denúncia (novo), `seguidos` (novo) |
| `GET /alertas/{id}` | idem + `price_history` (`historico_desde`), `avaliacoes`, `denuncias` (novos) |
| `POST /alertas/{id}/eventos` | `alert_events` (novo; `deliveries.canal` só aceita `push`), idempotência (novo) |
| `PUT /alertas/{id}/avaliacao` | `avaliacoes` (novo) |
| `PUT /alertas/{id}/denuncia` | `denuncias`, `casos_denuncia` (novos), `alert_events` |
| `GET /produtos`, `/produtos/{id}` | `products` (índice de busca: novo), `offers`, `stores`, `store_service_areas`, `alerts` |
| `GET /produtos/{id}/historico` | `price_history` por `familia_chave` + loja (DECISIONS 11), `products` |
| `/seguidos*` | `seguidos` (novo), `products` |
| `GET /avisos`, `POST /avisos/leitura` | `avisos` (novo) |
| `POST /assinatura/comprovantes`, webhooks | `subscriptions` (colunas novas) |
| `PUT/DELETE /dispositivo` | `dispositivos` (novo, preso a `sessions`) |
| `/admin/auth/*`, `/admin/me` | `operadores`, `sessions` com audiência (novos) |
| `/admin/alertas*` | `alerts` + revisão (novo), `offers`, `sources`, `stores` |
| `/admin/lojas*` | `stores` |
| `/admin/fontes*` | `sources`, `source_credentials` (novo, DECISIONS 22) |
| `/admin/denuncias*` | `casos_denuncia`, `denuncias` (novos) |
| `/admin/triagem*` | `triagem_bloqueios` (+ resultado e operador: novo) |
| `/admin/ofertas-manuais*`, `/admin/produtos` | `offers`, `products`, `sources` tipo E, `alerts`, idempotência (novo) |
| `/admin/auditoria` | `auditoria` (novo) |

### O que exige migration (não escrita)
1. `sessions`: hash do access e do refresh, audiência (`app | operador`), cadeia de rotação, revogação.
2. `users.apple_sub` (único por tenant) e credencial Apple cifrada para revogação.
3. `operadores` (tenant, e-mail, nome) e `auditoria` (operador, ação, alvo, detalhe JSON, data).
4. `silenciamentos` (usuário, tipo, alvo, alcance) e marca normalizada (`products.marca_chave` ou tabela
   `marcas`).
5. `seguidos` (usuário, produto, os cinco avisos) e `avisos` (central, com `lido_em`).
6. `alert_events` (usuário, alerta, tipo, origem, data, chave de idempotência) e tabela de chaves de
   idempotência para a oferta manual.
7. `avaliacoes` e `denuncias` (uma por pessoa por oferta e preço) e `casos_denuncia` (oferta escondida,
   situação, resolução).
8. Revisão do alerta: situação, operador (FK), data, observação. Hoje `alerts.aprovado_por` é texto
   e não há rejeição.
9. `triagem_bloqueios`: `resultado`, `revisado_por`.
10. `dispositivos` (token, plataforma `android | ios`, versão, `sessao_id`).
11. `subscriptions`: `origem` aceita `app_store`; colunas do comprovante (hash, id da transação original,
    `produto_loja_id`) com unicidade por loja; mapeamento de estados (D23).
12. `source_credentials` (aprovada na P2, ainda não criada).
13. Índice de busca textual em `products` (ex.: `pg_trgm`, extensão do próprio Postgres).
14. `offers`: `criada_por` (oferta manual) e marca de oferta escondida por denúncia.
15. Fora do banco: config do tenant ganha rótulo de categoria, termos (versão e URL), métodos de login,
    limites e planos.
16. `products.advertencias` (códigos `nbcal_*` da triagem), para preencher `Alerta.advertencias`; hoje a
    triagem calcula e o pipeline usa, mas não grava.

### Rota → fase
| Fase | Rotas |
|------|-------|
| 3 (API) | `configuracao`; `auth/email/*`, `auth/google`, `auth/renovar`, `auth/sair`; `me`, `me/consentimentos`, `me/exportacao`; `preferencias`; `silenciamentos*`; `alertas*` (feed, detalhe, eventos, avaliação, denúncia); `produtos*`; `seguidos*` (cadastro; o despacho dos avisos é fase 4); admin: `auth/*`, `me`, `alertas*`, `lojas*`, `fontes*`, `denuncias*`, `triagem*`, `produtos`, `auditoria` |
| 4 (app/push) | `dispositivo`; `avisos`, `avisos/leitura`; despacho dos avisos de seguidos |
| 5 (oferta manual/CEP) | admin `ofertas-manuais*`; cobertura por distância (CEP → coordenada) dentro de `alertas` e `produtos` |
| 6 (publicação) | `assinatura/comprovantes`, `webhooks/*`; `auth/apple` só quando houver app de iPhone |

### Pontos de extensão (módulos futuros, sem rota)
O núcleo já garante: ids UUID estáveis, produto como recurso próprio (`/v1/produtos/{id}`), cursor
opaco em toda lista, erro único com enum que só cresce, tenant no token, e o app ignorando campo e
valor de enum desconhecidos.
- **Listas de presente.** Recurso novo `/v1/listas` (`tipo: presente | compras`, itens por
  `produto_id`). O convidado sem conta abre `GET /v1/listas/publicas/{token}` (token aleatório de 256
  bits, guardado como hash, revogável) e marca "vou dar" com nome opcional ou anônimo, sem conta e
  com o mínimo de dados. Encaixa em `ProdutoResumo` e nos limites de `Configuracao.limites`. Dados de
  criança: decisão em aberto 7 do PRODUTO.md.
- **Lista de compras.** A mesma `/v1/listas` com `tipo: compras`, privada.
- **Comparador entre lojas.** Já existe a base em `Produto.ofertas` (por loja, menor preço primeiro).
  O comparador agrupa por família (`familia_chave`) com preço por unidade: `GET /v1/produtos/{id}/comparacao`.
- **Página da loja.** `GET /v1/lojas/{id}` a partir de `LojaResumo.id`: reputação, ofertas ativas
  (cursor) e `Cobertura` para os CEPs da pessoa. O silenciamento de loja já usa o mesmo id.
- **Comentários nas ofertas.** `/v1/alertas/{id}/comentarios`, reaproveitando a fila de
  `casos_denuncia` do operador para moderação; exige bloqueio de usuário (decisão quando o módulo vier).
- **Preço-alvo.** Campo opcional novo em `ConfigAvisosProduto` (`preco_alvo_centavos`) e valor novo de
  `TipoAviso` (`preco_alvo`). As duas mudanças são aditivas.
- **Benefícios extras do premium.** Novos campos em `PlanoUsuario` e `Limites`; nada muda nos existentes.

### Decisões em aberto
Cada uma com recomendação (R) e alternativa descartada (A). Os números são citados nos YAML.
- D1. **Decidida** (DECISIONS 34): este contrato e o PRODUTO.md prevalecem sobre a linha paralela. Descartado: manter o `/v1` aprovado de lá.
- D2. Cadastro de operador. R: lista mantida por comando de linha, sem rota, no MVP. A: rota de convite (sem níveis de permissão, qualquer conta de operador comprometida criaria outras).
- D3. Validade do refresh do operador. R: 7 dias, em config. A: 60 dias como no app (a conta aprova push para a base toda).
- D4. Login social com e-mail de conta já existente. R: vincular à conta existente quando o provedor declara o e-mail verificado (campo de cada provedor a verificar). A: contas separadas (duas contas e dois premiums para a mesma pessoa).
- D5. Login social sem e-mail (`users.email` é obrigatório). R: aceitar o e-mail de retransmissão da Apple; se o provedor não entregar e-mail, recusar com `credencial_invalida`. A: tornar `users.email` opcional.
- D6. Provedor de e-mail do código. R: escolher só depois de verificar limites, termos e entrega sem domínio próprio. A linha paralela registrou Brevo, mas não verifiquei. A: nenhuma (bloqueia produção, não o desenvolvimento).
- D7. Medicamento fora do feed. R: não aparece na pesquisa, não pode ser seguido e não gera aviso na central ("só no feed, sem push"). A: pesquisável e seguível sem avisos.
- D8. Página do produto com oferta fora de cobertura. R: só ofertas cobertas para um CEP do plano, como no feed (`OfertaAtual.cobertura` obrigatório). A: mostrar todas com "não entrega no seu CEP" (exigiria `cobertura` nulo).
- D9. Premium vencido com mais CEPs que o plano. R: manter guardados e ignorar (`ceps_ignorados_pelo_plano`). A: apagar os CEPs extras.
- D10. `limite_diario: null`. R: vale um padrão do tenant em config; o responsável escolhe o valor. A: sem limite.
- D11. Política de privacidade. R: documento e versão próprios, campo aditivo `privacidade` em `/v1/configuracao`. A: só os termos.
- D12. Retenção da central de avisos. R: 90 dias (proposto), em config. A: guardar para sempre.
- D13. Imagem do produto. R: `imagem_url` opcional vinda da fonte (só https), aditivo, com coluna nova. A: sem imagem.
- D14. Link compartilhado. Os termos da Lomadee sobre link de afiliado não foram lidos. R: ler antes do app da fase 4; se proibir, criar `link_compartilhamento` (aditivo). A: redirecionador próprio (exige domínio; orçamento zero).
- D15. Marca. A Lomadee não traz marca estruturada (`products.marca` nulo). R: `marca_chave` normalizada, preenchida quando houver marca; sem marca, o produto não pode ser silenciado por marca. A: silenciar por texto livre (casaria marcas erradas).
- D16. Operador e score. R: o operador também não vê `motivo` nem score, só campos estruturados; se faltar, gravar os componentes no alerta e expor estruturado. A: mostrar o `motivo` ao operador.
- D17. Revisão de alerta. R: rejeitar depois de aprovar é permitido; aprovar depois de rejeitar não (409). A: troca livre de resultado.
- D18. Loja que passa a aprovada. R: sem efeito retroativo; a próxima coleta reavalia e a deduplicação já permite subir a decisão (DECISIONS 25). A: reavaliar os alertas na hora.
- D19. Denúncia depois de restaurar. R: ignorar novas denúncias da mesma oferta até o preço mudar. A: recomeçar a contagem na hora.
- D20. Falso positivo na triagem. R: só registrar e ajustar as listas versionadas à mão (falha fechada). A: liberar o item por exceção (risco legal).
- D21. `valida_ate` na oferta manual. R: obrigatória, com prazo máximo em config. A: opcional (oferta ficaria no feed sem fim).
- D22. Limites de taxa propostos, em config: configuração 60/min por IP, renovar 60/h por sessão, eventos 300/h, denúncias 20/dia, busca 30/min, comprovantes 10/h, exportação 1/h, dispositivo 30/h por sessão; chaves de idempotência por 24 h. R: aprovar como valores iniciais. A: um limite global único.
- D23. Estados da assinatura. O enum atual (`ativa`, `cancelada`, `expirada`, `pendente`) pode não cobrir carência, pausa e estorno das lojas. R: mapear depois de ler a documentação de cada loja; valor novo é aditivo. A: expor o estado cru de cada loja.
- D24. Excluir a conta com assinatura ativa. R: o app avisa que é preciso cancelar na loja; a API não bloqueia a exclusão. A: bloquear a exclusão (LGPD).
- D25. Atualização obrigatória do app. R: campo aditivo `versao_minima` por plataforma em `/v1/configuracao`. A: nenhum mecanismo.
- D26. Cadastro de loja, faixa de CEP e vínculo fonte → loja. Não há rota; sem faixa, a loja online não entra no feed de ninguém. R: comando de provisionamento na fase 3, rota de operador depois. A: rota já no contrato.
- D27. Tetos de config: `queda_percentual` de 5 a 90, 100 seguidos, 50 silenciamentos (exemplos do contrato). R: o responsável confirma os valores. A: sem teto.
- D28. Rede de anúncios e consentimento de anúncio personalizado. Nada escolhido nem verificado. R: anúncio não personalizado até existir consentimento próprio, separado dos termos e do push. A: personalizado por padrão.
- D29. Exigências das lojas de apps (login com Apple quando há login social, exclusão de conta, assinatura): conferir as regras vigentes antes da fase 6. R: o contrato já tem as rotas; só falta a verificação. A: nenhuma.
- D30. [decidida 2026-10-27: R, DECISIONS 35] NBCAL, produtos vedados (Lei 11.265/2006, art. 4º; Decreto 9.579/2018, art. 5º, que cita "descontos de preço" e "meios eletrônicos"; ver [docs/juridico/nbcal.md](docs/juridico/nbcal.md)). R: triagem em falha fechada, em todo produto, sobre título e descrição: fórmula infantil para lactentes e de seguimento para lactentes, fórmula para recém-nascido de alto risco, mamadeira, bico, chupeta e kit que contenha algum deles nunca aparecem (feed, pesquisa, produto, seguidos, avisos, push). A: deixar a curadoria decidir pelo desconto.
- D31. [decidida 2026-10-27: R, DECISIONS 36] NBCAL, produtos com advertência obrigatória (Decreto, art. 6º). Dois textos: "aleitamento até os 2 anos" para leites, bebidas vegetais e fórmula de seguimento para crianças na primeira infância; "após os 6 meses" para papinha e cereal infantil. Exibição em moldura, caixa alta, negrito, ≥ 20% do maior caractere, mín. 2 mm (já no esquema `Advertencia`). R: esses produtos aparecem só no feed, sem push, porque o push do sistema não cumpre a forma exigida. A: push com o texto no corpo (era o da linha paralela).
- D32. [decidida 2026-10-27: R, DECISIONS 37] Leite comum em `mercearia`. O inciso VI do art. 3º do decreto alcança todo leite fluido ou em pó e bebida vegetal, não só produto de bebê. R: a triagem marca o produto pelo tipo, em qualquer categoria, e aplica a D31. A: advertência só nas categorias de bebê (deixaria leite UHT e bebida de soja sem o texto obrigatório).
- D33. [decidida 2026-10-27: recomendações do parecer, DECISIONS 38] Pontos que a norma não resolve, para a assessoria: se o app é "promoção comercial"; composto lácteo e leite condensado; protetor de mamilo (bloqueado na linha paralela, mas ausente da lei e do decreto); fórmula para necessidades dietoterápicas; vedação também na pesquisa e na página do produto. R: falha fechada (bloquear) em tudo que estiver em dúvida até a resposta. A: liberar até a resposta. Minuta de resposta em [docs/juridico/parecer-d33-nbcal.md](docs/juridico/parecer-d33-nbcal.md), pendente de revisão por advogado.

### Inconsistências entre contrato e banco
1. `deliveries.canal` só aceita `push`: eventos de feed, central e produto, e o compartilhamento, não
   cabem; o contrato pede `alert_events`.
2. `alerts` não tem estado de revisão: `aprovado_por` é texto livre e não há rejeição.
3. `subscriptions.origem` só aceita `google_play` e não guarda o comprovante, então não há como detectar
   `comprovante_de_outra_conta`.
4. `users` não tem `apple_sub`, e `email NOT NULL` depende da D5.
5. `products.marca` é texto nulo, sem chave: `Marca.chave` não tem coluna (D15).
6. `offers.disponivel` nunca vira `false` (BACKLOG, fase 2): `situacao: encerrada`, o filtro do feed e o
   aviso "voltou ao estoque" dependem disso.
7. `offers` não tem marca de "escondida por denúncia" nem `criada_por` (oferta manual); `id_externo` é
   obrigatório e a oferta manual vai precisar de um id gerado.
8. Loja online sem `store_service_areas` não é coberta para ninguém (D26). Hoje só o seed de teste da
   fase 2 (`scripts/fase2/seed.sql`) cadastra faixas; não há caminho para cadastrar as das lojas reais.
9. `preco_referencia_centavos` e a economia da cobertura por retirada não estão em `alerts`; saem de
   `preco_referencia_por_unidade × products.quantidade`.
10. `historico_desde` fica limitado pela retenção de 180 dias de `price_history`.
11. `triagem_bloqueios` não tem resultado nem quem revisou.
12. Config do tenant sem rótulo de categoria, termos, métodos de login, limites e planos.
13. Exclusão em cascata (DECISIONS 7) precisa valer para todas as tabelas novas do usuário; a
    contagem de denúncias cai quando quem denunciou exclui a conta.

**Decisões D2–D29 respondidas (2026-10-27, DECISIONS 40–50).** Resumo: todas seguiram a recomendação, exceto
D6 (Brevo por enquanto), D7 (aguarda consulta jurídica; vale a opção restritiva), D15 (lista de marcas dos
produtos cadastrados), D20 (listas + liberação pelo operador, só para cautela e texto) e D21 (`valida_ate`
opcional, com aviso).

**A fazer no contrato antes de aprová-lo:** `valida_ate` opcional na oferta manual (D21); `privacidade`,
`versao_minima` e `imagem_url` em `/v1/configuracao` e no produto; `limite_diario` com padrão 3; rota de
liberação de bloqueio de triagem restrita a cautela e texto (D20); regra de marca por lista (D15).

**Próximo passo:** o responsável revisa o contrato rascunho 2 já com esses ajustes e o aprova. Só depois:
migrations. Pendentes de terceiros: consulta jurídica da D7, termos da Lomadee (D14), listas CMED/Portaria 344.

## Fase 3 — rascunho 1 (SUPERADO pelo rascunho 2 onde diverge)

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
