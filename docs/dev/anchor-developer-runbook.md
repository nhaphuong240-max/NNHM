# Anchor Developer Runbook — T5-S1 / T5-S7

## Checklist

1. **GR import** — units committed via `POST /golden-record/units/import/commit`
2. **Trust score** — `GET /golden-record/trust-score/:projectId` ≥ 80
3. **Anti-drift UAT** — `./scripts/uat-op-win-04.sh`
4. **Finance reconcile** — 7-day streak `./scripts/uat-op-win-06.sh`
5. **Anchor profile** — auto-seeded via `AnchorTenantService.ensureSeedAnchors()` (SYNTHETIC) hoặc `ensurePilotCdtAnchor()` (LIVE)

## Staging anchors

| Tenant | pilotClass | Display name | Projects |
|--------|------------|--------------|----------|
| `ten_dev_01` | SYNTHETIC | Sunrise Dev Anchor | `prj_sunrise` |
| `ten_anchor_02` | SYNTHETIC | Metro Tower Anchor | `prj_metro_02` |
| `ten_anchor_03` | SYNTHETIC | Green Park Anchor | `prj_green_03` |
| `ten_pilot_cdt_01` | **LIVE** | CĐT Thăng Long (Pilot) | `prj_thanglong_01` |

## APIs

- `GET /anchor/profiles?pilotClass=LIVE|SYNTHETIC`
- `GET /anchor/onboard/checklist/:tenantId`
- `POST /anchor/onboard/pilot`
- `GET /anchor/dashboard` (tenant header)
- `GET /anchor/leaderboard`

## SLA pack

Version `2026-T5-v1` · trustScoreMin **80** · OP-WIN checklist on dashboard.

Pilot LIVE: [pilot-cdt-onboarding.md](./pilot-cdt-onboarding.md)
