# economae: estado do push (FCM) para o Claude Code

> Cópia do relatório do Cowork. As chaves de API foram mascaradas ao entrar no repositório; o resto está como veio.

Atualizado em 29/10/2026, 23h20 (Brasília). Para quem for continuar o trabalho no código.

## Regras que valem para este trabalho

- Nunca abrir, ler, mostrar, copiar ou colar o conteúdo de `C:\economae\segredos\firebase-conta-servico.json` nem do `.env`. São senhas.
- Não mudar a política da organização do Google Cloud. Quem muda é o responsável (descubranovasformas@gmail.com), no console.
- Nada de pagamento, faturamento ou upgrade de plano.

## Resumo em uma frase

O servidor já envia push pelo FCM (API V1) e o responsável informou que o `ligar-push.bat` mostrou "push ligado". O app de prévia ainda NÃO recebe push: falta o lado do app.

## Firebase e Google Cloud

| Item | Valor |
|---|---|
| Projeto | My First Project |
| ID do projeto | project-79519032-1c32-4dac-a1f |
| Número do projeto | 984598232826 |
| App de prévia (debug) | `br.com.economae.debug`, ID `1:984598232826:android:06850797fd477592849343` |
| App de produção | `br.com.economae`, ID `1:984598232826:android:fc1670804c3c5074849343` |
| API FCM (V1) | Ativada |
| API Cloud Messaging (legada) | Desativada |
| Conta de serviço | firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com |
| Papéis da conta de serviço | Agente de serviço administrador do SDK Admin do Firebase; Criador do token da conta de serviço |

SHA-1 cadastrados no app `br.com.economae.debug` (os dois valem):

```
10:88:d4:80:33:01:24:8b:8b:33:f4:8a:2c:4e:b5:ad:35:cf:3b:85
7c:1c:41:d9:f3:a9:83:20:46:b9:66:2a:e9:62:59:ff:6a:3d:36:a6   (acrescentado hoje, é o do APK de prévia atual)
```

A "Android key" com restrição "Apps Android" (ID no console `e5c58b6c-36dc-4506-acac-8d0ac428d890`) agora lista `br.com.economae.debug` com os dois SHA-1 acima. As APIs permitidas não mudaram (25 APIs). A outra Android key e a Browser key não foram tocadas.

## google-services.json do app debug (não é segredo, vai dentro do app)

O arquivo baixado hoje foi apagado do computador. Este é o conteúdo. Ele já inclui o certificado novo (`7c1c41d9...`):

