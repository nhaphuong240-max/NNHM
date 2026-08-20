# S6 — Pilot hardening (UAT · Runbooks · Regression)

**Sprint:** S6 · **Baseline:** WEREAL-BL-2026-002  
**Gate:** G1.1→G1.12 + OP-WIN-01→05

## Deliverables map

| Task | Artifact | Location |
|------|----------|----------|
| S6-01 | Payment + on-call runbooks | [`docs/runbooks/`](../runbooks/) |
| S6-02 | SLA / Grafana guide + dashboard stub | [`docs/ops/grafana/`](../ops/grafana/) |
| S6-03 | UAT checklist + automation | [`docs/uat/`](../uat/) · [`scripts/uat-pilot.sh`](../../scripts/uat-pilot.sh) |
| S6-04 | Pen test remediation tracker | [`docs/security/pen-test-remediation-S6.md`](../security/pen-test-remediation-S6.md) |
| S6-05 | 8 module READMEs | `apps/api/src/modules/{identity,golden-record,booking,payment,ledger,commission,crm,audit}/README.md` |
| S6-06 | P0 smoke + CI | [`scripts/smoke-p0.sh`](../../scripts/smoke-p0.sh) · [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) · [`nightly-smoke.yml`](../../.github/workflows/nightly-smoke.yml) |

## Quick verification

```bash
# Unit regression (50+ tests)
cd apps/api && npm test && npm run build
cd apps/web && npm run build

# Live smoke (API + DB + Redis running)
chmod +x scripts/smoke-p0.sh scripts/uat-pilot.sh
./scripts/smoke-p0.sh

# Full UAT vertical slice (uses demo tenant)
./scripts/uat-pilot.sh
```

## Pilot tenant

- Tenant: `ten_dev_01`
- Admin: `admin@sunrise-dev.vn` / `DevAdmin123!`
- Finance UI: http://localhost:5174/finance/reconciliation · `/finance/refunds`
- Developer UI: http://localhost:5174/developer/commission

## PO sign-off checklist

1. Complete [`UAT-P0-pilot-checklist.md`](../uat/UAT-P0-pilot-checklist.md) (manual ticks)
2. Run `uat-pilot.sh` on staging — attach log
3. Confirm OP-WIN-02: 7-day reconcile 100% on Finance dashboard
4. Security: zero Critical on [`pen-test-remediation-S6.md`](../security/pen-test-remediation-S6.md)
5. CI green on main + nightly smoke green

## Related docs

- Acceptance criteria: `Tieu-chi-chap-nhan.md` §6 (UAT-01→05)
- OP-WIN gates: `Quy-trinh-phat-trien.md` §14
- Sprint backlog: `Sprint-Backlog-P0.md` S6 section
