# T7-S5 — Money OS live

> Sprint **T7-S5** · Gate **T7-G5** · VNPay · payout live · escrow NHNN · regulatory AES · OP-WIN-02/06

## Deliverables

| Artifact | Path |
|----------|------|
| VNPay live guard | `payment/adapters/vnpay-payment.adapter.ts` · `VNPAY_SANDBOX` |
| Settlement payout live | `commission/commission-payout.client.ts` |
| Bank connector live | `integrations/bank-connector.controller.ts` |
| Regulatory AES export | `trust/regulatory-export-crypto.util.ts` |
| Money health gate | `GET /health/money` |
| Tier-t7 money profile | `config/tier-t7/production-trust.env` |

## Env flags

| Flag | Dev | Prod (`tier-t7/production-trust.env`) |
|------|-----|----------------------------------------|
| `PAYMENT_DEFAULT_METHOD` | `MOCK`/`VNPAY` | `VNPAY` |
| `VNPAY_SANDBOX` | `true` | `false` |
| `SETTLEMENT_PAYOUT_ENABLED` | `true` (staging stub) | `true` |
| `SETTLEMENT_PAYOUT_STUB` | `true` | `false` |
| `SETTLEMENT_PAYOUT_URL` | — | secrets manager |
| `ESCROW_BANK_PARTNER_ENABLED` | `false`/`true` | `true` |
| `BANK_CONNECTOR_LIVE` | `false` | `true` |
| `REGULATORY_EXPORT_STUB` | `true` | `false` |
| `REGULATORY_EXPORT_ENCRYPTION_KEY` | dev key ≥32 | secrets manager |
| `WEBHOOK_SKIP_VERIFY` | — | `false` |

Apply on top of tier-b:

```bash
./scripts/apply-tier-b-env.sh production apps/api/.env
./scripts/apply-tier-t7-money.sh apps/api/.env
```

## OP-WIN evidence

| OP-WIN | Target | Verify |
|--------|--------|--------|
| OP-WIN-02 | 7-day reconcile streak | `GET /ledger/reconciliation/live` → `opWin02Passed` |
| OP-WIN-06 | Payout `SUBMITTED` live | `POST /commission/settlement/run` + bank `payout.submitted` webhook |

Human sign-off: **30-day** streak on prod URL ([OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md)).

## Verify

```bash
./scripts/uat-t7-money.sh http://localhost:3000/api/v1
./scripts/uat-op-win-06.sh http://localhost:3000/api/v1
./scripts/verify-production-flags.sh --profile tier-t7 --strict apps/api/.env
curl http://localhost:3000/api/v1/health/money | jq .
npm test -- src/modules/trust/regulatory-export-crypto.util.spec.ts
```

## Next (T7-S6)

Network OS scale — 3 CĐT LIVE · WAU ≥500 prod · cross-anchor GMV deposited.
