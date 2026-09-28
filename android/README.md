# android/ — telas do economae (Kotlin + Jetpack Compose + Material 3)

Implementação das telas da proposta de UX (`../ux/PROPOSTA_UX.md`). É o primeiro código de interface
do repositório (não havia telas a substituir). A escolha de Compose está registrada como suposição
S-02 em `../ux/SUPOSICOES.md` e deve virar decisão no `DECISIONS.md` ao abrir a fase 4.

## O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `ui/theme/Tokens.kt` | **Gerado** de `ux/design-tokens/tokens.json` (`node ux/design-tokens/gerar.mjs`). Não editar à mão. |
| `ui/theme/` | Tema claro/escuro e tipografia montados só a partir dos tokens. |
| `ui/componentes/` | Cartão de oferta, selo de prova, Régua de preço, gráfico de 90 dias, faixa de condição, chip de economia, anúncio, esqueleto, estados. |
| `ui/telas/` | Primeiro uso (4 passos), Ofertas, Detalhe, Avisos, Ajustes, folhas "Como a gente confere" e Premium. Todas sem estado: recebem estado, devolvem eventos. |
| `notificacao/` | Canais, construção da notificação (N1–N7) e escolha dos textos de 30/40 caracteres. |
| `modelo/` | Modelo de interface (`OfertaUi`, estados de cada tela) e **dados de exemplo fictícios**. |
| `formato/` | Dinheiro, hora, CEP, preço por 100 ml/100 g/unidade, selo de prova. |
| `res/values/strings.xml` | Todo texto, igual a `ux/UX_COPY.md`. |

## O que falta para produção (fase 3/4)

Os dados vêm de `modelo/Exemplos.kt`. Falta o repositório que lê a API (contrato da fase 3, campos
listados em `ux/PROPOSTA_UX.md` seção 11), persistência local (preferências e cópia offline),
FCM, Google Play Billing e login opcional. Itens em `ux/BACKLOG_UX.md`.

## Rodar

Pré-requisitos: JDK 17+, Android SDK com `platforms;android-35` (em `local.properties`: `sdk.dir=...`).

```bash
./gradlew assembleDebug            # APK em app/build/outputs/apk/debug
./gradlew testDebugUnitTest        # testes JVM (textos da notificação, formatação, CEP, selo)
./gradlew recordPaparazziDebug     # regrava as capturas em app/src/test/snapshots/images
./gradlew verifyPaparazziDebug     # compara as telas com as capturas gravadas
```

Capturas: 17 telas/estados × 3 condições (claro, escuro, fonte a 200%) no aparelho de referência
(360 × 800 dp, S-01).

Ver as variações de notificação num aparelho:

```bash
adb shell am start -n app.promocao/.MainActivity --ez demo_notificacoes true --ez pular_primeiro_uso true
```
