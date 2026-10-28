#!/usr/bin/env bash
# Critério de pronto da Fase 3 (parte 1: banco e contrato). Confere, num banco descartável:
#  1. as migrations 0001 a 0003 aplicam pelo runner do projeto;
#  2. o esquema do núcleo: cascata da exclusão de conta, isolamento entre tenants, restrições (scripts/fase3/esquema.sql);
#  3. a migration 0003 sobre dados que já existiam (alertas da fase 2 ganham a situação de revisão certa);
#  4. provisão de fontes/lojas, status e coletor em ciclo (instalação no computador do operador);
#  5. o contrato OpenAPI (app e operador) passa no lint;
#  6. a suíte do backend.
# As rotas e o app entram nas próximas partes da fase e ampliam este script.
#
# Banco: docker compose, como nas fases anteriores. Sem Docker, aponte para um Postgres 16 já rodando:
#   PRONTO_PG_URL=postgres://usuario@127.0.0.1:5432 ./scripts/pronto-fase3.sh   (o usuário precisa criar bancos e extensões)
set -euo pipefail
cd "$(dirname "$0")/.."

DB=pronto_fase3
DB_LEGADO=pronto_fase3_legado

if [ -n "${PRONTO_PG_URL:-}" ]; then
  psql_()   { psql "${PRONTO_PG_URL}/$1" -v ON_ERROR_STOP=1 "${@:2}"; }
  recria()  { psql "${PRONTO_PG_URL}/postgres" -qc "DROP DATABASE IF EXISTS $1" -c "CREATE DATABASE $1"; }
  URL_BASE="$PRONTO_PG_URL"
else
  if [ ! -f .env ]; then echo "Falta .env. Copie .env.example para .env e defina POSTGRES_PASSWORD (ou use PRONTO_PG_URL)." >&2; exit 1; fi
  set -a; . ./.env; set +a
  docker compose up -d --wait postgres
  psql_()   { docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 "${@:2}"; }
  recria()  { docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -qc "DROP DATABASE IF EXISTS $1" -c "CREATE DATABASE $1"; }
  URL_BASE="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5432}"
fi
falhou=0
passo() { echo; echo "--- $1"; }

passo "1. migrations 0001 a 0003 pelo runner"
recria "$DB"
(cd backend && npm run build >/dev/null)
# O runner da fase 0 exige REDIS_URL, embora não use Redis.
DATABASE_URL="$URL_BASE/$DB" REDIS_URL="redis://127.0.0.1:6379" node backend/dist/db/migrate.js
psql_ "$DB" -Atc "SELECT string_agg(name, ', ' ORDER BY name) FROM schema_migrations"

passo "2. esquema do núcleo (esquema.sql)"
if saida=$(psql_ "$DB" -q -f - < scripts/fase3/esquema.sql 2>&1); then
  echo "$saida" | grep -E "OK  " | sed -E 's/^psql:<stdin>:[0-9]+: NOTICE:  //'
  echo "OK    esquema.sql"
else
  echo "$saida" | grep -E "FALHA|ERROR" | head -5; echo "FALHA esquema.sql"; falhou=1
fi

passo "3. migration 0003 sobre dados da fase 2"
recria "$DB_LEGADO"
psql_ "$DB_LEGADO" -q -f - < backend/migrations/0001_schema_inicial.sql >/dev/null
psql_ "$DB_LEGADO" -q -f - < backend/migrations/0002_pipeline_fase2.sql >/dev/null
psql_ "$DB_LEGADO" -q -f - < scripts/fase3/legado.sql >/dev/null
psql_ "$DB_LEGADO" -q -1 -f - < backend/migrations/0003_api_nucleo.sql >/dev/null
confere() { # descrição, consulta, esperado
  local obtido; obtido=$(psql_ "$DB_LEGADO" -Atc "$2")
  if [ "$obtido" = "$3" ]; then echo "OK    $1"; else echo "FALHA $1 (esperado $3, obtido $obtido)"; falhou=1; fi
}
confere "alerta notificar fica sem revisão exigida" \
  "SELECT revisao_situacao FROM alerts WHERE id = '00000000-0000-0000-0000-000000000201'" "nao_exigida"
confere "alerta já aprovado vira aprovado, com a data antiga" \
  "SELECT revisao_situacao || ' ' || (revisao_em = aprovado_em) FROM alerts WHERE id = '00000000-0000-0000-0000-000000000202'" "aprovado true"
confere "alerta aguardando aprovação vira pendente" \
  "SELECT revisao_situacao FROM alerts WHERE id = '00000000-0000-0000-0000-000000000203'" "pendente"
