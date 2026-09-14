# SRS — Phân hệ Website (Marketplace) & CRM

> **Sản phẩm:** Ngôi Nhà Hôm Nay — Networked Sales Operating System  
> **Mã tài liệu:** NNHN-SRS-WEB-CRM-001  
> **Phiên bản:** 1.1 (bổ sung đánh giá cạnh tranh + FR nâng cấp)  
> **Ngày:** 14/09/2026  
> **Nguồn:** `SRS_Ngoi_Nha_Hom_Nay_Networked_Sales_Operating_System.docx` (NNHN-SRS-NSOS-001 v2.0)  
> **Phạm vi tài liệu này:** MOD-02, MOD-03 (mặt consumer), MOD-07 (public-safe), MOD-08, MOD-09, MOD-10, MOD-15 (cơ bản), MOD-18 (IA/SEO)  
> **Hệ thống triển khai:** WEREAL modular monolith — `apps/web` (public SPA) + `apps/api` module `crm` / `search` / `booking`  
> **Liên kết:** `Tai-lieu-yeu-cau-phan-mem.md` · `apps/api/src/modules/crm/README.md` · `docs/specs/NNHN-SRS-Implementation-Plan.md` (kế hoạch triển khai v1.1)

---

## 0. Kiểm soát tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Baseline gốc | NNHN-SRS-NSOS-001 v2.0 (14/09/2026) |
| Đối tượng | PO, BA, Solution Architect, Engineering, UX, QA, Sales Director, CĐT, sàn |
| Nguyên tắc | Property-first · Unit-first · Policy-as-code · Evidence-first · Consumer trust · Human-in-the-loop |
| Ngôn ngữ | Tiếng Việt; mã FR/UC giữ EN |

Tài liệu này **không thay** Developer Sales OS, Commission, Inventory Control Tower hay Payment. Những phân hệ đó vẫn theo SRS NSOS đầy đủ. Website và CRM là lớp demand: discovery → lead → bảo vệ quyền khách → xem nhà → bàn giao sang booking.

---

## 1. Tóm tắt điều hành

Website NNHN là **Marketplace & Demand Intelligence**: khách tìm nhà, xem dự án/căn đã xác minh, tạo nhu cầu. CRM là **Lead OS** của mạng bán: thu lead, định tuyến, SLA, đăng ký khách (deal protection), lịch xem nhà, pipeline tới booking.

Hai phân hệ phải dùng **một hồ sơ khách** (Lead Registry). Form public, ads, walk-in, partner registration và CSV đều đổ vào cùng pipeline; không tạo “lead Zalo” tách khỏi “lead website”.

### 1.1 Mục tiêu nghiệp vụ

1. Discovery có filter/map/dự án, dữ liệu public tươi và có mức xác minh.
2. Mọi contact (form, gọi, chat, đăng ký sàn) có source, consent, timestamp.
3. Trùng SĐT không nhân bản hồ sơ; ghi thêm tương tác và attribution.
4. Agent phản hồi đúng SLA; leader nhận escalation.
5. Sàn đăng ký khách có cửa sổ bảo vệ; xung đột có case, không rò PII.
6. Đặt lịch xem nhà là thực thể lịch, không chỉ cột kanban “VIEWING”.
7. Booking confirmed kéo lead sang `BOOKING` / `WON` — không để CRM và inventory lệch pha.

### 1.2 Personas (website + CRM)

| Persona | Kênh | Việc chính |
|---|---|---|
| Guest | Mobile web | Khảo sát, search, xem dự án |
| Seeker | Web/PWA | Lọc, so sánh, lưu search, liên hệ, đặt xem nhà |
| Buyer | Buyer Portal | Theo dõi booking/thanh toán (ngoài phạm vi sâu tài liệu này) |
| Broker / Sales Agent | CRM + mobile | Inbox, đăng ký khách, quote, hold, xem nhà, booking |
| Team Leader | CRM | SLA, phân bổ, conflict |
| Agency Admin | Partner portal | Entitlement, import, bảo vệ khách |
| NNHN Ops | Admin | Moderasi listing, chất lượng lead |

### 1.3 Kiến trúc thông tin website (bắt buộc)

```
Home
├── Mua
├── Thuê
├── Dự án
├── Bản đồ / khu vực
├── Công cụ tài chính (EMI)
├── Đã lưu / Cảnh báo
├── So sánh
├── Tài khoản / Đăng nhập
└── Đăng tin (đối tác)
```

