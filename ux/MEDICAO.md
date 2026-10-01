# Medição — como saber se a proposta funcionou

Data: 2026-09-28. **Não existe valor atual para nenhuma métrica**: o app não foi lançado e não há
usuário, notificação enviada nem evento registrado (DOSSIE 1.1). Onde está escrito "meta", é meta
de projeto — escolha a ser confirmada com a primeira coorte —, não número de pesquisa. Não encontrei
referência pública confiável de taxas de opt-in, abertura ou retenção para apps de oferta no Brasil;
por isso nenhuma meta abaixo cita benchmark externo.

A expectativa central (DOSSIE 3.4) — *"se o economae me avisar, é porque vale a pena, e eu consigo
ver isso em um segundo"* — se mede por três perguntas:

1. **A pessoa deixa o app avisar?** (permissão concedida e mantida)
2. **Quando avisa, vale a pena?** (abre, vai à loja, o preço bate)
3. **O silêncio é entendido como curadoria, não como defeito?** (fica mesmo sem aviso)

## 1. Métricas

| # | Métrica | Definição | Fonte do dado | Valor atual | Meta de projeto | Pergunta |
|---|---|---|---|---|---|---|
| M1 | **Permissão concedida** | concedidas ÷ pedidas no passo 4 (Android 13+) | evento `permissao_resultado` (novo) | não existe | ≥ 60% | 1 |
| M2 | **Avisos mantidos em 30 dias** (métrica de guarda) | usuários com `areNotificationsEnabled()` verdadeiro no dia 30 ÷ que concederam | checagem diária no app, evento `avisos_estado` (novo) | não existe | ≥ 85% | 1 |
| M3 | Abertura por aviso | `deliveries.aberto_em` não nulo ÷ enviados | `deliveries` (existe no esquema) | não existe | ≥ 25% | 2 |
| M4 | Ida à loja por abertura | `deliveries.clicado_em` ÷ `aberto_em` | `deliveries` | não existe | ≥ 40% | 2 |
| M5 | **Preço bateu** | "Sim" ÷ (Sim + Não) na pergunta de retorno | tabela de retorno (B-07) | não existe | ≥ 90% | 2 |
| M6 | Uso de "Ajustar avisos" antes de desligar | usuários que mudaram limite/categoria ÷ usuários que desligaram tudo | eventos `ajuste_*`, M2 | não existe | razão ≥ 1 | 1 |
| M7 | Avisos por usuário por semana | distribuição (p50, p90) | `deliveries` | não existe | p90 ≤ limite escolhido × 7; p50 ≥ 1 depois da partida a frio | 2/3 |
| M8 | Tempo até o primeiro aviso | instalação → primeiro `enviado_em` | `users.criado_em`, `deliveries` | não existe | p50 ≤ 7 dias com o sistema já medindo há 14 dias (S-25) | 3 |
| M9 | Retenção D7 e D30 sem aviso recebido | usuários sem nenhum aviso na semana que ainda abrem o app | eventos de sessão | não existe | acompanhar; comparar A/B do estado "nada hoje" (T4) | 3 |
| M10 | Conclusão do primeiro uso | concluíram o passo 4 ÷ abriram o passo 1; tempo p50 | eventos `primeiro_uso_passo` (novo) | não existe | ≥ 80%; p50 < 60 s | 1 |
| M11 | Desinstalação em 24 h | Play Console | Play Console | não existe | acompanhar por versão | 1 |
| M12 | Desempenho em aparelho de entrada | p75 do tempo até o primeiro cartão visível; bytes da primeira carga do feed | Android vitals + medição no app | não existe | p75 ≤ 2 s em 4G; ≤ 150 KB (tokens `imagem`) | 2 |
| M13 | Acessibilidade em uso | % sessões com `fontScale` ≥ 1,3; % com TalkBack ativo; falhas do Accessibility Scanner | app (agregado, sem identificar pessoa) + auditoria | não existe | 0 falhas de contraste/alvo no Scanner | — |

