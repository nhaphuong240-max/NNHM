#!/usr/bin/env bash
# T7-S3 — merge staging observability flags into target env file
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/apps/api/.env}"
PROFILE="$ROOT/config/tier-t7/staging-observability.env"

if [ ! -f "$PROFILE" ]; then
  echo "✗ Missing $PROFILE"
  exit 1
fi

if [[ "$TARGET" != /* ]]; then
  TARGET="$ROOT/$TARGET"
fi

touch "$TARGET"
while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^# ]] && continue
  [[ -z "${line// }" ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  tmp="$(mktemp)"
  if grep -qE "^${key}=" "$TARGET" 2>/dev/null; then
    awk -v k="$key" -v v="$line" '
      $0 ~ "^" k "=" { print v; next }
      { print }
    ' "$TARGET" > "$tmp"
  else
    cp "$TARGET" "$tmp"
    echo "$line" >> "$tmp"
  fi
  mv "$tmp" "$TARGET"
done < "$PROFILE"

echo "✓ Applied tier-t7 staging observability → $TARGET"
