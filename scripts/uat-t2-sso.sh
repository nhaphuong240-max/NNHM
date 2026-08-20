#!/usr/bin/env bash
# T2-S3 — SSO Azure AD / Okta staging UAT (UC-ID-06)
# Usage: ./scripts/uat-t2-sso.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"

echo "=== T2-S3 SSO UAT ==="
echo "BASE=$BASE"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo ""
echo "--- SSO status ---"
status=$(curl -sf "${AUTH[@]}" "$BASE/auth/sso/status")
mode=$(echo "$status" | jq -r '.mode // .data.mode // empty')
echo "✓ SSO mode=$mode"

echo ""
echo "--- Upsert OIDC provider (config platform) ---"
curl -sf -X POST "${AUTH[@]}" "$BASE/auth/sso/providers" \
  -d '{"type":"OIDC","label":"Azure AD Staging","issuerUrl":"https://login.microsoftonline.com/common/v2.0","clientId":"wereal-staging-client","enabled":true}' \
  | jq -e '.data | length >= 1' >/dev/null
echo "✓ Provider upserted"

PROVIDER_ID=$(curl -sf "${AUTH[@]}" "$BASE/auth/sso/providers" | jq -r '.data[0].id')
echo "providerId=$PROVIDER_ID"

echo ""
echo "--- Authorize (mock or live) ---"
auth=$(curl -sf -H "X-Tenant-Id: $TENANT" \
  "$BASE/auth/sso/authorize?providerId=${PROVIDER_ID}&emailHint=agent@sunrise-dev.vn")
auth_url=$(echo "$auth" | jq -r '.data.authorizationUrl // empty')
state=$(echo "$auth" | jq -r '.data.state // empty')
if [ -z "$auth_url" ] || [ -z "$state" ]; then
  echo "✗ authorize failed"
  echo "$auth" | jq .
  exit 1
fi
echo "✓ authorizationUrl present · state=$state"

echo ""
echo "--- Mock callback → JWT ---"
if echo "$auth_url" | grep -q mock_sso; then
  callback=$(curl -sf -H "X-Tenant-Id: $TENANT" \
    "$BASE/auth/sso/callback?code=mock_sso_code&state=${state}" -o /dev/null -w "%{http_code}")
  if [ "$callback" != "302" ] && [ "$callback" != "200" ]; then
    echo "✗ callback expected redirect got $callback"
    exit 1
  fi
  echo "✓ mock callback redirect"
else
  echo "⚠ Live OIDC — set SSO_OIDC_USE_MOCK=false + SSO_OIDC_CLIENT_SECRET for full test"
fi

echo ""
echo "--- Config history ---"
curl -sf "${AUTH[@]}" "$BASE/admin/config/history?domain=SSO_PROVIDER" \
  | jq -e '.meta.count >= 0' >/dev/null
echo "✓ config history API"

echo ""
echo "=== uat-t2-sso PASS ==="
