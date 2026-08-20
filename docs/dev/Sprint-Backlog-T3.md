# Sprint Backlog — Tier 3 Scale

## T3-S1 — K8s foundation ✅

- [x] `apps/api/Dockerfile` + `apps/web/Dockerfile`
- [x] `infra/k8s/staging/` Deployment, Service, Ingress, HPA
- [x] `/health/live` + `/health/ready`
- [x] Graceful SIGTERM in `main.ts`
- [x] `ScheduleLeaderService` for `@Cron` jobs
- [x] `.github/workflows/docker-build.yml`

## T3-S2 — OpenTelemetry + Prometheus ✅

- [x] OTel bootstrap (`OTEL_ENABLED=true`)
- [x] `GET /api/v1/metrics` RED histogram
- [x] Request ID middleware
- [x] Grafana provisioning stub

## T3-S3 — OpenAPI contract CI ✅

- [x] `.spectral.yaml` + `scripts/contract/validate-openapi.sh`
- [x] `.github/workflows/openapi-contract.yml`

## T3-S4 — Partner SDK ✅

- [x] `packages/partner-sdk`
- [x] `POST /partner/v1/leads` + API key guard + rate limit
- [x] `docs/dev/partner-sdk.md`

## T3-S5 — Load 100+ ✅

- [x] `concurrent-book.k6.js` default 100 VU
- [x] `api-read.k6.js` + `search.k6.js`
- [x] `scripts/load/run-tier3-perf.sh`

## T3-S6 — P95 gate + close-out ✅

- [x] HPA manifest
- [x] SLO `API_P95_TARGET_MS=200`
- [x] `scripts/uat-t3-scale.sh`
- [x] `docs/dev/T3-runbook.md`, `docs/ops/k8s-staging.md`

## Definition of Done — Tier 3

| Gate | Status |
|------|--------|
| T3-G1 Platform | K8s manifests + probes |
| T3-G2 Observability | OTel + /metrics |
| T3-G3 Contract | Spectral CI |
| T3-G4 Partner | SDK npm package |
| T3-G5 Load | 100 VU k6 scripts |
| T3-G6 Perf | P95 target in SLO + read k6 thresholds |
| T3-G7 Evidence | uat-t3-scale.sh |
