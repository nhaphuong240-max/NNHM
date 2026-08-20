# Sprint Backlog — Tier 5 (#1 Vietnam)

> Jul 2026 · 8 sprint × 2 tuần · composite target **≥5.0**

## Gates

| Gate | Tiêu chí | Script |
|------|----------|--------|
| T5-G0 | Tier 4 moat green | `verify-t5-gate.sh` |
| T5-G1 | 3 anchor developers | `uat-t5-anchor.sh` |
| T5-G2 | WAU metric live | `uat-t5-wau.sh` |
| T5-G3 | BANK + ERP + NOTARY sandbox | `uat-t5-marketplace.sh` |
| T5-G4 | Data intelligence export | `uat-t5-vn.sh` |
| T5-G5 | NHNN/SBV escrow scope | `uat-t5-escrow-regulatory.sh` |
| T5-G6 | Full Tier 5 evidence | `uat-t5-vn.sh` |

## Sprint deliverables

| Sprint | Focus | Status |
|--------|-------|--------|
| T5-S1 | Anchor developer program | ✅ |
| T5-S2 | 500 agent WAU telemetry + push | ✅ |
| T5-S3 | API marketplace DB + NOTARY + SDK v2 | ✅ |
| T5-S4 | Bank/ERP/Notary connectors | ✅ |
| T5-S5 | Data intelligence product | ✅ |
| T5-S6 | NHNN/SBV escrow rail | ✅ |
| T5-S7 | Dev–Agency marketplace close-out | ✅ |
| T5-S8 | Tier 5 gate + scorecard | ✅ |

## Key artifacts

- `anchor_tenant_profiles` · `GET /anchor/*`
- `agent_activity_events` · `GET /analytics/agent/wau`
- `api_partners` · `integrations/bank|notary/webhook`
- `data_mart_daily` · `GET /analytics/intelligence/*`
- `escrow_accounts` · regulatory scope `ESCROW_NHNN`
