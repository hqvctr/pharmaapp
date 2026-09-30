# Depois do critério da Fase 4: prompt do Cowork e teste no emulador

O critério da Fase 4 (`./scripts/pronto-fase4.sh`) passou com o Firebase configurado. Falta o que
depende das contas e de um Android de verdade. Este arquivo tem duas partes:

1. **Prompt do Cowork** (navegador): conferir o envio de push, restringir a chave de API do
   Firebase, conferir o usuário de teste do login com Google e, se você quiser, gerar a conta de
   serviço para o teste do push.
2. **Teste no emulador** (no seu computador, com o Android Studio): o roteiro e o que me devolver.

Continuação de [prompt-cowork.md](prompt-cowork.md) e [prompt-cowork-android.md](prompt-cowork-android.md).

## Parte 1 — Prompt do Cowork

Antes de colar, decida as duas etapas opcionais e troque as marcas no fim do bloco:
- **Etapa D (conta de serviço):** necessária só para ver a notificação chegar no emulador. Gera uma
  chave que manda push em nome do app: guarde como senha. Sem ela, o teste mostra o push só no log.
- **Etapa E (pacote de release):** só depois de confirmar o `applicationId` `br.com.economae`
  (decisão 62). Ele não muda depois de publicar.

Copie o bloco inteiro para o Cowork com o navegador logado na conta dona do projeto.

```text
Você vai conferir e ajustar o projeto "economae" no Google Cloud e no Firebase. Trabalhe no
navegador, uma etapa por vez, e me mostre o que vai fazer antes de cada clique que crie, altere ou
apague algo.

REGRAS
1. NUNCA ative faturamento, teste gratuito, plano Blaze, pré-pagamento ou depósito, nem digite dados
   de pagamento. Se uma tela exigir isso, pare e me avise.
2. Não digite senhas; login, CAPTCHA e confirmações ficam comigo.
3. Não copie client secret. Não mostre, não cole e não resuma o conteúdo de nenhuma chave privada.
4. Não publique o app nem a tela de consentimento, e não envie nada para verificação do Google.
5. Não apague nem regenere chaves, clientes OAuth ou apps existentes.
6. Se a tela for diferente da descrita, descreva o que vê e me pergunte.

Projeto: "project-79519032-1c32-4dac-a1f". Confira no seletor de projetos antes de cada etapa.

ETAPA A — API de envio do push
1. Abra https://console.firebase.google.com/project/project-79519032-1c32-4dac-a1f/settings/cloudmessaging
2. Confira que "Firebase Cloud Messaging API (V1)" aparece como Ativada. Se aparecer desativada,
   abra https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=project-79519032-1c32-4dac-a1f
   e clique em Ativar (é gratuito; se pedir faturamento, pare pela regra 1).
3. Não ative a API legada (Cloud Messaging API legada / "Legacy").

ETAPA B — Restringir a chave de API do app Android
1. Abra https://console.cloud.google.com/apis/credentials?project=project-79519032-1c32-4dac-a1f
2. Em "Chaves de API", ache a chave criada pelo Firebase para Android (nome parecido com
   "Android key (auto created by Firebase)"). Confira que o valor termina em 7WhU; se nenhuma
   terminar assim, pare e me diga os nomes das chaves que aparecem, sem os valores.
3. Abra a chave. Em "Restrições de aplicativos", escolha "Apps Android" e adicione:
   - Nome do pacote: br.com.economae.debug
   - Impressão digital SHA-1: 10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85
4. NÃO mexa em "Restrições de API": deixe como está e só me diga o que está marcado ali.
5. Salve. A mudança leva alguns minutos para valer.

ETAPA C — Usuário de teste do login com Google
1. Abra https://console.cloud.google.com/auth/audience?project=project-79519032-1c32-4dac-a1f
2. Confira que o status de publicação continua "Em teste".
3. Pergunte-me qual conta Google vou usar no emulador. Se ela não estiver em "Usuários de teste",
   adicione. No resultado, não escreva o endereço: responda só sim ou não.

ETAPA D — Conta de serviço do FCM (só se no fim deste prompt estiver "ETAPA D: FAZER")
1. Abra https://console.firebase.google.com/project/project-79519032-1c32-4dac-a1f/settings/serviceaccounts/adminsdk
2. Clique em "Gerar nova chave privada" e confirme. O navegador baixa um arquivo .json.
3. NÃO abra, não mostre e não cole o conteúdo do arquivo. Diga-me só o nome do arquivo baixado e a
   pasta onde ele está. Eu mesmo vou movê-lo para uma pasta fora do repositório do projeto.
4. Se aparecer aviso de que a criação de chaves está bloqueada por uma política da organização, pare
   e me mostre o texto do aviso.

ETAPA E — App de release no Firebase (só se no fim deste prompt estiver "ETAPA E: FAZER")
1. Abra https://console.firebase.google.com/project/project-79519032-1c32-4dac-a1f/settings/general
2. Em "Seus apps", Adicionar app → Android:
   - Nome do pacote Android: br.com.economae
   - Apelido: economae
   - Certificado SHA-1: deixe em branco (a chave de release só existe depois do Play Console).
3. Registre e baixe o google-services.json novo. Pule as etapas de "adicionar SDK".
4. Abra o arquivo e me mostre o conteúdo inteiro: ele deve ter dois apps, br.com.economae.debug e
   br.com.economae. Não publique em lugar nenhum.
5. Não crie cliente OAuth Android para br.com.economae agora.

AO TERMINAR, me entregue:

RESULTADO COWORK FASE 4 — economae
- A. FCM API (V1) ativada (sim/não); API legada ativada (sim/não)
- B. Chave terminando em 7WhU restrita a apps Android com br.com.economae.debug + SHA-1 (sim/não);
     restrições de API que já estavam marcadas: <...>
- C. Consentimento "Em teste" (sim/não); conta do emulador está nos usuários de teste (sim/não)
- D. Chave da conta de serviço gerada (sim/não/não pedida); nome do arquivo e pasta: <...>
- E. App br.com.economae registrado (sim/não/não pedido); conteúdo do google-services.json: <...>
- Etapas não concluídas e por quê: <...>

ETAPA D: <FAZER ou NÃO FAZER>
ETAPA E: <FAZER ou NÃO FAZER>
```

