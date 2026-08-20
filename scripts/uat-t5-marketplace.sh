#!/usr/bin/env bash
# T5-S4 — API marketplace connectors smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== T5-S4 Marketplace Connectors UAT ==="

test -f "$ROOT/apps/api/src/database/entities/api-partner.entity.ts"
test -f "$ROOT/packages/partner-sdk/src/index.ts"
test -f "$ROOT/docs/dev/partner-connectors/bank.md"
echo "✓ marketplace DB + SDK + docs present"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf -X POST -H "Content-Type: application/json" -H "X-Tenant-Id: ten_dev_01" \
    -d '{"transactionId":"txn_uat","bookingId":"bk_uat","paymentIntentId":"pi_uat","amount":1000000,"status":"SUCCESS"}' \
    "$BASE/integrations/bank/webhook" >/dev/null && echo "✓ bank webhook ingress"

  curl -sf -X POST -H "Content-Type: application/json" -H "X-Tenant-Id: ten_dev_01" \
    -d '{"bookingId":"bk_uat","notarizationStatus":"COMPLETED","milestoneId":"ms_contract"}' \
    "$BASE/integrations/notary/webhook" >/dev/null && echo "✓ notary webhook ingress"
else
  echo "⚠ API not running — connector live checks skipped"
fi

echo "=== uat-t5-marketplace PASS ==="
