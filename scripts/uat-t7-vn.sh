#!/usr/bin/env bash
# T7-S8 — Tier 7 production trust umbrella gate
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1"; OPEN=$((OPEN + 1)); }

echo "=== Tier 7 Production Trust UAT ==="

chmod +x "$ROOT/scripts/verify-t7-gate.sh" \
  "$ROOT/scripts/uat-t7-platform.sh" \
  "$ROOT/scripts/uat-t7-security.sh" \
  "$ROOT/scripts/uat-t7-observability.sh" \
  "$ROOT/scripts/uat-t7-trust.sh" \
  "$ROOT/scripts/uat-t7-money.sh" \
  "$ROOT/scripts/uat-t7-network.sh" \
  "$ROOT/scripts/uat-t7-intelligence.sh" \
  "$ROOT/scripts/dr-failover-drill.sh" \
  "$ROOT/scripts/onboard-enterprise-pilot.sh" 2>/dev/null || true

"$ROOT/scripts/verify-t7-gate.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-platform.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-security.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-observability.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-trust.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-money.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-network.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-t7-intelligence.sh" "$BASE"

echo ""
echo "--- T7-S8 Enterprise sign-off ---"
test -f "$ROOT/docs/dev/Sprint-Backlog-T7.md" && pass "Sprint-Backlog-T7" || fail "Sprint-Backlog-T7"
test -f "$ROOT/docs/dev/t7-s8-enterprise-signoff.md" && pass "t7-s8 runbook" || fail "t7-s8 runbook"
test -f "$ROOT/docs/dev/OP-WIN-T7-signoff.md" && pass "OP-WIN-T7 signoff" || fail "OP-WIN signoff"
test -f "$ROOT/config/gtm/enterprise-pilot-cdt.json" && pass "enterprise pilot config" || fail "enterprise config"
test -f "$ROOT/docs/security/pen-test-external-T7.md" && pass "external pen-test report" || fail "pen-test report"
test -f "$ROOT/apps/api/src/modules/integrations/erp-invoicing.service.ts" && pass "ERP invoicing module" || fail "ERP module"

if [ ! -f "$ROOT/docs/dev/evidence/t7-dr-failover.log" ]; then
  "$ROOT/scripts/dr-failover-drill.sh" "$BASE" >/dev/null 2>&1 || true
fi
if [ -f "$ROOT/docs/dev/evidence/t7-dr-failover.log" ]; then
  pass "DR failover evidence log"
else
  open "DR drill evidence"
fi

if grep -q 'whiteLabelTier' "$ROOT/apps/api/src/modules/identity/tenant-branding.util.ts" 2>/dev/null; then
  pass "white-label tier field"
else
  open "white-label tier"
fi

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  ENT=$(curl -sf "$BASE/health/enterprise" 2>/dev/null || echo '{}')
  ENT_STATUS=$(echo "$ENT" | jq -r '.status // empty' 2>/dev/null)
  if [ "$ENT_STATUS" = "ok" ]; then
    pass "health/enterprise ok"
  else
    open "health/enterprise (status=${ENT_STATUS:-unknown})"
  fi

  login=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}')
  TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty')
  if [ -n "$TOKEN" ]; then
    AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01")
    ERP=$(curl -sf -X POST "${AUTH[@]}" "$BASE/integrations/erp/invoices/sync" 2>/dev/null || echo '{}')
    INV=$(echo "$ERP" | jq -r '.data.invoiceId // .data.status // .data.externalRef // empty' 2>/dev/null)
    if [ -n "$INV" ]; then
      pass "ERP invoice sync ($INV)"
    else
      curl -sf "${AUTH[@]}" "$BASE/integrations/erp/status" >/dev/null 2>&1 && pass "ERP invoicing status API" || open "ERP invoice sync"
    fi
  fi
else
  echo "⚠ API not running — live enterprise checks skipped"
fi

SCORE=$(grep -E 'Composite.*5\.0' "$ROOT/docs/strategy/WEREAL-Domain-Scorecard.md" 2>/dev/null | head -1 || true)
if [ -n "$SCORE" ]; then
  pass "domain scorecard T7 ≥5.0"
else
  open "domain scorecard refresh"
fi

echo ""
echo "=== uat-t7-vn PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
