# economae — produto

Fonte de verdade do que o app é e faz, vinda da conversa com o responsável (2026-10-27). O contrato
OpenAPI serve a este documento, não o contrário. Decisão técnica fica em DECISIONS.md; aqui fica o
que a pessoa vê e faz.

## Visão
Um superapp de compras que só incomoda quando vale a pena. O aviso é raro e comprovado (motor de
curadoria); o resto do app deixa a pessoa pesquisar, seguir produtos e, mais adiante, montar listas de
presente. Android e iPhone. A API nasce neutra de plataforma; o app de iPhone só é construído quando
houver receita para a conta de desenvolvedor da Apple.

## Quem usa
- **Pessoa final**, no app.
- **Operadores**: o responsável e mais algumas pessoas, cada um com conta individual, sem níveis de
  permissão. Toda ação administrativa registra quem fez e quando.

## Núcleo (contrato detalhado agora)
1. **Conta e login.** Código de 6 dígitos por e-mail, Google e Apple. Apple só é ligado quando existir
   o app de iPhone. Aceite de termos e consentimento de notificação são separados (LGPD). Excluir conta
   apaga tudo em cascata. Exportar dados do titular.
2. **Preferências.** Categorias, até 3 CEPs (mais de 1 é premium), horário de silêncio, limite diário
   de push, lojas e marcas silenciadas. Ao silenciar, a pessoa escolhe: só deixa de receber push, ou
   some de tudo (feed, busca, produtos seguidos).
3. **Feed de promoções.** Alertas aprovados, com oferta ainda válida, categoria escolhida e cobertura
   para um dos CEPs. Alerta de fonte pouco confiável fica escondido até aprovação humana. Medicamento
   aparece só no feed, com avisos legais.
4. **Detalhe da oferta.** Preço da embalagem, rótulo de condição, frete a confirmar, validade, idade do
   preço, link da loja (avisando se é de afiliado), histórico de preço.
5. **Pesquisa de produto** (confirmada): só o que o app já monitora, porque seguir um produto
   exige conseguir achá-lo. Página do produto com preço atual e histórico. O histórico só existe a
   partir do dia em que o app passou a coletar aquele produto.
6. **Seguir produto.** Favoritar, seguir e acompanhar são a mesma ação (uma estrela). Avisos
   possíveis, configuráveis por produto: promoção excepcional (padrão, sempre disponível), queda
   acima de X% (a pessoa escolhe X), voltou ao estoque, menor preço em 180 dias, promoção acabando
   (menos de 24 h). Todos respeitam silêncio, limite diário e a regra anti-repetição.
7. **Retorno sobre o alerta.** Compartilhar (folha de compartilhar do celular com título, preço e link
   da loja; sem domínio próprio), avaliar o aviso (útil / não útil), denunciar (preço errado ou acabou
   o estoque), silenciar loja ou marca.
8. **Central de avisos** dentro do app, além do push. Sem e-mail como canal de aviso.
9. **Assinatura premium**, validada nas lojas de apps (Google Play e App Store). Modelo escolhido:
   **grátis completo, com anúncios**. Os dois planos têm as mesmas funções (feed, seguir, pesquisa,
   histórico de 180 dias, todos os avisos). Premium só muda duas coisas: **remove os anúncios** e
   **libera até 3 CEPs** (o grátis tem 1). Limites técnicos contra abuso (ex.: teto de produtos
   seguidos igual para todos) são config, não diferença de plano. Não se cobra por qualidade ou
   rapidez do alerta. Benefícios extras do premium podem entrar depois sem quebrar o contrato.
10. **Anúncios** exibidos pelo próprio app; a API informa se a pessoa os vê (`anuncios: false` no
    premium).
11. **Área do operador** (contrato separado): aprovar alertas, aprovar/bloquear lojas e fontes,
    revisar denúncias, revisar itens barrados pela triagem de medicamento, cadastrar oferta manual
    (nunca dispara push), gravar credenciais de fonte (só escrita).

## Mapa dos módulos futuros (sem rotas por enquanto)
- **Listas de presente** (chá de bebê, de fralda, chá revelação e afins): convidados abrem por link
  sem conta, escolhem um item e marcam "vou dar", aparecendo com nome ou anonimamente. Só itens de
  produtos que o app monitora. Link impossível de adivinhar; guardar o mínimo sobre o convidado.
  Provavelmente a mesma ideia de "lista com tipo" serve para lista de compras.
- **Comparador de preço entre lojas.**
- **Página da empresa/loja**: reputação, ofertas ativas, se entrega no CEP.
- **Comentários nas ofertas**: adiados. Exigem denúncia, bloqueio e moderação.
- **Preço-alvo por produto**: sugerido, não escolhido.

## Regras decididas
- **Denúncia** (aprovada). A oferta é escondida quando as denúncias de pessoas diferentes passam de um
  percentual da base de interesse daquela oferta; item de pouca saída esconde com poucas denúncias.
  Vai para a fila do operador, que pode restaurar. Cálculo inicial: limite =
  `max(2, ceil(10% × pessoas distintas que abriram ou clicaram nos últimos 7 dias))`, zerado quando o
  preço muda, uma denúncia por pessoa por oferta; números em config por tenant, a calibrar. O app
  não vê compras, só aberturas e cliques.
- **Plano** (aprovado): modelo B, grátis completo com anúncios; premium = sem anúncios + 3 CEPs.
- **Fonte pouco confiável** (aguardando aprovação) não aparece para o usuário até aprovar.
- **Medicamento** só no feed, sem push, até validação jurídica.
- **Orçamento zero**, com duas exceções: taxa do Google Play e, quando houver receita, conta Apple.

## Decisões em aberto (com recomendação)
1. **Login do operador.** Recomendo reaproveitar o código por e-mail com uma lista de operadores
   autorizados e token de audiência própria, mais registro de auditoria. Sem senha.
2. **Valor do premium.** No modelo B o premium vale pouco (sem anúncios e 3 CEPs). Risco de baixa
   conversão; os limites ficam em config para poder mudar de modelo sem quebrar o contrato.
3. **Provedor de e-mail** para o código: não escolhido; limites e preços não verificados.
4. **Termos da Lomadee** sobre link de afiliado em compartilhamento: ainda não lidos.
5. **Conformidade das lojas de apps** (login social, assinatura, conteúdo de usuário, exclusão de
   conta): confirmar nas regras vigentes de Google e Apple antes de publicar.
6. **Validação jurídica** da RDC 96/2008 para medicamento isento.
7. **Dados de crianças** em listas de presente (LGPD): avaliar quando o módulo for desenhado.
