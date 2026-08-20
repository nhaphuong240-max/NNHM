# T7-S7 — Intelligence depth

> Sprint **T7-S7** · Gate **T7-G7** · AI gateway · eval TC-12 · ML forecast v2 · anomaly→ops SLA

## Deliverables

| Artifact | Path |
|----------|------|
| AI gateway (ADR-005) | `apps/api/src/modules/ai-gateway/` |
| ML forecast v2 | `analytics-forecast.util.ts` · model `wereal-absorption-v2` |
| Eval TC-12 | `ai/eval/legal-hallucination` · `ai/scoring/hot-conversion` |
| Anomaly ops SLA | `GET /ai/anomalies/sla` · audit `listing_anomaly:OPEN` |
| Intelligence health gate | `GET /health/intelligence` |

## AI Gateway (ADR-005)

Central guardrails (FR-AI-03) + provider abstraction. Phase 1 uses `TemplateLlmProvider`; copilot/legal route through gateway with GR citation policy.

| Route | Purpose |
|-------|---------|
| `GET /ai/gateway/status` | Gateway version + routes |
| `POST /ai/gateway/copilot/generate` | Listing copilot via gateway |
| `POST /ai/gateway/legal/query` | Legal RAG with citation guardrail |

## ML forecast

| Endpoint | Model |
|----------|-------|
| `GET /analytics/forecast` | `absorption_rules_v1` (rules preview) |
| `GET /analytics/forecast/ml` | `wereal-absorption-v2` (velocity-weighted) |

## Eval suite (TC-12)

- **HOT conversion:** `GET /ai/scoring/hot-conversion`
- **Legal hallucination:** `GET /ai/eval/legal-hallucination` — citation coverage ≤5% hallucination rate
- **CSV lead tier eval:** `POST /ai/eval/import`

## Anomaly → ops

Open anomalies enqueue `audit:listing_anomaly:OPEN` with SLA deadline. Dashboard at `GET /ai/anomalies/sla`.

Env: `ANTI_DRIFT_OPS_SLA_HOURS=4` (default).

## Verify

```bash
./scripts/uat-t7-intelligence.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/intelligence | jq .
curl http://localhost:3000/api/v1/ai/gateway/status | jq .
```

## Next

Tier 7 engineering complete — human prod sign-off: [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md)
