#!/usr/bin/env bash
# T5-Gate — verify Tier 4 prerequisites before Tier 5 #1 Vietnam
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 5 Gate — Tier 4 prerequisite check ==="

chmod +x "$ROOT/scripts/uat-t4-moat.sh" "$ROOT/scripts/verify-t4-gate.sh"
"$ROOT/scripts/uat-t4-moat.sh" "$BASE"

echo ""
echo "--- T5 pre-check: Tier 4 artifacts ---"
test -f "$ROOT/apps/api/src/modules/golden-record/developer-trust-score.service.ts"
test -f "$ROOT/apps/mobile-buyer/App.tsx"
test -f "$ROOT/docs/dev/Sprint-Backlog-T4.md"
echo "✓ Tier 4 moat artifacts present"

echo ""
echo "=== verify-t5-gate PASS — Tier 5 #1 Vietnam may proceed ==="
