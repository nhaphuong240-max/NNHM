#!/usr/bin/env bash
# T02 — inventory + isolated Postgres/Redis migrate. Does not read apps/api/.env.
# Rollback of this harness is reverting the T02 commit; do not treat a skipped run as acceptance.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
SHORT="$(git -C "$ROOT" rev-parse --short HEAD)"
REMOTE="https://github.com/nhaphuong240-max/NNHM/blob/${SHA}"

echo "SHA=$SHA"
echo "short=$SHORT"

echo "=== inventory ==="
MOD_LIST="$(find "$ROOT/apps/api/src/modules" -name '*.module.ts' | sort)"
ENT_LIST="$(find "$ROOT/apps/api/src/database/entities" -name '*.entity.ts' | sort)"
SPEC_LIST="$(find "$ROOT/apps/api" -name '*.spec.ts' -not -path '*/node_modules/*' | sort)"
MOD_N="$(printf '%s\n' "$MOD_LIST" | sed '/^$/d' | wc -l | tr -d ' ')"
ENT_N="$(printf '%s\n' "$ENT_LIST" | sed '/^$/d' | wc -l | tr -d ' ')"
SPEC_N="$(printf '%s\n' "$SPEC_LIST" | sed '/^$/d' | wc -l | tr -d ' ')"
echo "modules=$MOD_N command=find apps/api/src/modules -name '*.module.ts'"
echo "entities=$ENT_N command=find apps/api/src/database/entities -name '*.entity.ts'"
echo "api_specs=$SPEC_N command=find apps/api -name '*.spec.ts' -not -path '*/node_modules/*'"
echo "tree=${REMOTE}/apps/api/src/modules"
echo "entities_tree=${REMOTE}/apps/api/src/database/entities"
if [ "$MOD_N" -lt 1 ] || [ "$ENT_N" -lt 1 ] || [ "$SPEC_N" -lt 1 ]; then
  echo "FAIL inventory count is zero"
  exit 1
fi
echo "PASS inventory"

echo "=== production config gate ==="
(
  cd "$ROOT/apps/api"
  npm run t02:config-gate
)
echo "PASS config gate"

if [ "${T02_REQUIRE_ISOLATED_DB:-0}" != "1" ]; then
  echo "FAIL isolated database was not required (T02_REQUIRE_ISOLATED_DB must be 1). Not-run is not acceptance."
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-}"
REDIS_URL="${REDIS_URL:-}"
if [ -z "$DATABASE_URL" ] || [ -z "$REDIS_URL" ]; then
  echo "FAIL DATABASE_URL and REDIS_URL are required for the isolated harness"
  exit 1
fi

case "$DATABASE_URL" in
  *ngoinhahomnay*|*"/nnhn"|*"/nnhn?"*)
    echo "FAIL refused production-like DATABASE_URL"
    exit 1
    ;;
esac
case "$DATABASE_URL" in
  *wereal_t02*) ;;
  *)
    echo "FAIL isolated harness only accepts database name wereal_t02"
    exit 1
    ;;
esac
if [ "${DB_SYNCHRONIZE:-false}" = "true" ]; then
  echo "FAIL DB_SYNCHRONIZE=true"
  exit 1
fi

echo "=== schema classify before DDL ==="
set +e
(
  cd "$ROOT/apps/api"
  npm run t02:classify
)
classify_exit=$?
set -e
echo "classify_exit=$classify_exit"
if [ "$classify_exit" -ne 0 ]; then
  echo "NOT-RUN redis ping"
  echo "NOT-RUN migration:run"
  echo "NOT-RUN cluster dispose"
  echo "FAIL schema evidence is missing or the baseline file hash does not match SHA=$SHA"
  exit 1
fi

echo "=== redis ping ==="
(
  cd "$ROOT/apps/api"
  node -e "const Redis=require('ioredis'); const redis=new Redis(process.env.REDIS_URL); redis.ping().then((value)=>{console.log('redis='+value); return redis.quit();}).catch((error)=>{console.error(error); process.exit(1);});"
)
echo "PASS redis ping"

echo "=== migration:run ==="
(
  cd "$ROOT/apps/api"
  npm run migration:run
)
echo "PASS migration:run"

echo "=== schema compare ==="
(
  cd "$ROOT/apps/api"
  NODE_PATH="$ROOT/apps/api/node_modules" node "$ROOT/scripts/t02-schema-compare.js"
)
echo "PASS schema compare"

if [ -n "${T02_HARNESS_SESSION:-}" ] && [ -f "${T02_HARNESS_SESSION}" ]; then
  echo "REFUSE dispose: session file is recorded and is not used as a delete"
else
  echo "REFUSE dispose: no confirmed harness session file"
fi
echo "PASS isolated database SHA=$SHA"
