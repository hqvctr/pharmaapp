# Termos de uso e política de privacidade: o que precisam cobrir

**Situação:** os textos estão em revisão pela assessoria (2026-09-28). A config do tenant publica a
versão `rascunho-2026-09-28`, com `url: null`. O app não pode ser publicado assim.

**Validado pela assessoria em 2026-09-28:** a triagem da NBCAL como está implementada, e o tamanho de
fralda escolhido não é dado da criança.

Este arquivo **não é o texto jurídico** e não é parecer. Ele lista o que o app faz de fato, a partir do
código, para a assessoria redigir os textos. As leis citadas precisam ser conferidas pela assessoria;
algumas referências foram feitas de memória.

## 1. Dados que o app trata hoje

| Dado | Onde fica | Para quê | Base legal sugerida (LGPD) | Retenção |
|------|-----------|----------|---------------------------|----------|
| E-mail | `users` | login, conta | execução de contrato (art. 7º, V) | até excluir a conta |
| Identificador do Google (`sub`) | `users` | login com Google | execução de contrato | até excluir a conta |
| Código de login (só o HMAC) | `auth_codigos` | login | execução de contrato | vale 10 min; apagado 1 dia depois de vencer ou ao excluir a conta |
| Sessão (só o hash do token) e data de uso | `sessoes` | manter o login | execução de contrato | até expirar ou excluir a conta (limpeza pendente, ver BACKLOG) |
| Até 3 CEPs | `user_preferences` | mostrar ofertas com entrega | execução de contrato | até excluir a conta |
| Categorias escolhidas | `user_preferences` | filtrar ofertas | **ver 1.1**, dado sensível por inferência | até excluir a conta |
| Tamanhos de fralda escolhidos (opcional) | `user_preferences` | filtrar fraldas | execução de contrato (não é dado da criança, segundo a assessoria) | até excluir a conta |
| Horário de silêncio e limite diário | `user_preferences` | regular as notificações | execução de contrato | até excluir a conta |
| Aceite dos termos (versão e data) | `users` | provar o aceite | cumprimento de obrigação / exercício de direitos | até excluir a conta, ou mais, se a assessoria pedir |
| Consentimento de notificação (data) | `users` | enviar push | consentimento (art. 7º, I), revogável no app | até revogar ou excluir a conta |
| IP | limite de taxa (Redis, 1 h) e log da API | segurança | legítimo interesse; **registro de acesso, ver 1.2** | 6 meses para o registro de acesso |
| Assinatura premium | `subscriptions` | plano pago (fase 6) | execução de contrato | a definir (fiscal) |
| Token de push do aparelho (FCM) | `dispositivos`, preso à sessão | enviar os alertas | consentimento (art. 7º, I) | até sair da conta, excluir a conta ou o token deixar de valer |
| Entregas de push (enviada, aberta) | `deliveries` | limite diário, não repetir alerta, métrica de abertura | consentimento / legítimo interesse | a definir; sai na exclusão da conta |

**O app não coleta:** nome, telefone, endereço completo, CPF, data de nascimento, dados da criança,
data provável do parto. Recomendação: manter assim (ver 1.1).

### 1.1 Gestação e dados da criança
- Quem escolhe a categoria "Gestação e pós-parto" revela, por inferência, que está grávida ou acabou de
  ter bebê. Dado de saúde é **dado pessoal sensível** (art. 5º, II; tratamento no art. 11). A política
  precisa dizer isso e a base legal precisa ser definida (provavelmente consentimento específico e
  destacado). Esse dado nunca pode ir para publicidade de terceiros.
- Dados de criança (art. 14) exigem consentimento específico de um dos pais. O filtro opcional por
  tamanho de fralda (decisão 51) guarda só o tamanho, sem idade nem data de nascimento, e a assessoria
  confirmou que não é dado da criança. Um filtro por "fase do bebê", se entrar, volta para a
  assessoria antes.

