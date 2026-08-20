# Grafana / SLA visibility (S6-02 / G1.12)

Pilot uses **`GET /api/v1/health`** as the primary uptime probe until Prometheus metrics are wired.

## Quick uptime (no Grafana)

```bash
# Cron every minute — alert if not ok
curl -sf http://localhost:3000/api/v1/health | jq -e '.status == "ok"'
```

Expected checks: `database: up`, `redis: up`.

## Docker Compose (optional local stack)

Add to staging `docker-compose.override.yml`:

```yaml
services:
  grafana:
    image: grafana/grafana:11.0.0
    ports:
      - "3001:3000"
    volumes:
      - ./docs/ops/grafana/provisioning:/etc/grafana/provisioning
      - ./docs/ops/grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: "false"
```

## Import dashboard

1. Open Grafana → Dashboards → Import
2. Upload `dashboards/wereal-api-health.json`
3. Configure HTTP datasource pointing to API `/api/v1/health`

## Panels (pilot)

| Panel | Source |
|-------|--------|
| API up/down | Health JSON `status` |
| Postgres | `checks.database` |
| Redis | `checks.redis` |
| Nightly smoke | GitHub Actions `Nightly P0 Smoke` workflow |

## Future (post-pilot)

- Prometheus `/metrics` from NestJS — **wired** (`PROMETHEUS_ENABLED=true`)
- P95 webhook latency — alert in `alerts/wereal-slo-alerts.yml`
- Reconcile job success counter

## T7-S3 alerts (staging/prod)

Import Prometheus rules from [alerts/wereal-slo-alerts.yml](./alerts/wereal-slo-alerts.yml):

| Alert | Condition | On-call |
|-------|-----------|---------|
| `WerealApiDown` | `up==0` 2m | `#wereal-ops` critical |
| `WerealApiP95High` | P95 > 200ms 5m | platform warning |
| `WerealReadinessDegraded` | ready != ok 3m | L1 page |
| `WerealErrorBudgetBurn` | availability burn | freeze deploys |

Contact points: [provisioning/alerting/contact-points.yml](./provisioning/alerting/contact-points.yml)