Guarda-corpos (não podem piorar enquanto se otimiza o resto): **M2** e **M5**. Uma mudança que
aumente abertura (M3) derrubando M2 está aumentando spam, e é revertida.

## 2. O que medir no código (eventos novos)

`deliveries` já guarda envio, abertura e clique por aviso e usuário (`0001_schema_inicial.sql`).
Faltam, sem dado pessoal além do id interno:

| Evento | Quando | Campos |
|---|---|---|
| `primeiro_uso_passo` | ao concluir cada passo | passo (1–4), duração |
| `permissao_resultado` | resposta ao diálogo do sistema | concedida (bool), variante do texto |
| `avisos_estado` | uma vez por dia, se mudou | ligados (bool) |
| `ajuste_limite`, `ajuste_categoria` | mudança em Ajustes | origem (`notificacao` / `ajustes`) |
| `retorno_resposta` | pergunta "O preço bateu?" | alerta, resposta (sim / não / não comprei) |
| `prova_interacao` | abrir "Como a gente confere", "Ver preços dia a dia" | alerta |

LGPD: eventos agregados por id interno, apagados na exclusão de conta (`DECISIONS.md` 7).

## 3. O que testar primeiro (em ordem)

| Ordem | Teste | Tipo | Por que primeiro | Critério de sucesso |
|---|---|---|---|---|
| **T1** | **Compreensão da notificação e do cartão** — N1, N3 e o cartão da fralda, com 5 a 8 pessoas dos três perfis (pelo menos 2 do perfil C, com fonte ampliada). Perguntas: "Essa promoção é boa? Por quê?", "Quanto você paga para levar?", "O que é o preço normal?" | qualitativo, protótipo (`prototipo.html`) | É barato, não depende de lançamento e testa a aposta central (prova visível + condição antes do clique). Um erro aqui invalida o resto. | ≥ 4 de 5 acertam o total do leve-pague e explicam "preço normal" com as próprias palavras; ninguém confunde o chip de economia com o preço |
| T2 | Texto do pedido de permissão (A × B em UX_COPY 2) | A/B no lançamento | M1 é o gargalo de todo o resto: sem permissão, não há produto | diferença em M1 com M2 igual ou melhor |
| T3 | Limite padrão 3 × 1 por dia | A/B | Protege M2; S-17 é suposição de baixa confiança | maior M2 sem perda de M4 |
| T4 | Estado "nada hoje" (texto A × B) | A/B | Testa se o silêncio vira confiança (M9) | maior retenção D7 no grupo sem aviso |
| T5 | Régua no cartão × sem régua | A/B | Confirma se a invenção visual paga seu espaço | M4 maior ou igual, e T1 sem perda de compreensão |

**Tamanho de amostra.** Sem taxa-base real, não há como fixar o tamanho agora. Com a primeira semana
de dados, usar o cálculo padrão para duas proporções (α = 0,05, poder 0,8) sobre a taxa observada e o
menor efeito que vale a pena detectar (sugestão: 5 pontos percentuais em M1).

## 4. Receita sem premium (2026-10-01, DECISIONS 73 a 75)

| Métrica | Como medir | Para quê |
|---|---|---|
| Cliques em "Ver na loja" e "Comprar na loja" por pessoa ativa por semana | Evento no app e na página do convidado | Base da comissão (S-35) |
| Compras confirmadas e comissão por loja | Relatório da rede de afiliados (sem identificar pessoa) | Se a comissão paga a operação |
| Listas criadas por tipo; itens por lista; convidados que abrem; itens marcados | Eventos da aba Listas e da página | Se as listas trazem gente (S-37) |
| Presente repetido | Pergunta opcional à dona depois da data da festa | Se "Já comprei" basta (S-38) |
| Assinaturas "sem anúncios" e cancelamentos | Google Play Console | Se a assinatura compensa o anúncio |
| Avaliações na Play que citam anúncio; saída do feed logo depois do cartão de anúncio | Classificação das avaliações (método do DOSSIE); evento | Se o anúncio incomoda (S-39); teste A/B de densidade |
