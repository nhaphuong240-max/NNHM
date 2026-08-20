# Pilot CĐT onboarding — T5-S7

> 1 CĐT pilot **LIVE** chạy song song 3 anchor **SYNTHETIC** trên staging.

## Tenant pilot thật

| Field | Value |
|-------|-------|
| Tenant | `ten_pilot_cdt_01` |
| Legal name | Công ty CP BĐS Thăng Long |
| Project | `prj_thanglong_01` — Thăng Long Central |
| Admin | `pilot@thanglong-dev.vn` / `PilotCdt123!` |
| SLA | `2026-T5-v1` · trustScoreMin **80** |
| pilotClass | **LIVE** · onboardingStatus **SIGNED** |

Config: [`config/gtm/pilot-cdt-v1.json`](../../config/gtm/pilot-cdt-v1.json)

## Synthetic anchors (giữ nguyên)

| Tenant | pilotClass | Projects |
|--------|------------|----------|
| `ten_dev_01` | SYNTHETIC | `prj_sunrise` |
| `ten_anchor_02` | SYNTHETIC | `prj_metro_02` |
| `ten_anchor_03` | SYNTHETIC | `prj_green_03` |

## APIs

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/anchor/profiles?pilotClass=LIVE\|SYNTHETIC` | Lọc anchor theo lớp pilot |
| GET | `/anchor/onboard/checklist/:tenantId` | Checklist GR / trust / SLA / distribution |
| POST | `/anchor/onboard/pilot` | Idempotent upsert profile LIVE |
| GET | `/anchor/dashboard` | Dashboard theo `X-Tenant-Id` |
| GET | `/anchor/leaderboard` | Xếp hạng LIVE + SYNTHETIC |

## Cross-anchor (T5-S7)

Distribution policy `dp_thanglong_mkt_v1` trên `prj_thanglong_01` có `crossAnchorProjectIds: ["prj_sunrise"]` — agency có thể bán chéo từ pilot CĐT sang Sunrise synthetic anchor.

Verify: `GET /marketing/marketplace/admin/cross-anchor` (auth dev admin).

## Runbook

```bash
# 1. API + DB đang chạy (seed tự tạo pilot nếu thiếu)
./scripts/onboard-pilot-cdt.sh http://localhost:3000/api/v1

# 2. UAT gate
./scripts/uat-pilot-anchor.sh http://localhost:3000/api/v1

# 3. Anchor smoke tổng
./scripts/uat-t5-anchor.sh http://localhost:3000/api/v1
```

## Checklist onboarding (5 bước)

1. **GR import** — project + units trong DB (`ensurePilotCdtAnchor`)
2. **Trust score ≥80** — audit events trên units pilot
3. **SLA signed** — `onboardingStatus: SIGNED` trên profile LIVE
4. **Distribution published** — `dp_thanglong_mkt_v1` PUBLISHED
5. **Cross-anchor linked** — `terms.crossAnchorProjectIds` → `prj_sunrise`

`GET /anchor/onboard/checklist/ten_pilot_cdt_01` → `ready: true` khi đủ 5 bước.

## Evidence

```bash
./scripts/uat-pilot-anchor.sh https://staging/api/v1 \
  | tee docs/dev/evidence/pilot-cdt-anchor-$(date +%Y%m%d).log
```

Liên quan: [gtm-anchor-onboarding.md](./gtm-anchor-onboarding.md) · [anchor-developer-runbook.md](./anchor-developer-runbook.md)
