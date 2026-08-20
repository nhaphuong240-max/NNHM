# P3-S1 Runbook — UAT foundation · Anti-drift · Timeline replay

> **Sprint:** P3-S1 · **Gates:** OP-WIN-03 · OP-WIN-04  
> **Tenant:** `ten_dev_01` · **Demo users:** `admin@sunrise-dev.vn` / `DevAdmin123!`

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
# optional web: cd apps/web && npm run dev
```

## Automated verification

```bash
# Full P3-S1 (UAT-04 + OP-WIN-03)
./scripts/uat-p3-s1.sh

# OP-WIN-03 only (existing booking optional)
./scripts/demo-booking-replay.sh
./scripts/demo-booking-replay.sh http://localhost:3000/api/v1 bk_existing_id
```

**Pass criteria:**

| Check | Expected |
|-------|----------|
| `POST /listings/drift-check` @ 4.5 tỷ | `status: BLOCK` + `basePrice` GR truth |
| `POST .../submit-review` on BLOCK listing | HTTP 422 |
| `GET /bookings/:id/replay/export.csv` rows | = `GET .../events` count |
| Script elapsed time | ≤ 180s (OP-WIN-03) |

## Manual UI walkthrough

### UAT-04 / OP-WIN-04

1. Login agent → http://localhost:5174/agent/listings/new
2. Chọn unit `un_01` (GR ~3.85 tỷ)
3. Click **4.5 tỷ (BLOCK · UAT-04)** preset
4. Verify **DriftPanel** shows BLOCK + GR giá gốc
5. **Gửi duyệt** disabled · error if forced
6. Click **Khớp GR (PASS)** → drift PASS → có thể lưu nháp

### OP-WIN-03

1. Admin → http://localhost:5174/admin/audit
2. Filter **Booking ID** = `bk_…` from script output
3. **Export CSV** · compare with `GET /bookings/:id/replay/export.csv`
4. Agent booking timeline → http://localhost:5174/agent/bookings/:id (tab Timeline)

## API endpoints (new / extended)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/audit/events?bookingId=` | Audit filter by booking |
| GET | `/audit/events/export.csv?bookingId=` | OP-WIN-03 audit export |
| GET | `/bookings/:id/replay/export.csv` | Domain events CSV |

## Sign-off

Update [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md) UAT-04 rows after `./scripts/uat-p3-s1.sh` passes.

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [scripts/demo-booking-replay.sh](../../scripts/demo-booking-replay.sh)
- [scripts/uat-p3-s1.sh](../../scripts/uat-p3-s1.sh)
