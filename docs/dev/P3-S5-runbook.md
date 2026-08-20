# P3-S5 Runbook — Live integrations + settlement (OP-WIN-06)

> **Sprint:** P3-S5 · **Gate:** OP-WIN-06  
> **Tenant:** `ten_dev_01` · **Seed lines:** `ce_settle01` / `ce_settle02`

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
```

Prior sprint (recommended):

- P3-S4 vertical slice green (`./scripts/uat-p3-s4.sh`)

For **SUBMITTED payout badge** (staging evidence):

```bash
# apps/api/.env
SETTLEMENT_PAYOUT_ENABLED=true
SETTLEMENT_PAYOUT_STUB=true
```

See [staging-env.md](./staging-env.md) for full staging matrix.

## Automated verification

```bash
chmod +x scripts/uat-p3-s5.sh
./scripts/uat-p3-s5.sh
```

| Task | What the script proves |
|------|-------------------------|
| P3-S5-01 | ZNS `SENT` → PATCH delivered → `DELIVERED` |
| P3-S5-02 | SMS OTP: `123456` in sandbox · ≠ `123456` when live |
| P3-S5-03 | VNPay intent → `gatewayRef` + `vnp_TxnRef` in payment URL |
| P3-S5-04 | Settlement run → payout `SUBMITTED` when payout enabled |
| P3-S5-05 | BR-23: agency KYC block → approve → batch → entries `PAID` |

## Pass criteria

| Check | Expected |
|-------|----------|
| ZNS delivery status | `DELIVERED` after delivery report |
| SMS sandbox | `graphMode: SANDBOX` · OTP `123456` |
| SMS staging | `graphMode: LIVE` · OTP random 6 digits |
| VNPay | `method: VNPAY` · non-empty `gatewayRef` |
| Approve both lines (agency KYC pending) | HTTP 422 · `KYC_PAYOUT_BLOCKED` |
| Settlement run | `status: COMPLETED` · lines `PAID` |
| OP-WIN-06 (staging) | `attributes.payout.status: SUBMITTED` |

## Manual UI walkthrough

1. **Admin** → `/admin/integrations/zalo` — send ZNS · delivery DELIVERED
2. **Admin** → `/admin/integrations/sms` — OTP path · delivery stats
3. **Buyer** → payment checkout VNPay — sandbox redirect URL
4. **Admin** → `/admin/kyc` — agency `agcy_sunrise` PENDING → Approve
5. **Finance** → `/finance/settlement` — approve lines · run batch · **PayoutRailBadge SUBMITTED**

## Demo script (PO / staging)

1. Show agency line blocked on settlement queue (KYC badge red).
2. Finance approves KYB for `agcy_sunrise`.
3. Approve commission lines → **Run settlement**.
4. Payout partner returns 200 → entries **PAID** · badge **SUBMITTED**.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ce_settle01/02` not PENDING | Script auto-creates fresh booking + close deal |
| Approve 422 unexpected | `GET /commission/lines` — check `payoutEligible` per line |
| Payout SKIPPED | Set `SETTLEMENT_PAYOUT_ENABLED=true` (+ `STUB` for local) |
| VNPay 422 on intent | Booking must be `RESERVED` — seed `bk_contract01` |
| ZNS send 404 | Seed Zalo OA binding · `docker compose down -v && up -d` |
| Agency always eligible | `POST /kyc/profiles/AGENCY/agcy_sunrise/resubmit` to reset PENDING |

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [staging-env.md](./staging-env.md)
- [scripts/uat-p3-s5.sh](../../scripts/uat-p3-s5.sh)
- [P3-S4-runbook.md](./P3-S4-runbook.md)