confere "produto antigo ganha advertências vazias" \
  "SELECT cardinality(advertencias) FROM products" 0

passo "3b. fontes: credenciais cifradas e coleta de várias fontes"
export DATABASE_URL="$URL_BASE/$DB" REDIS_URL="redis://127.0.0.1:6379"
LISTAS=backend/fixtures/medicamentos/listas_teste.json
SEGREDO="SEGREDO-DE-TESTE-$$"
CHAVE_A=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
CHAVE_B=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
psql_ "$DB" -q -c "INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, confiabilidade, base_legal, ativa)
                   SELECT id, f.nome, 'A', 120, 'SP', 'alta', 'teste', true FROM tenants, (VALUES ('lomadee'), ('sem-config')) AS f(nome) WHERE slug = 'padrao'"
confere_saida() { # descrição, comando, texto que NÃO pode aparecer na saída
  local saida; saida=$(eval "$2" 2>&1) || true
  if echo "$saida" | grep -q "$3"; then echo "FALHA $1 (o segredo apareceu na saída)"; falhou=1; else echo "OK    $1"; fi
}
if CREDENTIALS_KEY="$CHAVE_A" FONTE_LOMADEE_APIKEY="$SEGREDO" \
   node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente | grep -q '"gravados":\["apiKey"\]'; then
  echo "OK    credencial gravada a partir do ambiente"
else echo "FALHA gravar credencial"; falhou=1; fi
confere_saida "a gravação não imprime o segredo" \
  "CREDENTIALS_KEY='$CHAVE_A' FONTE_LOMADEE_APIKEY='$SEGREDO' node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente" "$SEGREDO"
obtido=$(psql_ "$DB" -Atc "SELECT position(convert_to('$SEGREDO','UTF8') in texto_cifrado) FROM source_credentials")
if [ "$obtido" = "0" ]; then echo "OK    o segredo não está em claro no banco"; else echo "FALHA segredo em claro no banco ($obtido)"; falhou=1; fi
if CREDENTIALS_KEY="$CHAVE_A" node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --verificar | grep -q '"campos":\["apiKey"\]'; then
  echo "OK    --verificar decifra e mostra só os nomes dos campos"
else echo "FALHA verificar credencial"; falhou=1; fi
if CREDENTIALS_KEY="$CHAVE_B" node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --verificar >/dev/null 2>&1; then
  echo "FALHA chave errada decifrou"; falhou=1; else echo "OK    chave errada não decifra"; fi
# Campo que a fonte não conhece e campo faltando são recusados.
if echo '{"apiKey":"x","extra":"y"}' | CREDENTIALS_KEY="$CHAVE_A" node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --stdin >/dev/null 2>&1; then
  echo "FALHA aceitou campo desconhecido"; falhou=1; else echo "OK    campo desconhecido recusado"; fi
# Coleta real sem credencial falha fechada; --todas isola a fonte com problema (sem config) das demais.
psql_ "$DB" -q -c "DELETE FROM source_credentials"
saida=$(CREDENTIALS_KEY="$CHAVE_A" node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --listas-medicamentos "$LISTAS" 2>&1) || true
if echo "$saida" | grep -q "sem credencial gravada"; then
  echo "OK    coleta real sem credencial falha fechada"; else echo "FALHA coleta sem credencial"; falhou=1; fi
# Modo "chave pelo proxy" (segredo de rede do ambiente de nuvem): não lê credencial do banco nem exige CREDENTIALS_KEY.
saida=$(env -u CREDENTIALS_KEY node backend/dist/pipeline/coletar.js --tenant padrao --fonte lomadee --chave-pelo-proxy --listas-medicamentos "$LISTAS" 2>&1) || true
if echo "$saida" | grep -q '"fonte":"lomadee"'; then echo "OK    --chave-pelo-proxy coleta sem credencial no banco"; else echo "$saida" | head -3; echo "FALHA --chave-pelo-proxy"; falhou=1; fi
CREDENTIALS_KEY="$CHAVE_A" FONTE_LOMADEE_APIKEY="$SEGREDO" \
  node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --de-ambiente >/dev/null
saida=$(CREDENTIALS_KEY="$CHAVE_A" node backend/dist/pipeline/coletar.js --tenant padrao --todas --listas-medicamentos "$LISTAS" 2>&1) && codigo=0 || codigo=$?
if echo "$saida" | grep -q '"fonte":"lomadee"' && echo "$saida" | grep -q "sem-config\] Tenant sem configuração" && [ "$codigo" = 1 ]; then
  echo "OK    --todas: a fonte com problema não derruba a outra, e a saída é 1"
