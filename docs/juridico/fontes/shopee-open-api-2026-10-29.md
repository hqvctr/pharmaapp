# Shopee Afiliados: leitura da Open API (economae)

Data: 29/10/2026, entre ~10:18 e ~10:42 (horário de Brasília). Navegador: Chrome do Victor (extensão Claude), conta de afiliado já logada.

## O que NÃO foi feito

- Nenhuma credencial copiada ou anotada. A tela mostrou "AppID: --" e "Senha: --", ou seja, não existe App ID nem Secret nesta conta.
- Nenhum formulário enviado. O pedido de acesso da regra 2 **não** foi feito (motivo na seção "O que saiu diferente").
- Nenhum termo aceito. O aviso "Atualizamos nossos Termos e Condições!" apareceu com o botão "Aceitar" e **não** foi clicado. "Cancelar" também não foi clicado.
- Nada comprado. Nenhuma configuração da conta alterada. Nenhum botão "Editar", "Aplicar", "Gerar", "Enviar" ou "Copiar" foi clicado.
- Nenhum arquivo baixado. O link do CSV do feed foi só exibido, não aberto.
- Nenhum formulário de contato aberto. Nenhuma mensagem ou e-mail enviado.
- Nenhum dado pessoal digitado. Sobre ler: ao procurar o campo "Tipo de afiliado" em Configurações da Conta, uma leitura automática da página trouxe para mim, de uma vez, os valores dos campos de contato (nome, ID, telefone, e-mail). Eles **não** foram anotados nem entram neste relatório. Daí em diante passei a ler com filtro que esconde e-mail e números.

## Tabela: o que cada página mostrou

| Horário (aprox.) | URL | O que apareceu |
|---|---|---|
| 10:16 | https://affiliate.shopee.com.br/open_api (navegador embutido do app) | Redirecionou para o login `https://shopee.com.br/buyer/login?next=...open_api`. Parei (regra 1). |
| 10:20 | https://affiliate.shopee.com.br/open_api (Chrome logado) | Painel "Meu API": "AppID: --", "Senha: --", botão "Aplicar", aviso de que a conta não tem acesso à Open API, bloco "Guia de Usuário". Faixa vermelha no topo pedindo as Informações de Pagamento e Fiscais. |
| 10:21 | mesma página, depois do clique em "Ver mais >>" | Abriu o aviso de termos novos "Atualizamos nossos Termos e Condições!" com botões "Cancelar" e "Aceitar". Nada clicado. |
| 10:22 | https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-da-Shopee-Termos-e-Condi%C3%A7%C3%B5es | Termos e Condições do Programa (aba que já estava aberta). |
| 10:24 | https://affiliate.shopee.com.br/open_api/home | Página inicial da documentação: lista de APIs e "Generic Procedures". |
| 10:25 | https://affiliate.shopee.com.br/open_api/document?type=overview | Overview: GraphQL, limite de 8000/hora, scrollId, explorer. |
| 10:27 | https://affiliate.shopee.com.br/open_api/document?type=authentication | Autenticação SHA256 completa, com exemplo. |
| 10:28 | https://affiliate.shopee.com.br/open_api/document?type=request_response | Endpoint, método POST, formato e códigos de erro. |
| 10:29 | https://affiliate.shopee.com.br/open_api/list?type=product_offer | productOfferV2 (o aviso de termos apareceu por cima, mas o texto pôde ser lido). |
| 10:31 | https://affiliate.shopee.com.br/open_api/list?type=short_link | generateShortLink, com exemplo cURL. |
| 10:32 | https://affiliate.shopee.com.br/open_api/list?type=shopee_offer | shopeeOfferV2 |
| 10:33 | https://affiliate.shopee.com.br/open_api/list?type=brand_offer | shopOfferV2 |
| 10:34 | https://affiliate.shopee.com.br/open_api/list?type=product_feed_offer | listItemFeeds |
| 10:35 | https://affiliate.shopee.com.br/open_api/list?type=product_feed_offer_detail | getItemFeedData |
| 10:36 | https://affiliate.shopee.com.br/open_api/list?type=conversion_report | conversionReport |
| 10:37 | https://affiliate.shopee.com.br/open_api/list?type=validation_report | validatedReport |
| 10:38 | https://affiliate.shopee.com.br/open_api/list?type=update_instructions | Histórico de versões (inclui o Product Feed API de 05/03/2026). |
| 10:39 | https://affiliate.shopee.com.br/creative/product_feed | Portal > Criativo > Feed de produto: 2 feeds com links de CSV. |
| 10:40 | https://affiliate.shopee.com.br/account_setting | Configurações da Conta, abas "Dados da conta" e "Informação de Mídia". |
| 10:41 | https://help.shopee.com.br/portal/10/search?keyword=API | Busca na Central de Ajuda: 77 resultados, nenhum título sobre Open API na 1ª página. |

## FEITO (ações)

- Escolhi o idioma "Português (BR)" no aviso de idioma da tela de login (navegador embutido, antes de trocar para o Chrome).
- Cliquei em "Ver mais >>" no painel da Open API, só para abrir o guia. O clique fez aparecer o aviso de termos.
- Cliquei em "Ver Link" no feed "Shopee Oficial BR - 2022". Isso só abre uma janela com o link do CSV, que fechei com Esc.
- Abri o menu da conta (nome no topo) e cliquei na aba "Informação de Mídia" em Configurações da Conta. São só navegação, sem edição.
- **Pedido de acesso à API: NÃO feito.** App ID e Secret **não foram exibidos**, porque não existem ("AppID: --", "Senha: --"). Eles ficariam no mesmo lugar, em https://affiliate.shopee.com.br/open_api, bloco "Meu API".

## SÓ OLHADO

Todo o resto: documentação, termos, feed, perfil e Central de Ajuda.

## O que saiu diferente do esperado

