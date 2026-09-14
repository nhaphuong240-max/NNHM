#!/usr/bin/env bash
# Phase A — enable live SMS/ZNS on VPS (run on server after keys are set).
set -euo pipefail

ENV_FILE="${1:-/var/www/nnhn/apps/api/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

patch_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

patch_env SMS_SANDBOX false
patch_env ZALO_ZNS_SANDBOX false

echo "Updated $ENV_FILE — restart API:"
echo "  sudo systemctl restart nnhn-api"
echo "Verify: curl -H 'X-Tenant-Id: ten_dev_01' https://ngoinhahomnay.vn/api/v1/crm/notifications/rails/status"
