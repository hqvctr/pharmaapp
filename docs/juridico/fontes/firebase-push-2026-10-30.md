# Levantamento Firebase para push (FCM) do economae

Feito em 29/10/2026, por volta das 22h30 (horário de Brasília), na conta descubranovasformas@gmail.com, já logada no Chrome.

## Resumo rápido

- O app Android `br.com.economae.debug` JÁ EXISTIA no projeto. O passo 3 (registrar app) NÃO foi executado.
- A API Firebase Cloud Messaging (V1) está **Ativada**. A API legada está **Desativada**.
- Existe 1 conta de serviço (`firebase-adminsdk`), com 2 chaves ativas, criadas em 30/09/2026.
- **Diferente do esperado:** o SHA-1 cadastrado no app `br.com.economae.debug` NÃO é o SHA-1 informado no pedido (detalhes abaixo).
- **Não consegui os campos do google-services.json na tela** (o console só oferece o botão de baixar, que eu não usei). Montei o que dá para saber sem baixar. A `api_key.current_key` ficou incompleta (detalhes abaixo).

## O que foi feito e o que foi só olhado

Somente leitura (nada criado, nada alterado):

- Passos 1 e 2: Console do Firebase, Configurações do projeto > Geral.
- Passo 4: página do app `br.com.economae.debug`. Abri a tela "Ver instruções do SDK" e fechei com o X, sem avançar e sem baixar. Depois olhei as chaves de API em Google Cloud > APIs e serviços > Credenciais, usando só "Exibir chave" (mostra o valor, não altera nada).
- Passo 5: aba Cloud Messaging.
- Passo 6: Google Cloud > IAM e admin > Contas de serviço, incluindo a aba Chaves da conta de serviço.
- Passo 7: Google Cloud > IAM e admin > IAM.

Alterado: **nada**. O passo 3 não foi necessário porque o app já existia.

## Passo 1: Projeto

| Campo | Valor |
|---|---|
| Nome do projeto | My First Project |
| ID do projeto | project-79519032-1c32-4dac-a1f |
| Número do projeto | 984598232826 |
| Empresa-mãe/pasta no GCP | descubranovasformas-org |
| Tipo de ambiente | Não especificado |
| Nome exibido ao público | economae |
| E-mail para suporte | descubranovasformas@gmail.com |
| Plano | Spark (sem custo) |

## Passo 2: Apps listados em "Seus aplicativos"

Apps Android (2):

| Apelido | Pacote | ID do app |
|---|---|---|
| economae | br.com.economae | 1:984598232826:android:fc1670804c3c5074849343 |
| economae debug | br.com.economae.debug | 1:984598232826:android:06850797fd477592849343 |

Não há app iOS nem Web listado.

## Passo 3: Registro do app

**Não executado.** Já existia um app Android com o pacote `br.com.economae.debug`, com o apelido "economae debug".

## Passo 4: App Android `br.com.economae.debug`

ID do app: `1:984598232826:android:06850797fd477592849343`

Impressão digital do certificado SHA cadastrada nesse app (1 só, tipo SHA-1):

```
10:88:d4:80:33:01:24:8b:8b:33:f4:8a:2c:4e:b5:ad:35:cf:3b:85
```

O app `br.com.economae` (sem debug) não mostra nenhuma impressão digital cadastrada.

### Campos do google-services.json

O console não mostra o conteúdo do arquivo na tela. Só oferece o botão "Baixar google-services.json", e o combinado era não baixar. Então os campos abaixo foram montados a partir do que o console mostra. Eles não foram copiados do arquivo.

| Campo | Valor | Origem |
|---|---|---|
| project_info.project_number | 984598232826 | Geral > Número do projeto |
| project_info.project_id | project-79519032-1c32-4dac-a1f | Geral > ID do projeto |
| client.client_info.mobilesdk_app_id | 1:984598232826:android:06850797fd477592849343 | Geral > ID do app (debug) |
| client.client_info.android_client_info.package_name | br.com.economae.debug | Geral > Nome do pacote |
| client.api_key.current_key | ver abaixo | Google Cloud > Credenciais |

### api_key.current_key

Não deu para confirmar qual chave o google-services.json usa, porque eu não abri o arquivo. Em Google Cloud > Credenciais existem 2 chaves "Android key (auto created by Firebase)", ambas criadas em 30/09/2026:

1. Primeira da lista, restrição "25 APIs" (sem restrição de app Android):
   `AIzaSyBP…INIc` (valor completo fora do repositório; ver Google Cloud > Credenciais)
2. Segunda da lista, restrição "Apps Android, 25 APIs": **valor NÃO capturado.** A ferramenta de leitura bloqueou o valor como "dado Base64" (falso positivo em chave de API). Não contornei o bloqueio. Para ver, o responsável abre Credenciais e clica em "Exibir chave" na linha com restrição "Apps Android".

