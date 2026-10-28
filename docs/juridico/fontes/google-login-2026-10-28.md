# Login com Google do economae: relatório de configuração (28/10/2026)

Conta logada no Google Cloud: descubranovasformas@gmail.com (Formas Visuais)

## Resumo

- **ID de cliente Web a usar no servidor (já existia, não foi criado):**
  `984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com`
- Nenhum cliente foi criado. A tela de consentimento está "Em teste" (Testando), tipo Externo, com escopos só openid, email e profile.
- Há um cliente Android de debug já existente, criado em 30/09/2026 (ver divergências).

## O que foi feito (alterações)

Nada foi criado, editado, excluído ou publicado. O passo 4 caiu no caso (a): já existia cliente Web, então não criei nada.

## O que foi só olhado

1. Painel inicial do Google Cloud e seletor de projetos (abas "Recente" e "Todos").
2. Lista de projetos do console do Firebase.
3. APIs e serviços > Credenciais (chaves de API, clientes OAuth, contas de serviço, só a listagem).
4. Google Auth Platform: Visão geral, Branding, Público-alvo, Acesso a dados e Clientes.
5. Página de detalhes do cliente Android (somente leitura, sem salvar), para ler pacote e SHA-1.

## Projeto

- Nome: My First Project
- ID: project-79519032-1c32-4dac-a1f
- Número do projeto: 984598232826
- Organização: descubranovasformas-org
- É o único projeto no seletor do Cloud e o único no console do Firebase. O ID é o mesmo nos dois, então é o projeto do Firebase do economae.
- A conta de serviço firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com existe (só listada).

## Clientes OAuth 2.0 (lista completa)

| Nome | Tipo | ID do cliente | Criado em |
|---|---|---|---|
| economae-servidor | Aplicativo da Web | `984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com` | 29/09/2026 |
| economae-android-debug | Android | `984598232826-1i256inbmffo8gdkra3m49vmf698u3hv.apps.googleusercontent.com` | 30/09/2026 (14:02 GMT-3) |

Segredo do cliente: existe para o cliente Web, não foi copiado nem exibido. Não foi baixado nenhum JSON.

## Cliente Web para o servidor

- ID: `984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com`
- Já existia (nome `economae-servidor`), não foi criado por mim.
- O servidor deve aceitar como `aud` este ID. O ID do cliente Android de debug só entra na lista de audiências aceitas se o app pedir o ID token com esse cliente (o normal é pedir com o ID do cliente Web, via `serverClientId`).

## Tela de consentimento OAuth

- Nome do app: economae
- E-mail de suporte: descubranovasformas@gmail.com
- Status de publicação: **Testando** (não foi alterado)
- Tipo de usuário: **Externo**
- Escopos: somente `openid`, `.../auth/userinfo.email` e `.../auth/userinfo.profile` (não confidenciais). Escopos confidenciais: nenhum. Restritos: nenhum.
- Usuários de teste: **1** (1 de teste, 0 outros, limite de 100)
- A conta logada (descubranovasformas@gmail.com) **está** na lista de teste.
- A verificação do Google não é necessária enquanto o app estiver em teste.

## Clientes Android existentes

- Nome: economae-android-debug
- Pacote: `br.com.economae.debug`
- SHA-1: `10:88:D4:80:33:01:24:8B:8B:33:F4:8A:2C:4E:B5:AD:35:CF:3B:85`
- Último uso registrado: 30/09/2026

## O que saiu diferente do esperado

1. **O projeto se chama "My First Project"**, não tem "economae" no nome. Confirmei que é o economae só pelo ID igual no Firebase, por ser o único projeto, e pelos clientes `economae-*` e pelo nome do app (economae) na tela de consentimento.
2. **Já existe um cliente Android** (`economae-android-debug`), criado antes. O enunciado dizia que ainda não existiam pacote e SHA-1 de release. Este é de **debug** (pacote `br.com.economae.debug`), então o de release continua pendente.
3. **O cliente Web não é o criado automaticamente pelo Firebase.** Chama-se `economae-servidor` e foi criado manualmente em 29/09/2026.
4. **Para abrir o cliente Android e ler pacote e SHA-1** (passo 5), entrei na tela de detalhes dele, que é a única onde esses dados aparecem. No passo 2 você pedia para não abrir a edição. Entendi o passo 5 como permissão para só ler; não alterei nem salvei nada. Clientes Android não têm segredo.
5. Para ler os IDs completos (a lista os mostra truncados), usei o botão de copiar ID do cliente da lista, colei na caixa de pesquisa do console, li o valor e apaguei. Isso passou os dois IDs pela área de transferência. O segredo não foi copiado.
6. Havia um aviso de carregamento lento do console (fontes JS do gstatic) que não afetou os dados.

## Confirmação do que NÃO foi criado nem alterado

- Nenhum cliente OAuth criado (nem Web, nem Android, nem iOS).
- Nenhum segredo de cliente copiado, exibido ou baixado; nenhum JSON baixado.
- Tela de consentimento **não publicada** ("Testando" continua), nada enviado para verificação.
- Escopos, domínios autorizados, usuários de teste, contas de serviço e chaves de API: sem alteração (as chaves de API foram só listadas, sem clicar em "Exibir chave").
- Nada de cobrança, pagamento ou contrato; nenhuma API paga ativada.
- Nada alterado no Firebase (só olhei a lista de projetos).
