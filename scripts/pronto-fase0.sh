#!/usr/bin/env bash
# Critério de pronto da Fase 0: docker compose sobe tudo, /health responde 200 e npm test passa.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Falta .env. Copie .env.example para .env e defina POSTGRES_PASSWORD." >&2
  exit 1
fi
set -a; . ./.env; set +a

docker compose up -d --build --wait
echo "--- /health"
curl -fsS "http://127.0.0.1:${API_PORT:-3000}/health"
echo
echo "--- migrations aplicadas"
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT name FROM schema_migrations ORDER BY name"
echo "--- npm test"
(cd backend && npm test)
echo "FASE 0: PRONTA"
