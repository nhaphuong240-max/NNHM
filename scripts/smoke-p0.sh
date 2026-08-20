#!/usr/bin/env bash
# S6-06 — P0 regression smoke (R1.0)
# Usage: ./scripts/smoke-p0.sh [BASE_URL]
# Requires: curl, jq (optional but recommended)

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
EMAIL="admin@sunrise-dev.vn"
PASS="DevAdmin123!"

pass=0
fail=0

ok() { echo "  ✓ $1"; pass=$((pass + 1)); }
bad() { echo "  ✗ $1"; fail=$((fail + 1)); }

jq_get() {
  if command -v jq >/dev/null 2>&1; then
    jq -r "$1"
  else
    cat
  fi
}

echo "=== WEREAL P0 Smoke ==="
echo "BASE=$BASE"

# 1. Health
health=$(curl -sf "$BASE/health" || true)
if echo "$health" | grep -q '"status"'; then
  ok "GET /health"
else
  bad "GET /health"
fi

# 2. Public search
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/search/units?bedrooms=2" \
  -H "X-Tenant-Id: $TENANT")
if [ "$code" = "200" ]; then ok "GET /search/units (public)"; else bad "GET /search/units ($code)"; fi

# 2b. Unit detail (SCR-PUBLIC-006)
dcode=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/search/units/un_01" \
  -H "X-Tenant-Id: $TENANT")
[ "$dcode" = "200" ] && ok "GET /search/units/un_01" || bad "GET /search/units/un_01 ($dcode)"

# 2c. Search index worker status (UC-LS-07)
idx=$(curl -sf "$BASE/search/index/status" -H "X-Tenant-Id: $TENANT" || true)
echo "$idx" | grep -q 'search-index' && ok "GET /search/index/status" || bad "search index status"
src=$(echo "$idx" | jq_get '.source // empty' 2>/dev/null || echo "")
[ "$src" = "postgres-search-index" ] && ok "search index source" || bad "search index source ($src)"

# 3. Public lead (with PDPA for PUBLIC_UNIT_DETAIL path tested via dedicated flow)
lead_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/leads" \
  -H "X-Tenant-Id: $TENANT" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test","phone":"+84900000001","source":"SMOKE_TEST"}')
if [ "$lead_code" = "201" ] || [ "$lead_code" = "200" ]; then ok "POST /leads"; else bad "POST /leads ($lead_code)"; fi

# 3b. PDPA required for public form
pdpa_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/leads" \
  -H "X-Tenant-Id: $TENANT" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"No Consent","phone":"+84900000002","source":"PUBLIC_FORM"}')
[ "$pdpa_code" = "422" ] && ok "POST /leads PDPA 422" || bad "POST /leads PDPA ($pdpa_code, expected 422)"

# 4. Login
login=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" || true)
TOKEN=$(echo "$login" | jq_get '.accessToken // .data.accessToken // empty')
REFRESH=$(echo "$login" | jq_get '.data.refreshToken // empty')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  ok "POST /auth/login"
else
  bad "POST /auth/login"
  echo "Smoke aborted — no token"
  echo "PASS=$pass FAIL=$fail"
  exit 1
fi

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")

# 4b. Public tenants + auth/me + users stub
tcode=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/tenants")
[ "$tcode" = "200" ] && ok "GET /tenants (public)" || bad "GET /tenants ($tcode)"
mcode=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/auth/me")
[ "$mcode" = "200" ] && ok "GET /auth/me" || bad "GET /auth/me ($mcode)"
users_code=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/users")
[ "$users_code" = "200" ] && ok "GET /users" || bad "GET /users ($users_code)"
if [ -n "$REFRESH" ] && [ "$REFRESH" != "null" ]; then
  rcode=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/auth/refresh" \
    -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}")
  [ "$rcode" = "200" ] && ok "POST /auth/refresh" || bad "POST /auth/refresh ($rcode)"
fi

# 5. Units
ucode=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/units")
[ "$ucode" = "200" ] && ok "GET /units" || bad "GET /units ($ucode)"

# 6. Cross-tenant 403
xcode=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_other' "$BASE/units")
[ "$xcode" = "403" ] && ok "Cross-tenant 403" || bad "Cross-tenant ($xcode, expected 403)"

# 7. Module status endpoints
for path in commission/status ledger/status booking/status payment/status; do
  sc=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/$path" 2>/dev/null || echo "000")
  if [ "$sc" = "200" ] || [ "$sc" = "404" ]; then
    ok "GET /$path ($sc)"
  else
    bad "GET /$path ($sc)"
  fi
done

# 8. Reconciliation (7d)
rcode=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/ledger/reconciliation?days=7")
[ "$rcode" = "200" ] && ok "GET /ledger/reconciliation" || bad "GET /ledger/reconciliation ($rcode)"

