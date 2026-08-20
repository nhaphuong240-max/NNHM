#!/usr/bin/env bash
# Staging live gate — T5 + OP-WIN evidence (requires running API)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="${TENANT:-ten_dev_01}"

echo "=== WEREAL Staging Live Gate ==="
echo "BASE=$BASE TENANT=$TENANT"

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo "✗ API not reachable at $BASE"
  echo "  Start API with staging env: cp apps/api/.env.staging.example apps/api/.env"
  exit 1
fi
echo "✓ API live"

chmod +x "$ROOT/scripts/uat-t5-vn.sh" "$ROOT/scripts/uat-op-win-signoff.sh"
"$ROOT/scripts/uat-t5-vn.sh" "$BASE"
"$ROOT/scripts/uat-op-win-signoff.sh" "$BASE"

echo ""
echo "=== uat-staging-live PASS ==="
