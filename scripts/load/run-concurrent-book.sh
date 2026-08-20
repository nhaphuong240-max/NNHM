#!/usr/bin/env bash
# P3-S2-02 wrapper — run k6 concurrent booking load test (OP-WIN-01)
# Usage: ./scripts/load/run-concurrent-book.sh [BASE_URL]
# Requires: k6 (https://grafana.com/docs/k6/latest/set-up/install-k6/)

set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v k6 >/dev/null 2>&1; then
  echo "✗ k6 not found — install: https://grafana.com/docs/k6/latest/set-up/install-k6/"
  exit 1
fi

echo "=== P3-S2 k6 concurrent booking (OP-WIN-01) ==="
echo "BASE_URL=$BASE · LOAD_UNIT_ID=${LOAD_UNIT_ID:-un_04} · VUS=${LOAD_VUS:-100}"
echo "Tip: run ./scripts/uat-p3-s2.sh first (uses un_03) · k6 uses un_04 by default"

export BASE_URL="$BASE"
export TENANT_ID="${TENANT_ID:-ten_dev_01}"
export LOAD_UNIT_ID="${LOAD_UNIT_ID:-un_04}"
export LOAD_VUS="${LOAD_VUS:-100}"

k6 run "$SCRIPT_DIR/concurrent-book.k6.js"
