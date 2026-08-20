# Tier 2 Gate Checklist (P3 → T2)

Gate bắt buộc trước khi mở Tier 2 Enterprise Trust.

## OP-WIN-01 → 07 (P3)

| ID | Tiêu chí | Verify |
|----|----------|--------|
| OP-WIN-01 | Golden record + listing publish | `scripts/smoke-p0.sh` |
| OP-WIN-02 | Booking + payment intent | P0 smoke |
| OP-WIN-03 | CRM lead pipeline | P0 smoke |
| OP-WIN-04 | Commission snapshot | P0 smoke |
| OP-WIN-05 | Ledger reconcile | P3 nightly |
| OP-WIN-06 | Live integrations + settlement | `scripts/uat-p3-s5.sh` |
| OP-WIN-07 | Omnichannel SLA + MFA | `scripts/uat-p3-s6.sh` |

## Staging environment

- `docs/dev/staging-env.md`: không MOCK payment/SMS/Zalo trên staging
- Payout rail `SUBMITTED` (không stub) trước enterprise demo

## CI

- `./scripts/smoke-p3-ci.sh` green trên nightly workflow
- Composite scorecard ≥ 3.4 (pilot target P3)

## Automated gate

```bash
chmod +x scripts/verify-t2-gate.sh
./scripts/verify-t2-gate.sh http://localhost:3000/api/v1
```

**Pass when:** unit tests green + health up + (optional) P3 smoke + Tier 2 module endpoints reachable.
