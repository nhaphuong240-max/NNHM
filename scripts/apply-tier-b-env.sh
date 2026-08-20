#!/usr/bin/env bash
# Apply Tier B live-rail flag profile to an env file (upsert keys, preserve secrets/infra)
set -euo pipefail

PROFILE="${1:-staging}"
TARGET="${2:-apps/api/.env}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE_FILE="$ROOT/config/tier-b/${PROFILE}.env"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "✗ Unknown profile '$PROFILE' — use: staging | production | staging-local"
  exit 1
fi

if [[ "$TARGET" = /* ]]; then
  ENV_PATH="$TARGET"
else
  ENV_PATH="$ROOT/$TARGET"
fi

mkdir -p "$(dirname "$ENV_PATH")"
if [[ -f "$ENV_PATH" ]]; then
  cp "$ENV_PATH" "${ENV_PATH}.tier-b-backup"
  echo "✓ Backup → ${ENV_PATH}.tier-b-backup"
else
  cp "$ROOT/apps/api/.env.example" "$ENV_PATH"
  echo "✓ Seeded from .env.example"
fi

upsert_key() {
  local key="$1"
  local val="$2"
  local tmp
  tmp="$(mktemp)"
  if grep -qE "^${key}=" "$ENV_PATH" 2>/dev/null; then
    awk -v k="$key" -v v="$val" '
      BEGIN { done=0 }
      $0 ~ "^" k "=" { print k "=" v; done=1; next }
      { print }
      END { if (!done) print k "=" v }
    ' "$ENV_PATH" >"$tmp"
  else
    cp "$ENV_PATH" "$tmp"
    printf '\n%s=%s\n' "$key" "$val" >>"$tmp"
  fi
  mv "$tmp" "$ENV_PATH"
}

echo "=== Apply Tier B profile: $PROFILE → $ENV_PATH ==="
count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -z "$line" ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  upsert_key "$key" "$val"
  echo "  ✓ $key=$val"
  count=$((count + 1))
done <"$PROFILE_FILE"

echo ""
echo "Applied $count flags. Next:"
echo "  ./scripts/verify-production-flags.sh --profile $PROFILE $TARGET"
echo "  ./scripts/uat-tier-b-rails.sh http://localhost:3000/api/v1"
