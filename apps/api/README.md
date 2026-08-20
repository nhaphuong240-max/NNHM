# WEREAL API — NestJS Modular Monolith

Production backend theo **ADR-001**. Contract: [`openapi.yaml`](../../openapi.yaml).

## Quick start (S1 — Postgres)

```bash
cd WEREAL/apps/api
cp .env.example .env
docker compose up -d          # Postgres + Redis
npm install
npm run start:dev
```

- Health: http://localhost:3000/api/v1/health
- **Units (DB):** http://localhost:3000/api/v1/units
- Header tenant (optional): `X-Tenant-Id: ten_dev_01`

### Verify S1-04

```bash
curl -s http://localhost:3000/api/v1/health | jq .
curl -s -H 'X-Tenant-Id: ten_dev_01' http://localhost:3000/api/v1/units | jq .
```

Seed tự chạy lần đầu: 1 tenant · 1 project · **4 units** · demo users (passwords below).

## Auth — S1-02 JWT (UC-ID-03)

```bash
# Login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@sunrise-dev.vn","password":"Agent123!"}' | jq .

# Use token (tenant must match JWT — cross-tenant → 403)
TOKEN=<accessToken from login>
curl -s http://localhost:3000/api/v1/units \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .

# Cross-tenant test → 403
curl -s http://localhost:3000/api/v1/units \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_other' | jq .
```

| User | Password | Role |
|------|----------|------|
| `admin@sunrise-dev.vn` | `DevAdmin123!` | DEVELOPER_ADMIN |
| `agent@sunrise-dev.vn` | `Agent123!` | AGENT |

Public (no JWT): `/health`, `/auth/login`, `/auth/refresh`, `/search/units`, `/` discovery.

## Sprint S2 — GR write · Listing · Search

| Task | Endpoint |
|------|----------|
| S2-01 PATCH unit | `PATCH /api/v1/units/{id}` + `expectedVersion` → 409 nếu conflict |
| S2-02 Anti-drift | PASS/FLAG/BLOCK khi POST listing |
| S2-03 Listing | `POST /api/v1/listings` |
| S2-04 Moderation | `POST .../submit-review` · `PATCH .../approve` · `PATCH .../reject` |
| S2-05 Audit | `GET /api/v1/audit/events?entityType=unit` |
| S2-06 Web | `apps/web` → http://localhost:5174/public/search |

Demo script: [`apps/web/README.md`](../web/README.md)

## Sprint S3 — Booking + Redis lock (UC-BK-01)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"agent@sunrise-dev.vn","password":"Agent123!"}' | jq -r .accessToken)

# Book unit un_02 (AVAILABLE in seed)
curl -s -X POST http://localhost:3000/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'X-Idempotency-Key: demo-book-01' \
  -H 'Content-Type: application/json' \
  -d '{"unitId":"un_02","leadId":"ld_01","depositAmount":50000000}' | jq .

# Second book same unit → 409 Conflict
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/v1/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"unitId":"un_02","leadId":"ld_02"}'
```

| Task | Detail |
|------|--------|
| S3-01 | `SET NX EX` Redis lock `{tenant}:lock:unit:{unitId}` — atomic, 0 double-book |
| S3-02 | Cron mỗi phút — booking `RESERVED` quá `expiresAt` → release lock, unit `AVAILABLE` (BR-17) |

Health checks Redis: `checks.redis` in `GET /health`.

## Sprint S3 — CRM · SSE · Booking events

```bash
# POST lead (public form — no JWT, tenant via header or DEFAULT_TENANT_ID)
curl -s -X POST http://localhost:3000/api/v1/leads \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Nguyễn Thu Trang","phone":"+84901234567","unitId":"un_01","source":"PUBLIC_FORM"}' | jq .

# SSE unit status (requires JWT)
TOKEN=...
curl -N -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  http://localhost:3000/api/v1/stream/units
```

Events pushed on booking create/expire, GR PATCH status, lead+unit, payment intent.

## Sprint S4 — PaymentIntent (ADR-004)

```bash
# After booking un_02
curl -s -X POST http://localhost:3000/api/v1/payment-intents \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"bookingId":"bk_xxx","amount":50000000,"method":"MOCK"}' | jq .
```

| Method | Detail |
|--------|--------|
| `MOCK` | Dev redirect URL (default `PAYMENT_DEFAULT_METHOD`) |
| `VNPAY` | Sandbox signed redirect to vnpayment.vn |

### S4-02 — Webhook idempotent (BR-21)

```bash
# Sign payload (dev secret from .env WEBHOOK_HMAC_SECRET)
BODY='{"eventId":"evt_demo_01","eventType":"payment.success","transactionId":"MOCK_TXN","amount":50000000,"paymentIntentId":"pi_xxx","tenantId":"ten_dev_01"}'
SIG=$(node -e "const c=require('crypto');const b=$BODY;console.log(c.createHmac('sha256','wereal-dev-webhook-secret-change-me').update(b).digest('hex'))")

curl -s -X POST http://localhost:3000/api/v1/webhooks/payment \
  -H 'Content-Type: application/json' \
  -H "X-Signature: $SIG" \
  -d "$BODY" | jq .

# Replay same eventId → idempotentReplay:true, same ledgerEntryId
```

Or use MOCK gateway redirect: open `paymentUrl` from intent → `GET /payments/mock/complete` auto-fires webhook.

### S4-03 — Double-entry ledger (BR-18)

Mỗi payment success → **1 journal** (`jrn_*`) với **2 lines**:
- DEBIT `CASH_MOCK` / `CASH_VNPAY`
- CREDIT `DEPOSIT_LIABILITY` (cùng amount)

```bash
curl -s http://localhost:3000/api/v1/ledger/entries \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .

