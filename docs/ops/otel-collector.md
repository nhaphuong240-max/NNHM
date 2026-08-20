# OpenTelemetry — Tier 3

## API configuration

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=wereal-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

Bootstrap: [apps/api/src/infrastructure/telemetry/otel.bootstrap.ts](../../apps/api/src/infrastructure/telemetry/otel.bootstrap.ts)

## Local collector (docker)

```yaml
# docker-compose snippet
otel-collector:
  image: otel/opentelemetry-collector-contrib:0.96.0
  command: ["--config=/etc/otel-collector.yaml"]
  ports:
    - "4318:4318"
```

Export to Jaeger/Tempo via collector config.

## Prometheus

Scrape `GET /api/v1/metrics` when `PROMETHEUS_ENABLED=true`.

Key metric: `http_request_duration_seconds` — use PromQL:

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

Target staging: **P95 < 0.2s** (200ms).
