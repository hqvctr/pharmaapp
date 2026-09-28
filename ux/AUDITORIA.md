# Auditoria de UX — economae

Fase 4. Data: 2026-09-28. Commit auditado: `cf6cd26`.

## 0. Escopo e limite

**Não existe interface construída.** O repositório tem só backend (DOSSIE_UX 1.1). Não há tela,
rota de produto nem texto escrito para o usuário. Esta auditoria é feita sobre a **interface
implícita**: o que o modelo de dados, as regras do motor e os textos internos obrigam a interface a
mostrar, ou a não conseguir mostrar. Cada problema aponta o arquivo e a linha.

**Escalas.**
- Severidade (Nielsen): 1 cosmético · 2 menor · 3 maior · 4 catástrofe (impede o trabalho central).
- Esforço: 1 baixo (config, texto, 1 coluna) · 2 médio (contrato de API, esquema e tela) · 3 alto
  (fonte nova, processo operacional).
- Impacto: 1 a 5, medido contra a expectativa central — "se o economae me avisar, é porque vale a
  pena, e eu vejo isso em um segundo" (DOSSIE 3.4).
- **Prioridade = impacto ÷ esforço.** Empate: maior severidade primeiro.

Heurísticas de Nielsen citadas por número: H1 visibilidade do estado do sistema · H2 correspondência
com o mundo real · H3 controle e liberdade · H4 consistência e padrões · H5 prevenção de erro ·
H6 reconhecer em vez de lembrar · H7 flexibilidade e eficiência · H8 estética e design minimalista ·
H9 ajudar a reconhecer e recuperar de erro · H10 ajuda e documentação.

## 1. Problemas, ordenados por prioridade

