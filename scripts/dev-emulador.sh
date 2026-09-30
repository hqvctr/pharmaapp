#!/usr/bin/env bash
# Backend local com dados de exemplo para testar o app no emulador (ou aparelho) do Android Studio.
#   ./scripts/dev-emulador.sh             recria o banco dev_emulador, roda o pipeline e sobe a API
#   ./scripts/dev-emulador.sh despachar   manda os pushes pendentes (FCM_MODO do .env: log ou fcm)
# Lojas e ofertas são fictícias (as mesmas do critério de pronto). O banco dev_emulador é apagado a
# cada subida; o banco do compose não é tocado.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Falta .env. Copie .env.example para .env e defina POSTGRES_PASSWORD e AUTH_CODIGO_CHAVE." >&2
  exit 1
fi
set -a; . ./.env; set +a

DB=dev_emulador
PORTA=${API_PORT:-3000}
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/$DB"
export REDIS_URL="redis://127.0.0.1:${REDIS_PORT:-6379}"
export NODE_ENV=development

if [ "${1:-}" = despachar ]; then
  export FCM_MODO=${FCM_MODO:-log}
  if [ "$FCM_MODO" = fcm ] && [ ! -f "${FCM_CONTA_SERVICO:-}" ]; then
    echo "FCM_MODO=fcm precisa de FCM_CONTA_SERVICO apontando para o JSON da conta de serviço (fora do repositório)." >&2
    exit 1
  fi
  (cd backend && npm run build >/dev/null)
  exec node backend/dist/push/despachar.js --tenant economae
fi

: "${AUTH_CODIGO_CHAVE:?defina AUTH_CODIGO_CHAVE no .env}"
if curl -fsS "http://127.0.0.1:$PORTA/health" >/dev/null 2>&1; then
  echo "Já tem algo respondendo na porta $PORTA (a API do compose?). Pare antes: docker compose stop api" >&2
  exit 1
fi

docker compose up -d --wait postgres redis
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$DB"
(cd backend && npm run build >/dev/null)
node backend/dist/db/migrate.js
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$DB" -v ON_ERROR_STOP=1 -q < scripts/fase2/seed.sql

GRAV=backend/fixtures/lomadee
LISTAS=backend/fixtures/medicamentos/listas_teste.json
instante() { node -e "console.log(new Date(Date.now() - 36e5 - $1 * 864e5).toISOString())"; }
coletar() { node backend/dist/pipeline/coletar.js --tenant economae --fonte lomadee --listas-medicamentos "$LISTAS" --gravacoes "$1" --agora "$2"; }
echo "--- pipeline: 20 dias de histórico e o dia da promoção"
for d in $(seq 20 -1 8); do coletar "$GRAV/base" "$(instante "$d")" > /dev/null 2>&1; done
for d in $(seq 7 -1 1); do coletar "$GRAV/inflado" "$(instante "$d")" > /dev/null 2>&1; done
coletar "$GRAV/promocao" "$(instante 0)" > /dev/null 2>&1

cat <<EOF
--- API em http://127.0.0.1:$PORTA (no emulador: http://10.0.2.2:$PORTA)
No app: CEP 14010000 e a categoria "Higiene e cuidados do bebê" (é a que tem alerta de push).
Login por código: o código aparece aqui no log, em "codigo=". Ctrl+C para parar.
Para o push: entre no app, ligue os alertas e, em outro terminal, rode nas próximas 12 h:
  ./scripts/dev-emulador.sh despachar
EOF
EMAIL_MODO=log exec node backend/dist/api/server.js
