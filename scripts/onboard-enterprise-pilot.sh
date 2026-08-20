#!/usr/bin/env bash
# T7-S8 — Onboard ENTERPRISE white-label tier-1 CĐT pilot
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/config/gtm/enterprise-pilot-cdt.json"
TENANT=$(jq -r '.tenantId' "$CONFIG")

login=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}')
TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty')
[ -n "$TOKEN" ] || { echo "Login failed"; exit 1; }

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")

BODY=$(jq -c '{
  displayName,
  subdomain,
  primaryColor,
  accentColor,
  live,
  whiteLabelTier
}' "$CONFIG")

curl -sf -X POST "$BASE/tenants/branding" \
  "${AUTH[@]}" \
  -H 'Content-Type: application/json' \
  -d "$BODY" | jq .

echo "✓ ENTERPRISE pilot onboarded tenant=$TENANT domain=$(jq -r '.customDomain' "$CONFIG")"
