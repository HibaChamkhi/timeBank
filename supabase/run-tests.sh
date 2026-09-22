#!/usr/bin/env bash
# Runs the migration + tests on a throwaway Postgres container.
set -euo pipefail
cd "$(dirname "$0")"
NAME=tb-test-db
docker rm -f $NAME >/dev/null 2>&1 || true
docker network create tb-net >/dev/null 2>&1 || true
docker run -d --name $NAME --network tb-net -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=tb -v "$PWD":/sb:ro postgres:16-alpine >/dev/null
trap 'docker rm -f $NAME tb-test-rest >/dev/null 2>&1' EXIT
until docker exec $NAME pg_isready -U postgres -d tb >/dev/null 2>&1; do sleep 1; done
sleep 2
P="docker exec -i $NAME psql -X -q -U postgres -d tb -v ON_ERROR_STOP=1"
$P < tests/00_stubs.sql
$P < migrations/20260921000000_init.sql
$P < migrations/20260921010000_social.sql
$P < migrations/20260921020000_notification_params.sql
$P < migrations/20260921030000_community.sql
$P < tests/ledger_test.sql
$P < tests/social_test.sql
$P < tests/community_test.sql
docker exec -i $NAME sh < tests/concurrency.sh

# Real REST layer (PostgREST) + the app's SupabaseApi against it.
docker rm -f tb-test-rest >/dev/null 2>&1 || true
docker run -d --name tb-test-rest --network tb-net -p 3311:3000 \
  -e PGRST_DB_URI="postgres://authenticator:pw@$NAME:5432/tb" -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="a-test-secret-that-is-at-least-32-characters-long" postgrest/postgrest:v12.2.3 >/dev/null
for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3311/ && break; sleep 1; done
(cd .. && npx tsx supabase/tests/api.integration.ts)
