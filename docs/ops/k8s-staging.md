# WEREAL Tier 3 — Kubernetes staging

## Prerequisites

- Cluster 1.28+ with Ingress controller
- Managed Postgres + Redis (recommended outside cluster)
- Container registry (GHCR/ECR)

## Deploy

```bash
kubectl apply -f infra/k8s/staging/api-configmap.yaml
kubectl apply -f infra/k8s/staging/api-secret.example.yaml  # replace secrets first
kubectl apply -f infra/k8s/staging/api-deployment.yaml
```

## Build & push API image

```bash
docker build -t ghcr.io/wereal/api:latest -f apps/api/Dockerfile apps/api
docker push ghcr.io/wereal/api:latest
```

## Probes

| Probe | Path | Purpose |
|-------|------|---------|
| Liveness | `GET /api/v1/health/live` | Process up |
| Readiness | `GET /api/v1/health/ready` | Postgres + Redis |

## HPA

`infra/k8s/staging/api-deployment.yaml` scales 2→6 pods on CPU 70%.

## Scheduled jobs

Set `SCHEDULE_LEADER_ENABLED=true` so only one pod runs `@Cron` jobs (Redis leader lock).

## CI

See `.github/workflows/docker-build.yml` for image build on main.
