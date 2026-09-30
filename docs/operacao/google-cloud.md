# Brevo e Google Cloud: o que criar e onde cada valor entra

Passo a passo para quem tem as contas. Nenhuma chave vai para o repositório: todas entram por
variável de ambiente ou pela config do tenant. Planos gratuitos conferidos em 2026-09-28; eles mudam,
então confira de novo ao criar as contas.

Para fazer as seções 2 e 3 com o Cowork no navegador: [prompt-cowork.md](prompt-cowork.md). Depois do
critério da Fase 4 (restrição da chave, conta de serviço, teste no emulador):
[prompt-cowork-fase4.md](prompt-cowork-fase4.md). Em seguida: [prompt-cowork-proximos-passos.md](prompt-cowork-proximos-passos.md).

## Valores já criados

| O quê | Valor | Onde entra |
|-------|-------|-----------|
| ID do projeto no Google Cloud (criado em 2026-09-28) | `project-79519032-1c32-4dac-a1f` | Firebase e envio de push pela API HTTP v1 do FCM (fase 4) |
| ID do cliente Web (OAuth), `economae-servidor` | `984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com` | `app.auth.googleClientIds` (já configurado) e `serverClientId` do app (fase 4) |
| Tela de consentimento | criada, status **Em teste**, 1 usuário de teste | só usuários de teste entram com Google até publicar |
| Firebase | adicionado ao projeto, plano Spark | app Android e push (fase 4) |
| Cliente OAuth **Android**, `economae-android-debug` | `984598232826-1i256inbmffo8gdkra3m49vmf698u3hv.apps.googleusercontent.com` (pacote `br.com.economae.debug`, SHA-1 da chave de debug do projeto) | nada a configurar no código: o Google confere pacote + SHA-1 do app |
| App Android no Firebase | `1:984598232826:android:06850797fd477592849343` (pacote `br.com.economae.debug`) | `android/app/google-services.json`, fora do git |
| App Android de release no Firebase | `br.com.economae`, registrado em 2026-09-30 sem SHA-1 | o `google-services.json` baixado depois disso traz os dois apps |
| Chave de API do Firebase para Android (termina em `7WhU`) | restrita a apps Android: `br.com.economae.debug` + SHA-1 de debug (2026-09-30); restrições de API mantidas como o Firebase criou | falta acrescentar `br.com.economae` + SHA-1 de release depois do Play Console |
| API do FCM | Firebase Cloud Messaging API (V1) ativa; API legada desativada | envio de push pelo despachante |
| Chave da conta de serviço `firebase-adminsdk` | criada em 2026-09-30, sem validade, guardada no computador do responsável (fora do git) | `FCM_CONTA_SERVICO` no teste do emulador e no deploy |
| Brevo | conta Free; remetente verificado é um endereço pessoal do Gmail (nome "economae"); chave de API não gerada | `EMAIL_REMETENTE` no deploy |

Configurado pelo Cowork em 2026-09-29 ([prompt-cowork.md](prompt-cowork.md)) e em 2026-09-30
([prompt-cowork-android.md](prompt-cowork-android.md)).

O `google-services.json` não vai para o git: quem compila o app baixa em Firebase → Configurações do
projeto → Seus apps → `br.com.economae.debug` e salva em `android/app/`. Ele cobre só o pacote de
debug; o build de release precisa do app `br.com.economae` registrado também (senão o plugin do
Google recusa o build). A chave de API que vem nele foi feita para ir dentro do app, mas vale
restringi-la no Google Cloud (APIs e serviços → Credenciais → a chave "Android key" criada pelo
Firebase → Restrições de aplicativo: apps Android, pacote + SHA-1).

## 1. Domínio (recomendado antes de tudo)

Um domínio próprio (ex.: `economae.com.br`, cerca de R$ 40 por ano no registro.br) resolve três coisas:
- **E-mail que chega na caixa de entrada.** O Brevo autentica o domínio (SPF, DKIM, DMARC). Sem
  domínio, o remetente é um endereço pessoal verificado e o código cai no spam com mais frequência.
