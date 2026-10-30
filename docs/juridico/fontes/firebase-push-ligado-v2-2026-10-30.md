# economae: estado do push (FCM) para o Claude Code (versão 2)

> Cópia do relatório do Cowork. As chaves de API foram mascaradas ao entrar no repositório; o resto está como veio.

Atualizado em 30/10/2026, 00h40 (Brasília). Esta versão **substitui** `resumo-firebase-push-para-code.md` (de 29/10), que está desatualizado: a chave da conta de serviço foi trocada, a política foi religada e as chaves antigas foram excluídas.

## Regras que valem para este trabalho

- Nunca abrir, ler, mostrar, copiar ou colar o conteúdo de `C:\economae\segredos\firebase-conta-servico.json` nem do `.env`. São senhas.
- Não mexer na política da organização do Google Cloud, não criar, desativar nem apagar chaves de conta de serviço. Quem faz isso é o responsável (descubranovasformas@gmail.com), no console.
- Nada de pagamento, faturamento ou upgrade de plano.

## Resumo em uma frase

O servidor envia push pelo FCM (API V1) com uma chave nova da conta de serviço, o coletor está rodando com ela e mostra "push ligado". O app de prévia ainda NÃO recebe push: falta o lado do app.

## Estado final conferido

| Item | Estado |
|---|---|
| Chave da conta de serviço em uso | `b5aeff6f2afb4d8f8a92113802420326b3444bca`, criada em 30/10/2026, Active, validade 31/12/9999 |
| Onde está no computador | `C:\economae\segredos\firebase-conta-servico.json` (nunca foi aberta) |
| Chaves antigas `ccd2bbdf…` e `be7c50d3…` | **Excluídas** no console pelo responsável. Conferido: a aba Chaves lista só a `b5aeff6f…` |
| Arquivos antigos de chave no computador | Apagados pelo responsável (pastas "a excluir" não existem mais; não há `project-79519032*.json` solto em Downloads) |
| Política `iam.disableServiceAccountKeyCreation` (projeto) | **Aplicada** (religada pelo responsável e conferida) |
| Coletor (Docker) | Reiniciou em 30/10 às 03:32 UTC (00h32 Brasília), depois da troca do arquivo. Log: "Coletor iniciado: tenant padrao, a cada 120 min; push ligado". Sem "ERRO no FCM" até agora |
| Histórico de preços | 3 de 14 dias; alertas criados: 0; push: "nada a enviar" |

Atenção: como não há nada a enviar, o envio real pelo FCM ainda não foi exercitado com a chave nova. Se a chave tiver algum problema, aparece "ERRO no FCM" no log (`status.bat`) no primeiro envio. Vale conferir depois do primeiro envio real ou de um teste com `demo-feed.bat` (que só gera aviso se houver aparelho com token registrado, e o app ainda não registra).

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
| Conta de serviço | firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com (ID exclusivo 101732126050930551672) |
| Papéis da conta de serviço | Agente de serviço administrador do SDK Admin do Firebase; Criador do token da conta de serviço |

SHA-1 cadastrados no app `br.com.economae.debug` (os dois valem):

```
10:88:d4:80:33:01:24:8b:8b:33:f4:8a:2c:4e:b5:ad:35:cf:3b:85
7c:1c:41:d9:f3:a9:83:20:46:b9:66:2a:e9:62:59:ff:6a:3d:36:a6   (do APK de prévia atual)
```

A "Android key" com restrição "Apps Android" (ID no console `e5c58b6c-36dc-4506-acac-8d0ac428d890`) lista `br.com.economae.debug` com os dois SHA-1. As APIs permitidas não mudaram (25 APIs). A outra Android key e a Browser key não foram tocadas.

Observação do console: existe uma restrição nova ("iam.managed.disableServiceAccountKeyCreation") sugerida pelo Google. Não foi mexida.

## google-services.json do app debug (não é segredo, vai dentro do app)

O arquivo baixado em 29/10 foi apagado do computador. Conteúdo, já com o certificado novo (`7c1c41d9…`):

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

Na pasta Downloads do computador ainda existe um `google-services.json` ANTIGO (30/09/2026, sem o certificado novo). Não usar esse. Se precisar de um atual, baixar de novo pela página do app no Firebase.

## Código e scripts no computador

- Pasta do projeto: `C:\economae` (não é repositório Git). O `atualizar.bat` copia o zip mais recente `pharmaapp*.zip` de Downloads por cima, mantendo o `.env` e os dados do banco.
- O computador roda a branch `ccr-a7b2508f-xu0ojs` de `hqvctr/pharmaapp` (zip `pharmaapp-ccr-a7b2508f-xu0ojs.zip` em Downloads). Se alguém atualizar com o zip de `claude/zen-gates-965k2e`, a fase 4 (push) some do computador.
- `docker-compose.yml` monta `./segredos` em `/segredos` (somente leitura) e o `.env` tem `FCM_CONTA_SERVICO=/segredos/firebase-conta-servico.json`.
- O coletor só lê a chave quando é reiniciado. Para trocar a chave no futuro: colocar o arquivo novo no mesmo caminho e reiniciar o contêiner `coletor` no Docker Desktop (o `ligar-push.bat` sozinho NÃO recria o contêiner se nada mudou na configuração).
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

## Outras observações

- O log do coletor traz poucas linhas "ilegível" da Lomadee (4 itens, de mais de 6.000 ofertas, com `pricing[0].price` ausente ou inválido). Não afetam o push.
- O responsável não tem a permissão `resourcemanager.organizations.getIamPolicy` na organização `descubranovasformas-org` (já existe um pedido de acesso enviado em 27/10/2026). Não foi necessária para esta tarefa.
- Acesso do Claude ao computador: o Explorador de Arquivos só aceita clique simples (não roda `.bat` por duplo clique). Quem roda os `.bat` é o responsável.
