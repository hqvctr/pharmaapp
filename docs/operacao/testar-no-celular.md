# Testar o app no celular

## Do zero, na ordem (computador Windows com o Docker Desktop aberto)

> **Importante:** rode os `.bat` **sempre na pasta onde o economae foi instalado** (a que tem o arquivo `.env`, onde você rodou o `instalar.bat`).
> Rodar numa pasta nova, extraída do zip, faz o Docker criar um banco novo e vazio (e dá erro de "porta já em uso", porque o antigo continua ligado).
> Por isso o primeiro passo é copiar os arquivos do zip por cima da pasta instalada, à mão.

1. **Atualizar o projeto** com a versão que tem a API do app: baixe o zip de
   `https://github.com/hqvctr/pharmaapp/archive/refs/heads/claude/zen-gates-965k2e.zip` (fica em Downloads) e dê dois cliques em
   `scripts\windows\atualizar.bat`. Ele copia por cima (o `.env` e o banco são mantidos) e religa tudo.
2. **Ligar o login**: dois cliques em `scripts\windows\preparar-login.bat`. Hoje o `.env` não tem a chave de login (por isso o app diria
   "Não encontrado" ao pedir o código). Enquanto a Brevo não estiver configurada neste computador, o código de teste aparece em `ver-codigo.bat`.
3. **Abrir o endereço para o celular**: dois cliques em `scripts\windows\tunel.bat` e copie o endereço `https://....trycloudflare.com` que ele mostra.
4. **No app**: cole o endereço, toque em "Testar conexão" (deve aparecer "Conectado: economae"), digite o e-mail, "Enviar código".
5. Dois cliques em `ver-codigo.bat`, leia o código da última linha e digite no app.

## "Nenhuma promoção aparece": é esperado por enquanto

A aba **Promoções** mostra *alertas*, e o motor só cria alerta depois de **14 dias de histórico de preços** (para saber o que é queda de verdade). A
coleta começou em 27/10, então os primeiros alertas reais só saem por volta de **11/11/2026**. Dois jeitos de testar nesse meio tempo:

- **Aba Buscar** funciona já: ela mostra produtos e preços atuais coletados (procure "fralda", "shampoo", uma marca). A página do produto mostra as
  lojas, o link e o início do histórico.
- **Alertas de demonstração:** dois cliques em `scripts\windows\demo-feed.bat` (na pasta instalada) cria até 8 alertas em ofertas reais já coletadas
  nas últimas horas, para você ver o feed, o detalhe, o botão da loja, útil/não útil, denunciar e silenciar. **O "preço de antes" e a queda são inventados**
  e cada alerta aparece marcado **DEMONSTRAÇÃO** no app. Depois de aprovar o feed, `demo-feed-remover.bat` apaga todos (os alertas de verdade não são tocados).
  Se o script disser que nenhuma oferta serve, o coletor está parado ou a última coleta tem mais de 6 horas: rode `status.bat`.

Se mesmo assim a aba Buscar vier vazia, rode `status.bat` e me mande o que ele mostra.

## Instalar o app de prévia (APK)

1. Baixe o arquivo `economae-previa.apk` (enviado na conversa) no celular, ou passe do computador por cabo/Drive.
2. Toque no arquivo. O Android pede para permitir "instalar apps desta fonte" para o app que você usou para abrir (Chrome, Arquivos): permita só para esse.
3. Se o Play Protect avisar "app não verificado", é esperado: é um app de teste assinado com chave de teste. Toque em "Instalar mesmo assim".
4. Abra o **economae**, digite o endereço do servidor (abaixo), toque em "Testar conexão" e entre pelo código do e-mail.
5. Para atualizar, instale o APK novo por cima (a assinatura é a mesma); não precisa desinstalar.

**Entrar com Google** só funciona com a conta de teste (`descubranovasformas@gmail.com`) enquanto a tela de consentimento estiver em "Testando",
e só depois de o cliente Android de prévia estar cadastrado no Google Cloud (ver `docs/operacao/login-google.md`). O login por e-mail funciona sempre.

## Como o celular alcança a API

O app de teste (pasta `app/`) fala com a API do economae. A API roda no seu computador (Docker). Há dois jeitos de o celular alcançá-la.

## 1. Na mesma rede Wi-Fi (mais simples)

1. No computador, abra o PowerShell e rode `ipconfig`; anote o "Endereço IPv4" (algo como `192.168.0.15`).
2. A API só escuta no próprio computador (`127.0.0.1`). Para a rede ver, no `.env` coloque `API_BIND=0.0.0.0` e reinicie com `docker compose up -d api`.
   (Libere a porta 3000 no firewall do Windows só para "rede privada".)
3. No app, em "Endereço do servidor", digite `http://192.168.0.15:3000`.

## 2. De qualquer lugar: túnel temporário (sem domínio)

1. Dois cliques em `scripts\windows\tunel.bat`. Ele sobe o túnel e mostra um endereço `https://....trycloudflare.com`.
2. No app, em "Endereço do servidor", digite esse endereço.
3. O endereço **muda toda vez** que o túnel sobe. Para fechar: `scripts\windows\tunel-parar.bat`.
4. Enquanto o túnel está aberto, **qualquer pessoa com o endereço alcança a API**. É um teste; feche quando terminar. A API tem limite de tentativas por IP
   e o login é por código no e-mail, mas não deixe aberto o dia todo.

Endereço fixo exige um domínio no Cloudflare (~R$ 40/ano) e um túnel nomeado; fica para quando o app for para a Play.

> Os scripts e o serviço `tunel` do `docker-compose.yml` foram escritos sem poder rodar o Docker do Windows aqui. Se algo falhar, me mande a mensagem.
