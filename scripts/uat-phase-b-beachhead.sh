#!/usr/bin/env bash
# Phase B — UAT 7 kịch bản beachhead (SRS P0-S3 WP-S3-06)
set -euo pipefail

BASE="${1:-https://ngoinhahomnay.vn/api/v1}"
TENANT="ten_dev_01"
EMAIL="agent@sunrise-dev.vn"
PASS="Agent123!"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=== Phase B UAT Beachhead ==="
echo "BASE=$BASE"

# 1. Search intent + map + saved search surface
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/search/units?transactionType=rent&limit=5" \
  -H "X-Tenant-Id: $TENANT")
[ "$code" = "200" ] && ok "UAT-1a tab Thuê search" || bad "UAT-1a ($code)"

map=$(curl -sf "$BASE/search/map" -H "X-Tenant-Id: $TENANT" || true)
echo "$map" | grep -q '"pins"' && ok "UAT-1b map pins" || bad "UAT-1b map"

# 2. Lead dedup — endpoint reachable (full dedup needs POST)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/leads" \
  -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json" \
  -d '{"fullName":"UAT","phone":"0900000099","source":"UAT_B","message":"phase b"}')
[ "$code" = "201" ] || [ "$code" = "200" ] || [ "$code" = "409" ] && ok "UAT-2 lead create/dedup path ($code)" || bad "UAT-2 ($code)"

# 3. Viewing availability / conflict API
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/viewings/availability?agentId=usr_agent_01" \
  -H "X-Tenant-Id: $TENANT")
[ "$code" = "200" ] && ok "UAT-3 viewing availability" || bad "UAT-3 ($code)"

# 4. Dispute + registration endpoints exist
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/disputes" -H "X-Tenant-Id: $TENANT")
[ "$code" = "200" ] || [ "$code" = "401" ] && ok "UAT-4 disputes API ($code)" || bad "UAT-4 ($code)"

# Login for authenticated checks
TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true)

if [ -n "$TOKEN" ]; then
  AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")

  # 5. HOT SLA escalate endpoint
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/crm/today" "${AUTH[@]}")
  [ "$code" = "200" ] && ok "UAT-5 CRM today / SLA surface" || bad "UAT-5 ($code)"

  # 6. Booking with leadId regression surface
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/bookings?limit=1" "${AUTH[@]}")
  [ "$code" = "200" ] && ok "UAT-6 bookings API" || bad "UAT-6 ($code)"

  # 7. Routing rules persist (DB)
  rules=$(curl -sf "$BASE/crm/routing-rules" "${AUTH[@]}" || true)
  echo "$rules" | grep -q '"persisted":true' && ok "UAT-7 routing rules persisted" || bad "UAT-7 routing"

  # Phase B extras
  drill=$(curl -sf "$BASE/dsr/projects/prj_sunrise/drill" -H "X-Tenant-Id: $TENANT" || true)
  echo "$drill" | grep -q '"breadcrumbs"' && ok "DSR drill-down" || bad "DSR drill"

  weekly=$(curl -sf "$BASE/crm/kpi/weekly" "${AUTH[@]}" || true)
  echo "$weekly" | grep -q 'beachheadReady' && ok "KPI weekly pack" || bad "KPI weekly"
else
  bad "Auth login failed — skip UAT 5-7"
fi

echo ""
echo "=== RESULT: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ]
