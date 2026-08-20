# Stream module

**Path:** `apps/api/src/modules/stream`  
**UC:** UC-GR-07 · **Sprint:** S3

## Responsibility

Real-time unit status fan-out via Redis pub/sub + NestJS SSE.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/stream/units` | SSE · `@Public()` · `?tenantId=` or `X-Tenant-Id` |

## Events

| Event | Payload |
|-------|---------|
| `connected` | `{ tenantId, channel, timestamp }` |
| `unit.status.changed` | `{ unitId, status, timestamp, bookingId?, leadId? }` |

## Publishers

Booking create/cancel, GR patch, payment webhook, refund — via `StreamEventsService.publishUnitStatus`.

## Web UI

`/public/units/:unitId` — `useUnitStatusStream` hook · live status badge

## Tests

Integration via booking/GR flows · Redis required for live SSE.
