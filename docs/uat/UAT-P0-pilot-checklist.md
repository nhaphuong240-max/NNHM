# UAT P0 Pilot — UAT-01 → UAT-05 (S6-03 / OP-WIN-05)

**Tenant:** `ten_dev_01` · **Automated:** `scripts/uat-p3-s4.sh` (OP-WIN-05 full) · `scripts/uat-pilot.sh` (legacy) · P3-S1/S2/S3 per sprint

Mark each after manual + automated verification on **staging**.

## UAT-01 — Search → lead → scored

| # | Step | Pass | Owner | Date |
|---|------|------|-------|------|
| 1 | Public search returns listings | ☑ | P3-S4 automation | 2026-07-29 |
| 2 | POST `/leads` creates lead | ☑ | P3-S4 automation | 2026-07-29 |
| 3 | Lead visible in CRM / audit | ☑ | P3-S4 automation | 2026-07-29 |

**Automated:** `scripts/uat-p3-s4.sh` · smoke GET search · lead SCORED verify

## UAT-02 — Listing GR → approve → publish

| # | Step | Pass | Owner | Date |
|---|------|------|-------|------|
| 1 | PATCH unit GR | ☑ | P3-S4 automation | 2026-07-29 |
| 2 | POST listing + anti-drift PASS | ☑ | P3-S4 automation | 2026-07-29 |
| 3 | Approve → search index | ☑ | P3-S4 automation | 2026-07-29 |

**Automated:** `scripts/uat-p3-s4.sh` · UI `/agent/listings/new` + `/admin/moderation`

## UAT-03 — Book → pay → ledger reconcile

| # | Step | Pass | Owner | Date |
|---|------|------|-------|------|
| 1 | POST booking RESERVED | ☑ | P3-S4 automation | 2026-07-29 |
| 2 | Payment webhook → DEPOSITED | ☑ | P3-S4 automation | 2026-07-29 |
| 3 | Ledger 2 lines balanced | ☑ | P3-S4 automation | 2026-07-29 |
| 4 | Reconcile MATCHED | ☑ | P3-S4 automation | 2026-07-29 |

**Automated:** `scripts/uat-p3-s4.sh` · `scripts/uat-p3-s3.sh` · `/finance/reconciliation`

## UAT-04 — Anti-drift block

| # | Step | Pass | Owner | Date |
|---|------|------|-------|------|
| 1 | Listing price drift → FLAG/BLOCK | ☑ | P3-S1 automation | 2026-07-29 |
| 2 | Error message shows GR truth | ☑ | P3-S1 automation | 2026-07-29 |

**Automated:** `scripts/uat-p3-s1.sh` · wizard preset BLOCK UI

## UAT-05 — Concurrent book (OP-WIN-01)

| # | Step | Pass | Owner | Date |
|---|------|------|-------|------|
| 1 | 2 parallel bookings → 1 OK 1 conflict | ☑ | P3-S2 automation | 2026-07-29 |
| 2 | 0 double-book on same unit | ☑ | P3-S2 automation | 2026-07-29 |

**Automated:** `scripts/uat-p3-s2.sh` · k6 `scripts/load/concurrent-book.k6.js`

---

## OP-WIN gate summary

| ID | Criterion | Evidence |
|----|-----------|----------|
| OP-WIN-01 | No double-book | UAT-05 ☑ · k6 P3-S2 |
| OP-WIN-02 | Reconcile 7d 100% | UAT-03 ☑ · streak P3-S3 |
| OP-WIN-03 | Timeline replay ≤ 3 min | `scripts/demo-booking-replay.sh` |
| OP-WIN-04 | Anti-drift block | UAT-04 ☑ · P3-S1 |
| OP-WIN-05 | Vertical slice E2E | UAT-01→05 ☑ · `scripts/uat-p3-s4.sh` · commission CALCULATED |

**PO sign-off (P3-S4-05):** P3-S4 automation ☑ 2026-07-29 · Manual PO: _________________ Date: _______
