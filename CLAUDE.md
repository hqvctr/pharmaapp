# Regras do projeto para o Claude

## Ações externas vão para o Cowork
Tudo o que acontece fora do repositório (painéis e contas como Cloudflare, Lomadee, Google Cloud, Firebase, Brevo,
GitHub fora de commit e push; cadastro, publicação, configuração, envio de formulário, compra) **não é executado
pelo Claude**. Em vez disso, o Claude entrega um **prompt pronto para colar no Cowork**, em bloco de código, com:
contexto, passos numerados, regras de segurança (nada de pagamento, senha ou token digitado; parar e perguntar se
pedir algo não previsto; só olhar quando for só para descobrir), e o que o Cowork deve devolver no final.
Ação que só olha (ler um formulário) também vira prompt. Depois, o Claude usa a resposta do Cowork para atualizar o
repositório (config, docs, BACKLOG).
