# Chiến lược Mobile — WEREAL REOS

> **Document ID:** WEREAL-MOB-2026-v1.0

## 1. Ba kênh mobile

| Kênh | App | Phase | UC |
|------|-----|-------|-----|
| **Agent native** | `apps/mobile` (Expo RN) | S2–S3 | UC-UX-01 |
| **Public responsive** | `apps/web` + PWA | S2 | NFR-U04 ≥320px |
| **Buyer native** | `apps/mobile-buyer` (TBD) | Phase 3 | UC-UX-02 |

## 2. Agent app — UC-UX-01

**Persona:** Sale/môi giới hiện trường (P3 Hoàng Nam)

| Tính năng | Sprint | API |
|-----------|--------|-----|
| Login JWT + tenant | M-S2-01 | POST /auth/login |
| Offline lead list cache | M-S3-01 | GET /leads + AsyncStorage |
| Geo check-in activity | M-S2-02 ✓ | POST /activities + GPS metadata |
| Offline activity sync queue | M-S3-03 ✓ | POST /mobile/activities/sync |
| Quick booking | M-S3-02 | POST /bookings |
| Push notification (pilot) | M-S3-04 ✓ | POST /mobile/devices/register · /notifications/stub |

**Gate G2.4:** Offline-read inventory + booking beta · NFR-CM02 device lab.

## 3. Tech stack

| Layer | Chọn | Lý do |
|-------|------|-------|
| Framework | **Expo + React Native** | Cùng TS với API · OTA · Phase 2 velocity |
| Alt (Phase 3+) | Flutter buyer app | Nếu team mobile Dart mạnh |
| State | TanStack Query + AsyncStorage | Offline-first pattern |
| Auth | SecureStore + JWT refresh | UC-ID-03 |

## 4. Repo layout

```
apps/mobile/          ← Agent app (đã scaffold)
apps/mobile-buyer/    ← Phase 3 (chưa tạo)
prototype/            ← /agent/mobile preview web
```

## 5. Design mobile

- Brand `#0F4C81` header · bottom tab 4 mục
- Tabular nums cho giá
- Offline banner cam (`brand.warning`)
- Min width 320px (NFR-U04)

## 6. CI mobile (S3 → G2.4)

```bash
cd apps/mobile && npm run typecheck && npm test
# EAS preview APK — Gate G2.4
export EXPO_TOKEN=... EAS_PROJECT_ID=...
./scripts/eas-preview.sh android preview
```

Chi tiết device lab: [`docs/dev/G2.4-EAS-Preview.md`](../../docs/dev/G2.4-EAS-Preview.md)
