#!/usr/bin/env bash
# T7-S1 — migration artifacts + optional live drift check
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/apps/api/.env}"

echo "=== T7-S1 Migration check ==="

test -f "$ROOT/apps/api/src/database/data-source.ts" && echo "✓ data-source.ts"
test -d "$ROOT/apps/api/src/database/migrations" && echo "✓ migrations folder"
test -f "$ROOT/apps/api/src/database/migrations/1738339201000-EnableTenantRls.ts" && echo "✓ EnableTenantRls migration"
grep -q 'migration:run' "$ROOT/apps/api/package.json" && echo "✓ npm migration scripts"

if [ -f "$ENV_FILE" ]; then
  echo "Env: $ENV_FILE"
else
  echo "⚠ No $ENV_FILE — skipping live migration:show"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "⚠ docker not available — artifact check only"
  exit 0
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q postgres; then
  echo "⚠ Postgres container not running — artifact check only"
  exit 0
fi

cd "$ROOT/apps/api"
if npm run migration:show 2>&1 | grep -q '\[ \]'; then
  echo "⚠ Pending migrations — run: npm run migration:run"
  exit 1
fi
echo "✓ No pending migrations"
echo "=== check-migrations PASS ==="
