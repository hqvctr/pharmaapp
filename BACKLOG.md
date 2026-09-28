# Backlog

Problemas encontrados fora do escopo da fase em andamento. Não são consertados na fase em que aparecem.

- [fase 0] A migration 0001 insere o tenant `padrao` para desenvolvimento. Antes de produção, decidir se o seed sai da migration para um script de provisionamento de tenant.
- [fase 0] Rotina de retenção de `price_history` (apagar só o que tiver mais de 180 dias) ainda não existe. Entra junto com o coletor (fase 2).
- [fase 0] Tabela de dispositivos/tokens FCM não existe. Entra na fase 4 (push).
- [fase 1] Resolução de CEP → coordenada (centróide) para a cobertura por distância: precisa de uma base de CEPs; decidir a fonte na fase 2 ou 3.
- [fase 2] Conflito na especificação: fonte TIPO E (manual) deveria "fechar buraco de cobertura", mas sem 14 observações o motor descarta. Decisão do responsável pendente.
- [fase 2] RDC 96/2008 exige advertências na divulgação de preço de medicamento isento. Validar com assessoria jurídica antes de liberar push de medicamento; conflita com "nenhuma orientação de uso".
- [fase 4/6] Google Play Console cobra taxa única de registro de desenvolvedor: é o único custo inevitável para publicar.
- [fase 2] Carregador das listas reais (CMED, Portaria 344) depende de baixar os arquivos; este ambiente bloqueia gov.br. Sem as listas o normalizador não sobe (falha fechada).
- [fase 2] Formato da oferta Lomadee é presumido (id, name, price, link, category.name, store.id). Na vinculação: gravar uma resposta real, substituir os fixtures sintéticos e ajustar `parseOferta`. Nomes de categoria em `fontes.lomadee.mapaCategorias` também são presumidos.
- [fase 2] Coletor ainda não roda agendado nem no compose; hoje é comando manual. Entra com a vinculação real (agendamento a cada 2 h).
- [fase 2] Protetor em R$/l mostra valores altos (R$ 1.598,00/l); a notificação (fase 4) deve mostrar preço da embalagem e usar preço por unidade só na comparação. A API da fase 3 já entrega os preços por embalagem.
- [fase 3] Provedor de e-mail do código de login não escolhido (orçamento zero: precisa de camada gratuita). Sem ele a API não sobe em produção: `EMAIL_MODO=log` é recusado. Decisão do responsável.
- [fase 3] Texto dos termos de uso e da política de privacidade não existe: `app.termos.url` é null e a versão é "rascunho". Obrigatório antes de publicar.
- [fase 3] Login com Google desligado até criar o projeto no Google Cloud e preencher `app.auth.googleClientIds`.
- [fase 3] Loja física sem faixa de CEP não entra no feed: raio de entrega e retirada dependem da coordenada do CEP (P3, fase 5).
- [fase 3] Sessões expiradas ou revogadas não são apagadas; códigos vencidos só saem quando alguém pede código. Limpeza entra com o agendador (fase 4).
- [fase 3] Exclusão de conta apaga a assinatura local, mas a assinatura do Google Play continua cobrando. Fase 6: avisar o usuário ou cancelar pela API do Play antes de excluir.
- [fase 3] Feed marca `medicamento: true`; as advertências da RDC 96/2008 na tela ficam junto com a validação jurídica do item de medicamento acima.
- [fase 3] Este ambiente de nuvem não tem Docker: os critérios das fases 1–3 foram verificados com Postgres 16 e Redis locais. `docker compose up` com a API nova (NODE_ENV, AUTH_CODIGO_CHAVE, config no Dockerfile) não foi exercitado; rodar `./scripts/pronto-fase0.sh` numa máquina com Docker.
