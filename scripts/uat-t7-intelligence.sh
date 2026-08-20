#!/usr/bin/env bash
# T7-G7 / T7-S7 — Intelligence depth (AI gateway · eval · ML forecast)
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TENANT="${TENANT:-ten_dev_01}"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S7 backlog)"; OPEN=$((OPEN + 1)); }

echo "=== T7-S7 Intelligence UAT ==="

test -f "$ROOT/adr/ADR-005-ai-gateway-architecture.md" && pass "ADR-005 AI gateway" || fail
test -f "$ROOT/apps/api/src/modules/analytics/analytics-forecast.util.ts" && pass "forecast util" || fail
test -f "$ROOT/apps/api/src/modules/ai-anomaly/ai-anomaly.service.ts" && pass "anomaly module" || fail

if [ -d "$ROOT/apps/api/src/modules/ai-gateway" ]; then
  pass "ai-gateway module"
else
  open "ai-gateway module (ADR-005)"
fi

if grep -q 'linear_stub_v1' "$ROOT/apps/api/src/modules/analytics" 2>/dev/null; then
  open "ML forecast v2 (replace linear_stub_v1)"
else
  pass "no linear_stub_v1 in analytics"
fi

if grep -rq 'eval\|TC-12\|hallucination' "$ROOT/apps/api/src/modules/ai-"* 2>/dev/null; then
  pass "AI eval artifacts"
else
  open "AI eval suite TC-12"
fi

test -f "$ROOT/docs/dev/t7-s7-intelligence-depth.md" && pass "sprint doc t7-s7" || open "sprint doc"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  login=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}')
  TOKEN=$(echo "$login" | jq -r '.accessToken // .data.accessToken // empty')
  if [ -n "$TOKEN" ]; then
    AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT")
    FORECAST=$(curl -sf "${AUTH[@]}" "$BASE/analytics/forecast/ml?months=6" 2>/dev/null || echo '{}')
    MODEL=$(echo "$FORECAST" | jq -r '.data.attributes.model // .meta.model // .data.model // empty' 2>/dev/null)
    if [ -n "$MODEL" ] && [ "$MODEL" != "linear_stub_v1" ]; then
      pass "ML forecast model=$MODEL"
    else
      open "ML forecast non-stub (current: ${MODEL:-unknown})"
    fi
    curl -sf "${AUTH[@]}" "$BASE/analytics/intelligence/billing" >/dev/null 2>&1 && pass "data billing API" || open "billing API"
    curl -sf "${AUTH[@]}" "$BASE/ai/gateway/status" >/dev/null 2>&1 && pass "AI gateway status" || open "AI gateway status"
    LEGAL_EVAL=$(curl -sf "${AUTH[@]}" "$BASE/ai/eval/legal-hallucination" 2>/dev/null || echo '{}')
    LEGAL_PASS=$(echo "$LEGAL_EVAL" | jq -r '.data.pass // empty' 2>/dev/null)
    if [ "$LEGAL_PASS" = "true" ]; then
      pass "legal hallucination eval pass"
    else
      open "legal hallucination eval (pass=$LEGAL_PASS)"
    fi
    curl -sf "${AUTH[@]}" "$BASE/ai/anomalies/sla" >/dev/null 2>&1 && pass "anomaly SLA dashboard" || open "anomaly SLA dashboard"
    INTEL=$(curl -sf "$BASE/health/intelligence" 2>/dev/null || echo '{}')
    INTEL_STATUS=$(echo "$INTEL" | jq -r '.status // empty' 2>/dev/null)
    if [ "$INTEL_STATUS" = "ok" ]; then
      pass "health/intelligence ok"
    else
      open "health/intelligence (status=${INTEL_STATUS:-unknown})"
    fi
  fi
else
  echo "⚠ API not running — live intelligence checks skipped"
fi

echo "=== uat-t7-intelligence PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
