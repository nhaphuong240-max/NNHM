# T7 Runbook — Production Trust & World-Class Depth

## Prerequisites

1. [T6-runbook.md](./T6-runbook.md) complete
2. `./scripts/uat-staging-live.sh` green on staging
3. [T5-gate-checklist.md](./T5-gate-checklist.md) · pilot CĐT onboarded ([pilot-cdt-onboarding.md](./pilot-cdt-onboarding.md))

## Sprint order

| Phase | Sprints | Song song? |
|-------|---------|------------|
| **Foundation** | T7-S1 ✅ → T7-S2 → T7-S3 | S2 có thể overlap S1 sau migration baseline |
| **Moat live** | T7-S4 → T7-S5 | S5 sau escrow bank connector |
| **Network** | T7-S6 | Sau S5 payout live |
| **Intelligence** | T7-S7 | Song song S6 nếu team tách |
| **Sign-off** | T7-S8 | Cuối |

## T7-S1 platform (done locally)

See [t7-s1-platform-foundation.md](./t7-s1-platform-foundation.md).

```bash
cd apps/api && npm run migration:run && npm run migration:show
./scripts/check-migrations.sh
./scripts/uat-t7-platform.sh http://localhost:3000/api/v1
```

## T7-S2 security (done locally)

See [t7-s2-security-hardening.md](./t7-s2-security-hardening.md) · [secrets-manager.md](../ops/secrets-manager.md).

```bash
./scripts/uat-t7-security.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/security | jq .
```

## T7-S3 observability (done locally)

See [t7-s3-observability-quality.md](./t7-s3-observability-quality.md).

```bash
./scripts/apply-tier-t7-observability.sh apps/api/.env
./scripts/uat-t7-observability.sh http://localhost:3000/api/v1
./scripts/contract/smoke-api-responses.sh http://localhost:3000/api/v1
DEPLOY_DRY_RUN=true ./scripts/deploy-staging.sh
```

## Gate verification

```bash
chmod +x scripts/verify-t7-gate.sh scripts/uat-t7-*.sh

# Prerequisites
./scripts/verify-t7-gate.sh http://localhost:3000/api/v1

# Per-domain gates
./scripts/uat-t7-platform.sh http://localhost:3000/api/v1
./scripts/uat-t7-security.sh http://localhost:3000/api/v1
./scripts/uat-t7-observability.sh http://localhost:3000/api/v1
./scripts/uat-t7-trust.sh http://localhost:3000/api/v1
./scripts/uat-t7-money.sh http://localhost:3000/api/v1
./scripts/uat-t7-network.sh http://localhost:3000/api/v1
./scripts/uat-t7-intelligence.sh http://localhost:3000/api/v1

# Umbrella
./scripts/uat-t7-vn.sh http://localhost:3000/api/v1
```

## Env profiles

| Profile | Path | Purpose |
|---------|------|---------|
| Tier B staging | `config/tier-b/staging.env` | Live rails staging |
| Tier B production | `config/tier-b/production.env` | Live rails prod baseline |
| **T7 production trust** | `config/tier-t7/production-trust.env` | Superset: MFA/OTEL/RLS/no-sim flags |

```bash
# Staging T7 dry-run (merge tier-b + tier-t7 manually or via script when added)
grep -v '^#' config/tier-t7/production-trust.env
./scripts/verify-production-flags.sh --profile production --strict apps/api/.env
./scripts/uat-t7-money.sh http://localhost:3000/api/v1
```

## New / extended APIs (T7)

| Endpoint | Sprint | Purpose |
|----------|--------|---------|
| `GET /health/ready` | T7-S3 | DB + Redis + migration version |
| `GET /anchor/profiles?pilotClass=LIVE` | T7-S6 | Network scale gate |
| `GET /analytics/agent/wau?days=7` | T7-S6 | WAU ≥500 prod |
| `GET /analytics/forecast/ml` | T7-S7 | ML v2 (non-stub) |
| AI gateway routes | T7-S7 | Per ADR-005 |

## OP-WIN extensions (prod)

| OP-WIN | T7 gate | Script |
|--------|---------|--------|
| OP-WIN-02 | T7-G5 · 7d streak prod | `uat-op-win-06.sh` / reconcile job logs |
| OP-WIN-06 | T7-G5 · payout SUBMITTED live | `uat-op-win-signoff.sh` |
| OP-WIN-04 | T7-G4 · trust + anti-drift prod | `uat-op-win-04.sh` |

## Human sign-off

- Product · Finance · Compliance · Security: [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md)
- External pen-test report attached to T7-S8 evidence folder

## Related docs

- [Sprint-Backlog-T7.md](./Sprint-Backlog-T7.md)
- [T7-gate-checklist.md](./T7-gate-checklist.md)
- [pen-test-remediation-S6.md](../security/pen-test-remediation-S6.md)
- [multi-region.md](../ops/multi-region.md)
