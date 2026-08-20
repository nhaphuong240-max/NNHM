#!/usr/bin/env bash
# G2.4 — EAS Build preview (internal APK / iOS ad-hoc)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PLATFORM="${1:-android}"
PROFILE="${2:-preview}"

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js + npm required."
  exit 1
fi

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "EXPO_TOKEN chưa set. Tạo tại https://expo.dev/settings/access-tokens"
  echo "  export EXPO_TOKEN=..."
  exit 1
fi

if [[ -z "${EAS_PROJECT_ID:-}" ]]; then
  echo "Chưa link EAS project. Chạy một lần:"
  echo "  cd apps/mobile && npx eas-cli init"
  echo "Sau đó export EAS_PROJECT_ID từ app.config / expo.dev dashboard."
  exit 1
fi

echo "==> Pre-flight: typecheck + test"
npm run typecheck
npm test

echo "==> EAS Build profile=${PROFILE} platform=${PLATFORM}"
npx eas-cli build \
  --profile "$PROFILE" \
  --platform "$PLATFORM" \
  --non-interactive

echo "==> Done. Cài APK từ link expo.dev hoặc: eas build:list"