- **Endereço dos termos e da política de privacidade** (`app.documentos.*.url`, só https).
- **Domínio autorizado na tela de consentimento do login com Google**, e HTTPS da API se ela for
  hospedada na VM gratuita (seção 4).

É o único custo além da taxa do Google Play. Sem ele, dá para começar com remetente verificado e
páginas no Firebase Hosting (`*.web.app`, gratuito), aceitando a entregabilidade pior.

## 2. Brevo: e-mail do código de login (decisão 54)

Plano gratuito: 300 e-mails por dia, somando todos os envios da conta. Inclui a API transacional e não
pede cartão. O app só manda o código de login.

1. Criar a conta em brevo.com.
2. **Senders, Domains & Dedicated IPs → Domains:** autenticar o domínio (registros DNS que o Brevo
   mostra). Sem domínio: **Senders** → adicionar e verificar um endereço.
3. **SMTP & API → API keys:** gerar uma chave só para a API do economae.
4. Variáveis da API (no servidor, nunca no git):

   | Variável | Valor |
   |----------|-------|
   | `EMAIL_MODO` | `brevo` |
   | `BREVO_API_KEY` | a chave do passo 3 |
   | `EMAIL_REMETENTE` | ex.: `nao-responda@economae.com.br` (verificado no passo 2) |
   | `EMAIL_REMETENTE_NOME` | `economae` (padrão) |
   | `EMAIL_LIMITE_DIARIO` | `280` (padrão; fica abaixo dos 300 do plano) |

5. Conferir no painel se dá para desligar o rastreamento de abertura e de clique dos e-mails
   transacionais. Se não der, a política de privacidade precisa citar o Brevo como operador que mede
   abertura.

Passados 280 e-mails no dia (UTC), o pedido de código responde `503 ENVIO_FALHOU` com a mensagem
"Limite diário de e-mails atingido. Entre com o Google ou tente amanhã." (decisão 55). Isso é
proposital: acima do limite do plano, o Brevo segura o e-mail numa fila e o código vence antes de
chegar. O login com Google não gasta e-mail, por isso a seção 3 importa.

Alternativas avaliadas: Mailjet (6.000 por mês, 200 por dia, logo no e-mail), Resend (3.000 por mês,
100 por dia). SendGrid não tem mais plano gratuito permanente.

## 3. Projeto no Google Cloud: login com Google e, na fase 4, push

**Não ative o faturamento nem faça o depósito.** O login com Google (tela de consentimento e client
IDs) e o Firebase no plano Spark (inclusive o push) funcionam sem conta de faturamento. O depósito de
R$ 150 que o console pede é o pré-pagamento para ativar o faturamento, e o projeto não precisa disso.
Se o console insistir no teste gratuito ou no faturamento, feche o aviso ou use o caminho abaixo.

1. Caminho mais simples: console.firebase.google.com → **Criar projeto** → nome `economae`, sem Google
   Analytics. Isso cria o projeto no Google Cloud já ligado ao Firebase, no plano Spark (gratuito),
   sem pedir cartão. Depois, abrir o mesmo projeto em console.cloud.google.com para os passos 2 a 4.
   (Alternativa: console.cloud.google.com/projectcreate, e ignorar qualquer oferta de faturamento.)
2. **Google Auth Platform → Branding (tela de consentimento):** nome do app, e-mail de suporte, logo
   opcional, domínio autorizado (seção 1) e links dos termos e da política quando estiverem publicados.
   Escopos: só `openid`, `email` e `profile`, que não passam por verificação sensível. Enquanto os
   textos estão em revisão, deixar em **Teste** com até 100 usuários de teste.
3. **Clients → Criar cliente → Aplicativo da Web**, nome `economae-servidor`. Nenhuma URI de
   redirecionamento é necessária. O **ID do cliente** gerado vai em dois lugares:
   - `backend/config/tenants/economae.json` → `app.auth.googleClientIds` (a API só aceita tokens com
     esta audiência; com a lista vazia, o login com Google fica desligado);
   - o app Android, como `serverClientId` do Credential Manager (fase 4).
