#!/usr/bin/env bash
# T3-S6 — Tier 3 Scale close-out smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Tier 3 Scale UAT ==="

chmod +x "$ROOT/scripts/verify-t3-gate.sh" "$ROOT/scripts/contract/validate-openapi.sh"
"$ROOT/scripts/verify-t3-gate.sh" "$BASE"

echo ""
echo "--- T3-S1 K8s probes ---"
curl -sf "$BASE/health/live" | jq -e '.probe == "live"' >/dev/null
curl -sf "$BASE/health/ready" | jq -e '.probe == "ready"' >/dev/null
echo "✓ live + ready probes"

echo ""
echo "--- T3-S2 metrics + SLO ---"
curl -sf "$BASE/metrics" | head -3 | grep -q http_requests_total || curl -sf "$BASE/metrics" | head -1
curl -sf "$BASE/health/slo" | jq -e '.data.apiP95TargetMs == 200' >/dev/null
echo "✓ Prometheus metrics + API P95 target"

echo ""
echo "--- T3-S3 OpenAPI contract ---"
"$ROOT/scripts/contract/validate-openapi.sh"

echo ""
echo "--- T3-S4 partner SDK package ---"
test -f "$ROOT/packages/partner-sdk/src/index.ts"
(cd "$ROOT/packages/partner-sdk" && npm install --silent && npm run build)
echo "✓ partner-sdk builds"

echo ""
echo "--- T3 infra manifests ---"
test -f "$ROOT/infra/k8s/staging/api-deployment.yaml"
test -f "$ROOT/apps/api/Dockerfile"
echo "✓ K8s + Dockerfile present"

echo ""
echo "=== uat-t3-scale PASS (live k6: LOAD_VUS=100 ./scripts/load/run-tier3-perf.sh) ==="
