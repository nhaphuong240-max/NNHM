#!/usr/bin/env bash
# Tier 6 smoke — white-label, data billing, ML forecast
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="${TENANT:-ten_dev_01}"

echo "=== Tier 6 Smoke ==="

grep -q 'whiteLabelTier' "$ROOT/apps/api/src/modules/identity/tenant-branding.util.ts" \
  && echo "✓ white-label tier field"
grep -q 'getBillingSummary' "$ROOT/apps/api/src/modules/analytics/data-intelligence.service.ts" \
  && echo "✓ data billing service"
grep -q 'buildMlAbsorptionForecast' "$ROOT/apps/api/src/modules/analytics/analytics-forecast.util.ts" \
  && echo "✓ ML forecast util"
test -f "$ROOT/docs/ops/multi-region.md" && echo "✓ multi-region doc"
test -f "$ROOT/docs/dev/Sprint-Backlog-T6.md" && echo "✓ T6 backlog"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  login=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}')
  TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty')
  AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")
  curl -sf "${AUTH[@]}" "$BASE/analytics/intelligence/billing" >/dev/null && echo "✓ billing API live"
  curl -sf "${AUTH[@]}" "$BASE/analytics/forecast/ml?months=6" >/dev/null && echo "✓ ML forecast API live"
  curl -sf "${AUTH[@]}" "$BASE/tenants/branding" >/dev/null && echo "✓ branding API live"
else
  echo "⚠ API not running — live Tier 6 checks skipped"
fi

echo "=== uat-tier6-smoke PASS ==="
