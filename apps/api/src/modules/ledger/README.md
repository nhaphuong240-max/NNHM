# Ledger module

**Path:** `apps/api/src/modules/ledger`  
**UC:** UC-PAY-02 · **Sprint:** S4 · **P3-S3:** OP-WIN-02 streak

## Responsibility

Double-entry journal, deposit liability, reconciliation vs gateway totals, daily cron job, MISMATCH ops alerts.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/ledger/entries` | Filter by date / bookingId |
| GET | `/ledger/reconciliation` | `?days=7` · `?days=7&refresh=true` · `?date=&refresh=true` |
| POST | `/ledger/reconciliation/run-daily` | P3-S3 manual cron smoke |
| GET | `/ledger/status` | Module health |

## Reconciliation status

`MATCHED` | `MISMATCH` — gateway vs ledger per ICT calendar day.

**OP-WIN-02 meta** (`?days=7`): `consecutiveMatchedDays`, `opWin02Passed`.

## Alerts (P3-S3-03)

On `MISMATCH`: audit `reconciliation_alert` · email stub · webhook stub (`OPS_RECONCILE_WEBHOOK_URL` optional).

## Jobs

`LedgerReconciliationJob` — 06:00 Asia/Ho_Chi_Minh · `POST .../run-daily` for staging.

## Runbooks

`docs/runbooks/reconciliation-daily.md` · `docs/dev/P3-S3-runbook.md`

## Tests

`ledger-write.service.spec.ts`, `reconciliation.service.spec.ts`, `reconciliation-alert.service.spec.ts`, `reconciliation-streak.util.spec.ts`

## Web UI

`/finance/reconciliation` — SCR-FIN-002 streak badge · SCR-FIN-004 dashboard

## Automation

`scripts/uat-p3-s3.sh` — UAT-03 + 7-day streak + run-daily job
