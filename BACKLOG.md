# Backlog

Problemas encontrados fora do escopo da fase em andamento. Não são consertados na fase em que aparecem.

- [fase 0] A migration 0001 insere o tenant `padrao` para desenvolvimento. Antes de produção, decidir se o seed sai da migration para um script de provisionamento de tenant.
- [fase 0] Rotina de retenção de `price_history` (apagar só o que tiver mais de 180 dias) ainda não existe. Entra junto com o coletor (fase 2).
- [fase 0] Tabela de dispositivos/tokens FCM não existe. Entra na fase 4 (push).
- [fase 0] Método de login por e-mail (link mágico ou código) não decidido. Decidir na fase 3.
- [fase 1] O Dockerfile ainda não copia `config/tenants/`. Precisa entrar quando o avaliador rodar em contêiner (fase 2).
- [fase 1] Bloqueio por lista de medicamentos de venda controlada: fica no normalizador (fase 2), antes de a oferta chegar ao motor.
- [fase 1] Deduplicação de alerta (mesma oferta observada em coletas seguidas não pode gerar alerta novo): fica no avaliador (fase 2).
- [fase 1] Resolução de CEP → coordenada (centróide) para a cobertura por distância: precisa de uma base de CEPs; decidir a fonte na fase 2 ou 3.
