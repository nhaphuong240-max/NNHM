#!/usr/bin/env bash
# P3-S5 — OP-WIN-06 live integrations + settlement (UC-NW-01/03 · UC-PAY-01/04 · UC-ID-05)
# Usage: ./scripts/uat-p3-s5.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq, node
#
# Staging payout evidence (SUBMITTED badge):
#   SETTLEMENT_PAYOUT_ENABLED=true SETTLEMENT_PAYOUT_STUB=true npm run start:dev

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
STAMP=$(date +%s)
PHONE="+8491${STAMP: -8}"

echo "=== P3-S5 OP-WIN-06 Live integrations + settlement ==="
echo "BASE=$BASE · tenant=$TENANT"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# --- P3-S5-01: Zalo ZNS send → DELIVERED ---
echo ""
echo "--- P3-S5-01 Zalo ZNS delivery ---"

zns=$(curl -sf -X POST "${AUTH[@]}" "$BASE/integrations/zalo/zns/send" \
  -d "$(jq -nc --arg p "$PHONE" '{phone:$p,templateId:"zns_lead_ack_v1",params:{name:"P3-S5"}}')")
ZNS_ID=$(echo "$zns" | jq -r '.deliveryId')
zns_status=$(echo "$zns" | jq -r '.status')
if [ "$zns_status" != "SENT" ]; then
  echo "✗ ZNS send expected SENT got $zns_status"
  exit 1
fi
echo "✓ POST /integrations/zalo/zns/send · deliveryId=$ZNS_ID status=$zns_status"

delivered=$(curl -sf -X PATCH "${AUTH[@]}" "$BASE/integrations/zalo/zns/deliveries/$ZNS_ID/delivered")
if [ "$(echo "$delivered" | jq -r '.status')" != "DELIVERED" ]; then
  echo "✗ ZNS markDelivered expected DELIVERED"
  exit 1
fi
echo "✓ PATCH zns/deliveries/$ZNS_ID/delivered · DELIVERED"

# --- P3-S5-02: SMS OTP sandbox vs live ---
echo ""
echo "--- P3-S5-02 SMS OTP path ---"

sms_status=$(curl -sf "${AUTH[@]}" "$BASE/integrations/sms/status")
sms_mode=$(echo "$sms_status" | jq -r '.data.graphMode')
echo "  SMS graphMode=$sms_mode"

sms=$(curl -sf -X POST "${AUTH[@]}" "$BASE/integrations/sms/send" \
  -d "$(jq -nc --arg p "$PHONE" '{phone:$p,templateId:"sms_otp_v1",params:{}}')")
SMS_OTP=$(echo "$sms" | jq -r '.otp // empty')
if [ "$sms_mode" = "SANDBOX" ]; then
  if [ "$SMS_OTP" != "123456" ]; then
    echo "✗ SMS sandbox OTP expected 123456 got $SMS_OTP"
    exit 1
  fi
  echo "✓ SMS sandbox OTP=123456 (dev default)"
else
  if [ -z "$SMS_OTP" ] || [ "$SMS_OTP" = "123456" ]; then
    echo "✗ SMS live OTP must not be 123456 (got $SMS_OTP)"
    exit 1
  fi
  echo "✓ SMS live OTP ≠ 123456 · graphMode=$sms_mode"
fi

# --- P3-S5-03: VNPay sandbox txn ref ---
echo ""
echo "--- P3-S5-03 VNPay sandbox payment intent ---"

pi=$(curl -sf -X POST "${AUTH[@]}" "$BASE/payment-intents" \
  -d '{"bookingId":"bk_contract01","amount":50000000,"method":"VNPAY"}')
PI_METHOD=$(echo "$pi" | jq -r '.data.attributes.method')
GATEWAY_REF=$(echo "$pi" | jq -r '.data.attributes.gatewayRef // empty')
PAY_URL=$(echo "$pi" | jq -r '.data.attributes.paymentUrl // empty')

if [ "$PI_METHOD" != "VNPAY" ]; then
  echo "✗ Payment intent method expected VNPAY got $PI_METHOD"
  exit 1
fi
if [ -z "$GATEWAY_REF" ] || [ "$GATEWAY_REF" = "null" ]; then
  echo "✗ VNPay gatewayRef missing"
  exit 1
