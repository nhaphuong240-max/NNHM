# T7-S4 — Trust OS live

> Sprint **T7-S4** · Gate **T7-G4** · GR version bind · anti-drift SLA · VNPT e-sign/eKYC · vault retention · PDPA

## Deliverables

| Artifact | Path |
|----------|------|
| GR version bind (migration) | `database/migrations/1738339202000-AddUnitVersionBind.ts` |
| Booking commit pin | `booking.service.ts` · `expectedUnitVersion` |
| Listing commit pin | `listing.service.ts` · create + approve |
| Anti-drift BLOCK → ops SLA | `listing.service.ts` · `ai-anomaly.util.ts` |
| VNPT e-sign live path | `booking/vnpt-esign.adapter.ts` |
| VNPT eKYC live path | `ekyc/vnpt-ekyc.adapter.ts` |
| Vault retention job | `documents/document-retention.job.ts` |
| PDPA on document download | `documents/documents.service.ts` |
| Trust health gate | `GET /health/trust` |

## Env flags

| Flag | Dev | Prod (`tier-t7/production-trust.env`) |
|------|-----|----------------------------------------|
| `ESIGN_SANDBOX` | `true` | `false` |
| `EKYC_SANDBOX` | `true` | `false` |
| `VNPT_ESIGN_API_URL` | — | VNPT SmartCA endpoint |
| `VNPT_ESIGN_CLIENT_SECRET` | — | secrets manager |
| `VNPT_EKYC_API_URL` | — | VNPT eKYC endpoint |
| `VNPT_EKYC_API_KEY` | — | secrets manager |
| `ANTI_DRIFT_OPS_SLA_HOURS` | `4` | `4` (≤4h ops ack) |

## GR version bind

Booking and listing commits require `expectedUnitVersion` matching `GET /units/:id` → `attributes.version`.

```bash
VER=$(curl -sf -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" \
  http://localhost:3000/api/v1/units/un_01 | jq '.data.attributes.version')

curl -X POST /api/v1/bookings \
  -d "{\"unitId\":\"un_01\",\"expectedUnitVersion\":$VER,\"leadId\":\"ld_01\"}"
```

409 `version-conflict` when GR changed between read and commit.

## Anti-drift BLOCK → ops queue

- `ListingService.create()` with `antiDriftStatus=BLOCK` enqueues `listing_anomaly` audit (SLA deadline = now + 4h).
- Post-publish GR drift auto-unverify also enqueues ops.
- Ops resolves via `POST /ai-anomaly/:id/resolve`.

See [on-call.md](../../runbooks/on-call.md) Tier 2 trust escalation.

## Verify

```bash
./scripts/uat-t7-trust.sh http://localhost:3000/api/v1
./scripts/uat-op-win-04.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/trust | jq .
npm test -- src/modules/booking/booking.service.spec.ts src/modules/listing/listing.service.spec.ts
```

## Next (T7-S5)

Money OS live — VNPay prod · settlement payout live · escrow NHNN · OP-WIN-02/06 streak.
