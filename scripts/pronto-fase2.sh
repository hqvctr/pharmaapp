#!/usr/bin/env bash
# Critério de pronto da Fase 2 (P6): coletor → normalizador → avaliador contra respostas gravadas
# da Lomadee, com 20 dias de histórico acumulado pelo próprio pipeline, num banco descartável.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Falta .env. Copie .env.example para .env e defina POSTGRES_PASSWORD." >&2
  exit 1
fi
set -a; . ./.env; set +a

DB=pronto_fase2
docker compose up -d --wait postgres
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" --if-exists "$DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$DB"
psql_() { docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$DB" -v ON_ERROR_STOP=1 "$@"; }

(cd backend && npm run build >/dev/null)
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}/${DB}"
# O runner de migration da fase 0 exige REDIS_URL, embora não use Redis.
REDIS_URL="redis://127.0.0.1:${REDIS_PORT:-6379}" node backend/dist/db/migrate.js
psql_ -q < scripts/fase2/seed.sql

GRAV=backend/fixtures/lomadee
LISTAS=backend/fixtures/medicamentos/listas_teste.json
# Dia da promoção: 2026-09-01 às 10:00 em São Paulo (13:00 UTC).
instante() { node -e "console.log(new Date(Date.parse('2026-09-01T13:00:00Z') - $1 * 864e5 + ${2:-0} * 36e5).toISOString())"; }
coletar() { node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --listas-medicamentos "$LISTAS" --gravacoes "$1" --agora "$2"; }

echo "--- histórico: 13 dias de preço normal, 7 dias com o shampoo inflado"
for d in $(seq 20 -1 8); do coletar "$GRAV/base" "$(instante "$d")" > /dev/null 2>&1; done
for d in $(seq 7 -1 1); do coletar "$GRAV/inflado" "$(instante "$d")" > /dev/null 2>&1; done

echo "--- dia da promoção, 1ª coleta"
coletar "$GRAV/promocao" "$(instante 0)"
ALERTAS_1=$(psql_ -Atc "SELECT count(*) FROM alerts")
echo "--- dia da promoção, 2ª coleta (2 h depois, mesmos preços)"
coletar "$GRAV/promocao" "$(instante 0 2)"
ALERTAS_2=$(psql_ -Atc "SELECT count(*) FROM alerts")

echo "--- alertas"
psql_ -c "SELECT st.nome AS loja, a.decisao, a.score, left(a.motivo, 90) AS motivo
            FROM alerts a JOIN stores st ON st.tenant_id = a.tenant_id AND st.id = a.store_id ORDER BY st.nome"
echo "--- ofertas avaliadas"
psql_ -c "SELECT p.nome, o.ultima_decisao, left(o.ultimo_motivo, 80) AS motivo
            FROM offers o JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id ORDER BY p.nome, o.id_externo"
echo "--- triagem de medicamento"
psql_ -c "SELECT titulo, codigo, revisao_humana FROM triagem_bloqueios ORDER BY titulo"

falhou=0
confere() { # descrição, consulta, esperado
  local obtido; obtido=$(psql_ -Atc "$2")
  if [ "$obtido" = "$3" ]; then echo "OK    $1"; else echo "FALHA $1 (esperado $3, obtido $obtido)"; falhou=1; fi
}
confere "1 alerta notificar (loja aprovada)" \
  "SELECT count(*) FROM alerts WHERE decisao = 'notificar'" 1
confere "loja em observação: alerta só de feed" \
  "SELECT count(*) FROM alerts a JOIN stores s ON s.id = a.store_id WHERE a.decisao = 'somente_feed' AND s.status = 'em_observacao'" 1
confere "desconto de mentira descartado por subida pré-queda" \
  "SELECT count(*) FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome LIKE 'Shampoo%' AND o.ultima_decisao = 'descartar' AND o.ultimo_motivo LIKE '%SUBIDA_PRE_QUEDA%'" 1
confere "queda pequena descartada" \
  "SELECT count(*) FROM offers o JOIN products p ON p.id = o.product_id WHERE p.nome LIKE 'Fralda%' AND o.ultimo_motivo LIKE '%QUEDA_ABAIXO_DO_LIMIAR%'" 1
confere "medicamentos bloqueados (sem referência e tarja preta)" \
  "SELECT string_agg(codigo, ',' ORDER BY codigo) FROM triagem_bloqueios WHERE codigo NOT LIKE 'NBCAL%'" "MEDICAMENTO_SEM_REFERENCIA,TERMO_DE_VENDA_CONTROLADA"
confere "NBCAL: mamadeira e fórmula infantil bloqueadas" \
  "SELECT string_agg(id_externo, ',' ORDER BY id_externo) FROM triagem_bloqueios WHERE codigo = 'NBCAL_PROMOCAO_VEDADA'" "A-800,A-900"
confere "nenhum medicamento nem item da NBCAL virou produto" \
  "SELECT count(*) FROM products WHERE categoria = 'medicamentos' OR nome ~* 'mamadeira|f.rmula infantil'" 0
confere "categoria fora do escopo ignorada" \
  "SELECT count(*) FROM products WHERE nome LIKE 'Fone%'" 0
confere "histórico: 21 dias do protetor na loja A (P1)" \
  "SELECT count(*) FROM price_history ph JOIN offers o ON o.product_id = ph.product_id AND o.store_id = ph.store_id WHERE o.id_externo = 'A-100'" 21
confere "2ª coleta não duplicou alerta" "SELECT $ALERTAS_2 - $ALERTAS_1" 0

echo "--- npm test"
(cd backend && npm test 2>&1 | tail -4)
[ "$falhou" = 0 ] || { echo "FASE 2: NÃO PRONTA"; exit 1; }
echo "FASE 2: PRONTA"