else echo "$saida" | head -5; echo "FALHA --todas ($codigo)"; falhou=1; fi
if echo "$saida" | grep -q "$SEGREDO"; then echo "FALHA o segredo apareceu na saída da coleta"; falhou=1; else echo "OK    a coleta não imprime o segredo"; fi

passo "3c. instalação no computador do operador: provisão, status e coletor em ciclo"
DB_PROV=pronto_fase3_prov
recria "$DB_PROV"
export DATABASE_URL="$URL_BASE/$DB_PROV" REDIS_URL="redis://127.0.0.1:6379"
node backend/dist/db/migrate.js >/dev/null
r=$(node backend/dist/pipeline/provisionar.js --tenant padrao)
if echo "$r" | grep -q '"fontesCriadas":\["lomadee"\]' && [ "$(echo "$r" | grep -o 'online' | wc -l)" = "2" ]; then
  echo "OK    provisão cria a fonte e as 2 lojas"; else echo "$r"; echo "FALHA provisão"; falhou=1; fi
psql_ "$DB_PROV" -q -c "UPDATE stores SET status = 'aprovada', reputacao = 0.9 WHERE rede = 'Drogasmil'"
r=$(node backend/dist/pipeline/provisionar.js --tenant padrao)
if echo "$r" | grep -q '"fontesCriadas":\[\],"lojasCriadas":\[\]' \
   && [ "$(psql_ "$DB_PROV" -Atc "SELECT status || reputacao FROM stores WHERE rede = 'Drogasmil'")" = "aprovada0.90" ] \
   && [ "$(psql_ "$DB_PROV" -Atc "SELECT count(*) FROM stores")" = "2" ]; then
  echo "OK    rodar de novo não duplica nem desfaz o que o operador mudou"; else echo "$r"; echo "FALHA provisão repetida"; falhou=1; fi
saida=$(node backend/dist/pipeline/status.js)
if echo "$saida" | grep -q "Ainda não há nenhum preço guardado"; then echo "OK    status em português quando ainda não há dados"; else echo "$saida"; echo "FALHA status"; falhou=1; fi
saida=$(CREDENTIALS_KEY="$CHAVE_A" node backend/dist/pipeline/credencial.js --tenant padrao --fonte lomadee --pedir </dev/null 2>&1) && codigo=0 || codigo=$?
if [ "$codigo" != 0 ] && echo "$saida" | grep -q "terminal interativo"; then echo "OK    --pedir sem terminal recusa em vez de travar"; else echo "$saida"; echo "FALHA --pedir"; falhou=1; fi
# Coletor em ciclo: sem credencial o ciclo falha com mensagem clara, grava o estado e o SIGTERM encerra limpo.
DADOS_TESTE=$(mktemp -d)
mkdir -p "$DADOS_TESTE/listas" && cp "$LISTAS" "$DADOS_TESTE/listas/atual.json"
saida=$(DADOS="$DADOS_TESTE" CREDENTIALS_KEY="$CHAVE_A" timeout -s TERM 15 node backend/dist/pipeline/ciclo.js 2>&1) && codigo=0 || codigo=$?
if { [ "$codigo" = 0 ] || [ "$codigo" = 124 ]; } && echo "$saida" | grep -q "sem credencial gravada" && echo "$saida" | grep -q "Coletor parado" \
   && grep -q '"falhou": true' "$DADOS_TESTE/ultimo-ciclo.json"; then
  echo "OK    coletor em ciclo: falha clara sem credencial, grava o estado e encerra limpo"
else echo "$saida" | head -8; echo "FALHA coletor em ciclo ($codigo)"; falhou=1; fi
export DATABASE_URL="$URL_BASE/$DB" REDIS_URL="redis://127.0.0.1:6379"

passo "5. contrato OpenAPI"
if lint=$(npx --yes @redocly/cli@1.34.5 lint backend/openapi/openapi.yaml backend/openapi/admin.yaml 2>&1) && echo "$lint" | grep -q "valid"; then
  echo "OK    lint do contrato (app e operador)"
else
  echo "$lint" | tail -15; echo "FALHA lint do contrato"; falhou=1
fi

passo "6. suíte do backend"
if (cd backend && npm test 2>&1 | tail -6); then echo "OK    npm test"; else echo "FALHA npm test"; falhou=1; fi

echo
if [ "$falhou" -eq 0 ]; then echo "FASE 3 (parte 1): PRONTO"; else echo "FASE 3 (parte 1): FALHOU"; exit 1; fi