| # | Problema | Heurística / norma | Evidência | Sev. | Esf. | Imp. | Prior. | Onde a proposta resolve |
|---|---|---|---|---|---|---|---|---|
| U01 | **A prova do desconto não existe como dado estruturado.** Mediana de 30 dias, piso de 180 dias e dias observados só aparecem dentro de `alerts.motivo`, texto livre de auditoria. Sem campo, a notificação e o card não conseguem mostrar a prova — e sem prova o app é igual a qualquer canal de oferta. | H1; princípio 3 da demanda | `tipos.ts:102-112` (calculado); `0002:36-43` (só referência gravada); `motor.ts:217-237` (texto) | 4 | 1 | 5 | **5,0** | PROPOSTA 4.2 (Selo de prova), BACKLOG_UX B-02 |
| U02 | **Partida a frio muda.** Nada notifica antes de 14 dias de observação por produto e loja; o primeiro usuário encontra feed vazio e zero aviso, sem explicação. | H1, H10 | `padrao.json` `minObservacoes: 14`; `motor.ts:56-61`; `DECISIONS.md` 27 | 4 | 1 | 5 | **5,0** | Estado "Começando a medir" (PROPOSTA 6.3) |
| U03 | **Momento do pedido de permissão de notificação indefinido.** No Android 13+ (77% da base) as notificações nascem desligadas; pedido fora de contexto tende a ser negado e o app perde o único canal. | Diretriz Android de permissão | `0001:18` (consentimento separado, sem momento); StatCounter ago/2026 | 4 | 1 | 5 | **5,0** | Fluxo F1, passo 4 (PROPOSTA 3.1) |
| U04 | **Texto de auditoria vira texto de interface por falta de alternativa.** "Queda real de 32,0% sobre a mediana de referência", "Score 84", códigos como `SUBIDA_PRE_QUEDA`. Jargão para 65% do público (Inaf: 29% analfabetismo funcional + 36% elementar). | H2 | `motor.ts:210-237`; `cobertura.ts:104` | 3 | 1 | 4 | **4,0** | UX_COPY seção 3 (prova em linguagem de gente) |
| U05 | **Preço por litro/quilo em embalagem pequena.** Protetor de 50 ml vira "R$ 1.598,00/l" — número assustador que não ajuda a decidir. | H2; Decreto 5.903/2006 (clareza) | `BACKLOG.md` (fase 2); `formato.ts:17-19` | 3 | 1 | 4 | **4,0** | Token de unidade de exibição (S-18) |
| U06 | **Dia sem oferta parece defeito.** Por construção, a maioria dos dias não terá oferta excepcional; o modelo não traz nenhum dado para a interface dizer "olhamos X ofertas hoje e nenhuma passou". | H1 | Limiares em `padrao.json`; `ResumoColeta` (`executar.ts:17-27`) tem os contadores, mas não é persistido | 3 | 1 | 4 | **4,0** | Estado "Nada excepcional hoje" com números do dia (PROPOSTA 6.2) |
| U07 | **Sem limite diário por padrão.** `limite_diario` nulo = sem limite; `silencio_*` nulos = sem silêncio. Uma rodada de coleta com várias quedas vira rajada de avisos (R5). | H3; diretriz Android "use responsibly" | `0001:31-33` | 3 | 1 | 4 | **4,0** | Padrão 3/dia, silêncio 21h–8h (S-17) |
| U08 | **Condição "Preço exclusivo no app da rede".** "Rede" é jargão e o texto não diz qual app; a pessoa só descobre na loja. | H2, H6 | `preco.ts:46` | 2 | 1 | 3 | **3,0** | UX_COPY 4 ("Só no app da Drogasil") |
| U09 | **Leve-pague sem total a pagar.** O motor calcula economia na compra mínima, mas não o valor que sai do bolso na compra mínima ("Levando 3: R$ 53,80"). | H1; R10 | `motor.ts:113-114`; `preco.ts:10-21` | 2 | 1 | 3 | **3,0** | Faixa de condição (PROPOSTA 4.3) |
| U10 | **Validade quase sempre desconhecida.** `valida_ate` é anulável e a Lomadee não a fornece; a interface não pode prometer prazo, e o usuário não sabe se ainda vale. | H1; R7, R9 | `0001:128`; `lomadee.ts` (sem validade) | 2 | 1 | 3 | **3,0** | "Conferido às HH:MM" a partir de `coletada_em` |
| U11 | **Link de afiliado sem declaração prevista.** | CDC art. 36 | `lomadee.ts:85-86`; `0001:131` | 3 | 1 | 3 | **3,0** | Linha de transparência no detalhe (UX_COPY 5) |
| U12 | **Categorias sem nome de exibição nem ícone.** `higiene_intima`, `cuidados_pessoais`. | H2, H6 | `padrao.json` | 2 | 1 | 3 | **3,0** | Tabela de rótulos (UX_COPY 7) |
| U13 | **"Mais uma vez" parece duplicado.** Quando o preço cai mais 5% a deduplicação libera novo aviso; sem dizer "caiu de novo", parece repetição. | H1 | `deduplicacao.ts:47-49` | 2 | 1 | 3 | **3,0** | Variação de notificação N4 (PROPOSTA 2) |
| U14 | **Dois níveis de oferta no feed sem forma de distinguir.** `notificar` e `somente_feed` convivem no feed; se a diferença for só cor, falha WCAG 1.4.1. | H4; WCAG 1.4.1 | `tipos.ts:95-100`; `0002:10` | 2 | 1 | 3 | **3,0** | Etiqueta com texto + ícone (PROPOSTA 4.4) |
| U15 | **Oferta encerrada continua listada.** Oferta que some da coleta não vira indisponível; o feed mostraria promoção morta — a reclamação R8. | H1, H5 | `BACKLOG.md` (fase 2) | 4 | 2 | 5 | **2,5** | Estado "Encerrada" + regra de saída do feed (BACKLOG_UX B-04) |
| U16 | **Conta obrigatória pelo esquema.** `users.email NOT NULL` e preferências dependem de `users`: não dá para usar sem cadastro. Login é a reclamação nº 1 (R1, 297). | H7; R1 | `0001:13,26-35` | 4 | 2 | 4 | **2,0** | Uso sem conta (S-13, BACKLOG_UX B-01) |
| U17 | **Sem imagem e sem nome curto de loja.** Reconhecer o produto em um segundo depende disso. | H6 | `fontes/contrato.ts:7-24`; seed `stores.nome` | 3 | 2 | 4 | **2,0** | Ícone de categoria como fallback; S-09, S-10 |
| U18 | **Título cru da fonte como nome do produto.** "Protetor Solar Facial FPS 50 Marca X 50ml": longo, marca no meio, embalagem misturada. Não cabe em 30 caracteres. | H8 | `normalizar.ts:74`; `0002:4` (marca anulável) | 3 | 2 | 4 | **2,0** | Nome curto = marca + nome sem embalagem (B-05) |
| U19 | **Cobertura por usuário não chega à interface.** O cálculo de prazo/distância existe, mas não há onde guardar o resultado por usuário e oferta. Sem isso, "entrega no seu CEP" não aparece antes do clique (R4). | H5; R4 | `cobertura.ts:39-43`; nenhuma tabela de audiência | 3 | 2 | 4 | **2,0** | Linha de cobertura no card (PROPOSTA 4.1) |
| U20 | **Premium sem benefício nem preço definidos.** A tela de assinatura não pode ser escrita honestamente. | H10 | `0001:195`; S-11 | 2 | 1 | 2 | **2,0** | Tela de assinatura mínima, preço vindo da Play |
| U21 | **Exclusão de conta sem caminho definido.** A regra existe (cascata), a jornada não. R14 mostra o custo de complicar. | H3; política da Play para apps com conta | `DECISIONS.md` 7 | 3 | 1 | 2 | **2,0** | Ajustes → Excluir conta, 2 toques |
| U22 | **CEP fora de SP sem resposta.** | H9 | `DECISIONS.md` 19 | 2 | 1 | 2 | **2,0** | Estado "Ainda não chegamos à sua região" |
| U23 | **Sem retorno depois do clique.** A sessão termina no site da loja e o produto nunca sabe se o preço estava certo. | H9 | Ausência de tabela de feedback | 2 | 2 | 3 | **1,5** | Pergunta "O preço bateu?" no retorno (B-07) |
| U24 | **Preço "com cartão" sem o preço sem cartão.** | H1 | `Condicao.cartao_fidelidade` sem preço base | 2 | 2 | 3 | **1,5** | BACKLOG_UX B-08 |
| U25 | **Medicamento sem campos de lista de preço** (substância, registro, titular) exigidos pela RDC 96/2008. | Norma sanitária | `0001` `products` | 3 | 2 | 2 | **1,0** | Formato lista + advertência (S-27, B-06) |

