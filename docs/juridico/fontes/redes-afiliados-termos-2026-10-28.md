# Redes de afiliados: o que dizem os termos públicos (leitura de 2026-10-28)

Projeto economae. Leitura somente de páginas públicas. **Nada foi cadastrado, enviado, aceito ou clicado** (detalhe na seção final).

## Como ler este arquivo

- Etiquetas de fonte: **[R]** = página oficial lida pela ferramenta de leitura (WebFetch); **[B]** = trecho de resultado de busca de uma página oficial; **[3]** = fonte de terceiros, não oficial (só serve de pista).
- A ferramenta de leitura resume a página e recusa citações longas. Por isso os "trechos literais" abaixo são curtos. Antes de decidir algo caro, confira no original os trechos marcados com ⚠.
- "Não encontrei" significa não encontrei nas páginas que consegui ler. Não prova que a regra não existe.

## Resumo para decisão (7 linhas)

1. **Amazon BR**: rastreamento de preço e alerta de preço são proibidos "salvo aprovação da Amazon". Existe caminho oficial para pedir aprovação (formulário de contato). Sem aprovação, o núcleo do economae não pode usar a Amazon.
2. **Amazon BR, cache**: dados de produto/preço da API ficam por no máximo 24 h (a documentação da Creators API fala em 1 h para ofertas). Isso conflita com guardar histórico de preço da Amazon.
3. **Mercado Livre**: não consegui ler nenhuma página oficial (bloqueio de robôs). Tudo sobre ML está sem confirmação.
4. **Shopee**: tem Open API (GraphQL) segundo fontes de terceiros; as páginas oficiais lidas não trazem regra sobre comparador, histórico ou alerta. Regra explícita de e-mail: só com consentimento prévio por escrito.
5. **Magalu**: página pública só traz comissão "até 12%" e a tabela por nível. Não achei termos, API nem regras de conduta nas páginas lidas.
6. **Awin Brasil**: termos de publisher incluem "aplicativo" como espaço de divulgação, mas as regras de e-mail, SEM, cupom e pessoa física são **por anunciante**. Vários varejistas pedidos aparecem com perfil público (Pague Menos, Carrefour, Casas Bahia, Kabum, O Boticário, Natura) e vários não apareceram (Drogasil, Droga Raia, Panvel, DPSP, Pacheco, Ultrafarma, Ri Happy, Baby&Co).
7. **Rakuten, Admitad, Afilio**: páginas públicas não trazem termos nem lista de anunciantes do Brasil. Afilio exige 5.000 seguidores / 700 membros / 30.000 visitas por mês e não menciona app.

---

## A. Mercado Livre

### O que não consegui ler e por quê
- `https://www.mercadolivre.com.br/ajuda/30228`: bloqueado (robots_disallowed).
- `https://www.mercadolivre.com.br/l/afiliados-politica`: bloqueado (robots_disallowed).
- `https://www.mercadolivre.com.br/l/primeiros-passos-perguntas-frequentes-para-afiliados`: bloqueado (robots_disallowed).
- `https://www.mercadolivre.com.br/l/afiliados-home`: bloqueado (robots_disallowed).
- `https://developers.mercadolivre.com.br` e as variantes `/pt-br/termos-e-condicoes` e `/pt_br/termos-e-condicoes`: erro do site (client_error). Também falhou `developers.mercadolibre.com.ar/es-ar-terminos-y-condiciones`.
- Não contornei o bloqueio (sem cópia em cache, espelho ou download pelo terminal). Para ML, o caminho é você abrir as 4 páginas no navegador e anexar o texto.

