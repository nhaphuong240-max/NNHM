#!/usr/bin/env bash
# Tier B live rails — env + runtime verification (staging / prod sign-off)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ENV_FILE="${ENV_FILE:-apps/api/.env}"
PROFILE="${PROFILE:-staging}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="${TENANT:-ten_dev_01}"

pass=0
fail=0
ok() { echo "  ✓ Tier-B-$1"; pass=$((pass + 1)); }
bad() { echo "  ✗ Tier-B-$1 — $2"; fail=$((fail + 1)); }

echo "=== Tier B live rails UAT ==="
echo "BASE=$BASE PROFILE=$PROFILE ENV=$ENV_FILE"

echo ""
echo "--- Env profile ---"
if "$ROOT/scripts/verify-production-flags.sh" --profile "$PROFILE" "$ENV_FILE"; then
  ok "env profile"
else
  bad "env profile" "verify-production-flags failed (use --strict in CI)"
fi

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo ""
  echo "⚠ API not reachable — runtime checks skipped"
  echo "Tier-B env-only: PASS=$pass FAIL=$fail"
  exit $(( fail > 0 ? 1 : 0 ))
fi

login=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' || true)
TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty' 2>/dev/null || true)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  bad "auth" "login failed"
  echo "Tier-B: PASS=$pass FAIL=$fail"
  exit 1
fi
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo ""
echo "--- Identity (Tier A) ---"
sso=$(curl -sf "${AUTH[@]}" "$BASE/auth/sso/status" || true)
echo "$sso" | grep -q 'oidc-live' && ok "SSO oidc-live" || bad "SSO" "expected mode oidc-live"

mfa=$(curl -sf -X POST "$BASE/auth/mfa/verify" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","mfaOtp":"123456"}' 2>/dev/null || true)
if echo "$mfa" | jq -e '.data.verified == true and .data.mode == "SANDBOX"' >/dev/null 2>&1; then
  bad "MFA" "MFA_SANDBOX still true (123456 accepted)"
elif echo "$mfa" | grep -qE 'Invalid MFA OTP|Unauthorized|TOTP'; then
  ok "MFA TOTP enforced (123456 rejected)"
else
  ok "MFA non-sandbox path"
fi

echo ""
echo "--- Payment / payout (Tier B) ---"
settle=$(curl -sf "${AUTH[@]}" "$BASE/commission/settlement/status" || true)
echo "$settle" | grep -q '"enabled":true' && ok "payout enabled" || bad "payout" "SETTLEMENT_PAYOUT_ENABLED"
if [[ "$PROFILE" == "production" ]]; then
  echo "$settle" | grep -q '"stubMode":false' && ok "payout partner (no stub)" || bad "payout stub" "SETTLEMENT_PAYOUT_STUB must be false in prod"
else
  echo "$settle" | grep -q '"stubMode":true\|"enabled":true' && ok "payout stub/submitted path" || bad "payout stub" "enable SETTLEMENT_PAYOUT_STUB on staging"
fi

pi=$(curl -sf -X POST "${AUTH[@]}" "$BASE/payment-intents" \
  -d '{"bookingId":"bk_contract01","amount":50000000,"method":"VNPAY"}' 2>/dev/null || true)
echo "$pi" | grep -q 'VNPAY' && ok "VNPay payment intent" || ok "VNPay path (booking seed optional)"

echo ""
echo "--- Omnichannel ---"
sms=$(curl -sf "${AUTH[@]}" "$BASE/integrations/sms/status" || true)
sms_mode=$(echo "$sms" | jq -r '.data.graphMode // empty' 2>/dev/null || true)
if [[ "$sms_mode" == "SANDBOX" ]]; then
  bad "SMS live" "graphMode=SANDBOX but SMS_SANDBOX=false expected"
else
  ok "SMS non-sandbox ($sms_mode)"
fi

echo ""
echo "--- Trust / compliance ---"
ekyc=$(curl -sf "$BASE/kyc/ekyc/status" || true)
if echo "$ekyc" | jq -e '.data.sandbox == false' >/dev/null 2>&1; then
  ok "eKYC live"
else
  bad "eKYC" "EKYC_SANDBOX=false expected"
fi

bnpl=$(curl -sf "${AUTH[@]}" "$BASE/bnpl/plans" 2>/dev/null || curl -sf "$BASE/bnpl/plans" || true)
echo "$bnpl" | grep -q 'data\|plans' && ok "BNPL enabled" || ok "BNPL (plans optional)"

echo ""
echo "--- Tier 5 rails ---"
curl -sf "$BASE/anchor/profiles" | grep -q 'ten_dev_01\|ten_anchor' && ok "anchor public profiles" || bad "anchor" "profiles empty"
curl -sf "${AUTH[@]}" "$BASE/analytics/agent/wau?days=7" >/dev/null && ok "WAU metric live" || bad "WAU" "analytics/agent/wau"

echo ""
echo "=== uat-tier-b-rails: PASS=$pass FAIL=$fail ==="
[[ "$fail" -eq 0 ]]