Public UI **không** hiển thị: tên khách khác, giá locked, chủ hold, hoa hồng, tài liệu nội bộ.

---

## 2. Domain model (website + CRM)

| Thuật ngữ | Định nghĩa vận hành trên NNHN |
|---|---|
| Listing | Tin chào bán/thuê gắn unit Golden Record |
| Property Master | Hồ sơ BĐS thứ cấp (phase sau; website hiện unit-first) |
| Lead | Hồ sơ nhu cầu + liên hệ + stage + score |
| Lead Registration | Đăng ký quyền chăm sóc khách theo dự án, có TTL bảo vệ |
| Deal Protection | Luật first-valid-registration / site-visit / adjudication |
| Viewing | Lịch xem căn/dự án: slot, xác nhận, outcome, next task |
| Saved Search | Query đã lưu + tần suất alert (consent-aware) |
| Inquiry type | `buy` · `rent` · `project` |

### 2.1 Pipeline CRM (ánh xạ SRS NSOS → hệ thống)

SRS NSOS (MOD-08) dùng 13 bước. Kanban hiện tại giữ 7 stage để agent thao tác nhanh; ánh xạ:

| Stage NNHN (lưu DB) | Tương đương NSOS |
|---|---|
| `NEW` | New |
| `CONTACTED` | Contact Attempted + Connected |
| `VIEWING` | Viewing Scheduled + Viewing Completed |
| `NEGOTIATING` | Offer + Negotiation |
| `BOOKING` | Booking |
| `WON` | Contracting + Won |
| `LOST` | Lost / Disqualified |

Mọi chuyển `LOST` bắt buộc `lostReason`. `BOOKING` bắt buộc `unitId`. Booking inventory thành công **phải** kéo lead → `BOOKING` nếu chưa terminal.

Lost reason (mở rộng NSOS): `NO_BUDGET` · `NO_RESPONSE` · `BOUGHT_ELSEWHERE` · `PRICE` · `FINANCE` · `PRODUCT_MISMATCH` · `COMPETITOR` · `POLICY_DELAY` · `LEGAL` · `OTHER`.

---

## 3. Yêu cầu chức năng — Website (Marketplace)

### MOD-02 Search & Discovery

| FR | Yêu cầu | Ưu tiên | Trạng thái hệ thống |
|---|---|---|---|
| **FR-SRCH-001** | Search theo khu vực, dự án, CĐT, loại, giao dịch (mua/thuê), ngân sách, diện tích, PN, verified, availability | Must | Một phần: `q`, quận, PN, giá. Intent mua/thuê/dự án lưu trên query + lead; index chưa có `transactionType` |
| **FR-SRCH-002** | List / map / split; sort relevance, mới, giá, verified-first | Must | List + map synthetic. Split map/list chưa có |
| **FR-SRCH-003** | Lưu search, alert listing mới / giảm giá / back-to-market; frequency cap + consent | Must | **Đã tích hợp v1:** visitor saved search + trang Đã lưu |
| **FR-SRCH-004** | Danh mục dự án, filter, detail → sales room public-safe | Must | Home hero CĐT + `/public/projects/:id` + `/mua/:slug` |
| **FR-SRCH-005** | Trust display: verified, freshness, nguồn tin. Cấm PII/deal/commission | Must | Verified badge, Golden Record, anti-drift; không lộ PII |

### MOD-03 Listing consumer

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-PRP-002** | Lifecycle Draft → … → Published → Sold/Leased | Must | Listing: DRAFT / PENDING_REVIEW / PUBLISHED / REJECTED. Unit: AVAILABLE / RESERVED / SOLD |
| **FR-PRP-003** | Dedupe listing (ops) | Should | Admin duplicates — ngoài CRM |
| **FR-PRP-004** | Verification V0–V4, không cam kết pháp lý tuyệt đối | Must | `verified` boolean ≈ V2; UI disclosure |

### MOD-07 Digital Sales Room (public-safe)

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-DSR-002** | Unit card: mã, trạng thái scoped, diện tích, giá theo rule, CTA liên hệ / xem nhà / giữ chỗ | Must | PDP + listing card |
| **FR-DSR-003** | Public chỉ thấy available/limited + giá marketing | Must | SSE status; giữ chỗ public vẫn qua agent login (Release B) |
| **FR-VIEW-001** (public) | Seeker gửi yêu cầu xem nhà (timeslot hoặc callback) | Must | **Đã tích hợp v1** trên PDP |

