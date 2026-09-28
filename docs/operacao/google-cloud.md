# Brevo e Google Cloud: o que criar e onde cada valor entra

Passo a passo para quem tem as contas. Nenhuma chave vai para o repositório: todas entram por
variável de ambiente ou pela config do tenant. Planos gratuitos conferidos em 2026-09-28; eles mudam,
então confira de novo ao criar as contas.

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

Não precisa de conta de faturamento para isso.

1. console.cloud.google.com → **Novo projeto** → nome `economae`.
2. **Google Auth Platform → Branding (tela de consentimento):** nome do app, e-mail de suporte, logo
   opcional, domínio autorizado (seção 1) e links dos termos e da política quando estiverem publicados.
   Escopos: só `openid`, `email` e `profile`, que não passam por verificação sensível. Enquanto os
   textos estão em revisão, deixar em **Teste** com até 100 usuários de teste.
3. **Clients → Criar cliente → Aplicativo da Web**, nome `economae-servidor`. Nenhuma URI de
   redirecionamento é necessária. O **ID do cliente** gerado vai em dois lugares:
   - `backend/config/tenants/economae.json` → `app.auth.googleClientIds` (a API só aceita tokens com
     esta audiência; com a lista vazia, o login com Google fica desligado);
   - o app Android, como `serverClientId` do Credential Manager (fase 4).
4. **Clients → Criar cliente → Android** (fase 4): nome do pacote do app e SHA-1 do certificado. Um
   cliente para o certificado de debug e outro para o de release (o SHA-1 da assinatura de apps do
   Google Play aparece no Play Console).
5. **Firebase** (fase 4): console.firebase.google.com → adicionar Firebase ao projeto `economae`, plano
   Spark (gratuito). O FCM (push) é gratuito. O app recebe o `google-services.json`; o servidor recebe
   uma conta de serviço com permissão só de envio de mensagens.

## 4. Hospedagem no Google Cloud (proposta, aguarda confirmação)

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
