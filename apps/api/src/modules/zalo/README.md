# Zalo OA / ZNS (UC-NW-01 · AC-US-NW-01)

Omnichannel Zalo — lead inbound webhook + ZNS outbound via **Zalo Graph API** (P2 live).

## Flow (BR-05)

```
Zalo OA webhook (user_send_text)
  → parse name/phone from message
  → dedup msg_id (idempotency zalo:{id})
  → CRM createLead (ZALO_OA)
  → AI scoring enqueue + routing
```

ZNS outbound:

```
POST /integrations/zalo/zns/send
  → ZALO_ZNS_SANDBOX=true  → local delivery log (dev default)
  → ZALO_ZNS_SANDBOX=false → business.openapi.zalo.me/message/template
  → audit ZALO_ZNS_SENT + provider msg_id
```

Payment success hook (AC-US-NW-02):

```
payment.success webhook
  → ledger + booking DEPOSITED
  → ZaloPaymentNotifyService.notifyPaymentSuccess
  → ZNS template BOOKING_CONFIRM to buyer phone (from lead)
  → dedup source PAYMENT_SUCCESS:{paymentIntentId}
  → webhook result includes znsDeliveryId
```

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| POST | `/webhooks/zalo` | Public + signature | Ingest OA message |
| GET | `/integrations/zalo/status` | JWT | SCR-ADMIN-013 status + graphMode |
| POST | `/integrations/zalo/simulate` | JWT | AC-US-NW-01 sandbox |
| POST | `/integrations/zalo/zns/send` | JWT | ZNS template (sandbox or live) |
| GET | `/integrations/zalo/oauth/start` | JWT | PKCE authorization URL |
| GET | `/integrations/zalo/oauth/callback` | Public | Zalo redirect → save tokens |
| POST | `/integrations/zalo/oauth/connect` | JWT | Legacy manual refresh token |
| POST | `/integrations/zalo/oauth/verify` | JWT | Ping Graph API get OA profile |

## Env

| Var | Default | Mô tả |
|-----|---------|--------|
| `ZALO_APP_ID` | `zalo_app_dev` | Zalo app ID |
| `ZALO_OA_SECRET` | — | OA secret (webhook + OAuth) |
| `ZALO_OA_ACCESS_TOKEN` | — | Optional env fallback token |
| `ZALO_OA_REFRESH_TOKEN` | — | Optional env fallback refresh |
| `ZALO_WEBHOOK_SKIP_SIGNATURE` | — | `true` for local dev |
| `ZALO_ZNS_SANDBOX` | `true` | `false` → call Graph API |
| `ZALO_PAYMENT_ZNS_ENABLED` | `true` | Auto ZNS on payment.success |
| `ZALO_OAUTH_REDIRECT_URI` | `http://localhost:3000/api/v1/integrations/zalo/oauth/callback` | Register in Zalo app |
| `ZALO_OAUTH_SUCCESS_URL` | `http://localhost:5174/admin/integrations/zalo` | Post-OAuth admin redirect |
| `ZALO_ZNS_URL` | business.openapi ZNS URL | Override for compat |

## Go live (P2)

1. Tạo Zalo OA app, lấy `app_id` + `secret_key`
2. Đăng ký callback URL = `ZALO_OAUTH_REDIRECT_URI` trong Zalo Developer
3. Admin UI → **Connect with Zalo** (hoặc `GET /integrations/zalo/oauth/start`)
4. Set `ZALO_ZNS_SANDBOX=false` → ZNS live + payment hook AC-US-NW-02

## OAuth redirect flow

```
GET /oauth/start (JWT)
  → PKCE state in Redis (10 min)
  → redirect admin to oauth.zaloapp.com/v4/oa/permission

GET /oauth/callback?code&state (Public)
  → exchange code + code_verifier
  → save tokens on OA binding
  → redirect ZALO_OAUTH_SUCCESS_URL?oauth=success
```

## Seed

`oa_sunrise_dev` → `ten_dev_01` (tokens null → sandbox)

## Smoke

```bash
# Connect token (redirect — preferred)
open "http://localhost:5174/admin/integrations/zalo" # Connect with Zalo

# Legacy manual connect
curl -s -X POST http://localhost:3000/api/v1/integrations/zalo/oauth/connect \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}' | jq .

# Verify Graph API
curl -s -X POST http://localhost:3000/api/v1/integrations/zalo/oauth/verify \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' -d '{}' | jq .

# Live ZNS (ZALO_ZNS_SANDBOX=false)
curl -s -X POST http://localhost:3000/api/v1/integrations/zalo/zns/send \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"phone":"84901234567","templateId":"YOUR_TEMPLATE_ID"}' | jq .
```

Web: `/admin/integrations/zalo` (SCR-ADMIN-013)