1. **A conta ainda não tem acesso à Open API, e o caminho indicado é um formulário de contato.** Texto literal do painel (https://affiliate.shopee.com.br/open_api, ~10:20):
   ```
   Meu API
   AppID: --
   Senha: --
   Aplicar
   No momento você não possui acesso à Plataforma de Open API dos Afiliados Shopee. Por favor, entre em contato com a gente para pedir acesso ou saber mais
   ```
   A documentação repete isso no erro 10035 e dá o link do formulário: `https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091`. A regra 4 proíbe abrir formulário de contato, então não abri. O botão "Aplicar" aparece em cinza. Não cliquei nele por três motivos: o próprio texto manda para o contato, o aviso de termos novos estava por cima e eu não sei o que ele abre. **Decisão sua:** pedir o acesso pelo formulário (você mesmo) ou me autorizar a clicar em "Aplicar" para ver o que aparece, sem enviar.
2. **Termos novos esperando aceite.** O aviso aparece nas páginas do Portal e da documentação. Texto literal (~10:21):
   ```
   Atualizamos nossos Termos e Condições!
   A partir de 01/08/2026, o fluxo de repasse das comissões adicionais pagas por marcas/vendedores a afiliados passará a operar sob um modelo de intermediação.
   Principais mudanças na plataforma:
   • Fluxo de pagamento: As comissões adicionais serão repassadas aos afiliados em valor bruto. A Shopee atuará estritamente como intermediadora do repasse e não realizará retenções tributárias na fonte sobre esses valores.
   • Obrigações fiscais: O tratamento tributário e a emissão dos documentos fiscais aplicáveis, passarão a ser de responsabilidade exclusiva e direta da marca/vendedor e do afiliado, de acordo com a legislação aplicável. Recomendamos consultar sua assessoria fiscal para garantir o tratamento correto deste modelo.
   • Comissão Shopee: Para afiliados pessoa jurídica, a emissão da nota fiscal referente à taxa de serviço/comissão da Shopee permanece obrigatória para a liberação do pagamento.
   Para continuar vendendo e usando nossos serviços, revise e aceite os novos termos.
   [Cancelar] [Aceitar]
   ```
   O link "novos termos" aponta para https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-da-Shopee-Termos-e-Condi%C3%A7%C3%B5es
3. **O tipo da conta aparece como "Empresarial", e não PF.** Em Configurações da Conta > Dados da conta, o campo "Tipo de afiliado" mostra "Empresarial" e o campo "Nome da empresa" mostra "economae". Vale conferir, porque os termos tratam PF e PJ de forma diferente no pagamento (nota fiscal, conta Maree x transferência).
4. **Faixa vermelha no topo do Portal:** "Por favor, complete suas Informações de Pagamento e Fiscais para receber suas comissões" (link para /payment_setting?status=2). Não abri.
5. **A documentação não traz exemplos de resposta JSON** em nenhuma API. O único exemplo de requisição completo é o cURL do generateShortLink. Também não mostra o schema das colunas do feed (getItemFeedData devolve `columns` como string JSON sem lista de colunas).
6. **Não existe "shopOffer" com esse nome no menu:** o item "Get Brand Offer List" abre a página "Get Shop Offer List" (query `shopOfferV2`).
7. **Termos:** a leitura automática cortou o texto em 50.000 de 60.593 caracteres. As cláusulas do fim (seções 15 em diante) não foram lidas por inteiro.
8. A página com a lista de categorias do Brasil (`https://seller.shopee.com.br/edu/category-guide`) não foi aberta, porque é do Portal do Vendedor e não da conta de afiliado. Por isso os IDs de categoria pedidos no passo 2g não foram copiados.

---

## 1. Abertura da Open API

- `https://affiliate.shopee.com.br/open_api`: com a conta logada, abre o painel "Abrir API" (menu lateral do Portal: **Abrir API > Abrir API**), com o bloco "Meu API" e o "Guia de Usuário" (texto literal no item 1 de "O que saiu diferente").
- Texto do Guia de Usuário:
  ```
  A plataforma Aberta de Afiliados da Shopee de API usa a especificação GraphQL para lidar com as solicitações.
  GraphQL é baseado no protocolo HTTP, portanto, é fácil de integrar com várias bibliotecas HTTP como cURL e Solicitações.
  Também há uma variedade de clientes de código aberto para escolher https://graphql.org/code/#graphql-clients.
  Para obter mais especificações sobre GraphQL, consulte https://graphql.org/.
  Ver mais >>
  ```
- "Ver mais >>" leva a `/open_api/home`. A documentação (em inglês) **abre mesmo sem acesso aprovado**.
- Página inicial da documentação (`/open_api/home`), literal:
  ```
  API Abilities
  Get Offer List: Get Shopee Offer List / Get Brand Offer List / Get Product Offer List / Get Product Feed Offer List / Get Product Feed Offer Detail
  Get Short Link: Get Short Link
  Get Conversion Report: Get Conversion Report / Get Validated Report
  Generic Procedures
  Register as an Affiliate
  Acquire AppID and Secret
  Choose the API You Need
  Development & Testing
  Online API Call
  View All
  Country & Region: Singapore, Indonesia, Taiwan, Vietnam, Malaysia, Philippines, Thailand, Brazil, Mexico, Poland, Chile, Colombia, Argentina
  ```
  ("View All" leva a `/open_api/document?type=overview`. Os itens de "Generic Procedures" não são links.)

## 2. Documentação

### a) Nome, endpoint e método

```
URL: https://affiliate.shopee.com.br/open_api/document?type=request_response  (~10:28 BRT)
Request and Response
Request
Open API request need to use the “POST” method, and the content type is application/json,
Endpoint is https://open-api.affiliate.shopee.com.br/graphql and no matter what operation is performed, the endpoint remains the same.

The request format is

{
"query": "...",
"operationName": "...",
"variables": { "myVariable": "someValue", ... }
}

where operationName and variables are optional fields.
Only when there are multiple operations in the query, OperationName is required.

Response

If Open API has received your request, it will return a response with an HTTP Status Code of 200. The data and error information will be returned in JSON format which is

{
"data": { ... },
"errors": [ ... ]
}

If no error occurs, the error information won’t be returned.
Error Structure
Field | Type | Description
message | String | Error overview
path | String | The location of the request in error
extensions | object | Error details
extensions.code | Int | Error code
extensions.message | String | Error description

Error Codes
Error code | Meaning | Description
10000 | System error | System error
10010 | Request parsing error | Incorrect query syntax, incorrect field type, API does not exist, etc
10020 | Identity authentication error | Signature is incorrect or expired
10030 | Trigger traffic limiting | The number of requests exceeds the threshold
11000 | Business processing error | Business processing error
```

### b) Autenticação (completa)

```
URL: https://affiliate.shopee.com.br/open_api/document?type=authentication  (~10:27 BRT)
Authentication
Overview

All requests provide authentication information through the Authorization Header.

Authentication header structure
Authorization: SHA256 Credentials={Appid}, Timestamp={Timestamp}, Signature={Calculation method:SHA256(Credential+Timestamp+Payload+Secret}
Example Of Authorization Header
Authorization: SHA256 Credential=123456, Timestamp=1599999999, Signature=9bc0bd3ba6c41d98a591976bf95db97a58720a9e6d778845408765c3fafad69d.
Description of all parts of Authorization header
Component

Description

SHA256 The algorithm used to calculate the signature, currently only supports SHA256.
Credential The Open API appId obtained from the affiliate platform is used to identify the request identity and calculate the signature.
Timestamp The difference between the timestamp of the request and the server time cannot exceed 10 minutes,
so please ensure that the time of the machine that initiated the request is accurate. Used to calculate the signature.
Signature Represented as a 256-bit signature of 64 lowercase hexadecimal characters.
Calculation method:SHA256(Credential+Timestamp+Payload+Secret)
Signature Calculation
Before sending a request, please obtain the AppId and Secret from here. (Please keep the secret equivalent to the password, don’t disclose it.)
Calculation Steps
Get the payload of the request, payload is a request body
{"query":"{\nbrandOffer{\n nodes{\n commissionRate\n offerName\n }\n}\n}"}
According to GraphQL standard, the request body must be in a valid JSON format.
When query by string conditions we should escape double quotes first. Like this,
{"query":"{conversionReport(purchaseTimeStart: 1600621200, purchaseTimeEnd: 1601225999, scrollId: "some characters"){...}}
Get the current timestamp
Construct a signature factor. Compose a string with AppId+Timestamp+Payload+Secret
Perform the SHA256 algorithm on the signature factor, signature=SHA256(Credential+Timestamp+Payload+Secret) to get the signature (lowercase hexadecimal)
Generate Authorization header: SHA256 Credential=${AppId}, Timestamp=${Timestamp}, Signature=${signature}

Example

Hypothesis AppId=123456, Secret=demo,
Current time=2020-01-01 00:00:00 UTC+0, Timestamp=1577836800,
Please send payload as

{"query":"{\nbrandOffer{\n nodes{\n commissionRate\n offerName\n }\n}\n}"}
Get the payload of the request
Get the current timestamp
Construct a signature factor: AppId+Timestamp+Payload+Sercet

Calculate the signature
signature=sha256(factor)，result should be dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412
Generate Authorization header
Authorization:SHA256 Credential=123456,
Timestamp=1577836800,Signature=dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412
```

Nos links da página, `{Appid}` e "here" apontam para `/open_api`, e `{Timestamp}`/"timestamp" apontam para `https://www.unixtimestamp.com/`.

Visão geral (overview), com limites, fuso, scrollId e ferramenta de teste:

```
URL: https://affiliate.shopee.com.br/open_api/document?type=overview  (~10:25 BRT)
API Calling Process
Shopee Affiliate Open API platform USES the GraphQL specification to handle requests.
GraphQL is based on the HTTP protocol, so it's easy to integrate with various HTTP libraries like cURL and Requests. There are also a variety of open source clients to choose from https://graphql.org/code/#graphql-clients.
For more specifications on GraphQL, please refer to https://graphql.org/.
Authentication
All requests use authorization headers to provide authentication information. For details, please refer to #Authentication.
Rate Limit
The system limits the number of API calls issued within a specified time period. The current system limit is 8000 times/hour.
If the limit is exceeded, the system will refuse to process the request. The client needs to wait for the next time window to resend the request.
Timestamp and Timezone
Shopee is using local time in UTC+ time format for each local region to store the data.
But regardless of your timezone, a timestamp represents a moment that is the same everywhere.
Get Timestamp here for Shopee Open API platform.
Important notes
Must Read
Scrollid
If you need to query multiple pages of data, you need to Query Twice or more!
The first query can get the content of the first page and scrollid, and the maximum number of data returned per page is 500.
Scrollid is used to help query the content of the second page and later. In order to get the content of the second page and later you Must Query with Scrollid.
Scrollid is one-time valid, the valid time is only 30 seconds.
So after the first request for scrollid, please query the content of the second and later page within 30 seconds.
The query without scrollid requires an interval of longer than 30 seconds.
Queryable Time range of conversion report
The available querying data time range is Recent 3 Months.
The time range that can be queried in the Open API is consistent with the time range of affiliate system portal.
If you query longer than the range, system will send error.
Tool to request and check
Here is an useful tool to make request and check:
https://open-api.affiliate.shopee.com.br/explorer/v2
https://open-api.affiliate.shopee.com.br/explorer
```

### c) Como obter App ID e Secret, validade, renovação

- A documentação diz só: "Before sending a request, please obtain the AppId and Secret from here. (Please keep the secret equivalent to the password, don’t disclose it.)". O link "here" leva a `/open_api` (painel "Meu API": "AppID: --", "Senha: --", botão "Aplicar").
- O acesso hoje depende de pedido pelo contato (erro 10035 e texto do painel).
- **Não há texto** sobre validade, renovação, revogação ou se o Secret pode ser visto de novo. Os únicos indícios são os erros "10020 Your App has been disabled" e "10020 Invalid Credential".

### d) Limites de uso

```
Rate Limit
The system limits the number of API calls issued within a specified time period. The current system limit is 8000 times/hour.
If the limit is exceeded, the system will refuse to process the request. The client needs to wait for the next time window to resend the request.
```
Erro ao passar: `10030 Trigger traffic limiting / The number of requests exceeds the threshold` (e "10030 Rate limit exceeded"). A documentação não diz se o limite vale por conta ou por app. Para paginação por scrollId: "The query without scrollid requires an interval of longer than 30 seconds".

### e) Todas as consultas e mutações

Lista do menu "API List": `shopeeOfferV2`, `shopOfferV2`, `productOfferV2`, `listItemFeeds`, `getItemFeedData`, `generateShortLink` (mutation), `conversionReport`, `validatedReport`. Texto copiado de cada página abaixo. Exemplos de resposta: **não existem na documentação**.

#### productOfferV2
```
URL: https://affiliate.shopee.com.br/open_api/list?type=product_offer  (~10:29 BRT)
New Version Update
Version 2.0
Get Product Offer List
Query: productOfferV2
ResultType: ProductOfferConnectionV2

Query parameters
Field | Type | Description | Example
shopId(New) | Int64 | Search by shop id | 84499012
itemId(New) | Int64 | Search by item id | 17979995178
productCatId(New) | Int32 | Filter specific Level 1 / Level 2 / Level 3 product category tiers using the category id.
  Please refer to the following link to find the correct category ids.
  SG https://seller.shopee.sg/edu/category-guide
  MY https://seller.shopee.com.my/edu/category-guide
  TH https://seller.shopee.co.th/edu/category-guide
  TW https://seller.shopee.tw/portal/categories
  ID https://seller.shopee.co.id/edu/category-guide
  VN https://banhang.shopee.vn/edu/category-guide
  PH https://seller.shopee.ph/edu/category-guide
  BR https://seller.shopee.com.br/edu/category-guide
  | 100001
listType | Int | Type of product offer list, (listType can only be used as a query parameter with matchId, can not be used as a query parameter with the rest of the input).
  ALL = 0;
  Recommendation product list, not available to sort
  HIGHEST_COMMISSION = 1;(To Be Removed)
  Highest commission product offer list, not available to sort
  TOP_PERFORMING = 2;
  Top performing product offer list, not available to sort
  LANDING_CATEGORY = 3;
  Product offer list of recommendation category in landing page, not available to sort
  DETAIL_CATEGORY = 4;
  Product offer list of specific category in detail page
  DETAIL_SHOP = 5;
  Product offer list of specific shop in detail page
  DETAIL_COLLECTION = 6;(To Be Removed)
  Product offer list of specific collection in detail page
  | 1
matchId | Int64 | The matchid for specific listType(matchId can only be used as a query parameter with listType, can not be used as a query parameter with the rest of the input).
  CategoryId for listType = LANDING_CATEGORY and DETAIL_CATEGORY;
  ShopId for listType = DETAIL_SHOP;
  CollectionId for listType = DETAIL_COLLECTION
  | 10012
keyword | String | Search by product name | shopee
sortType | Int |
  RELEVANCE_DESC = 1;
  Only for search by keyword, and sort by relevance with keyword
  ITEM_SOLD_DESC = 2;
  Sort by sold count from high to low
  PRICE_DESC = 3;
  Sort by price from high to low
  PRICE_ASC = 4;
  Sort by price from low to high
  COMMISSION_DESC = 5;
  Sort by commission rate from high to low
  | 2
page | Int | Page number | 2
isAMSOffer(New) | Bool | Filter by type of offer
  TRUE = Filter for offers that have seller (AMS) commission
  FALSE = Filter for all offers regardless of if there is seller (AMS) commission
  | true
isKeySeller(New) | Bool | Filter for offers from Shopee's key sellers;
  TRUE = Offers from key sellers;
  FALSE = All offers regardless of the key seller status
  | true
limit | Int | Number of data per page | 10

Response parameters
Field | Type | Description | Example
nodes | [ProductOfferV2]! | Data list |
pageInfo | PageInfo! | Page information |

ProductOfferV2 structure
Field | Type | Description | Example
itemId | Int64 | Item ID | 17979995178
commissionRate | String | Maximum Commission rate, e.g. set “0.0123” if the rate is 1.23% | "0.25"
sellerCommissionRate(New) | String | Seller Commission rate (Commission Xtra rate) | "0.25"
shopeeCommissionRate(New) | String | Shopee Commission rate | "0.25"
commission(New) | String | Commission amount = price * commissionRate
  Note: The unit is the local currency | "27000"
appExistRate(To Be Removed) | String | Commission rate for non-first-time order users of this product on the app, e.g. set “0.0123” if the rate is 1.23% |
appNewRate(To Be Removed) | String | Commission rate for new users of this product on the app, e.g. set “0.0123” if the rate is 1.23% |
webExistRate(To Be Removed) | String | Commission rate for non-first-time order users on the web, e.g. set “0.0123” if the rate is 1.23% |
webNewRate(To Be Removed) | String | Commission rate for new users of this product on the web, e.g. set “0.0123” if the rate is 1.23% |
price(To Be Removed) | String | Product Price
  Note: The unit is the local currency |
sales | Int32 | Sales count for this product | 25
priceMax(New) | String | Product maximum price
  Note: The unit is the local currency | "55.99"
priceMin(New) | String | Product minimum price
  Note: The unit is the local currency | "45.99"
productCatIds(New) | [Int] | Product category id. Returns category id level 1, level 2, level 3 in order, or 0 if the relevant level does not exist. | [100012,100068,100259]
ratingStar(New) | String | The product rating shown in Shopee Product Page | "4.7"
priceDiscountRate(New) | Int | The price discount shown in Shopee Product Page. 10 represents 10% | 10
imageUrl | String | Image url |
productName | String | Product name | IKEA starfish
shopId(New) | Int64 | Shop id | 84499012
shopName | String | Shop name | IKEA
shopType(New) | [Int] |
  OFFICIAL_SHOP = 1;
  Product offers from official shops / Shopee Mall sellers
  PREFERRED_SHOP = 2;
  Product offers from preferred sellers
  PREFERRED_PLUS_SHOP = 4;
  Product offers from preferred plus sellers
  | [], [1,4]
productLink | String | Product link | https://shopee.co.id/product/14318452/4058376611
offerLink | String | Offer link | https://shope.ee/xxxxxxxx
periodStartTime | Int | Offer Start Time | 1687539600
periodEndTime | Int | Offer End Time | 1688144399

PageInfo structure
Field | Type | Description | Example
page | Int | The current page number | 2
limit | Int | Number of data per page | 10
hasNextPage | Bool | If it has next page | true

Error Code Description
Error Code | Error Description | Remark
11000 | Business Error |
11001 | Params Error : {reason} |
11002 | Bind Account Error : {reason} |
10020 | Invalid Signature |
10020 | Your App has been disabled |
10020 | Request Expired |
10020 | Invalid Timestamp |
10020 | Invalid Credential |
10020 | Invalid Authorization Header |
10020 | Unsupported Auth Type |
10030 | Rate limit exceeded |
10031 | access deny |
10032 | invalid affiliate id |
10033 | account is frozen |
10034 | affiliate id in black list |
10035 | You currently do not have access to the Shopee Affiliate Open API Platform. Please contact us to request access or learn more. contact link : https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091 |
```

#### shopeeOfferV2
```
URL: https://affiliate.shopee.com.br/open_api/list?type=shopee_offer  (~10:32 BRT)
Version 2.0
Get Shopee Offer List
Query: shopeeOfferV2
ResultType: ShopeeOfferConnectionV2!
Query parameters
Field | Type | Description | Example
keyword | String | Search by offer name | clothes
sortType | Int |
  LATEST_DESC = 1
  Sort offers by latest update time
  HIGHEST_COMMISSION_DESC = 2
  Sort offers by commission rate from high to low
  | 1
page | Int | Page number | 2
limit | Int | Number of data per page | 10
Response parameters
Field | Type | Description | Example
nodes | [ShopeeOfferV2]! | Data list |
pageInfo | PageInfo! | Page information |
ShopeeOfferV2 structure
Field | Type | Description | Example
commissionRate | String | Commission rate, e.g. set “0.0123” if the rate is 1.23% |
imageUrl | String | Image url |
offerLink | String | Offer link |
originalLink | String | Original link |
offerName | String | Offer name |
offerType | Int |
  CAMPAIGN_TYPE_COLLECTION = 1;
  CAMPAIGN_TYPE_CATEGORY = 2;
  |
categoryId | Int64 | CategoryId returns when
  offerType = CAMPAIGN_TYPE_CATEGORY |
collectionId | Int64 | CollectionId returns when
  offerType = CAMPAIGN_TYPE_COLLECTION |
periodStartTime | Int | Offer start time |
periodEndTime | Int | Offer end time |
PageInfo structure
Field | Type | Description | Example
page | Int | The current page number | 2
limit | Int | Number of data per page | 10
hasNextPage | Bool | If it has next page | true
```

#### shopOfferV2
```
URL: https://affiliate.shopee.com.br/open_api/list?type=brand_offer  (~10:33 BRT)
(Menu: "Get Brand Offer List"; título da página: "Get Shop Offer List")
Version 2.0
Get Shop Offer List
Query: shopOfferV2
ResultType: ShopOfferConnectionV2
Query parameters
Field | Type | Description | Example
shopId(New) | Int64 | Search by shop id | 84499012
keyword | String | Search by shop name | demo
shopType(New) | [Int] | Filter by specific shop type
  OFFICIAL_SHOP = 1;
  Filter mall shop
  PREFERRED_SHOP = 2;
  Filter preferred(Star) shop
  PREFERRED_PLUS_SHOP = 4;
  Filter preferred(Star+) shop
  | [],[1,4]
isKeySeller(New) | Bool | Filter for offers from Shopee's key sellers;
  TRUE = Offers from key sellers;
  FALSE = All offers regardless of the key seller status
  | true
sortType | Int |
  SHOP_LIST_SORT_TYPE_LATEST_DESC = 1;
  Sort by last update time
  SHOP_LIST_SORT_TYPE_HIGHEST_COMMISSION_DESC = 2
  Sort by commission rate from high to low
  SHOP_LIST_SORT_TYPE_POPULAR_SHOP_DESC = 3
  Sort by Popular shop from high to low
  |
sellerCommCoveRatio(New) | String | The ratio of products with seller commission.
  e.g. set “0.123” if the rate is large or equal to 1.23% | "", “0.123”
page | Int | Page number | 2
limit | Int | Number of data per page | 10
Response parameters
Field | Type | Description | Example
nodes | [ShopOfferV2]! | Data list |
pageInfo | PageInfo! | Page information |
ShopOfferV2 structure
Field | Type | Description | Example
commissionRate | String | Commission rate, e.g. set “0.0123” if the rate is 1.23% | "0.25"
imageUrl | String | Image url | https://cf.shopee.co.id/file/id-11134201-7qul6-lfgbxyzg074186
offerLink | String | Offer link | https://shope.ee/xxxxxxxx
originalLink | String | Original link | https://shopee.co.id/shop/19162748
shopId | Int64 | Shop ID | 84499012
shopName | String | Shop name | Ikea
ratingStar(New) | String | Shop Rating in Product Detail Page | "3.7"
shopType(New) | [Int] |
  OFFICIAL_SHOP = 1;
  Product offers from official shops / Shopee Mall sellers
  PREFERRED_SHOP = 2;
  Product offers from preferred sellers
  PREFERRED_PLUS_SHOP = 4;
  Product offers from preferred plus sellers
  | [], [1,4]
remainingBudget(New) | Int | Remaining budget available for this seller's shop offer
  Unlimited (Offer does not have a budget limit. Offer will end only if the seller terminates the campaign) = 0
  Normal (Offer has above 50% budget remaining) = 3
  Low (Offer has below 50% budget remaining. Medium risk of running out of budget and offer being terminated early) = 2
  Very Low (Offer has below 30% budget remaining. High risk of running out of budget and offer being terminated early) = 1
  | 1
periodStartTime | Int | Offer start time | 1687712400
periodEndTime | Int | Offer end time | 1690822799
sellerCommCoveRatio(New) | String | The ratio of products with seller commission. e.g. set “0.0123” if the rate is large or equal to 1.23% | "", “0.123”
bannerInfo | BannerInfo | Banner Info |
PageInfo structure
Field | Type | Description | Example
page | Int | The current page number | 2
limit | Int | Number of data per page | 10
hasNextPage | Bool | If it has next page | true
BannerInfo structure
Field | Type | Description | Example
count | Int | Banner quantity | 13
banners | [Banner!]! | Banner |
Banner structure
Field | Type | Description | Example
fileName | String | Image file name | "454.jpg"
imageUrl | String | Image url | https://cf.shopee.co.id/file/id-11134297-23010-kq42y2823wlv9d
imageSize | Int | Image size | 1747107
imageWidth | Int | Image width | 5998
imageHeight | Int | Image height | 3000
Error Code Description: (mesma tabela da productOfferV2: 11000, 11001, 11002, 10020 x7, 10030, 10031, 10032, 10033, 10034, 10035)
```

#### listItemFeeds
```
URL: https://affiliate.shopee.com.br/open_api/list?type=product_feed_offer  (~10:34 BRT)
Get Product Feed Offer List
Query: listItemFeeds
ResultType: ItemFeedListConnection!
Query parameters
Field | Type | Description | Example
feedMode | FeedMode | Optional
  1. 'FULL' (Default): Contains every product in that category. Use this for your first download.
  2. 'DELTA': Only contains products that were added, updated, or removed since yesterday.
  | FULL
Response parameters
Field | Type | Description | Example
feeds | [ItemFeed!]! | Offer Data List |
ItemFeed structure
Field | Type | Description | Example
datafeedId | String! | The unique key used to fetch specific file details for the product catalog. | 12345_FULL_20260205
datafeedName | String! | The display name of the product catalog | Home Appliance - Preferred
referenceId | String! | An identifier that enables clients to map delta updates to the corresponding full feed | 373421936506056704
description | String! | A brief summary of the catalog content |
totalCount | Int64! | Total number of products within the catalog | 509
date | String! | The date when the product catalog was last synchronized or updated | 2026-02-08
feedMode | FeedMode! |
  1. 'FULL' (Default): Contains every product in that category. Use this for your first download.
  2. 'DELTA': Only contains products that were added, updated, or removed since yesterday.
  | FULL
```

#### getItemFeedData
```
URL: https://affiliate.shopee.com.br/open_api/list?type=product_feed_offer_detail  (~10:35 BRT)
Get Product Feed Offer Details
Query: getItemFeedData
ResultType: ItemFeedDataConnection!
Query parameters
Field | Type | Description | Example
datafeedId | String! | A unique identifier returned by the listItemFeeds API, used to track specific data snapshots
  Format: {datafeedId}_{feedMode}_{grassDate} | 12345_FULL_20260205
offset | Int | The starting point (index) from which to begin retrieving the current request's results | 0
limit | Int | The number of items to download per page; maximum allowed value is 500 | 500
Response parameters
Field | Type | Description | Example
rows | [ItemFeedDataRow!]! | Data List |
pageInfo | ItemFeedPageInfo! | Page Information |
ItemFeedDataRow structure
Field | Type | Description | Example
columns | String | Core data fields. JSON object strings containing column names and column values |
updateType | DeltaDataUpdateType | Only valid in DELTA mode. Indicates the change type of the record: NEW (new), UPDATE, DELETE. | NEW
ItemFeedPageInfo structure
Field | Type | Description | Example
offset | Int64! | The starting index for the current data segment | 0
limit | Int64! | The maximum number of records to return in this request | 500
totalCount | Int64! | The total number of available feed files matching the criteria | 1000
hasMore | Boolean! | A boolean flag indicating if more pages are available (TRUE: next page exists; FALSE: last page reached) | TRUE
```

#### generateShortLink (mutation)
```
URL: https://affiliate.shopee.com.br/open_api/list?type=short_link  (~10:31 BRT)
Get Short Link
Mutation: generateShortLink
ResultType: ShortLinkResult!
Parameters
Field | Type | Description | Example
originUrl | String! | Original url | https://shopee.com.br/Apple-Iphone-11-128GB-Local-Set-i.52377417.6309028319
subIds | [String] | Sub id in utm content in tracking link, it has five sub ids | ["s1","s2","s3","s4","s5"]
Result
Field | Type | Description | Example
shortLink | String! | Short link |
Example
curl -X POST 'https://open-api.affiliate.shopee.com.br/graphql' \
-H 'Authorization:SHA256 Credential=123456, Signature=x9bc0bd3ba6c41d98a591976bf95db97a58720a9e6d778845408765c3fafad69d, Timestamp=1577836800' \
-H 'Content-Type: application/json' \
--data-raw '{"query":"mutation{\n generateShortLink(input:{originUrl:"https://shopee.com.br/Apple-Iphone-11-128GB-Local-Set-i.52377417.6309028319",subIds:["s1","s2","s3","s4","s5"]}){\n shortLink\n }\n}"}'
```

#### conversionReport
```
URL: https://affiliate.shopee.com.br/open_api/list?type=conversion_report  (~10:36 BRT)
Get Conversion Report data
Query: conversionReport
ResultType: ConversionReportConnection!
Query parameters
Field | Type | Description | Example
purchaseTimeStart | Int | Start of place order time range, unix timestamp |
purchaseTimeEnd | Int | End of place order time range, unix timestamp |
completeTimeStart | Int | Start of order complete time range, unix timestamp |
completeTimeEnd | Int | End of place order time range, unix timestamp |
shopName | String | Shop name |
shopId | Int64 | Shop id |
shopType | [String] | ShopType:
  ALL
  SHOPEE_MALL_CB
  SHOPEE_MALL_NON_CB
  C2C_CB
  C2C_NON_CB
  PREFERRED_CB
  PREFERRED_NON_CB
  | [SHOPEE_MALL_CB]
checkoutId(To Be Removed) | Int64 | Checkout id |
conversionId | Int64 | ConversionId, known as Checkout id before |
conversionStatus(To Be Removed) | String | Conversion Status:
  ALL(default),
  PENDING,
  COMPLETED,
  CANCELLED |
orderId | String | Order id |
productName | String | Product name |
productId | Int64 | Product id |
categoryLv1Id | Int64 | Level 1 category id |
categoryLv2Id | Int64 | Level 2 category id |
categoryLv3Id | Int64 | Level 3 category id |
orderStatus | String | Order Status:
  ALL(default),
  UNPAID,
  PENDING,
  COMPLETED,
  CANCELLED |
buyerType | String | Buyer type:
  ALL(default),
  NEW,
  EXISTING |
attributionType | String | Attribution type:
  Ordered in Same Shop
  Ordered in Different Shop |
device | String | Device type:
  ALL(default),
  APP,
  WEB |
limit | Int | The maximum number of return data |
fraudStatus | String | Fraud Status:
  ALL,
  UNVERIFIED,
  VERIFIED,
  FRAUD |
scrollId (important) | String | Page cursor, empty for the first query.
  Note: valid time is 30 seconds, that is, the time interval between two requests cannot exceed 30 seconds, Otherwise, the cursor expires, Need to re-initiate the query.
  If you need to query multiple pages of data, you need to Query Twice or more!
  The first query can get the content of the first page and scrollid, and the maximum number of data returned per page is 500
  Scrollid is used to help query the content of the second page and later. In order to get the content of the second page and later you Must Query with Scrollid
  Scrollid is one-time valid, the valid time is only 30 seconds
  So after the first request for scrollid, please query the content of the second and later page within 30 seconds
  The query without scrollid requires an interval of longer than 30 seconds |
campaignPartnerName(New) | String | Affiliate campaign partner |
campaignType(New) | String | Campaign Type:
  ALL(default),
  Seller Open Campaign,
  Seller Target Campaign,
  MCN Campaign,
  Non-Seller Campaign |

Response parameters
Field | Type | Description | Example
nodes | [ConversionReport]! | Data list |
pageInfo | PageInfo! | Page information |

ConversionReport structure
Field | Type | Description | Example
purchaseTime | Int | Purchase Time |
clickTime | Int | Click Link Time |
checkoutId(To Be Removed) | Int64 | Conversion id |
conversionId | Int64 | Conversion id |
conversionStatus(To Be Removed) | String | Conversion Status:
  ALL
  PENDING
  COMPLETED
  CANCELLED |
grossCommission(To Be Removed) | String | Gross Shopee Commission
  Calculated Shopee commission before commission cap applies
  Note: The unit is the local currency |
cappedCommission(To Be Removed) | String | Capped Shopee Commission
  Calculated Shopee commission after commission cap applies
  Note: The unit is the local currency |
totalBrandCommission(To Be Removed) | String | Total seller commission in one conversion.
  Note: The unit is the local currency |
estimatedTotalCommission(To Be Removed) | String | Gross Commission
  Estimated total commission will be paid to you (before validation) |
shopeeCommissionCapped | String | Gross Shopee Commission: Calculated Shopee commission after commission cap applies.
  Note: Amounts are denoted in local currency. |
sellerCommission | String | Gross Seller Commission: Calculated Seller commission.
  Note: Amounts are denoted in local currency. |
totalCommission | String | Gross commission from the seller and Shopee, after applying the commission cap but before deducting the MCN management fee.
  Note: Amounts are denoted in local currency. |
buyerType | String | Buyer Status
  Buyer status: New or Existing |
utmContent | String | sub id
  Value(s) passed in your sub-id(s) parameter in your Affiliate link(s) |
device | String | Device type |
referrer | String | Referrer |
orders | [ConversionReportOrder]! | Order list in conversion |
linkedMcnName(New) | String | The name of MCN that affiliate has been linked with. |
mcnContractId(New) | Int64 | The contract id between affiliate and linked MCN |
mcnManagementFeeRate(New) | String | The rate of the management fee allocated to the MCN, based on the gross commission. |
mcnManagementFee(New) | String | The management fee allocated to MCN based on total gross commission.
  Note: Amounts are denoted in local currency. |
netCommission(New) | String | Net commission from the seller and Shopee, calculated after applying the commission cap and deducting the MCN management fee.
  Note: Amounts are denoted in local currency. |
campaignType(New) | String | Campaign Type:
  ALL(default),
  Seller Open Campaign,
  Seller Target Campaign,
  MCN Campaign,
  Non-Seller Campaign |

ConversionReportOrder structure
Field | Type | Description | Example
orderId | String | Order id |
orderStatus | String | Order Status:
  UNPAID,
  PENDING,
  COMPLETED,
  CANCELLED |
shopType | String | Shop type:
  SHOPEE_MALL_CB
  SHOPEE_MALL_NON_CB
  C2C_CB
  C2C_NON_CB
  PREFERRED_CB
  PREFERRED_NON_CB |
items | [ConversionReportOrderItem]! | Item list in order |

ConversionReportOrderItem structure
Field | Type | Description | Example
shopId | Int64 | Shop id |
shopName | String | Shop name |
completeTime | Int | open_api_order_completed_time_description |
itemId | Int64 | Item id |
itemName | String | Item name |
itemPrice | String | Item price
  Note: The unit is the local currency |
displayItemStatus(New) | String | The combined status of order status and fraud status for item |
actualAmount | String | Purchase Value:
  Paid item value of user when purchase. Excluded from rebates (vouchers, discounts, cashback, etc) and shipping fee.
  Note: Amounts are denoted in local currency. |
qty | Int | Item Quantity |
imageUrl | String | Image url |
itemCommission(To Be Removed) | String | Item Shopee Commission
  Total Shopee platform commission in one item(before checkout cap)
  Note: The unit is the local currency |
grossBrandCommission(To Be Removed) | String | Item Brand Commission
  Additional commission from Brand offers in one item. Will be added on top of Shopee commission
  Note: The unit is the local currency |
itemTotalCommission | String | Total commission from seller and Shopee before MCN management fee deduction.
  Note: Amounts are denoted in local currency. |
itemSellerCommission | String | Commission from Seller offers in one item.
  Note: Amounts are denoted in local currency. |
itemSellerCommissionRate | String | The rate of the commission offered by the seller |
itemShopeeCommissionCapped | String | Shopee platform commission in one item(after order cap).
  Note: Amounts are denoted in local currency. |
itemShopeeCommissionRate | String | The rate of the commission offered by Shopee |
itemNotes | String | Textual explanation of pending, cancel, and fraud status |
channelType | String | Buyer order source channels |
attributionType | String | Buyer order specific type |
globalCategoryLv1Name | String | Level 1 global category name |
globalCategoryLv2Name | String | Level 2 global category name |
globalCategoryLv3Name | String | Level 3 global category name |
fraudStatus | String | Fraud status |
modelId | Int64 | Model id is the unique id per item variation |
promotionId | String | Promotion id is the unique id per bundle deal and add on deal items |
campaignPartnerName(New) | String | The name of the campaign partner who initiated the MCN campaign that affiliate promoted and drove orders for. |
campaignType(New) | String | Campaign Type:
  ALL(default),
  Seller Open Campaign,
  Seller Target Campaign,
  MCN Campaign,
  Non-Seller Campaign |

PageInfo structure
Field | Type | Description | Example
limit | Int | Number of data per page | 20
hasNextPage | Bool | If it has next page | true
scrollId | String | Page cursor, empty for the first query. (mesmo texto de nota do parâmetro scrollId acima) |

Error Code Description: (mesma tabela da productOfferV2: 11000, 11001, 11002, 10020 x7, 10030, 10031, 10032, 10033, 10034, 10035)
```

#### validatedReport
```
URL: https://affiliate.shopee.com.br/open_api/list?type=validation_report  (~10:37 BRT)
Get Validated Report Data
Query: validatedReport
ResultType: ValidatedReportConnection!
Query parameters
Field | Type | Description | Example
validationId(New) | Int64 | Validation id, can be found in Billing Information |
limit | Int | The maximum number of return data |
scrollId (important) | String | Page cursor, empty for the first query.
  Note: valid time is 30 seconds, that is, the time interval between two requests cannot exceed 30 seconds, Otherwise, the cursor expires, Need to re-initiate the query.If you need to query multiple pages of data, you need to Query Twice or more!
  The first query can get the content of the first page and scrollid, and the maximum number of data returned per page is 500
  Scrollid is used to help query the content of the second page and later. In order to get the content of the second page and later you Must Query with Scrollid
  Scrollid is one-time valid, the valid time is only 30 seconds
  So after the first request for scrollid, please query the content of the second and later page within 30 seconds
  The query without scrollid requires an interval of longer than 30 seconds |

Response parameters
nodes | [ValidatedReport]! | Data list
pageInfo | PageInfo! | Page information

ValidatedReport structure
purchaseTime | Int | Purchase Time
clickTime | Int | Click Link Time
conversionId | Int64 | Conversion id
shopeeCommissionCapped | String | Gross Shopee Commission: Calculated Shopee commission after commission cap applies. Note: Amounts are denoted in local currency.
sellerCommission | String | Gross Seller Commission: Calculated Seller commission. Note: Amounts are denoted in local currency.
totalCommission | String | Gross Commission from Shopee and Seller after commission cap applies. Note: Amounts are denoted in local currency.
buyerType | String | Buyer Status / Buyer status: New or Existing
utmContent | String | Sub id / Value(s) passed in your sub-id(s) parameter in your Affiliate link(s)
device | String | Device type
referrer | String | Referrer
orders | [ValidatedReportOrder]! | Order list in conversion
linkedMcnName(New) | String | The name of MCN that affiliate has been linked with.
mcnContractId(New) | String | The contract id between affiliate and linked MCN
mcnManagementFeeRate(New) | String | The rate of the management fee allocated to the MCN, based on the gross commission.
mcnManagementFee(New) | String | The management fee allocated to MCN based on total gross commission. Note: Amounts are denoted in local currency.
netCommission(New) | String | Net commission from the seller and Shopee, calculated after applying the commission cap and deducting the MCN management fee. Note: Amounts are denoted in local currency.
campaignType(New) | String | Campaign Type: ALL(default), Seller Open Campaign, Seller Target Campaign, MCN Campaign, Non-Seller Campaign

ValidatedReportOrder structure
orderId | String | Order id
orderStatus | String | Order Status UNPAID PENDING COMPLETED CANCELLED
shopType | String | Shop type: SHOPEE_MALL_CB SHOPEE_MALL_NON_CB C2C_CB C2C_NON_CB PREFERRED_CB PREFERRED_NON_CB
items | [ValidatedReportOrderItem]! | Item list in order

ValidatedReportOrderItem structure
shopId | Int64 | Shop id
shopName | String | Shop name
completeTime | Int | Affiliate Order Complete Time
itemId | Int64 | Item id
itemName | String | Item name
itemPrice | String | Item price / Note: The unit is the local currency
displayItemStatus(New) | String | The combined status of order status and fraud status for item
actualAmount | String | Purchase Value: Paid item value of user when purchase. Excluded from rebates (vouchers, discounts, cashback, etc) and shipping fee. Note: Amounts are denoted in local currency.
qty | Int | Item Quantity. Note: It refers to adjusted item quantity for the Adjusted Orders.
imageUrl | String | Image url
itemTotalCommission | String | Total commission from seller and Shopee. Note: Amounts are denoted in local currency.
itemSellerCommission | String | Commission from Seller offers in one item. Note: Amounts are denoted in local currency.
itemSellerCommissionRate | String | The rate of the commission offered by the seller
itemShopeeCommissionCapped | String | Shopee platform commission in one item(after order cap). Note: Amounts are denoted in local currency.
itemShopeeCommissionRate | String | The rate of the commission offered by Shopee
itemNotes | String | Textual explanation of pending, cancel, and fraud status
channelType | String | Buyer order source channels
attributionType | String | Buyer order specific type
globalCategoryLv1Name | String | Level 1 global category name
globalCategoryLv2Name | String | Level 2 global category name
globalCategoryLv3Name | String | Level 3 global category name
refundAmount | String | Refund amount / Only for Digital Product, order confirmed received by user with partial refund
fraudStatus | String | Fraud status
modelId | Int64 | Model id is the unique id per item variation
promotionId | String | Promotion id is the unique id per bundle deal and add on deal items
campaignPartnerName(New) | String | The name of the campaign partner who initiated the MCN campaign that affiliate promoted and drove orders for.
campaignType(New) | String | Campaign Type: ALL(default), Seller Open Campaign, Seller Target Campaign, MCN Campaign, Non-Seller Campaign

PageInfo structure
limit | Int | Number of data per page | 20
hasNextPage | Bool | If it has next page | true
scrollId | String | (mesmo texto de nota do parâmetro scrollId)

Error Code Description: (mesma tabela da productOfferV2)
```

#### Histórico de versões

```
URL: https://affiliate.shopee.com.br/open_api/list?type=update_instructions  (~10:38 BRT)
New Version Update
Some of Shopee Open API platform features have been optimized.
But The old API version is still available. Affiliate partners can choose update your API accordingly or not.
Update on 2026-03-05
Open API New Product Feed API Release
- This guide explains how to use the Shopee OpenAPI Product Feed to retrieve and manage product data for your affiliate business. The system is designed to provide you with a full catalog of products and keep them updated daily with minimal effort, following the steps below:
Find your files: Use the Get Product Feed Offer List API to see available product feeds.
Initial Setup: Download the "FULL" data file to populate your database for the first time.
Update Links: Replace your existing product links with the product_short link provided in the feed (they can get users faster to open the Shopee app).
Daily Maintenance: Use "DELTA" files every day to only download the items that have changed, saving time and bandwidth.
Update on 2024-11-15
The Conversion Report API now includes new fields such as netCommission and campaignType, and updates existing fields to provide more detailed commission information.
The Validated Report API has also been updated with new fields and modifications to existing fields.
Newly added fields are labeled as "New," while deprecated fields are marked as "To Be Removed".
Update on 2024-11-04
Add new fields in ShopOfferV2 API to view seller commission related info.
Add new sort type in ShopOfferV2 API to support query by popular shop.
Update on 2023-08-04
Product Offer V2 API add some fields about Item Info, Shop Info.
Shop Offer V2 API add some fields about Item Info, Shop Info and Offer Status.
Conversion Report API add Item Status; and Validated Report API can return the corresponding billing details by validation id.
All new fields are labeled as "New". All fields to be deprecated are marked as "To Be Removed".
Update on 08/05/2023
Checkout response info will change from one response per checkout ID to multiple responses per checkout ID, this will occur when there are multiple order IDs under the same checkout ID.
Updated/added some fields. Affected fields are labeled as "New".
Some fields will be removed on 2023-08-01. Affected fields are labeled as "To Be Removed".
Update on 2022-12-20
Add new fields to fit the front-end interface optimization in Conversion Report API.
Update on 2022-05-12
Sunset local category fields in Conversion Report API.
Update on 2022-01-30
Provide Get Brand Offer API v2.0.
Update on 2021-08-03
Provide global category fields in Conversion Report API.
Update on 2021-06-15
Provide creative banner info for brand offer, including banner quantity, fileName, imageUrl etc.
Update on 2021-04-19
Provide offerStatus in Shopee/Brand/Product offer.
Support sorting by ending soon in Shopee/Brand offer to sort offers by end time from earliest to latest.
Provide offerUpdates in Shopee/Brand/Product to track all offer status change.
Update on 2021-03-04
Provide Product offer API.
Provide Shop Type in Conversion Report API.
Update on 2021-01-04
Update on Getting Offer list API
Provide detailed commission rates including Web（new/existing) and App（new/existing）commission rate.
If Shop and campaign type of Shopee offer have been set by different categories, Open API will provide category commission rate. But if not, API won’t provide that.
Update on Getting Conversion Report
Add Fraud Status.
Add filter option by fraud status which includes unverified/verified/fraud.
Add model id which is the unique id for normal items.
Add promotion id which is the unique id for bundle deal and add on deal items.
```

### f) Campos pedidos (checagem contra a productOfferV2 e o feed)

| Item | Existe? | Campo literal |
|---|---|---|
| Código de barras (EAN/GTIN) | Não aparece em nenhuma API | nenhum |
| Marca | Não. Só a loja | `shopName`, `shopId` |
| ID da categoria | Sim | `productCatIds` ([Int], níveis 1, 2 e 3) e filtro `productCatId` |
| Nome da categoria | Não na productOfferV2 (só nos relatórios: `globalCategoryLv1Name`...) | nenhum |
| Todas as fotos ou só a principal | Só uma | `imageUrl` |
| Preço mínimo e máximo de variações | Sim | `priceMin`, `priceMax` (`price` marcado "To Be Removed") |
| Preço original ou desconto | Só o desconto em % | `priceDiscountRate` ("10 represents 10%") |
| Estoque ou disponibilidade | Não | nenhum |
| Frete | Não | nenhum |
| Região ou cidade do vendedor | Não | nenhum |
| Avaliação | Sim | `ratingStar` |
| Vendas | Sim | `sales` |
| Vendedor oficial (Shopee Mall) | Sim | `shopType` (OFFICIAL_SHOP = 1) e filtro `isKeySeller` |
| Validade da oferta | Sim | `periodStartTime`, `periodEndTime` |
| Taxa de comissão | Sim | `commissionRate`, `sellerCommissionRate`, `shopeeCommissionRate`, `commission` |

Product Feed (`getItemFeedData`): as colunas vêm em `columns` ("JSON object strings containing column names and column values"), mas a documentação **não lista os nomes das colunas**. O histórico cita apenas `product_short link`.

### g) Categorias e filtros

- **Não há lista de IDs de categoria na documentação.** Para o Brasil ela manda para `https://seller.shopee.com.br/edu/category-guide` (não aberta). O exemplo mostra `100001` e `[100012,100068,100259]`.
- Filtros da productOfferV2: `productCatId`, `shopId`, `itemId`, `keyword`, `sortType` (1 relevância, só com keyword; 2 vendidos; 3 preço desc; 4 preço asc; 5 comissão desc), `isAMSOffer`, `isKeySeller`, `listType` + `matchId` (que não combinam com os outros filtros), `page`, `limit`.
- Paginação: productOfferV2, shopeeOfferV2 e shopOfferV2 usam `page`/`limit` + `pageInfo.hasNextPage`. Os relatórios usam `scrollId` (máximo de 500 por página, válido por 30 s). O feed usa `offset`/`limit` (máximo de 500) + `hasMore`.

### h) generateShortLink

- Parâmetros: `originUrl: String!` e `subIds: [String]` ("Sub id in utm content in tracking link, it has five sub ids", exemplo `["s1","s2","s3","s4","s5"]`).
- Retorno: `shortLink: String!`. O formato visto nos exemplos de offerLink é `https://shope.ee/xxxxxxxx`.
- **Não documentado:** tamanho e caracteres permitidos de cada subId, prazo de validade do link e se repetir o pedido devolve o mesmo link.
- O subId volta no relatório como `utmContent`.

### i) Códigos de erro

Já copiados em (a) (lista geral) e no fim da productOfferV2 (lista detalhada, igual em shopOfferV2, conversionReport e validatedReport).

### j) Regras de uso dos dados

**Não há**, na documentação da Open API, nenhum texto sobre cache, banco de dados, tempo de guarda, frequência de atualização, exibição de preço, comparador de preços, histórico de preço, alerta, push, uso em app ou obrigação de mostrar marca ou aviso da Shopee. A única orientação de frequência está no histórico de versões, para o feed: baixar o "FULL" uma vez e o "DELTA" "every day". Cláusulas relacionadas dos Termos estão no passo 4.

## 3. Outras formas de lista de produtos no Portal

- **Nome:** "Feed de produto". **Onde fica:** menu lateral **Criativo > Feed de produto** (`https://affiliate.shopee.com.br/creative/product_feed`).
- Texto literal:
  ```
  Feed de produto
  O feed de produtos atualiza os dados automaticamente todos os dias.
  Nome do Feed de Produto | Descrição | Hora de Atualização de Dados | Link
  Shopee Oficial BR - 2022 | -- | 28/10/2026 21:58:13 | Ver Link
  Shopee Brasil - 2022 | -- | 28/10/2026 21:58:13 | Ver Link
  ```
- "Ver Link" abre uma janela com o seguinte texto:
  ```
  Baixar Link de CSV
  Há são 100000 produto(s) em cada arquivo CSV
  [Copiar Todos os Links]
  Baixar Link de CSV | Ação
  https://affiliate.shopee.com.br/api/v1/datafeed/download?id=<id longo, omitido> | Copiar
  ```
  (No feed "Shopee Oficial BR - 2022" há 1 link. O `id` foi omitido porque parece ser uma chave de acesso da conta.)
- **Formato:** CSV, com até 100.000 produtos por arquivo. **Frequência:** diária. **Campos:** não visíveis sem baixar (não baixei).
- Outros itens do menu, não abertos: Oferta Shopee (`/offer/shopee_offer`), Oferta da loja (`/offer/brand_offer`), Oferta de produto (`/offer/product_offer`), Ofertas Exclusivas (`/offer/offer_for_me`), Link personalizado (`/offer/custom_link`).

## 4. Termos

- **Termos novos (aviso no Portal, não aceito):** texto literal no item 2 de "O que saiu diferente". Vigência citada: "A partir de 01/08/2026". Não há número de versão.
- **Termos e Condições do Programa** (https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-da-Shopee-Termos-e-Condi%C3%A7%C3%B5es, ~10:22). A página não mostra data nem versão. **Não existe cláusula específica sobre API, cache, comparação de preços ou notificação push.** Cláusulas relacionadas, literais:
  ```
  1.3 “Mídia de Afiliado” refere-se a todas as mídias de publicidade, incluindo, mas não limita-se a, websites, aplicativos e boletins informativos, sub-afiliados de redes afiliadas, suas mídias de propriedade e intermediadas registradas no Programa pelos Afiliados e publiciaprovados pela Shopee que contenham um Link de Afiliado.
  ```
  ```
  (a) não seja um usuário gerado por computador, tal como um robô, spider, script ou outro método automatizado, artificial ou fraudulento para aparecer como um indivíduo da vida real;
  ```
  ```
  (a) usar emails publicitários para promover a Shopee sem o consentimento prévio por escrito da Shopee;
  ```
  ```
  (d) usar qualquer meio ou forma automatizada de sucateamento, ou outros métodos de extração de dados para acessar, consultar, coletar ou usar a propriedade intelectual da Shopee, incluindo logotipo, visuais-chave, materiais criativos e outras Informações Confidenciais da Plataforma entre outros;
  ```
  ```
  4.4 Cookies. O Afiliado deverá garantir que somente definirá cookies se os Links de Afiliado forem visíveis na Mídia de Afiliado e o usuário clicar voluntária e conscientemente. O uso de camadas, add-ons, iFrames, pop-up, pop-under, site-under, anúncios que automaticamente redirecionam o usuário para a Plataforma sem o envolvimento ou ação do usuário (por exemplo, clique, toque), queda de cookies, tecnologia de pós-visualização, anúncios enganosos que resultam em cliques enganosos, não devem ser permitidos e são estritamente proibidos. Anúncios que resultem em instalações forçadas (o que inclui o início de downloads/redirecionamentos sem a permissão do usuário) do aplicativo da Shopee são estritamente proibidos.
  ```
  ```
  5.3 Alterações aos Termos deste Programa e Termos de Serviço. A Shopee pode, a seu critério, atualizar, alterar ou modificar os termos deste Programa e os Termos de Serviço. Se a Shopee atualizar, emendar ou modificar os termos e condições do Programa ou os Termos de Serviço de uma Plataforma, a Shopee fará esforços razoáveis para notificar o Afiliado e MCN sobre as atualizações, emendas ou modificações, incluindo a publicação do Programa e os Termos de Serviço modificados no site da Plataforma, por email ou por mensagem instantânea. O Afiliado e MCN verificará periodicamente a Plataforma para acompanhar tais atualizações e avisos. Os Termos e Condições e/ou Termos de Serviço modificados entram em vigor mediante a publicação. Ao continuar usando os Links de Afiliado, o Afiliado concorda em estar vinculado a este Programa e aos Termos de Serviço atualizados, emendados ou modificados. Se o Afiliado ou MCN não concordar em ficar vinculado ao Programa ou aos Termos de Serviço atualizados, emendados ou modificados, este deverá solicitar formalmente a rescisão do Programa este Contrato de acordo com a Seção 7.
  ```
  Também na 4.3 (Ações Proibidas), (i): "fazer anúncios pagos em search ou shopping, como Google Ads e Bing Ads, para promover links de afiliados."

## 5. Comissão "sob consulta" para apps de ofertas

Não encontrei caminho específico no Portal logado para pedir taxa especial. Os únicos caminhos de contato vistos foram:
- o formulário citado no erro 10035 (`https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091`), não aberto;
- "Acesso rápido" da Central de Ajuda: "E-mail / Fale conosco por e-mail", não aberto.

A busca "API" na Central de Ajuda deu "77 Resultados para API". Os títulos da 1ª página não tratam de Open API nem de comissão especial.

## 6. Perfil da conta (sem dados pessoais)

- Situação: conta ativa e logada no Portal. Aviso pendente: "Por favor, complete suas Informações de Pagamento e Fiscais para receber suas comissões".
- **Tipo de afiliado: "Empresarial"**, com "Nome da empresa" = "economae" (veja o item 3 de "O que saiu diferente").
- Aba **Informação de Mídia** (literal, sem campos pessoais):
  ```
  Selecione sua Rede Social principal
  https://economae.pages.dev/
  Categoria
  Selecione
  Tipo de parceiro
  Compração de preço
  Código de Indicação
  ```
  O site **https://economae.pages.dev/** está cadastrado, e o tipo de parceiro é "Compração de preço" (assim mesmo, com o erro de digitação da tela). O campo "Categoria" está vazio ("Selecione").

## 7. Artigos da Central de Ajuda citados pela documentação

A documentação da Open API cita só o formulário de contato (erro 10035), não aberto pela regra 4, e o guia de categorias do Portal do Vendedor (não aberto). Não há artigo da Central de Ajuda citado.
