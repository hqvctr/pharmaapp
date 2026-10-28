# Login por e-mail da API

Rotas: `POST /v1/auth/email/codigo`, `/v1/auth/email/verificar`, `/v1/auth/renovar`, `/v1/auth/sair` (contrato em
`backend/openapi/openapi.yaml`). Código de 6 dígitos, válido por 10 minutos, 5 tentativas; sessão de 1 h (access) e 60 dias
(refresh, de uso único, com detecção de reuso).

## O que precisa estar configurado
| Variável | Para quê | Como obter |
|---|---|---|
| `AUTH_HMAC_KEY` | Chave do HMAC que protege o código no Redis (mínimo 32 caracteres) | `openssl rand -base64 32`; só no `.env`, nunca no repositório |
| `BREVO_API_KEY` | Envio do código por e-mail (API transacional da Brevo) | Painel da Brevo (SMTP e API > Chaves de API) |
| `EMAIL_REMETENTE` | Endereço de quem envia; **precisa estar verificado na Brevo** | Hoje seria um Gmail; um domínio próprio melhora a entrega (BACKLOG) |
| `EMAIL_REMETENTE_NOME` | Nome que aparece na caixa de entrada | Padrão `economae` |
| `AUTH_EMAIL_CONSOLE=1` | Desenvolvimento: escreve o código no log do servidor em vez de enviar | Nunca em produção |
| `TRUST_PROXY=1` | API atrás de proxy confiável (Cloudflare Tunnel): o limite por IP usa `X-Forwarded-For` | Só quando houver o proxy |

Sem `AUTH_HMAC_KEY` mais um provedor (Brevo ou console), a API sobe com o login **desligado** e escreve um aviso no log.

## Limites (config por tenant, `app.limitesTaxa` em `backend/config/tenants/padrao.json`)
Pedido de código: 20/h por IP (acima, 429); 1 por minuto e 5 por hora por e-mail (acima, 202 sem enviar, para não revelar
quem tem conta); cota diária própria de 250 envios (acima, 503 com `Retry-After`; o plano grátis da Brevo costuma ter
teto diário, **a conferir na conta**). Verificação: 20/h por IP. Renovação: 60/h por sessão.

## Segurança que os testes provam (`backend/src/api/auth.integracao.test.ts`, contra Postgres de verdade)
Banco só guarda hash dos tokens; token de operador não vale no app; refresh usado duas vezes revoga a sessão inteira (e a
revogação é gravada mesmo com a resposta 401); sair apaga o aparelho de push; termos pendentes bloqueiam as rotas que não são de conta.

## Estado da Brevo (2026-10-28, Cowork: `brevo-configuracao-2026-10-28.md`)
- Plano **Free**, 300 e-mails por dia (o `emailDiario` de 250 do tenant fica abaixo, com folga), sem aviso de ativação.
- Remetente verificado: **economae** `<descubranovasformas@gmail.com>` (`EMAIL_REMETENTE`, `EMAIL_REMETENTE_NOME=economae`). A Brevo avisa em cada remetente:
  `Freemail domain is not recommended` e, no alto da lista, que remetentes de provedor gratuito não cumprem as exigências do Google, Yahoo e Microsoft:
  **entrega em risco (spam ou recusa) até haver domínio próprio autenticado.**
- Restrição por IP desligada (chaves de API e SMTP).
- Chave `economae-api`: restrita a e-mail transacional, expira em 28/10/2027 e **sozinha após 90 dias sem uso**. No ambiente de nuvem está como segredo de rede
  (host `api.brevo.com`, cabeçalho `api-key`), valendo em sessão nova. A chave local do computador do responsável (`BREVO_API_KEY` no `.env`) ainda não existe.
- Como saber se o segredo de rede está ativo: `GET /v3/account` com chave qualquer devolve 403 `permission_denied` (a chave real foi usada e é restrita) em vez de 401.

## Primeiro envio real (2026-10-28)
- Envio direto pelo `EnviadorBrevo` e depois pelo servidor completo (Postgres e Redis reais, `POST /v1/auth/email/codigo`) para a caixa de testes:
  ambos `requests` e `delivered` na Brevo (`GET /v3/smtp/statistics/events`) em menos de 1 s. O segundo pedido seguido saiu 202 **sem** gerar mensagem (limite de 1/min).
- **A Brevo reescreve o remetente de provedor gratuito:** o campo `from` do evento é `descubranovasformas@12291020.brevosend.com`, não o gmail.com. É assim que ela contorna o
  alinhamento de DKIM/DMARC; o e-mail chega com remetente "estranho" mas autenticado. O nome de exibição "economae" é mantido pelo pedido.
- `delivered` significa que o Gmail aceitou a mensagem; **não** diz se foi para a caixa de entrada ou o spam. Isso se confere abrindo a caixa (prompt do Cowork).
- Consultar o resultado de um envio: `GET https://api.brevo.com/v3/smtp/statistics/events?limit=10&sort=desc` (a lista demora alguns segundos para aparecer; chave com acesso a e-mail transacional).
- Ainda não feito com o e-mail real: a etapa `verificar` (o código só chega à caixa do responsável; o fluxo completo foi provado antes com o envio por console).

## Entrega conferida no Gmail (2026-10-28, Cowork: `brevo-entrega-2026-10-28.md`)
As duas mensagens (13:24 e 13:26) caíram na **Caixa de entrada**, sem aviso de spam, em menos de 1 s. Cabeçalhos da segunda: `From: "economae" <descubranovasformas@12291020.brevosend.com>`,
`Reply-To: "economae" <descubranovasformas@gmail.com>`, `spf=pass`, `dkim=pass header.i=@brevosend.com`, `dmarc=pass (p=REJECT) header.from=brevosend.com`.
O alinhamento é com brevosend.com, não com gmail.com. **Só o Gmail foi testado** (Outlook e Yahoo podem se comportar diferente). Um domínio próprio autenticado trocaria o "De"
estranho por um endereço do app; deixou de ser bloqueio para lançar, e é melhoria de marca e de confiança.

## Não conferido
O envio real pela Brevo (o adaptador segue a documentação da API, mas nenhum envio foi feito ainda), a entrega em Outlook/Yahoo e a etapa `verificar` com código real.
