#!/usr/bin/env bash
# T5-S7 — UAT: 1 CĐT pilot thật + synthetic anchors in parallel
# Usage: ./scripts/uat-pilot-anchor.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== UAT Pilot Anchor (LIVE + SYNTHETIC) ==="

for f in \
  "$ROOT/config/gtm/pilot-cdt-v1.json" \
  "$ROOT/docs/dev/pilot-cdt-onboarding.md" \
  "$ROOT/scripts/onboard-pilot-cdt.sh" \
  "$ROOT/apps/api/src/modules/anchor/anchor-tenant.service.ts" \
  "$ROOT/apps/api/src/database/entities/anchor-tenant-profile.entity.ts"
do
  if [ -f "$f" ]; then pass "artifact $(basename "$f")"; else fail "missing $f"; fi
done

if grep -q 'pilotClass' "$ROOT/apps/api/src/database/entities/anchor-tenant-profile.entity.ts"; then
  pass "entity pilotClass field"
else
  fail "entity pilotClass field"
fi

if grep -q 'prj_sunrise' "$ROOT/apps/api/src/modules/anchor/anchor-tenant.service.ts"; then
  pass "synthetic anchor uses prj_sunrise (not _01)"
else
  fail "prj_sunrise fix in anchor seeds"
fi

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo "⚠ API not running — live checks skipped"
  echo "=== uat-pilot-anchor ARTIFACT-ONLY PASS=$PASS FAIL=$FAIL ==="
  [ "$FAIL" -eq 0 ] || exit 1
  exit 0
fi

PILOT_TENANT=$(jq -r '.tenantId' "$ROOT/config/gtm/pilot-cdt-v1.json")

PROFILES=$(curl -sf "$BASE/anchor/profiles" || echo '{}')
if echo "$PROFILES" | jq -e --arg t "$PILOT_TENANT" '.data[] | select(.tenantId==$t and .pilotClass=="LIVE")' >/dev/null; then
  pass "LIVE profile $PILOT_TENANT"
else
  fail "LIVE profile $PILOT_TENANT"
fi

SYN=$(echo "$PROFILES" | jq '[.data[] | select(.pilotClass=="SYNTHETIC")] | length')
if [ "${SYN:-0}" -ge 3 ]; then pass "≥3 synthetic anchors ($SYN)"; else fail "synthetic count ($SYN)"; fi

CHECKLIST=$(curl -sf "$BASE/anchor/onboard/checklist/$PILOT_TENANT" || echo '{}')
if echo "$CHECKLIST" | jq -e '.data.ready == true' >/dev/null; then
  pass "pilot onboarding checklist ready"
else
  fail "pilot onboarding checklist ready"
fi

LEADER=$(curl -sf "$BASE/anchor/leaderboard" || echo '{}')
LIVE_L=$(echo "$LEADER" | jq -r '.meta.liveAnchors // 0')
SYN_L=$(echo "$LEADER" | jq -r '.meta.syntheticAnchors // 0')
if [ "$LIVE_L" -ge 1 ] && [ "$SYN_L" -ge 3 ]; then
  pass "leaderboard parallel ($LIVE_L live, $SYN_L synthetic)"
else
  fail "leaderboard parallel ($LIVE_L live, $SYN_L synthetic)"
fi

FILTER_LIVE=$(curl -sf "$BASE/anchor/profiles?pilotClass=LIVE" || echo '{}')
if echo "$FILTER_LIVE" | jq -e '.meta.count >= 1 and .meta.liveCount >= 1' >/dev/null; then
  pass "GET /anchor/profiles?pilotClass=LIVE"
else
  fail "GET /anchor/profiles?pilotClass=LIVE"
fi

echo "=== uat-pilot-anchor PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
