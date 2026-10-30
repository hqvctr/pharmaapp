# Avisos e push (fase 4)

O **despachante** cria os avisos da central do app e manda o push pelo Firebase Cloud Messaging (FCM). Ele roda junto com o
coletor, no seu computador: depois de cada coleta e a cada 10 minutos. Regras completas e motivos: DECISIONS 100.

## O que vira aviso

| Aviso | Quando | Para quem |
|---|---|---|
| Promoção excepcional | o motor cria um alerta de destaque (ou o operador aprova um alerta que aguardava) | quem escolheu a categoria **ou** segue o produto, e tem loja que entrega no CEP |
| Baixou X% | o preço caiu mais que o X da pessoa desde o preço-base | quem segue o produto com esse aviso ligado |
| Voltou ao estoque | o produto estava sem oferta no CEP da pessoa e voltou | idem |
| Menor preço em 180 dias | o selo "menor preço em 180 dias" acendeu | idem |
| Promoção acabando | uma oferta do produto vence em menos de 24 h | idem |

Alerta "só feed" (medicamento, produto com aviso legal da NBCAL, oferta manual) nunca vira aviso.

## O que vira push

Todo aviso fica na central. O push sai se a pessoa deu consentimento de notificação, tem o app instalado com sessão ativa, não
silenciou a loja ou a marca, não está no horário de silêncio (o push espera o fim do silêncio, até 12 h), não passou do limite
diário e não recebeu push do mesmo produto nas últimas 24 h. O que aconteceu fica em `avisos.push`:

`enviado`, `pendente` (esperando o silêncio ou o FCM voltar), `sem_consentimento`, `sem_aparelho`, `silenciado`, `limite_diario`,
`repetido`, `advertencia_legal`, `expirado` (a oferta acabou, subiu ou o push esperou demais), `falhou`.

Para ver no banco: `docker compose exec postgres psql -U promo -d promo -c "SELECT push, count(*) FROM avisos GROUP BY push"`.

## Situação no Firebase (levantamento do Cowork, 29/10/2026)

Relatório: `docs/juridico/fontes/firebase-push-2026-10-30.md`.

- Projeto `project-79519032-1c32-4dac-a1f` (número/ID do remetente `984598232826`), plano Spark (sem custo).
- **API Firebase Cloud Messaging (V1) ativada**; a legada, desativada (o servidor só usa a V1).
- App Android `br.com.economae.debug` já registrado: ID `1:984598232826:android:06850797fd477592849343`, SHA-1 cadastrado
  `10:88:D4:...:3B:85` (a chave de debug do seu computador). **Falta o SHA-1 do APK de prévia** (`7C:1C:41:D9:...:36:A6`).
  O app `br.com.economae` (release) também existe: `1:984598232826:android:fc1670804c3c5074849343`.
- Conta de serviço `firebase-adminsdk-fbsvc@project-79519032-1c32-4dac-a1f.iam.gserviceaccount.com`, papel "Agente de serviço
  administrador do SDK Admin do Firebase" (envia push pela API V1). Duas chaves antigas ativas (30/09/2026, sem validade), de
  origem desconhecida.
- Duas chaves de API "Android key (auto created by Firebase)": uma restrita a apps Android, outra sem restrição de app.

## Ligar o push no seu computador

1. **Chave JSON da conta de serviço** (é uma senha: nunca no chat, no Git ou num e-mail). Salve como
   `segredos\firebase-conta-servico.json` dentro da pasta do economae (ao lado do `docker-compose.yml`). A pasta está fora do Git.
2. Dê dois cliques em **`scripts\windows\ligar-push.bat`**. Ele confere o arquivo, acrescenta
   `FCM_CONTA_SERVICO=/segredos/firebase-conta-servico.json` ao `.env` (sem abrir nem mostrar o `.env`) e religa o coletor.
   Tem de aparecer **`push ligado`**.

O código da fase 4 precisa estar no computador antes (zip da branch com a fase 4 + `atualizar.bat`).
Se o arquivo estiver errado, o coletor não sobe e diz o motivo (sem mostrar o conteúdo). Se o Google recusar a chave, o
despachante para de enviar naquela rodada e escreve `ERRO no FCM` no log; os pushes ficam pendentes e expiram em 12 h.

