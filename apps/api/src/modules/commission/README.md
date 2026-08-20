# Commission module

**Path:** `apps/api/src/modules/commission`  
**UC:** UC-COM-01→05 · **Sprint:** S5

## Responsibility

Immutable commission policies, deal close snapshots, agent split, holdback disputes, CSV export.

## Key endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET/POST/PATCH | `/commission/policies` | Draft policies |
| POST | `/commission/policies/:id/publish` | Immutable publish |
| POST | `/commission/deals/:bookingId/close` | Snapshot + entries |
| GET | `/commission/lines` | Payable queue (UC-COM-03) |
| POST | `/commission/lines/approve` | Approve for settlement |
| GET/POST | `/commission/settlement/runs` | Batch payout (UC-PAY-04) |
| POST | `/commission/snapshots/:id/holdback` | Open dispute |
| POST | `/commission/snapshots/:id/holdback/:disputeId/resolve` | Release holdback |
| GET | `/commission/disputes?status=OPEN` | Ops holdback console |
| GET | `/commission/export.csv` | Finance export |

## Flow

1. Published policy for project
2. Booking reaches DEPOSITED
3. `POST /commission/deals/:bookingId/close` → snapshot `CALCULATED` + commission entries (UC-COM-02 · P3-S4)
4. Finance approve lines → **KYC APPROVED (BR-23)** → settlement run → PAID
5. Export CSV (UC-COM-05)

## P3-S4 / OP-WIN-05

`scripts/uat-p3-s4.sh` — full vertical slice closes deal and asserts snapshot `CALCULATED`.

## Tests

`commission-policy.service.spec.ts`, `commission-snapshot.service.spec.ts`, `commission.util.spec.ts`

## Web UI

`/developer/commission` — DeveloperCommissionPage  
`/finance/settlement` — SCR-FIN-006 settlement batch
