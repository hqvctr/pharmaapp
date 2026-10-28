# Regras do projeto para o Claude

## Ações externas vão para o Cowork
Tudo o que acontece fora do repositório (painéis e contas como Cloudflare, Lomadee, Google Cloud, Firebase, Brevo,
GitHub fora de commit e push; cadastro, publicação, configuração, envio de formulário, compra) **não é executado
pelo Claude**. Em vez disso, o Claude entrega um **prompt pronto para colar no Cowork**, em bloco de código, com:
contexto, passos numerados, regras de segurança (nada de pagamento, senha ou token digitado; parar e perguntar se
pedir algo não previsto; só olhar quando for só para descobrir), e o que o Cowork deve devolver no final.
Ação que só olha (ler um formulário) também vira prompt. Depois, o Claude usa a resposta do Cowork para atualizar o
repositório (config, docs, BACKLOG).

## Todo prompt para o Cowork pede um arquivo .md de volta
O fim de todo prompt entregue ao Cowork deve exigir que o resultado volte como **um arquivo `.md`** (nome sugerido:
`<assunto>-<AAAA-MM-DD>.md`), que o responsável anexa na conversa. O `.md` traz: o que foi feito e o que foi só
olhado, valores e endereços exatos (copiados, não resumidos), o que saiu diferente do esperado e a confirmação do
que **não** foi criado ou alterado. O Claude lê esse arquivo e atualiza o repositório a partir dele.