### Estado em 30/10/2026 (relatório `docs/juridico/fontes/firebase-push-ligado-2026-10-30.md`)

- **Push ligado no servidor** (o `ligar-push.bat` mostrou "push ligado", segundo o responsável; a saída do `status.bat` não foi vista).
  O computador roda o código da branch `ccr-a7b2508f-xu0ojs` (zip `pharmaapp-ccr-a7b2508f-xu0ojs.zip`): as próximas
  atualizações precisam baixar o zip da branch que tiver a fase 4, não o da `claude/zen-gates-965k2e`.
- Firebase: o app `br.com.economae.debug` tem os dois SHA-1 (`10:88:...` e `7C:1C:...`), e a chave de API restrita a apps Android
  aceita os dois.
- **Chave da conta de serviço em uso:** `b5aeff6f...`, criada em 30/10/2026, em `segredos\firebase-conta-servico.json`; é a
  **única** da conta (as antigas `be7c50d3...` e `ccd2bbdf...` foram excluídas pelo responsável, e os arquivos delas apagados).
  O coletor reiniciou com ela em 30/10 00h32 e mostra "push ligado". Relatório: `docs/juridico/fontes/firebase-push-ligado-v2-2026-10-30.md`.
  O envio real ainda não aconteceu (não havia nada a enviar): o primeiro push mostra se a chave vale (`ERRO no FCM` no log, se não).
- Política `iam.disableServiceAccountKeyCreation`: **aplicada** em 30/10 (conferido pelo Cowork). Para trocar a chave um dia:
  desligar a política por alguns minutos, criar a chave, salvá-la como `segredos\firebase-conta-servico.json`, rodar o
  `ligar-push.bat` (ele recria o coletor, que só lê a chave ao ligar) e religar a política.

## No app (0.5.0 de prévia)

- Ao ligar "Avisos por notificação" (na entrada ou no Perfil), o app pede a permissão do Android 13+ e manda o token do aparelho
  para a API (`PUT /v1/dispositivo`). Ele manda de novo a cada abertura e quando o Firebase troca o token. Desligar faz a API
  apagar os aparelhos da pessoa.
- Se o Android bloquear as notificações, o Perfil avisa e tem um botão para as configurações; os avisos continuam na aba Avisos.
- Tocar na notificação abre a promoção (ou o produto) e marca o aviso como lido. Com o app aberto, o próprio app mostra a
  notificação; com ele fechado, o Android mostra a que veio do servidor.
- O APK é compilado pelo GitHub Actions (`.github/workflows/app.yml`): na página da execução, artefato `economae-previa-apk`.

**Teste de ponta a ponta:** instalar o APK 0.5.0, entrar, ligar as notificações, conferir no servidor que o aparelho registrou
(`docker compose exec postgres psql -U promo -d promo -c "SELECT plataforma, versao_app, registrado_em FROM dispositivos"`),
rodar o `demo-feed-remover.bat` (se já houver demonstração; ela não se repete) e depois o `demo-feed.bat`, e esperar até 10 minutos (o despachante roda a cada 10 min) pela notificação dos dois alertas de destaque.
O celular precisa alcançar a API (rede local ou túnel) só para registrar o token; o push chega por fora, pelo Google.
O `demo-feed-remover.bat` apaga os alertas e os avisos da demonstração.

## Rodar à mão

```
docker compose run --rm coletor node dist/despachante/despachar.js            (alertas novos e envio)
docker compose run --rm coletor node dist/despachante/despachar.js --seguidos (também avalia os seguidos)
```

Só use `--seguidos` logo depois de uma coleta que deu certo: com uma fonte fora, as ofertas dela parecem "sem estoque".

## Configuração (`app.push` em `backend/config/tenants/padrao.json`)

| Campo | Padrão | O que faz |
|---|---|---|
| `antiRepeticaoHoras` | 24 | o mesmo produto não vira push duas vezes para a mesma pessoa nesse tempo |
| `validadeHoras` | 12 | push que esperou mais que isso não sai mais |
| `alertaMaxIdadeHoras` | 48 | alerta mais velho que isso quando o despachante o vê não gera aviso |
| `avisosRetencaoDias` | 90 | a central guarda os avisos por esse tempo (D12) |

O limite diário de cada pessoa vem das preferências; sem escolha, `limites.limiteDiarioPadrao` (3).
