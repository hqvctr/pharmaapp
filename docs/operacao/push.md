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

## Ligar o push no seu computador

Hoje o push está **desligado**: os avisos são criados e aparecem na central, mas nenhum push sai. Para ligar:

1. **Conta de serviço do Firebase.** No Google Cloud do projeto (`project-79519032-1c32-4dac-a1f`), uma conta de serviço com
   permissão de enviar mensagens do Firebase e uma chave JSON dela. **Quem baixa a chave é você, sem o Cowork e sem passar pelo
   chat**: é uma senha. (O BACKLOG registra que já existe uma chave antiga, sem validade; o prompt do Cowork abaixo só descobre
   o que existe.)
2. Crie a pasta `segredos` dentro da pasta do economae (ao lado do `docker-compose.yml`) e ponha o JSON lá, por exemplo
   `segredos\firebase-conta-servico.json`. A pasta está fora do Git.
3. No `.env`, acrescente: `FCM_CONTA_SERVICO=/segredos/firebase-conta-servico.json` (o caminho é o de **dentro** do contêiner).
4. Rode o `atualizar.bat`. No log do coletor deve aparecer `push ligado`.

Se o arquivo estiver errado, o coletor não sobe e diz o motivo (sem mostrar o conteúdo). Se o Google recusar a chave, o
despachante para de enviar naquela rodada e escreve `ERRO no FCM` no log; os pushes ficam pendentes e expiram em 12 h.

## O que ainda falta para o push chegar ao celular

- **O app ainda não recebe push.** O app de prévia não tem o Firebase Messaging: falta registrar o app Android no Firebase, pôr a
  biblioteca do FCM no app, pedir a permissão de notificação (Android 13+), criar o canal `avisos`, mandar o token com
  `PUT /v1/dispositivo` e abrir o aviso ao tocar. Próximo passo do app.
- Para testar antes dos 14 dias de histórico, os alertas de demonstração (`demo-feed.bat`) também geram avisos e push
  (os dois de destaque). O `demo-feed-remover.bat` apaga os avisos deles junto.

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
