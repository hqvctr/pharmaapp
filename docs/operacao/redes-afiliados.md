# Levantamento das redes de afiliados (2026-10-28)

Pesquisa **pública**, feita pelo Claude. Cada afirmação diz de onde veio: **[oficial]** = li a página do próprio programa; **[terceiro]** = blog, notícia, SDK ou
listagem (pode estar errado ou velho); **[não lido]** = a página bloqueou a leitura automática (HTTP 403 ou página que só carrega no navegador) e precisa do Cowork.
Nenhuma conta foi criada em nenhuma rede.

## O que uma fonte precisa permitir (critérios para ativar)
1. App de **comparação com histórico de preço** e **alerta/notificação de queda** (o núcleo do economae).
2. **Guardar** os preços coletados e por quanto tempo (cache).
3. Divulgar em **aplicativo móvel** (exigência de estar em loja de apps? tipo de canal?).
4. Dar **dados** utilizáveis: API ou feed com nome, preço, código de barras (EAN), imagem e **link rastreado**.
5. Ter o que o app precisa: fraldas, higiene do bebê, cuidados pessoais, farmácia e supermercado.
6. Requisitos para entrar (CPF ou CNPJ, seguidores, vendas mínimas) que o responsável consiga cumprir.
7. Não proibir link de afiliado em notificação, e-mail ou compartilhamento.

## Resumo
| Rede | Dá dados (API/feed)? | Permite rastrear preço e alertar? | Veredito agora |
|---|---|---|---|
| **Amazon Associates** | Sim (Creators API, que substituiu a PA-API) [oficial/terceiro] | **Não, salvo aprovação da Amazon** (política 6(y)) [oficial] | **Bloqueada para o núcleo do app** até haver aprovação por escrito |
| **Mercado Livre** | **Não há API de afiliados**; API de itens exige token e a busca documentada é por vendedor [oficial] | Termos não citam alerta, mas várias cláusulas conflitam (ver abaixo) | **Só vitrine manual**; não serve como fonte automática |
| **Shopee** | Open API de afiliados atrás de login (existência por terceiros) | **Sem cláusula contra** comparador, histórico ou alerta; "aplicativos" contam como mídia [oficial, 09/09/2026] | **Melhor candidata agora**; falta ler a Open API (precisa de login) |
| **Magalu (Influenciador Magalu)** | **Nenhuma API ou feed** [oficial] | Sem cláusula, mas só pessoa física (CPF e PIS) e loja virtual hospedada pelo Magalu | **Não serve como fonte de dados**; só link manual |
| **Awin** | Sim: feed de produtos por API para publishers [oficial], mas só a vertical "retail" e a lista de idiomas na documentação **não traz pt_BR** | Não lido | **Candidata forte**; precisa de conta de publisher para ver anunciantes e termos |
| **Rakuten Advertising** | Sem dado confiável para o Brasil | Não lido | A ler |
| **Admitad, Afilio** | Sem dado confiável | Não lido | A ler |
| **Lomadee (já ativa)** | Sim, por marca | Contrato silencioso sobre histórico e API (`docs/juridico/lomadee-termos.md`) | Ativa; **sem fralda** (relatório de marcas) |

## Amazon Associates Brasil [oficial, política atualizada em 14/04/2026]
Fonte: <https://associados.amazon.com.br/help/operating/policies> e <https://associados.amazon.com.br/help/operating/agreement>.
- **Requisitos de participação, 6(y):** *"Salvo se de outra forma aprovado pela Amazon, seu Site não poderá ter recurso de rastreamento de preços e/ou de alerta de preços."*
  A cláusula 1 do contrato conta "o aplicativo de software online" como Site. **O economae é um rastreador de preços com alerta: sem aprovação por escrito da Amazon, não pode usar a Amazon.**
- **Aplicativo móvel:** precisa estar na Google Play, Apple ou Amazon, ser gratuito, ter conteúdo original e não emular o app da Amazon. Usar "Conteúdo de Anúncio de Produtos" em app móvel exige
  *"aprovação expressa, prévia e por escrito"* (Licença, 2(d)), salvo "Aplicativo Móvel Aprovado".