### 1.2 Marco Civil da Internet
O provedor de aplicação constituído como pessoa jurídica e com fins econômicos precisa guardar os
registros de acesso (IP, data e hora) por 6 meses, em sigilo (Lei 12.965/2014, art. 15). Hoje o log da
API não tem retenção definida (ver BACKLOG). A política deve citar essa guarda.

## 2. Termos de uso: pontos obrigatórios
1. Quem é o controlador: razão social, CNPJ, endereço e contato.
2. **Público: maiores de 18 anos.** O app é para mães e responsáveis. No Google Play, declarar o público
   18+ para ficar fora da política Famílias.
3. O app **não vende**. Preço, estoque, frete, entrega, troca e nota fiscal são da loja. O preço mostrado
   é o coletado no horário informado e pode mudar.
4. **Links de afiliado:** o app pode receber comissão quando a compra é feita pelo link. A oferta mostra
   isso (campo `linkAfiliado` no contrato).
5. O que o app promete, em linguagem simples: só mostra promoção comparada com o histórico da própria loja
   (pelo menos 14 dias com preço, queda mínima configurada, preço perto do menor do período, loja
   aprovada). Evitar "menor preço garantido".
6. **NBCAL (Lei 11.265/2006 e Decreto 9.579/2018):** o app não divulga fórmulas infantis para lactentes,
   mamadeiras, bicos, chupetas nem protetores de mamilo. As ofertas de alimento infantil saem com a
   advertência do Ministério da Saúde (regra validada pela assessoria).
7. **Sem medicamentos** e sem nenhuma orientação de saúde, de uso ou de dosagem.
8. Plano premium (fase 6): preço, renovação automática, cancelamento pelo Google Play, direito de
   arrependimento (CDC, art. 49).
9. Exclusão da conta: o que é apagado, e que a assinatura do Google Play precisa ser cancelada no Play.
10. Mudança dos termos: o app pede novo aceite (isso já funciona: trocar a versão na config bloqueia o
    feed até o novo aceite).
11. Lei aplicável e foro. Em relação de consumo, o foro é o do consumidor.

## 3. Política de privacidade: pontos obrigatórios
1. Controlador e canal para o titular. Encarregado (art. 41), ou a dispensa de agente de pequeno
   porte (Resolução CD/ANPD nº 2/2022), mantendo um canal de atendimento.
2. A tabela da seção 1, com finalidade, base legal e retenção de cada dado.
3. O dado sensível por inferência (1.1), dito de forma clara.
4. Com quem o dado é compartilhado:
   - Brevo (empresa francesa; razão social conforme o contrato), provedor do e-mail do código de login: recebe o e-mail do
     usuário e o código, e mede a abertura do e-mail (o painel não permite desligar; existe só o
     rastreamento anônimo, hoje desligado);
   - Google (login e, na fase 4, push);
   - hospedagem;
   - no clique, a rede de afiliados (Lomadee) e a loja, que tratam o dado pelas políticas delas.

   Onde houver servidor fora do Brasil, é transferência internacional (art. 33).
5. Direitos do titular (art. 18) e como exercer: exclusão no app (`DELETE /v1/eu`) **e numa página web**.
   O Google Play exige link web para pedir exclusão de conta sem reinstalar o app.
6. Notificações: consentimento separado do aceite dos termos, revogável no app.
7. Rastreamento: hoje não há SDK de analytics nem de publicidade. Se entrar, a política muda antes.
8. Versão e data. Mudança relevante é avisada no app.

## 4. Onde isso aparece no código
- `backend/config/tenants/<slug>.json` → `app.documentos.termos` e `app.documentos.privacidade`
  (`versao`, `url` https). Trocar `termos.versao` força novo aceite.
- `GET /v1/configuracao` entrega as duas URLs ao app, antes do login.
- `PUT /v1/eu/termos` registra o aceite; `PUT /v1/eu/notificacoes`, o consentimento; `DELETE /v1/eu`, a
  exclusão.
- NBCAL: `nbcal` na config do tenant (termos vedados, categorias com aviso, texto do aviso) e
  `backend/src/normalizador/nbcal.ts`.
