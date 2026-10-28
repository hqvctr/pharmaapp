# Testar o app no celular

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
