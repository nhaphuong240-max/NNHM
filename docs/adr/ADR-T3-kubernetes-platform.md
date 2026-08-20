# ADR-T3 — Kubernetes over ECS for Tier 3 Scale

**Status:** Accepted (Tier 3)  
**Context:** Architecture docs reference ECS Fargate; Tier 3 plan requires K8s for HPA, ServiceMonitor, GitOps.

**Decision:** Deploy WEREAL API as container on **Kubernetes** (staging first) with managed Postgres/Redis outside cluster.

**Consequences:**

- Add `infra/k8s/`, Dockerfiles, leader-elected cron
- ECS diagram in `So-do-kien-truc.md` remains Phase 4 reference; K8s is operational target for scale tier
- Modular monolith stays single Deployment until Phase 4 service split
