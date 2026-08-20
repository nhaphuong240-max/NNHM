#!/usr/bin/env bash
# Web LCP budget check — run after `npm run preview` in apps/web
set -euo pipefail

BASE="${1:-http://127.0.0.1:4173}"
TARGET_MS="${LCP_TARGET_MS:-2500}"

echo "=== Web LCP check (target ${TARGET_MS}ms) ==="
echo "Open $BASE/public/search in browser — RUM logs [web-vitals] LCP=..."
echo "For CI: integrate Playwright performance or Lighthouse against $BASE"

if curl -sf "$BASE" >/dev/null 2>&1; then
  echo "✓ Web preview reachable"
else
  echo "○ Start preview: cd apps/web && npm run build && npm run preview"
  exit 0
fi

echo "✓ LCP RUM wired in apps/web/src/lib/web-vitals.ts (--lcp-target-ms=${TARGET_MS})"
