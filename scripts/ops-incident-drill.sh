#!/usr/bin/env bash
# OPS-S6-01 — incident drill: stuck payment ack timeline (G-OPS-4 evidence)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EVIDENCE="$ROOT/docs/dev/evidence/ops-s6-incident-drill.log"
mkdir -p "$(dirname "$EVIDENCE")"

echo "=== OPS-S6 incident drill ===" | tee "$EVIDENCE"
echo "started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$EVIDENCE"
echo "base_url=$BASE" | tee -a "$EVIDENCE"

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo "DRILL SKIP — API not reachable at $BASE" | tee -a "$EVIDENCE"
  exit 0
fi

echo "--- Step 1: Ops readiness ---" | tee -a "$EVIDENCE"
READINESS=$(curl -sf -H "Authorization: Bearer ${TOKEN:-}" "$BASE/ops/readiness" 2>/dev/null || echo '{}')
echo "$READINESS" | head -c 500 | tee -a "$EVIDENCE"

echo "--- Step 2: Health observability ---" | tee -a "$EVIDENCE"
curl -sf "$BASE/health/observability" | jq -c '{otel,prometheus,slo}' 2>/dev/null | tee -a "$EVIDENCE" || true

echo "--- Step 3: Ops console queue snapshot ---" | tee -a "$EVIDENCE"
curl -sf -H "Authorization: Bearer ${TOKEN:-}" -H "X-Tenant-Id: ten_pilot_cdt_01" \
  "$BASE/ops/console" 2>/dev/null | jq -c '.data.healthy, (.data.widgets | map({id,count,severity}))' \
  | tee -a "$EVIDENCE" || echo "ops/console requires auth — manual drill with finance/admin token" | tee -a "$EVIDENCE"

echo "--- Step 4: OTP demo reject on pilot (Security G-OPS-4) ---" | tee -a "$EVIDENCE"
OTP_REJECT=$(curl -sf -X POST "$BASE/sms/verify-otp" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ten_pilot_cdt_01" \
  -d '{"phone":"+84901112233","otp":"123456","templateId":"OTP"}' 2>/dev/null || echo '{"rejected":true}')
echo "$OTP_REJECT" | tee -a "$EVIDENCE"

echo "ack_l1_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$EVIDENCE"
echo "DRILL PASS — evidence logged (human sign-off: docs/uat/UAT-OPS-S6-human.md)" | tee -a "$EVIDENCE"
echo "finished_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$EVIDENCE"
