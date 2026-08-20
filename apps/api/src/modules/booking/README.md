# Booking module

**Path:** `apps/api/src/modules/booking`  
**UC:** UC-BK-01 · **Sprint:** S3

## Responsibility

Reserve units with Redis distributed lock, idempotency, expiry job, cancel + refund hook.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/bookings` | `X-Idempotency-Key` required |
| GET | `/bookings/:bookingId` | Booking detail + allowedTransitions |
| GET | `/bookings/:bookingId/timeline` | Human timeline (UC-BK-03) |
| GET | `/bookings/:bookingId/events` | Raw domain events (OP-WIN-03) |
| GET | `/bookings/:bookingId/replay` | Dispute evidence replay pack (UC-BK-04) |
| GET | `/bookings/:bookingId/replay/export.csv` | P3-S1 domain events CSV (OP-WIN-03) |
| DELETE | `/bookings/:bookingId` | Cancel + optional refund |
| GET | `/bookings/status` | Module health + Redis lock metrics (P3-S2) |
| GET | `/contracts/templates` | UC-BK-06 template catalog |
| POST | `/contracts/preview` | Merge booking + GR + buyer |
| POST | `/contracts` | Persist DRAFT (audit-backed) |
| GET | `/contracts?bookingId=` | List contract drafts |
| GET | `/contracts/:contractId` | UC-BK-07 buyer contract detail (`@Public` + tenant) |
| GET | `/contracts/:contractId/sign-session` | E-sign session + OTP hint |
| POST | `/contracts/:contractId/sign` | Submit e-sign (OTP demo `123456`) |
| POST | `/contracts/webhooks/esign` | Provider callback stub |

## State machine

`AVAILABLE → RESERVED → DEPOSITED → CLOSED` (payment webhook advances to DEPOSITED).

## Jobs

`BookingExpiryJob` — releases stale RESERVED bookings.

## Tests

`booking.service.spec.ts` — concurrent book, idempotency, cancel.

## Web UI

`/agent/bookings/:bookingId` — SCR-AGENT-003 timeline (apps/web)  
`/agent/contracts/new` — SCR-AGENT-006 contract wizard · preview · DRAFT  
`/buyer/esign?contractId=ctr_esign_demo01` — SCR-BUYER-005 e-sign (UC-BK-07)  
`/admin/bookings/replay` — SCR-ADMIN-006 replay · reconstructed states · audit link

## UAT

UAT-05 concurrent booking — `scripts/uat-p3-s2.sh` · k6 `scripts/load/concurrent-book.k6.js` · checklist `docs/uat/UAT-P0-pilot-checklist.md` · [load-testing.md](../../../docs/dev/load-testing.md).
