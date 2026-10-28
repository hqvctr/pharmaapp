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
| **Mercado Livre** | API de desenvolvedores existe; API de afiliados não confirmada | Não lido | **A ler** (Cowork) |
| **Shopee** | Open API de afiliados (GraphQL) [terceiro] | Não lido | **A ler** (Cowork) |
| **Magalu (Parceiro Magalu)** | Sem API pública confirmada [terceiro] | Não lido | Baixa prioridade; a ler |
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
