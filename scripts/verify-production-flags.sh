#!/usr/bin/env bash
# Verify staging/production env flags for Tier B live rails
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="apps/api/.env"
PROFILE=""
STRICT=false

usage() {
  echo "Usage: $0 [--profile staging|production|staging-local|tier-t7] [--strict] [env-file]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="${2:-}"
      shift 2
      ;;
    --strict)
      STRICT=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      ENV_FILE="$1"
      shift
      ;;
  esac
done

if [[ "$ENV_FILE" = /* ]]; then
  FILE="$ENV_FILE"
else
  FILE="$ROOT/$ENV_FILE"
fi

echo "=== Tier B production flags: $FILE ==="
if [[ -n "$PROFILE" ]]; then
  echo "Profile: $PROFILE"
fi

if [[ ! -f "$FILE" ]]; then
  echo "✗ Missing $FILE"
  echo "  Hint: cp apps/api/.env.staging.example apps/api/.env"
  echo "        ./scripts/apply-tier-b-env.sh staging apps/api/.env"
  exit 1
fi

env_val() {
  grep -E "^${1}=" "$FILE" 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' || true
}

pass=0
warn=0

check() {
  local key="$1"
  local expected="$2"
  local val
  val="$(env_val "$key")"
  if [[ "$val" == "$expected" ]]; then
    echo "✓ $key=$expected"
    pass=$((pass + 1))
  else
    echo "⚠ $key=${val:-unset} (expected $expected)"
    warn=$((warn + 1))
  fi
}

if [[ -n "$PROFILE" ]]; then
  if [[ "$PROFILE" == "tier-t7" ]]; then
    PROFILE_FILE="$ROOT/config/tier-t7/production-trust.env"
  else
    PROFILE_FILE="$ROOT/config/tier-b/${PROFILE}.env"
  fi
  if [[ ! -f "$PROFILE_FILE" ]]; then
    echo "✗ Profile file missing: $PROFILE_FILE"
    exit 1
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    expected="${line#*=}"
    [[ -z "$key" || -z "$expected" ]] && continue
    check "$key" "$expected"
  done <"$PROFILE_FILE"

  if [[ "$PROFILE" == "tier-t7" || "$PROFILE" == "production" ]]; then
    vnpay_url="$(env_val VNPAY_PAYMENT_URL)"
    if [[ -n "$vnpay_url" && "$vnpay_url" == *sandbox* ]]; then
      echo "⚠ VNPAY_PAYMENT_URL contains sandbox in prod/tier-t7 profile"
      warn=$((warn + 1))
    fi
    stub_val="$(env_val REGULATORY_EXPORT_STUB)"
    if [[ "$stub_val" == "false" ]]; then
      key_len="$(env_val REGULATORY_EXPORT_ENCRYPTION_KEY)"
      if [[ ${#key_len} -lt 32 ]]; then
        echo "⚠ REGULATORY_EXPORT_ENCRYPTION_KEY unset or <32 when REGULATORY_EXPORT_STUB=false"
        warn=$((warn + 1))
      fi
    fi
  fi
else
  check SETTLEMENT_PAYOUT_ENABLED true
  check PUSH_LIVE_ENABLED true
  check ESCROW_BANK_PARTNER_ENABLED true
  check SSO_OIDC_USE_MOCK false
  check MFA_SANDBOX false
  check ESIGN_SANDBOX false
  grep -q '^PUSH_LIVE_ENABLED=' "$FILE" || {
    echo "⚠ PUSH_LIVE_ENABLED not in $FILE"
    warn=$((warn + 1))
  }
  grep -q '^ESCROW_BANK_PARTNER_ENABLED=' "$FILE" || {
    echo "⚠ ESCROW_BANK_PARTNER_ENABLED not in $FILE"
    warn=$((warn + 1))
  }
fi

echo ""
echo "=== verify-production-flags: PASS=$pass WARN=$warn ==="
if [[ "$STRICT" == true && "$warn" -gt 0 ]]; then
  exit 1
fi
