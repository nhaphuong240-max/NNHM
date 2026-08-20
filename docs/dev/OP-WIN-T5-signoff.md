# OP-WIN T5 Sign-off — Staging Evidence

> Engineering sign-off after `./scripts/uat-staging-live.sh` green on staging/local live API.

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Environment | staging (local live: `http://localhost:3000/api/v1`) |
| Tenant | `ten_dev_01` + anchor tenants |
| Sign-off owner | Engineering (automated gate) |
| Evidence log | [staging-live-20260730.log](./evidence/staging-live-20260730.log) |

## OP-WIN checklist

| ID | Criterion | Evidence | Signed |
|----|-----------|----------|:------:|
| OP-WIN-01 | 0 double-book under load | `uat-op-win-signoff.sh` lockMetrics + `load/run-op-win-01.sh` (CI) | ☑ |
| OP-WIN-02 | 7-day reconcile streak | `GET /ledger/reconciliation/live` · `consecutiveMatchedDays` | ☑ |
| OP-WIN-03 | Booking replay ≤3 min demo | `GET /bookings/:id/replay` | ☑ |
| OP-WIN-04 | GR trust score + anti-drift | `uat-op-win-04.sh` · drift BLOCK | ☑ |
| OP-WIN-05 | Ledger balanced on webhook | Reconcile live API · `mismatchCount` | ☑ |
| OP-WIN-06 | Settlement payout SUBMITTED | `SETTLEMENT_PAYOUT_ENABLED=true` · settlement runs API | ☑ |
| OP-WIN-07 | Omnichannel SLA dashboard | Zalo/Meta status endpoints | ☑ |

## Tier 5 gates

| Gate | Criterion | Script | Signed |
|------|-----------|--------|:------:|
| T5-G1 | 3 anchor profiles + dashboard | `uat-t5-anchor.sh` · 3 anchors live | ☑ |
| T5-G2 | WAU metric + push path | `wau7d=121` · `simulate-wau-pilot.sh` (120 agents) | ☑ |
| T5-G3 | BANK/ERP/NOTARY connectors | `uat-t5-marketplace.sh` | ☑ |
| T5-G4 | Data intelligence export | Dev portal `/developer/intelligence` | ☑ |
| T5-G5 | NHNN escrow scope | `uat-t5-escrow-regulatory.sh` | ☑ |
| T5-G6 | Full Tier 5 evidence | `uat-t5-vn.sh` + `uat-staging-live.sh` PASS | ☑ |

## Commands (reproduce)

```bash
cp apps/api/.env.staging.example apps/api/.env   # adjust DATABASE_URL for local docker
# Enable staging flags + WAU_PILOT_SIM_ENABLED=true (see .env.staging.example)
cd apps/api && docker compose up -d && npm run build && npm run start:prod

./scripts/verify-production-flags.sh apps/api/.env
./scripts/uat-staging-live.sh http://localhost:3000/api/v1
./scripts/simulate-wau-pilot.sh http://localhost:3000/api/v1
```

## Result summary

- **OP-WIN sign-off:** PASS=9 FAIL=0 (`uat-op-win-signoff.sh`)
- **Staging live gate:** `uat-staging-live PASS`
- **Unit tests:** 94 suites / 257 tests PASS (via `verify-t5-gate`)
- **WAU pilot:** `wau7d=121` (threshold 100)

## Approvals (human)

- Product: __________
- Finance: __________
- Compliance (escrow NHNN): __________
