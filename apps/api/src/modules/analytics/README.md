# Analytics read-model (MOD-AN)

Read-only aggregates — no domain mutations.

## Endpoints

| Method | Path | UC | Screen |
|--------|------|-----|--------|
| GET | `/analytics/admin/dashboard` | UC-AN-01 | SCR-ADMIN-001 |
| GET | `/analytics/gmv?from=&to=` | UC-AN-02 | SCR-ADMIN-003 |
| GET | `/analytics/absorption?projectId=` | UC-AN-03 | Developer absorption |
| GET | `/analytics/forecast?projectId=&months=` | UC-AN-05 stub | SCR-DEV-005 |
| GET | `/analytics/attribution?from=&to=` | UC-AN-04 | SCR-ADMIN-AN-004 · SCR-DEV-003 |

Lead attribution columns: `utm_campaign`, `campaign_id` on `LeadEntity` (indexed). Populated at lead create via `resolveLeadAttribution()`.

Legacy alias: `GET /portal/admin/dashboard` delegates to `AnalyticsService`.
