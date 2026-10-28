#!/usr/bin/env bash
# Baixa a lista de preços PMC mais recente da CMED (Anvisa) e converte para o arquivo de listas de medicamentos
# do normalizador. O coletor em ciclo já faz isso sozinho toda semana; use este script para fazer na mão.
#   ./scripts/atualizar-listas-medicamentos.sh
# Saída: backend/data/listas/<versão>.json e backend/data/listas/atual.json (cópia da mais nova).
# Os arquivos de backend/data/ não vão para o git (são dados públicos derivados e grandes).
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && npm run build >/dev/null)
node backend/dist/normalizador/atualizarListas.js --dados backend/data
