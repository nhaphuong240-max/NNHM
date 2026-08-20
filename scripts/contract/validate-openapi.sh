#!/usr/bin/env bash
# T3-S3 / T7-S3 — OpenAPI contract validation
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== OpenAPI contract validation ==="

if ! command -v npx >/dev/null 2>&1; then
  echo "npx required"
  exit 1
fi

echo "--- Spectral lint ---"
npx --yes @stoplight/spectral-cli lint openapi.yaml openapi.ops-s6-extensions.yaml --ruleset .spectral.yaml

echo "--- Route coverage (OPS-S6-04) ---"
node scripts/contract/validate-route-coverage.mjs

echo "--- JSON parse check ---"
node -e "JSON.parse(require('fs').readFileSync('openapi.json','utf8'))"

echo "--- Operation count (paths) ---"
node -e "const fs=require('fs');const y=fs.readFileSync('openapi.yaml','utf8');const m=[...y.matchAll(/^  \\/[^:\\n]+:/gm)];console.log('paths~',m.length)"

if [ -x "$ROOT/scripts/contract/smoke-api-responses.sh" ] && curl -sf "${BASE_URL:-http://localhost:3000/api/v1}/health/live" >/dev/null 2>&1; then
  echo "--- Response shape smoke (live API) ---"
  "$ROOT/scripts/contract/smoke-api-responses.sh" "${BASE_URL:-http://localhost:3000/api/v1}"
fi

echo "=== openapi-contract PASS ==="
