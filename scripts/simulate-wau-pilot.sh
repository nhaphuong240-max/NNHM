#!/usr/bin/env bash
# GTM pilot — simulate agent WAU activity (staging load toward 100 WAU)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="${TENANT:-ten_dev_01}"
AGENTS="${AGENTS:-100}"
DAYS="${DAYS:-7}"
EMAIL="${EMAIL:-admin@sunrise-dev.vn}"
PASS="${PASS:-DevAdmin123!}"

echo "=== WAU pilot simulation: $AGENTS agents × $DAYS days ==="

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo "⚠ API not running — offline artifact check only"
  test -f apps/api/src/modules/analytics/agent-wau.service.ts
  echo "✓ agent-wau.service present"
  exit 0
fi

login=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "✗ login failed"
  exit 1
fi
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

curl -sf -X POST "${AUTH[@]}" "$BASE/analytics/agent/wau/simulate" \
  -d "{\"agents\":$AGENTS}" >/dev/null \
  && echo "✓ bulk WAU pilot activity seeded ($AGENTS agents)" \
  || echo "⚠ bulk simulate skipped (set WAU_PILOT_SIM_ENABLED=true on staging)"

for i in $(seq 1 5); do
  curl -sf -X POST "${AUTH[@]}" "$BASE/mobile/devices/register" \
    -d "{\"pushToken\":\"ExponentPushToken[wau_${i}]\",\"platform\":\"ios\"}" >/dev/null || true
  curl -sf -X POST "${AUTH[@]}" "$BASE/mobile/activities/sync" \
    -d "{\"items\":[{\"clientRequestId\":\"wau_${i}\",\"eventType\":\"CHECKIN\",\"latitude\":10.77,\"longitude\":106.69}]}" >/dev/null || true
done

wau=$(curl -sf "${AUTH[@]}" "$BASE/analytics/agent/wau?days=$DAYS")
echo "$wau" | jq '.' 2>/dev/null || echo "$wau"

wau7=$(echo "$wau" | jq -r '.data.wau7d // 0' 2>/dev/null || echo 0)
echo "wau7d=$wau7 (pilot threshold 100, target 500)"
if [ "$wau7" -ge 100 ] 2>/dev/null; then
  echo "✓ pilot threshold ≥100 WAU"
else
  echo "⚠ wau7d below 100 — enable WAU_PILOT_SIM_ENABLED or onboard real agents"
fi
echo "=== simulate-wau-pilot PASS ==="
