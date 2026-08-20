#!/usr/bin/env bash
# P3-S4 — OP-WIN-05 vertical slice E2E (UAT-01 → UAT-05 subset + commission)
# Usage: ./scripts/uat-p3-s4.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq, node

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
UNIT="${SLICE_UNIT_ID:-un_03}"
WEBHOOK_SECRET="${WEBHOOK_HMAC_SECRET:-wereal-dev-webhook-secret-change-me}"
STAMP=$(date +%s)
PHONE="+8490${STAMP: -8}"

echo "=== P3-S4 OP-WIN-05 Vertical Slice E2E ==="
echo "BASE=$BASE · unit=$UNIT · phone=$PHONE"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# --- UAT-01: search → lead → scored ---
echo ""
echo "--- UAT-01 Search → lead → scored ---"

search=$(curl -sf "$BASE/search/units?bedrooms=2" -H "X-Tenant-Id: $TENANT")
search_count=$(echo "$search" | jq '.data | length')
if [ "$search_count" -lt 1 ]; then
  echo "✗ Public search returned no listings"
  exit 1
fi
echo "✓ GET /search/units · $search_count listing(s)"

lead=$(curl -sf -X POST "$BASE/leads" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg u "$UNIT" --arg p "$PHONE" \
    '{fullName:"P3-S4 Pilot",phone:$p,source:"UAT_P3S4",unitId:$u,message:"Vertical slice lead"}')")
LD=$(echo "$lead" | jq -r '.data.id')
echo "✓ POST /leads · leadId=$LD"

lead_detail=$(curl -sf "${AUTH[@]}" "$BASE/leads/$LD")
score_status=$(echo "$lead_detail" | jq -r '.data.attributes.scoreStatus // empty')
score=$(echo "$lead_detail" | jq -r '.data.attributes.score // empty')
if [ "$score_status" != "SCORED" ]; then
  echo "✗ Lead scoreStatus expected SCORED got $score_status"
  exit 1
fi
echo "✓ Lead SCORED · score=$score"

audit_lead=$(curl -sf "${AUTH[@]}" "$BASE/audit/events?entityType=lead&entityId=$LD&limit=5")
audit_count=$(echo "$audit_lead" | jq '.data | length')
if [ "$audit_count" -lt 1 ]; then
  echo "✗ Lead not visible in audit"
  exit 1
fi
echo "✓ Lead in CRM audit ($audit_count events)"

# --- UAT-02: GR → listing → approve → search index ---
echo ""
echo "--- UAT-02 Listing GR → approve → publish ---"

unit=$(curl -sf "${AUTH[@]}" "$BASE/units/$UNIT")
gr_price=$(echo "$unit" | jq -r '.data.attributes.basePrice')
gr_version=$(echo "$unit" | jq -r '.data.attributes.version')
echo "✓ GR unit $UNIT · basePrice=$gr_price · version=$gr_version"

# Demonstrate GR patch path (optimistic lock, same price OK)
patch=$(curl -sf -X PATCH "${AUTH[@]}" "$BASE/units/$UNIT" \
  -d "$(jq -nc --argjson v "$gr_version" --argjson p "$gr_price" \
    '{expectedVersion:$v,basePrice:$p}')")
new_version=$(echo "$patch" | jq -r '.data.attributes.version')
echo "✓ PATCH unit GR · version $gr_version → $new_version"

drift=$(curl -sf -X POST "${AUTH[@]}" "$BASE/listings/drift-check" \
  -d "{\"unitId\":\"$UNIT\",\"priceDisplay\":$gr_price}")
drift_status=$(echo "$drift" | jq -r '.data.status')
if [ "$drift_status" != "PASS" ]; then
  echo "✗ drift-check expected PASS got $drift_status"
  exit 1
fi
echo "✓ Anti-drift PASS @ GR price"

listing=$(curl -sf -X POST "${AUTH[@]}" "$BASE/listings" \
  -d "$(jq -nc --arg u "$UNIT" --argjson p "$gr_price" --arg t "P3-S4 $STAMP" \
    '{unitId:$u,title:$t,description:"OP-WIN-05 vertical slice",priceDisplay:$p}')")
LS=$(echo "$listing" | jq -r '.data.id')
echo "✓ Draft listing $LS"

sub_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "$BASE/listings/$LS/submit-review")
if [ "$sub_code" != "200" ] && [ "$sub_code" != "201" ]; then
  echo "✗ submit-review expected 200/201 got $sub_code"
  exit 1
fi
echo "✓ submit-review OK"

appr_code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${AUTH[@]}" "$BASE/listings/$LS/approve")
if [ "$appr_code" != "200" ]; then
  echo "✗ approve expected 200 got $appr_code"
  exit 1
fi
echo "✓ listing approved → PUBLISHED"

search_unit=$(curl -sf "$BASE/search/units/$UNIT" -H "X-Tenant-Id: $TENANT")
indexed_title=$(echo "$search_unit" | jq -r '.data.attributes.title // empty')
if [ -z "$indexed_title" ] || [ "$indexed_title" = "null" ]; then
  echo "✗ Search index missing unit $UNIT detail"
  exit 1
