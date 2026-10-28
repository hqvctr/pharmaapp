# Lista oficial de medicamentos (CMED)

O app precisa reconhecer remédio em qualquer produto de farmácia, mesmo que a loja o ponha numa categoria comum. Para isso
usa a lista de preços **PMC da CMED/Anvisa**, que traz o código de barras (EAN) de cada apresentação, a substância e a tarja.

## Funciona para qualquer farmácia
A lista identifica o remédio **pelo código de barras**, não pela loja. Drogasil, Droga Raia, Drogasmil, PromoFarma ou
qualquer outra: se a fonte de ofertas entregar o código de barras, a triagem funciona igual. O que falta para Drogasil e
Droga Raia é a **fonte de ofertas** delas (hoje não estão na conta da Lomadee), não a lista.

## Como atualizar (a CMED publica várias vezes por ano)
`./scripts/atualizar-listas-medicamentos.sh` baixa a lista mais recente da página da Anvisa e converte
(cerca de 10 s). Saída em `backend/data/listas/` (`cmed-AAAA-MM-DD.json` e `atual.json`); esses arquivos não vão para o git.
Usar na coleta: `--listas-medicamentos backend/data/listas/atual.json` (ou a variável `LISTAS_MEDICAMENTOS`).
Só a conversão: `node backend/dist/normalizador/converterCmed.js --cmed <lista_pmc.xlsx> --saida <arquivo.json>`.

## Regras da conversão (falha fechada)
- **Isento de prescrição = só "Tarja Sem Tarja".** "Tarja Vermelha", "Tarja Vermelha sob restrição", "Tarja Preta" e
  "- (*)" (sem informação de tarja; inclui remédios de receita) **não** são isentos.
- **Substância controlada** = substância de qualquer produto "Tarja Preta" ou "Tarja Vermelha sob restrição". Barra produto
  isento que contenha uma delas. A lista da Portaria SVS/MS 344/1998 em si não é lida; esta derivação vem da própria CMED.
- Código de barras repetido com tarjas diferentes: vale o mais restritivo. Tarja nova (desconhecida): não isento e aviso.
- Recusa gravar se a lista tiver menos de 10.000 linhas ou faltar coluna (formato mudou).
- Códigos de barras são comparados sempre com 14 dígitos (EAN-13 e GTIN-14 casam).

## Resultado com a lista de 09/10/2026
26.635 linhas → 27.731 códigos de barras (1.917 de remédio sem receita), 353 substâncias controladas.
Na coleta real da Drogasmil e PromoFarma (1.739 produtos): 71% dos itens de categoria "medicamento" casaram por código.

## O que a lista não resolve
- O código de barras da loja costuma ser de **outra embalagem** da mesma marca (ex.: Hipoglós 120 g) e não casa. Nesses
  casos a trava por nome (`medicamentos.triagemPorNome`, na config do tenant) é a segunda linha de defesa, mas é uma lista
  curada à mão, que cresce com a revisão humana da fila de triagem.
- Suplemento, vitamina e probiótico não estão na CMED (são alimento): categoria "medicamento" sem código na lista continua
  bloqueada por segurança (`MEDICAMENTO_SEM_REFERENCIA`).
