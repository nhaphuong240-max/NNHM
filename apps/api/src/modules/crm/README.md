# CRM module

**Path:** `apps/api/src/modules/crm`  
**UC:** UC-CRM-01 · UC-CRM-02 · UC-CRM-03 · UC-CRM-04 · UC-CRM-05 (Meta via NW) · **Sprint:** S2/S3

## Responsibility

Lead capture from public forms and agent workflows; async AI scoring hook (UC-AI-02 via `AiScoringModule`); pipeline stage management and activity timeline.

## Key endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/leads` | Public — provisional score 50, async AI scoring enqueued; duplicate phone merges (FR-LEAD-002) |
| POST | `/viewings` | Public — viewing request + lead (FR-VIEW-001) |
| GET | `/viewings` | JWT |
| PATCH | `/viewings/{id}` | JWT — confirm / outcome |
| POST | `/lead-registrations` | JWT — deal protection 30 ngày (FR-DP-001) |
| GET | `/lead-registrations` | JWT — PII mask nếu không phải người đăng ký |
| POST | `/saved-searches` | Public — visitorId (FR-SRCH-003) |
| GET | `/saved-searches` | Public — `?visitorId=` |
| — | `POST /webhooks/meta` | Meta Lead Ads → `META_LEAD` (UC-NW-02 / BR-05) |
| — | `POST /webhooks/zalo` | Zalo OA message → `ZALO_OA` (UC-NW-01 / BR-05) |
| GET | `/leads` | JWT |
| POST | `/leads/import/preview` | JWT — CSV validate (UC-CRM-04 / SCR-AGENT-008) |
| POST | `/leads/import/commit` | JWT — bulk create after preview |
| PATCH | `/leads/{leadId}` | JWT — stage update (UC-CRM-03) |
| GET | `/activities` | JWT — filter `?leadId=` |
| POST | `/activities` | JWT — quick activity log |
| GET | `/crm/sla/tasks` | JWT — SLA board overdue/due-soon (UC-CRM-06) |
| POST | `/crm/sla/leads/:leadId/remind` | JWT — log SLA reminder |
| POST | `/crm/sla/leads/:leadId/escalate` | JWT — escalate overdue to manager |

## Pipeline stages

`NEW` → `CONTACTED` → `VIEWING` → `NEGOTIATING` → `BOOKING` → `WON` / `LOST`

- `LOST` requires `lostReason`: `NO_BUDGET`, `NO_RESPONSE`, `BOUGHT_ELSEWHERE`, `OTHER`
- `BOOKING` requires lead `unitId`

## Headers

Public lead POST requires `X-Tenant-Id`.

## Tests

`crm.service.spec.ts` — create, PDPA, idempotency, patch stage, activities

## BR-15 PDPA consent

Public forms (`PUBLIC_FORM`, `PUBLIC_UNIT_DETAIL`) require:

```json
"consent": {
  "privacyAccepted": true,
  "privacyPolicyVersion": "2026-07-01",
  "marketing": false
}
```

## Web UI

| Route | Screen |
|-------|--------|
| `/public/units/:unitId` | SCR-PUBLIC-006 sticky lead form + viewing request |
| `/public/saved` | Saved searches / alerts (FR-SRCH-003) |
| `/legal/privacy` | PDPA policy page |
| `/agent` | Agent dashboard · hot leads KPI (UC-CRM-05) |
| `/agent/leads` | Lead list · filter · score sort |
| `/agent/pipeline` | SCR-AGENT-014 kanban + activity drawer |
| `/agent/viewings` | Lịch xem nhà (FR-VIEW) |
| `/agent/registrations` | Lead registry / deal protection (FR-DP) |
| `/agent/leads/import` | SCR-AGENT-008 CSV import preview + commit |
| `/agent/bookings/cancel` | SCR-AGENT-004 cancel + MFA + refund tracker |
| `/agent/listings/media` | SCR-AGENT-010 listing media gallery |
| `/agent/contracts/new` | SCR-AGENT-006 contract template wizard (UC-BK-06) |
| `/agent/tasks/sla` | SCR-AGENT-SLA reminder & escalation (UC-CRM-06) |

Spec: `docs/specs/NNHN-SRS-Website-CRM.md` · Implementation: `docs/specs/NNHN-SRS-Implementation-Plan.md`

## UAT

UAT-01 — lead capture · TC-06 pipeline kanban in pilot checklist
