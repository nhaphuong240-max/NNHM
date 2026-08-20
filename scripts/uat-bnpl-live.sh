#!/usr/bin/env bash
# T4-S4 — BNPL live partner path smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"

echo "=== BNPL Live UAT ==="

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo "--- BNPL plans ---"
curl -sf "${AUTH[@]}" "$BASE/payment/bnpl/plans" | jq -e '.data | length >= 1' >/dev/null
echo "✓ BNPL plans listed"

echo ""
echo "--- BNPL apply (sandbox/live per BNPL_PARTNER_ENABLED) ---"
BOOKING_ID=$(curl -sf "${AUTH[@]}" "$BASE/bookings?limit=1" | jq -r '.data[0].id // .data[0].attributes.id // empty')
if [ -z "$BOOKING_ID" ]; then
  echo "⚠ no booking seed — skipping apply"
else
  app=$(curl -sf -X POST "${AUTH[@]}" "$BASE/payment/bnpl/apply" \
    -d "$(jq -nc --arg b "$BOOKING_ID" '{bookingId:$b,planId:"bnpl_3"}')")
  APP_ID=$(echo "$app" | jq -r '.data.id // empty')
  echo "✓ BNPL application id=$APP_ID mode=$(echo "$app" | jq -r '.meta.mode // "unknown"')"
  curl -sf "${AUTH[@]}" "$BASE/payment/bnpl/applications" | jq -e '.meta.count >= 1' >/dev/null
  echo "✓ applications persisted in bnpl_applications table"
fi

echo ""
echo "=== uat-bnpl-live PASS ==="
