# T5 Runbook — #1 Vietnam

## Prerequisites

1. `./scripts/verify-t5-gate.sh` — Tier 4 composite ≥4.5
2. Postgres + Redis running
3. `npm run start:dev` in `apps/api`

## Sprint order

1. **T5-S1 + T5-S2** (parallel): anchor seed + WAU instrumentation
2. **T5-S3 → T5-S4**: marketplace DB then connectors
3. **T5-S5**: data mart nightly + intelligence APIs
4. **T5-S6**: escrow DB + NHNN export (after bank connector)
5. **T5-S7 → T5-S8**: network close-out + gate

## UAT

```bash
chmod +x scripts/uat-t5-*.sh scripts/verify-t5-gate.sh
./scripts/uat-t5-vn.sh http://localhost:3000/api/v1
```

## Env flags

| Flag | Purpose |
|------|---------|
| `PUSH_LIVE_ENABLED=true` | Expo/FCM live push |
| `ESCROW_BANK_PARTNER_ENABLED=true` | Require bank webhook on milestone release |
| `PARTNER_WEBHOOK_SECRET` | SDK v2 webhook verify |

**Tier B rollout (staging → prod):** [tier-b-live-rails.md](./tier-b-live-rails.md)

```bash
./scripts/apply-tier-b-env.sh staging-local apps/api/.env
./scripts/verify-production-flags.sh --profile staging --strict apps/api/.env
./scripts/uat-tier-b-rails.sh http://localhost:3000/api/v1
```

## Anchor onboarding

See [anchor-developer-runbook.md](./anchor-developer-runbook.md).

## Partner connectors

- [bank.md](./partner-connectors/bank.md)
- [erp.md](./partner-connectors/erp.md)
- [notary.md](./partner-connectors/notary.md)
