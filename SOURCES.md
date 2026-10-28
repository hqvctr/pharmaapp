# Fontes de oferta e base legal

Nenhuma fonte ativa ainda. Toda fonte nova recebe aqui: tipo (A–E), responsável, termos de uso lidos
(link e data), robots.txt (quando TIPO C), frequência, User-Agent, confiabilidade do dado e base legal.
Fonte cujo termo proíbe a coleta não entra.

| Fonte | Tipo | Termos lidos em | Base legal | Frequência | Confiabilidade | Status |
|-------|------|-----------------|------------|------------|----------------|--------|
| Lomadee (API de afiliados, docs.lomadee.com.br) | A | **pendente** (ler antes de ativar) | Programa de afiliados Lomadee; lojas: Drogasil, Droga Raia (a confirmar aprovação) | 120 min | alta | conta e chave de API obtidas pelo responsável (2026-10-28), guardadas fora do repositório; adaptador conferido contra respostas reais (`api.lomadee.com.br`, produtos com `ean`, preço em reais); coleta real feita uma vez em banco de teste (1.739 produtos); marcas disponíveis: Drogasmil/Drogaria Rosário, PromoFarma (Drogasil e Droga Raia **não** constam); link rastreado de afiliado ainda não ligado; termos formais **não encontrados em página pública** (2026-10-28; busca na web, site, sitemap e documentação da API): o texto que vale está no cadastro/painel da Lomadee ou sai pelo contato (https://www.lomadee.com.br/pt-br/contato). Lido do que é público: limite de 60 pedidos/min por chave e IP (429 com Retry-After), cadastro grátis sem exigir CNPJ, comissão e prazo de rastreio (em geral 30 dias) definidos por marca, pagamento por Pix, programas de cada marca com aprovação própria |

## Como entra um canal novo
Passo a passo técnico em [docs/operacao/fontes.md](docs/operacao/fontes.md). Antes de ativar qualquer fonte:
termos de uso lidos (link e data nesta tabela), base legal, frequência, confiabilidade e, se houver, o que a
fonte permite fazer com link de afiliado em compartilhamento (D14). Fonte cujo termo proíbe a coleta não entra.

