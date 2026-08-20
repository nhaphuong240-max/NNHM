# WEREAL Public Web — `apps/web`

Sprint **S2-06** public search · Sprint **S4-06** finance reconcile dashboard

## Quick start

```bash
# Terminal 1 — API + Postgres
cd apps/api && docker compose up -d && npm run start:dev

# Terminal 2 — Web
cd apps/web
npm install
npm run dev
```

| Route | Mô tả |
|-------|--------|
| http://localhost:5174/ | Home |
| http://localhost:5174/public/search | UC-LS-01 search |
| http://localhost:5174/public/units/un_01 | UC-LS-05 + UC-CRM-01 unit detail + lead PDPA |
| http://localhost:5174/finance/reconciliation | UC-PAY-02 reconcile |
| http://localhost:5174/finance/refunds | UC-PAY-03 refunds UI (SCR-FIN-005) |
| http://localhost:5174/developer/units | UC-GR-01 Golden Record grid (SCR-DEV-012) |
| http://localhost:5174/developer/commission | UC-COM-01 commission policy (S5-06) |
| http://localhost:5174/agent/bookings/new | UC-BK-01 create booking + payment link (SCR-AGENT-005 · UAT-03) |
| http://localhost:5174/buyer/payment/:intentId | UC-PAY-01 deposit pay MOCK/VNPay (SCR-BUYER-004 · UAT-03) |
| http://localhost:5174/buyer/payment/result?intentId=… | Payment result / DEPOSITED confirmation |
| http://localhost:5174/agent/bookings/:id | UC-BK-03 timeline (SCR-AGENT-003 · S3-03) |
| http://localhost:5174/agent/listings/new | UC-GR-02 listing wizard (SCR-AGENT-011 · UAT-02/04) |
| http://localhost:5174/agent/pipeline | UC-CRM-03 pipeline kanban (SCR-AGENT-014) |
| http://localhost:5174/admin/moderation | UC-GR-03 moderation queue (SCR-ADMIN-016 · UAT-02) |
| http://localhost:5174/admin/audit | UC-TR-01 audit trail explorer (SCR-ADMIN-005) |
| http://localhost:5174/auth/login | UC-ID-03 unified login · tenant picker · role redirect (SCR-AUTH-001) |
| http://localhost:5174/finance/login | Redirect → `/auth/login?portal=finance` |

Vite proxy `/api` → `http://localhost:3000`.

## SCR-PUBLIC-006 — Unit detail + lead PDPA (UAT-01)

1. Mở http://localhost:5174/public/units/un_01 (hoặc click từ search)
2. Điền họ tên + SĐT · tick **PDPA consent** (bắt buộc)
3. Submit → thank-you với `leadId`
4. Verify API: `GET /leads` (agent login) hoặc audit `entityType=lead`

Seed tự tạo 2 listing PUBLISHED (`un_01`, `un_02`) khi DB chưa có.

## SCR-AUTH-001 — Unified auth (UC-ID-03)

1. http://localhost:5174/auth/login — chọn tenant · demo Agent / Developer Admin chips
2. Portal query: `?portal=finance|agent|developer|admin` đổi branding + redirect mặc định
3. API: `GET /tenants` (public) · `GET /auth/me` · `GET /users` · `POST /auth/refresh`
4. MFA demo: `POST /auth/mfa/verify` OTP **123456** (dùng chung buyer payment flow)
5. Role redirect: Agent → booking · Developer → GR grid · Admin → moderation · **Audit** nav

## S4-06 — Finance reconcile dashboard

1. Mở http://localhost:5174/finance/reconciliation
2. Login: `admin@sunrise-dev.vn` / `DevAdmin123!`
3. Xem **match rate 7 ngày** (OP-WIN-02) · gateway vs ledger KPI · bảng discrepancy
4. Chọn ngày · **Chạy lại đối soát** (`refresh=true`)

Sau demo payment S4 (book → pay → webhook), bấm refresh để thấy trạng thái **MATCHED** màu xanh.

## S3-03 — Agent booking timeline (SCR-AGENT-003)

1. Tạo booking: `./scripts/uat-pilot.sh` (lấy `bookingId` từ log) hoặc `POST /bookings`
2. Mở http://localhost:5174/agent/bookings/{bookingId}
3. Login agent: `agent@sunrise-dev.vn` / `Agent123!`
4. Tab **Timeline** (human) / **Raw events** (domain store · OP-WIN-03)
5. Filter: state · payment · system

## SCR-DEV-012 — Developer Golden Record grid (UC-GR-01)

1. http://localhost:5174/developer/units — login `admin@sunrise-dev.vn` / `DevAdmin123!`
2. KPI strip: Total / Available / Reserved / Sold · filter project + status
3. **Sửa giá** inline → PATCH với `expectedVersion` · audit reason
4. **409 conflict:** mở 2 tab, sửa cùng unit — tab sau báo version conflict + reload
5. **Audit drawer:** lịch sử PATCH từ `GET /audit/events?entityType=unit`
6. Deep link: `/developer/units?unitId=un_01` highlight row

