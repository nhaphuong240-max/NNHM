# Trust module

**Path:** `apps/api/src/modules/trust`  
**UC:** UC-TR-03 · **Sprint:** G1

## Responsibility

Dispute center for payment/booking conflicts — open, mediate, resolve with audit trail.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/disputes` | List disputes · optional `?status=OPEN\|IN_MEDIATION\|RESOLVED` |
| POST | `/disputes` | Open dispute (`bookingId`, `type`, `reason`, `evidence`) |
| GET | `/disputes/:id` | Dispute detail |
| PATCH | `/disputes/:id/mediate` | Move OPEN → IN_MEDIATION |
| PATCH | `/disputes/:id/resolve` | Resolve with `resolutionNote` |
| GET | `/regulatory-export/jobs` | UC-TR-04 export job list (SCR-ADMIN-018) |
| POST | `/regulatory-export/jobs` | Compile regulatory pack stub |
| GET | `/regulatory-export/jobs/:id/download` | Download manifest CSV |

## Demo seed

| ID | Status | Booking |
|----|--------|---------|
| dsp_demo01 | OPEN | bk_settle01 |
| dsp_demo02 | IN_MEDIATION | — |

## Web UI

`/admin/disputes` — SCR-ADMIN-008 · filter · open · mediate · resolve · link to booking replay  
`/admin/regulatory-export` — SCR-ADMIN-018 · compliance export wizard

## Tests

`trust.service.spec.ts` — list, open, mediate, resolve.