fi
echo "✓ Search index updated · GET /search/units/$UNIT"

# --- UAT-03: book → pay → ledger → reconcile ---
echo ""
echo "--- UAT-03 Book → pay → ledger ---"

IDEM="p3s4-bk-$STAMP"
create=$(curl -sf -X POST "$BASE/bookings" "${AUTH[@]}" \
  -H "X-Idempotency-Key: $IDEM" \
  -d "$(jq -nc --arg u "$UNIT" --arg l "$LD" \
    '{unitId:$u,leadId:$l,depositAmount:50000000}')")
BK=$(echo "$create" | jq -r '.data.id')
bk_status=$(echo "$create" | jq -r '.data.attributes.status')
echo "✓ Booking $BK status=$bk_status"

PI=$(curl -sf -X POST "$BASE/payment-intents" "${AUTH[@]}" \
  -d "{\"bookingId\":\"$BK\",\"amount\":50000000,\"method\":\"MOCK\"}" | jq -r '.data.id')
curl -sf "$BASE/payments/mock/complete?intentId=$PI&amount=50000000" >/dev/null || true

BODY=$(jq -nc --arg e "evt_p3s4_$STAMP" --arg pi "$PI" \
  '{eventId:$e,eventType:"payment.success",transactionId:"P3S4_TXN",amount:50000000,paymentIntentId:$pi,tenantId:"ten_dev_01"}')
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "$WEBHOOK_SECRET" "$BODY")
curl -sf -X POST "$BASE/webhooks/payment" -H 'Content-Type: application/json' -H "X-Signature: $SIG" -d "$BODY" >/dev/null
echo "✓ Payment webhook → DEPOSITED path"

bk_after=$(curl -sf "${AUTH[@]}" "$BASE/bookings/$BK")
dep_status=$(echo "$bk_after" | jq -r '.data.attributes.status')
if [ "$dep_status" != "DEPOSITED" ]; then
  echo "✗ Booking expected DEPOSITED got $dep_status"
  exit 1
fi

entries=$(curl -sf "${AUTH[@]}" "$BASE/ledger/entries?bookingId=$BK")
debit=$(echo "$entries" | jq '[.data[] | select(.attributes.side=="DEBIT") | .attributes.amount] | add // 0')
credit=$(echo "$entries" | jq '[.data[] | select(.attributes.side=="CREDIT") | .attributes.amount] | add // 0')
if [ "$debit" != "$credit" ] || [ "$debit" -lt 1 ]; then
  echo "✗ Ledger not balanced debit=$debit credit=$credit"
  exit 1
fi
echo "✓ Ledger balanced · ${debit} VND"

DAY=$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)
today_rec=$(curl -sf "${AUTH[@]}" "$BASE/ledger/reconciliation?date=$DAY&refresh=true")
if [ "$(echo "$today_rec" | jq -r '.data.attributes.status')" != "MATCHED" ]; then
  echo "✗ Today reconcile not MATCHED"
  exit 1
fi
echo "✓ Reconcile MATCHED ($DAY)"

# --- P3-S4-04: commission snapshot CALCULATED ---
echo ""
echo "--- P3-S4-04 Commission snapshot (UC-COM-02) ---"

close=$(curl -sf -X POST "${AUTH[@]}" "$BASE/commission/deals/$BK/close")
snap_status=$(echo "$close" | jq -r '.data.attributes.status')
snap_id=$(echo "$close" | jq -r '.data.id')
entry_count=$(echo "$close" | jq '.entries | length')

if [ "$snap_status" != "CALCULATED" ]; then
  echo "✗ Snapshot expected CALCULATED got $snap_status"
  exit 1
fi
if [ "$entry_count" -lt 1 ]; then
  echo "✗ Snapshot missing commission entries"
  exit 1
fi
echo "✓ Commission snapshot $snap_id · CALCULATED · $entry_count entries"

listed=$(curl -sf "${AUTH[@]}" "$BASE/commission/snapshots?bookingId=$BK")
listed_status=$(echo "$listed" | jq -r '.data[0].attributes.status // empty')
[ "$listed_status" = "CALCULATED" ] && echo "✓ GET /commission/snapshots?bookingId=$BK"

# --- OP-WIN-05 evidence summary ---
echo ""
echo "=== OP-WIN-05 vertical slice evidence ==="
echo "  Lead:      $LD (SCORED)"
echo "  Listing:   $LS (PUBLISHED · search index OK)"
echo "  Booking:   $BK (DEPOSITED)"
echo "  Payment:   $PI"
echo "  Snapshot:  $snap_id (CALCULATED)"
echo ""
echo "=== P3-S4 automation PASS ==="
echo "Manual: PO sign-off in docs/uat/UAT-P0-pilot-checklist.md"
echo "UI: /public/search · /agent/listings/new · /admin/moderation · /finance/reconciliation"