- **Dados da API:** cache de até 24 horas; imagens não podem ser guardadas; proibido usar o conteúdo para treinar modelos; cada uso deve levar a uma página da Amazon.
- **6(z):** proibido usar o Conteúdo do Programa para anunciar produtos de outros sites (ou seja, não dá para misturar Amazon e outras lojas na mesma peça com dados da API).
- **Comparação:** quem exibe preço comparado deve mostrar o menor preço "novo" da Amazon e, se disponível, o "antigo".
- **E-mail e push:** links só em comunicações que a pessoa **solicitou**.
- **Sinal de fiscalização [terceiro, RetailDetail, 14/07/2026]:** a Amazon mandou comparadores (Holanda) tirarem preços dela de "gráficos de acompanhamento e notificações"
  (<https://www.retaildetail.eu/news/general/amazon-no-longer-allows-price-comparison-sites-to-track-price-changes/>). Não confirmado para o Brasil.
- **API:** a PA-API 5 foi substituída pela **Creators API** (OAuth 2.0; credenciais novas) [oficial: aviso de descontinuação em <https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation>].
  As datas de desligamento (30/04 e 15/05/2026) e a exigência de 10 vendas qualificadas em 30 dias para ter a API vêm de [terceiro]: **a confirmar**.
- **O que fazer:** pedir aprovação por escrito à Amazon (ação do responsável, via Cowork, por contato oficial do programa) ou **não usar a Amazon** para preço e alerta.
  Sem a aprovação, nem coletar nem exibir preço da Amazon.

## Mercado Livre [não lido]
A página dos termos (<https://www.mercadolivre.com.br/ajuda/30228>) e o portal de desenvolvedores bloquearam a leitura automática.
Do que apareceu em buscas [terceiro/trechos]: programa "Afiliados e criadores", comissão de até 16%; categorias excluídas (armas, conteúdo adulto, veículos, imóveis, usados, entre outras);
proíbe comprar pelos próprios links e **divulgar link ou ID em grupos privados ou sites não declarados** (afeta notificação e compartilhamento; ler com atenção);
para criadores aparece a exigência de mais de 10 mil seguidores no Instagram ou TikTok (a ver se existe caminho para site ou app). Os termos de desenvolvedores (versão argentina) proíbem serviço que
concorra com o Mercado Livre e compartilhar os dados obtidos. **A versão brasileira, a existência de API de afiliados e a regra sobre comparador/alerta precisam ser lidas.**

## Shopee Brasil [não lido]
Open API de afiliados em GraphQL (`https://open-api.affiliate.shopee.com.br/graphql`), assinatura HMAC-SHA256 com app id e secret, consultas `productOfferV2`, `shopOfferV2`, `generateShortLink`, `conversionReport`
[terceiro: SDKs e atores de terceiros, não a documentação oficial]. A API devolve só dados básicos (título, imagem principal, preço atual). Programa lançado com comissões de até 14% (Tecnoblog).
Elegibilidade (perfil social aberto com seguidores) **não confirmada**. A página de afiliados só carrega no navegador; ler termos, proibições ("O que um afiliado não pode fazer?") e documentação da Open API.

## Magalu [terceiro]
"Parceiro Magalu" (vitrine para divulgadores e "Renda Extra" para CNPJ), comissão de 1% a 12%, cadastro em parceiromagalu.com.br. Nenhuma API pública de produtos para parceiros foi encontrada. Termos oficiais não lidos.

## Awin [oficial, parcial]
- Feed de produtos para publishers por API (JSON Lines), com token no cabeçalho; só a vertical "retail"; a lista de idiomas da documentação (en_GB, fr_FR, de_DE, nl_NL, en_US...) **não mostra pt_BR**; alguns anunciantes ainda usam o sistema antigo de feeds
  (<https://developer.awin.com/apidocs/retail-publisher-productapidocumentation-1>).
- Brasil [terceiro]: centenas de anunciantes (número histórico). Citados por blogs: Renner, Casas Bahia, Americanas, Kabum, O Boticário. **Não** apareceu confirmação de Carrefour, Netshoes, Fast Shop nem de farmácias.
  Um perfil de anunciante brasileiro mostra taxa operacional de 25% sobre a comissão.
- Precisa de conta de publisher para ver o diretório de anunciantes e os termos de cada programa. **Cada anunciante tem termos próprios** (inclusive sobre comparador e alerta).

## Rakuten Advertising, Admitad, Afilio
Rakuten: pessoas físicas com CPF podem entrar (2020); CNPJ para operação profissional [terceiro]; sem dado de API ou feed para o Brasil. Admitad: rede com ferramentas de feed e deeplink [terceiro]; nada específico do Brasil.
Afilio: nada encontrado. Ler as páginas públicas de cada uma.

## Farmácias grandes (Drogasil, Droga Raia, Pague Menos, Drogaria São Paulo, Pacheco, Panvel, Ultrafarma)
- Não estão na Lomadee (relatório de marcas).
- Drogasil aparece num diretório de terceiros (FlexOffers) com 4,8%; Droga Raia aparece como **"not currently offering"** [terceiro]. Pague Menos: nada encontrado.
- A Drogasmil tem programa próprio "Minha Loja" (já atendida pela Lomadee).
- **Conclusão provisória:** afiliado como caminho para as grandes redes é incerto. Alternativas, que precisam de decisão do responsável e de leitura jurídica: coleta direta de páginas públicas das lojas (TIPO C do `SOURCES.md`:
  robots.txt, termos, frequência baixa; sem receita de afiliado), parceria direta, ou aceitar cobertura menor no começo.

## Implicação para o produto
O que o app faz (histórico de preço e alerta de queda) é **exatamente** o que a Amazon proíbe sem aprovação e o que ela fiscaliza ativamente em 2026. Antes de escrever qualquer adaptador, cada rede deve ser
checada nesse ponto. Ordem sugerida: (1) ler Mercado Livre e Shopee (grandes e com API); (2) abrir conta de publisher na Awin só para ver anunciantes e termos; (3) pedir aprovação por escrito à Amazon em paralelo,
sem depender dela.

---

## Atualização: leitura do Cowork (2026-10-28, `docs/juridico/fontes/redes-afiliados-termos-2026-10-28.md`)
O Cowork usou as mesmas ferramentas de leitura que eu (não o navegador), então ficou **sem leitura oficial**: Mercado Livre (4 páginas de afiliados e portal de desenvolvedores bloqueados por robots),
Shopee (conteúdo carrega por script), Magalu (termos e API não linkados), diretório de anunciantes da Awin, Rakuten, Admitad. Trechos entre aspas foram resumidos pela ferramenta: conferir no original antes de decisão cara.

**Confirmado:**
- **Amazon:** o caminho para pedir a aprovação do item 6(y) é o formulário de Atendimento para Associados (<https://associados.amazon.com.br/contact/>), citado pela própria política. A Creators API só abre para quem **já tem conta de Associado aprovada e vendas qualificadas** e
  pede aprovação por mercado, com justificativa; cache de 24 h (política) ou 1 h para ofertas (documentação da API): mesmo aprovado o alerta, um **histórico de preço da Amazon** parece incompatível sem aprovação específica. Comissão padrão de 13% em Bebê, Beleza, Saúde e Cuidados Pessoais, Alimentos e Bebidas.
  Caminho realista: conta de Associado primeiro (exige site ou app declarado e vendas), pedido de aprovação depois. **Baixa prioridade.**
- **Awin Brasil:** termos de publisher incluem "aplicativo" como espaço de divulgação (cláusula 2.1) e cada anunciante define as próprias regras. O cadastro **pode exigir um pequeno depósito** (cláusula 1.2; a FAQ diz que é reembolsado). A cláusula 10.7 limita o uso dos dados
  obtidos na Rede às finalidades do contrato (**ler inteira antes de montar histórico de preços a partir de feed**). Feed por API ou aba Ferramentas (XML/CSV); nome oficial da API, campos (EAN, imagem) e limites **não confirmados**.
- **Pessoa física:** vários anunciantes **não aceitam afiliado pessoa física**: Carrefour, Casas Bahia, O Boticário, Natura e Pague Menos (a versão em português diz que não; a em inglês diverge). Kabum, Drogal e Farmácias Indiana aceitam PF. **O projeto não tem CNPJ.**

| Anunciante na Awin BR | Comissão | PF? | Observação |
|---|---|---|---|
| Pague Menos (ID 64086) | CPA 5% | divergente (pt: não) | cookie 14 ou 30 dias (divergente); e-mail permitido; push e app não mencionados |
| Drogal | 4% | sim | e-mail permitido |
| Drogaria Araujo | 3,1% | ? | |
| Drogaria Venancio | 7% | ? | |
| Farmácias Indiana | 5,6% | sim | |
| Carrefour (ID 17665) | 1P 2,5%; 3P e alimentos 1,15% | não | proíbe "Software/Extensão/Plugin" (risco para app) |
| Casas Bahia (ID 17629) | 3% (1P), 2% (3P e APP) | não | rastreia vendas por aplicativo |
| Kabum (ID 17729) | 2,30% | sim | cupons só os enviados pela Awin |
| O Boticário (ID 17659) | 10% (influenciador) | não | aprovação demora semanas |
| Natura (ID 17658) | 4,4% a 8% | não | e-mail marketing restrito |
| Americanas | rede privada operada pela Awin | ? | termos não vistos |
Não encontrados na Awin BR (pode ser limite da busca): Drogasil, Droga Raia, Panvel, Drogaria São Paulo, Pacheco, Ultrafarma, Ri Happy, Baby&Co.
- **Shopee:** a lista de proibições do blog oficial inclui *"Uso de emails publicitários para promover a Shopee sem consentimento prévio por escrito"*; exigência de perfil público com conteúdo dos últimos 3 meses. Sem regra encontrada sobre comparador, histórico, alerta, push ou cache. Aprovação "manual, 5 a 15 dias" é de terceiro.
- **Mercado Livre:** nada oficial lido. De terceiros: sem mínimo de seguidores, WhatsApp e Telegram permitidos, janela de 24 h.
- **Afilio:** exige 5.000 pessoas na rede, 700 em grupos ou 30.000 visitantes por mês; só fala de sites. **Não serve agora.** Rakuten e Admitad: nada público sobre termos ou anunciantes do Brasil.

**Próximos passos propostos:** (1) leitura **em navegador** (não por ferramenta de busca) das páginas de Mercado Livre, Shopee e Magalu; (2) decidir **CNPJ** (muitos anunciantes da Awin exigem; também deixaria o contrato da Lomadee e a conta da Google Play em nome do projeto);
(3) decidir o cadastro de publisher na Awin (pode ter depósito) só para ver o diretório e os termos por anunciante; (4) Amazon fica por último.

---

## Atualização 2: leitura no navegador (2026-10-28, `docs/juridico/fontes/redes-afiliados-navegador-2026-10-28.md`)
Desta vez o Cowork leu as páginas no Chrome, com as cláusulas completas. Números de cláusula abaixo vêm desse arquivo.

### Mercado Livre: só vitrine manual
- **Sem API de afiliados** (a documentação de desenvolvedores não tem seção para isso); a API pública de itens usa Bearer token e a busca documentada é por vendedor. O link de afiliado sai de uma ferramenta do painel, e a cláusula 1.8 proíbe encurtar ou editar o link.
- **Os termos de afiliados não falam de alerta, histórico ou comparador, mas pesam contra o app:**
  - 5.3: *"O Afiliado não poderá fazer qualquer publicidade comparando os produtos [...] com qualquer produto, seja de empresa concorrente ou não."* (risco para qualquer comparação entre lojas.)
  - 5.4: nas divulgações só se pode mencionar *"as informações previstas expressamente nos anúncios"*. Um aviso "caiu de R$ X para R$ Y" usa um preço antigo que não está no anúncio.
  - 1.3: só contam como mídia as **redes sociais, sites e blogs informados antes de entrar**; divulgação em outra mídia *"não gerará pagamentos"*. Aplicativo e push não estão na lista.
  - 4.3 (c): proíbe coletar informações do Mercado Livre por scraping; só vale o que ele fornece.
- **Termos de desenvolvedores (API):** 5.2: o conteúdo do ML *"não poderá ser confundido nem combinado com o conteúdo de terceiros"* (impede lista misturada de lojas); 2.2.1.3 e 14: copias só *"na medida do necessário"* e apagadas de forma irreversível (conflita com guardar histórico);
  5.3: atualizar a cada 24 h (6 h para listagens); 5.4: estatísticas derivadas do site exigem autorização expressa.
- **Quem entra:** pessoa física ou jurídica, 18+, CPF, conta Mercado Pago, perfil público em mídia; o programa é desenhado para criadores de conteúdo (1.2 i).
- **Comissão:** Bebês 12% (venda direta) e 6% (indireta); Beleza e Cuidado Pessoal 16% e 8%; **Alimentos e Bebidas 0%**; **medicamentos e produtos farmacêuticos proibidos** (1.5). Atribuição de 24 h. Mínimo R$ 30 em 3 compradores distintos, pago no Mercado Pago.
- **Conclusão:** não há como alimentar o app automaticamente com preços do ML dentro dos termos lidos. Uso possível: oferta curada à mão com link do painel, **sem histórico e sem comparar com outras lojas**, e antes disso o advogado lê 5.3, 5.4 e as cláusulas da API.

### Shopee: melhor candidata
- Termos do Brasil (atualizados em 09/09/2026): **não há cláusula sobre comparador, histórico ou alerta**; "Mídia de Afiliado" inclui *"websites, aplicativos e boletins informativos"* (1.3); e-mail publicitário só com consentimento prévio por escrito (4.3 a); sem regra sobre push ou SMS.
  Proibido: scraping de propriedade intelectual da Shopee (4.3 d), anúncio pago em busca ou shopping (4.3 i), indexar URLs com ID de afiliado (4.3 k). Atribuição de 7 dias, último clique.
- **Atenção:** *"Sites e Apps especializados em tecnologia, cupons, ofertas, cashback [...] a taxa de comissão é sob consulta."* Um app de ofertas pode receber taxa diferente dos 3% padrão (mais a comissão extra do vendedor, até 30%); sem tabela por categoria.
- **Quem entra:** pessoa física ou jurídica, 18+, conta Shopee, perfil ou site público com conteúdo dos últimos 3 meses. PF recebe pela conta Maree (exige PIS/NIS/NIT), mínimo R$ 10 desde 01/09/2026; PJ recebe por transferência com nota fiscal. **Dá para começar sem CNPJ.**
- **API:** a página da Open API **exige login**, então ainda não li nome, autenticação, limites, campos nem regras de cache; por terceiros, a API devolve só título, imagem, preço atual, desconto e link, **sem código de barras** (os produtos não casariam por EAN com outras lojas).
- **Conclusão:** nada proíbe o que o app faz, mas falta ver a Open API e a taxa "sob consulta". Próximo passo: com a conta compradora já logada, só **ler** a página da Open API (sem se inscrever).

### Shopee: Open API lida (2026-10-29)
Relatório do Cowork: [docs/juridico/fontes/shopee-open-api-2026-10-29.md](../juridico/fontes/shopee-open-api-2026-10-29.md). A documentação abre com a conta logada; **o acesso à API não**.
- **Acesso:** o painel "Meu API" mostra `AppID: --` e `Senha: --` e o aviso *"No momento você não possui acesso à Plataforma de Open API dos Afiliados Shopee. Por favor, entre em contato com a gente para pedir acesso"*. O pedido vai pelo formulário https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091 (o mesmo do erro 10035). Sem isso não há adaptador rodando de verdade.
- **Chamada:** GraphQL, `POST https://open-api.affiliate.shopee.com.br/graphql`, `application/json`. Cabeçalho `Authorization: SHA256 Credential={AppId}, Timestamp={unix}, Signature={hex}`, com `Signature = sha256(AppId + Timestamp + corpo + Secret)` em hexadecimal minúsculo, sobre o **corpo exato enviado** (byte a byte). Relógio com no máximo 10 min de diferença. **Conferido pelo Claude (2026-10-29):** o exemplo da documentação (AppId `123456`, Secret `demo`, Timestamp `1577836800`) dá `dc88d72f...645412` quando o corpo tem a indentação original de 4 espaços, `{"query":"{\nbrandOffer{\n    nodes{\n        commissionRate\n        offerName\n    }\n}\n}"}` (a cópia do relatório perdeu os espaços). Como a assinatura usa o Secret, **ele não pode ficar só no segredo de rede** (o proxy não assina): vai cifrado no banco, como as credenciais da Lomadee (`credencial.js`).
- **Limite:** 8.000 chamadas por hora (erro 10030). Paginação por `page`/`limit` nas ofertas; o feed usa `offset`/`limit` até 500.
- **Dados de produto (`productOfferV2`):** `itemId`, `productName`, `priceMin`/`priceMax` (preço das variações, em reais, como texto), `priceDiscountRate` (%), `imageUrl` (**uma** foto), `productCatIds` (3 níveis), `shopId`/`shopName`/`shopType` (1 = loja oficial), `ratingStar`, `sales`, `offerLink` (já é link de afiliado), `productLink`, `periodStartTime`/`periodEndTime`, comissões. Filtros por `productCatId`, `shopId`, `itemId`, `keyword`, ordenação e `isKeySeller`.
- **O que não existe:** código de barras (EAN/GTIN), marca, estoque ou disponibilidade, frete, região do vendedor, mais de uma foto. Também não há exemplo de resposta JSON na documentação.
- **Product Feed:** `listItemFeeds` (FULL ou DELTA diário) e `getItemFeedData` (linhas em `columns`, JSON em texto, **colunas não documentadas**). No Portal, *Criativo > Feed de produto* tem dois feeds em CSV ("Shopee Oficial BR - 2022" e "Shopee Brasil - 2022"), até 100.000 produtos por arquivo, atualizados todo dia; o CSV dá para baixar já, sem a API, e mostra as colunas.
- **Link:** `generateShortLink(originUrl, subIds)` devolve `shortLink`; até 5 subIds, que voltam como `utmContent` no relatório de conversão (nunca pôr identificador de pessoa, D67). Tamanho, validade e idempotência não documentados.
- **Regras de uso dos dados:** a documentação **não fala** de cache, guarda, histórico, comparação, alerta nem push. Os termos do programa também não. Perguntar por escrito no pedido de acesso.
- **Conta:** mídia `https://economae.pages.dev/`, tipo de parceiro "Compração de preço" [sic]. **O tipo de afiliado aparece como "Empresarial"** (nome da empresa "economae"), apesar de a inscrição ter sido pensada como pessoa física e de não haver CNPJ. Há termos novos esperando aceite (repasse de comissão extra como intermediação, desde 01/08/2026) e a faixa *"complete suas Informações de Pagamento e Fiscais"*. As três coisas são do responsável.
- **O que isso muda no adaptador:** sem GTIN, a triagem de medicamento por código não funciona e o produto da Shopee não casa com o de outra loja; a coleta deve ir **só pelas categorias da Shopee mapeadas** (`productCatId`), com a trava por nome como reforço; frete fica `a_confirmar` e a cobertura é nacional; item que some do feed (ou DELTA `DELETE`) vira indisponível; quando `priceMin` ≠ `priceMax`, o preço depende da variação (ex.: tamanho de fralda) e não serve para queda de preço sem decisão do responsável.

### Magalu: não serve como fonte
Só **pessoa física** (CPF e PIS); empresa vai para outro produto. Loja virtual hospedada pelo Magalu; **sem API, feed ou catálogo**; copiar conteúdo e usar bots é proibido (10.5); e-mail só para base opt-in e sem quem não abriu em 180 dias (11.4.2). Comissão: Bebê 8% a 12%, Beleza e Saúde 5% a 8%, Mercado 5% a 8%, Marketplace 2% a 4%.
Serve, no máximo, como destino de link colocado à mão.

### O que isso significa para a cobertura
Fraldas e higiene do bebê hoje dependem de: **Shopee** (marketplace, sem EAN), **Awin** (farmácias Pague Menos, Drogal, Araujo, Venancio e Indiana, que vendem fralda e higiene, mas precisam do CNPJ em vários casos) e da Lomadee (Drogasmil e PromoFarma).
Amazon, Mercado Livre e Magalu ficam de fora da automação. A ordem fica: **Shopee agora (Open API lida em 2026-10-29; falta o acesso), Awin quando sair o CNPJ**.
