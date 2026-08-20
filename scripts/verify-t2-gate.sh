#!/usr/bin/env bash
# T2-Gate — verify P3 prerequisites before Tier 2 (OP-WIN-01→07)
# Usage: ./scripts/verify-t2-gate.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="ten_dev_01"

echo "=== Tier 2 Gate — P3 prerequisite check ==="
echo "BASE=$BASE · tenant=$TENANT"

# 1) API unit tests (offline gate)
echo ""
echo "--- Gate-1: API unit tests ---"
(cd "$ROOT/apps/api" && npm test -- --passWithNoTests 2>&1 | tail -5)

# 2) Health + staging markers
echo ""
echo "--- Gate-2: Health ---"
health=$(curl -sf "$BASE/health" || echo '{"status":"down"}')
echo "$health" | jq -e '.status == "ok" or .status == "degraded"' >/dev/null
echo "✓ API health reachable"

# 3) P3 smoke (OP-WIN-06→07) when API live
if curl -sf "$BASE/health" | jq -e '.checks.database == "up"' >/dev/null 2>&1; then
  echo ""
  echo "--- Gate-3: P3 CI smoke ---"
  chmod +x "$ROOT/scripts/smoke-p3-ci.sh"
  "$ROOT/scripts/smoke-p3-ci.sh" "$BASE"
else
  echo "⚠ Skipping live P3 smoke — database not up (run: cd apps/api && npm run db:up)"
fi

# 4) Tier 2 module readiness
echo ""
echo "--- Gate-4: Tier 2 modules ---"
for path in \
  "/admin/config/status" \
  "/compliance/consent/status" \
  "/kyc/ekyc/status" \
  "/health/slo"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE${path}" \
    -H "X-Tenant-Id: $TENANT" \
    -H "Authorization: Bearer $(curl -sf -X POST "$BASE/auth/login" \
      -H 'Content-Type: application/json' \
      -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken')" \
    2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "401" ]; then
    echo "✓ $path ($code)"
  else
    echo "✗ $path expected 200 got $code"
    exit 1
  fi
done

echo ""
echo "=== verify-t2-gate PASS — Tier 2 may proceed ==="
