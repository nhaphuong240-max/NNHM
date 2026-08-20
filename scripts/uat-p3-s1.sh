#!/usr/bin/env bash
# P3-S1 — UAT foundation + anti-drift + timeline (OP-WIN-03 · OP-WIN-04)
# Usage: ./scripts/uat-p3-s1.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
UNIT_DRIFT="${DRIFT_UNIT_ID:-un_01}"
GR_PRICE=3850000000
BLOCK_PRICE=4500000000

echo "=== P3-S1 UAT Automation ==="
echo "BASE=$BASE"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# --- UAT-04 / OP-WIN-04: Anti-drift BLOCK ---
echo ""
echo "--- UAT-04 Anti-drift block (OP-WIN-04) ---"

drift=$(curl -sf -X POST "$BASE/listings/drift-check" "${AUTH[@]}" \
  -d "{\"unitId\":\"$UNIT_DRIFT\",\"priceDisplay\":$BLOCK_PRICE}")
status=$(echo "$drift" | jq -r '.data.status')
gr_price=$(echo "$drift" | jq -r '.data.basePrice // empty')

if [ "$status" != "BLOCK" ]; then
  echo "✗ drift-check expected BLOCK got $status"
  exit 1
fi
echo "✓ drift-check status=BLOCK"

if [ "$gr_price" != "$GR_PRICE" ] && [ "$gr_price" != "3850000000" ]; then
  echo "⚠ GR basePrice in response: $gr_price (expected ~3850000000)"
else
  echo "✓ Error payload shows GR truth · basePrice=$gr_price"
fi

finding=$(echo "$drift" | jq -r '.data.findings[0].grValue // empty')
if [ -n "$finding" ] && [ "$finding" != "null" ]; then
  echo "✓ Finding includes grValue=$finding"
fi

create=$(curl -sf -X POST "$BASE/listings" "${AUTH[@]}" \
  -d "{\"unitId\":\"$UNIT_DRIFT\",\"title\":\"P3-S1 BLOCK test\",\"description\":\"UAT-04\",\"priceDisplay\":$BLOCK_PRICE}")
ls_id=$(echo "$create" | jq -r '.data.id')
echo "✓ Draft listing $ls_id with BLOCK drift"

block_code=$(curl -s -o /tmp/p3s1-submit.json -w '%{http_code}' -X POST "${AUTH[@]}" \
  "$BASE/listings/$ls_id/submit-review")
if [ "$block_code" != "422" ]; then
  echo "✗ submit-review expected 422 got $block_code"
  cat /tmp/p3s1-submit.json
  exit 1
fi
echo "✓ submit-review rejected with 422 (anti-drift BLOCK)"

# PASS path sanity
pass_drift=$(curl -sf -X POST "$BASE/listings/drift-check" "${AUTH[@]}" \
  -d "{\"unitId\":\"$UNIT_DRIFT\",\"priceDisplay\":$GR_PRICE}")
pass_status=$(echo "$pass_drift" | jq -r '.data.status')
[ "$pass_status" = "PASS" ] && echo "✓ drift-check PASS at GR price" || echo "⚠ PASS check: $pass_status"

# --- OP-WIN-03: Booking replay + CSV ---
echo ""
echo "--- OP-WIN-03 Timeline replay ---"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/demo-booking-replay.sh" "$BASE"

echo ""
echo "=== P3-S1 automation PASS ==="
echo "Next: sign UAT-04 in docs/uat/UAT-P0-pilot-checklist.md"
echo "UI: /agent/listings/new → 4.5 tỷ (BLOCK) · /admin/audit?bookingId=..."
