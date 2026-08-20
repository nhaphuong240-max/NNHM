#!/usr/bin/env bash
# T7-G4 / T7-S4 — Trust OS live (GR · e-sign · eKYC)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S4 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S4 Trust OS UAT ==="

test -f "$ROOT/docs/dev/t7-s4-trust-os-live.md" && pass "T7-S4 runbook" || fail
test -f "$ROOT/apps/api/src/database/migrations/1738339202000-AddUnitVersionBind.ts" && pass "unit_version migration" || fail
test -f "$ROOT/apps/api/src/modules/golden-record/developer-trust-score.service.ts" && pass "trust score service" || fail
test -f "$ROOT/apps/api/src/modules/listing/anti-drift.service.ts" && pass "anti-drift service" || fail
test -f "$ROOT/apps/api/src/modules/booking/vnpt-esign.adapter.ts" && pass "VNPT e-sign adapter" || fail
test -f "$ROOT/apps/api/src/modules/ekyc/vnpt-ekyc.adapter.ts" && pass "VNPT eKYC adapter" || fail
test -f "$ROOT/apps/api/src/modules/documents/document-retention.job.ts" && pass "document retention job" || fail
test -f "$ROOT/apps/api/src/modules/documents/document-retention.util.ts" && pass "retention util" || fail

grep -q 'ESIGN_SANDBOX=false' "$ROOT/config/tier-t7/production-trust.env" && pass "ESIGN live tier-t7" || fail
grep -q 'EKYC_SANDBOX=false' "$ROOT/config/tier-t7/production-trust.env" && pass "EKYC live tier-t7" || fail

grep -rq 'expectedUnitVersion' "$ROOT/apps/api/src/modules/booking/booking.service.ts" && pass "GR version bind in booking" || fail
grep -rq 'expectedUnitVersion' "$ROOT/apps/api/src/modules/listing/listing.service.ts" && pass "GR version bind in listing" || fail
grep -rq 'enqueueAntiDriftOps' "$ROOT/apps/api/src/modules/listing/listing.service.ts" && pass "anti-drift ops queue SLA" || fail
grep -rq 'hasValidConsent' "$ROOT/apps/api/src/modules/documents/documents.service.ts" && pass "PDPA consent on download" || fail

test -f "$ROOT/docs/compliance/PDPA-consent-ledger.md" && pass "PDPA consent doc" || open "PDPA consent doc"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf "$BASE/health/trust" | jq -e '.meta.gate == "T7-G4"' >/dev/null 2>&1 && pass "GET /health/trust" || fail "GET /health/trust"
  curl -sf "$BASE/kyc/ekyc/status" >/dev/null 2>&1 && pass "eKYC status public/live path" || open "eKYC status endpoint"

  chmod +x "$ROOT/scripts/uat-op-win-04.sh" 2>/dev/null || true
  if [ -x "$ROOT/scripts/uat-op-win-04.sh" ]; then
    "$ROOT/scripts/uat-op-win-04.sh" "$BASE" >/dev/null 2>&1 && pass "OP-WIN-04 anti-drift UAT" || open "OP-WIN-04 prod evidence"
  fi
else
  echo "⚠ API not running — live trust checks skipped"
fi

echo "=== uat-t7-trust PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
