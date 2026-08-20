# P3-S3 Runbook — Reconcile streak (OP-WIN-02)

> **Sprint:** P3-S3 · **Gate:** OP-WIN-02  
> **Tenant:** `ten_dev_01` · **Finance login:** finance role user or admin

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
cd apps/web && npm run dev   # optional UI
```

## Automated verification

```bash
chmod +x scripts/uat-p3-s3.sh
./scripts/uat-p3-s3.sh
```

**Pass criteria:**

| Check | Expected |
|-------|----------|
| UAT-03 book → pay → webhook | Booking DEPOSITED path · ledger balanced |
| Today reconcile | `status: MATCHED` |
| `GET ?days=7&refresh=true` | `matchRate: 1` · `consecutiveMatchedDays: 7` |
| `POST /ledger/reconciliation/run-daily` | Returns yesterday report per tenant |
| Finance UI streak badge | 7/7 green dots · OP-WIN-02 PASS |

## Manual UI

1. Login Finance → http://localhost:5174/finance/reconciliation
2. Verify **SCR-FIN-002 streak** banner · 7/7 MATCHED liên tiếp
3. Bấm **Chạy lại đối soát** → today MATCHED after payment demo
4. Export screenshot for OP-WIN-02 evidence

## MISMATCH alert stub (P3-S3-03)

When reconcile returns `MISMATCH`:

- Log: `reconciliation_alert MISMATCH ...`
- Email stub: `reconciliation_email_stub to=ops@wereal.dev`
- Webhook stub: `reconciliation_webhook_stub` (or live POST if `OPS_RECONCILE_WEBHOOK_URL` set)
- Audit: `entityType=reconciliation_alert` · `action=MISMATCH`

Optional env (`apps/api/.env`):

```bash
OPS_ALERT_EMAIL=finance-ops@sunrise-dev.vn
OPS_RECONCILE_WEBHOOK_URL=https://hooks.example.com/reconcile
```

## Sign-off

Update [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md) UAT-03 after script passes.

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [load-testing.md](./load-testing.md) (P3-S2)
- [reconciliation-daily.md](../runbooks/reconciliation-daily.md)
- [scripts/uat-p3-s3.sh](../../scripts/uat-p3-s3.sh)
