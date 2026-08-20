# OPS-S6 — Grafana staging import (G-OPS-4)

> Staging URL: `https://grafana.staging.wereal.vn` (override via `GRAFANA_STAGING_URL`)

## 1. Import dashboard

```bash
# From repo root — provisioning path already wired in docs/ops/grafana/README.md
cp docs/ops/grafana/dashboards/wereal-api-health.json /var/lib/grafana/dashboards/
# Or use Grafana UI → Dashboards → Import → Upload JSON
```

## 2. Import alerts

```bash
cp docs/ops/grafana/alerts/wereal-slo-alerts.yml /etc/grafana/provisioning/alerting/
# Reload Grafana or restart container
```

## 3. Verify on staging

```bash
export GRAFANA_STAGING_URL=https://grafana.staging.wereal.vn
curl -s "$API/ops/readiness" | jq '.data.grafana'
curl -s "$API/health/observability" | jq .
```

## 4. Evidence log

```bash
./scripts/ops-incident-drill.sh "$API" | tee docs/dev/evidence/ops-s6-grafana-import.log
```

Human sign-off: `docs/uat/UAT-OPS-S6-human.md` · Eng gate: `docs/dev/OP-WIN-OPS-signoff.md`
