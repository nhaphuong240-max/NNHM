# WEREAL Agent — Mobile App (React Native / Expo)

Native app cho **Agent hiện trường** — UC-UX-01, FR-UX-05.

| Platform | Phase | Stack |
|----------|-------|-------|
| **Agent sale app** | S2 beta → **G2.4 EAS preview** | Expo SDK 57 · React Navigation · EAS internal APK |
| Buyer native | Phase 3 | UC-UX-02 (sau) |
| Public PWA | Phase 1 | Responsive web + bottom nav |

## Quick start

```bash
cd WEREAL/apps/mobile
npm install
npm start
```

- **iOS simulator:** `npm run ios`
- **Android emulator:** `npm run android`
- **Expo Go:** quét QR từ terminal

## API

Mặc định: `http://localhost:3000/api/v1` (NestJS `apps/api`).

**JWT bắt buộc** cho `/leads`, `/units`, `/bookings` (S1-02). Tab **Cá nhân** → **Đăng nhập demo** — token lưu **SecureStore** (sống sót khi đóng/mở app).

| Key SecureStore | Nội dung |
|-----------------|----------|
| `@wereal/auth/accessToken` | JWT access |
| `@wereal/auth/refreshToken` | Refresh token |
| `@wereal/auth/tenantId` | Tenant context |
| `@wereal/auth/email` | User email |

Test: đăng nhập → force-quit app → mở lại → tab Leads vẫn gọi API được (không cần login lại).

```bash
# Simulator iOS — dùng IP máy dev thay localhost
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/v1 npm start
```

## Tính năng (v0.2 — UC-UX-01)

| Tab | UC | Sprint |
|-----|-----|--------|
| Trang chủ | UC-UX-01 | **M-S2-02** GPS check-in → POST /activities · offline queue |
| Trang chủ | UC-UX-01 | **M-S3-03** Offline sync queue → POST /mobile/activities/sync |
| Leads | UC-CRM-03 | **M-S3-01** AsyncStorage offline cache ✓ |
| Giữ chỗ | UC-BK-01 | **M-S3-02** POST /bookings quick booking ✓ |
| Cá nhân | UC-ID-03 | JWT profile · **push register** · SLA stub |

## M-S2-02 — GPS check-in (geo activity)

1. Tab **Cá nhân** → **Đăng nhập demo** (`agent@sunrise-dev.vn` / `Agent123!`)
2. Tab **Trang chủ** → chọn lead → **Log activity (GPS check-in)**
3. API: `POST /api/v1/activities` type **VISIT** · metadata `{ latitude, longitude, source: mobile-gps }`
4. Verify: agent web pipeline hoặc `GET /activities?leadId=ld_01`

## M-S3-03 — Offline sync queue

1. **Online** → log GPS thành công (sync ngay)
2. Bật **Airplane mode** → log GPS lại → badge **Chờ sync** + banner vàng
3. Tắt airplane → app tự **POST /mobile/activities/sync** (batch idempotent)
4. Cache key: `@wereal/sync-queue/v1` · `npm test` — `syncQueue.test.ts`

## Push notification (pilot)

1. Tab **Cá nhân** → **Bật push notification** → `POST /mobile/devices/register`
2. **Gửi thử SLA reminder** → `POST /mobile/notifications/stub` (backend queued stub)
3. Simulator: dùng **local notification** demo khi không có Expo push token
4. Thiết bị thật + Expo Go: nhận Expo push token đầy đủ

| API | Mô tả |
|-----|--------|
| `POST /mobile/devices/register` | Đăng ký Expo push token |
| `POST /mobile/activities/sync` | Flush hàng đợi GPS offline (batch) |
| `POST /mobile/notifications/stub` | Pilot SLA push stub (UC-CRM-06) |

## Tính năng (v0.1 scaffold)

| Tab | UC | Sprint |
|-----|-----|--------|
| Trang chủ | UC-UX-01 | GPS log · API health · KPI |
| Leads | UC-CRM-03 | **M-S3-01** AsyncStorage offline cache ✓ |
| Giữ chỗ | UC-BK-01 | **M-S3-02** POST /bookings quick booking ✓ |
| Cá nhân | UC-ID-03 | JWT profile |

## M-S3-01 — Offline leads cache

1. Mở app **online** → tab **Leads** → kéo refresh (4 leads từ API)
2. Bật **Airplane mode** → mở lại tab Leads → vẫn thấy list · badge **Cache**
3. `npm test` — unit test `leadsCache.test.ts`

Cache key: `@wereal/leads/v1` · API: `GET /api/v1/leads`

## M-S3-02 — Quick booking

1. Chạy API: `cd apps/api && npm run start:dev`
2. Mobile online → tab **Giữ chỗ** → **Tạo booking**
3. Thấy **Booking RESERVED** + `bk_xx` + `lock_xx` + thời gian hết hạn
4. Thử book lại cùng unit (không reset) → **409** unit unavailable
5. Trang chủ → **Quick booking** chuyển sang tab Giữ chỗ

API: `POST /api/v1/bookings` · header `X-Idempotency-Key`

## Design

Tokens: `src/theme/tokens.ts` — sync `prototype/src/config/designTokens.ts`

## G2.4 — EAS Build preview

1. Tạo token: https://expo.dev/settings/access-tokens
2. Link project: `npm run eas:init` (một lần)
3. Sửa `eas.json` → `build.preview.env.EXPO_PUBLIC_API_URL` = IP LAN hoặc staging API
4. Build APK:

```bash
export EXPO_TOKEN=your_token
export EAS_PROJECT_ID=from-expo-dashboard
npm run build:preview:android
```

5. Cài APK trên device lab · chạy checklist [`docs/dev/G2.4-EAS-Preview.md`](../../docs/dev/G2.4-EAS-Preview.md)

CI: GitHub Actions **EAS Preview (G2.4)** — secrets `EXPO_TOKEN`, `EAS_PROJECT_ID`, `EXPO_PUBLIC_API_URL`

## Liên kết

- [`docs/dev/Mobile-Strategy.md`](../../docs/dev/Mobile-Strategy.md)
- [`docs/dev/Sprint-Backlog-P0.md`](../../docs/dev/Sprint-Backlog-P0.md) — M-S2, M-S3
- Prototype preview: http://localhost:5173/agent/mobile
