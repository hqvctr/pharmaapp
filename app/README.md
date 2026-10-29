# economae: app Android de prévia

App de **teste** (Kotlin + Jetpack Compose) que fala com a API deste repositório. Não é o app da Play: não tem push, assinatura nem anúncios.
Como instalar no celular e apontar para o servidor: `docs/operacao/testar-no-celular.md`.

## O que tem

Entrar por código no e-mail ou com Google · termos e consentimento · categorias e CEP · feed de promoções com filtro por categoria ·
detalhe da promoção (prova de preço, entrega, frete, advertência legal, link da loja, compartilhar, útil/não útil, denunciar, silenciar, seguir) ·
busca de produto, página do produto com ofertas e histórico · central de avisos · conta (notificações, silenciados, seguidos,
exportar dados, sair, excluir conta).

## Visual

Identidade do KV: `docs/design/identidade-visual.md`. Cores, fonte e formas só em `Tema.kt` (claro e escuro, segue o sistema);
componentes visuais em `Componentes.kt`. As artes (`res/drawable/ic_launcher_*`, `arte_*`, `marca_coracao`) saem do KV por
`scripts/gerar-arte-kv.sh` e as fontes (`res/font/inter_*`) por `scripts/fonte-inter.py`: não edite à mão.
Conferência sem aparelho: `node scripts/conferencia-visual.mjs <pasta>`.

## Como gerar o APK

```bash
ANDROID_HOME=/caminho/do/android-sdk scripts/gerar-apk.sh
```

Saída: `app/app/build/outputs/apk/debug/app-debug.apk`. Pacote `br.com.economae.debug`.

## Assinatura (chave de teste)

`app/app/previa.keystore` (senha `android`, alias `economae-previa`) está no repositório **de propósito**: é uma chave de teste, sem valor, que mantém o mesmo
SHA-1 em todo build para o Google reconhecer o app (login com Google) e para o celular aceitar atualização por cima.
SHA-1: `7C:1C:41:D9:F3:A9:83:20:46:B9:66:2A:E9:62:59:FF:6A:3D:36:A6`.
**A chave de release da Google Play é outra, nunca entra no repositório.**

## Como o app se liga à API

- `X-Tenant: padrao` em toda chamada (`BuildConfig.TENANT`).
- O endereço do servidor é digitado na primeira tela e guardado no aparelho.
- O login com Google pede o ID token para o cliente OAuth **Web** (`BuildConfig.GOOGLE_WEB_CLIENT_ID`), o mesmo que o servidor aceita.
- Tokens ficam em `SharedPreferences` comum (prévia). Na versão final: `EncryptedSharedPreferences` ou Keystore.
- O teste `backend/src/api/appPrevia.integracao.test.ts` repete as mesmas chamadas do app contra um Postgres de verdade.
