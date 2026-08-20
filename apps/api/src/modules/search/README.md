# Search module

**Path:** `apps/api/src/modules/search`  
**UC:** UC-LS-01 · UC-LS-05 · UC-LS-07 · **Sprint:** S2

## Responsibility

Public property search backed by a **denormalized search index** synced from GR/listing via outbox worker (OpenSearch-ready pattern; MVP uses Postgres `search_index_docs`).

## Architecture (UC-LS-07)

```
Listing approve / GR patch
        ↓ transactional
   search_outbox row
        ↓ worker (2s poll + sync on enqueue)
   search_index_docs upsert/delete
        ↓
GET /search/units (UC-LS-01)
```

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/search/units` | Query indexed docs · `meta.source: search-index` |
| GET | `/search/recommendations` | UC-AI-06 ranked matching · `seedUnitId` optional |
| GET | `/search/units/{unitId}` | Detail from index payload |
| GET | `/search/index/status` | Lag metric · outbox pending/failed |

## Outbox triggers

| Event | Source | Operation |
|-------|--------|-----------|
| Listing approved | `ListingService.approve` | UPSERT |
| Unit price/status patch | `GoldenRecordService.patchUnit` | UPSERT or DELETE (SOLD) |

## Worker

`SearchIndexWorker` — `@Interval(2000)` processes pending outbox; bootstrap reindex when index empty.

**BR-20:** target lag ≤ 5s (`meta.indexLagMs` / `GET /search/index/status`).

## Tests

- `search.service.spec.ts` — index query + detail
- `search-index.service.spec.ts` — enqueue, upsert, delete, status

## Smoke

`scripts/smoke-p0.sh` — `GET /search/units` + `GET /search/index/status`

## Web UI (public portal)

| Route | Screen |
|-------|--------|
| `/public/search` | SCR-PUBLIC-005 search + add to compare |
| `/public/recommendations` | SCR-PUBLIC-003 AI buyer-product matching |
| `/public/compare` | SCR-PUBLIC-002 compare table + share link copy |
| `/public/units/:unitId` | SCR-PUBLIC-006 detail + lead form + UC-GR-07 SSE |
