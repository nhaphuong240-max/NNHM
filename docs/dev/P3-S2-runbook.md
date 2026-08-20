# P3-S2 Runbook — Concurrent booking · Load evidence (OP-WIN-01)

> **Sprint:** P3-S2 · **Gate:** OP-WIN-01  
> **Tenant:** `ten_dev_01` · **Demo users:** `admin@sunrise-dev.vn` / `DevAdmin123!`

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
```

See [load-testing.md](./load-testing.md) for k6 install and thresholds.

## Automated verification

```bash
# UAT-05 — 2 parallel → 1 OK 1 conflict (unit un_03)
./scripts/uat-p3-s2.sh

# k6 — 50 parallel → exactly 1 RESERVED (unit un_04)
./scripts/load/run-concurrent-book.sh
```

**Pass criteria:**

| Check | Expected |
|-------|----------|
| UAT-05 parallel curl | 1× HTTP 201 · 1× HTTP 409 |
| RESERVED count on unit | ≤ 1 (0 double-book) |
| k6 `booking_success` | `count == 1` |
| k6 `booking_conflict` | `count == 49` (when VUS=50) |
| `GET /bookings/status` | `lockMetrics.contention` increases during burst |

## Manual walkthrough

1. Agent → pick unit `un_03` or `un_04` (AVAILABLE in seed)
2. Open two terminals — POST `/bookings` with different `X-Idempotency-Key`
3. Confirm one booking RESERVED · second returns 409 with `existingBookingId`
4. Admin → verify unit status RESERVED in inventory / booking list

## Sign-off

Update [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md) UAT-05 after `./scripts/uat-p3-s2.sh` + k6 pass.

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [load-testing.md](./load-testing.md)
- [scripts/uat-p3-s2.sh](../../scripts/uat-p3-s2.sh)
- [scripts/load/concurrent-book.k6.js](../../scripts/load/concurrent-book.k6.js)
