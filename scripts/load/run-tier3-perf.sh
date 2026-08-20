#!/usr/bin/env bash
# T3-S5 — Tier 3 performance orchestrator
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VUS="${LOAD_VUS:-100}"
P95="${P95_TARGET_MS:-200}"

echo "=== Tier 3 perf load ==="
echo "BASE=$BASE · VUS=$VUS · P95_TARGET_MS=$P95"

export BASE_URL="$BASE"
export LOAD_VUS="$VUS"
export P95_TARGET_MS="$P95"

echo ""
echo "--- 100+ concurrent booking (OP-WIN-01) ---"
k6 run "$ROOT/scripts/load/concurrent-book.k6.js"

echo ""
echo "--- API read load ---"
P95_TARGET_MS="$P95" k6 run "$ROOT/scripts/load/api-read.k6.js"

echo ""
echo "--- Search load ---"
P95_TARGET_MS="$P95" k6 run "$ROOT/scripts/load/search.k6.js"

echo ""
echo "=== run-tier3-perf PASS ==="
