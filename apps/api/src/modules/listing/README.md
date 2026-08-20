# Listing module

**Path:** `apps/api/src/modules/listing`  
**UC:** UC-LS-01 · **Sprint:** S2 / G1

## Responsibility

Agent listing CRUD, media attachments, duplicate detection for moderation (UC-LS-06).

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/listings/duplicates` | Duplicate groups (SAME_UNIT · SIMILAR_TITLE) |
| PATCH | `/listings/duplicates/:groupKey/resolve` | Keep primary · reject others |
| GET | `/listings/:listingId` | Listing detail |
| POST | `/listings` | Create listing |
| PATCH | `/listings/:listingId` | Update listing |

## Demo seed

Unit `un_01` has `ls_un01` + `ls_un01_dup` for duplicate queue demo.

## Web UI

`/admin/duplicates` — SCR-ADMIN-009 · detect · resolve duplicate groups

## Tests

`listing-duplicate.util.spec.ts` — grouping · primary pick logic.
