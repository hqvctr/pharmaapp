# Próximo prompt do Cowork: fechar a segurança, testar no emulador e sondar a Lomadee

Continuação de [prompt-cowork-fase4.md](prompt-cowork-fase4.md), cujo resultado já está no
CHECKPOINT. São dois blocos, nesta ordem:

1. **Bloco 1, navegador:**
   - religar a política de chaves;
   - restringir a chave "Browser";
   - conferir o usuário de teste;
   - levantar o que a Lomadee exige, só lendo, sem cadastro.
2. **Bloco 2, computador:** o teste do app no emulador. Só serve se o Cowork puder controlar o
   computador (Terminal e Android Studio). Se não puder, faça você mesmo, seguindo os mesmos passos.

Antes de colar o bloco 1, troque a marca `REMOVER PAPEL` no fim (ver etapa B).

## Bloco 1 — Navegador

```text
Você vai fechar pendências de segurança do projeto "economae" no Google Cloud e levantar
informações sobre a Lomadee. Trabalhe no navegador, uma etapa por vez, e me mostre o que vai fazer
antes de cada clique que crie, altere ou apague algo.

REGRAS
1. NUNCA ative faturamento, teste gratuito, plano Blaze, pré-pagamento ou depósito, nem digite dados
   de pagamento. Se uma tela exigir isso, pare e me avise.
2. Não digite senhas nem dados pessoais (CPF, CNPJ, endereço, telefone). Login, CAPTCHA e
   confirmações ficam comigo.
3. Não crie, não apague e não mostre chaves (de API, de conta de serviço ou tokens).
4. Não publique o app nem a tela de consentimento.
5. Na Lomadee, só leia: não crie conta, não aceite termos, não preencha formulários.
6. Se a tela for diferente da descrita, descreva o que vê e me pergunte.

Projeto: "project-79519032-1c32-4dac-a1f". Confira no seletor de projetos antes de cada etapa.

ETAPA A — Religar a política que bloqueia chaves de conta de serviço
1. Abra https://console.cloud.google.com/iam-admin/orgpolicies/list?project=project-79519032-1c32-4dac-a1f
2. Procure "Disable service account key creation" (iam.disableServiceAccountKeyCreation; pode
   aparecer também como iam.managed.disableServiceAccountKeyCreation). Abra a que estiver com
   substituição (override) neste projeto.
3. Diga-me o que está configurado hoje no projeto e o que vem da organização (política do pai).
4. Em "Gerenciar política", escolha "Herdar política do pai" (se a organização aplica a regra) ou
   "Substituir" com a aplicação ligada. Mostre-me antes de salvar; salve com meu ok.
5. Confira em https://console.cloud.google.com/iam-admin/serviceaccounts?project=project-79519032-1c32-4dac-a1f,
   na conta firebase-adminsdk → Chaves, que a chave criada em 30/09/2026 continua "Ativa". Não
   mexa nela.

ETAPA B — Papel "Administrador da política da organização"
1. Abra o IAM da organização: no seletor de projetos, escolha a organização (não o projeto) e vá em
   IAM. Diga-me quais contas têm "Administrador da política da organização" e quais têm
   "Administrador da organização". Não escreva endereços de e-mail no resultado: diga "minha conta"
   ou "outra conta".
2. Só se no fim deste prompt estiver "REMOVER PAPEL: SIM": remova "Administrador da política da
   organização" da minha conta, e só se a minha conta continuar com "Administrador da organização"
   (que permite devolver o papel depois). Se não continuar, não remova e me avise.

ETAPA C — Restringir a chave de API "Browser"
1. Abra https://console.cloud.google.com/apis/credentials?project=project-79519032-1c32-4dac-a1f
2. Abra a chave cujo valor termina em INIc (nome parecido com "Browser key (auto created by
   Firebase)"). Confirme que é essa pelo final do valor.
3. Em "Restrições de aplicativos", escolha "Sites" e adicione:
   - https://project-79519032-1c32-4dac-a1f.web.app/*
   - https://project-79519032-1c32-4dac-a1f.firebaseapp.com/*
4. NÃO mexa em "Restrições de API": só me diga o que está marcado ali. Salve com meu ok.
5. Não apague a chave e não mexa na chave Android (termina em 7WhU).

ETAPA D — Usuário de teste do login com Google
1. Abra https://console.cloud.google.com/auth/audience?project=project-79519032-1c32-4dac-a1f
2. Pergunte-me qual conta Google vou usar no emulador. Se ela não estiver em "Usuários de teste",
   adicione. No resultado, responda só sim ou não, sem o endereço.

ETAPA E — Lomadee (só leitura)
Procure, no site da Lomadee e na documentação para desenvolvedores, e me responda citando a URL de
onde tirou cada resposta:
1. Quem pode se cadastrar como afiliado: pessoa física (CPF), só CNPJ, ou os dois? Precisa de site
   ou app publicado para ser aprovado?
2. Existe API de ofertas (busca por loja e categoria)? Nome, versão e URL da documentação. Como se
   obtém a credencial (app token, source id)? Há limite de chamadas?
3. Existe API ou ferramenta de link de afiliado (deeplink)?
4. As lojas Drogasil e Droga Raia estão no programa hoje? Que outras lojas de fraldas, higiene do
   bebê, alimentação infantil e gestação aparecem?
5. O que os termos dizem sobre: mostrar oferta dentro de app, enviar notificação push com oferta,
   guardar histórico de preço, e prazo de pagamento e valor mínimo de saque da comissão.
6. Se uma página exigir login para ver alguma dessas respostas, anote qual e siga para a próxima.

AO TERMINAR, me entregue:

RESULTADO COWORK PRÓXIMOS PASSOS — economae
- A. Política no projeto antes: <...>; depois: <...>; chave de teste continua ativa (sim/não)
- B. Contas com os papéis (minha conta/outra conta): <...>; papel removido (sim/não/não pedido)
- C. Chave INIc restrita a Sites com os 2 endereços (sim/não); restrições de API marcadas: <...>
- D. Conta do emulador nos usuários de teste (sim/não)
- E. Lomadee: respostas 1 a 5, cada uma com a URL; páginas que exigiram login: <...>
- Etapas não concluídas e por quê: <...>

REMOVER PAPEL: <SIM ou NÃO>
```

