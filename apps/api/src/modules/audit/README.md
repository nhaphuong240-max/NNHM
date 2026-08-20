# Audit module

**Path:** `apps/api/src/modules/audit`  
**UC:** UC-AUD-01 · UC-TR-01 · **Sprint:** S5

## Responsibility

Append-only audit trail for mutations (booking, payment, commission, GR, etc.).

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/audit/events` | Filter `entityType`, `entityId`, `bookingId`, `action`, `actorId`, `dateFrom`, `dateTo`, `limit` |
| GET | `/audit/events/export.csv` | OP-WIN-03 timeline export · `bookingId` cross-ref domain events |

## CSV columns

`occurred_at`, `actor_id`, `entity_type`, `entity_id`, `action`, `payload_json`

## Usage

Compliance replay — export by entity or date range for pilot sign-off.

Web UI: `/admin/audit` (SCR-ADMIN-005) wired to list + CSV export.

## Tests

`audit.service.spec.ts` — list filters + export CSV header/body.

## Smoke

`scripts/smoke-p0.sh` checks export CSV header.
