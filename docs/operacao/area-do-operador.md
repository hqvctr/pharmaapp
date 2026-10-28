# Área do operador (API `/v1/admin`)

Contrato: `backend/openapi/admin.yaml`. Código: `backend/src/api/rotas/admin/`. **Hoje existe a API, não existe tela**: o painel web
do operador ainda não foi feito (BACKLOG). Dá para operar por qualquer cliente HTTP (curl, Insomnia), com o login abaixo.

## Cadastrar um operador (linha de comando, sem rota)

Com o `docker-compose` do projeto rodando:

```bash
docker compose run --rm api node dist/api/operador.js --tenant padrao --email voce@exemplo.com --nome "Seu nome"
```

Desativar (a sessão cai na próxima requisição):

```bash
docker compose run --rm api node dist/api/operador.js --tenant padrao --email voce@exemplo.com --desativar
```

Só e-mail cadastrado assim consegue entrar. Todos os operadores têm as mesmas permissões.

## Entrar

1. `POST /v1/admin/auth/email/codigo` com `{"email": "..."}` e o cabeçalho `X-Tenant: padrao`. Responde 202 sempre; o código de 6 dígitos só é
   enviado se o e-mail for de um operador ativo (a resposta não diz).
2. `POST /v1/admin/auth/email/verificar` com `{"email": "...", "codigo": "123456"}` devolve `access_token` (1 h) e `refresh_token` (7 dias,
   `app.operador.refreshDias` na config do tenant).
3. Nas demais rotas: `Authorization: Bearer <access_token>`. Renovar: `POST /v1/admin/auth/renovar` (o refresh vale uma vez; usar duas vezes
   derruba a sessão).

O token do app não vale aqui e o do operador não vale no app. O código de operador e o de app do mesmo e-mail são separados.

## O que o operador faz

| Tarefa | Rotas |
|---|---|
| Aprovar ou rejeitar alerta que aguarda aprovação | `GET /v1/admin/alertas`, `PUT /v1/admin/alertas/{id}/revisao` |
| Aprovar, observar ou bloquear loja | `GET /v1/admin/lojas`, `PUT /v1/admin/lojas/{id}/status` |
| Aprovar/ativar fonte e gravar a credencial dela (só escrita) | `GET /v1/admin/fontes`, `PUT .../{id}/status`, `PUT .../{id}/credencial` (precisa de `CREDENTIALS_KEY` na API) |
| Restaurar ou manter escondida a oferta denunciada | `GET /v1/admin/denuncias`, `PUT .../{id}/resolucao` |
| Revisar o que a triagem barrou (e liberar falso positivo de texto ou cautela) | `GET /v1/admin/triagem`, `PUT .../{id}/revisao` |
| Ver e encerrar ofertas manuais | `GET /v1/admin/ofertas-manuais`, `DELETE .../{id}` |
| Procurar produto | `GET /v1/admin/produtos?q=` |
| Ver quem fez o quê | `GET /v1/admin/auditoria` |

Toda ação que muda algo grava quem, quando e o que mudou (antes e depois) na auditoria. **Valor de credencial nunca entra na auditoria nem
em resposta.**

## Ainda não existe

- **Cadastro de oferta manual** (`POST /v1/admin/ofertas-manuais`): fase 5. Precisa das listas de medicamentos (CMED) carregadas na API e
  do prazo padrão da validade (decisão D21, valor a escolher).
- A tela do painel.
