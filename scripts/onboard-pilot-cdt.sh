#!/usr/bin/env bash
# T5-S7 — Onboard 1 CĐT pilot thật song song synthetic anchor
# Usage: ./scripts/onboard-pilot-cdt.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/config/gtm/pilot-cdt-v1.json"

PILOT_TENANT=$(jq -r '.tenantId' "$CONFIG")
PILOT_EMAIL=$(jq -r '.adminEmail' "$CONFIG")
PILOT_PASS=$(jq -r '.adminPassword' "$CONFIG")

echo "=== Onboard pilot CĐT ($PILOT_TENANT) ==="

curl -sf "$BASE/health/live" >/dev/null
echo "✓ API live"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PILOT_EMAIL\",\"password\":\"$PILOT_PASS\"}" | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $PILOT_TENANT" -H 'Content-Type: application/json')

curl -sf -X POST "$BASE/anchor/onboard/pilot" "${AUTH[@]}" \
  -d "{\"tenantId\":\"$PILOT_TENANT\"}" >/dev/null
echo "✓ POST /anchor/onboard/pilot idempotent"

CHECKLIST=$(curl -sf "$BASE/anchor/onboard/checklist/$PILOT_TENANT")
READY=$(echo "$CHECKLIST" | jq -r '.data.ready')
echo "$CHECKLIST" | jq -e '.data.steps.grImport == true' >/dev/null && echo "✓ GR import"
echo "$CHECKLIST" | jq -e '.data.steps.trustScore == true' >/dev/null && echo "✓ trust score ≥80"
echo "$CHECKLIST" | jq -e '.data.steps.slaSigned == true' >/dev/null && echo "✓ SLA signed"
echo "$CHECKLIST" | jq -e '.data.steps.distributionPublished == true' >/dev/null && echo "✓ distribution published"
echo "$CHECKLIST" | jq -e '.data.steps.crossAnchorLinked == true' >/dev/null && echo "✓ cross-anchor linked"

PROFILES=$(curl -sf "$BASE/anchor/profiles")
LIVE_COUNT=$(echo "$PROFILES" | jq '[.data[] | select(.pilotClass=="LIVE")] | length')
SYN_COUNT=$(echo "$PROFILES" | jq '[.data[] | select(.pilotClass=="SYNTHETIC")] | length')
echo "$PROFILES" | jq -e --arg t "$PILOT_TENANT" '.data[] | select(.tenantId==$t and .pilotClass=="LIVE")' >/dev/null
echo "✓ LIVE anchor $PILOT_TENANT ($LIVE_COUNT live / $SYN_COUNT synthetic)"

curl -sf "${AUTH[@]}" "$BASE/anchor/dashboard" | jq -e '.data.profile.pilotClass=="LIVE"' >/dev/null
echo "✓ pilot dashboard LIVE"

SUNRISE_TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')
curl -sf -H "Authorization: Bearer $SUNRISE_TOKEN" -H "X-Tenant-Id: ten_dev_01" "$BASE/anchor/dashboard" \
  | jq -e '.data.profile.pilotClass=="SYNTHETIC"' >/dev/null
echo "✓ synthetic anchor ten_dev_01 still active"

LEADER=$(curl -sf "$BASE/anchor/leaderboard")
echo "$LEADER" | jq -e '.meta.liveAnchors >= 1 and .meta.syntheticAnchors >= 3' >/dev/null
echo "✓ leaderboard parallel LIVE + synthetic"

if [ "$READY" = "true" ]; then
  echo "=== onboard-pilot-cdt PASS (checklist ready) ==="
else
  echo "⚠ onboard-pilot-cdt partial — checklist.ready=$READY"
  echo "$CHECKLIST" | jq '.data.steps'
  exit 1
fi
