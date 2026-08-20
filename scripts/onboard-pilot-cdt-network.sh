#!/usr/bin/env bash
# T7-S6 — Onboard CĐT pilots #2 and #3 (additive LIVE anchors)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

onboard_one() {
  local config="$1"
  local tenant
  tenant=$(jq -r '.tenantId' "$config")
  echo "--- Onboard $tenant ---"
  curl -sf -X POST "$BASE/anchor/onboard/pilot" \
    -H 'Content-Type: application/json' \
    -d "{\"tenantId\":\"$tenant\",\"displayName\":$(jq -c '.displayName' "$config"),\"legalName\":$(jq -c '.legalName' "$config"),\"projectIds\":[\"$(jq -r '.projectId' "$config\")\"]}" >/dev/null
  curl -sf "$BASE/anchor/onboard/checklist/$tenant" | jq -e '.data.pilotClass=="LIVE" or .data.steps.slaSigned==true' >/dev/null
  echo "✓ $tenant LIVE profile"
}

echo "=== T7-S6 onboard CĐT #2 #3 ==="
curl -sf "$BASE/health/live" >/dev/null
echo "✓ API live"

onboard_one "$ROOT/config/gtm/pilot-cdt-v2.json"
onboard_one "$ROOT/config/gtm/pilot-cdt-v3.json"

PROFILES=$(curl -sf "$BASE/anchor/profiles")
LIVE_COUNT=$(echo "$PROFILES" | jq '[.data[] | select(.pilotClass=="LIVE")] | length')
SYN_COUNT=$(echo "$PROFILES" | jq '[.data[] | select(.pilotClass=="SYNTHETIC")] | length')
echo "✓ LIVE=$LIVE_COUNT synthetic=$SYN_COUNT"

SCALE=$(curl -sf "$BASE/anchor/network/scale")
echo "$SCALE" | jq -e '.data.liveAnchorCount >= 3' >/dev/null
echo "✓ network scale ≥3 LIVE"

echo "=== onboard-pilot-cdt-network PASS ==="
