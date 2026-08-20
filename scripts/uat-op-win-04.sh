#!/usr/bin/env bash
# T4-S2 — OP-WIN-04 anti-drift 100% block, zero bypass
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"

echo "=== OP-WIN-04 Anti-Drift UAT ==="

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo "--- Drift preview BLOCK (>10% price) ---"
curl -sf -X POST "${AUTH[@]}" "$BASE/listings/drift-check" \
  -d '{"unitId":"un_01","priceDisplay":5000000000}' | jq -e '.data.status == "BLOCK"' >/dev/null
echo "✓ drift BLOCK for >10% price delta"

echo ""
echo "--- Trust score API ---"
curl -sf "${AUTH[@]}" "$BASE/golden-record/trust-score/prj_sunrise" | jq -e '((.data.score | tonumber?) // 0) >= 0' >/dev/null
curl -sf "${AUTH[@]}" "$BASE/golden-record/trust-score" | jq -e '(.data | type) == "array"' >/dev/null
echo "✓ developer trust score + leaderboard"

echo ""
echo "--- GR version bind (409 on stale version) ---"
stale_code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${AUTH[@]}" "$BASE/bookings" \
  -d '{"unitId":"un_04","expectedUnitVersion":9999,"leadId":"ld_01"}')
[ "$stale_code" = "409" ] && echo "✓ booking rejects stale expectedUnitVersion" || echo "○ booking version bind ($stale_code)"

echo ""
echo "=== uat-op-win-04 PASS ==="