## S3-01 / SCR-AGENT-005 — Agent booking + payment link (UAT-03)

1. http://localhost:5174/agent/bookings/new — login `agent@sunrise-dev.vn` / `Agent123!`
2. Chọn lead + unit AVAILABLE · cọc mặc định 50M · MOCK gateway
3. **Tạo booking & sinh link cọc** → copy link buyer `/buyer/payment/{intentId}`
4. Mở link buyer (không cần login) · OTP demo **123456** · **Thanh toán MOCK**
5. Booking → **DEPOSITED** · agent timeline · Finance reconcile MATCHED

## SCR-BUYER-004 — Buyer payment

1. Public checkout: `GET /payment-intents/{id}/checkout` (X-Tenant-Id)
2. MOCK: nút pay gọi `/payments/mock/complete` qua Vite proxy
3. Poll checkout đến `SUCCEEDED` / booking `DEPOSITED`
4. Result page: `/buyer/payment/result?intentId=…`

## S2-03 / SCR-AGENT-011 — Listing wizard (UAT-02 / UAT-04)

1. http://localhost:5174/agent/listings/new — login `agent@sunrise-dev.vn` / `Agent123!`
2. Chọn unit GR · nhập tiêu đề/mô tả · giá hiển thị
3. Panel **Anti-drift** cập nhật realtime (`POST /listings/drift-check`)
4. **UAT-02:** giá khớp GR → **Gửi duyệt** → admin approve tại `/admin/moderation` → unit xuất hiện trên `/public/search`
5. **UAT-04:** bấm preset **4.5 tỷ (BLOCK)** → nút Gửi duyệt disabled · panel hiện GR truth

## Agent dashboard & lead list (Wave G3-C)

1. http://localhost:5174/agent — login `agent@sunrise-dev.vn` / `Agent123!`
2. KPI: tổng lead · hot (score ≥80) · pipeline active · bookings
3. Hot leads sorted by score · link gọi / chi tiết
4. http://localhost:5174/agent/leads — filter tier/stage · search · sort score desc

## Public SSE + AI recommendations (Wave G4-D)

1. http://localhost:5174/public/units/un_01 — badge **● Live SSE** · status updates on booking
2. http://localhost:5174/public/recommendations?unitId=un_01 — ranked matches (UC-AI-06)
3. http://localhost:5174/public/compare?ids=un_01,un_02 — **Copy share link** button

## Developer time-travel + forecast (Wave G5-E)

1. http://localhost:5174/developer/time-travel?unitId=un_01&at=2026-07-10 — login `admin@sunrise-dev.vn` / `DevAdmin123!`
2. Chọn ngày **2026-07-10** → snapshot giá **3.75 tỷ** (v2) · hiện tại v3 = 3.85 tỷ
3. Bảng version history · **Export CSV evidence**
4. http://localhost:5174/developer/forecast — stub absorption projection 3–12 tháng (UC-AN-05)

## Agent contracts + SLA (Wave G5-F)

1. http://localhost:5174/agent/contracts/new?bookingId=bk_contract01 — login `agent@sunrise-dev.vn` / `Agent123!`
2. Chọn template **Hợp đồng đặt cọc** → Preview → **Lưu DRAFT** (audit `entityType: contract`)
3. http://localhost:5174/agent/tasks/sla — board overdue/due-soon · **Nhắc Zalo** · **Escalate** (lead `ld_02` overdue demo)

## Buyer e-sign + Admin AI anomaly (Wave G)

1. http://localhost:5174/buyer/esign?contractId=ctr_esign_demo01 — OTP demo **123456** · consent → SIGNED + document vault ref (UC-BK-07)
2. http://localhost:5174/buyer/deals/bk_contract01 — link **Ký HĐ điện tử** khi DEPOSITED
3. http://localhost:5174/admin/ai/anomaly — login `admin@sunrise-dev.vn` / `DevAdmin123!` · queue `ls_anomaly_demo` · investigate · resolve/dismiss (UC-AI-05)

## Admin integration backlog (Wave H)

1. http://localhost:5174/admin/api-marketplace — partner register · webhook simulate (UC-NW-04 · SCR-ADMIN-004)
2. http://localhost:5174/admin/marketplace — agency ranking · SLA penalty demo `ten_agency_01` (UC-MKT-04 · SCR-ADMIN-015)
3. http://localhost:5174/admin/payment-gateways — route rules · fallback simulate (UC-PAY-05 · SCR-ADMIN-017)
4. http://localhost:5174/admin/regulatory-export — compile pack · manifest SHA-256 · download (UC-TR-04 · SCR-ADMIN-018)

