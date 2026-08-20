#!/usr/bin/env bash
# T7-S3 — staging blue/green deploy (dry-run default)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/infra/k8s/staging"
DRY_RUN="${DEPLOY_DRY_RUN:-true}"
NAMESPACE="${K8S_NAMESPACE:-wereal-staging}"
BASE_URL="${STAGING_API_URL:-https://staging-api.wereal.vn/api/v1}"

echo "=== Deploy staging (T7-S3 blue/green) ==="
echo "Namespace: $NAMESPACE · DRY_RUN=$DRY_RUN"

for f in "$K8S_DIR"/api-configmap.yaml "$K8S_DIR"/api-deployment.yaml; do
  test -f "$f" || { echo "✗ Missing $f"; exit 1; }
  echo "✓ manifest $(basename "$f")"
done

grep -q 'OTEL_ENABLED' "$K8S_DIR/api-configmap.yaml" && echo "✓ OTEL in staging configmap"
grep -q 'health/ready' "$K8S_DIR/api-deployment.yaml" && echo "✓ readiness probe configured"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "⚠ kubectl not found — manifest validation only"
  exit 0
fi

KUBECTL=(kubectl -n "$NAMESPACE")
if [ "$DRY_RUN" = "true" ]; then
  "${KUBECTL[@]}" apply --dry-run=client -f "$K8S_DIR/" && echo "✓ kubectl dry-run client OK"
  echo "=== deploy-staging DRY-RUN PASS ==="
  exit 0
fi

echo "--- Blue deploy (current) ---"
"${KUBECTL[@]}" apply -f "$K8S_DIR/api-configmap.yaml"
"${KUBECTL[@]}" apply -f "$K8S_DIR/api-deployment.yaml"
"${KUBECTL[@]}" rollout status deployment/wereal-api --timeout=180s

echo "--- Green gate: health/ready ---"
for i in $(seq 1 30); do
  if curl -sf "$BASE_URL/health/ready" | jq -e '.status == "ok"' >/dev/null 2>&1; then
    echo "✓ staging ready"
    echo "=== deploy-staging LIVE PASS ==="
    exit 0
  fi
  sleep 5
done

echo "✗ staging health/ready failed after rollout"
exit 1