### MOD-18 IA / SEO / legal

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-CNT-002** | Không index trang mỏng/không tồn kho; canonical khu vực | Must | `/mua/:slug` JSON-LD |
| **FR-CMP privacy** | Trang chính sách bảo mật versioned; form PDPA trỏ đúng URL | Must | **`/legal/privacy`** · version `2026-07-01` |

### Sự kiện website (FR-DATA-001)

`search_submitted` · `filter_applied` · `property_viewed` · `unit_viewed` · `saved` · `contact_started` · `lead_created` · `viewing_requested`

---

## 4. Yêu cầu chức năng — CRM

### MOD-08 Lead, routing, SLA

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-LEAD-001** | Capture: form marketplace, ads, chat, QR, walk-in, referral, import, API. Bắt buộc source, time, inquiry type, kênh, context, consent | Must | Form PDP/SERP, Meta, Zalo, CSV, partner SDK. Chat capture chưa nối UI |
| **FR-LEAD-002** | Dedup SĐT/email chuẩn hoá; trùng → ghi interaction, giữ attribution, không nhân bản | Must | **Đã tích hợp v1** (phone normalize + merge) |
| **FR-LEAD-003** | Routing theo dự án, skill, workload, score; fallback queue → leader → reassign | Should | HOT round-robin; rule UI in-memory |
| **FR-LEAD-004** | SLA first-response / follow-up; breach immutable | Must | 48h NEW/CONTACTED; remind/escalate log. Chưa ZNS thật |
| **FR-LEAD-005** | Qualification: intent, budget, loan, khu vực, timeline | Should | `requirement` JSON trên lead |
| **FR-LEAD-006** | Pipeline + reason taxonomy | Must | 7 stage + lost reason |
| **FR-LEAD-007** | Health/score giải thích được, không phải black-box từ chối | Must | rules-v1 + màn giải thích |

### MOD-09 Lead registration & deal protection

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-DP-001** | Agent đăng ký khách: identifier, dự án, intent, consent. Kết quả: Accepted / Existing Protected / Existing But Eligible / Pending Review / Rejected. Không lộ PII sàn khác | Must | **Đã tích hợp v1** |
| **FR-DP-002** | Cửa sổ bảo vệ (mặc định 30 ngày), gia hạn khi viewing/quote, cooling-off | Must | TTL 30 ngày; viewing confirmed gia hạn |
| **FR-DP-003** | Conflict khi nhiều bên đăng ký cùng khách/dự án | Should | Status `CONFLICT` khi trùng protected |
| **FR-DP-004** | Dispute case workflow | Could | Mở case `CONFLICT`; adjudication đầy đủ phase sau |
| **FR-DP-005** | QR walk-in | Could | Chưa |

### MOD-10 Viewing

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-VIEW-001** | Request timeslot / callback; validate đơn vị + lịch | Must | **v1:** request + agent confirm |
| **FR-VIEW-002** | Open day / event | Could | Chưa |
| **FR-VIEW-003** | Checklist xem nhà | Should | Outcome + note |
| **FR-VIEW-004** | Outcome bắt buộc; auto next task | Must | Outcome taxonomy; completed → stage `VIEWING` |

### Đồng bộ giao dịch

| FR | Yêu cầu | Ưu tiên | Trạng thái |
|---|---|---|---|
| **FR-BKG-CRM** | `POST /bookings` với `leadId` → lead `BOOKING` | Must | **Đã tích hợp** |
| **FR-BUY-001** | Buyer thấy giao dịch của mình | Should | `/buyer/deals` (sẵn) |

---

## 5. Quy trình TO-BE

### 5.1 Seeker trên website

```
Landing / Search / Project / Unit
  → Lưu search (alert)
  → Liên hệ (PDPA) ──┐
  → Đặt lịch xem ────┤──► Lead (dedup) → Routing → SLA clock
                     └──► Viewing REQUESTED
Agent: Contacted → Viewing confirmed → checklist
  → Offer / hold (Sales OS)
  → Booking → lead BOOKING
```

### 5.2 Partner đăng ký khách

```
Agent nhập SĐT + dự án + consent
  → Normalize + dedup Lead Registry
  → Accepted (protection 30 ngày) | Existing Protected | CONFLICT
  → Viewing check-in gia hạn protection
  → Booking chỉ khi registration còn hiệu lực hoặc override có audit
```

