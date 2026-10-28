# Fontes de oferta e base legal

Nenhuma fonte ativa ainda. Toda fonte nova recebe aqui: tipo (A–E), responsável, termos de uso lidos
(link e data), robots.txt (quando TIPO C), frequência, User-Agent, confiabilidade do dado e base legal.
Fonte cujo termo proíbe a coleta não entra.

| Fonte | Tipo | Termos lidos em | Base legal | Frequência | Confiabilidade | Status |
|-------|------|-----------------|------------|------------|----------------|--------|
| Lomadee (API de afiliados, docs.lomadee.com.br) | A | **pendente** (ler antes de ativar) | Programa de afiliados Lomadee; lojas: Drogasil, Droga Raia (a confirmar aprovação) | 120 min | alta | conta e chave de API obtidas pelo responsável (2026-10-28), guardadas fora do repositório; adaptador reescrito para a API atual (`api.lomadee.com.br`, produtos com `ean`, preço em centavos); nunca chamou a API real; só respostas gravadas sintéticas; link rastreado de afiliado ainda não ligado |

## Como entra um canal novo
Passo a passo técnico em [docs/operacao/fontes.md](docs/operacao/fontes.md). Antes de ativar qualquer fonte:
termos de uso lidos (link e data nesta tabela), base legal, frequência, confiabilidade e, se houver, o que a
fonte permite fazer com link de afiliado em compartilhamento (D14). Fonte cujo termo proíbe a coleta não entra.

