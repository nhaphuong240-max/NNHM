#!/usr/bin/env bash
# OP-WIN-01 — concurrent booking load (wraps k6 when available)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="${BASE_URL:-http://localhost:3000/api/v1}"
VUS="${LOAD_VUS:-100}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "⚠ k6 not installed — run ./scripts/uat-p3-s2.sh for 2-VU OP-WIN-01 evidence"
  exit 0
fi

if ! curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  echo "⚠ API not running — skip k6"
  exit 0
fi

echo "=== OP-WIN-01 load test VUS=$VUS ==="
LOAD_VUS="$VUS" BASE_URL="$BASE" k6 run "$ROOT/scripts/load/concurrent-book.k6.js"
