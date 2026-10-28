#!/usr/bin/env bash
# Baixa a lista de preços PMC mais recente da CMED (Anvisa) e converte para o arquivo de listas de medicamentos
# do normalizador. Rode a cada publicação nova (a CMED atualiza várias vezes por ano).
#   ./scripts/atualizar-listas-medicamentos.sh
# Saída: backend/data/listas/cmed-AAAA-MM-DD.json e backend/data/listas/atual.json (cópia da mais nova).
# Os arquivos de backend/data/ não vão para o git (são dados públicos derivados e grandes).
set -euo pipefail
cd "$(dirname "$0")/.."

PAGINA="https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos"
DESTINO=backend/data
mkdir -p "$DESTINO/cmed" "$DESTINO/listas"

echo "--- procurando a lista PMC mais recente em $PAGINA"
caminho=$(curl -sS --fail -m 60 "$PAGINA" | grep -o 'href="[^"]*lista_pmc_[^"]*\.xlsx[^"]*"' | head -1 | sed -E 's/^href="//; s/"$//')
if [ -z "$caminho" ]; then echo "Não achei o link da lista PMC na página da CMED (a página pode ter mudado)." >&2; exit 1; fi
case "$caminho" in http*) url="$caminho" ;; *) url="https://www.gov.br$caminho" ;; esac
nome=$(basename "${url%%/@@download*}")
xlsx="$DESTINO/cmed/$nome"

echo "--- baixando $nome"
curl -sS --fail -m 300 -L -o "$xlsx" "$url"

echo "--- convertendo"
(cd backend && npm run build >/dev/null)
tmp_json="$DESTINO/listas/.convertendo.json"
node backend/dist/normalizador/converterCmed.js --cmed "$xlsx" --saida "$tmp_json" | tee "$DESTINO/listas/.ultimo-relatorio.json"
versao=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$tmp_json','utf8')).versao)")
mv "$tmp_json" "$DESTINO/listas/$versao.json"
cp "$DESTINO/listas/$versao.json" "$DESTINO/listas/atual.json"
echo "OK: $DESTINO/listas/$versao.json (e atual.json)"