```json
{
  "project_info": {
    "project_number": "984598232826",
    "project_id": "project-79519032-1c32-4dac-a1f",
    "storage_bucket": "project-79519032-1c32-4dac-a1f.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:984598232826:android:fc1670804c3c5074849343",
        "android_client_info": { "package_name": "br.com.economae" }
      },
      "oauth_client": [
        {
          "client_id": "984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        { "current_key": "AIzaSyBP…INIc (mascarada no repositório)" },
        { "current_key": "AIzaSyDQ…7WhU (mascarada no repositório)" }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    },
    {
      "client_info": {
        "mobilesdk_app_id": "1:984598232826:android:06850797fd477592849343",
        "android_client_info": { "package_name": "br.com.economae.debug" }
      },
      "oauth_client": [
        {
          "client_id": "984598232826-1i256inbmffo8gdkra3m49vmf698u3hv.apps.googleusercontent.com",
          "client_type": 1,
          "android_info": {
            "package_name": "br.com.economae.debug",
            "certificate_hash": "1088d4803301248b8b33f48a2c4eb5ad35cf3b85"
          }
        },
        {
          "client_id": "984598232826-f4qk1nudmgc1eju273loftlgaflk7kmu.apps.googleusercontent.com",
          "client_type": 1,
          "android_info": {
            "package_name": "br.com.economae.debug",
            "certificate_hash": "7c1c41d9f3a9832046b9662ae96259ff6a3d36a6"
          }
        },
        {
          "client_id": "984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        { "current_key": "AIzaSyBP…INIc (mascarada no repositório)" },
        { "current_key": "AIzaSyDQ…7WhU (mascarada no repositório)" }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

Na pasta Downloads do computador ainda existe um `google-services.json` ANTIGO (30/09/2026). Ele não tem o certificado novo. Não usar esse.

## Chave da conta de serviço no computador

- Caminho: `C:\economae\segredos\firebase-conta-servico.json`.
- É uma chave **antiga** (ID `be7c50d3b6f5fcd9d73647b57ff25110215372a4`, criada em 30/09/2026), movida sem ser aberta. Foi baixada em 30/09 e ficou um tempo solta na pasta Downloads, então vale trocar por uma nova.
- A conta de serviço tem 2 chaves ativas, ambas criadas em 30/09/2026, sem vencimento real (31/12/9999): `ccd2bbdf75ca95784c2adc5f68af4a8e9b79b065` e `be7c50d3b6f5fcd9d73647b57ff25110215372a4`.
- Criar chave nova está **bloqueado** pela política da organização `iam.disableServiceAccountKeyCreation` (aviso do console, número de rastreamento c3588631825350122). Nada foi criado nem alterado nela.
- A página "Detalhes da política" dessa restrição foi deixada aberta numa aba do Chrome para o responsável clicar em "Gerenciar política". Se ele fizer, o próximo passo é criar a chave JSON sem abri-la, colocá-la no caminho acima (guardando a antiga com outro nome, sem apagar) e rodar `ligar-push.bat` de novo. Depois convém reativar a política.
- Sobra na pasta Downloads o arquivo `project-79519032-1c32-4dac-a1f-ccd2bbdf75ca.json` (a outra chave antiga, nunca aberta). Quem decide o que fazer com ele é o responsável.

## Código e scripts no computador

- Pasta do projeto: `C:\economae` (não é repositório Git).
- Código da fase 4 baixado em `Downloads\pharmaapp-ccr-a7b2508f-xu0ojs.zip` (branch `ccr-a7b2508f-xu0ojs` de `hqvctr/pharmaapp`). O `atualizar.bat` usa o `pharmaapp*.zip` mais recente da pasta Downloads. Foi conferido que o `ligar-push.bat` do zip só acrescenta `FCM_CONTA_SERVICO=/segredos/firebase-conta-servico.json` ao `.env`, religa o coletor e filtra o log para não mostrar a chave, e que o `docker-compose.yml` monta `./segredos` em `/segredos` (somente leitura).
- O responsável rodou os `.bat` por conta própria (o Claude não conseguiu, porque uma janela do Chrome ficava na frente). O Claude **não viu** a saída de `atualizar.bat`, `ligar-push.bat` nem `status.bat`. A informação "push ligado" veio do responsável. O `status.bat` não foi conferido.
- Sugestão para o repositório: o `.gitignore` só tem `.env`, `node_modules/` e `dist/`. Acrescentar `segredos/`, por segurança.

## O que falta fazer (lado do app, segundo `docs/operacao/push.md`)

O app de prévia não tem Firebase Messaging. Falta:

1. Pôr o `google-services.json` acima no módulo do app e aplicar o plugin do Google Services.
2. Adicionar a biblioteca do FCM no app.
3. Pedir a permissão de notificação (Android 13+).
4. Criar o canal de notificação `avisos`.
5. Mandar o token do aparelho para a API com `PUT /v1/dispositivo`.
6. Abrir o aviso ao tocar nele.

Para testar o envio antes dos 14 dias de histórico de preços, os alertas de demonstração do `demo-feed.bat` também geram avisos e push (o `demo-feed-remover.bat` apaga junto).

## Túnel

O túnel (`scripts\windows\tunel.bat`) NÃO é necessário para o servidor enviar push. Ele só abre um endereço temporário `https://....trycloudflare.com` para o celular alcançar a API fora de casa. Quando o app passar a mandar o token, o celular precisará alcançar a API: aí serve o túnel ou o endereço da rede local (`http://192.168.0.15:3000`). Com o túnel aberto, qualquer pessoa com o endereço alcança a API, então abrir só para testar e fechar com `tunel-parar.bat`.

## O que NÃO foi criado nem alterado

- Nenhuma chave de conta de serviço foi criada, baixada ou apagada. A política da organização não foi mexida.
- Nenhuma API foi ligada ou desligada. O `.env` e a chave da conta de serviço nunca foram abertos.
- Foi apagado só o `google-services (1).json` que o Claude baixou hoje.
- A chave antiga `be7c50d3b6` foi movida (não copiada) de Downloads para `segredos`, e a pasta `segredos` foi criada.
