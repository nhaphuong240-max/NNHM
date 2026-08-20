#!/usr/bin/env bash
# T3-Gate — verify Tier 2 prerequisites before Tier 3 Scale
# Usage: ./scripts/verify-t3-gate.sh [BASE_URL]

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 3 Gate — Tier 2 prerequisite check ==="

chmod +x "$ROOT/scripts/verify-t2-gate.sh"
"$ROOT/scripts/verify-t2-gate.sh" "$BASE"

echo ""
echo "--- T3 pre-check: CONFIG_PLATFORM_READ ---"
read_mode="${CONFIG_PLATFORM_READ:-dual}"
if [ "$read_mode" = "v1" ]; then
  echo "⚠ CONFIG_PLATFORM_READ=v1 — recommend v2 before Tier 3 production scale"
else
  echo "✓ CONFIG_PLATFORM_READ=${read_mode}"
fi

echo ""
echo "=== verify-t3-gate PASS — Tier 3 may proceed ==="