Depois, cole o RESULTADO no Claude Code. Se a etapa E foi feita, o `google-services.json` novo
substitui o de `android/app/` (continua fora do git).

**Onde guardar a chave da etapa D:** numa pasta fora do repositório, por exemplo
`~/economae-segredos/fcm-conta-servico.json`. Se um dia for parar dentro do repositório por engano, o
`.gitignore` ignora o nome padrão do Firebase (`*firebase-adminsdk*.json`), mas não conte com isso.
Se a chave vazar, exclua-a no Google Cloud → IAM e administrador → Contas de serviço →
`firebase-adminsdk-...` → Chaves, e gere outra.

## Parte 2 — Teste no emulador (no seu computador)

Pré-requisitos: Docker com Compose v2, Node 22.22.2, Android Studio.

1. **Emulador:** Android Studio → Device Manager → criar um aparelho (ex.: Pixel 8) com imagem
   **"Google Play"**, API 36. Ao ligar, entre na Play Store com a conta que é usuária de teste
   (etapa C).
2. **Configuração:** `cp .env.example .env` e preencha `POSTGRES_PASSWORD` e `AUTH_CODIGO_CHAVE`. Para
   ver a notificação chegar (etapa D feita), acrescente:
   ```
   FCM_MODO=fcm
   FCM_CONTA_SERVICO=/caminho/para/economae-segredos/fcm-conta-servico.json
   ```
3. **Backend com dados de exemplo:** `./scripts/dev-emulador.sh`. Ele recria o banco `dev_emulador`,
   roda o pipeline com as lojas fictícias e deixa a API aberta na porta 3000, com o log no terminal.
   Se a API do compose estiver rodando, antes: `docker compose stop api`.
4. **App:** salve o `google-services.json` em `android/app/`, abra a pasta `android/` no Android
   Studio e rode o app (variante debug) no emulador. Em aparelho físico, pelo cabo:
   `adb reverse tcp:3000 tcp:3000` e compile com `-Peconomae.apiUrl=http://localhost:3000/`.
5. **Roteiro** (anote o que der errado, com print):
   1. Entrar com código: o código sai no terminal do passo 3, em `codigo=`.
   2. Sair e entrar com Google: aparece o seletor de contas e o login conclui.
   3. Termos: aceitar.
   4. Preferências: CEP `14010000` e a categoria "Higiene e cuidados do bebê" (é a que tem alerta).
   5. Feed: aparece a oferta; abrir o detalhe (gráfico, aviso de link de afiliado, botão da loja).
   6. Conta → ligar alertas: o Android pede permissão de notificação; permitir.
   7. Em outro terminal: `./scripts/dev-emulador.sh despachar`, em até 12 h depois do passo 3 (depois
      disso o alerta vence; rode o passo 3 de novo, e entre de novo no app).
      - Com `FCM_MODO=fcm`: a notificação chega no emulador. Tocar nela abre a oferta.
      - Sem a etapa D: o push sai só no log do comando.
   8. Teclado e rolagem: telas de entrada e preferências com o teclado aberto.
   9. Excluir a conta, no fim.
6. **O que me devolver:**

   ```text
   RESULTADO TESTE NO EMULADOR — economae
   - Aparelho e API: <ex.: Pixel 8, API 36, Google Play>
   - Login por código (ok/falhou), Login com Google (ok/falhou; mensagem de erro)
   - Termos, preferências, feed, detalhe (ok/falhou em quê)
   - Permissão de notificação pedida (sim/não)
   - Push: FCM_MODO usado; notificação chegou (sim/não); toque abriu a oferta (sim/não)
   - Teclado e rolagem (ok/problema)
   - Exclusão de conta (ok/falhou)
   - Saída do despachar e trechos do log da API com erro (sem código de login nem token)
   - Prints do que ficou estranho
   ```
