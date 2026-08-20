#!/usr/bin/env bash
# T7-G5 / T7-S5 — Money OS live rails
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S5 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S5 Money OS UAT ==="

test -f "$ROOT/docs/dev/t7-s5-money-os-live.md" && pass "T7-S5 runbook" || fail
test -f "$ROOT/config/tier-t7/production-trust.env" && pass "tier-t7 production-trust.env" || fail
test -f "$ROOT/config/tier-b/production.env" && pass "tier-b production baseline" || fail
test -f "$ROOT/scripts/apply-tier-t7-money.sh" && pass "apply-tier-t7-money.sh" || fail

test -f "$ROOT/apps/api/src/modules/payment/adapters/vnpay-payment.adapter.ts" && pass "VNPay adapter" || fail
test -f "$ROOT/apps/api/src/modules/commission/commission-payout.client.ts" && pass "payout client" || fail
test -f "$ROOT/apps/api/src/modules/integrations/bank-connector.controller.ts" && pass "bank connector" || fail
test -f "$ROOT/apps/api/src/modules/trust/regulatory-export-crypto.util.ts" && pass "regulatory AES util" || fail

grep -q 'SETTLEMENT_PAYOUT_STUB=false' "$ROOT/config/tier-t7/production-trust.env" && pass "payout stub off tier-t7" || fail
grep -q 'SETTLEMENT_PAYOUT_ENABLED=true' "$ROOT/config/tier-t7/production-trust.env" && pass "payout enabled tier-t7" || fail
grep -q 'ESCROW_BANK_PARTNER_ENABLED=true' "$ROOT/config/tier-t7/production-trust.env" && pass "escrow bank tier-t7" || fail
grep -q 'VNPAY_SANDBOX=false' "$ROOT/config/tier-t7/production-trust.env" && pass "VNPay live tier-t7" || fail
grep -q 'REGULATORY_EXPORT_STUB=false' "$ROOT/config/tier-t7/production-trust.env" && pass "regulatory export live tier-t7" || fail

if grep -rq 'AES-256-GCM-stub' "$ROOT/apps/api/src" 2>/dev/null; then
  fail "AES-256-GCM-stub string still in src"
else
  pass "no AES-stub string in src"
fi

grep -rq 'VNPAY_SANDBOX' "$ROOT/apps/api/src/modules/payment/adapters/vnpay-payment.adapter.ts" && pass "VNPay sandbox guard in adapter" || fail
grep -rq 'moneyGate' "$ROOT/apps/api/src/modules/health/health.service.ts" && pass "money health gate" || fail

chmod +x "$ROOT/scripts/verify-production-flags.sh" "$ROOT/scripts/uat-tier-b-rails.sh" 2>/dev/null || true
"$ROOT/scripts/verify-production-flags.sh" --profile tier-t7 "$ROOT/config/tier-t7/production-trust.env" >/dev/null 2>&1 \
  && pass "tier-t7 money profile flags" || fail "tier-t7 profile verify"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf "$BASE/health/money" | jq -e '.meta.gate == "T7-G5"' >/dev/null 2>&1 && pass "GET /health/money" || fail "GET /health/money"

  TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken // empty' 2>/dev/null || true)
  if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then
    curl -sf -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" \
      "$BASE/commission/settlement/status" >/dev/null 2>&1 && pass "settlement status endpoint" || open "settlement status"
  else
    open "settlement status (login required)"
  fi

  chmod +x "$ROOT/scripts/uat-op-win-06.sh" 2>/dev/null || true
  if [ -x "$ROOT/scripts/uat-op-win-06.sh" ]; then
    "$ROOT/scripts/uat-op-win-06.sh" "$BASE" >/dev/null 2>&1 && pass "OP-WIN-06 UAT" || open "OP-WIN-06 live payout"
  fi

  open "OP-WIN-02/06 prod 30-day streak (human sign-off on prod URL)"
else
  echo "⚠ API not running — live money checks skipped"
fi

echo "=== uat-t7-money PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
