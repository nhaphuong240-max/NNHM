# Runbook — Daily reconciliation (UC-PAY-02 / OP-WIN-02)

## Owner

| Role | Account | Window |
|------|---------|--------|
| **Finance owner** | Finance Ops · `finance@sunrise-dev.vn` (`FINANCE_ADMIN`) | Cron **06:00 ICT**; human review by **09:00 ICT** |
| Backup | Developer Admin · `admin@sunrise-dev.vn` | If finance unavailable |

Pilot tenant: `finance@thanglong-dev.vn` / TOTP (OTP `123456` rejected).

## Schedule

- Cron **06:00 Asia/Ho_Chi_Minh** — `LedgerReconciliationJob`
- Finance review by **09:00 ICT**

## Symptoms

- `GET /ledger/reconciliation` → `status: MISMATCH`
- `meta.matchRate` < 1.0 over 7 days
- Cron log error in API container

## Triage

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"finance@sunrise-dev.vn","password":"Finance123!"}' | jq -r '.data.accessToken')

curl -s 'http://localhost:3000/api/v1/ledger/reconciliation?days=7' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq '.meta.matchRate, .data[].attributes.status'
```

## Force refresh single day

```bash
curl -s 'http://localhost:3000/api/v1/ledger/reconciliation?date=2026-07-28&refresh=true' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'X-Tenant-Id: ten_dev_01' | jq .
```

## Common root causes

| Discrepancy type | Fix |
|------------------|-----|
| `GATEWAY_ONLY` | Missing webhook — replay payment success |
| `LEDGER_ONLY` | Manual journal / test data — align or exclude test tenant |
| `AMOUNT_MISMATCH` | Wrong webhook amount — gateway support ticket |

## Gate OP-WIN-02

Pilot sign-off requires **100% match 7 consecutive ICT days** on staging.

## UI

Finance portal: http://localhost:5174/finance/reconciliation
