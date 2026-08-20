#!/usr/bin/env bash
# T7-G3 / T7-S3 — observability, E2E PR gate, contract tests
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S3 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S3 Observability UAT ==="

test -f "$ROOT/docs/dev/t7-s3-observability-quality.md" && pass "T7-S3 runbook" || fail "T7-S3 runbook"
test -f "$ROOT/docs/ops/slo-99-5.md" && pass "SLO doc" || fail "SLO doc"
test -f "$ROOT/docs/ops/otel-collector.md" && pass "OTEL doc" || fail "OTEL doc"
test -f "$ROOT/apps/api/src/infrastructure/telemetry/otel.bootstrap.ts" && pass "OTEL bootstrap" || fail "OTEL bootstrap"
test -f "$ROOT/config/tier-t7/staging-observability.env" && pass "staging-observability.env" || fail "staging obs profile"
test -f "$ROOT/config/otel/collector.yaml" && pass "otel collector config" || fail "collector config"
test -f "$ROOT/docs/ops/grafana/alerts/wereal-slo-alerts.yml" && pass "Grafana SLO alerts" || fail "Grafana alerts"
test -x "$ROOT/scripts/apply-tier-t7-observability.sh" && pass "apply-tier-t7-observability.sh" || fail "apply script"
test -x "$ROOT/scripts/contract/smoke-api-responses.sh" && pass "smoke-api-responses.sh" || fail "response smoke"
test -x "$ROOT/scripts/deploy-staging.sh" && pass "deploy-staging.sh" || fail "deploy script"
test -f "$ROOT/.github/workflows/deploy-staging.yml" && pass "deploy-staging workflow" || fail "deploy workflow"

grep -q 'OTEL_ENABLED=true' "$ROOT/config/tier-t7/production-trust.env" && pass "OTEL in tier-t7 prod" || fail "OTEL tier-t7 prod"
grep -q 'OTEL_ENABLED=true' "$ROOT/config/tier-t7/staging-observability.env" && pass "OTEL default staging profile" || fail "OTEL staging"

if grep -q 'e2e-pr' "$ROOT/.github/workflows/ci.yml" 2>/dev/null; then
  pass "Playwright e2e-pr job in ci.yml"
else
  fail "Playwright e2e-pr job"
fi

if grep -q 'contract-gate' "$ROOT/.github/workflows/ci.yml" 2>/dev/null; then
  pass "contract-gate job in ci.yml"
else
  fail "contract-gate job"
fi

test -x "$ROOT/scripts/contract/validate-openapi.sh" && pass "OpenAPI contract script" || fail "contract script"
test -f "$ROOT/openapi.yaml" && pass "openapi.yaml" || fail "openapi.yaml"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf "$BASE/metrics" >/dev/null 2>&1 && pass "metrics endpoint live" || open "metrics endpoint"
  OBS=$(curl -sf "$BASE/health/observability" 2>/dev/null || echo '{}')
  echo "$OBS" | jq -e '.otel.enabled != null and .prometheus.enabled != null' >/dev/null 2>&1 \
    && pass "GET /health/observability" || fail "/health/observability"
else
  echo "⚠ API not running — live observability checks skipped"
fi

echo "=== uat-t7-observability PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
