#!/usr/bin/env bash
# Phase C — UAT expansion (walk-in QR, chat capture, seeker buyer portal)
set -euo pipefail

BASE="${1:-https://ngoinhahomnay.vn/api/v1}"
TENANT="ten_dev_01"
EMAIL="agent@sunrise-dev.vn"
PASS="Agent123!"

pass=0
fail=0
ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "=== Phase C UAT Expansion ==="
echo "BASE=$BASE"

# 1. Walk-in gallery public surface
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/walk-in/galleries/wig_sunrise_gallery_v1" \
  -H "X-Tenant-Id: $TENANT")
[ "$code" = "200" ] && ok "UAT-C1 walk-in gallery ($code)" || bad "UAT-C1 ($code)"

# 2. Walk-in check-in → lead
checkin=$(curl -sf -X POST "$BASE/walk-in/galleries/wig_sunrise_gallery_v1/check-in" \
  -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json" \
  -d '{"fullName":"UAT WalkIn","phone":"0900000088","consent":{"privacyAccepted":true,"privacyPolicyVersion":"2026-07-01"}}' || true)
echo "$checkin" | grep -q '"leadId"' && ok "UAT-C2 walk-in check-in lead" || bad "UAT-C2 check-in"

# 3. Chat session + message with phone capture
session=$(curl -sf -X POST "$BASE/ai/chat/sessions" -H "X-Tenant-Id: $TENANT" || true)
sid=$(echo "$session" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('sessionId',''))" 2>/dev/null || true)
if [ -n "$sid" ]; then
  msg=$(curl -sf -X POST "$BASE/ai/chat/messages" \
    -H "X-Tenant-Id: $TENANT" -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$sid\",\"text\":\"Em muốn xem nhà cuối tuần, SĐT 0900000077\",\"captureLead\":{\"phone\":\"0900000077\"}}" || true)
  echo "$msg" | grep -q '"leadId"' && ok "UAT-C3 chat lead capture" || bad "UAT-C3 chat"
else
  bad "UAT-C3 chat session"
fi

# 4. Buyer deals require seeker auth (empty without token)
deals=$(curl -sf "$BASE/portal/buyer/deals" -H "X-Tenant-Id: $TENANT" || true)
echo "$deals" | grep -q '"requiresSeekerAuth":true' && ok "UAT-C4 buyer deals gated" || bad "UAT-C4 buyer gate"

# 5. Agent walk-in list (auth)
TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null || true)
if [ -n "$TOKEN" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/walk-in/galleries" \
    -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")
  [ "$code" = "200" ] && ok "UAT-C5 agent galleries ($code)" || bad "UAT-C5 ($code)"
else
  bad "UAT-C5 agent login"
fi

echo ""
echo "Pass: $pass · Fail: $fail"
[ "$fail" -eq 0 ]