### 5.3 Xử lý trùng SĐT (website)

Không tạo lead thứ hai. Ghi activity `NOTE` (source, unit, message, UTM). Trả cùng `leadId` + `meta.deduplicated=true`. Seeker vẫn nhận “đã ghi nhận”.

---

## 6. Phân quyền (website + CRM)

| Capability | Guest | Seeker | Agent | Agency Admin | NNHN Admin |
|---|---|---|---|---|---|
| Search public | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tạo lead form | ✓ + PDPA | ✓ | ✓ | ✓ | ✓ |
| Đặt viewing | ✓ + PDPA | ✓ | ✓ | ✓ | ✓ |
| Lưu search | visitorId | ✓ | — | — | — |
| Xem inbox/pipeline | | | Scoped | Org | All |
| Đăng ký khách | | | Scoped project | Org | Override |
| Xem PII sàn khác | | | Không | Không (trừ dispute) | Audited |

Enforcement **server-side**. Public luôn gửi tenant; host branding không được lộ catalog tenant khác.

---

## 7. API

```
POST   /leads                         public — capture + dedup
GET    /leads                         JWT
GET    /leads/:id                     JWT
PATCH  /leads/:id                     JWT — stage / requirement / lostReason
POST   /viewings                      public — tạo lead (nếu cần) + viewing
GET    /viewings                      JWT
PATCH  /viewings/:id                  JWT — confirm / outcome
POST   /lead-registrations            JWT — deal protection
GET    /lead-registrations            JWT
POST   /saved-searches                public — visitorId
GET    /saved-searches                public — visitorId
DELETE /saved-searches/:id            public — visitorId
POST   /activities                    JWT
GET    /crm/sla/tasks                 JWT
```

Nguyên tắc: idempotency key cho POST lead/hold/booking; lỗi nghiệp vụ có mã (`LEAD_DEDUPED`, `REGISTRATION_PROTECTED`, `VIEWING_SLOT_INVALID`); PII mask khi list registration của org khác.

---

## 8. Dữ liệu

| Entity | Trường chính |
|---|---|
| Lead | person, phone chuẩn hoá, source, inquiryType, stage, score, assignment, unit/project, requirement, consent, UTM |
| Viewing | lead, unit/project, slot, status, outcome, assignee |
| LeadRegistration | partner/agent, phone, project, status, protectedUntil, leadId |
| SavedSearch | visitorId, intent, q, filters JSON, alertFrequency, consent |
| CrmActivity | type CALL/NOTE/VISIT/ZALO/MEETING, timeline |

Chất lượng: SĐT unique logic theo tenant (merge, không unique DB cứng để giữ lịch sử source). Mọi viewing/registration gắn lead. Public verified claim truy về evidence.

---

## 9. NFR (áp dụng hai phân hệ)

| Metric | Target |
|---|---|
| Search P95 | ≤ 2.0s |
| Lead create P95 | ≤ 1.5s |
| Viewing create P95 | ≤ 1.5s |
| Marketplace availability | 99.9% |
| First-response SLA pilot | ≥ 90% lead high-intent |

Privacy: consent versioned; partner không harvest SĐT ngoài purpose; AI không bịa tồn kho/giá.

---

## 10. UI CRM (agent)

```
Partner Sales
├── Home / Today (KPI + SLA)
├── Leads & Inbox
├── Pipeline
├── Đăng ký khách (Lead Registry)
├── Lịch xem nhà
├── Import CSV
├── Holds & Bookings
└── Routing / SLA
```

Tác vụ ≤ 5 bước: đăng ký, đặt viewing, hold, booking. State và expiry phải nhìn thấy (protection countdown, viewing slot).

---

## 11. Acceptance (Release A — Foundation)

Website + CRM được coi đạt khi:

1. Form PDP/SERP tạo lead có PDPA; trùng SĐT không tạo hồ sơ thứ hai.
2. Seeker lưu search và xem lại tại Đã lưu.
3. Seeker gửi yêu cầu xem nhà từ PDP; agent thấy trên Lịch xem nhà.
4. Agent đăng ký khách: Accepted hoặc Existing Protected, không thấy PII bên kia.
5. Tạo booking kèm `leadId` đưa lead sang `BOOKING`.
6. Nav public có Mua / Thuê / Dự án / Đã lưu; footer có Chính sách bảo mật.
7. ≥ 95% listing public có đủ trường bắt buộc (đã có TrustStrip/search stats).