Também existe a "Browser key (auto created by Firebase)", criada em 29/09/2026, com restrição "Referenciadores HTTP, 25 APIs". Não abri o valor dela, porque não se aplica a app Android.

Para ter certeza de qual chave vale, a forma mais segura é o responsável baixar o google-services.json pelo próprio Firebase e conferir o campo `api_key.current_key`.

## Passo 5: Cloud Messaging

| Item | Estado |
|---|---|
| API Firebase Cloud Messaging (V1) | **Ativada** |
| API Cloud Messaging (legada) | **Desativada** |
| ID do remetente (aparece na tela) | 984598232826 |
| Certificados push da Web | nenhum par de chaves cadastrado (a tela só mostra "Generate key pair") |

Não ativei nem desativei nada.

## Passo 6: Contas de serviço

Há 1 conta de serviço no projeto:

| Campo | Valor |
|---|---|
| E-mail | firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com |
| Nome | firebase-adminsdk |
| Descrição | Firebase Admin SDK Service Agent |
| Status | Ativado |
| ID exclusivo | 101732126050930551672 |

Chaves (aba "Chaves"), ambas com status Active:

| ID da chave | Data de criação | Data de validade |
|---|---|---|
| ccd2bbdf75ca95784c2adc5f68af4a8e9b79b065 | 30 de set. de 2026 | 31 de dez. de 9999 |
| be7c50d3b6f5fcd9d73647b57ff25110215372a4 | 30 de set. de 2026 | 31 de dez. de 9999 |

Observação: a tela não escreveu o tipo das chaves por extenso (só mostra um ícone). Duas chaves ativas na mesma conta indicam que alguém já gerou chaves antes. Eu não criei, não baixei e não apaguei nenhuma.

## Passo 7: Papéis no IAM (projeto)

| Principal | Papéis (como aparecem no console) |
|---|---|
| firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com | Agente de serviço administrador do SDK Admin do Firebase; Criador do token da conta de serviço |
| descubranovasformas@gmail.com (nome: Formas Visuais) | Admin da organização; Owner (Legacy) |

Não vi nenhum papel com "Cloud Messaging" no nome. O papel com "Firebase" na conta de serviço é o "Agente de serviço administrador do SDK Admin do Firebase". Não abri as permissões desse papel, então não confirmo se ele cobre o envio de push pela API V1.

## Outras coisas que vi (extras)

IDs do cliente OAuth 2.0 em Credenciais:

| Nome | Criado em | Tipo | ID do cliente (como aparece, truncado na tela) |
|---|---|---|---|
| economae-android-previa | 28 de out. de 2026 | Android | 984598232826-f4qk... |
| economae-android-debug | 30 de set. de 2026 | Android | 984598232826-1i25... |
| economae-servidor | 29 de set. de 2026 | Aplicativo da Web | 984598232826-so1n... |

## O que saiu diferente do esperado

1. **O app `br.com.economae.debug` já existia**, então não registrei nada.
2. **O SHA-1 cadastrado no app é outro.**
   - Pedido: `7C:1C:41:D9:F3:A9:83:20:46:B9:66:2A:E9:62:59:FF:6A:3D:36:A6`
   - Cadastrado no Firebase: `10:88:d4:80:33:01:24:8b:8b:33:f4:8a:2c:4e:b5:ad:35:cf:3b:85`
   - Eu não mexi nisso, porque o combinado era só registrar o app se ele não existisse. Em geral o SHA-1 não é necessário para receber push do FCM. Ele costuma importar para login com Google e outros serviços. Vale o responsável decidir se quer cadastrar o SHA-1 novo.
3. **Os campos do google-services.json não puderam ser copiados do arquivo**, porque o console não os mostra na tela. Só a `api_key.current_key` ficou duvidosa (2 chaves Android, e 1 delas bloqueada pela ferramenta de leitura).
4. Há mais de uma chave de API Android e mais de uma chave na conta de serviço, o que o pedido não previa.

## Confirmação do que NÃO foi criado nem alterado

- Nenhum app foi registrado, removido ou editado.
- Nenhuma impressão digital SHA foi adicionada ou removida.
- Nenhuma chave de conta de serviço foi criada, baixada ou apagada.
- Nenhuma chave de API foi criada, editada, restringida ou apagada (só usei "Exibir chave", que apenas mostra o valor).
- Nenhuma API foi ligada ou desligada (FCM V1 e legada ficaram como estavam).
- Nenhum papel do IAM foi alterado.
- Nenhum arquivo foi baixado para o computador (o google-services.json não foi baixado).
- Nenhum pedido de faturamento, upgrade, verificação, termos novos ou permissão extra apareceu.
