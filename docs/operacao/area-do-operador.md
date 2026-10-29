# Área do operador (API `/v1/admin`)

Contrato: `backend/openapi/admin.yaml`. Código: `backend/src/api/rotas/admin/`. A tela é o painel web (abaixo); dá também para operar por qualquer cliente HTTP (curl, Insomnia), com o login mais abaixo.

## Painel web (o jeito normal de operar)

O servidor serve o painel em **`/operador/`** (no seu computador: `http://localhost:3000/operador/`; `scripts\windows\painel.bat` abre). Funciona no
computador e no celular, em tema claro ou escuro (botão no rodapé do menu). Menu lateral, com o número de pendências ao lado de cada fila (atualiza sozinho a
cada minuto):

| Tela | O que se faz nela |
|---|---|
| **Visão geral** | Pendências (alertas, triagem, denúncias), saúde da coleta (última coleta, último ciclo, dias de histórico), catálogo, alertas da semana, atalhos e atividade recente. |
| **Alertas** | Aprovar ou rejeitar os que aguardam (com observação); ver aprovados e rejeitados; tirar do feed um alerta já aprovado. |
| **Triagem** | O que a triagem de medicamento e NBCAL barrou: bloqueio correto, falso positivo ou liberar (só o que pode ser liberado); ver os já revisados. |
| **Denúncias** | Restaurar a oferta ou manter escondida; ver as já decididas. |
| **Ofertas manuais** | Cadastrar (produto do catálogo ou novo, com foto opcional; loja, preço, condição, frete, validade, link), com a **prévia de como aparece no app**; listar ativas e encerradas; encerrar. |
| **Produtos** | Buscar no que o app monitora e começar uma oferta manual do produto. |
| **Lojas** | Filtrar por status ou origem e buscar; **cadastrar loja própria** com as faixas de CEP em que entrega (há atalhos: Brasil, SP, capital, RJ, MG); abrir uma loja para mudar o status, corrigir nome/rede/CNPJ/reputação e a área de entrega. |
| **Financeiro** | Receita do mês, recebido, a receber, receita no período, cliques em link de afiliado, receita por clique, assinaturas ativas; gráficos de receita por mês e fonte, participação por fonte e cliques por dia (cada gráfico tem "Ver tabela"); lançar, editar, marcar como recebida e cancelar lançamentos; **importar CSV**. |
| **Fontes de preço** | Confiança (aprovada, em observação, bloqueada) e ligar/desligar a coleta. |
| **Operadores** | Quem tem acesso, se está ativo e o último acesso. Incluir e desativar continuam pela linha de comando (abaixo, decisão D2). |
| **Auditoria** | Tudo que mudou algo, em frases ("status: em observação → aprovada"), com filtro por operador, ação e período. |

Atalhos do teclado: `/` busca na tela, `g` e depois `i`/`a`/`t`/`d`/`o`/`l`/`f`/`p` vai para Visão geral, Alertas, Triagem, Denúncias, Ofertas, Lojas,
Financeiro e Produtos; `?` mostra a lista. Não tem tela para digitar chave de fonte: a da Lomadee fica no servidor.

### Financeiro: de onde vem cada número

- **Receita** só existe aqui quando alguém lança ou importa: a comissão da Lomadee fica no painel da Lomadee, a assinatura nas lojas de apps, e o
  painel **nunca estima** receita. Situação: *prevista* (pendente na rede), *confirmada* (aprovada, a receber), *recebida* (paga) e *cancelada* (fica
  no histórico, não soma).
- **Importar CSV**: primeira linha com os nomes das colunas, separadas por `;` ou `,`. Obrigatórias `data` e `valor`; opcionais `fonte`, `status`,
  `descricao` e `referencia` (aceita sinônimos como `comissao`, `situacao`, `transacao`, e situações como `pendente`, `aprovada`, `paga`). Exemplo:
  ```
  data;fonte;valor;status;descricao;referencia
  31/10/2026;lomadee;158,90;aprovada;Comissões de outubro;LMD-2026-10
  ```
  O painel mostra a prévia e as linhas com problema antes de mandar; nada entra se houver linha errada. Linha com a mesma fonte e referência de
  um lançamento que já existe é pulada (importar o mesmo relatório duas vezes não duplica).
- **Cliques** são os toques em "Ver oferta" no app (últimos 30 dias); **receita por clique** = receita de afiliado não cancelada com data nos
  últimos 30 dias ÷ cliques em link de afiliado no mesmo período.
- **Assinaturas ativas** contam a tabela de assinaturas; enquanto a validação nas lojas de apps não existir, fica em zero.

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
| Resumo da tela inicial | `GET /v1/admin/resumo` |
| Cadastrar loja própria, ver, corrigir dados e área de entrega | `POST /v1/admin/lojas`, `GET`/`PATCH /v1/admin/lojas/{id}`, `PUT .../{id}/areas` |
| Ver os operadores | `GET /v1/admin/operadores` |
| Lançar, listar, corrigir e importar receitas; resumo financeiro | `POST`/`GET /v1/admin/receitas`, `PATCH .../{id}`, `POST .../importacao`, `GET /v1/admin/financeiro` |

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

Hoje todas as lojas da coleta vêm da Lomadee (e a oferta manual não vale para as de marca dela). Para cadastrar oferta à mão é preciso antes ter uma loja
**sua**: no painel, **Lojas → Nova loja**, com nome, status inicial (em observação ou aprovada), reputação e as faixas de CEP em que ela entrega. Ela
fica sob a fonte `manual` e já aparece na escolha de loja da oferta manual. Loja `em_observacao` aparece no feed e nunca notifica; só `aprovada` pode
notificar (e oferta manual nunca notifica de qualquer forma). Sem faixa de CEP a loja não aparece no feed de ninguém (a Visão geral avisa).

Ainda dá para declarar a loja em `backend/config/vinculos/padrao.json` (o `provisionar` cria sem duplicar), mas o painel é o caminho normal.
