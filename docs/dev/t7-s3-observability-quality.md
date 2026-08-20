# T7-S3 — Observability + quality gate

> Sprint **T7-S3** · Gate **T7-G3** · OTEL · Playwright PR · contract smoke · CD staging

## Deliverables

| Artifact | Path |
|----------|------|
| Staging OTEL profile | `config/tier-t7/staging-observability.env` |
| OTEL collector config | `config/otel/collector.yaml` |
| Observability health | `GET /health/observability` |
| Grafana SLO alerts | `docs/ops/grafana/alerts/wereal-slo-alerts.yml` |
| On-call contact points | `docs/ops/grafana/provisioning/alerting/contact-points.yml` |
| API response smoke | `scripts/contract/smoke-api-responses.sh` |
| CD blue/green | `scripts/deploy-staging.sh` · `.github/workflows/deploy-staging.yml` |
| Playwright PR gate | `.github/workflows/ci.yml` job `e2e-pr` |

## Apply staging observability

```bash
./scripts/apply-tier-t7-observability.sh apps/api/.env
# optional local collector
docker run -p 4318:4318 -v $(pwd)/config/otel/collector.yaml:/etc/otel-collector.yaml \
  otel/opentelemetry-collector-contrib:0.96.0 --config=/etc/otel-collector.yaml
```

## Verify

```bash
./scripts/uat-t7-observability.sh http://localhost:3000/api/v1
./scripts/contract/validate-openapi.sh
./scripts/contract/smoke-api-responses.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/observability | jq .
DEPLOY_DRY_RUN=true ./scripts/deploy-staging.sh
```

## CI gates

| Job | Workflow | Trigger |
|-----|----------|---------|
| `e2e-pr` | `ci.yml` | pull_request |
| `contract-gate` | `ci.yml` | pull_request |
| `observability-gate` | `ci.yml` | pull_request |
| `deploy-staging` | `deploy-staging.yml` | push `develop` / manual |

## Grafana → on-call

Import `docs/ops/grafana/alerts/wereal-slo-alerts.yml` into Prometheus/Grafana Mimir.  
Contact point `#wereal-ops` — see [on-call.md](../../runbooks/on-call.md).

## Next (T7-S4)

Trust OS live — GR version bind · e-sign/eKYC prod · anti-drift SLA.
