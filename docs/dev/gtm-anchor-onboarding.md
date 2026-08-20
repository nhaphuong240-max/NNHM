# GTM — Anchor developer onboarding (3 CĐT)

> Path from synthetic seed → 1 real pilot CĐT + 3 synthetic anchors → 500 agent WAU.

## Phase 1 — Synthetic staging (done in code)

| Tenant | pilotClass | Role | Projects |
|--------|------------|------|----------|
| `ten_dev_01` | SYNTHETIC | Primary synthetic | `prj_sunrise` |
| `ten_anchor_02` | SYNTHETIC | Synthetic anchor | `prj_metro_02` |
| `ten_anchor_03` | SYNTHETIC | Synthetic anchor | `prj_green_03` |

APIs: `GET /anchor/profiles`, `/anchor/dashboard`, `/anchor/leaderboard`

## Phase 2 — Real CĐT pilot (T5-S7, done in code)

**1 CĐT pilot thật** chạy **song song** synthetic — không thay thế anchor seed.

| Tenant | pilotClass | Legal name | Project |
|--------|------------|------------|---------|
| `ten_pilot_cdt_01` | **LIVE** | Công ty CP BĐS Thăng Long | `prj_thanglong_01` |

Runbook: [pilot-cdt-onboarding.md](./pilot-cdt-onboarding.md)

```bash
./scripts/onboard-pilot-cdt.sh https://staging/api/v1
./scripts/uat-pilot-anchor.sh https://staging/api/v1
```

Checklist tự động: `GET /anchor/onboard/checklist/ten_pilot_cdt_01`

## Phase 3 — Agency network

1. Publish distribution policy with `crossAnchorProjectIds` (pilot → `prj_sunrise`)
2. Agency apply → approve on ≥2 anchor projects
3. Verify: `GET /marketing/marketplace/admin/cross-anchor`

## Phase 4 — WAU pilot → 500

| Milestone | Metric | Tool |
|-----------|--------|------|
| Instrumentation | WAU API live | `GET /analytics/agent/wau?days=7` |
| Pilot 100 | `wau7d ≥ 100` | `./scripts/simulate-wau-pilot.sh` (load) + real agents |
| Target 500 | `wau7d ≥ 500` | GTM agency rollout post anchor |

Push live: `PUSH_LIVE_ENABLED=true` on staging.

## Evidence pack

```bash
./scripts/uat-t5-anchor.sh https://staging/api/v1
./scripts/uat-pilot-anchor.sh https://staging/api/v1
./scripts/simulate-wau-pilot.sh https://staging/api/v1
./scripts/uat-op-win-signoff.sh https://staging/api/v1
```

Sign: [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md)
