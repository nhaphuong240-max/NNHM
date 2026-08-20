# T6 Runbook — Scale & Enterprise

## Prerequisites

- [T5-runbook.md](./T5-runbook.md) complete
- `./scripts/uat-staging-live.sh` green on staging

## Tier 6 verification

```bash
./scripts/uat-tier6-smoke.sh http://staging/api/v1
./scripts/uat-enterprise-hardening.sh http://staging/api/v1
```

## New APIs (T6)

| Endpoint | Purpose |
|----------|---------|
| `GET /analytics/intelligence/billing` | Data product MRR / entitlements |
| `GET /analytics/forecast/ml` | Velocity-weighted ML-ready forecast |
| `GET/POST /tenants/branding` | `whiteLabelTier: STANDARD \| ENTERPRISE` |

## Multi-region

See [docs/ops/multi-region.md](../ops/multi-region.md) for 99.95% target architecture.
