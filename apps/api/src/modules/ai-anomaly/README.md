# AI Anomaly module

**Path:** `apps/api/src/modules/ai-anomaly`  
**UC:** UC-AI-05 · **FR:** FR-AI-08 · **Screen:** SCR-ADMIN-002

## Responsibility

Rule-based ML stub that flags listing anomalies (price drift, anti-drift BLOCK, duplicate unit listings, published on unavailable units) into an ops review queue.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/ai/anomalies` | Scan + queue (auth + tenant) |
| POST | `/ai/anomalies/:anomalyId/resolve` | Resolve or dismiss (audit-backed) |

## Seed

`ls_anomaly_demo` — published listing on `un_02` with price drift >10% vs GR.

## Web UI

`/admin/ai/anomaly` — ops investigate drawer · resolve/dismiss

## Tests

`ai-anomaly.util.spec.ts` · `ai-anomaly.service.spec.ts`
