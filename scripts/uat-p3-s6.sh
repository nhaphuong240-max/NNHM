#!/usr/bin/env bash
# P3-S6 — OP-WIN-07 omnichannel SLA + MFA staging (UC-CRM-05 · UC-NW-01/02 · UC-ID-03)
# Usage: ./scripts/uat-p3-s6.sh [BASE_URL]
# Requires: API + Postgres + Redis, curl, jq

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
TENANT="ten_dev_01"
STAMP=$(date +%s)
PHONE="+8492${STAMP: -8}"

echo "=== P3-S6 OP-WIN-07 Omnichannel SLA + MFA ==="
echo "BASE=$BASE · tenant=$TENANT"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

# --- P3-S6-02: Meta simulate → CRM + latency ---
echo ""
echo "--- P3-S6-02 Meta lead → CRM metric ---"

meta=$(curl -sf -X POST "${AUTH[@]}" "$BASE/integrations/meta/simulate" \
  -d "$(jq -nc --arg p "$PHONE" --arg n "P3-S6 Meta $STAMP" \
    '{fullName:$n,phone:$p}')")
META_LEAD=$(echo "$meta" | jq -r '.leadId // .result.leadId // empty')
meta_sla=$(echo "$meta" | jq -r '.slaMs // .result.slaMs // empty')
if [ -z "$META_LEAD" ]; then
  echo "✗ Meta simulate missing leadId"
  echo "$meta" | jq .
  exit 1
fi
if [ -n "$meta_sla" ] && [ "$meta_sla" != "null" ] && [ "$meta_sla" -ge 30000 ]; then
  echo "✗ Meta slaMs expected < 30000 got $meta_sla"
  exit 1
fi
echo "✓ Meta simulate · leadId=$META_LEAD · slaMs=${meta_sla:-n/a}"

# --- P3-S6-03: Zalo simulate → CRM + latency ---
echo ""
echo "--- P3-S6-03 Zalo lead → CRM metric ---"

zalo=$(curl -sf -X POST "${AUTH[@]}" "$BASE/integrations/zalo/simulate" \
  -d "$(jq -nc --arg p "$PHONE" --arg m "Tên: P3-S6 Zalo\nSĐT: ${PHONE:1}" '{message:$m,phone:$p}')")
ZALO_LEAD=$(echo "$zalo" | jq -r '.leadId // .result.leadId // empty')
zalo_sla=$(echo "$zalo" | jq -r '.slaMs // .result.slaMs // empty')
if [ -z "$ZALO_LEAD" ]; then
  echo "✗ Zalo simulate missing leadId"
  exit 1
fi
if [ -n "$zalo_sla" ] && [ "$zalo_sla" != "null" ] && [ "$zalo_sla" -ge 30000 ]; then
  echo "✗ Zalo slaMs expected < 30000 got $zalo_sla"
  exit 1
fi
echo "✓ Zalo simulate · leadId=$ZALO_LEAD · slaMs=${zalo_sla:-n/a}"

# --- P3-S6-01: Omnichannel dashboard p95 ---
echo ""
echo "--- P3-S6-01 Omnichannel latency dashboard ---"

omni=$(curl -sf "${AUTH[@]}" "$BASE/portal/admin/omnichannel")
p95=$(echo "$omni" | jq -r '.data.attributes.summary.latency.p95Ms // empty')
op_win=$(echo "$omni" | jq -r '.data.attributes.summary.opWin07Pass')
samples=$(echo "$omni" | jq -r '.data.attributes.summary.latency.sampleCount')

if [ "$samples" -lt 1 ]; then
  echo "✗ Omnichannel latency samples expected >= 1 got $samples"
  exit 1
fi
if [ -n "$p95" ] && [ "$p95" != "null" ] && [ "$p95" -ge 30000 ]; then
  echo "✗ p95 ingest expected < 30000ms got $p95"
  exit 1
fi
if [ "$op_win" != "true" ]; then
  echo "✗ opWin07Pass expected true got $op_win"
  exit 1
fi
echo "✓ GET /portal/admin/omnichannel · samples=$samples · p95=${p95}ms · OP-WIN-07 PASS"

# --- P3-S6-05: MFA sandbox path ---
echo ""
echo "--- P3-S6-05 MFA (dev sandbox) ---"

mfa_ok=$(curl -sf -X POST "$BASE/auth/mfa/verify" \
  -H 'Content-Type: application/json' \
  -d '{"mfaOtp":"123456","email":"admin@sunrise-dev.vn"}' | jq -r '.data.mode // empty')
if [ "$mfa_ok" != "SANDBOX" ]; then
  echo "✗ MFA sandbox expected mode SANDBOX got $mfa_ok"
  exit 1
fi
echo "✓ MFA sandbox OTP accepted (staging: MFA_SANDBOX=false + TOTP)"

echo ""
echo "=== OP-WIN-07 evidence ==="
echo "  Meta lead:  $META_LEAD · slaMs=${meta_sla:-—}"
echo "  Zalo lead:  $ZALO_LEAD · slaMs=${zalo_sla:-—}"
echo "  Dashboard:  p95=${p95}ms · opWin07Pass=$op_win"
echo ""
echo "=== P3-S6 automation PASS ==="
echo "UI: /admin/integrations/leads · CI: nightly smoke-p3-ci + Playwright e2e"
