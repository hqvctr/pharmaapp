# ux/ — proposta de interface do economae

Trabalho de UX em cinco fases, na ordem em que foram feitas. Cada arquivo cita a evidência de cada
decisão (código do repositório ou fonte externa com data de acesso).

| # | Entregável | Arquivo | Fase |
|---|---|---|---|
| 1 | Retrato do produto, pesquisa externa e três perfis | [DOSSIE_UX.md](DOSSIE_UX.md) | 1, 2, 3 |
| 2 | Suposições, com evidência, confiança e como validar | [SUPOSICOES.md](SUPOSICOES.md) | todas |
| 3 | Auditoria heurística e de acessibilidade, priorizada | [AUDITORIA.md](AUDITORIA.md) | 4 |
| 4 | Proposta: arquitetura, fluxos, componentes, estados, justificativas | [PROPOSTA_UX.md](PROPOSTA_UX.md) | 5 |
| 5 | Tokens (claro e escuro) + tema do app + contraste verificado | [design-tokens/](design-tokens/README.md) | 5 |
| 6 | Protótipo navegável, arquivo único, abre no navegador (versão 2, alinhada às fases 3 e 4) | [prototipo.html](prototipo.html) | 5 |
| 7 | Telas implementadas no app real (`br.com.economae`): cartão, detalhe, prova e notificação da proposta | [../android/](../android/app/src/main/java/br/com/economae/ui/prova/Prova.kt) | 5 |
| 8 | Todo texto de interface | [UX_COPY.md](UX_COPY.md) | 5 |
| 9 | Métricas, metas e o que testar primeiro | [MEDICAO.md](MEDICAO.md) | 5 |
| 10 | O que ficou de fora e por quê | [BACKLOG_UX.md](BACKLOG_UX.md) | 5 |

Apoio: `pesquisa/` (scripts e resumo da coleta de avaliações da Google Play) e `ferramentas/`
(verificação automática do protótipo).

## Verificar

```bash
node ux/design-tokens/gerar.mjs                      # regenera CSS/Kotlin e falha se o contraste cair
(cd android && ./gradlew :app:testDebugUnitTest)     # testes JVM do app, com a notificação
npm i playwright@1 && node ux/ferramentas/verificar-prototipo.mjs   # 57 estados × 2 fontes × 2 temas
```

Todos os dados do protótipo e das telas são **fictícios** (marcas, lojas e preços de exemplo).
