# T4 Runbook — Product Moat

## Prerequisites

1. Tier 3 gate: `./scripts/verify-t4-gate.sh`
2. API + Postgres running (`npm run start:dev` in `apps/api`)
3. Staging env: see `docs/dev/staging-env.md`

## Sprint order

1. **T4-S1** — `./scripts/uat-tc12-hot.sh`
2. **T4-S2** — `./scripts/uat-op-win-04.sh` (parallel with S1)
3. **T4-S3** — `./scripts/uat-op-win-06.sh`
4. **T4-S4** — `./scripts/uat-bnpl-live.sh`
5. **T4-S5** — `cd apps/mobile-buyer && npm start`
6. **T4-S6** — `./scripts/uat-t4-moat.sh`

## API endpoints (new)

| Endpoint | Sprint |
|----------|--------|
| `GET /ai/scoring/hot-conversion` | S1 |
| `GET /golden-record/trust-score/:projectId` | S2 |
| `GET /ledger/reconciliation/live` | S3 |
| `POST /ai/eval/import` | S6 |

## HOT threshold

Single constant `HOT_SCORE_MIN = 85` in `lead-scoring.engine.ts` and `agentLeadUi.ts`.

## Close-out

```bash
./scripts/uat-t4-moat.sh http://localhost:3000/api/v1
```

Update `docs/strategy/WEREAL-Domain-Scorecard.md` after each sprint sign-off.
