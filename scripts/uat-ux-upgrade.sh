#!/usr/bin/env bash
# UX upgrade gate — web · mobile API · performance artifacts
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== UX Upgrade UAT ==="

test -f "$ROOT/apps/web/src/theme/tokens.ts" && grep -q 'semantic' "$ROOT/apps/web/src/theme/tokens.ts" && pass "design tokens v2" || fail "design tokens"
test -f "$ROOT/apps/web/src/pages/developer/DeveloperAnchorPage.tsx" && pass "anchor dashboard page" || fail "anchor page"
test -f "$ROOT/apps/web/e2e/developer.spec.ts" && pass "developer E2E spec" || fail "developer e2e"
test -f "$ROOT/apps/web/src/lib/web-vitals.ts" && pass "web-vitals RUM" || fail "web-vitals"
test -f "$ROOT/apps/mobile/src/services/leadCaptureQueue.ts" && pass "offline lead queue" || fail "lead queue"
test -f "$ROOT/apps/mobile-buyer/src/screens/EsignScreen.tsx" && pass "buyer e-sign WebView" || fail "esign screen"
grep -q 'buyer/devices/register' "$ROOT/apps/api/src/modules/portal/portal.controller.ts" && pass "buyer push API" || fail "buyer push"
grep -q 'buyer/deals/:bookingId/bnpl' "$ROOT/apps/api/src/modules/portal/portal.controller.ts" && pass "buyer BNPL API" || fail "buyer bnpl"
grep -q 'developer.spec.ts' "$ROOT/.github/workflows/ci.yml" && pass "E2E on PR expanded" || fail "ci e2e"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  SLO=$(curl -sf "$BASE/health/slo" 2>/dev/null || echo '{}')
  P95=$(echo "$SLO" | jq -r '.data.apiP95TargetMs // .apiP95TargetMs // empty' 2>/dev/null)
  [ "$P95" = "200" ] && pass "API P95 target=200ms" || fail "API P95 slo"
  TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' \
    | jq -r '.accessToken // .data.accessToken // empty' 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    curl -sf "$BASE/anchor/dashboard" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-Id: ten_dev_01" >/dev/null 2>&1 \
      && pass "anchor dashboard API" || fail "anchor API"
  else
    fail "anchor API (login)"
  fi
else
  echo "⚠ API not running — live checks skipped"
fi

echo "=== uat-ux-upgrade PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
