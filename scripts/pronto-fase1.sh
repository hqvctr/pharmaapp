#!/usr/bin/env bash
# Critério de pronto da Fase 1: motor de curadoria puro passa em todos os fixtures,
# incluindo os seis casos obrigatórios (a própria suíte falha se algum estiver ausente).
set -euo pipefail
cd "$(dirname "$0")/../backend"
npm run typecheck
npx vitest run src/curadoria
echo "FASE 1: PRONTA"
