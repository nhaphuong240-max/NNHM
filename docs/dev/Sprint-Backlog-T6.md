# Sprint Backlog — Tier 6 (Scale & Enterprise)

> Post #1 Vietnam · multi-region · white-label · data revenue · ML

## Gates

| Gate | Tiêu chí | Script |
|------|----------|--------|
| T6-G1 | White-label tier + subdomain live | `uat-tier6-smoke.sh` |
| T6-G2 | Data product billing API | `GET /analytics/intelligence/billing` |
| T6-G3 | ML-ready forecast | `GET /analytics/forecast/ml` |
| T6-G4 | Multi-region HA doc + failover drill | `docs/ops/multi-region.md` |
| T6-G5 | Enterprise hardening CI | `uat-enterprise-hardening.sh` |

## Sprint map

| Sprint | Focus |
|--------|-------|
| T6-S1 | White-label enterprise tier (`whiteLabelTier` on branding) |
| T6-S2 | Data product billing / MRR line items |
| T6-S3 | ML forecast bridge (velocity-weighted rules) |
| T6-S4 | Multi-region 99.95% architecture |
| T6-S5 | Valuation/insurance marketplace (defer optional) |
| T6-S6 | Tier 6 gate + benchmark refresh |

## Dependencies

- Tier 5 gates signed: [T5-gate-checklist.md](./T5-gate-checklist.md)
- Staging live: [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md)
- **Next tier:** [Sprint-Backlog-T7.md](./Sprint-Backlog-T7.md) · production trust & world-class depth
