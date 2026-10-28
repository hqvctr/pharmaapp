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