## SCR-AGENT-014 — Pipeline CRM kanban (UC-CRM-03)

1. http://localhost:5174/agent/pipeline — login `agent@sunrise-dev.vn` / `Agent123!`
2. Kanban 7 cột: NEW → CONTACTED → VIEWING → NEGOTIATING → BOOKING → WON / LOST
3. **Kéo thả** card → `PATCH /leads/{id}` · LOST yêu cầu lý do enum
4. Filter: HOT · có unit · quá SLA 48h
5. **Chi tiết** drawer: quick log CALL/Zalo/Visit → `POST /activities` · timeline
6. **Tạo booking** prefilled `?leadId=&unitId=` → SCR-AGENT-005

## S2-04 / SCR-ADMIN-016 — Moderation queue

1. http://localhost:5174/admin/moderation — login `admin@sunrise-dev.vn` / `DevAdmin123!`
2. Hàng đợi `PENDING_REVIEW` · xem drift diff GR vs listing
3. **Approve → Publish** hoặc **Reject** + lý do
4. Listing BLOCK không approve được (422)

## SCR-ADMIN-005 — Audit trail explorer (UC-TR-01)

1. http://localhost:5174/admin/audit — login `admin@sunrise-dev.vn` / `DevAdmin123!`
2. Lọc theo entity type / ID / action / actor · preset 7 ngày / 30 ngày / tất cả
3. **Chi tiết** drawer: payload JSON · correlation chain cùng entity
4. Toggle **Ẩn PII** (Legal unmask) · deep link `?entityType=unit&entityId=un_01`
5. **Export CSV** → `GET /audit/events/export.csv` (BR-24 retention)
6. Shortcut từ GR grid audit drawer hoặc nút **Lọc cùng entity** trong drawer

## S4-05 / SCR-FIN-005 — Refunds UI

1. http://localhost:5174/finance/refunds (login admin@)
2. **Direct refund:** nhập `paymentIntentId` từ booking DEPOSITED → Initiate refund
3. **Cancel path:** nhập `bookingId` DEPOSITED → Cancel booking (auto refund)
4. Bảng recent refunds · ledger reversal ID · status SUCCEEDED/PENDING

## S2 vertical slice demo

```bash
T='-H X-Tenant-Id: ten_dev_01 -H Content-Type: application/json'
BASE=http://localhost:3000/api/v1

# 1. Dev patch GR price (S2-01)
curl -s -X PATCH $BASE/units/un_01 $T \
  -d '{"basePrice":3900000000,"expectedVersion":1,"reason":"S2 demo"}'

# 2. Agent create listing (S2-03)
curl -s -X POST $BASE/listings $T \
  -d '{"unitId":"un_01","title":"Căn 2PN view nội khu","description":"Full nội thất","highlights":["View nội khu"],"priceDisplay":3900000000}'

# 3. Submit + approve (S2-04)
curl -s -X POST $BASE/listings/ls_01/submit-review $T
curl -s -X PATCH $BASE/listings/ls_01/approve $T

# 4. Public search
curl -s "$BASE/search/units?bedrooms=2"
```

Then refresh http://localhost:5174/public/search

## UC-LS-07 — Search index worker (SCR-SYS-003)

1. Approve listing tại `/admin/moderation` → outbox `search_outbox` UPSERT
2. Dev PATCH giá GR → outbox reindex unit · SOLD → xóa khỏi index
3. Worker poll 2s · bootstrap reindex khi index trống
4. Verify: `GET /search/index/status` → `docCount`, `lagMs`, `healthy`
5. Public search `GET /search/units` → `meta.source: search-index` (không còn postgres filter)

## Wave I — Production-harden P0 vertical slice

| Hạng mục | UC/SCR | Route / API |
|----------|--------|-------------|
| E-sign + Document Vault | UC-BK-07 · SCR-BUYER-003 | `/buyer/esign` · `POST /contracts/:id/sign` → document vault |
| Payment gateway routing LIVE | UC-PAY-05 · SCR-ADMIN-017 | `PaymentOrchestrator.resolveRoute` + fallback |
| Lead score explain | UC-AI-02 · SCR-AGENT-014 | `GET /ai/scoring/leads/:leadId` |
| Buyer deal notifications | UC-UX-02 · SCR-BUYER-002 | `/buyer/deals/:id` · ZNS stub |
| Commission export async | UC-COM-05 · SCR-FIN-001 | `POST /commission/export/jobs` |
| Route alignment | — | `/developer/import` alias · SCR-PUBLIC-004 |

## Wave J — Phase 2 gaps (Should)

