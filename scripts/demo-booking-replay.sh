#!/usr/bin/env bash
# P3-S1-02 · OP-WIN-03 — Booking timeline replay demo (≤ 3 min)
# Usage: ./scripts/demo-booking-replay.sh [BASE_URL] [BOOKING_ID]
# Requires: API + Postgres + Redis, curl, jq

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
BOOKING_ID="${2:-}"
TENANT="ten_dev_01"
UNIT="${REPLAY_UNIT_ID:-un_04}"
MAX_SEC=180

START=$(date +%s)

echo "=== OP-WIN-03 Booking Replay Demo ==="
echo "BASE=$BASE · tenant=$TENANT"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")

if [ -z "$BOOKING_ID" ]; then
  IDEM="replay-bk-$(date +%s)"
  create=$(curl -sf -X POST "$BASE/bookings" "${AUTH[@]}" \
    -H "X-Idempotency-Key: $IDEM" \
    -H 'Content-Type: application/json' \
    -d "{\"unitId\":\"$UNIT\",\"leadId\":\"ld_01\",\"depositAmount\":50000000}")
  BOOKING_ID=$(echo "$create" | jq -r '.data.id')
  echo "✓ Created booking $BOOKING_ID on unit $UNIT"
else
  echo "✓ Using booking $BOOKING_ID"
fi

# Step 1 — replay pack (human timeline)
replay=$(curl -sf "${AUTH[@]}" "$BASE/bookings/$BOOKING_ID/replay")
timeline_count=$(echo "$replay" | jq '.data.timeline | length')
domain_count=$(echo "$replay" | jq '.data.domainEvents | length')
echo "✓ Replay pack · timeline=$timeline_count domainEvents=$domain_count"

# Step 2 — raw domain events API
events=$(curl -sf "${AUTH[@]}" "$BASE/bookings/$BOOKING_ID/events")
api_domain_count=$(echo "$events" | jq '.meta.count')
echo "✓ GET /bookings/$BOOKING_ID/events · count=$api_domain_count"

# Step 3 — domain events CSV export
domain_csv=$(curl -sf "${AUTH[@]}" "$BASE/bookings/$BOOKING_ID/replay/export.csv")
domain_lines=$(echo "$domain_csv" | wc -l | tr -d ' ')
domain_data_lines=$((domain_lines - 1))
echo "✓ Domain CSV export · $domain_data_lines rows"

if [ "$domain_data_lines" -ne "$api_domain_count" ]; then
  echo "✗ Domain CSV row count mismatch (csv=$domain_data_lines api=$api_domain_count)"
  exit 1
fi

# Step 4 — audit export filtered by bookingId
audit_csv=$(curl -sf "${AUTH[@]}" "$BASE/audit/events/export.csv?bookingId=$BOOKING_ID")
audit_lines=$(echo "$audit_csv" | wc -l | tr -d ' ')
audit_data_lines=$((audit_lines - 1))
echo "✓ Audit CSV export ?bookingId=$BOOKING_ID · $audit_data_lines rows"

if [ "$audit_data_lines" -lt 1 ]; then
  echo "⚠ Audit export empty — booking may lack audit rows (check seed)"
fi

# Step 5 — verify domain event types appear in CSV
first_event=$(echo "$events" | jq -r '.data[0].type // empty')
if [ -n "$first_event" ] && echo "$domain_csv" | grep -q "$first_event"; then
  echo "✓ Domain CSV contains event type $first_event"
else
  echo "✗ Domain CSV missing expected event types"
  exit 1
fi

ELAPSED=$(( $(date +%s) - START ))
echo ""
echo "=== OP-WIN-03 complete in ${ELAPSED}s (limit ${MAX_SEC}s) ==="
echo "Evidence URLs:"
echo "  GET $BASE/bookings/$BOOKING_ID/replay"
echo "  GET $BASE/bookings/$BOOKING_ID/replay/export.csv"
echo "  GET $BASE/audit/events/export.csv?bookingId=$BOOKING_ID"
echo "  Admin UI: /admin/audit?entityType=booking&entityId=$BOOKING_ID"

if [ "$ELAPSED" -gt "$MAX_SEC" ]; then
  echo "✗ Exceeded ${MAX_SEC}s OP-WIN-03 budget"
  exit 1
fi
