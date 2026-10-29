# Área do operador (API `/v1/admin`)

Contrato: `backend/openapi/admin.yaml`. Código: `backend/src/api/rotas/admin/`. A tela é o painel web (abaixo); dá também para operar por qualquer cliente HTTP (curl, Insomnia), com o login mais abaixo.

## Painel web (o jeito normal de operar)

O servidor serve o painel em **`/operador/`** (no seu computador: `http://localhost:3000/operador/`; `scripts\windows\painel.bat` abre). Telas:
**Ofertas manuais** (cadastrar e encerrar), **Alertas** (aprovar ou rejeitar os que aguardam), **Triagem** (o que foi barrado; liberar falso positivo),
**Denúncias** (restaurar ou manter escondida), **Lojas** e **Fontes** (status) e **Auditoria**. Não tem tela para digitar chave de fonte: a da Lomadee
fica no servidor.

Primeira vez no Windows:

1. `scripts\windows\operador.bat` pergunta e-mail e nome e cadastra o operador (rode na pasta instalada).
2. `scripts\windows\painel.bat` abre o painel. Digite o e-mail e toque em "Enviar código".
3. `scripts\windows\ver-codigo.bat` mostra o código de 6 dígitos (modo de teste: o código vai para o log, não para o e-mail). Digite no painel.

A sessão fica só na aba do navegador (fechou, saiu) e dura 1 hora, renovada sozinha por até 7 dias. O painel só fala com `/v1/admin`. Atrás de um túnel
público (`tunel.bat`), o painel fica acessível pelo mesmo endereço: **não deixe o túnel ligado se não precisa dele**, porque o login do operador é só e-mail
e código.

## Pela API (sem a tela)

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
| Cadastrar, ver e encerrar ofertas manuais | `POST` e `GET /v1/admin/ofertas-manuais`, `DELETE .../{id}` |
| Procurar produto | `GET /v1/admin/produtos?q=` |
| Ver quem fez o quê | `GET /v1/admin/auditoria` |

Toda ação que muda algo grava quem, quando e o que mudou (antes e depois) na auditoria. **Valor de credencial nunca entra na auditoria nem
em resposta.**

## Oferta manual

`POST /v1/admin/ofertas-manuais` (precisa de `Idempotency-Key`, um UUID novo a cada oferta): produto que já existe (`produto_id`) ou novo
(`produto_novo`), loja, preço em centavos, condição, frete, validade e link. Regras:

- Passa pela **mesma triagem** de medicamento e de NBCAL das ofertas coletadas. Barrada: 422 `bloqueado_pela_triagem` e o item aparece na fila
  de triagem. A triagem usa a lista de medicamentos que o **coletor** baixa; no servidor novo, **só funciona depois da primeira coleta** (503 antes).
- Entra no feed como "sem histórico verificado" (queda 0) e **nunca notifica**.
- Vale até `valida_ate`; sem data, 7 dias (`app.ofertaManual.validadePadraoDias`). Diferente da oferta coletada, **não some depois de 6 horas**.
- **Marca da Lomadee não entra por aqui** (o link tem de ser o rastreado pela plataforma): o preço dela vem da coleta.
- A loja precisa de área de entrega (`vinculos/`) para aparecer no feed de alguém.

### Cadastrar uma loja para as ofertas manuais

Hoje todas as lojas do servidor vêm da Lomadee (e a oferta manual não vale para elas). Para cadastrar oferta à mão é preciso antes ter uma loja
**sua**, que ainda se declara no arquivo `backend/config/vinculos/padrao.json` (a tela de cadastro de loja ainda não existe; BACKLOG). Acrescente a fonte
`manual` e a loja, com a área de CEP em que ela entrega, e rode `atualizar.bat` (o `provisionar` cria sem duplicar):

```json
{
  "fontes": [
    { "nome": "manual", "tipo": "E", "frequenciaMinutos": 1440, "regiao": "SP", "statusConfianca": "aprovada", "confiabilidade": "alta",
      "baseLegal": "Cadastro manual por operador", "ativa": false }
  ],
  "lojas": [
    { "fonte": "manual", "idExterno": "mercado-do-bairro", "rede": "Mercado do Bairro", "nome": "Mercado do Bairro (online)", "tipo": "online",
      "status": "em_observacao", "reputacao": 0.5, "faixasCep": [{ "inicio": "14000000", "fim": "14999999", "prazoDias": 2 }] }
  ]
}
```

(Acrescente esses itens às listas `fontes` e `lojas` que já existem no arquivo; não substitua as da Lomadee.) Loja `em_observacao` aparece no feed e nunca
notifica; só `aprovada` pode notificar (e oferta manual nunca notifica de qualquer forma).

