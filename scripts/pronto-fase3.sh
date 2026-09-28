#!/usr/bin/env bash
# Critério de pronto da Fase 3: a API sobe sobre o banco que o pipeline da fase 2 alimentou e o
# caminho do app (login, termos, preferências, feed, detalhe, logout, exclusão) passa por HTTP.
# Também roda a suíte inteira com os testes de integração da API ligados.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Falta .env. Copie .env.example para .env e defina POSTGRES_PASSWORD." >&2
  exit 1
fi
set -a; . ./.env; set +a

DB=pronto_fase3
DB_TESTE=pronto_fase3_teste
PORTA=${PRONTO_API_PORT:-3093}
docker compose up -d --wait postgres redis
for banco in "$DB" "$DB_TESTE"; do
  docker compose exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$banco"
  docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$banco"
done
psql_() { docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$DB" -v ON_ERROR_STOP=1 "$@"; }

(cd backend && npm run build >/dev/null)
URL_BASE="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}"
export DATABASE_URL="$URL_BASE/$DB"
export REDIS_URL="redis://127.0.0.1:${REDIS_PORT:-6379}"
node backend/dist/db/migrate.js
psql_ -q < scripts/fase2/seed.sql

GRAV=backend/fixtures/lomadee
LISTAS=backend/fixtures/medicamentos/listas_teste.json
# Relógio real: o feed só mostra oferta coletada nas últimas horas. Promoção 1 h atrás.
instante() { node -e "console.log(new Date(Date.now() - 36e5 - $1 * 864e5 + ${2:-0} * 6e4).toISOString())"; }
coletar() { node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --listas-medicamentos "$LISTAS" --gravacoes "$1" --agora "$2"; }

echo "--- pipeline: 20 dias de histórico e o dia da promoção"
for d in $(seq 20 -1 8); do coletar "$GRAV/base" "$(instante "$d")" > /dev/null 2>&1; done
for d in $(seq 7 -1 1); do coletar "$GRAV/inflado" "$(instante "$d")" > /dev/null 2>&1; done
coletar "$GRAV/promocao" "$(instante 0)" > /dev/null 2>&1

echo "--- API na porta $PORTA"
LOG=$(mktemp)
API_PORT=$PORTA AUTH_CODIGO_CHAVE="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" EMAIL_MODO=log \
  node backend/dist/api/server.js > "$LOG" 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true; rm -f "$LOG"' EXIT
for _ in $(seq 1 50); do curl -fsS "http://127.0.0.1:$PORTA/health" >/dev/null 2>&1 && break; sleep 0.2; done

falhou=0
node scripts/fase3/cenario.mjs "http://127.0.0.1:$PORTA" "$LOG" \
  node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --listas-medicamentos "$LISTAS" \
  --gravacoes "$GRAV/encerrada" --agora "$(instante 0 30)" || falhou=1

echo "--- contrato e npm test (com integração da API)"
(cd backend && TEST_DATABASE_URL="$URL_BASE/$DB_TESTE" npm test 2>&1 | tail -4) || falhou=1
[ "$falhou" = 0 ] || { echo "FASE 3: NÃO PRONTA"; exit 1; }
echo "FASE 3: PRONTA"
