# API Marketplace module

**Path:** `apps/api/src/modules/api-marketplace`  
**UC:** UC-NW-04 · **Screen:** SCR-ADMIN-004

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/integrations/api-marketplace` | Partner catalog + recent webhook deliveries |
| POST | `/integrations/api-marketplace/partners` | Register partner + issue API key |
| POST | `/integrations/api-marketplace/partners/:id/webhooks/simulate` | Webhook delivery stub |

## Web UI

`/admin/api-marketplace`

## Tests

`api-marketplace.service.spec.ts` · `api-marketplace.util.spec.ts`
