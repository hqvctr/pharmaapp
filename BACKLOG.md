# Backlog

Problemas encontrados fora do escopo da fase em andamento. Não são consertados na fase em que aparecem.

- [fase 0] A migration 0001 insere o tenant `padrao` para desenvolvimento. Antes de produção, decidir se o seed sai da migration para um script de provisionamento de tenant.
- [fase 0] Rotina de retenção de `price_history` (apagar só o que tiver mais de 180 dias) ainda não existe. Entra junto com o coletor (fase 2).
- [fase 0] Tabela de dispositivos/tokens FCM não existe. Entra na fase 4 (push).
- [fase 0] Método de login por e-mail (link mágico ou código) não decidido. Decidir na fase 3.
- [fase 1] O Dockerfile ainda não copia `config/tenants/`. Precisa entrar quando o avaliador rodar em contêiner (fase 2).
- [fase 1] Resolução de CEP → coordenada (centróide) para a cobertura por distância: precisa de uma base de CEPs; decidir a fonte na fase 2 ou 3.
- [fase 2] Conflito na especificação: fonte TIPO E (manual) deveria "fechar buraco de cobertura", mas sem 14 observações o motor descarta. Decisão do responsável pendente.
- [fase 2] RDC 96/2008 exige advertências na divulgação de preço de medicamento isento. Validar com assessoria jurídica antes de liberar push de medicamento; conflita com "nenhuma orientação de uso". Prompt de consulta pronto em `docs/juridico/PROMPT_RDC96.md` (resposta volta como documento Markdown para colar no repositório).
- [fase 4/6] Google Play Console cobra taxa única de registro de desenvolvedor: é o único custo inevitável para publicar.
- [fase 2] Carregador das listas reais (CMED, Portaria 344) depende de baixar os arquivos; este ambiente bloqueia gov.br. Sem as listas o normalizador não sobe (falha fechada).
- [fase 2] Formato da oferta Lomadee é presumido (id, name, price, link, category.name, store.id). Na vinculação: gravar uma resposta real, substituir os fixtures sintéticos e ajustar `parseOferta`. Nomes de categoria em `fontes.lomadee.mapaCategorias` também são presumidos.
- [fase 2] Oferta que some da coleta seguinte não é marcada como indisponível; o feed (fase 3) precisa disso para não mostrar oferta encerrada.
- [fase 2] Coletor ainda não roda agendado nem no compose; hoje é comando manual. Entra com a vinculação real (agendamento a cada 2 h).
- [fase 2] Protetor em R$/l mostra valores altos (R$ 1.598,00/l); a notificação (fase 4) deve mostrar preço da embalagem e usar preço por unidade só na comparação.
- [fase 3] Trazido das outras branches (2026-10-27), sem decisão ainda: listas de presente (chá de bebê, casa nova, chá de panela, casamento; convidado compra pelo link de afiliado e marca "Já comprei"; precisa de página web do convidado); regras de anúncio da linha paralela (1 a cada 8 cartões, nunca em notificação nem detalhe, nunca de fórmula, mamadeira, bico, chupeta ou remédio; rede ainda não escolhida); filtro por tamanho de fralda (assessoria: não é dado da criança); frete por faixa de CEP; nome curto do produto; propostas do push 69–72 e identificador `br.com.economae` (62) sem confirmação.
- [fase 3] Operacional, com o responsável: domínio próprio (~R$ 40/ano, melhora o e-mail, hoje de remetente Gmail); hospedagem (depósito de R$ 150 no Google Cloud ou computador próprio com Cloudflare Tunnel); chave de API "Browser" do Firebase sem restrição; chave da conta de serviço do FCM sem validade e política `iam.disableServiceAccountKeyCreation` desligada (religar); login Google ainda "Em teste"; termos e política em revisão da assessoria; Brevo mede abertura de e-mail (citar na política).
- [fase 6] Google Play: público 18+, formulário Data safety, página web para excluir conta, URL pública da política, SHA-1 da chave de release no Firebase e cliente OAuth de release; logs de acesso 6 meses (Marco Civil, art. 15) sem e-mail, código nem token.
- [fase 3] Calibrar com dado real: limiar de queda de 25% (fralda raramente cai tanto) e nomes de categoria da Lomadee (presumidos).

