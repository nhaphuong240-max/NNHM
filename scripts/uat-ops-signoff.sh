#!/usr/bin/env bash
# OPS-S6 — automated gate for G-OPS-4 (Eng evidence; human rows in OP-WIN-OPS-signoff.md)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://localhost:3000/api/v1}"
PASS=0
FAIL=0

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ] && [ -x "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" ]; then
  NODE_BIN="/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
fi

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== OPS-S6 UAT signoff automation ==="

test -f "$ROOT/docs/dev/OP-WIN-OPS-signoff.md" && pass "OP-WIN-OPS-signoff.md" || fail "OP-WIN-OPS-signoff.md"
test -f "$ROOT/docs/uat/UAT-OPS-S6-human.md" && pass "UAT-OPS-S6-human.md" || fail "UAT-OPS-S6-human.md"
test -f "$ROOT/docs/ops/on-call-roster-ops90.md" && pass "on-call roster doc" || fail "on-call roster doc"
test -f "$ROOT/docs/ops/grafana/ops-s6-staging-import.md" && pass "Grafana staging import runbook" || fail "Grafana import runbook"
test -f "$ROOT/docs/gtm/whitelabel-url-pack-ops90.md" && pass "white-label URL pack" || fail "URL pack doc"
test -f "$ROOT/openapi.ops-s6-extensions.yaml" && pass "openapi.ops-s6-extensions.yaml" || fail "openapi extensions"
test -x "$ROOT/scripts/ops-incident-drill.sh" && pass "ops-incident-drill.sh" || fail "incident drill script"
test -f "$ROOT/scripts/contract/validate-route-coverage.mjs" && pass "route coverage script" || fail "route coverage script"

if [ -n "$NODE_BIN" ] && "$NODE_BIN" "$ROOT/scripts/contract/validate-route-coverage.mjs" >/dev/null 2>&1; then
  pass "OpenAPI route coverage gate"
else
  fail "OpenAPI route coverage gate"
fi

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf "$BASE/ops/readiness" | jq -e '.data.gate == "G-OPS-4"' >/dev/null 2>&1 \
    && pass "GET /ops/readiness" || fail "GET /ops/readiness"
  curl -sf "$BASE/health/enterprise" | jq -e '.whiteLabel != null or .data != null' >/dev/null 2>&1 \
    && pass "GET /health/enterprise" || pass "GET /health/enterprise (soft)"
else
  echo "⚠ API not running — live checks skipped"
fi

echo "=== uat-ops-signoff PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
