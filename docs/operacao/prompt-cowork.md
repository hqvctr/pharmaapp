# Prompt para o Cowork: login com Google, Firebase e Brevo

Copie o bloco abaixo inteiro para uma conversa do Cowork com acesso ao navegador. Antes, entre no
navegador com a conta Google dona do projeto.

```text
Você vai configurar contas para o app "economae" (app Android de promoções para mães, da gestação aos
primeiros anos). Trabalhe no navegador, uma etapa por vez, e me mostre o que vai fazer antes de cada
clique que crie, publique ou aceite algo.

REGRAS QUE VALEM PARA TUDO
1. NUNCA ative faturamento, teste gratuito, pré-pagamento ou depósito, e nunca digite dados de cartão
   ou de pagamento. Se uma tela exigir isso para continuar, pare e me avise. Nada aqui precisa de
   faturamento.
2. Nunca invente dados pessoais (nome, empresa, endereço, telefone, CPF/CNPJ). Pergunte.
3. Não digite senhas. Se precisar de login, senha, CAPTCHA, código por SMS ou confirmação por e-mail,
   pare e me peça para fazer.
4. Não copie, não mostre e não baixe segredos: client secret do Google, chave de API do Brevo, arquivo
   JSON de credenciais. Se aparecerem na tela, feche sem copiar.
5. Não envie nada para análise ou verificação do Google, e não publique o app (ele fica em "Teste").
6. Se a tela for diferente da descrita, descreva o que vê e me pergunte. Não improvise.

ETAPA A — Tela de consentimento do login com Google
Projeto: ID "project-79519032-1c32-4dac-a1f". Confira no seletor de projetos, no topo do console,
que é esse o projeto selecionado antes de qualquer passo.
1. Abra https://console.cloud.google.com/auth/overview?project=project-79519032-1c32-4dac-a1f
2. Se aparecer "Primeiros passos" / "Get started", preencha:
   - Nome do app: economae
   - E-mail de suporte do usuário: o e-mail da conta logada (me confirme qual é)
   - Público / Audience: Externo (External)
   - Informações de contato: o mesmo e-mail
   - Aceite a política de dados de usuário das APIs do Google e conclua.
3. Em "Branding" / "Informações da marca": não envie logo (logo exige verificação). Deixe em branco
   os campos de página inicial, política de privacidade, termos e domínios autorizados; ainda não
   temos domínio. Salve.
4. Em "Público" / "Audience": confirme que o status de publicação é "Em teste" / "Testing". Adicione
   como usuários de teste os e-mails que eu informar (pergunte quais). Não clique em "Publicar app".
5. Em "Acesso a dados" / "Data Access": se pedir escopos, adicione só openid,
   .../auth/userinfo.email e .../auth/userinfo.profile. Nenhum outro.

ETAPA B — Cliente OAuth do servidor
1. Abra https://console.cloud.google.com/auth/clients?project=project-79519032-1c32-4dac-a1f
2. Criar cliente → Tipo de aplicativo: "Aplicativo da Web" (Web application) → Nome: economae-servidor.
   Não adicione origens nem URIs de redirecionamento. Crie.
3. Na janela que aparece, copie SÓ o "ID do cliente" (termina em .apps.googleusercontent.com). Não
   copie a chave secreta e não baixe o JSON. Feche.

ETAPA C — Firebase no mesmo projeto (plano gratuito Spark)
1. Abra https://console.firebase.google.com e escolha adicionar o Firebase a um projeto do Google
   Cloud existente: selecione "project-79519032-1c32-4dac-a1f".
2. Desative o Google Analytics. Confirme que o plano é Spark (gratuito). Se pedir o plano Blaze ou
   faturamento, pare e me avise.
3. Não adicione app Android ainda (isso é da próxima fase, com nome de pacote e SHA-1).

ETAPA D — Brevo (e-mail do código de login, plano gratuito)
1. Abra https://www.brevo.com e crie a conta com o e-mail que eu indicar (pergunte). Senha,
   confirmação de e-mail e SMS ficam comigo.
2. Nos dados de perfil, pergunte-me cada informação. Nome da empresa: economae (ou o que eu disser).
3. Escolha o plano Free (gratuito). Não informe cartão.
4. Vá em "Senders, Domains & Dedicated IPs" → "Senders" → adicione um remetente:
   nome "economae", e-mail = o que eu indicar. O Brevo manda um e-mail de verificação: me avise para
   eu clicar.
5. NÃO gere chave de API agora (ela só será criada quando houver servidor para guardá-la).
6. Procure nas configurações de e-mail transacional se dá para desligar o rastreamento de abertura e
   de clique. Não altere nada: só me diga se a opção existe e onde está.

AO TERMINAR, me entregue exatamente este bloco preenchido (é o que eu vou colar no Claude Code):

RESULTADO COWORK — economae
- ID do projeto: project-79519032-1c32-4dac-a1f (confirmado: sim/não)
- Tela de consentimento: criada (sim/não); status: Em teste; usuários de teste: <lista>
- ID do cliente Web (OAuth): <...apps.googleusercontent.com>
- Firebase: adicionado ao projeto (sim/não); plano: Spark
- Brevo: conta criada (sim/não); plano Free (sim/não); remetente: <e-mail>, verificado (sim/não)
- Brevo: opção de desligar rastreamento de abertura/clique: <existe em ... / não encontrada>
- Etapas não concluídas e por quê: <...>
```

Depois, cole o bloco RESULTADO na sessão do Claude Code. O ID do cliente Web entra em
`backend/config/tenants/economae.json` (`app.auth.googleClientIds`) e liga o login com Google.
