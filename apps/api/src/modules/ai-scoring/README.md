# AI Scoring (UC-AI-02)

Async lead scoring worker — tách khỏi sync `scoreLead()` trong CRM.

## Luồng

1. `POST /leads` → lưu **provisional score** (50), `scoreStatus: PENDING`, `tier: NEW`
2. `LeadScoringService.enqueue()` → outbox + xử lý ngay (hoặc worker poll 1s)
3. `inferLeadScore()` (rules v1, không gọi partner API) → cập nhật score/tier
4. HOT → `LeadRoutingService` round-robin gán `assignedTo` (UC-CRM-02)
5. Audit `AI_SCORE` + stream `lead.scored`

## API

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/ai/scoring/status` | Outbox lag, pending/failed counts |

## Entity

- `lead_scoring_outbox` — queue PENDING → PROCESSED/FAILED
- `leads.score_status`, `assigned_to`, `scoring_meta`

## Module

```
AiScoringModule
├── LeadScoringService   # enqueue, processOne, getStatus
├── LeadRoutingService   # HOT → agent round-robin
├── LeadScoringWorker    # @Interval(1000) processPending
└── LeadScoringController
```

CRM import `AiScoringModule` và gọi `enqueue()` sau create lead (bỏ qua idempotent replay).

## Mở rộng

Thay `inferLeadScore()` bằng model thật (OpenAI / partner) mà không đổi CRM hook.