## 2. Auditoria de acessibilidade (separada)

Sem tela, a auditoria verifica os **riscos que a especificação cria** e fixa o requisito que a
proposta tem que cumprir. Critérios WCAG 2.2 AA e recomendações Android.

| # | Critério | Risco encontrado | Evidência | Sev. | Requisito para a proposta |
|---|---|---|---|---|---|
| A01 | Contraste 1.4.3 (4,5:1) | As cores de "promoção" mais usadas no varejo falham sobre branco: vermelho `#FF0000` 4,00:1; laranja `#FF6D00` 2,82:1; verde `#00C853` 2,24:1; amarelo `#FFD600` 1,41:1; o cinza típico de preço riscado `#9E9E9E` 2,68:1. | Cálculo pela fórmula WCAG (luminância relativa), 2026-09-28 | 4 | Todo par texto/fundo definido em token e verificado ≥ 4,5:1 nos dois temas (tabela em `design-tokens/README.md`). |
| A02 | Não usar só cor 1.4.1 | Nível da oferta, economia e condição tenderiam a ser cor (verde/vermelho). | U14 | 3 | Todo estado tem texto e ícone; a cor só reforça. |
| A03 | Alvo de toque (48 dp) 2.5.8 | Nada definido; listas densas de oferta costumam ter link de texto pequeno ("ver mais"). | — | 3 | Linha inteira do card é o alvo; botões ≥ 48 dp; espaçamento ≥ 8 dp entre alvos. |
| A04 | Relações e estrutura 1.3.1 | Preço riscado ("de R$ 59,90") não é anunciado como riscado pelo leitor de tela; TalkBack leria "R$ 39,90 R$ 59,90 R$ 20,00" sem saber qual é qual. | Padrão de mercado (DOSSIE 2.6) | 4 | Nada riscado. Cada card tem descrição única e completa ("Protetor X, R$ 39,90. Preço normal nesta loja R$ 59,90. Economia de R$ 20,00. Menor preço em 6 meses."). |
| A05 | Redimensionar texto 1.4.4 / reflow 1.4.10 | Card com três números lado a lado estoura a largura de 360 dp com fonte a 200%. Título de notificação > 30 caracteres é cortado. | S-01; diretriz de notificação | 3 | Números empilham quando não cabem; nenhum texto com altura fixa; alturas de linha em sp; teste em 200% (script de verificação no protótipo). |
| A06 | Rótulo 4.1.2 | Ícones de categoria e botão "abrir na loja" sem nome acessível viram "botão sem rótulo". | — | 3 | `contentDescription` em todo ícone interativo; decorativo = nulo. |
| A07 | Ordem de foco 2.4.3 | Faixa de condição acima do preço tem que ser lida **antes** do preço, senão a condição chega depois da decisão. | Princípio 4 da demanda | 3 | Ordem semântica: condição → produto → preço → prova → cobertura. |
| A08 | Idioma 3.1.1 | Leitor de tela lendo "R$ 39,90" em inglês lê "R dollar". | — | 2 | Formatação e `Locale("pt","BR")` explícitos; `lang="pt-BR"` no protótipo. |
| A09 | Movimento 2.3.3 (AAA, adotado) | Animação de destaque de preço seria comum no varejo. | — | 1 | Nenhuma animação necessária para entender; respeitar "remover animações" do sistema. |
| A10 | Tempo 2.2.1 | Contagem regressiva de oferta pressiona e não é verdade quando a validade é desconhecida (U10). | — | 2 | Nenhuma contagem regressiva; validade só quando a fonte informa, como data. |

## 3. O que já está certo e deve ser preservado

- **Só CEP, sem localização do aparelho** (`0001:29`). Evita R12 inteiro.
- **Consentimento de notificação separado dos termos** (`0001:18`). Permite pedido em contexto.
- **Rótulo de condição obrigatório no resultado** (`tipos.ts:124`). Base do princípio 4.
- **Deduplicação que não renotifica promoção longa** (`DECISIONS.md` 25). Evita R5.
- **Frete e deslocamento que anulam a economia descartam a oferta** (`motor.ts:114-126`,
  `cobertura.ts:99-107`). Evita R4 e R10 na origem.
- **Comparação por unidade de medida sempre** (`DECISIONS.md` 10). Pega "reduflação".