| Hạng mục | UC/SCR | Route / API |
|----------|--------|-------------|
| Legal RAG | UC-AI-03 · SCR-AGENT-001 | `/agent/ai/legal` · `GET /ai/legal/corpus` · `POST /ai/legal/query` |
| Agency leaderboard | UC-MKT-03 · SCR-DEV-009 | `/developer/leaderboard` · `GET /marketing/leaderboard` |
| KYC workflow nâng cao | UC-ID-05 · SCR-ADMIN-014 | `/admin/kyc` workflow panel · `GET/POST .../workflow` · `.../resubmit` |
| Settlement scheduler | UC-PAY-04 · SCR-FIN-006 | `/finance/settlement` scheduler · `GET/POST /commission/settlement/schedule` · cron Mon 07:00 ICT |
| Tenant webhooks | UC-NW-05 · SCR-DEV-013 | `/developer/webhooks` · `GET/POST /integrations/webhooks` |

**Demo:** `agent@sunrise-dev.vn` / `Agent123!` · `admin@sunrise-dev.vn` / `DevAdmin123!` · tenant `ten_dev_01`

## Wave K — Phase 3+ (Could / Enterprise)

| Hạng mục | UC/SCR | Route / API |
|----------|--------|-------------|
| AI Sales reply | UC-AI-04 · SCR-AGENT-002 | `/agent/ai/reply` · `POST /ai/reply/draft` · `POST /ai/reply/send` |
| Unified inbox | UC-CRM-07 · SCR-AGENT-007 | `/agent/inbox` · `GET /crm/inbox` · `POST .../reply` |
| Chat discovery | UC-AI-07 · SCR-PUBLIC-001 | `/public/chat` · `POST /ai/chat/sessions` · `POST /ai/chat/messages` |
| SSO Enterprise | UC-ID-06 · SCR-AUTH-002 | `/auth/sso` · `GET/POST /auth/sso/providers` · `POST /auth/sso/login` |
| Whitelabel portal | UC-UX-05 · SCR-ADMIN-022 | `/admin/whitelabel` · `GET/POST /tenants/branding` |
| Custom workflows | UC-BK-08 · SCR-ADMIN-023 | `/admin/workflows` · `GET/POST /bookings/workflows` · `POST .../publish` |
| Escrow conditional | UC-PAY-06 · SCR-FIN-003 | `/finance/escrow` · `GET/POST /escrow/accounts` · milestone release |
| BNPL installments | UC-PAY-07 · SCR-BUYER-001 | `/buyer/bnpl` · `GET /bnpl/plans` · `POST /bnpl/applications` |
| Map / 3D discovery | UC-UX-06 · SCR-PUBLIC-003 | `/public/map` · `GET /portal/public/map` |

**Demo:** public routes dùng `X-Tenant-Id: ten_dev_01` · admin/agent cần login như Wave J

## Wave L — Production-harden Wave I–K

| Hạng mục | UC/SCR | Production change |
|----------|--------|-------------------|
| SSO OIDC | UC-ID-06 · SCR-AUTH-002 | `GET /auth/sso/authorize` + callback → JWT · mock: `SSO_OIDC_USE_MOCK=true` |
| Escrow gates | UC-PAY-06 · SCR-FIN-003 | Milestone MET từ booking DEPOSITED · release chỉ khi MET |
| BNPL partner | UC-PAY-07 · SCR-BUYER-001 | `BnplPartnerClient` · PENDING → `POST /bnpl/webhook/partner` |
| Unified inbox | UC-CRM-07 · SCR-AGENT-007 | Zalo ZNS / SMS delivery + CRM activity outbound |
| AI reply LLM | UC-AI-04 · SCR-AGENT-002 | OpenAI-compatible · send → inbox delivery |
| Map 3D | UC-UX-06 · SCR-PUBLIC-003 | Project geo registry · buildings[] · isometric UI |

**Env:** xem `apps/api/.env.example` — `SSO_OIDC_*`, `OPENAI_API_KEY`, `BNPL_PARTNER_*`

## Phase 2 — NW · Settlement · AI Scoring (coding)

Backlog chi tiết: [`docs/dev/Sprint-Backlog-P2.md`](../docs/dev/Sprint-Backlog-P2.md)

| Hạng mục | UC | API / UI |
|----------|-----|----------|
| Meta Graph fetch | UC-NW-02 | `POST /integrations/meta/pages/connect` · Admin Meta connect form |
| SMS live provider | UC-NW-03 | `SMS_PROVIDER_URL` · `SMS_SANDBOX=false` |
| Tenant webhooks dispatch | UC-NW-05 | `emitEvent` on booking.created · payment.success |
| Settlement payout rail | UC-PAY-04 | `CommissionPayoutClient` · `SETTLEMENT_PAYOUT_*` |
| AI scoring P2 rules | UC-AI-02 | `rules-v1-p2-2026` · META/ZALO/SMS weights |

**Gate:** OP-WIN-06→07 · TC-12 · TC-21
