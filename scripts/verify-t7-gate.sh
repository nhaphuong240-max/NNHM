#!/usr/bin/env bash
# T7-G0 — verify Tier 6 prerequisites before Tier 7 production trust
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 7 Gate — Tier 6 prerequisite check ==="

chmod +x "$ROOT/scripts/uat-tier6-smoke.sh" \
  "$ROOT/scripts/uat-enterprise-hardening.sh" \
  "$ROOT/scripts/uat-pilot-anchor.sh" 2>/dev/null || true

"$ROOT/scripts/uat-tier6-smoke.sh" "$BASE"
echo ""
"$ROOT/scripts/uat-enterprise-hardening.sh" "$BASE"

echo ""
echo "--- T7 pre-check: Tier 6 + pilot artifacts ---"
test -f "$ROOT/docs/dev/Sprint-Backlog-T6.md"
test -f "$ROOT/docs/dev/Sprint-Backlog-T7.md"
test -f "$ROOT/config/gtm/pilot-cdt-v1.json"
test -f "$ROOT/config/tier-t7/production-trust.env"
echo "✓ Tier 6 + T7 scaffolding present"

echo ""
echo "=== verify-t7-gate PASS — Tier 7 production trust may proceed ==="
