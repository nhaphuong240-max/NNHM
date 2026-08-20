# P3-S4 Runbook — Vertical slice E2E (OP-WIN-05)

> **Sprint:** P3-S4 · **Gate:** OP-WIN-05  
> **Tenant:** `ten_dev_01` · **Default unit:** `un_03`

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
cd apps/web && npm run dev   # optional UI walkthrough
```

Prior sprints (recommended green first):

- P3-S1 UAT-04 · P3-S2 UAT-05 · P3-S3 reconcile streak

## Automated verification

```bash
chmod +x scripts/uat-p3-s4.sh
./scripts/uat-p3-s4.sh
```

**One script · one pilot deal:**

| Phase | UAT | Steps |
|-------|-----|-------|
| Discover | UAT-01 | `GET /search/units` → `POST /leads` → lead `SCORED` + audit |
| List | UAT-02 | `PATCH /units/:id` GR → listing drift PASS → approve → `GET /search/units/:id` |
| Transact | UAT-03 | book → pay webhook → ledger balanced → reconcile MATCHED |
| Close | P3-S4-04 | `POST /commission/deals/:bookingId/close` → snapshot `CALCULATED` |

## Pass criteria

| Check | Expected |
|-------|----------|
| Lead `scoreStatus` | `SCORED` |
| Listing after approve | Visible in search index |
| Booking after webhook | `DEPOSITED` |
| Ledger | Debit = credit ≥ 1 line pair |
| Commission snapshot | `status: CALCULATED` + split entries |
| OP-WIN-05 | All above in single run |

## Manual UI walkthrough

1. **Public** → http://localhost:5174/public/search — see published unit
2. **Agent** → `/agent/listings/new` — GR-aligned listing (UAT-02)
3. **Admin** → `/admin/moderation` — approve queue
4. **Agent** → `/agent/bookings/new` — book deposited unit
5. **Finance** → `/finance/reconciliation` — MATCHED after payment
6. **Finance** → commission export — snapshot from close deal

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Unit not AVAILABLE | Use fresh `SLICE_UNIT_ID=un_03` or cancel RESERVED booking |
| drift-check not PASS | Align `priceDisplay` with `GET /units/:id` basePrice |
| close deal 422 | Booking must be `DEPOSITED` — rerun payment webhook step |
| Search index empty | Re-run approve; check `GET /search/index/status` |

## PO sign-off (P3-S4-05)

After `./scripts/uat-p3-s4.sh` passes on **staging**, PO signs [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md) UAT-01→05.

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [scripts/uat-p3-s4.sh](../../scripts/uat-p3-s4.sh)
- [scripts/uat-pilot.sh](../../scripts/uat-pilot.sh) (legacy subset)
- [P3-S3-runbook.md](./P3-S3-runbook.md)