fi
if [[ "$PAY_URL" != *"vnp_TxnRef="* ]]; then
  echo "✗ VNPay paymentUrl missing vnp_TxnRef"
  exit 1
fi
echo "✓ POST /payment-intents VNPAY · gatewayRef=$GATEWAY_REF"

# --- P3-S5-05: BR-23 KYC block → approve → settle ---
echo ""
echo "--- P3-S5-05 BR-23 KYC + settlement (OP-WIN-06) ---"

settle_status=$(curl -sf "${AUTH[@]}" "$BASE/commission/settlement/status")
payout_enabled=$(echo "$settle_status" | jq -r '.payout.enabled // false')
payout_stub=$(echo "$settle_status" | jq -r '.payout.stubMode // false')
echo "  payout enabled=$payout_enabled stub=$payout_stub"

lines=$(curl -sf "${AUTH[@]}" "$BASE/commission/lines?payoutStatus=PENDING")
AGENT_LINE=$(echo "$lines" | jq -r '.data[] | select(.id=="ce_settle01") | .id // empty')
AGENCY_LINE=$(echo "$lines" | jq -r '.data[] | select(.id=="ce_settle02") | .id // empty')

if [ -z "$AGENT_LINE" ] || [ -z "$AGENCY_LINE" ]; then
  echo "  Seed lines ce_settle01/02 not PENDING — creating fresh deal for settlement..."
  UNIT="${SETTLE_UNIT_ID:-un_02}"
  IDEM="p3s5-bk-$STAMP"
  create=$(curl -sf -X POST "$BASE/bookings" "${AUTH[@]}" \
    -H "X-Idempotency-Key: $IDEM" \
    -d "$(jq -nc --arg u "$UNIT" '{unitId:$u,depositAmount:50000000}')")
  BK=$(echo "$create" | jq -r '.data.id')
  PI2=$(curl -sf -X POST "$BASE/payment-intents" "${AUTH[@]}" \
    -d "$(jq -nc --arg b "$BK" '{bookingId:$b,amount:50000000,method:"MOCK"}')" | jq -r '.data.id')
  WEBHOOK_SECRET="${WEBHOOK_HMAC_SECRET:-wereal-dev-webhook-secret-change-me}"
  BODY=$(jq -nc --arg e "evt_p3s5_$STAMP" --arg pi "$PI2" \
    '{eventId:$e,eventType:"payment.success",transactionId:"P3S5_TXN",amount:50000000,paymentIntentId:$pi,tenantId:"ten_dev_01"}')
  SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "$WEBHOOK_SECRET" "$BODY")
  curl -sf -X POST "$BASE/webhooks/payment" -H 'Content-Type: application/json' -H "X-Signature: $SIG" -d "$BODY" >/dev/null
  close=$(curl -sf -X POST "${AUTH[@]}" "$BASE/commission/deals/$BK/close")
  AGENT_LINE=$(echo "$close" | jq -r '.entries[] | select(.attributes.recipientType=="AGENT" or .attributes.recipientType=="USER") | .id' | head -1)
  AGENCY_LINE=$(echo "$close" | jq -r '.entries[] | select(.attributes.recipientType=="AGENCY") | .id' | head -1)
  echo "  Fresh lines agent=$AGENT_LINE agency=$AGENCY_LINE booking=$BK"
fi

agency_eligible=$(curl -sf "${AUTH[@]}" "$BASE/commission/lines" \
  | jq -r --arg id "$AGENCY_LINE" '.data[] | select(.id==$id) | .attributes.payoutEligible')
if [ "$agency_eligible" = "true" ]; then
  echo "  Agency line already payoutEligible — resetting KYC PENDING for BR-23 demo..."
  curl -sf -X POST "${AUTH[@]}" "$BASE/kyc/profiles/AGENCY/agcy_sunrise/resubmit" \
    -d '{"reason":"P3-S5 UAT reset"}' >/dev/null || true
fi

agency_eligible=$(curl -sf "${AUTH[@]}" "$BASE/commission/lines" \
  | jq -r --arg id "$AGENCY_LINE" '.data[] | select(.id==$id) | .attributes.payoutEligible')
