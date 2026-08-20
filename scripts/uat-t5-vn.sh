#!/usr/bin/env bash
# T5-S8 — Tier 5 #1 Vietnam gate smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 5 #1 Vietnam UAT ==="

chmod +x "$ROOT/scripts/verify-t5-gate.sh" \
  "$ROOT/scripts/uat-t5-anchor.sh" \
  "$ROOT/scripts/uat-t5-wau.sh" \
  "$ROOT/scripts/uat-t5-marketplace.sh" \
  "$ROOT/scripts/uat-t5-escrow-regulatory.sh"

"$ROOT/scripts/verify-t5-gate.sh" "$BASE"
"$ROOT/scripts/uat-t5-anchor.sh" "$BASE"
"$ROOT/scripts/uat-t5-wau.sh" "$BASE"
"$ROOT/scripts/uat-t5-marketplace.sh" "$BASE"
"$ROOT/scripts/uat-t5-escrow-regulatory.sh" "$BASE"

echo ""
echo "--- T5-S5 Data intelligence ---"
test -f "$ROOT/apps/api/src/modules/analytics/data-intelligence.service.ts"
grep -q 'intelligence/heatmap' "$ROOT/apps/api/src/modules/analytics/analytics.controller.ts"
echo "✓ data intelligence APIs present"

echo ""
echo "--- T5-S7 Network close-out ---"
grep -q 'cross-anchor' "$ROOT/apps/api/src/modules/marketing/marketing-marketplace-admin.controller.ts"
echo "✓ cross-anchor distribution endpoint"

echo ""
echo "--- T5 docs + scorecard ---"
test -f "$ROOT/docs/dev/Sprint-Backlog-T5.md"
test -f "$ROOT/docs/dev/T5-runbook.md"
test -f "$ROOT/docs/dev/T5-gate-checklist.md"
grep -q '5.0' "$ROOT/docs/strategy/WEREAL-Domain-Scorecard.md"
echo "✓ T5 docs + scorecard ≥5.0"

echo ""
echo "=== uat-t5-vn PASS — Tier 5 #1 Vietnam evidence green ==="
