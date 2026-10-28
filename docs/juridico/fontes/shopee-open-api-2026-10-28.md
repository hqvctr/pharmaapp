# Shopee Afiliados: Open API e inscrição (economae), 28/10/2026

Tudo foi lido no Chrome. Os trechos entre aspas foram copiados do texto exibido na tela.

## Confirmação

- Não li nem digitei dados pessoais: nenhum CPF, PIS/NIS/NIT, documento, dado bancário ou dado da conta Maree.
- Não digitei senha nem código de verificação e não fiz login. O login foi feito por você.
- Não preenchi o formulário de inscrição, não aceitei os Termos e não cliquei em "Enviar". Você fez a inscrição e o envio. Eu só vi a tela final de confirmação.
- Não comprei nada, não alterei a conta, não criei chave nem credencial e não mexi em pagamento. Não abri nenhum formulário de contato.

## 1. O que cada página mostrou

| Horário (aprox.) | Página | O que apareceu |
|---|---|---|
| 14:27 | https://affiliate.shopee.com.br/open_api | Sem conta logada. Redirecionou para https://shopee.com.br/buyer/login (tela "Entrar", seletor de idioma e banner de cookies). Parei ali e avisei. |
| 14:31 | https://affiliate.shopee.com.br/auth?step=3 | Tela "Cadastro enviado com sucesso", depois que você enviou a inscrição (texto completo na seção 3). |
| 14:33 | https://affiliate.shopee.com.br/open_api (com conta logada) | Não abriu a Open API. Voltou para https://affiliate.shopee.com.br/auth?step=3, a mesma tela "Cadastro enviado com sucesso". Não apareceu documentação, painel nem aviso específico sobre a API. |
| 14:34 | https://help.shopee.com.br/portal/10/search?keyword=sob%20consulta | Busca na Central de Ajuda (seção 4). |
| 14:35 | https://help.shopee.com.br/portal/10/article/171368 (Benefícios de ser um afiliado gerenciado na Shopee) | Lida inteira (seção 4). |

## 2. Open API: documentação

Não consegui ler. Enquanto a inscrição está em análise, o endereço /open_api manda para a tela de confirmação da inscrição. Por isso faltam: nome da API, endpoint, autenticação (App ID, Secret, assinatura), como obter credenciais, limites, lista de consultas, campos devolvidos, parâmetros e regras de uso dos dados (cache, atualização, exibição de preço, comparadores, apps, notificações).

Próximo passo: depois do e-mail de aprovação, abrir https://affiliate.shopee.com.br/open_api de novo.

## 3. Inscrição

### Campos do formulário e o que foi preenchido

Não vi o formulário. Você fez o preenchimento e o envio antes de me chamar de volta, então não sei quais campos existiam, se o site https://economae.pages.dev foi aceito como mídia, nem que descrição foi usada. Se quiser isso registrado, me diga o que preencheu ou mande uma captura do resumo do cadastro, sem os campos pessoais.

### Mensagem de confirmação (literal, https://affiliate.shopee.com.br/auth?step=3)

> "Inscrição para o Programa de Afiliados"
> "Cadastro enviado com sucesso"
> "Obrigado por se inscrever no Programa de Afiliados! As informações enviadas serão avaliadas pela Shopee e um email será enviado para você em descubranovasformas@gmail.com."
> "Saiba mais sobre o Programa de Afiliados Shopee" (botão)
> "Se você não receber nenhuma atualização em 3 dias, entre em contato com o Time da Shopee"

Prazo: 3 dias, ou seja, se não chegar nada até 31/10/2026, entre em contato.
Link "Time da Shopee" (não abri o formulário): https://help.shopee.com.br/portal/webform/bbce78695c364ba18c9cbceb74ec9091

### Requisitos que você não tem (CNPJ, Maree etc.)

Nenhuma tela desse tipo apareceu para mim. A tela final não pediu CNPJ, Maree nem outro documento.

## 4. Comissão "sob consulta" para sites e apps de ofertas

O único texto público com a regra é o do artigo "Entenda o Comissionamento da Shopee" (https://help.shopee.com.br/portal/10/article/124095), na lista "* Condições especiais":

> "Sites e Apps especializados em tecnologia, cupons, ofertas, cashback, parceiros financeiros e semelhantes, a taxa de comissão é sob consulta;"
> "Essas condições estão sujeitas a alteração sem aviso prévio."

**Como pedir a consulta:** não encontrei nenhuma página que explique como se faz. A busca por "sob consulta" na Central de Ajuda devolveu só artigos genéricos ("Como consultar o PIS, NIS, NIT ou PASEP", "Entenda o Comissionamento da Shopee", "Benefícios de ser um afiliado gerenciado na Shopee", "Programa de Afiliados Shopee - Termos e Condições", entre outros), e nenhum descreve o pedido.

Os canais que a Central de Ajuda mostra em todas as páginas são:
- "Fale conosco por e-mail"
- "Portal do Afiliado"
- os canais "Afiliados Shopee Brasil" no WhatsApp e no Telegram

Não abri nenhum deles.

O texto mais próximo de um contato direto com a Shopee é o de afiliado gerenciado (artigo 171368):

> "A Shopee seleciona afiliados com base no desempenho trimestral e na análise qualitativa do perfil, além do destaque no nicho de atuação. Para aumentar suas chances de ser escolhido e contar com um gerente de contas, recomendamos que você foque no desempenho da sua conta e siga estas dicas:"
> "Fique atento aos desafios disponíveis na seção de Campanhas e aproveite para divulgar produtos com Comissão Extra;"
> "Acompanhe os produtos mais vendidos e as tendências de vendas para escolher os melhores itens para divulgar;"
> "Certifique-se de que seus dados fiscais e de pagamento estejam corretos, e mantenha suas Redes Sociais atualizadas;"
> "Garanta que seus canais de contato, como e-mail e telefone, estejam sempre atualizados no cadastro."

## 5. O que não consegui ler e por quê

- **Documentação da Open API:** só fica disponível depois da aprovação. Com a inscrição em análise, /open_api volta para a tela "Cadastro enviado com sucesso".
- **Campos do formulário de inscrição:** foram preenchidos e enviados por você antes de eu voltar à aba.
- **Como pedir a comissão "sob consulta":** não há página pública explicando o processo. O caminho provável é o "Fale conosco por e-mail" ou o formulário "Time da Shopee", mas não abri nenhum dos dois.
