# Backlog

Problemas encontrados fora do escopo da fase em andamento. Não são consertados na fase em que aparecem.

- [fase 0] A migration 0001 insere o tenant de desenvolvimento (renomeado para `economae` na 0005). Antes de produção, decidir se o seed sai das migrations para um script de provisionamento de tenant.
- [fase 0] Rotina de retenção de `price_history` (apagar só o que tiver mais de 180 dias) ainda não existe. Entra junto com o coletor (fase 2).
- [fase 0] Tabela de dispositivos/tokens FCM não existe. Entra na fase 4 (push).
- [fase 1] Resolução de CEP → coordenada (centróide) para a cobertura por distância: precisa de uma base de CEPs; decidir a fonte na fase 2 ou 3.
- [fase 2] Conflito na especificação: fonte TIPO E (manual) deveria "fechar buraco de cobertura", mas sem 14 observações o motor descarta. Decisão do responsável pendente.
- [fase 2] RDC 96/2008 exige advertências na divulgação de preço de medicamento isento. Hoje medicamento não entra no app (decisão 45); só volta a importar se um tenant ligar `medicamentos.exibir`.
- [fase 4/6] Google Play Console cobra taxa única de registro de desenvolvedor: é o único custo inevitável para publicar.
- [fase 2] Carregador das listas reais (CMED, Portaria 344) depende de baixar os arquivos; este ambiente bloqueia gov.br. Sem as listas o normalizador não sobe (falha fechada).
- [fase 2] Formato da oferta Lomadee é presumido (id, name, price, link, category.name, store.id). Na vinculação: gravar uma resposta real, substituir os fixtures sintéticos e ajustar `parseOferta`. Nomes de categoria em `fontes.lomadee.mapaCategorias` também são presumidos.
- [fase 2] Coletor ainda não roda agendado nem no compose; hoje é comando manual. Entra com a vinculação real (agendamento a cada 2 h).
- [fase 2] Protetor em R$/l mostra valores altos (R$ 1.598,00/l); a notificação (fase 4) deve mostrar preço da embalagem e usar preço por unidade só na comparação. A API da fase 3 já entrega os preços por embalagem.
- [fase 3] Brevo escolhido (decisão 54) e integrado. Falta criar a conta, autenticar o domínio ou o remetente e gerar a chave: passo a passo em `docs/operacao/google-cloud.md`. O envio real ainda não foi testado contra a API do Brevo (este ambiente não tem chave).
- [fase 3] Texto dos termos de uso e da política de privacidade em revisão pela assessoria (2026-09-28); até publicar, `app.documentos.*.url` é null e a versão é "rascunho". Obrigatório antes de publicar. O que os textos precisam cobrir está em `docs/juridico/termos-e-privacidade.md`.
- [fase 3] Login com Google desligado até criar o projeto no Google Cloud e preencher `app.auth.googleClientIds` (passo a passo em `docs/operacao/google-cloud.md`, seção 3). Com a cota de e-mail em 280/dia, o login com Google é o que segura o crescimento.
- [fase 3] Loja física sem faixa de CEP não entra no feed: raio de entrega e retirada dependem da coordenada do CEP (P3, fase 5).
- [fase 3] Sessões expiradas ou revogadas não são apagadas; códigos vencidos só saem quando alguém pede código. Limpeza entra com o agendador (fase 4).
- [fase 3] Exclusão de conta apaga a assinatura local, mas a assinatura do Google Play continua cobrando. Fase 6: avisar o usuário ou cancelar pela API do Play antes de excluir.
- [fase 3] Este ambiente de nuvem não tem Docker: os critérios das fases 1–3 foram verificados com Postgres 16 e Redis locais. `docker compose up` com a API nova (NODE_ENV, AUTH_CODIGO_CHAVE, config no Dockerfile) não foi exercitado; rodar `./scripts/pronto-fase0.sh` numa máquina com Docker.
- [revisão 3] Tamanho da fralda (decisão 51) sai só do título; título sem tamanho ou com dois tamanhos vira "não identificado" e aparece para todas. Medir a taxa de não identificados com a resposta real da Lomadee. A assessoria confirmou que o tamanho escolhido não é dado da criança.
- [revisão 3] **Fase do bebê** (gestação, 0–6 meses, 6–12 meses, 1–3 anos) como filtro: se entrar, só por faixa escolhida pela mãe, opcional e com consentimento destacado; nunca por data de nascimento ou data provável do parto (dado de criança e de saúde).
- [revisão 3] A categoria "Gestação e pós-parto" nas preferências permite inferir gravidez (dado sensível por inferência). Tratar no texto da política e no consentimento; nunca usar para publicidade nem compartilhar.
- [revisão 3] Logs: o Marco Civil (Lei 12.965/2014, art. 15) exige guardar registros de acesso (IP, data e hora) por 6 meses, em sigilo; hoje o log da API vai para stdout sem retenção. O log também não pode guardar e-mail, código, token nem a URL do feed com `categoria` (inferência de gravidez).
- [revisão 3] NBCAL validada pela assessoria (2026-09-28) como está implementada. A lista `nbcal.termosVedados` (com marcas de fórmula) precisa de manutenção: marca ou linha nova de fórmula infantil entra na lista.
- [revisão 3] Lomadee: os nomes de categoria do novo mapa (Fraldas, Lenços Umedecidos, Higiene do Bebê, Proteção Solar Infantil, Alimentação Infantil, Gestantes, Amamentação) são presumidos; confirmar na vinculação. Drogasil e Raia cobrem fraldas, higiene e gestação; enxoval, roupas, carrinho e cadeirinha dependem de outra fonte (Mercado Livre, decisão 26).
- [revisão 3] O limiar de queda de 25% vale igual para as quatro categorias; fralda raramente cai 25%. Calibrar com histórico real antes do lançamento.
- [revisão 3] Premium = mais CEPs é uma proposta fraca para esse público (a mãe costuma ter um endereço). Rever o que o premium oferece antes da fase 6.
- [revisão 3] Google Play: público-alvo 18+ (fora da política Famílias); formulário Data safety (e-mail, localização aproximada pelo CEP, interações no app); página web para pedir exclusão de conta; URL pública da política de privacidade.
- [revisão 3] Contrato: não há rota para registrar o aparelho no push (fase 4). Entra como acréscimo na v1 (decisão 49), sem quebrar o app.
- [fase 3] Domínio próprio (cerca de R$ 40/ano) recomendado para a entregabilidade do e-mail, o endereço dos termos e a tela de consentimento do Google. É o segundo custo inevitável, junto com a taxa do Google Play. Decisão do responsável.
- [fase 3] Hospedagem no Google Cloud: proposta de VM `e2-micro` do nível sempre gratuito em `docs/operacao/google-cloud.md` (seção 4). Aguarda confirmação do responsável; exige conta de faturamento e põe os dados nos EUA.
