# Prompt para o Cowork: login com Google e push no app Android

Continuação do [prompt-cowork.md](prompt-cowork.md). O SHA-1 abaixo é o da chave de debug do projeto
(`android/app/debug.keystore`, versionada): é o mesmo em qualquer computador que compile o app, então
não é preciso rodar `keytool`. Copie o bloco inteiro para o Cowork com o navegador logado na conta
dona do projeto.

```text
Você vai configurar o app Android "economae" no Google Cloud e no Firebase. Trabalhe no navegador,
uma etapa por vez, e me mostre o que vai fazer antes de cada clique que crie ou publique algo.

REGRAS
1. NUNCA ative faturamento, teste gratuito, plano Blaze, pré-pagamento ou depósito, nem digite dados
   de pagamento. Se uma tela exigir isso, pare e me avise.
2. Não digite senhas; login, CAPTCHA e confirmações ficam comigo.
3. Não crie chave de conta de serviço nem copie client secret.
4. Não publique o app nem envie nada para verificação do Google.
5. Se a tela for diferente da descrita, descreva o que vê e me pergunte.

Projeto: "project-79519032-1c32-4dac-a1f". Confira no seletor de projetos antes de cada etapa.

ETAPA A — Cliente OAuth Android (login com Google no app de teste)
1. Abra https://console.cloud.google.com/auth/clients?project=project-79519032-1c32-4dac-a1f
2. Criar cliente → Tipo de aplicativo: Android.
   - Nome: economae-android-debug
   - Nome do pacote: br.com.economae.debug
   - Impressão digital do certificado SHA-1: 10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85
3. Crie. Anote só o ID do cliente que aparece (não é segredo). Nada para baixar.
4. Confira que o cliente Web "economae-servidor" continua na lista.

ETAPA B — App Android no Firebase (push)
1. Abra https://console.firebase.google.com/project/project-79519032-1c32-4dac-a1f/settings/general
2. Em "Seus apps", Adicionar app → Android:
   - Nome do pacote Android: br.com.economae.debug
   - Apelido: economae debug
   - Certificado SHA-1: 10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85
3. Registre e baixe o google-services.json. Pule as etapas de "adicionar SDK" (o app já tem).
4. Abra o arquivo baixado e me mostre o conteúdo inteiro (é o que vou colar no Claude Code). Ele traz
   uma chave de API do Firebase feita para ir dentro do app; mesmo assim não publique em lugar nenhum.
5. Não ative Analytics, Crashlytics nem nenhum outro produto.

AO TERMINAR, me entregue:

RESULTADO COWORK ANDROID — economae
- Cliente OAuth Android criado (sim/não); pacote br.com.economae.debug; ID do cliente: <...>
- App Android no Firebase registrado (sim/não); ID do app: <1:...:android:...>
- Conteúdo do google-services.json: <cole aqui>
- Etapas não concluídas e por quê: <...>
```

Depois, cole o RESULTADO no Claude Code. O `google-services.json` vai para `android/app/` (fora do git)
e o próximo build de debug sai com push.
