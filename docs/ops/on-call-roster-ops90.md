# On-call roster — OPS-90 (G-OPS-4)

> Fill **Name** and **Date** before go-live. Escalation: L1 (15 min ack) → L2 Finance → L3 Tech Lead.

| Role | Name | Phone / Slack | Backup | Week of |
|------|------|---------------|--------|---------|
| **L1 Primary on-call** | | `#wereal-ops` | | |
| **L2 Finance approver** | | `#wereal-finance` | | |
| **L3 Tech Lead** | | Phone escalation | | |

## Staging profile

Process env (`config/tier-t7/staging-observability.env`):

```
ONCALL_ROSTER=L1→Finance→TechLead
GRAFANA_ALERTS_ENABLED=true
```

Verify:

```bash
curl -s "$API/ops/readiness" | jq '.data.onCall'
```

## Incident drill

Run once per OPS sprint before G-OPS-4 sign-off:

```bash
./scripts/ops-incident-drill.sh "$API"
# Evidence: docs/dev/evidence/ops-s6-incident-drill.log
```

Runbook: [on-call.md](../../runbooks/on-call.md) · Payment: [payment-webhook.md](../../runbooks/payment-webhook.md)
