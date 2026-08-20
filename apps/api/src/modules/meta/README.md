# Meta Lead Ads (UC-NW-02 · TC-21)

Meta trước Zalo — omnichannel BĐS ads phổ biến nhất VN pilot.

## Flow (BR-05)

```
Meta Leadgen webhook
  → normalize field_data
  → dedup leadgen_id (idempotency meta:{id})
  → CRM createLead (META_LEAD)
  → AI scoring enqueue + routing
```

Zalo OA (UC-NW-01) — live tại `/admin/integrations/zalo`.

## Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/webhooks/meta` | Public | Meta verify `hub.challenge` |
| POST | `/webhooks/meta` | Public + signature | Ingest leadgen |
| GET | `/integrations/meta/status` | JWT | SCR-ADMIN-011 status |
| POST | `/integrations/meta/simulate` | JWT | TC-21 sandbox |

## Env

| Var | Default | Mô tả |
|-----|---------|--------|
| `META_VERIFY_TOKEN` | `wereal-meta-verify-dev` | Webhook verify |
| `META_APP_SECRET` | — | X-Hub-Signature-256 |
| `META_WEBHOOK_SKIP_SIGNATURE` | — | `true` for local dev |

## Seed

`page_sunrise_dev` → `ten_dev_01`

## Smoke (TC-21)

```bash
# Verify
curl -s 'http://localhost:3000/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=wereal-meta-verify-dev&hub.challenge=ok'

# Simulate lead
curl -s -X POST http://localhost:3000/api/v1/integrations/meta/simulate \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Meta TC-21","phone":"+84901239999","campaignId":"camp_pilot"}' | jq .
```

Web: `/admin/integrations/meta` (SCR-ADMIN-011)
