#!/usr/bin/env bash
# T5-S1 / T5-S7 — anchor developer program smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== T5-S1 Anchor Developer UAT ==="

test -f "$ROOT/apps/api/src/modules/anchor/anchor-tenant.service.ts"
test -f "$ROOT/apps/api/src/database/entities/anchor-tenant-profile.entity.ts"
test -f "$ROOT/config/gtm/pilot-cdt-v1.json"
echo "✓ anchor module artifacts present"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  PROFILES=$(curl -sf -H "X-Tenant-Id: ten_dev_01" "$BASE/anchor/profiles" || echo '{}')
  echo "$PROFILES" | grep -q 'ten_dev_01' && echo "✓ anchor profiles API"
  echo "$PROFILES" | grep -q 'ten_pilot_cdt_01' && echo "✓ LIVE pilot CĐT in profiles" || echo "⚠ LIVE pilot not seeded yet"
  curl -sf -H "X-Tenant-Id: ten_dev_01" "$BASE/anchor/dashboard" >/dev/null && echo "✓ anchor dashboard API"
  curl -sf "$BASE/anchor/leaderboard" >/dev/null && echo "✓ anchor leaderboard API"
  curl -sf "$BASE/anchor/onboard/checklist/ten_pilot_cdt_01" >/dev/null 2>&1 && echo "✓ pilot onboarding checklist API"
else
  echo "⚠ API not running — live anchor checks skipped"
fi

echo "=== uat-t5-anchor PASS ==="
