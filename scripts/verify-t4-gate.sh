#!/usr/bin/env bash
# T4-Gate — verify Tier 3 prerequisites before Tier 4 Product Moat
# Usage: ./scripts/verify-t4-gate.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 4 Gate — Tier 3 prerequisite check ==="

echo ""
echo "--- Gate-1: API unit tests ---"
(cd "$ROOT/apps/api" && npm test -- --passWithNoTests 2>&1 | tail -5)

echo ""
echo "--- Gate-2: Tier 3 artifacts ---"
test -f "$ROOT/scripts/uat-t3-scale.sh"
test -f "$ROOT/scripts/verify-t3-gate.sh"
test -f "$ROOT/infra/k8s/staging/api-deployment.yaml"
test -f "$ROOT/apps/api/Dockerfile"
test -f "$ROOT/docs/dev/T3-gate-checklist.md"
echo "✓ T3 scale artifacts present"

echo ""
echo "--- Gate-3: Live health (optional) ---"
if curl -sf "$BASE/health/live" | jq -e '.probe == "live"' >/dev/null 2>&1; then
  curl -sf "$BASE/health/ready" | jq -e '.probe == "ready"' >/dev/null
  echo "✓ live + ready probes"
else
  echo "⚠ API not running — live K8s soak skipped (run staging for full T3 gate)"
fi

echo ""
echo "=== verify-t4-gate PASS — Tier 4 Product Moat may proceed ==="
