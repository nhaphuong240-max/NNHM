#!/usr/bin/env bash
# T2-S6 — Enterprise trust smoke: SSO + eKYC + e-sign + consent export
# Usage: ./scripts/uat-t2-trust.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="ten_dev_01"
STAMP=$(date +%s)
PHONE="+8493${STAMP: -8}"

echo "=== Tier 2 Trust UAT ==="
echo "BASE=$BASE"

chmod +x "$ROOT/scripts/uat-t2-sso.sh"
"$ROOT/scripts/uat-t2-sso.sh" "$BASE"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')
AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" -H 'Content-Type: application/json')

echo ""
echo "--- T2-S2 Consent ledger (lead create) ---"
lead=$(curl -sf -X POST "${AUTH[@]}" "$BASE/crm/leads" \
  -d "$(jq -nc --arg p "$PHONE" --arg n "T2 Trust $STAMP" \
    '{fullName:$n,phone:$p,source:"PUBLIC_FORM",consent:{privacyAccepted:true,privacyPolicyVersion:"2026-07-01",marketing:true}}')")
LEAD_ID=$(echo "$lead" | jq -r '.data.id // .data.attributes.id // empty')
if [ -z "$LEAD_ID" ]; then echo "✗ lead create failed"; exit 1; fi
consent_rows=$(curl -sf "${AUTH[@]}" "$BASE/compliance/consent/LEAD/${LEAD_ID}" | jq -r '.meta.count')
if [ "$consent_rows" -lt 1 ]; then echo "✗ consent ledger empty for lead"; exit 1; fi
echo "✓ consent ledger rows=$consent_rows for lead=$LEAD_ID"

export_csv=$(curl -sf "${AUTH[@]}" "$BASE/compliance/consent/export?limit=10" | jq -r '.data.rowCount')
echo "✓ consent export rows=$export_csv"

echo ""
echo "--- T2-S4 eKYC agency ---"
ekyc=$(curl -sf -X POST "${AUTH[@]}" "$BASE/kyc/ekyc/AGENCY/agcy_sunrise/start" \
  -d '{"documentType":"GPKD"}')
EXT_REF=$(echo "$ekyc" | jq -r '.data.externalRef // empty')
if [ -z "$EXT_REF" ]; then echo "✗ eKYC start failed"; exit 1; fi
curl -sf -X POST "${AUTH[@]}" "$BASE/kyc/ekyc/simulate/approve" \
  -d "$(jq -nc --arg r "$EXT_REF" '{externalRef:$r}')" | jq -e '.data.status == "APPROVED"' >/dev/null
echo "✓ eKYC approved externalRef=$EXT_REF"

echo ""
echo "--- T2-S5 e-sign sign-session ---"
session=$(curl -sf -H "X-Tenant-Id: $TENANT" \
  "$BASE/contracts/ctr_esign_demo01/sign-session")
provider=$(echo "$session" | jq -r '.data.provider // empty')
echo "✓ sign-session provider=$provider"

echo ""
echo "--- T2-S6 SLO endpoint ---"
curl -sf "$BASE/health/slo" | jq -e '.data.availabilityTargetPct == 99.5' >/dev/null
echo "✓ SLO 99.5% defined"

echo ""
echo "--- Config platform status ---"
curl -sf "${AUTH[@]}" "$BASE/admin/config/status" | jq -e '.data.readMode != null' >/dev/null
echo "✓ config platform active"

echo ""
echo "=== uat-t2-trust PASS ==="