## Bloco 2 — Teste no emulador (Cowork com controle do computador, ou você)

Requisitos no computador: Docker Desktop, Node 22, Android Studio e o repositório clonado. No
Windows, rode os scripts no Git Bash ou no WSL. O `google-services.json` com os dois apps precisa
estar em `android/app/`, e a chave da conta de serviço numa pasta fora do repositório.

```text
Você vai testar o app Android "economae" no emulador do Android Studio, no meu computador. Uma
etapa por vez; me mostre cada comando antes de rodar.

REGRAS
1. Não digite senhas; login na conta Google do emulador fica comigo.
2. Não abra, não mostre e não copie o conteúdo do arquivo da conta de serviço nem do .env.
3. Não faça commit, push nem mudança em arquivo do repositório, fora o .env.
4. Se algo falhar, pare, mostre a mensagem de erro inteira e me pergunte.

ETAPA 1 — Configuração
1. Na pasta do repositório, se não existir .env, copie .env.example para .env e me peça para
   preencher POSTGRES_PASSWORD e AUTH_CODIGO_CHAVE (eu digito).
2. Confira que o .env tem FCM_MODO=fcm e FCM_CONTA_SERVICO apontando para o arquivo da conta de
   serviço (mostre só o caminho, não o conteúdo). Se faltar, peça-me o caminho.
3. Confira que existe android/app/google-services.json.

ETAPA 2 — Backend
1. Abra o Docker Desktop e espere ficar pronto.
2. Num terminal, na pasta do repositório: ./scripts/dev-emulador.sh
   Deixe esse terminal aberto: é o log da API.

ETAPA 3 — Emulador e app
1. Android Studio → Device Manager: se não houver, crie um aparelho Pixel com imagem "Google Play",
   API 36. Ligue-o. Peça-me para entrar na conta Google no emulador (a conta de teste).
2. Abra a pasta android/ no Android Studio, espere o Gradle sincronizar e rode o app (variante debug)
   no emulador.

ETAPA 4 — Roteiro (tire um print de cada tela e anote o que der errado)
1. Entrar com código: use um e-mail de teste qualquer; o código aparece no terminal da etapa 2,
   depois de "codigo=".
2. Na tela de conta, sair. Entrar com Google: deve aparecer o seletor de contas.
3. Aceitar os termos.
4. Preferências: CEP 14010000 e a categoria "Higiene e cuidados do bebê". Salvar.
5. Feed: deve aparecer a oferta. Abrir o detalhe: gráfico, aviso de link de afiliado, botão da loja.
6. Conta → ligar alertas: o Android pede permissão de notificação; permitir.
7. Num segundo terminal, na pasta do repositório: ./scripts/dev-emulador.sh despachar
   A notificação deve chegar no emulador. Tocar nela deve abrir a oferta.
8. Abrir o teclado nas telas de entrada e de preferências e rolar até o fim: algo fica escondido?
9. Conta → excluir conta.

ETAPA 5 — Encerrar
Ctrl+C no terminal da API. Deixe o emulador como está.

AO TERMINAR, me entregue:

RESULTADO TESTE NO EMULADOR — economae
- Aparelho e API: <...>
- Login por código (ok/falhou), login com Google (ok/falhou; mensagem de erro)
- Termos, preferências, feed, detalhe (ok/falhou em quê)
- Permissão de notificação pedida (sim/não)
- Push: notificação chegou (sim/não); toque abriu a oferta (sim/não); saída do despachar
- Teclado e rolagem (ok/problema)
- Exclusão de conta (ok/falhou)
- Linhas do log da API com erro (tire códigos de login, tokens e e-mails)
- Prints do que ficou estranho
```

Depois, cole os dois RESULTADOS no Claude Code.