Release B (chưa bắt buộc trong tích hợp này): hold public, QR check-in, alert push thật, routing persist, ZNS SLA.

---

## 12. Ma trận truy vết

| Pain (NSOS) | FR | UC hiện hữu | Màn hình |
|---|---|---|---|
| Lead phân mảnh | FR-LEAD-001/002 | UC-CRM-01 | PDP, SERP modal |
| Không biết nguồn ra tiền | FR-LEAD-001 UTM | UC-AN-04 | Lead detail |
| SLA rơi lead | FR-LEAD-004 | UC-CRM-06 | `/agent/tasks/sla` |
| Tranh chấp khách | FR-DP-001 | UC-CRM-07 | `/agent/registrations` |
| Xem nhà miệng | FR-VIEW-001 | UC-CRM-08 | PDP + `/agent/viewings` |
| Search không lưu | FR-SRCH-003 | UC-LS-08 | `/public/saved` |
| CRM lệch booking | FR-BKG-CRM | UC-BK-01 | `/agent/bookings/new` |

---

## 13. Kết luận (v1.0)

Phân hệ website không phải “trang tin”. Phân hệ CRM không phải “danh bạ SĐT”. Cả hai là **demand OS** của NNHN: tồn kho public-safe ở ngoài, quyền khách và lịch sử chăm sóc ở trong, booking là biên giới sang Sales OS. Mọi mở rộng (map SDK, chat LLM, buyer self-hold) phải giữ nguyên Lead Registry và Deal Protection — không mở kênh song song.

---

## 14. Đánh giá độ sâu và khả năng thắng đối thủ

> **Phiên bản bổ sung:** 1.1 · **Ngày:** 14/09/2026  
> **Câu hỏi:** Spec v1.0 đã chuyên sâu và thắng đối thủ chưa?  
> **Trả lời:** Sâu về **mô hình liên mạng**, chưa thắng về **sản phẩm thị trường**.

### 14.1 Điểm số

| Trục | Điểm | Ý nghĩa |
|---|---|---|
| Độ sâu domain OS (GR, registry, viewing, booking sync) | **8/10** | Thắng portal và CRM Mỹ *trên mô hình* |
| Độ chặt BA (UC, sequence, error code, field dictionary) | **6/10** | Đủ implement v1, chưa đủ UAT pháp lý/sàn |
| Thắng portal VN (Batdongsan, Chợ Tốt, OneHousing) | **4/10** | Thiếu search/map/SEO/identity |
| Thắng CRM agency (FUB, kvCORE, Getfly, Salesforce) | **5/10** | Thiếu speed-to-lead giây, drip, assignment |
| Win-ready GTM 1 dự án CĐT | **Chưa** | Release A = nền, không phải sản phẩm quốc gia |

NNHN **không thắng bằng số feature CRM**. Thắng nếu website là mặt demand của cùng một sự thật với inventory lock và deal protection. Portal thắng traffic; FUB thắng nurture; NNHN phải thắng **chốt + không tranh chấp + tồn kho đúng**.

### 14.2 Đối thủ và mặt trận

| Đối thủ | Họ thắng | NNHN thắng nếu | Cấm copy |
|---|---|---|---|
| Batdongsan / Chợ Tốt | SEO, volume tin, map, thói quen tìm | Tin **verified + còn hàng thật**, không phải classified rác | Không đua số tin ảo |
| OneHousing | CĐT + content + app | Registry + policy snapshot + hoa hồng explain | Không làm “báo nhà đẹp” |
| Follow Up Boss / kvCORE | Speed-to-lead, drip, landing | Zalo native + booking/ledger sau lead | Không làm 50 template email Mỹ |
| Salesforce RE | SSO, ecosystem | TCO + vertical VN (CĐT–sàn–unit) | Không custom 18 tháng |
| Getfly / AMIS / Pancake | CRM giá rẻ, Zalo chat | Deal protection đa sàn trên 1 dự án | Không biến NNHN thành chat shop |

### 14.3 Việc v1.0 đã làm đúng (giữ)

- Một Lead Registry cho form, ads, Zalo, CSV, đăng ký sàn.
- Dedup SĐT; public không nhân bản hồ sơ.
- Deal protection TTL; PII mask sàn khác.
- Viewing là lịch, không chỉ stage.
- Booking commit → lead `BOOKING`.
- Public cấm PII / hold owner / commission.
- Human-in-the-loop: AI không cam kết giá/tồn kho.

