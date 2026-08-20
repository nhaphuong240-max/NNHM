# On-call — Payment, Ledger & Tier 2 Trust (OP-P0-4 / G1.8 / T2-S6)

## Scope

- Payment webhook ingestion
- Redis booking lock orphans
- Daily reconciliation mismatch
- Refund / ledger reversal failures
- **Tier 2:** SSO/eKYC/e-sign webhooks, consent export requests, SLO 99.5% breaches

## Roster (staging — Tier 2)

| Role | Name | Channel | Backup |
|------|------|---------|--------|
| L1 Primary on-call | Platform rotation | Slack `#wereal-ops` + PagerDuty | L1 backup |

**OPS-90 named roster:** [on-call-roster-ops90.md](../ops/on-call-roster-ops90.md) (fill before G-OPS-4).
| L2 Finance approver | Finance ops | Email + `#wereal-finance` | Deputy finance |
| L3 Tech Lead | Engineering TL | Phone escalation | CTO delegate |

Escalation: L1 (15 min ack) → L2 (payment/settlement) → L3 (SEV-1).

## SLAs

| Metric | Target |
|--------|--------|
| API availability | **99.5%** monthly (NFR-A01) |
| Webhook processing | ≤ 30s P95 |
| Payment stuck MTTR | ≤ 15 min (G1.8) |
| Reconcile mismatch ack | Same business day |
| **Anti-drift BLOCK ops queue (T7-S4)** | **≤ 4h ack** · resolve via `POST /ai-anomaly/:id/resolve` |

See `docs/ops/slo-99-5.md` for error budget and game day.

## Alert sources

- `GET /api/v1/health` → `status != ok`
- `GET /api/v1/health/ready` → `status != ok` (migrations · DB · Redis)
- `GET /api/v1/health/observability` — OTEL/Prometheus/SLO metadata (T7-S3)
- `GET /api/v1/health/slo` — SLO metadata for status page
- **Grafana/Prometheus:** `docs/ops/grafana/alerts/wereal-slo-alerts.yml` → `#wereal-ops` (T7-S3)
- Synthetic probes (staging multi-AZ)
- CI: PR `e2e-pr` + `contract-gate` · nightly `smoke-p3-ci.sh` · weekly `uat-t2-trust.sh`

## Incident flow

1. Ack in `#wereal-ops` ≤ 5 min
2. Classify SEV (see payment-webhook runbook)
3. Mitigate using runbooks — **no prod `WEBHOOK_SKIP_VERIFY`**
4. Document timeline in audit / incident doc
5. Post-mortem if SEV-1 or repeat SEV-2

## Useful commands

```bash
# Health
curl -s http://localhost:3000/api/v1/health | jq .

# Smoke regression
cd WEREAL && ./scripts/smoke-p0.sh

# UAT pilot automation
cd WEREAL && ./scripts/uat-pilot.sh
```