### Respostas (só com o que apareceu em busca e em terceiros)
1. Comparador, histórico, alerta: **não encontrei** regra oficial.
2. Cache de dados da API: **não encontrei** (termos do BR não lidos). Pista [B] da versão argentina dos termos de desenvolvedor (não é a do Brasil, pode diferir): a API e o conteúdo só podem ser usados "únicamente para facilitar, mejorar el uso y la funcionalidad del Sitio" (https://developers.mercadolibre.com.ar/es-ar-terminos-y-condiciones). ⚠ Se o BR tiver a mesma cláusula, um app de alerta de preço precisa de leitura jurídica.
3. App, push, e-mail: **não encontrei**.
4. API/feed: o portal de desenvolvedores existe (https://developers.mercadolivre.com.br/configuracao-ou-requisitos-previos aparece em busca, "Última atualização em 09/11/2025", exige conta ML e criar aplicação para obter credenciais [B]). **Não encontrei** API de afiliados/links nem campos.
5. Quem pode entrar [3]: maior de 18 anos, conta ML, conta Mercado Pago para receber, perfil público em rede social ou site, e não ser vendedor (https://www.hostinger.com/pt/tutoriais/?p=48808). Sem mínimo de seguidores (https://tactus.com.br/como-vender-como-afiliado-no-mercado-livre/amp/).
6. Proibições [3]: anúncio pago em buscador (Google Ads, Bing Ads) com link de afiliado; comprar pelo próprio link; WhatsApp e Telegram aparecem como canais permitidos (https://tactus.com.br/como-vender-como-afiliado-no-mercado-livre/).
7. Comissão por categoria: **não encontrei**. Janela de atribuição [3]: "o sistema registra esse acesso por 24 horas" (Tactus, mesma URL).

---

## B. Shopee

### Páginas lidas
- `https://shopee.com.br/blog/programa-de-afiliados-shopee/` [R] e [B].
- `https://affiliate.shopee.com.br` [R]: só voltou título e meta description ("Criadores e Afiliados Shopee | Shopee 2026"). O corpo é carregado por script e a leitura não pegou. `https://affiliate.shopee.com.br/open_api` também só voltou metadados.

### Respostas
1. Comparador, histórico, alerta: **não encontrei** regra no blog nem na página.
2. Armazenar preços/ofertas da API e por quanto tempo: **não encontrei**.
3. App, push, e-mail:
   - E-mail [R]: a lista do que não pode inclui "Uso de emails publicitários para promover a Shopee sem consentimento prévio por escrito." (https://shopee.com.br/blog/programa-de-afiliados-shopee/) ⚠
   - Push e app: **não encontrei** regra.
4. API: a Open API existe segundo terceiros [3], não li documentação oficial.
   - Endpoint [3]: `https://open-api.affiliate.shopee.com.br/graphql` (https://www.tabnews.com.br/matheustedi/pitch-shopix-pix-back-em-produtos-da-shopee).
   - Autenticação [3]: "SHA256 com AppId + Timestamp + Payload + Secret", header `Authorization: SHA256 Credential=..., Timestamp=..., Signature=...` (mesma URL do TabNews).
   - Credenciais: aba "Open API" no painel de afiliado, App ID e Secret (https://ce-docs.keywordrush.com/modules/affiliate/shopee [3]).
   - Operações citadas [3]: `generateShortLink`, `productOfferV2`, `shopOfferV2`, `shopeeOfferV2`, `conversionReport` (só 3 meses de dados), `listItemFeeds` + `getItemFeedData` (https://apify.com/viralanalyzer/shopee-affiliate-products).
   - Campos que um SDK de terceiros diz extrair [3]: "title, image URL, product URL, current price, discount rate, and offer link" (https://github.com/gregojoao/shopee-affiliate). EAN: **não encontrei**.
   - Limites de uso: **não encontrei**.
   - Aprovação [3]: "manual review, ~5-15 days" (Apify, mesma URL). Dado de terceiro, sem confirmação.
5. Quem pode entrar [R, blog]: logar com conta Shopee, informar rede social ou site com "links existentes e que levem diretamente para suas redes sociais", perfil público ("certifique-se de que o perfil colocado na inscrição não é privado"), "conta ativa com conteúdo atualizado nos últimos 3 meses". Terceiro [3]: 18+, CPF ou CNPJ (https://ecommercenapratica.com/blog/afiliados-shopee/). Mínimo de seguidores: **não encontrei**. App em loja: **não encontrei**.
6. Proibições [R, blog, seção "O que um afiliado não pode fazer?"] (a página diz que são práticas que bloqueiam comissão):
   - "Divulgação de links com a compra de palavras chave em anúncios no Google e redes sociais;"
   - "Anúncio do seu link de afiliado em sites de conteúdo impróprio;"
   - "Fraude ou uso indevido de mecanismos de busca para geração de cliques ou compras irregulares;"
   - "Uso de emails publicitários para promover a Shopee sem consentimento prévio por escrito."
   - Grupos privados, bots, scraping, cupons, comparação com outras lojas: **não encontrei**.
7. Comissão por categoria: **não encontrei** tabela no blog ("a página não lista taxas por categoria"). Terceiro antigo [3]: "até 14%" no lançamento (https://tecnoblog.net/477797/exclusivo-shopee-lanca-programa-de-afiliados-no-brasil-com-comissoes-de-ate-14/). Cookie: **não encontrei**.
- Observação: os termos da Shopee que aparecem em busca (help.shopee.sg) são de Singapura, não do Brasil. Não usei.

---

## C. Magalu (Parceiro Magalu / Influenciador Magalu)

### Páginas lidas
- `https://www.parceiromagalu.com.br` [R], `https://www.parceiromagalu.com.br/divulgador` [R], `https://www.parceiromagalu.com.br/divulgador/tudo-sobre-comissionamento` [R].
- `https://www.influenciadormagalu.com.br/cadastro/`: bloqueado (robots_disallowed). Não abri nada de cadastro.

### Respostas
1. Comparador, histórico, alerta: **não encontrei**.
2. Cache de dados: **não encontrei**.
3. App, push, e-mail: **não encontrei**.
4. API/feed de produtos: **não encontrei** link para API nas páginas lidas. As páginas não linkam termos, política nem FAQ (a seção de perguntas frequentes aparece vazia).
5. Quem pode entrar: a página diz "Crie sua loja virtual no Magazine Luiza em apenas 5 minutos." e que o programa é gratuito, sem lista de requisitos. Para receber, exige "nome, CPF, PIS, conta no mesmo CPF, data de nascimento e endereço" [R, comissionamento]. Terceiros [3] descrevem duas frentes, Divulgador (pessoa física) e Renda Extra (CNPJ) (https://www.divulganinja.com.br/blog/parceiro-magalu-10-perguntas-frequentes-erros-afiliados).
6. Proibições: **não encontrei** além de regras de pontuação de nível.
7. Comissão [R]: "No Influenciador Magalu você pode ganhar até 12% de comissão pela venda de um produto." Varia por categoria, por venda Magalu vs. lojista parceiro e por nível (Bronze 1.000, Prata 1.500, Ouro 3.500, Diamante 8.000 pontos). A página diz "As comissões por categoria referem-se a produtos vendidos e entregues pelo Magalu", mas a tabela por categoria não veio na leitura (link `tudo-sobre-comissionamento`). Pagamento mínimo R$ 50. Cookie ou janela de atribuição: **não encontrei**.

---

## D. Awin Brasil

### Páginas lidas
`https://www.awin.com/br` [R]; `https://www.awin.com/br/faqs` [R]; `https://www.awin.com/br/publisher-terms` [R]; PDF `https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2025/BR_PT-Awin-Brazil-Publisher-terms-August-2025.pdf` [R]; `https://awin.foleon.com/code-of-conduct-publisher/br/` [R]; `https://www.awin.com/br/search/advertiser-directory` [R]; perfis públicos `ui.awin.com/merchant-profile/...` [B] e [R]. Não abri a página de cadastro.

### Respostas
1. Comparador, histórico, alerta: os termos de publisher lidos **não tratam** do assunto (o leitor não achou cláusula). As permissões são por anunciante, nos perfis (ver tabela). A FAQ diz: "Cada anunciante define as próprias regras para aceitação de métodos de promoção." [R]
2. Guardar dados de feed/API: **não encontrei** prazo de cache. Cláusula 10.7 [R]: "O Afiliado utilizará a informação e os dados obtidos por e em conexão à sua participação na Rede" para as finalidades do contrato, e "A utilização com propósito distinto ou a divulgação de referidas informações ou dado com outra finalidade é proibida". ⚠ Vale ler essa cláusula inteira no PDF antes de montar histórico de preços a partir de feed.
3. App, push, e-mail:
   - App: cláusula 2.1 define Espaço Virtual do Afiliado como "o website, aplicativo ou outra forma de Espaço Publicitário virtual" [R].
   - E-mail: cláusula 1.5 menciona "operação de sites, aplicativos ou serviços (incluindo serviço de e-mail)"; cláusula 8.2 veda acordos paralelos como "marketing de correio eletrônico" sem "aprovação prévia e por escrito da Awin" [R]. A FAQ lista marketing por e-mail e newsletters entre canais aceitos [R].
   - Consentimento: cláusula 9.2.4: a publicidade "observará os Padrões de Publicidade e a Regulamentação de Dados" (LGPD) [R].
   - Push: **não encontrei** em nenhuma página Awin nem nos perfis.
4. API e feed [R, FAQ]: "a API da Awin oferece acesso direto aos dados da conta." e "Os feeds de produtos podem ser acessados pela aba Ferramentas na plataforma Awin." Create-A-Feed gera feed "via XML ou CSV" (https://www.awin.com/br/marketing-de-afiliacao/primeiros-passos-parte-1 [B]). Terceiro [3]: API de publisher REST com OAuth2 Bearer, listagem de anunciantes filtrável por país BR e link `awin1.com/cread.php` (https://apify.com/viralanalyzer/awin-multi-merchant-affiliate.md). Nome oficial da documentação, limites e campos (EAN, preço, imagem): **não encontrei**.
5. Quem pode entrar [R]: "O único requisito é que você possa criar links para um anunciante e divulgar o programa dele." Canais: "site, blog, canal de redes sociais ou outra plataforma digital." Cláusula 1.2: o formulário "poderá exigir o pagamento de um pequeno depósito" (FAQ BR diz que é reembolsado; a FAQ US cita "$1 refundable deposit" [B]). Cláusula 1.3: "A aceitação do Formulário de Adesão é discricionária". Cláusula 1.4.1: os termos padrão valem "se o Afiliado estiver registrado no Brasil". Aprovação em geral em até 24 h, mas cada anunciante aprova separadamente [R]. Seguidores mínimos: não há na Awin; há por anunciante.
6. Proibições (Awin): cláusula 10.5 veda "implementar engenharia reversa ou criar trabalhos derivados da Plataforma"; 9.2.9 veda usar a Plataforma para produto que concorra com ela [R]. Código de conduta [R, o leitor pode ter parafraseado, ⚠]: cashback só ativa com interação do usuário; extensões de cupom só acionam link "quando um cupom válido for aplicado"; "Os afiliados só iniciam o rastreamento por meio de um link de rastreamento de cliques se o usuário interagir." Grupos privados, bots, scraping: **não encontrei** regra explícita. Por anunciante, ver tabela.
7. Comissão e cookie: por anunciante, ver tabela.

### Anunciantes pedidos: o que apareceu no perfil público da Awin Brasil

| Marca | Achei na Awin BR? | O que o perfil público diz | Fonte |
|---|---|---|---|
| Pague Menos | Sim (ID 64086) | CPA 5%. Cookie: "14 Dias" no resumo e "30 days" na versão em inglês (diverge). E-mail, conteúdo, cupom, cashback, social permitidos. PF: português diz "NÃO É PERMITIDO: Afiliados PF", inglês lista pessoa física como permitida (diverge). SEM indireto só com termos casados. Push e app: não mencionados. | https://ui.awin.com/merchant-profile/64086 [R] |
| Carrefour | Sim (ID 17665) | 1P 2,5%; 3P, FOOD e gift card 1,15%. Atribuição: sessão, 3 dias de latência. "Esse programa atualmente não permite afiliados Pessoa Física". Não permitido: "Software/Extensão/Plugin", search direto e indireto, siteunder. | https://ui.awin.com/merchant-profile/17665 [B] |
| Casas Bahia | Sim (ID 17629) | 3% (1P), 2% (3P e APP). Não permite PF desde 29/09/2023. "Esse programa rastreia vendas finalizadas por aplicativo." Aprovação feita junto com o anunciante. | https://ui.awin.com/merchant-profile/17629 [B] |
| Kabum | Sim (ID 17729) | 2,30% (1P e 2P), 1,15% (3P). Permite PF (maiores de 18). "É proibida a divulgação de cupons não enviados pela Awin." | https://ui.awin.com/merchant-profile/17729 [B] |
| O Boticário | Sim (ID 17659) | Influenciadores 10%, cashback 6%. Cookie 30 dias. Não permite PF. Proibido: site under, SEM direto e indireto, Facebook Ads. Aprovação "pode levar algumas semanas". | https://ui.awin.com/merchant-profile/17659 [B] |
| Natura | Sim (ID 17658) | Duas páginas divergem: perfil mostra padrão 4,4% e cashback 8%; página de termos mostra 8% sem cupom e 3,5% com cupom. Restrições listadas incluem "Email Marketing" e search. "Esse programa atualmente não permite afiliados Pessoa Física". | https://ui.awin.com/merchant-profile/17658 e /merchant-profile-terms/17658 [B] |
| Americanas | Sim, como rede privada operada pela Awin | Estudo de caso: "rede privada da Awin" com mais de 4.000 parceiros. Termos e comissão não vistos. | https://www.awin.com/br/marketing-de-afiliacao/awin-privatenetwork-americanas [B] |
| Onofre | Indício | Citada como anunciante em evento Awin (2023). Perfil não achado. | https://www.awin.com/pt/noticias-e-eventos/events/awin-fashion-day-reune-marcas-e-afiliados-do-nicho-de-moda-e-beleza [B] |
| Magalu | Só terceiro | Lista de terceiros diz que há Magalu entre 252 anunciantes BR na Awin. Perfil não achado. | https://apify.com/viralanalyzer/awin-multi-merchant-affiliate.md [3] |
| Pão de Açúcar | Só terceiro | Mesmo caso do Magalu. | idem [3] |
| Sephora | Não no Brasil | Só achei Sephora PT e Sephora FR. | ui.awin.com/merchant-profile/27940 e /6964 [B] |
| Drogasil, Droga Raia, Panvel, Drogaria São Paulo, Pacheco, Ultrafarma, Ri Happy, Baby&Co | **Não encontrei** | Buscas restritas a ui.awin.com não devolveram perfil dessas marcas. Pode ser limite da busca. | n/a |
| Amazon | Não se aplica | Tem programa próprio (seção F). | n/a |

Outras farmácias/beleza com perfil Awin BR que apareceram (não pedidas): Drogal (4% todas as categorias, permite PF e e-mail), Drogaria Araujo (3,1%), Drogaria Venancio (7%), Farmácias Indiana (5,6%, permite PF), Farmácia Preço Popular, Beleza na Web, Avon (8%, sem PF e sem SEM).
Diretório público oficial (`https://www.awin.com/br/search/advertiser-directory`): a leitura voltou "Nada encontrado" (conteúdo carregado por script). Não sei se exige login.

---

## E. Rakuten Advertising Brasil, Admitad Brasil, Afilio

### Rakuten Advertising
Lidas [R]: `https://www.rakutenadvertising.com/pt-br/`, `https://rakutenadvertising.com/pt-br/`, `https://rakutenadvertising.com/publishers/`.
- Q1 a Q3, Q6, Q7: **não encontrei**. As páginas são institucionais ("Oferecemos marcas exclusivas, tecnologia avançada e suporte especializado...").
- Q4: há "Portal do Desenvolvedor" (https://developers.rakutenadvertising.com/) sem descrição do conteúdo. API/feed de produtos: **não encontrei**.
- Q5: cadastro em `https://publisher.rakutenadvertising.com/register` (não abri). Notícia antiga [3]: em 2020 passou a aceitar pessoa física com CPF ativo (https://www.abcdacomunicacao.com.br/pessoas-fisicas-agora-podem-ser-afiliadas-na-rakuten-advertising/). Pode ter mudado.
- Anunciantes do Brasil da sua lista: **não encontrei** lista pública. Estudos de caso citam Océane, iPlace e Decolar.
- Termos de publisher: só avisos legais, privacidade e cookies (https://rakutenadvertising.com/pt-br/avisos-legais/). Termos de afiliado: **não encontrei**.

### Admitad Brasil
- `https://www.admitad.com/pt/`: erro do site (client_error), não li.
- Páginas de programa em busca [B]: mostram cookie e métricas, e "As informações sobre a comissão estão disponíveis apenas para usuários autorizados". Cada programa tem regras na página do programa (base de conhecimento: "The rules for working with a particular program can be found on the program page (Menu > Rules)." https://admitad.useresponse.com/knowledge-base/article/what-is-admitad-the-basics_1).
- Q5: base de conhecimento diz que publishers usam "their own sites, social media pages, personal blogs, channels, or newsletters" (https://admitad.useresponse.com/knowledge-base/article/admitad-for-advertisers-the-basics_4). Requisitos de entrada: **não encontrei**.
- Anunciantes da sua lista no Admitad Brasil: **não encontrei** (as buscas devolveram programas de outros países).
- Q1 a Q4, Q6, Q7: **não encontrei**.
- Observação [3], outra rede (Indoleads, não Admitad, página antiga): o programa Pague Menos lá trazia "Push Notification Allow", "Emails Allow", "Cashbacks Forbidden", "SEO Forbidden" e comissão por categoria (dermocosméticos 8%, higiene e beleza 6%, demais 3%; RX controlados 0%) (https://indoleads.com/offers/en/offer/17345). Serve só como pista de que farmácias costumam restringir cashback e SEO.

### Afilio
Lidas [R]: `https://www.afilio.com.br`, `https://www.afilio.com.br/requisitos-afiliados/`, `https://www.afilio.com.br/faq/`.
- Q4: feed de produtos: **não encontrei**. API só aparece "no contexto de geração de deeplinks".
- Q5, trechos literais da página de requisitos:
  - Redes sociais: "Possuir ao menos **5.000** pessoas na rede"; "Ter ao menos **7%** da base ativa e engajada"; "Redes Sociais com perfis pessoais não serão aceitas".
  - WhatsApp e Telegram: "Possuir no mínimo **700** participantes".
  - Sites e blogs: "Possuir no mínimo **30.000** visitantes mensais".
  - E-mail marketing: "Possuir no mínimo 10.000 pessoas na base", explicar como a base foi criada e "como funcionam o opt-in e o opt-out".
  - Tecnologias: "Não há critério fixo" (reunião para avaliar).
  - FAQ: aberto a "Qualquer pessoa física ou pessoa jurídica" com site dentro das regras. App: a FAQ só fala de sites.
- Q6: sem proibições detalhadas além dos critérios acima. Q7: FAQ não detalha comissão.
- Anunciantes listados no site: Buser, Canon, Claro, Globoplay, Iguatemi 365, LATAM, Qualidoc, Movida, Nespresso, Philco, Santander, Uber. Nenhum da sua lista de marcas.
- Q1 a Q3: **não encontrei**.

---

## F. Amazon Associados Brasil

### Páginas lidas [R]
`https://associados.amazon.com.br/help/operating/policies`; `https://associados.amazon.com.br/help/operating/agreement`; `https://associados.amazon.com.br/help/node/topic/GRXPHT8U84RAYDXZ` (comissões); documentação Creators API em `affiliate-program.amazon.com/creatorsapi/docs/en-us/...` (register, concepts, best-programming-practices, license-agreement, faq, locale-reference, api-reference).

### Caminho oficial para pedir aprovação do item 6(y)
- Política, Requisitos cláusula 1: "A autorização prévia poderá ser iniciada com o preenchimento do formulário de Serviço de Atendimento para Associados". Formulário: https://associados.amazon.com.br/contact/ (não enviei nada). Para a Creators API em app móvel (Licença, cláusula 2(d)): vale "sem a nossa aprovação expressa, prévia e por escrito".
- Elegibilidade da Creators API [R] (https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api): "you must have an Amazon Associates account that has been reviewed and received final acceptance"; "Creators API sign up is available only to associates who have referred qualified sales". Pedido de aceitação final: pelo formulário Contact Us, "providing details about why you require access to the Creators API". Aprovação é por marketplace: precisa de "a valid Partner Tag for the target marketplace and Creators API access approved in that region" (FAQ).
- Documentação: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction; Brasil consta no Locale Reference, host `https://www.amazon.com.br` (https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference).

### Respostas
1. **Comparador, histórico, alerta.**
   - Alerta/rastreamento (Requisitos, cláusula 6(y)) ⚠: "seu Site não poderá ter recurso de rastreamento de preços e/ou de alerta de preços", com a ressalva "Salvo se de outra forma aprovado pela Amazon". (Duas leituras da mesma página bateram nesse trecho.) Não verifiquei se a definição de "Site" no contrato cobre app móvel; a Política de Aplicativos Móveis trata app como parte do programa, então trate como coberto até a Amazon dizer o contrário.
   - Comparativo (Requisitos 2(b)): se o preço aparece em formato "comparativo", "você deverá exibir o 'novo' preço mais baixo".
   - Histórico de preços: **não encontrei** menção direta; ver cache abaixo.
2. **Guardar preços/ofertas e cache** (Licença, cláusula 2) ⚠:
   - Imagens: "Você não irá armazenar nem armazenar em cache o Conteúdo de Anúncio de Produtos que consista em uma imagem" (leitura de resumo: só o link, por até 24 h).
   - Demais conteúdo: "por até 24 horas", com atualização imediata depois. ASINs podem ser guardados por prazo indeterminado (resumo do leitor).
   - Carimbo: "Você incluirá um carimbo de data/horário próximo à exibição das informações de preço ou de disponibilidade".
   - Documentação da Creators API [R] (best-programming-practices): "Creators API responses can be cached on your end under the guidelines defined in the License Agreement." Ofertas (preço): atualizar a cada 1 hora; demais recursos, a cada 1 dia. "Caching customer information derived from Amazon violates the Creators API Terms." Os links devem ser guardados e servidos sem alteração.
   - Conflito: política BR diz 24 h, documentação da API diz 1 h para ofertas. Aplique o mais restritivo até a Amazon esclarecer.
   - Inferência minha (não está escrita): com cache máximo de 24 h, uma série histórica de preços da Amazon construída a partir da API parece incompatível sem aprovação específica. Pergunte isso no pedido de aprovação.
3. **Divulgar em app, push e e-mail.**
   - E-mail, SMS e mensagens (Requisitos, cláusula 4): "Você poderá incluir Links Especiais em e-mails, SMS e mensagens diretas", "desde que tais comunicações sejam solicitadas".
   - Push: **não encontrei** menção.
   - App (Política de Aplicativos Móveis): "deverá estar disponível nas app stores Google Play, Apple ou Amazon"; "deverá ser gratuito para baixar"; "não poderá hospedar ou reproduzir páginas da Amazon nas WebViews". Só vira "Aplicativo Móvel Aprovado" após aceitação da Amazon (resumo).
4. **API.** Creators API (REST). Operações [R/B]: SearchItems, GetItems (até 10 IDs por chamada), GetVariations, GetBrowseNodes. Autenticação: "OAuth 2.0 client credentials flow". Recursos documentados: Images, ItemInfo (título, marca, descrição), BrowseNodeInfo, ParentASIN, SearchRefinements, VariationSummary; ofertas/preço citadas só na regra de cache (Offers). EAN e link rastreado (DetailPageURL): **não confirmei** nas páginas lidas (a página de referência não os lista). Limites de taxa: a página `concepts/api-rates-and-limits` deu erro, **não li**.
5. **Quem pode entrar.** Cláusula 1: o site precisa ter conteúdo original e ser acessível publicamente no endereço informado (resumo do leitor). Terceiro [3]: 3 vendas qualificadas em 180 dias para permanecer (https://www.hostgator.com.br/blog/programa-de-afiliados-da-amazon/). Seguidores mínimos: **não encontrei**.
6. **Proibições.** Links em meios offline vedados; sub-tags exigem aprovação e não podem ser ligadas a usuários finais individuais (Requisitos 2(b)); preços só podem ser exibidos nas condições previstas; promoções por tempo limitado devem sair do ar quando acabarem; app não pode emular compras da Amazon (resumo do leitor). Bots e scraping: **não encontrei** regra explícita nas partes lidas.
7. **Comissão e cookie.** Tabela "Comissão Padrão Fixa" [R]: **13%** para Bebê, Beleza, Beleza de Luxo, Saúde e Cuidados Pessoais, Aparelhos de Cuidados Pessoais, Bebidas Alcoólicas, Alimentos e Bebidas, Audiolivros; 11% Roupas e Pet Shop; 10% Livros; 9,5% Dispositivos Amazon; 8% Brinquedos, Casa, Eletrônicos e demais; 7% Bolsas, Calçados, Automotivo e Outros. Fraldas e Farmácia não aparecem como categorias próprias (a leitura não reproduz a tabela literal; confira os percentuais na página). Supermercado cai em "Alimentos e Bebidas" (inferência). Prazo de cookie: **não encontrei** nas páginas lidas.

---

## O que não consegui ler e por quê

| Item | Motivo |
|---|---|
| Mercado Livre: `ajuda/30228`, `l/afiliados-politica`, `l/primeiros-passos-...`, `l/afiliados-home` | Site bloqueia leitura automatizada (robots). Não contornei. |
| Mercado Livre: `developers.mercadolivre.com.br` e páginas de termos (BR e AR) | Erro do site (client_error). Termos do BR não lidos. |
| Shopee: `affiliate.shopee.com.br` e `/open_api` | Só metadados voltaram (conteúdo carregado por script). Documentação oficial da Open API não lida. |
| Shopee: termos do programa no Brasil | Não achei página pública de termos do BR; só a de Singapura apareceu em busca. |
| Magalu: `influenciadormagalu.com.br/cadastro/` | Bloqueado (robots). |
| Magalu: termos de uso, API, tabela por categoria | Páginas lidas não linkam termos nem API; tabela por categoria não veio. |
| Awin: diretório de anunciantes | Voltou "Nada encontrado" (carregamento por script). |
| Awin: cláusulas sobre comparador, push, scraping | O leitor não achou nada no PDF dos termos; ele pode ter visto só parte do documento. Confira no PDF. |
| Awin: código de conduta | Texto veio por leitura resumida; trechos entre aspas podem estar parafraseados. |
| Rakuten: termos de publisher e anunciantes do BR | Páginas públicas não trazem. Portal do desenvolvedor não aberto. |
| Admitad: `www.admitad.com/pt/` | Erro do site (client_error). Termos e regras por programa ficam atrás de login. |
| Afilio: termos de uso e API | Não há link de termos nas páginas lidas. |
| Amazon: `concepts/api-rates-and-limits` | Erro do site (client_error). Limites da Creators API não lidos. |
| Amazon: texto integral das cláusulas | A ferramenta recusou reproduzir seções longas; trabalhei com trechos curtos e resumos. Confira 6(y), 4, 2(b) e Licença 2 no original. |
| Amazon: cookie e tabela literal de comissões | A página de comissões lida não traz prazo de cookie e não reproduziu a tabela linha a linha. |

## Confirmação de que nada foi cadastrado, enviado ou aceito

- Usei apenas leitura de páginas públicas (WebFetch) e busca (WebSearch). Não abri navegador, não criei conta, não preenchi formulário, não cliquei em "cadastrar", "participar" ou "aceitar", não enviei e-mail nem mensagem.
- As URLs de cadastro (`publisher.rakutenadvertising.com/register`, `ui.awin.com/publisher-signup/br/...`, `dashboard.afilio.com.br/auth/register`, `associados.amazon.com.br/contact/`) aparecem neste arquivo só como texto. Não as acessei.
- Nenhuma página exigiu login que eu tenha tentado vencer. Onde havia bloqueio de robô ou erro, parei e registrei acima.
