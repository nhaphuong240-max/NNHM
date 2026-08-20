#!/usr/bin/env bash
# T7-G1 / T7-S1 — platform foundation (migrations + RLS)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S1 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S1 Platform UAT ==="

test -f "$ROOT/docs/dev/Sprint-Backlog-T7.md" && pass "T7 backlog" || fail "T7 backlog"
test -f "$ROOT/adr/ADR-002-postgresql-rls-tenant-isolation.md" && pass "ADR-002 RLS" || fail "ADR-002"

if [ -d "$ROOT/apps/api/src/database/migrations" ] && \
   [ "$(find "$ROOT/apps/api/src/database/migrations" -name '*.ts' 2>/dev/null | wc -l | tr -d ' ')" -gt 0 ]; then
  pass "TypeORM migrations present"
else
  open "TypeORM migrations folder"
fi

if [ -f "$ROOT/apps/api/src/database/data-source.ts" ]; then
  pass "TypeORM data-source CLI"
else
  fail "missing data-source.ts"
fi

if [ -f "$ROOT/apps/api/src/database/tenant-rls.service.ts" ]; then
  pass "TenantRlsService"
else
  fail "missing TenantRlsService"
fi

if grep -rq 'app.current_tenant_id' "$ROOT/apps/api/src/database" 2>/dev/null; then
  pass "RLS session context in codebase"
else
  open "Postgres RLS + session tenant var"
fi

if grep -q 'DB_SYNCHRONIZE' "$ROOT/apps/api/src/database/typeorm-options.ts" 2>/dev/null; then
  pass "DB_SYNCHRONIZE gated in typeorm-options"
else
  open "synchronize=false prod enforcement"
fi

if grep -q 'check-migrations' "$ROOT/.github/workflows/ci.yml" 2>/dev/null; then
  pass "migration CI gate"
else
  open "migration CI in ci.yml"
fi

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  READY=$(curl -sf "$BASE/health/ready" 2>/dev/null || echo '{}')
  echo "$READY" | jq -e '.checks.migrations == "up" or .checks.migrations == "unknown"' >/dev/null 2>&1 \
    && pass "health/ready migrations check" \
    || open "health/ready migrations=up on env with migration:run"
else
  echo "⚠ API not running — live platform checks skipped"
fi

echo "=== uat-t7-platform PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
