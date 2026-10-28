# Login com Google

O app envia o **ID token** que o Google entrega depois do "Entrar com Google". O servidor (`POST /v1/auth/google`, `backend/src/auth/google.ts`)
confere a assinatura com as chaves públicas do Google, o emissor, a validade, a audiência (o ID de cliente OAuth do projeto) e, quando o app manda,
o `nonce`. **Não existe segredo de cliente no servidor**: só o ID de cliente, que é público.

## O que falta para ligar (depende de você, via Cowork)

1. O ID de cliente OAuth **do tipo "Aplicativo da Web"** do projeto do Google Cloud/Firebase do economae (o app Android usa esse ID como
   `serverClientId`, e é ele que aparece como `aud` no token). O prompt do Cowork que levanta isso já foi entregue; ele devolve um `.md` com o ID.
2. Colar o ID em `backend/config/tenants/padrao.json`, em `app.google.clientIds` (lista; aceita mais de um). **Enquanto a lista estiver vazia, o
   servidor responde 403 `metodo_login_indisponivel` e `/v1/configuracao` não oferece o Google** (o app não mostra um botão que falharia).
3. Reiniciar a API. Não precisa de migration nem de variável de ambiente.

Cliente Android (nome do pacote + SHA-1 da chave de assinatura) é do app, não do servidor; o de release só existe na fase 6 (Google Play).

## Como a conta é encontrada (DECISIONS 40 e 82)

1. Pelo `sub` do Google (identificador estável). Entra mesmo que o e-mail do token tenha mudado ou não esteja verificado.
2. Sem conta pelo `sub`: se o Google declara o e-mail **verificado** e já existe conta com esse e-mail, o `sub` é vinculado a ela.
3. Senão, cria conta nova (e-mail em minúsculas). O método "código por e-mail" só passa a valer se a pessoa usar o código depois.
4. Recusa (`credencial_invalida`) token sem e-mail ou com e-mail não verificado quando não há conta pelo `sub`, e e-mail de conta que já está
   ligada a outro Google.

## Enquanto a tela de consentimento estiver "Em teste"

Só as contas Google listadas como usuários de teste conseguem entrar. Os escopos são `openid`, `email` e `profile` (não sensíveis), então a
publicação não exige a verificação do Google; publicar é decisão sua (não é feita pelo Claude).
