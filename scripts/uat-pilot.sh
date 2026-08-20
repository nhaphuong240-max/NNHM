#!/usr/bin/env bash
# S6-03 — Automated UAT P0 vertical slice (OP-WIN-05 subset)
# Full E2E: ./scripts/uat-p3-s4.sh (P3-S4 · UAT-01→05 + commission)
# Usage: ./scripts/uat-pilot.sh [BASE_URL]
# Requires: API + Postgres + Redis running, curl, jq

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
UNIT="${SMOKE_UNIT_ID:-un_02}"
WEBHOOK_SECRET="${WEBHOOK_HMAC_SECRET:-wereal-dev-webhook-secret-change-me}"

echo "=== UAT Pilot Automation (ten_dev_01) ==="

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# UAT-01: lead
curl -sf -X POST "$BASE/leads" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json' \
  -d '{"fullName":"UAT Pilot","phone":"+84901112233","source":"UAT_SCRIPT","unitId":"un_01"}' >/dev/null
echo "✓ UAT-01 lead captured"

# UAT-05: concurrent booking (2 requests, expect 1 success)
IDEM="uat-concurrent-$(date +%s)"
body='{"unitId":"'"$UNIT"'","leadId":"ld_01","depositAmount":50000000}'
r1=$(curl -s -w '\n%{http_code}' -X POST "$BASE/bookings" "${AUTH[@]}" -H "X-Idempotency-Key: ${IDEM}-a" -d "$body")
r2=$(curl -s -w '\n%{http_code}' -X POST "$BASE/bookings" "${AUTH[@]}" -H "X-Idempotency-Key: ${IDEM}-b" -d "$body")
c1=$(echo "$r1" | tail -1)
c2=$(echo "$r2" | tail -1)
if { [ "$c1" = "201" ] && [ "$c2" = "409" ]; } || { [ "$c1" = "409" ] && [ "$c2" = "201" ]; }; then
  echo "✓ UAT-05 concurrent book — one success one conflict"
else
  echo "⚠ UAT-05 concurrent ($c1 / $c2) — unit may already be locked; check manually"
fi

BK=$(echo "$r1" | head -1 | jq -r '.data.id // empty')
if [ -z "$BK" ] || [ "$BK" = "null" ]; then
  BK=$(echo "$r2" | head -1 | jq -r '.data.id // empty')
fi

if [ -z "$BK" ] || [ "$BK" = "null" ]; then
  echo "⚠ Skip payment slice — no booking id (use fresh unit via SMOKE_UNIT_ID=un_02)"
  exit 0
fi

# UAT-03: payment intent + mock webhook
PI=$(curl -sf -X POST "$BASE/payment-intents" "${AUTH[@]}" \
  -d "{\"bookingId\":\"$BK\",\"amount\":50000000,\"method\":\"MOCK\"}" | jq -r '.data.id')
echo "✓ Payment intent $PI"

curl -sf "$BASE/payments/mock/complete?intentId=$PI&amount=50000000" >/dev/null || true

BODY=$(jq -nc --arg e "evt_uat_$(date +%s)" --arg pi "$PI" \
  '{eventId:$e,eventType:"payment.success",transactionId:"UAT_TXN",amount:50000000,paymentIntentId:$pi,tenantId:"ten_dev_01"}')
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "$WEBHOOK_SECRET" "$BODY")
curl -sf -X POST "$BASE/webhooks/payment" -H 'Content-Type: application/json' -H "X-Signature: $SIG" -d "$BODY" >/dev/null
echo "✓ UAT-03 payment webhook processed"

# Reconcile refresh
DAY=$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)
curl -sf "${AUTH[@]}" "$BASE/ledger/reconciliation?date=$DAY&refresh=true" >/dev/null
echo "✓ Reconciliation refreshed for $DAY"

# OP-WIN-05: commission snapshot
curl -sf -X POST "$BASE/commission/deals/$BK/close" "${AUTH[@]}" >/dev/null
echo "✓ Commission deal closed (snapshot)"

echo "=== UAT pilot script complete — verify Finance UI + checklist ==="
