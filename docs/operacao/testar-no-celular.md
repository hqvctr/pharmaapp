# Testar o app no celular

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
