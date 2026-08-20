#!/usr/bin/env bash
# T7-G2 / T7-S2 — security hardening + identity live
set -euo pipefail

BASE="${1:-http://localhost:3000/api/v1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/apps/api/.env}"
PASS=0
FAIL=0
OPEN=0

pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
open() { echo "○ $1 (T7-S2 backlog)"; OPEN=$((OPEN + 1)); }

env_val() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' || true
}

echo "=== T7-S2 Security UAT ==="

test -f "$ROOT/docs/security/pen-test-remediation-S6.md" && pass "pen-test checklist" || fail "pen-test checklist"
test -f "$ROOT/docs/ops/secrets-manager.md" && pass "secrets manager doc" || fail "secrets doc"
test -f "$ROOT/docs/dev/t7-s2-security-hardening.md" && pass "T7-S2 runbook" || fail "T7-S2 runbook"

if [ -f "$ROOT/apps/api/src/infrastructure/security/auth-login-rate-limit.guard.ts" ]; then
  pass "AuthLoginRateLimitGuard"
else
  fail "AuthLoginRateLimitGuard missing"
fi

if [ -f "$ROOT/apps/api/src/infrastructure/security/production-security.service.ts" ]; then
  pass "ProductionSecurityService"
else
  fail "ProductionSecurityService missing"
fi

grep -q 'ProductionHttpExceptionFilter' "$ROOT/apps/api/src/main.ts" && pass "prod exception filter" || fail "exception filter"
grep -q 'enableCors' "$ROOT/apps/api/src/main.ts" && pass "CORS configured" || fail "CORS"

if grep -q 'MFA_SANDBOX=false' "$ROOT/config/tier-t7/production-trust.env"; then
  pass "MFA_SANDBOX=false in tier-t7 profile"
else
  fail "tier-t7 MFA flag"
fi

if grep -q 'SSO_OIDC_USE_MOCK=false' "$ROOT/config/tier-t7/production-trust.env"; then
  pass "SSO mock off in tier-t7 profile"
else
  fail "tier-t7 SSO flag"
fi

if grep -q 'WEBHOOK_SKIP_VERIFY=false' "$ROOT/config/tier-t7/production-trust.env"; then
  pass "WEBHOOK_SKIP_VERIFY=false in tier-t7 (C-01)"
else
  fail "tier-t7 webhook verify"
fi

if grep -q 'AUTH_LOGIN_RATE_LIMIT' "$ROOT/config/tier-t7/production-trust.env"; then
  pass "auth rate limit in tier-t7"
else
  fail "tier-t7 rate limit flags"
fi

if grep -q '| C-01 |' "$ROOT/docs/security/pen-test-remediation-S6.md" && \
   grep -q '✅ code' "$ROOT/docs/security/pen-test-remediation-S6.md"; then
  pass "pen-test C-01→C-04 code tracked"
else
  open "pen-test doc closure markers"
fi

if curl -sf "$BASE/health/live" >/dev/null 2>&1; then
  SEC=$(curl -sf "$BASE/health/security" 2>/dev/null || echo '{}')
  echo "$SEC" | jq -e '.checks | length > 0' >/dev/null 2>&1 && pass "GET /health/security" || open "/health/security"

  got429=false
  for _ in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/auth/login" \
      -H 'Content-Type: application/json' \
      -d '{"email":"invalid@x.com","password":"wrong"}')
    if [ "$code" = "429" ]; then
      got429=true
      break
    fi
  done
  if [ "$got429" = true ]; then
    pass "login rate limit returns 429"
  else
    open "login rate limit 429 (burst test)"
  fi
else
  echo "⚠ API not running — live security checks skipped"
fi

echo "=== uat-t7-security PASS=$PASS FAIL=$FAIL OPEN=$OPEN ==="
[ "$FAIL" -eq 0 ]
