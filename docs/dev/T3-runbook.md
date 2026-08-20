# T3 Runbook — Scale Verification

## Prerequisites

```bash
cd apps/api && npm run db:up
npm run start:dev
```

## Full gate

```bash
./scripts/uat-t3-scale.sh
```

## Load 100+ booking + P95

```bash
# Requires k6 installed
LOAD_VUS=100 P95_TARGET_MS=200 ./scripts/load/run-tier3-perf.sh
```

## K8s staging

See [k8s-staging.md](../ops/k8s-staging.md).

## Observability

- Traces: set `OTEL_ENABLED=true`, collector at `OTEL_EXPORTER_OTLP_ENDPOINT`
- Metrics: `curl http://localhost:3000/api/v1/metrics`
- SLO: `curl http://localhost:3000/api/v1/health/slo`

## Partner SDK

```bash
cd packages/partner-sdk && npm install && npm run build
```

Register partner → use `X-Partner-Api-Key` with SDK.

## OpenAPI contract

```bash
./scripts/contract/validate-openapi.sh
```
