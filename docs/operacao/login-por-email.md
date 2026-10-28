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

## Não conferido
O envio real pela Brevo (o adaptador segue a documentação da API, mas nenhuma conta foi usada) e o limite diário dela.