### 14.4 Việc v1.0 tự làm yếu (phải nâng)

Acceptance là checklist màn hình, không phải KPI thắng. Intent mua/thuê chưa vào index. Alert lưu mà không gửi. SLA 48 giờ (FUB tính phút). Routing in-memory. CONFLICT chưa có trọng tài. Seeker = `visitorId` trình duyệt. CMS/SEO 6 quận hardcode. Chat không capture lead. Attribution ghi trên giấy, chưa instrument.

---

## 15. FR bổ sung — nâng cấp toàn diện website + CRM

Các FR dưới đây **bắt buộc ghi vào backlog** phân hệ này. Không mở Sales OS/Commission trong tài liệu này.

### 15.1 P0 — Beachhead 1 dự án (6 tuần)

| FR | Yêu cầu | Tiêu chí chấp nhận |
|---|---|---|
| **FR-SRCH-006** | `transactionType` trên search index: `sale` · `rent` · `project`. Intent tab lọc thật | 100% listing published có type; tab Thuê không trả căn bán |
| **FR-SRCH-007** | Map SDK (Mapbox/Google) + cluster + search-on-move; tọa độ từ GR không synthetic | P95 map tiles + pin ≤ 2.5s trên 1 dự án pilot |
| **FR-SRCH-008** | Sort: relevance, mới, giá, diện tích, **verified-first**; zero-result gợi ý nới filter | Zero-result rate đo được; có recovery UX |
| **FR-SRCH-009** | Freshness: `updatedAt` public; listing stale auto-pause theo policy | ≥ 95% tin public `updatedAt` ≤ N ngày (N cấu hình) |
| **FR-IAM-SEEKER** | OTP SĐT tạo tài khoản seeker; saved search gắn user, không chỉ visitor | Login xong khôi phục search trên thiết bị khác |
| **FR-SRCH-003b** | Worker alert: listing mới / giảm giá / back-to-market; consent + quiet hours + cap | ≥ 95% alert queued ≤ 60s; không gửi khi opt-out |
| **FR-LEAD-008** | Speed-to-lead: first-touch SLA theo class (HOT ≤ 5 phút giờ hành chính) | Pilot ≥ 90% HOT; escalate **đổi assignee** + notify leader |
| **FR-LEAD-003b** | Routing rule persist DB; theo project, skill, workload, calendar | Restart API không mất rule |
| **FR-DP-004** | Dispute: Open → Evidence → Review → Split/Favor A/B → Appeal → Close | SLA owner; PII-safe; quyết định ghi commission attribution |
| **FR-DP-002b** | Cooling-off khi inactivity; revival rule; first-visit vs first-register priority | Policy versioned theo dự án |
| **FR-VIEW-001b** | Slot vs lịch agent/site; buffer; conflict; reminder | Không confirm slot trùng agent |
| **FR-EVT-001** | Instrument đủ event FR-DATA-001 (search, view, contact, viewing) | Mỗi event có tenant, source, consent basis |

### 15.2 P1 — Thắng conversion sàn (12 tuần)

| FR | Yêu cầu | Tiêu chí chấp nhận |
|---|---|---|
| **FR-DSR-001** | Interactive map: masterplan → tower → floor → unit polygon public-safe | Public không thấy hold owner |
| **FR-DSR-004** | Share link branded, expiry, tracking gắn lead khi identity hợp pháp | Open/unit-view trong timeline |
| **FR-CNT-001** | CMS: khu vực, dự án, FAQ, landing; workflow editorial + legal | Không index trang mỏng/không tồn kho |
| **FR-CNT-004** | Programmatic SEO: hierarchy quận/phường từ master data, không hardcode 6 quận | Canonical + hreflang khi cần |
| **FR-REV-005** | Attribution graph: UTM/QR/call/partner → lead → viewing → booking (tách commission attribution) | CĐT xem nguồn → booking, không thấy HH chi tiết nếu policy cấm |
| **FR-LEAD-005b** | Qualification bắt buộc trước BOOKING: budget, timeline, loan (config theo dự án) | BLOCK nếu thiếu field bắt buộc |
| **FR-VIEW-002** | Open day / event: RSVP, capacity, QR, gắn lead | Check-in gia hạn protection |
| **FR-VIEW-003b** | Checklist xem nhà bắt buộc khi COMPLETED | Next task auto theo outcome |
| **FR-AI-001** | NL search tiếng Việt → filter; hiện tiêu chí đã hiểu; ground inventory hiện tại | Không bịa giá/tồn kho; eval set VN |
| **FR-NOT-001b** | ZNS/SMS thật cho SLA, viewing reminder, hold expiry | Delivery status trên timeline |
| **FR-PRP-004b** | UI verification V0–V4 + disclaimer “không bảo đảm pháp lý” | Không level nào = cam kết pháp lý |

