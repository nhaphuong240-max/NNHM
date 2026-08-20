# Golden Record module

**Path:** `apps/api/src/modules/golden-record`  
**UC:** UC-GR-01 · **Sprint:** S2

## Responsibility

Single source of truth for unit attributes (price, area, bedrooms). Listing anti-drift compares against GR.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/units` | List / filter |
| GET | `/units/:unitId` | Single unit |
| GET | `/units/:unitId/versions` | UC-GR-05 version history (audit replay) |
| GET | `/units/:unitId/snapshot?at=` | UC-GR-05 point-in-time query |
| GET | `/units/:unitId/versions/export.csv` | Export evidence pack |
| POST | `/units/import/preview` | CSV validate + diff preview (UC-GR-06) |
| POST | `/units/import/commit` | Bulk CREATE/UPDATE after preview |
| PATCH | `/units/:unitId` | Optimistic lock `expectedVersion` · 409 on conflict |

## Web UI

`/developer/units` — SCR-DEV-012 unit grid · inline price PATCH · audit drawer  
`/developer/units/import` — SCR-DEV-008 bulk CSV import · preview diff · commit  
`/developer/time-travel` — SCR-DEV-011 time-travel query · version table · CSV export  
`/developer/forecast` — SCR-DEV-005 absorption forecast stub (UC-AN-05)

## Related

- `listing` module — publish flow, anti-drift
- `search` module — published listings index
- `audit` module — immutable PATCH history for time-travel

## Tests

`golden-record.service.spec.ts` · `gr-time-travel.util.spec.ts`

## Smoke

`GET /units` with JWT + tenant — see `scripts/smoke-p0.sh`.  
Demo time-travel: `GET /units/un_01/snapshot?at=2026-07-10T12:00:00.000Z` → price 3.75 tỷ (v2).
