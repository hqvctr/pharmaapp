# Login com Google

O app envia o **ID token** que o Google entrega depois do "Entrar com Google". O servidor (`POST /v1/auth/google`, `backend/src/auth/google.ts`)
confere a assinatura com as chaves públicas do Google, o emissor, a validade, a audiência (o ID de cliente OAuth do projeto) e, quando o app manda,
o `nonce`. **Não existe segredo de cliente no servidor**: só o ID de cliente, que é público.

## Situação (28/10/2026): ligado no tenant `padrao`

Relatório do Cowork: `docs/juridico/fontes/google-login-2026-10-28.md`.

- Projeto Google Cloud/Firebase do economae: "My First Project", ID `project-79519032-1c32-4dac-a1f` (único projeto; é o mesmo do Firebase).
- **ID de cliente Web do servidor** (já existia, nome `economae-servidor`, criado em 29/09/2026):
  `984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com`. Está em `backend/config/tenants/padrao.json`, `app.google.clientIds`.
  É o que o app Android deve pedir como `serverClientId`, e é o `aud` que o servidor exige.
- Cliente Android de **debug** `economae-android-debug` (`984598232826-1i256inbmffo8gdkra3m49vmf698u3hv.apps.googleusercontent.com`, pacote
  `br.com.economae.debug`, SHA-1 `10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85`). **Não** entra em `clientIds`: o servidor só aceita
  token cujo `aud` seja o cliente Web. Ele só serve para o app de debug abrir a tela de login do Google.
- Para a Google Play (fase 6): criar o cliente Android **de release** (pacote final + SHA-1 da chave de release/Play App Signing). O servidor não muda.
- Tela de consentimento: "economae", Externo, **Testando**, escopos `openid`, `email` e `profile`, 1 usuário de teste (a conta do responsável).
- Sem cliente OAuth na lista `clientIds`, o servidor responde 403 `metodo_login_indisponivel` e `/v1/configuracao` não oferece o Google.

## Como a conta é encontrada (DECISIONS 40 e 82)

1. Pelo `sub` do Google (identificador estável). Entra mesmo que o e-mail do token tenha mudado ou não esteja verificado.
2. Sem conta pelo `sub`: se o Google declara o e-mail **verificado** e já existe conta com esse e-mail, o `sub` é vinculado a ela.
3. Senão, cria conta nova (e-mail em minúsculas). O método "código por e-mail" só passa a valer se a pessoa usar o código depois.
4. Recusa (`credencial_invalida`) token sem e-mail ou com e-mail não verificado quando não há conta pelo `sub`, e e-mail de conta que já está
   ligada a outro Google.

## Enquanto a tela de consentimento estiver "Em teste"

Só as contas Google listadas como usuários de teste conseguem entrar. Os escopos são `openid`, `email` e `profile` (não sensíveis), então a
publicação não exige a verificação do Google; publicar é decisão sua (não é feita pelo Claude).
