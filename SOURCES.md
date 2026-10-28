# Fontes de oferta e base legal

Nenhuma fonte ativa ainda. Toda fonte nova recebe aqui: tipo (A–E), responsável, termos de uso lidos
(link e data), robots.txt (quando TIPO C), frequência, User-Agent, confiabilidade do dado e base legal.
Fonte cujo termo proíbe a coleta não entra.

| Fonte | Tipo | Termos lidos em | Base legal | Frequência | Confiabilidade | Status |
|-------|------|-----------------|------------|------------|----------------|--------|
| Lomadee (API de afiliados, docs.lomadee.com.br) | A | **pendente** (ler antes de ativar) | Programa de afiliados Lomadee; lojas: Drogasil, Droga Raia (a confirmar aprovação) | 120 min | alta | conta e chave de API obtidas pelo responsável (2026-10-28), guardadas fora do repositório; adaptador conferido contra respostas reais (`api.lomadee.com.br`, produtos com `ean`, preço em reais); coleta real feita uma vez em banco de teste (1.739 produtos); marcas disponíveis: Drogasmil/Drogaria Rosário, PromoFarma (Drogasil e Droga Raia **não** constam); link rastreado de afiliado ainda não ligado; termos **lidos em 2026-10-28** (PDF do painel; resumo e perguntas em `docs/juridico/lomadee-termos.md`, DECISIONS 67): permitem app como canal, mas exigem link rastreado, proíbem vantagem por clique, têm exclusividade com as marcas e cancelamento sem motivo, e **não tratam de guardar preços, da API nem de farmácia**; resposta por escrito da Lomadee pendente |

## Como entra um canal novo
Passo a passo técnico em [docs/operacao/fontes.md](docs/operacao/fontes.md). Antes de ativar qualquer fonte:
termos de uso lidos (link e data nesta tabela), base legal, frequência, confiabilidade e, se houver, o que a
fonte permite fazer com link de afiliado em compartilhamento (D14). Fonte cujo termo proíbe a coleta não entra.

