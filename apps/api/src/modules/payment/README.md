# Payment module

**Path:** `apps/api/src/modules/payment`  
**UC:** UC-PAY-01, UC-PAY-03 · **Sprint:** S4

## Responsibility

Payment intents, gateway adapters (MOCK/VNPAY), webhook ingestion (HMAC + idempotency), refunds.

## Key endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/payment-intents` | JWT |
| GET | `/payment-intents/:id/checkout` | Public + `X-Tenant-Id` (SCR-BUYER-004) |
| GET | `/payments/mock/complete` | Public (dev MOCK) |
| POST | `/webhooks/payment` | Public + `X-Signature` |
| POST | `/refunds` | JWT |
| GET | `/refunds` | JWT |
| GET | `/integrations/payment-gateways` | UC-PAY-05 routing rules (SCR-ADMIN-017) |
| POST | `/integrations/payment-gateways/simulate` | Route + fallback simulate |
| PATCH | `/integrations/payment-gateways/rules/:ruleId` | Enable/disable rule |

## Webhook events

- `payment.success` → booking DEPOSITED + ledger journal + **ZNS booking confirm** (AC-US-NW-02 via `ZaloModule`)
- `payment.refunded` → reversal entries

## Env

| Variable | Purpose |
|----------|---------|
| `WEBHOOK_HMAC_SECRET` | Signature verification |
| `WEBHOOK_SKIP_VERIFY` | **Dev only** — must be false in prod |

## Runbooks

`docs/runbooks/payment-webhook.md`

## Tests

`payment-webhook.service.spec.ts`, `refund.service.spec.ts`, `payment.service.spec.ts`

## Web UI

`/finance/refunds` — SCR-FIN-005
