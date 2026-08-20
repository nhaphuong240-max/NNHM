#!/usr/bin/env bash
# Apply T7-S5 money rails profile (merge into target .env)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/apps/api/.env}"
SOURCE="$ROOT/config/tier-t7/production-trust.env"

if [[ ! -f "$SOURCE" ]]; then
  echo "✗ Missing $SOURCE"
  exit 1
fi

awk -F= '
  /^[[:space:]]*#/ { next }
  /^[[:space:]]*$/ { next }
  {
    key=$1
    sub(/^[^=]*=/, "", $0)
    val=$0
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
    if (key ~ /^(PAYMENT_|VNPAY_|SETTLEMENT_|ESCROW_|BANK_|REGULATORY_|WEBHOOK_SKIP)/) {
      upsert[key]=val
    }
  }
  END {
    for (k in upsert) print k "=" upsert[k]
  }
' "$SOURCE" > /tmp/wereal-tier-t7-money.keys

while IFS= read -r line; do
  key="${line%%=*}"
  val="${line#*=}"
  if grep -q "^${key}=" "$TARGET" 2>/dev/null; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$TARGET"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$TARGET"
    fi
  else
    echo "${key}=${val}" >>"$TARGET"
  fi
done </tmp/wereal-tier-t7-money.keys

echo "✓ Applied T7-S5 money keys from production-trust.env → $TARGET"
