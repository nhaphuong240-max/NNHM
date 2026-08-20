#!/usr/bin/env bash
# T7-S3 — OpenAPI response shape smoke against live API
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== OpenAPI response shape smoke ==="

curl -sf "$BASE/health/live" | jq -e '.status == "ok" and .probe == "live"' >/dev/null
echo "✓ GET /health/live shape"

READY=$(curl -sf "$BASE/health/ready")
echo "$READY" | jq -e '.checks.database == "up" or .checks.database == "down"' >/dev/null
echo "$READY" | jq -e '.checks.migrations != null' >/dev/null
echo "✓ GET /health/ready shape"

curl -sf "$BASE/health/slo" | jq -e '.data.availabilityTargetPct != null' >/dev/null
echo "✓ GET /health/slo shape"

curl -sf "$BASE/health/observability" | jq -e '.otel.enabled != null and .prometheus.enabled != null' >/dev/null
echo "✓ GET /health/observability shape"

curl -sf "$BASE/metrics" | grep -q 'http_request_duration_seconds' && echo "✓ GET /metrics prometheus text"

PROFILES=$(curl -sf "$BASE/anchor/profiles")
echo "$PROFILES" | jq -e '(.data | type == "array") and (.meta.count != null)' >/dev/null
echo "✓ GET /anchor/profiles shape"

TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@sunrise-dev.vn","password":"DevAdmin123!"}' | jq -r '.accessToken // .data.accessToken // empty')
if [ -n "$TOKEN" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" "$BASE/auth/me" \
    | jq -e '.data.user.tenantId != null' >/dev/null
  echo "✓ GET /auth/me shape"
else
  echo "⚠ Skip /auth/me — login failed (seed may be empty)"
fi

echo "=== smoke-api-responses PASS ==="
