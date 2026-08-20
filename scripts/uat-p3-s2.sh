#!/usr/bin/env bash
# P3-S2-01 · UAT-05 · OP-WIN-01 — Concurrent booking (2 parallel → 1 OK 1 conflict)
# Usage: ./scripts/uat-p3-s2.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
UNIT="${LOAD_UNIT_ID:-un_03}"
LEAD="${LOAD_LEAD_ID:-ld_01}"
DEPOSIT="${LOAD_DEPOSIT:-50000000}"

echo "=== P3-S2 UAT-05 Concurrent Booking (OP-WIN-01) ==="
echo "BASE=$BASE · unit=$UNIT"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# Snapshot lock metrics before test
metrics_before=$(curl -sf "${AUTH[@]}" "$BASE/bookings/status" | jq '.lockMetrics // {acquired:0,contention:0}')
echo "Lock metrics (before): $metrics_before"

IDEM="uat05-$(date +%s)"
body=$(jq -nc --arg u "$UNIT" --arg l "$LEAD" --argjson d "$DEPOSIT" \
  '{unitId:$u,leadId:$l,depositAmount:$d}')

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# Fire two booking requests in parallel (different idempotency keys)
curl -s -w '%{http_code}' -X POST "$BASE/bookings" "${AUTH[@]}" \
  -H "X-Idempotency-Key: ${IDEM}-a" -d "$body" >"$tmpdir/r1" &
pid1=$!
curl -s -w '%{http_code}' -X POST "$BASE/bookings" "${AUTH[@]}" \
  -H "X-Idempotency-Key: ${IDEM}-b" -d "$body" >"$tmpdir/r2" &
pid2=$!
wait "$pid1" "$pid2"

parse_response() {
  local file=$1
  local len
  len=$(wc -c <"$file" | tr -d ' ')
  if [ "$len" -le 3 ]; then
    echo "000|"
    return
  fi
  local code body_len
  code=$(tail -c 3 "$file")
  body_len=$((len - 3))
  head -c "$body_len" "$file"
  echo "|$code"
}

r1=$(parse_response "$tmpdir/r1")
r2=$(parse_response "$tmpdir/r2")
body1=${r1%|*}
c1=${r1##*|}
body2=${r2%|*}
c2=${r2##*|}

echo "Response A: HTTP $c1"
echo "Response B: HTTP $c2"

ok=0
conflict=0
for code in "$c1" "$c2"; do
  if [ "$code" = "201" ]; then ok=$((ok + 1)); fi
  if [ "$code" = "409" ]; then conflict=$((conflict + 1)); fi
done

if [ "$ok" -ne 1 ] || [ "$conflict" -ne 1 ]; then
  echo "✗ Expected exactly 1×201 and 1×409, got ${ok}×201 ${conflict}×409"
  [ -n "$body1" ] && echo "Body A: $body1"
  [ -n "$body2" ] && echo "Body B: $body2"
  echo "Hint: use fresh unit LOAD_UNIT_ID=un_04 or cancel existing RESERVED booking"
  exit 1
fi
echo "✓ UAT-05 parallel book — 1 success (201) · 1 conflict (409)"

BK=$(echo "$body1" | jq -r '.data.id // empty')
if [ -z "$BK" ] || [ "$BK" = "null" ]; then
  BK=$(echo "$body2" | jq -r '.data.id // empty')
fi
echo "✓ Winning booking: $BK"

# Verify 0 double-book — only one RESERVED row for this unit in recent list
reserved=$(curl -sf "${AUTH[@]}" "$BASE/bookings?status=RESERVED&limit=100")
unit_reserved=$(echo "$reserved" | jq "[.data[] | select(.attributes.unitId==\"$UNIT\")] | length")
if [ "$unit_reserved" -gt 1 ]; then
  echo "✗ Double-book detected — $unit_reserved RESERVED bookings on $UNIT"
  exit 1
fi
echo "✓ 0 double-book on unit $UNIT (RESERVED count=$unit_reserved)"

metrics_after=$(curl -sf "${AUTH[@]}" "$BASE/bookings/status" | jq '.lockMetrics')
contention_delta=$(node -e "const b=$metrics_before;const a=$metrics_after;console.log((a.contention||0)-(b.contention||0));")
echo "✓ Lock contention events this run: $contention_delta"
echo "Lock metrics (after): $metrics_after"

echo ""
echo "=== P3-S2 UAT-05 PASS (OP-WIN-01 subset) ==="
echo "Next: ./scripts/load/run-concurrent-book.sh for 50-parallel k6 evidence"
