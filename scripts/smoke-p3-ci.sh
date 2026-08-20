#!/usr/bin/env bash
# P3-S6-06 — P0 regression + P3 smoke (OP-WIN-06→07 CI gate)
# Usage: ./scripts/smoke-p3-ci.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== WEREAL P3 CI Smoke (P0 + P3-S6) ==="
echo "BASE=$BASE"

chmod +x "$ROOT/scripts/smoke-p0.sh" "$ROOT/scripts/uat-p3-s6.sh"

"$ROOT/scripts/smoke-p0.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-p3-s6.sh" "$BASE"

echo ""
echo "=== smoke-p3-ci PASS ==="
