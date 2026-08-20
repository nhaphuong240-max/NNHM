#!/usr/bin/env bash
# Mobile Agent UX — push live · offline lead capture · WAU no simulate
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== Mobile Agent UX UAT ==="

test -f "$ROOT/apps/mobile/src/services/leadCaptureQueue.ts" && pass "lead capture queue" || fail "lead queue"
test -f "$ROOT/apps/mobile/src/hooks/useLeadCaptureSync.ts" && pass "lead capture sync hook" || fail "sync hook"
test -f "$ROOT/apps/mobile/src/hooks/useAgentSession.ts" && pass "WAU session hook" || fail "session hook"
test -f "$ROOT/apps/api/src/modules/mobile-agent/expo-push.service.ts" && pass "Expo push live service" || fail "expo push"
grep -q "Post('activity')" "$ROOT/apps/api/src/modules/mobile-agent/mobile-agent.controller.ts" && pass "mobile activity API" || fail "activity API"

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"agent@sunrise-dev.vn","password":"Agent123!"}' \
    | jq -r '.accessToken // .data.accessToken // empty' 2>/dev/null)
  if [ -n "$TOKEN" ]; then
    AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01")
    ACT=$(curl -sf -X POST "${AUTH[@]}" "$BASE/mobile/activity" \
      -H 'Content-Type: application/json' \
      -d '{"eventType":"APP_SESSION"}' 2>/dev/null || echo '{}')
    SIM=$(echo "$ACT" | jq -r '.data.wauSimEnabled // empty' 2>/dev/null)
    if [ "$SIM" = "false" ]; then pass "WAU sim disabled (real activity)"; else fail "WAU sim flag ($SIM)"; fi
    WAU=$(curl -sf "${AUTH[@]}" "$BASE/analytics/agent/wau?days=7" 2>/dev/null || echo '{}')
    echo "$WAU" | jq -e '.data.wauSimEnabled == false' >/dev/null 2>&1 && pass "agent/wau excludes PILOT_SYNC" || fail "agent/wau sim"
    PUSH=$(curl -sf -X POST "${AUTH[@]}" "$BASE/mobile/notifications/stub" \
      -H 'Content-Type: application/json' \
      -d '{"title":"UAT","body":"Mobile Agent push"}' 2>/dev/null || echo '{}')
    MODE=$(echo "$PUSH" | jq -r '.meta.mode // empty' 2>/dev/null)
    [ -n "$MODE" ] && pass "push delivery mode=$MODE" || fail "push stub meta"
  else
    fail "agent login"
  fi
else
  echo "⚠ API not running — live checks skipped"
fi

echo "=== uat-mobile-agent-ux PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
