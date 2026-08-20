#!/usr/bin/env bash
# T4-S1 — TC-12 HOT conversion acceptance smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="ten_dev_01"
STAMP=$(date +%s)
PHONE="+8494${STAMP: -8}"

echo "=== TC-12 HOT Conversion UAT ==="

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo "--- Meta lead → score → HOT ---"
lead=$(curl -sf -X POST "${AUTH[@]}" "$BASE/crm/leads" \
  -d "$(jq -nc --arg p "$PHONE" --arg n "TC12 HOT $STAMP" \
    '{fullName:$n,phone:$p,source:"META_LEAD",unitId:"un_01",consent:{privacyAccepted:true,privacyPolicyVersion:"2026-07-01"}}')")
LEAD_ID=$(echo "$lead" | jq -r '.data.id // .data.attributes.id // empty')
if [ -z "$LEAD_ID" ]; then echo "✗ lead create failed"; exit 1; fi

for i in $(seq 1 15); do
  tier=$(curl -sf "${AUTH[@]}" "$BASE/crm/leads/$LEAD_ID" | jq -r '.data.attributes.tier // empty')
  score=$(curl -sf "${AUTH[@]}" "$BASE/crm/leads/$LEAD_ID" | jq -r '.data.attributes.score // 0')
  status=$(curl -sf "${AUTH[@]}" "$BASE/crm/leads/$LEAD_ID" | jq -r '.data.attributes.scoreStatus // empty')
  if [ "$status" = "SCORED" ] && [ "$tier" = "HOT" ]; then
    echo "✓ lead scored HOT score=$score within poll $i"
    break
  fi
  sleep 1
done

curl -sf "${AUTH[@]}" "$BASE/crm/leads/$LEAD_ID" | jq -e '.data.attributes.tier == "HOT"' >/dev/null
echo "✓ HOT tier confirmed (threshold ≥85)"

echo ""
echo "--- Score explain ---"
curl -sf "${AUTH[@]}" "$BASE/ai/scoring/leads/$LEAD_ID" | jq -e '.data.tier == "HOT"' >/dev/null
echo "✓ explain panel returns HOT tier"

echo ""
echo "--- HOT conversion metrics ---"
curl -sf "${AUTH[@]}" "$BASE/ai/scoring/hot-conversion" | jq -e '.data.hotTotal >= 0' >/dev/null
curl -sf "${AUTH[@]}" "$BASE/analytics/admin/dashboard" | jq -e '.data.attributes.hotConversion != null' >/dev/null
echo "✓ hotConversion on agent/admin analytics"

echo ""
echo "=== uat-tc12-hot PASS ==="