curl -s 'http://localhost:3000/api/v1/ledger/entries?bookingId=bk_xxx' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .
```

Response `meta.balanced: true` khi tổng debit = credit.

### S4-04 — Daily reconciliation (API-066)

Cron **06:00 ICT** so sánh gateway webhooks vs ledger journals (ngày hôm trước).

```bash
# Report hôm nay (ICT)
curl -s 'http://localhost:3000/api/v1/ledger/reconciliation' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .

# Report ngày cụ thể / force refresh
curl -s 'http://localhost:3000/api/v1/ledger/reconciliation?date=2026-07-28&refresh=true' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .

# 7 ngày — gate OP-WIN-02 (matchRate)
curl -s 'http://localhost:3000/api/v1/ledger/reconciliation?days=7' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq '.meta.matchRate'
```

`status: MATCHED` khi `gatewayTotal === ledgerTotal` và không có discrepancies.

### S4-05 — Refund + ledger reversal (UC-PAY-03 / UC-BK-05)

MOCK gateway refund **sync** → ledger reversal ngay. VNPAY **async** → `PENDING` refund + webhook `payment.refunded`.

```bash
# Direct refund (after payment success)
curl -s -X POST http://localhost:3000/api/v1/refunds \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"paymentIntentId":"pi_xxx","reason":"Customer cancelled"}' | jq .

# Cancel deposited booking → auto refund (API-057)
curl -s -X DELETE http://localhost:3000/api/v1/bookings/bk_xxx \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Buyer withdrew","initiateRefund":true}' | jq .

# Async refund webhook (VNPAY path)
BODY='{"eventId":"evt_refund_01","eventType":"payment.refunded","transactionId":"VNPAY_REF","amount":50000000,"paymentIntentId":"pi_xxx","refundId":"rf_xxx","tenantId":"ten_dev_01"}'
SIG=$(node -e "const c=require('crypto');const b=$BODY;console.log(c.createHmac('sha256','wereal-dev-webhook-secret-change-me').update(b).digest('hex'))")
curl -s -X POST http://localhost:3000/api/v1/webhooks/payment \
  -H 'Content-Type: application/json' \
  -H "X-Signature: $SIG" \
  -d "$BODY" | jq .
```

Reversal journal (ADR-004): DEBIT `DEPOSIT_LIABILITY` · CREDIT `CASH_*` · booking/intent → `REFUNDED` · unit → `AVAILABLE`.

## Sprint S5 — Commission OS (UC-COM-01→05)

Seed policy `cp_sunrise_v1` · 2.5% deposit · split PRIMARY 70% / AGENCY 30%.

```bash
# List policies
curl -s http://localhost:3000/api/v1/commission/policies?projectId=prj_sunrise \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' | jq .

# Close deal (booking DEPOSITED) → snapshot + split lines
curl -s -X POST http://localhost:3000/api/v1/commission/deals/bk_xxx/close \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' | jq .

# Holdback on dispute (blocks payout)
curl -s -X POST http://localhost:3000/api/v1/commission/snapshots/cs_xxx/holdback \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' -d '{"reason":"Split dispute"}' | jq .

# Approve lines + settlement run (G2.1)
curl -s -X POST http://localhost:3000/api/v1/commission/lines/approve \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"entryIds":["ce_settle01","ce_settle02"]}' | jq .

curl -s -X POST http://localhost:3000/api/v1/commission/settlement/runs \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  -H 'Content-Type: application/json' \
  -d '{"label":"Pilot close"}' | jq .

# Export commission CSV (UC-COM-05)
curl -s 'http://localhost:3000/api/v1/commission/export.csv' \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01'

# Audit export CSV (S5-05)
curl -s 'http://localhost:3000/api/v1/audit/events/export.csv' \
  -H "Authorization: Bearer $TOKEN" -H 'X-Tenant-Id: ten_dev_01'
```

Web UI: http://localhost:5174/developer/commission (login admin@sunrise-dev.vn)

## Docker

```bash
docker compose up -d    # postgres:5432 · redis:6379
docker compose down -v  # reset DB volume
```

| Service | URL |
|---------|-----|
| Postgres | `postgresql://wereal:wereal@localhost:5432/wereal` |
| Redis | `redis://localhost:6379` |

## Modules

| Folder | Domain | Sprint |
|--------|--------|--------|
| `database/` | TypeORM entities + seed | S1 |
| `identity` | Tenant, JWT, RBAC | S1 |
| `golden-record` | Units, anti-drift | S1–S2 |
| `booking` | Lock, state machine | S3 |
| `payment` | Gateway adapter ADR-004 | S4 |
| `ledger` | Double-entry, reconcile | S4 |
| `audit` | UC-TR-01 | S2 |
| `commission` | UC-COM-* | S5 |

## Scripts

```bash
npm run build
npm run test
npm run lint
npm run db:up      # docker compose up -d
npm run db:reset   # docker compose down -v && docker compose up -d
```

## Dev process

- [`docs/dev/Ke-hoach-lap-trinh-BA.md`](../../docs/dev/Ke-hoach-lap-trinh-BA.md)
- [`docs/dev/Sprint-Backlog-P0.md`](../../docs/dev/Sprint-Backlog-P0.md)
