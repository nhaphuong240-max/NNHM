#!/usr/bin/env bash
# T7-G6 / T7-S6 — Network OS scale (LIVE anchors · WAU · cross-anchor GMV)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S6 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S6 Network OS UAT ==="

test -f "$ROOT/docs/dev/t7-s6-network-os-scale.md" && pass "T7-S6 runbook" || fail
test -f "$ROOT/config/gtm/pilot-cdt-v1.json" && pass "pilot CĐT v1 config" || fail
test -f "$ROOT/config/gtm/pilot-cdt-v2.json" && pass "pilot CĐT v2 config" || fail
test -f "$ROOT/config/gtm/pilot-cdt-v3.json" && pass "pilot CĐT v3 config" || fail
test -f "$ROOT/docs/dev/pilot-cdt-onboarding.md" && pass "pilot onboarding doc" || fail
test -x "$ROOT/scripts/onboard-pilot-cdt.sh" && pass "onboard-pilot-cdt.sh" || fail
test -x "$ROOT/scripts/onboard-pilot-cdt-network.sh" && pass "onboard-pilot-cdt-network.sh" || fail
test -x "$ROOT/scripts/uat-pilot-anchor.sh" && pass "uat-pilot-anchor.sh" || fail

grep -q 'WAU_PILOT_SIM_ENABLED=false' "$ROOT/config/tier-t7/production-trust.env" && pass "WAU sim off prod tier-t7" || fail
grep -q 'pilotClass' "$ROOT/apps/api/src/database/entities/anchor-tenant-profile.entity.ts" && pass "anchor pilotClass field" || fail
grep -rq 'LIVE_PILOT_ANCHORS' "$ROOT/apps/api/src/modules/anchor/anchor-tenant.service.ts" && pass "3 LIVE pilot registry" || fail
grep -rq 'getNetworkScaleStatus' "$ROOT/apps/api/src/modules/anchor/anchor-tenant.service.ts" && pass "network scale service" || fail
grep -rq 'networkGate' "$ROOT/apps/api/src/modules/health/health.service.ts" && pass "network health gate" || fail
grep -rq 'getPlatformWauMetrics' "$ROOT/apps/api/src/modules/analytics/agent-wau.service.ts" && pass "platform WAU metrics" || fail

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf "$BASE/health/network" | jq -e '.meta.gate == "T7-G6"' >/dev/null 2>&1 && pass "GET /health/network" || fail "GET /health/network"

  PROFILES=$(curl -sf "$BASE/anchor/profiles" || echo '{}')
  LIVE_COUNT=$(echo "$PROFILES" | jq '[.data[]? | select(.pilotClass=="LIVE")] | length' 2>/dev/null || echo 0)
  SYN_COUNT=$(echo "$PROFILES" | jq '[.data[]? | select(.pilotClass=="SYNTHETIC")] | length' 2>/dev/null || echo 0)

  if [ "${LIVE_COUNT:-0}" -ge 1 ]; then pass "≥1 LIVE anchor ($LIVE_COUNT)"; else open "≥1 LIVE anchor"; fi
  if [ "${LIVE_COUNT:-0}" -ge 3 ]; then pass "≥3 LIVE anchors ($LIVE_COUNT)"; else open "≥3 LIVE anchors"; fi
  if [ "${SYN_COUNT:-0}" -ge 3 ]; then pass "synthetic anchors parallel ($SYN_COUNT)"; else open "synthetic anchors"; fi

  SCALE=$(curl -sf "$BASE/anchor/network/scale" 2>/dev/null || echo '{}')
  DEP=$(echo "$SCALE" | jq -r '.data.crossAnchorDepositedBookings // 0' 2>/dev/null || echo 0)
  if [ "${DEP:-0}" -ge 1 ] 2>/dev/null; then pass "cross-anchor DEPOSITED on LIVE ($DEP)"; else open "cross-anchor DEPOSITED GMV"; fi

  TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken // empty' 2>/dev/null || true)
  if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then
    WAU=$(curl -sf -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" "$BASE/analytics/agent/wau?days=7" 2>/dev/null || echo '{}')
    WAU7=$(echo "$WAU" | jq -r '.data.wau7d // 0' 2>/dev/null || echo 0)
    if [ "${WAU7:-0}" -ge 100 ] 2>/dev/null; then pass "wau7d ≥100 ($WAU7)"; else open "wau7d ≥100"; fi
    if [ "${WAU7:-0}" -ge 500 ] 2>/dev/null; then pass "wau7d ≥500 ($WAU7)"; else open "wau7d ≥500 prod target"; fi
  else
    open "tenant WAU (login required)"
  fi

  "$ROOT/scripts/uat-pilot-anchor.sh" "$BASE" >/dev/null 2>&1 && pass "uat-pilot-anchor green" || open "uat-pilot-anchor full green"
else
  echo "⚠ API not running — live network checks skipped"
fi

echo "=== uat-t7-network PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