4. **Clients → Criar cliente → Android**, um para cada certificado que assina o app. Sem ele, o
   login com Google falha no aparelho mesmo com o client ID Web certo.
   - Debug: nome do pacote `br.com.economae.debug`, SHA-1
     `10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85`. É o da chave de debug do projeto,
     versionada em `android/app/debug.keystore`: o mesmo em qualquer computador (decisão 66).
     Prompt pronto para o Cowork: [prompt-cowork-android.md](prompt-cowork-android.md).
   - Release: nome do pacote `br.com.economae`, SHA-1 da "chave de assinatura de apps" que o Play
     Console mostra depois do primeiro envio.
5. **Firebase → Configurações do projeto → Seus apps → Adicionar app Android**: registrar
   `br.com.economae.debug` (e depois `br.com.economae`), baixar o `google-services.json` e salvar em
   `android/app/google-services.json`. O arquivo fica fora do git (`android/.gitignore`); sem ele o
   app compila e roda, mas sem push.
6. **Conta de serviço do FCM** (só no deploy): Firebase → Configurações do projeto → Contas de
   serviço → Gerar nova chave privada. O JSON vai para o servidor, fora do git, apontado por
   `FCM_CONTA_SERVICO`, com `FCM_MODO=fcm`. Quem tem esse arquivo manda push em nome do app:
   guardar como senha.

## 4. Hospedagem no Google Cloud (suspensa em 2026-09-28)

**Situação:** a VM gratuita exige ativar o faturamento, e no Brasil isso pede um depósito de R$ 150 em
crédito, que não está disponível. A proposta abaixo fica guardada para quando houver o depósito. O
crédito não é gasto enquanto o uso ficar dentro do nível gratuito.

Até lá não é preciso hospedar nada: a fase 4 desenvolve o app contra o backend rodando na máquina de
quem desenvolve (o emulador Android alcança o computador em `http://10.0.2.2:3000`). A hospedagem só
vira necessidade no teste com usuários reais, que também depende da vinculação real da Lomadee.
Nessa hora, reavaliar: o depósito no Google Cloud, ou um computador próprio sempre ligado com
Cloudflare Tunnel (gratuito, sem cartão, exige o domínio da seção 1 no Cloudflare).

### Proposta guardada: VM e2-micro

O nível sempre gratuito do Compute Engine cobre o backend inteiro numa VM, no mesmo desenho da
decisão 21 (Postgres e Redis no mesmo host):
- 1 VM `e2-micro` (1 GB de RAM) por mês, só em `us-west1`, `us-central1` ou `us-east1`;
- 30 GB de disco padrão;
- 1 GB de saída de dados por mês. O feed é JSON pequeno e as fotos vêm direto da loja.

Custos e condições a aceitar:
- Precisa de **conta de faturamento** (cartão), mesmo sem cobrança dentro do limite. Criar um alerta de
  orçamento de R$ 1 para saber de qualquer cobrança.
- A região de São Paulo não entra no nível gratuito. Os dados ficam nos EUA: é transferência
  internacional, e a política de privacidade precisa dizer isso. A latência do Brasil fica em torno
  de 150 ms, aceitável para o feed.
- 1 GB de RAM é apertado para API, Postgres e Redis juntos. Dá com swap e limites de memória nos
  contêineres, e precisa ser medido.

A preparar quando a proposta for aprovada:
- compose de produção com Caddy (HTTPS automático, exige o domínio);
- `NODE_ENV=production`, `TRUST_PROXY=true` e segredos fora do git;
- coletor agendado;
- backup diário do Postgres;
- retenção de 6 meses dos registros de acesso (Marco Civil).

Alternativa sem VM: Cloud Run (2 milhões de requisições por mês gratuitas) mais um Postgres gratuito
de terceiros. Isso contraria a decisão 21, põe mais um operador de dados pessoais na política, e o
Cloud Run não roda o coletor agendado sem outro serviço.
