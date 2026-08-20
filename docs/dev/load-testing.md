# Load testing — concurrent booking (UC-BK-01 · OP-WIN-01)

> **Sprint:** P3-S2 · **Gate:** OP-WIN-01 (0 double-book)  
> **Tenant:** `ten_dev_01` · **API:** `http://localhost:3000/api/v1`

## Prerequisites

| Component | Command |
|-----------|---------|
| Postgres + Redis | `cd apps/api && docker compose up -d` |
| API | `npm run start:dev` (or `npx nest build && node dist/main.js`) |
| k6 | [Install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) |
| curl + jq | UAT shell scripts |

**Demo credentials:** `admin@sunrise-dev.vn` / `DevAdmin123!`

## Test matrix

| Script | VUs | Unit (default) | Pass criteria |
|--------|-----|----------------|---------------|
| `scripts/uat-p3-s2.sh` | 2 parallel curl | `un_03` | 1×201 + 1×409 · 1 RESERVED on unit |
| `scripts/load/concurrent-book.k6.js` | 100 (default) | `un_04` | 1×201 + 99×409 · `booking_other==0` |
| `booking.service.spec.ts` | 10 Promise.allSettled | mock | 1 fulfilled · 9 ConflictException |

## Quick run

```bash
# UAT-05 — 2 parallel bookings (OP-WIN-01 manual evidence)
chmod +x scripts/uat-p3-s2.sh scripts/load/run-concurrent-book.sh
./scripts/uat-p3-s2.sh

# k6 — 100 parallel bookings (Tier 3 default)
./scripts/load/run-concurrent-book.sh

# Tier 3 full perf suite
LOAD_VUS=100 P95_TARGET_MS=200 ./scripts/load/run-tier3-perf.sh

# Custom
LOAD_UNIT_ID=un_04 LOAD_VUS=100 BASE_URL=http://localhost:3000/api/v1 k6 run scripts/load/concurrent-book.k6.js
```

## Thresholds (P3-S2 / S3-06)

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| `booking_success` | `count == 1` | Exactly one Redis lock winner |
| `booking_conflict` | `count == VUS - 1` | All losers get HTTP 409 |
| `booking_other` | `count == 0` | No 5xx / unexpected status |
| `http_req_failed` | `rate < 0.05` | Network / auth stability |

**Unit tests (CI):** `apps/api` → `npm test` — `allows only one concurrent booking per unit`.

## Lock contention observability (P3-S2-03)

Redis inventory lock logs structured lines:

```
inventory_lock acquired tenant=... unit=... booking=... ttl=...s
inventory_lock contention tenant=... unit=... attempted=... holder=...
inventory_lock released tenant=... unit=...
```

**Redis counters** (per tenant):

- `{tenantId}:metrics:inventory_lock:acquired`
- `{tenantId}:metrics:inventory_lock:contention`

**API:** `GET /bookings/status` returns `lockMetrics`:

```json
{
  "module": "booking",
  "lock": "redis",
  "lockMetrics": { "acquired": 12, "contention": 48 }
}
```

During load test, `contention` should increase by ~49 per 50-VU burst on a fresh unit.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Both requests return 409 | Unit already RESERVED — use fresh `LOAD_UNIT_ID` or cancel existing booking |
| k6 `booking_success` > 1 | **Double-book bug** — stop release; file incident |
| k6 all 409 | Unit locked before burst — reset unit or pick `un_03` / `un_04` |
| Login fails | API down or DB not seeded — `docker compose down -v && up -d` |

## Evidence pack (OP-WIN-01)

1. `./scripts/uat-p3-s2.sh` output (screenshot)
2. k6 stdout summary from `./scripts/load/run-concurrent-book.sh`
3. `GET /bookings/status` lockMetrics after k6
4. API log grep: `inventory_lock contention` (optional)

## Related

- [P3-S2-runbook.md](./P3-S2-runbook.md)
- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md) UAT-05
- `apps/api/src/infrastructure/redis/inventory-lock.service.ts`
