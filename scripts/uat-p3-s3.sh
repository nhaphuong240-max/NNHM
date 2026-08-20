#!/usr/bin/env bash
# P3-S3 — OP-WIN-02 reconcile streak + UAT-03 book→pay→ledger
# Usage: ./scripts/uat-p3-s3.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq, node

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
UNIT="${RECON_UNIT_ID:-un_02}"
WEBHOOK_SECRET="${WEBHOOK_HMAC_SECRET:-wereal-dev-webhook-secret-change-me}"

echo "=== P3-S3 UAT-03 + OP-WIN-02 Reconcile Streak ==="
echo "BASE=$BASE · tenant=$TENANT"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# --- UAT-03: book → pay → ledger ---
echo ""
echo "--- UAT-03 Book → pay → ledger ---"

IDEM="uat03-$(date +%s)"
create=$(curl -sf -X POST "$BASE/bookings" "${AUTH[@]}" \
  -H "X-Idempotency-Key: $IDEM" \
  -d "{\"unitId\":\"$UNIT\",\"leadId\":\"ld_01\",\"depositAmount\":50000000}")
BK=$(echo "$create" | jq -r '.data.id')
echo "✓ Booking RESERVED $BK on $UNIT"

PI=$(curl -sf -X POST "$BASE/payment-intents" "${AUTH[@]}" \
  -d "{\"bookingId\":\"$BK\",\"amount\":50000000,\"method\":\"MOCK\"}" | jq -r '.data.id')
echo "✓ Payment intent $PI"

curl -sf "$BASE/payments/mock/complete?intentId=$PI&amount=50000000" >/dev/null || true

BODY=$(jq -nc --arg e "evt_uat03_$(date +%s)" --arg pi "$PI" \
  '{eventId:$e,eventType:"payment.success",transactionId:"UAT03_TXN",amount:50000000,paymentIntentId:$pi,tenantId:"ten_dev_01"}')
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "$WEBHOOK_SECRET" "$BODY")
curl -sf -X POST "$BASE/webhooks/payment" -H 'Content-Type: application/json' -H "X-Signature: $SIG" -d "$BODY" >/dev/null
echo "✓ Payment webhook processed"

entries=$(curl -sf "${AUTH[@]}" "$BASE/ledger/entries?bookingId=$BK")
entry_count=$(echo "$entries" | jq '.data | length')
debit=$(echo "$entries" | jq '[.data[] | select(.attributes.side=="DEBIT") | .attributes.amount] | add // 0')
credit=$(echo "$entries" | jq '[.data[] | select(.attributes.side=="CREDIT") | .attributes.amount] | add // 0')

if [ "$entry_count" -lt 2 ]; then
  echo "✗ Expected ≥2 ledger lines, got $entry_count"
  exit 1
fi
if [ "$debit" != "$credit" ]; then
  echo "✗ Ledger unbalanced debit=$debit credit=$credit"
  exit 1
fi
echo "✓ Ledger balanced · $entry_count lines · ${debit} VND"

DAY=$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)
today=$(curl -sf "${AUTH[@]}" "$BASE/ledger/reconciliation?date=$DAY&refresh=true")
today_status=$(echo "$today" | jq -r '.data.attributes.status')
if [ "$today_status" != "MATCHED" ]; then
  echo "✗ Today reconcile expected MATCHED got $today_status"
  echo "$today" | jq '.data.attributes.discrepancies'
  exit 1
fi
echo "✓ Today ($DAY) reconcile MATCHED"

# --- OP-WIN-02: 7-day streak ---
echo ""
echo "--- OP-WIN-02 7-day reconcile streak ---"

streak=$(curl -sf "${AUTH[@]}" "$BASE/ledger/reconciliation?days=7&refresh=true")
matched=$(echo "$streak" | jq '.meta.matchedDays')
total=$(echo "$streak" | jq '.meta.totalDays')
rate=$(echo "$streak" | jq '.meta.matchRate')
consecutive=$(echo "$streak" | jq '.meta.consecutiveMatchedDays')
opwin=$(echo "$streak" | jq '.meta.opWin02Passed')

echo "Match rate: $matched/$total ($rate) · streak=$consecutive · opWin02=$opwin"

rate_ok=$(echo "$streak" | jq '.meta.matchRate >= 1 and .meta.matchedDays == .meta.totalDays')
if [ "$rate_ok" != "true" ]; then
  echo "✗ Expected 100% match rate over 7 days"
  echo "$streak" | jq '.data[] | {date, status: .attributes.status}'
  exit 1
fi

if [ "$consecutive" -lt 7 ]; then
  echo "✗ Expected consecutiveMatchedDays >= 7, got $consecutive"
  exit 1
fi

if [ "$opwin" != "true" ]; then
  echo "✗ opWin02Passed should be true"
  exit 1
fi
echo "✓ OP-WIN-02 streak 7/7 MATCHED"

# --- P3-S3-01: daily job smoke ---
echo ""
echo "--- P3-S3-01 Daily reconcile job ---"
job=$(curl -sf -X POST "${AUTH[@]}" "$BASE/ledger/reconciliation/run-daily")
job_date=$(echo "$job" | jq -r '.data.reportDate')
job_count=$(echo "$job" | jq '.data.tenants | length')
echo "✓ run-daily job date=$job_date tenants=$job_count"

echo ""
echo "=== P3-S3 automation PASS ==="
echo "UI: http://localhost:5174/finance/reconciliation · streak badge 7/7"
echo "Sign-off: docs/uat/UAT-P0-pilot-checklist.md UAT-03"