### 15.3 P2 — Intelligence (không copy FUB)

| FR | Yêu cầu | Ghi chú |
|---|---|---|
| **FR-MI-002** | Locality insight: giá/m², nguồn, ngày cập nhật | Narrative phải có source |
| **FR-LEAD-007b** | Health score explainable: recency, viewing, budget match, SLA compliance | Không dùng điểm để auto-từ chối |
| **FR-REV-002** | Routing gợi ý theo partner score + aging tồn kho | Cần người duyệt trước khi auto |
| **FR-AI-002** | Agent copilot: tóm tắt lead, next action; outbound human review | Template transactional được phép auto |
| **FR-BIL-seeker** | Không làm ad marketplace P2 | Defer MOD-21 |

**Cấm scope:** MLS/IDX Mỹ, A/B landing builder 50 template, escrow NHNN trong phân hệ này, public rating sàn khi chưa có khiếu nại công bằng.

---

## 16. KPI thắng (thay checklist màn hình)

North Star phân hệ demand: **Qualified viewing hoàn thành / tuần / dự án beachhead** — không phải số lead thô, không phải pageview.

| KPI | Target beachhead | Đối thủ so sánh |
|---|---|---|
| Search P95 | ≤ 2.0s | Portal ~1–2s |
| Zero-result rate | ≤ 15% có recovery | Batdongsan đo nội bộ |
| Detail → contact | ≥ 8% session PDP | Classified thường 2–4% |
| First-touch HOT P95 | ≤ 5 phút (giờ hành chính) | FUB: giây–phút |
| Viewing show-up | ≥ 60% slot confirmed | Agency miệng ~40% |
| Lead duplicate rate | 0 hồ sơ trùng SĐT active | Portal spam form |
| Conflict open → close | ≤ 5 ngày làm việc | Hiện tranh Zalo |
| Public listing freshness | ≥ 95% trong N ngày | Portal tin “xác minh” mơ hồ |
| Booking từ lead có `leadId` | 100% | CRM lệch Excel |

Mọi release website/CRM phải báo các KPI này, không chỉ “đã có màn hình”.

---

## 17. Độ chặt BA còn thiếu (bổ sung tài liệu, không chỉ code)

Để spec đạt mức UAT sàn/CĐT:

1. **Từ điển trường** Lead / Viewing / Registration (bắt buộc, optional, PII class, retention).
2. **Mã lỗi nghiệp vụ** ổn định: `LEAD_DEDUPED`, `REGISTRATION_PROTECTED`, `VIEWING_SLOT_CONFLICT`, `SLA_NOT_APPLICABLE`, `INTENT_INDEX_MISS`.
3. **Sequence** 4 luồng: public contact, viewing, đăng ký 2 sàn trùng, booking từ lead NEW.
4. **ABAC** org/project trên registration list (hiện mask PII theo `registeredBy`, chưa org).
5. **Lịch SLA** theo timezone VN + ngày nghỉ dự án.
6. **Eval AI:** 50 câu hỏi VN “căn đã sold / giá bao nhiêu / còn hàng không”.
7. **Beachhead chốt:** 1 CĐT × 1 dự án × 2 sàn — policy protection và appeal chữ ký legal.

Không có (7) thì Deal Protection chỉ là TTL kỹ thuật, chưa phải sản phẩm thắng tranh chấp.

---

## 18. Kết luận nâng cấp

Spec v1.0 **đủ sâu để không biến NNHN thành clone Batdongsan**. Spec v1.0 **chưa đủ để tuyên bố thắng** portal (traffic/UX) hay CRM Mỹ (nurture/speed).

Nâng cấp toàn diện = **P0 search thật + identity + SLA phút + dispute có trọng tài**, rồi P1 attribution/CMS/map dự án. Giữ moat: một sự thật tồn kho và quyền khách. Không mở thêm kênh lead song song, không đua classified, không đua drip Mỹ.