if [ "$agency_eligible" != "false" ]; then
  echo "✗ Agency line should be KYC-blocked (payoutEligible=false) got $agency_eligible"
  exit 1
fi
echo "✓ Agency line KYC-blocked (BR-23)"

block_code=$(curl -s -o /tmp/p3s5-approve-both.json -w '%{http_code}' -X POST "${AUTH[@]}" \
  "$BASE/commission/lines/approve" \
  -d "$(jq -nc --arg a "$AGENT_LINE" --arg g "$AGENCY_LINE" '{entryIds:[$a,$g]}')")
if [ "$block_code" != "422" ]; then
  echo "✗ Approve both lines expected 422 got $block_code"
  cat /tmp/p3s5-approve-both.json
  exit 1
fi
echo "✓ Approve agent+agency blocked (422 BR-23)"

curl -sf -X POST "${AUTH[@]}" "$BASE/commission/lines/approve" \
  -d "$(jq -nc --arg a "$AGENT_LINE" '{entryIds:[$a]}')" >/dev/null
echo "✓ Approved agent line only"

curl -sf -X POST "${AUTH[@]}" "$BASE/kyc/profiles/AGENCY/agcy_sunrise/approve" \
  -d '{"notes":"P3-S5 KYB approved for settlement demo"}' >/dev/null
echo "✓ KYC AGENCY/agcy_sunrise APPROVED"

curl -sf -X POST "${AUTH[@]}" "$BASE/commission/lines/approve" \
  -d "$(jq -nc --arg g "$AGENCY_LINE" '{entryIds:[$g]}')" >/dev/null
echo "✓ Approved agency line"

run=$(curl -sf -X POST "${AUTH[@]}" "$BASE/commission/settlement/runs" \
  -d "$(jq -nc --arg a "$AGENT_LINE" --arg g "$AGENCY_LINE" \
    '{label:"P3-S5 OP-WIN-06",entryIds:[$a,$g]}')")
RUN_ID=$(echo "$run" | jq -r '.data.id')
run_status=$(echo "$run" | jq -r '.data.attributes.status')
payout_status=$(echo "$run" | jq -r '.data.attributes.payout.status // empty')
total=$(echo "$run" | jq -r '.data.attributes.totalAmount')

if [ "$run_status" != "COMPLETED" ]; then
  echo "✗ Settlement run expected COMPLETED got $run_status"
  exit 1
fi
echo "✓ Settlement run $RUN_ID · COMPLETED · total=$total VND"

paid_agent=$(echo "$run" | jq -r --arg id "$AGENT_LINE" '.entries[] | select(.id==$id) | .attributes.payoutStatus')
paid_agency=$(echo "$run" | jq -r --arg id "$AGENCY_LINE" '.entries[] | select(.id==$id) | .attributes.payoutStatus')
if [ "$paid_agent" != "PAID" ] || [ "$paid_agency" != "PAID" ]; then
  echo "✗ Entries expected PAID got agent=$paid_agent agency=$paid_agency"
  exit 1
fi
echo "✓ Commission entries PAID"

if [ "$payout_enabled" = "true" ]; then
  if [ "$payout_status" != "SUBMITTED" ]; then
    echo "✗ Payout enabled but status expected SUBMITTED got $payout_status"
    exit 1
  fi
  echo "✓ Payout rail SUBMITTED (OP-WIN-06 staging evidence)"
else
  if [ "$payout_status" = "SUBMITTED" ]; then
    echo "✓ Payout SUBMITTED"
  else
    echo "  Payout SKIPPED (dev default — set SETTLEMENT_PAYOUT_ENABLED=true for staging)"
  fi
fi

# --- Evidence summary ---
echo ""
echo "=== OP-WIN-06 evidence ==="
echo "  ZNS:       $ZNS_ID → DELIVERED"
echo "  SMS:       graphMode=$sms_mode · OTP checked"
echo "  VNPay:     gatewayRef=$GATEWAY_REF"
echo "  Settlement: $RUN_ID · payout=$payout_status"
echo ""
echo "=== P3-S5 automation PASS ==="
echo "Staging: enable payout per docs/dev/staging-env.md"
echo "UI: /admin/integrations/zalo · /admin/integrations/sms · /finance/settlement"