# 9. Refunds list
rfcode=$(curl -s -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$BASE/refunds?limit=5")
[ "$rfcode" = "200" ] && ok "GET /refunds" || bad "GET /refunds ($rfcode)"

# 10. Audit export header
audit=$(curl -sf "${AUTH[@]}" "$BASE/audit/events/export.csv" | head -1 || true)
echo "$audit" | grep -q 'entity_type' && ok "GET /audit/events/export.csv" || bad "audit export"

# 11. Listing drift-check BLOCK (UAT-04)
drift=$(curl -sf -X POST "${AUTH[@]}" "$BASE/listings/drift-check" \
  -H 'Content-Type: application/json' \
  -d '{"unitId":"un_01","priceDisplay":4500000000}' || true)
drift_status=$(echo "$drift" | jq_get '.data.status // empty')
drift_gr=$(echo "$drift" | jq_get '.data.basePrice // empty')
[ "$drift_status" = "BLOCK" ] && ok "POST /listings/drift-check BLOCK" || bad "drift-check ($drift_status)"
[ -n "$drift_gr" ] && [ "$drift_gr" != "null" ] && ok "drift-check GR truth basePrice" || bad "drift GR truth missing"

# 12. Listing create + submit + approve on un_03 (UAT-02)
un03_ver=$(curl -sf "${AUTH[@]}" "$BASE/units/un_03" | jq_get '.data.attributes.version // 1')
create=$(curl -sf -X POST "${AUTH[@]}" "$BASE/listings" \
  -H 'Content-Type: application/json' \
  -d "{\"unitId\":\"un_03\",\"expectedUnitVersion\":$un03_ver,\"title\":\"Smoke listing\",\"description\":\"UAT-02 path\",\"priceDisplay\":5200000000}" || true)
ls_id=$(echo "$create" | jq_get '.data.id // empty')
if [ -n "$ls_id" ] && [ "$ls_id" != "null" ]; then
  ok "POST /listings ($ls_id)"
  sub_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "$BASE/listings/$ls_id/submit-review")
  [ "$sub_code" = "200" ] || [ "$sub_code" = "201" ] && ok "POST submit-review" || bad "submit-review ($sub_code)"
  appr_code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "${AUTH[@]}" "$BASE/listings/$ls_id/approve")
  [ "$appr_code" = "200" ] && ok "PATCH approve" || bad "approve ($appr_code)"
else
  bad "POST /listings"
fi

# 13. BLOCK submit returns 422
un01_ver=$(curl -sf "${AUTH[@]}" "$BASE/units/un_01" | jq_get '.data.attributes.version // 1')
create_block=$(curl -sf -X POST "${AUTH[@]}" "$BASE/listings" \
  -H 'Content-Type: application/json' \
  -d "{\"unitId\":\"un_01\",\"expectedUnitVersion\":$un01_ver,\"title\":\"Block test\",\"description\":\"x\",\"priceDisplay\":4500000000}" || true)
ls_block=$(echo "$create_block" | jq_get '.data.id // empty')
if [ -n "$ls_block" ] && [ "$ls_block" != "null" ]; then
  block_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "$BASE/listings/$ls_block/submit-review")
  [ "$block_code" = "422" ] && ok "submit-review BLOCK 422" || bad "submit-review BLOCK ($block_code)"
else
  bad "POST /listings (block case)"
fi

# 14. Payment checkout public (SCR-BUYER-004) — needs booking from step 12 or fresh
if [ -n "${ls_id:-}" ] && [ "$ls_id" != "null" ]; then
  : # skip if no pi from listing flow
fi
un04_ver=$(curl -sf "${AUTH[@]}" "$BASE/units/un_04" | jq_get '.data.attributes.version // 1')
bk_smoke=$(curl -sf -X POST "${AUTH[@]}" "$BASE/bookings" \
  -H "X-Idempotency-Key: smoke-bk-$(date +%s)" \
  -d "{\"unitId\":\"un_04\",\"expectedUnitVersion\":$un04_ver,\"leadId\":\"ld_01\",\"depositAmount\":50000000}" || true)
bk_id=$(echo "$bk_smoke" | jq_get '.data.id // empty')
if [ -n "$bk_id" ] && [ "$bk_id" != "null" ]; then
  pi_smoke=$(curl -sf -X POST "${AUTH[@]}" "$BASE/payment-intents" \
    -H "X-Idempotency-Key: smoke-pi-$(date +%s)" \
    -d "{\"bookingId\":\"$bk_id\",\"amount\":50000000,\"method\":\"MOCK\"}" | jq_get '.data.id // empty')
  if [ -n "$pi_smoke" ] && [ "$pi_smoke" != "null" ]; then
    ccode=$(curl -s -o /dev/null -w '%{http_code}' -H "X-Tenant-Id: $TENANT" \
      "$BASE/payment-intents/$pi_smoke/checkout")
    [ "$ccode" = "200" ] && ok "GET /payment-intents/checkout" || bad "checkout ($ccode)"
  else
    bad "POST /payment-intents (smoke)"
  fi
else
  bad "POST /bookings (smoke UAT-03)"
fi

echo ""
echo "=== RESULT: PASS=$pass FAIL=$fail ==="
[ "$fail" -eq 0 ]
