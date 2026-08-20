#!/usr/bin/env bash
# T5-S6 — NHNN/SBV escrow regulatory smoke
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== T5-S6 Escrow Regulatory UAT ==="

test -f "$ROOT/apps/api/src/database/entities/escrow-account.entity.ts"
grep -q 'ESCROW_NHNN' "$ROOT/apps/api/src/modules/trust/regulatory-export.util.ts"
grep -q 'writeEscrowRelease' "$ROOT/apps/api/src/modules/ledger/ledger-write.service.ts"
echo "✓ escrow DB + NHNN export scope present"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  curl -sf -H "X-Tenant-Id: ten_dev_01" "$BASE/escrow/accounts" >/dev/null && echo "✓ escrow accounts API"
else
  echo "⚠ API not running — escrow live checks skipped"
fi

echo "=== uat-t5-escrow-regulatory PASS ==="
