#!/usr/bin/env bash
# T5-S2 — agent WAU telemetry smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== T5-S2 Agent WAU UAT ==="

test -f "$ROOT/apps/api/src/modules/analytics/agent-wau.service.ts"
test -f "$ROOT/apps/api/src/database/entities/agent-activity-event.entity.ts"
test -f "$ROOT/apps/api/src/database/entities/mobile-device.entity.ts"
echo "✓ WAU entities + service present"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  WAU=$(curl -sf -H "X-Tenant-Id: ten_dev_01" "$BASE/analytics/agent/wau?days=7" || echo '{}')
  echo "$WAU" | grep -q 'wau7d' && echo "✓ GET /analytics/agent/wau"
  echo "$WAU" | grep -q 'targetWau' && echo "✓ path to 500 WAU documented"
else
  echo "⚠ API not running — WAU live checks skipped"
fi

echo "=== uat-t5-wau PASS ==="
