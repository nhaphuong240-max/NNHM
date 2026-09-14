# Kế hoạch triển khai — SRS Website & CRM nâng cao

> **Sản phẩm:** Ngôi Nhà Hôm Nay — Demand OS (Marketplace + Lead OS)  
> **Mã:** NNHN-IMPL-WEB-CRM-001  
> **Phiên bản:** 1.0  
> **Ngày:** 14/09/2026  
> **Nguồn yêu cầu:** `docs/specs/NNHN-SRS-Website-CRM.md` v1.1 (mục 14–18)  
> **Baseline code:** Release A (lead dedup, viewing entity, deal protection TTL, saved search visitor, booking → `BOOKING`)  
> **Nguyên tắc:** Một Lead Registry · không kênh lead song song · public-safe · KPI thắng thay checklist màn hình

Tài liệu này là **playbook triển khai**, không thay SRS. Mọi FR lấy từ mục 15 SRS. Cấm mở Sales OS / Commission / Payment / MLS trong phạm vi này.

---

## 0. Mục tiêu và định nghĩa xong

### 0.1 Mục tiêu sản phẩm

Biến Release A (nền kỹ thuật) thành **sản phẩm beachhead 1 dự án CĐT** mà hai sàn dùng được: khách tìm được căn thật, agent bắt lead trong phút, tranh chấp khách có trọng tài, CRM không lệch booking.

North Star: **Qualified viewing hoàn thành / tuần / dự án beachhead** — không phải số lead thô, không phải pageview.

### 0.2 Định nghĩa “xong” toàn chương trình

Chương trình đạt khi **đồng thời**:

1. Tab Mua / Thuê / Dự án lọc đúng `transactionType` trên index (không chỉ query string).
2. Search split map/list dùng tọa độ Golden Record + SDK thật trên dự án pilot.
3. Seeker OTP; saved search + alert gửi thật (consent, quiet hours, cap).
4. First-touch HOT ≤ 5 phút giờ hành chính, escalate **đổi assignee** + notify leader.
5. Routing rule persist DB (restart API không mất).
6. Viewing không confirm trùng lịch agent; reminder.
7. Dispute Open → Evidence → Review → quyết định; PII-safe; SLA owner.
8. Cooling-off / revival versioned theo dự án.
9. Event FR-DATA-001 đủ tenant / source / consent.
10. Dashboard KPI mục 16 SRS chạy trên dữ liệu thật (không mock).

Không đạt (10) thì chưa được tuyên bố “ship P0”.

### 0.3 Ngoài phạm vi (cấm)

MLS/IDX · A/B landing 50 template · escrow NHNN · public rating sàn · ad marketplace seeker · drip email kiểu FUB · CMS “báo nhà đẹp” trước P1 · tách lead Zalo khỏi lead website.

---

## 1. Hiện trạng (điểm xuất phát)

| Khối | Đã có (Release A) | Thiếu so với SRS v1.1 |
|---|---|---|
| Search | `q`, quận, PN, giá; map synthetic | `transactionType` index, map SDK, verified-first sort, freshness pause |
| Identity | Agent JWT, visitorId | OTP seeker, khôi phục search đa thiết bị |
| Alert | Lưu search trên visitor | Worker gửi, quiet hours, cap, opt-out |
| Lead | Dedup SĐT, PDPA, score rules-v1 | Speed-to-lead phút, escalate đổi người |
| Routing | HOT round-robin **in-memory** | Persist DB, skill/workload/calendar |
| Deal protection | TTL 30 ngày, mask PII người đăng ký | Org ABAC, dispute workflow, cooling-off policy |
| Viewing | Request + confirm + outcome | Slot vs lịch agent, buffer, conflict, reminder |
| Events | Một phần activity CRM | Bộ FR-DATA-001 chuẩn analytics |
| CRM UI | Dashboard / leads / pipeline / table viewing / registry | Today tốc độ, calendar viewing, dispute queue (mockup 5–8) |
| SEO/CMS | `/mua/:slug`, 6 quận | Programmatic hierarchy, CMS editorial (P1) |

Module chạm chính: `apps/api/src/modules/search`, `crm`, `booking`, `identity`, `zalo`/`sms`, `apps/web` public + `pages/agent`.

---

## 2. Beachhead GTM (cổng pháp lý — làm trước khi code P0 sâu)

Không có chữ ký này thì Deal Protection chỉ là TTL kỹ thuật.

| Hạng mục | Chủ | Đầu ra | Deadline |
|---|---|---|---|
| Chốt 1 CĐT × 1 dự án × 2 sàn | Sales Director + PO | Tên dự án, 2 agency, 2 team leader | Wave 0 ngày 3 |
| Policy bảo vệ khách (30 ngày, first-register vs first-visit, appeal) | Legal + CĐT | PDF versioned `policy.dealProtection.v1` | Wave 0 ngày 8 |
| Lịch giờ hành chính + ngày nghỉ dự án | Ops | Timezone `Asia/Ho_Chi_Minh` + calendar | Wave 0 ngày 5 |
| N = số ngày stale listing | Ops + CĐT | Số nguyên cấu hình tenant | Wave 0 ngày 5 |
| Map SDK (Mapbox vs Google VN) + billing | Eng + Finance | Quyết định 1 vendor | Wave 0 ngày 4 |
| SMS OTP vendor (seeker) | Eng | Sandbox + prod key trên staging | Wave 0 ngày 6 |

**Cổng Wave 0:** đủ 6 đầu ra mới được merge feature P0 lên `main` (spike/dev branch vẫn làm song song).

---

## 3. Lịch trình tổng

Giả định đội: **2 BE + 1 FE + 1 QA chia sẻ + PO/BA** (nếu 1 BE thì P0 kéo **8–10 tuần**, không cắt FR).

| Wave | Thời gian | Mục tiêu | Cổng ra |
|---|---|---|---|
| **0 — BA + policy** | 15–26/09/2026 (2 tuần) | Từ điển, mã lỗi, 4 sequence, beachhead ký | Legal pack + error catalog |
| **P0 — Beachhead** | 29/09–07/11/2026 (6 tuần, 3 sprint) | Search thật + identity + SLA phút + dispute v1 | KPI pack trên 1 dự án staging/prod |
| **P1 — Conversion** | 10/11/2026–30/01/2027 (12 tuần) | CMS/SEO, DSR map, attribution, ZNS, qualification | GTM 1 dự án công khai |
| **P2 — Intelligence** | 02/2027–04/2027 | Insight giá, copilot, routing gợi ý | Eval AI 50 câu VN |

Lịch 20 tuần (Wave 0 + P0 + P1) là đường **thắng thị trường**. P0 6 tuần là đường **dùng được với 2 sàn**.

```
2026-09          10          11          12     2027-01     02–04
|-- Wave 0 --|-------- P0 6w --------|----------- P1 12w -----------|-- P2 --
   BA/legal     S1 search    S2 identity   CMS DSR ZNS
                routing      SLA map       attribution
                events       S3 dispute UAT
```

---

## 4. Wave 0 — BA và nền (10 ngày làm việc)

SRS mục 17: thiếu thì UAT sàn/CĐT thất bại dù code đẹp.

### 4.1 Deliverable tài liệu (PO/BA, không chỉ eng)

| ID | Việc | Định dạng | AC |
|---|---|---|---|
| BA-01 | Từ điển trường Lead / Viewing / Registration / SavedSearch | Bảng trong SRS hoặc `docs/specs/NNHN-Field-Dictionary.md` | Mỗi field: bắt buộc, optional, PII class, retention |
| BA-02 | Catalog mã lỗi ổn định | Enum API + docs | `LEAD_DEDUPED`, `REGISTRATION_PROTECTED`, `VIEWING_SLOT_CONFLICT`, `SLA_NOT_APPLICABLE`, `INTENT_INDEX_MISS`, thêm `SEEKER_OTP_INVALID`, `ALERT_OPTED_OUT`, `DISPUTE_OPEN` |
| BA-03 | Sequence 4 luồng | PlantUML / mermaid trong spec | Public contact · viewing · 2 sàn trùng SĐT · booking từ lead NEW |
| BA-04 | ABAC org/project trên registration | Rule + test case | Mask theo org, không chỉ `registeredBy` |
| BA-05 | Lịch SLA VN | Config tenant | Ngoài giờ hành chính không tính first-touch HOT; `SLA_NOT_APPLICABLE` |
| BA-06 | Eval set AI (chuẩn bị P1/P2) | 50 câu VN | “căn sold / giá / còn hàng” — chưa code AI P0 |
| BA-07 | Beachhead legal | PDF ký | Xem mục 2 |

### 4.2 Spike kỹ thuật (eng, song song)

| Spike | Quyết định | Không làm trong spike |
|---|---|---|
| Map SDK | 1 vendor, token, cluster | Vẽ masterplan polygon (P1) |
| Event bus | Bảng `analytics_event` vs queue có sẵn | Data warehouse |
| OTP seeker | Tái sử dụng `sms` module vs vendor mới | Tài khoản social |
| Routing persist | Bảng `crm_routing_rule` JSONB vs rows | Skill graph đầy đủ |
| Alert worker | Nest cron / Bull queue đã có | Push mobile native |

### 4.3 UX

Đưa mockup `docs/mockups/nnhn-srs-ui` màn **5 Today, 6 Registry, 7 Viewings, 2 Search split** thành spec UI production (không redesign brand). FE estimate theo mockup, không invent IA mới.

### 4.4 Wave 0 — đã code (14/09/2026)

| ID | Deliverable | Path |
|---|---|---|
| BA-01 | Từ điển trường | `docs/specs/NNHN-Field-Dictionary.md` |
| BA-02 | Catalog mã lỗi + enum | `docs/specs/NNHN-Business-Error-Catalog.md`, `apps/api/src/common/business-error.ts` |
| BA-03 | 4 sequence | `docs/specs/NNHN-Sequences.md` |
| BA-04 | ABAC registration | `docs/specs/NNHN-ABAC-Registration.md`, `registration-abac.util.ts` |
| BA-05 | SLA calendar + policy | `demand-policy.types.ts`, `sla-calendar.util.ts`, `GET/PATCH /crm/demand-policy` |
| BA-06 | Eval AI 50 câu | `docs/specs/eval/NNHN-AI-Eval-VN-50.json` |
| BA-07 | Mẫu legal DP | `docs/legal/policy.dealProtection.v1.md` |
| DB | Migration org + policy | `1757940000000-Wave0DemandPolicy.ts` |

Wire: `crm-demand.service` dùng `PHONE_INVALID`, `VIEWING_SLOT_INVALID`, ABAC org; `crm.service` dùng `PDPA_CONSENT_REQUIRED`.

### 4.5 Wave P0 — đã code (14/09/2026)

| Sprint | WP | Deliverable | Path |
|---|---|---|---|
| S1 | FR-SRCH-006 | `transactionType` index + API + FE tab | `search-index.service.ts`, `SearchPage.tsx`, migration `1758050000000` |
| S1 | FR-SRCH-008 | Sort + zero-result suggestions | `search.service.ts`, `search-zero-result.util.ts` |
| S1 | FR-SRCH-009 | Freshness pause job | `search-freshness.job.ts` |
| S1 | FR-EVT-001 | Product analytics events | `product-analytics.service.ts`, `POST /analytics/events` |
| S1 | FR-LEAD-003b | Routing persist DB | `crm-routing-rule.entity.ts`, `crm-routing.service.ts`, `lead-routing.service.ts` |
| S2 | FR-IAM-SEEKER | OTP seeker + visitor merge | `seeker-auth.service.ts`, `POST /auth/seeker/otp/*` |
| S2 | FR-SRCH-003b | Alert worker sandbox | `saved-search-alert.job.ts` |
| S2 | FR-LEAD-008 | HOT 5-min SLA + Today | `crm-hot-sla.service.ts`, `GET /crm/today`, `POST /crm/sla/leads/:id/escalate` |
| S3 | FR-VIEW-001b | Slot conflict + availability | `viewing-slot.util.ts`, `GET /viewings/availability` |
| S3 | FR-DP-004 | Deal dispute workflow | `deal-dispute.service.ts`, `GET/POST /disputes` |
| S3 | FR-DP-002b | Cooling-off nightly job | `deal-protection.job.ts` |

Migration: `1758050000000-P0Beachhead.ts`. Chưa ship: map SDK thật (FR-SRCH-007), KPI pack đầy đủ §16, ZNS prod.

---

## 5. Wave P0 — 6 tuần, 3 sprint (chi tiết công việc)

Mỗi sprint: 2 tuần · kế hoạch thứ Hai · demo thứ Sáu tuần 2 · freeze KPI trên beachhead project.

Song song 3 luồng: **Website search** (BE1+FE) · **CRM Lead OS** (BE2+FE) · **Identity/notify** (BE2 xen kẽ).

---

### Sprint P0-S1 · 29/09–10/10/2026 — Sự thật search + sự kiện + routing sống sót restart

**Mục tiêu sprint:** Tab Mua/Thuê không còn “lọc giả”; restart API không mất rule; mọi contact có event.

#### WP-S1-01 · FR-SRCH-006 `transactionType` trên index

| | |
|---|---|
| Owner | BE1 |
| Code | `search-index.service.ts`, `search-doc.mapper.ts`, `SearchIndexDocEntity`, `SearchUnitsQuery`, `SearchPage.tsx`, `HomeSearchDock.tsx` |
| Việc | Thêm `transactionType: sale \| rent \| project` vào document index; backfill 100% listing PUBLISHED; API `GET /search/units?transactionType=`; tab UI lọc server-side |
| AC | Tab Thuê không trả căn `sale`. Missing type → `INTENT_INDEX_MISS` trên job index, không im lặng |
| Test | Unit mapper + e2e 3 tab; script đếm `% listing có type = 100%` |
| Rủi ro | Listing cũ không có loại GD → mặc định `sale` + cờ review ops |

#### WP-S1-02 · FR-SRCH-008 sort + zero-result

| | |
|---|---|
| Owner | BE1 + FE |
| Việc | Sort `relevance \| newest \| price \| area \| verified_first`; zero-result trả gợi ý nới filter (bỏ PN, nới giá) |
| AC | Zero-result rate đo được (event `search_submitted` + `result_count=0`); UI recovery không trang trắng |
| Test | Fixture 0 hit / 1 hit verified / nhiều hit |

#### WP-S1-03 · FR-SRCH-009 freshness

| | |
|---|---|
| Owner | BE1 + Ops |
| Việc | Field public `updatedAt`; job pause listing stale > N ngày (N tenant config Wave 0) |
| AC | ≥ 95% tin public `updatedAt` ≤ N trên dự án pilot (hoặc bị pause, không hiện SERP) |
| Test | Clock freeze: listing N+1 ngày biến mất khỏi public search |

#### WP-S1-04 · FR-EVT-001 instrumentation

| | |
|---|---|
| Owner | BE1 + FE |
| Việc | Bảng `analytics_event` (tenantId, name, source, consentBasis, session/visitor/user, entity refs, ts). Emit: `search_submitted`, `filter_applied`, `property_viewed`, `unit_viewed`, `saved`, `contact_started`, `lead_created`, `viewing_requested` |
| AC | Mỗi event có tenant + source + consent basis. Không PII thô trong payload (hash phone nếu cần) |
| Test | Contract test payload; FE không fire `lead_created` nếu API dedup |

#### WP-S1-05 · FR-LEAD-003b routing persist

| | |
|---|---|
| Owner | BE2 |
| Code | Thay `CrmRoutingService.rulesByTenant` Map bằng entity `CrmRoutingRuleEntity` (tenant, JSON rules, audit). Giữ API `GET/PATCH /crm/routing-rules` |
| Việc | Schema: projectId, skill tags, maxOpenLeads (workload), enabled. Round-robin HOT đọc DB |
| AC | Restart API, rule còn; audit actor |
| Test | Integration: patch → kill process → get |

**Demo S1:** Tab Thuê trên staging; kill API pod, routing vẫn HOT; Grafana/log đếm `search_submitted`.

---

### Sprint P0-S2 · 13/10–24/10/2026 — Identity, alert thật, SLA phút, map pilot

**Mục tiêu sprint:** Khách login được; agent không bỏ HOT quá 5 phút; map 1 dự án không synthetic.

#### WP-S2-01 · FR-IAM-SEEKER OTP tài khoản

| | |
|---|---|
| Owner | BE2 + FE |
| Code | `identity` + `sms`; pages seeker login; migrate `SavedSearch.visitorId` → `userId` khi OTP thành công |
| Việc | `POST /auth/seeker/otp/request` · `POST /auth/seeker/otp/verify` → JWT role `SEEKER`. Rate limit. Gắn consent |
| AC | Login máy B khôi phục search máy A. Visitor anonymous vẫn lưu được trước OTP |
| Test | OTP sai / hết hạn / replay; merge 2 visitor cùng SĐT |
| Bảo mật | Không log OTP; lock 5 lần; reuse pattern SMS sandbox `123456` chỉ non-prod |

#### WP-S2-02 · FR-SRCH-003b alert worker

| | |
|---|---|
| Owner | BE2 |
| Việc | Worker so khớp listing mới / giảm giá / back-to-market với saved search. Queue ≤ 60s. Quiet hours + frequency cap + opt-out. Kênh: email hoặc SMS sandbox P0; ZNS để P1 |
| AC | ≥ 95% job queued ≤ 60s. Opt-out → `ALERT_OPTED_OUT`, không gửi |
| Test | Golden: 3 search, 1 listing match 2, 1 opt-out |

#### WP-S2-03 · FR-LEAD-008 speed-to-lead

| | |
|---|---|
| Owner | BE2 + FE |
| Code | `crm` SLA: class HOT first-touch **5 phút** giờ hành chính (không thay 48h follow-up WARM). `POST /crm/sla/leads/:id/escalate` **đổi assignee** + notify leader (in-app + SMS sandbox) |
| UI | `/agent` = **Today** theo mockup: KPI 4 phút, hàng HOT countdown, nút Gọi / Escalate |
| AC | Pilot drill ≥ 90% HOT first-touch ≤ 5 phút (staging load). Breach immutable log. Ngoài giờ → `SLA_NOT_APPLICABLE` không tính KPI |
| Test | Clock: T+5m01 escalate auto; calendar nghỉ lễ |

#### WP-S2-04 · FR-SRCH-007 map SDK

| | |
|---|---|
| Owner | BE1 + FE |
| Code | `SearchPage.tsx` split list/map (mockup màn 2); pins từ GR lat/lng (`public-map.util` đã có hướng synthetic — **cấm** synthetic trên pilot). Cluster + search-on-move |
| AC | P95 tiles + pin ≤ 2.5s trên 1 dự án. Public không lộ hold owner |
| Test | Visual + API bbox; fallback list nếu token map fail |
| Rủi ro | Thiếu tọa độ GR → ẩn pin, không bịa toạ độ |

**Demo S2:** OTP seeker; alert sandbox tới SĐT test; Today countdown; map Quận 7 split.

---

### Sprint P0-S3 · 27/10–07/11/2026 — Lịch xem nhà, dispute, cooling-off, UAT

**Mục tiêu sprint:** Hai sàn tranh 1 khách có case; viewing không double-book; UAT beachhead.

#### WP-S3-01 · FR-VIEW-001b slot vs lịch agent

| | |
|---|---|
| Owner | BE2 + FE |
| Code | `ViewingEntity` + calendar agent (bảng `agent_busy_slot` hoặc reuse viewing). Buffer 15–30 phút config. `VIEWING_SLOT_CONFLICT` |
| UI | `/agent/viewings` calendar (mockup màn 7), không chỉ table |
| AC | Không confirm 2 viewing cùng agent cùng slot. Reminder T-2h (sandbox) |
| Test | 2 request trùng → 1 confirm, 1 conflict |

#### WP-S3-02 · FR-DP-004 dispute workflow

| | |
|---|---|
| Owner | BE2 + FE + Legal |
| Việc | Entity `DealDispute`: Open → Evidence → Review → Split / Favor A / Favor B → Appeal → Close. SLA owner = NNHN Ops. PII-safe (sàn kia không thấy tên). Quyết định ghi **commission attribution key** (không tính HH — chỉ khóa để Sales OS đọc sau) |
| UI | Queue trên `/agent/registrations` + màn Ops. Trạng thái Conflict từ mockup |
| AC | 2 sàn cùng SĐT+dự án → case, không lộ PII. Close ≤ 5 ngày làm việc (KPI quy trình, UAT tay) |
| Test | Sequence BA-03 luồng 3 |

#### WP-S3-03 · FR-DP-002b cooling-off + revival

| | |
|---|---|
| Owner | BE2 |
| Việc | Policy versioned theo `projectId`: inactivity → hết bảo vệ; revival rule; ưu tiên first-visit vs first-register **đúng PDF Wave 0** |
| AC | Job nightly; audit mọi thay TTL |
| Test | Frozen clock 30 ngày + inactivity |

#### WP-S3-04 · ABAC org trên registration (BA-04)

| | |
|---|---|
| Owner | BE2 |
| Việc | Mask PII theo org/project membership, không chỉ `registeredBy` |
| Test | 2 agent cùng sàn thấy; agent sàn khác mask |

#### WP-S3-05 · UI CRM Today + KPI pack

| | |
|---|---|
| Owner | FE + QA |
| Việc | Port mockup Today/Registry/Viewings/Pipeline vào `apps/web` (brand hiện có). Trang `/agent/kpi` hoặc block trên Dashboard: 8 KPI mục 16 (số thật, ghi “n/a” nếu chưa đủ mẫu — không fake) |
| AC | UAT 2 sàn trên staging beachhead |

#### WP-S3-06 · UAT Release P0

Kịch bản bắt buộc (QA):

1. Seeker tab Thuê / Mua / map / OTP / lưu search / nhận alert sandbox.  
2. Form PDP trùng SĐT → không hồ sơ 2; event `lead_created` 1 lần.  
3. Viewing request → confirm không trùng slot → outcome bắt buộc.  
4. Sàn A đăng ký Accepted; sàn B Existing Protected (mask); B mở dispute.  
5. HOT lead: không gọi 5 phút → escalate đổi người.  
6. Booking `leadId` → stage `BOOKING`.  
7. Restart API → routing rule còn.

**Cổng P0:** QA pass 7 kịch bản + Legal xác nhận dispute UI PII-safe + KPI dashboard không mock.

---

## 6. Wave P1 — 12 tuần (thắng conversion)

Làm **sau** cổng P0. 6 sprint × 2 tuần. Thứ tự bắt buộc vì phụ thuộc.

| Sprint | Tuần | FR | Việc chính |
|---|---|---|---|
| P1-S1 | 1–2 | FR-PRP-004b, FR-LEAD-005b | UI V0–V4 + disclaimer; qualification bắt buộc trước BOOKING (config dự án) |
| P1-S2 | 3–4 | FR-NOT-001b | ZNS/SMS thật: SLA, viewing reminder, hold expiry; delivery status trên timeline |
| P1-S3 | 5–6 | FR-CNT-001, FR-CNT-004 | CMS khu vực/dự án/FAQ/landing; SEO hierarchy quận/phường từ master, bỏ hardcode 6 quận |
| P1-S4 | 7–8 | FR-DSR-001, FR-DSR-004 | Masterplan → tower → floor → unit polygon public-safe; share link branded + tracking |
| P1-S5 | 9–10 | FR-REV-005, FR-VIEW-002 | Attribution graph UTM/QR/call/partner → booking; Open day RSVP + QR check-in gia hạn protection |
| P1-S6 | 11–12 | FR-VIEW-003b, FR-AI-001 | Checklist bắt buộc COMPLETED + next task; NL search VN → filter, ground inventory, eval 50 câu |

**Cổng P1:** CĐT xem nguồn → booking (không HH nếu policy cấm); SEO index không trang mỏng; ZNS delivery > 90% sandbox/prod; NL search không bịa giá trên eval set.

---

## 7. Wave P2 — Intelligence (không copy FUB)

Chỉ khi P1 ổn định (SLA HOT ≥ 90% 4 tuần liền).

| FR | Việc | Ràng buộc |
|---|---|---|
| FR-MI-002 | Locality insight giá/m² | Mọi narrative có source + ngày |
| FR-LEAD-007b | Health score recency/viewing/budget/SLA | Cấm auto-từ chối lead |
| FR-REV-002 | Gợi ý routing theo partner score + aging tồn kho | Human duyệt trước auto |
| FR-AI-002 | Copilot tóm tắt lead + next action | Outbound human review; template transactional mới được auto |
| FR-BIL-seeker | — | **Không làm** ad marketplace |

---

## 8. Kiến trúc triển khai (ràng buộc kỹ thuật)

```
Public SPA (apps/web)
  Search / PDP / Saved / OTP seeker
        │  X-Tenant-Id
        ▼
API modular monolith (apps/api)
  search     → index + map bbox + freshness
  crm        → leads, viewings, registrations, disputes, SLA, routing
  identity   → seeker OTP JWT
  notify     → alert worker, ZNS/SMS (P1)
  analytics  → events
  booking    → sync lead BOOKING (đã có — không phá)
        │
        ▼
PostgreSQL  Golden Record units · lead registry · policy version
```

**Luật không phá:**

1. Public form, Zalo, Meta, CSV, đăng ký sàn → **cùng** `LeadEntity`.  
2. Không unique cứng SĐT trên DB; merge logic tenant (đã có).  
3. Public không trả hold owner, commission, PII.  
4. AI không được phép trả giá/tồn kho không ground.  
5. Booking commit vẫn gọi `CrmService.syncLeadFromBooking`.

### 8.1 Migration dự kiến P0

| Migration | Nội dung |
|---|---|
| `search_index_docs.transaction_type` | sale/rent/project + backfill |
| `analytics_events` | append-only |
| `crm_routing_rules` | persist JSON + project scope |
| `users.role SEEKER` + otp tables | identity |
| `saved_searches.user_id` | nullable, migrate từ visitor |
| `agent_busy_slots` / viewing exclusion | calendar |
| `deal_disputes` + `deal_dispute_events` | workflow |
| `tenant_policies` | deal protection / SLA calendar / N freshness / qualification |

### 8.2 API mới / đổi P0

```
GET    /search/units?transactionType=&sort=&bbox=
POST   /auth/seeker/otp/request
POST   /auth/seeker/otp/verify
POST   /analytics/events          (hoặc beacon nội bộ từ BFF)
GET    /crm/today                 KPI + queue HOT
POST   /crm/sla/leads/:id/escalate   (đổi assignee — mở rộng)
GET/POST /disputes
PATCH  /disputes/:id/transition
GET    /viewings/availability?agentId=&from=&to=
```

Giữ nguyên contract Release A (`POST /leads`, `/viewings`, `/lead-registrations`, `/saved-searches`, `/bookings`).

---

## 9. UI production — map từ mockup

Nguồn visual: `docs/mockups/nnhn-srs-ui/index.html`.

| Mockup | Route production | Sprint |
|---|---|---|
| 1 Trang chủ dock | Home hiện có — không đụng IA | — |
| 2 Tìm nhà split | `/public/search` + `/mua` | P0-S2 |
| 3 PDP viewing/PDPA | Đã có — bổ sung OTP CTA | P0-S2 |
| 4 Đã lưu | `/public/saved` gắn user | P0-S2 |
| 5 CRM Today | `/agent` thay KPI hiện tại | P0-S2 |
| 6 Đăng ký khách + Conflict | `/agent/registrations` | P0-S3 |
| 7 Lịch xem nhà calendar | `/agent/viewings` | P0-S3 |
| 8 Pipeline 7 cột | `/agent/pipeline` polish | P0-S3 |

Nguyên tắc UI CRM: **Today = ca làm việc**; Leads/Inbox = kho; Pipeline = giai đoạn; Viewing = lịch; Registry = pháp lý mạng bán.

---

## 10. KPI, đo lường, cổng chất lượng

Mọi release website/CRM **bắt buộc** báo các KPI này (SRS §16).

| KPI | Target beachhead | Nguồn đo | Cổng |
|---|---|---|---|
| Search P95 | ≤ 2.0s | APM API `/search` | P0-S1 |
| Map P95 tiles+pin | ≤ 2.5s | FE performance + map | P0-S2 |
| Zero-result rate | ≤ 15% + recovery | `search_submitted` | P0-S1, theo dõi 2 tuần |
| Detail → contact | ≥ 8% session PDP | events | P1 (P0 đo baseline) |
| First-touch HOT P95 | ≤ 5 phút giờ HV | SLA log | P0-S2 drill, P0-S3 UAT |
| Viewing show-up | ≥ 60% confirmed | viewing outcome | P1 (P0 đo) |
| Lead duplicate rate | 0 active dup SĐT | registry query | P0-S3 |
| Conflict open → close | ≤ 5 ngày LV | disputes | P1 vận hành |
| Listing freshness | ≥ 95% trong N ngày | index | P0-S1 |
| Booking có `leadId` | 100% | booking join lead | đã có — regression |

QA không pass P0 nếu first-touch drill < 70% (kể cả khi UI đẹp).

NFR giữ: lead create P95 ≤ 1.5s; viewing create ≤ 1.5s; availability 99.9% (infra hiện tại, không đổi stack P0).

---

## 11. Kiểm thử và môi trường

| Lớp | P0 bắt buộc |
|---|---|
| Unit | Phone, index mapper, SLA clock, dispute transition, OTP |
| Integration | Routing persist, viewing conflict, alert worker, booking sync |
| Contract API | Mã lỗi ổn định (không đổi string) |
| E2E Playwright | 7 kịch bản UAT S3 |
| Load | Search P95 + 200 concurrent search trên listing pilot |
| Privacy | PII mask review Legal |
| Eval AI | Chỉ P1-S6 |

Môi trường: `local` → `staging ngoinhahomnay` (tenant beachhead) → `prod` sau cổng P0. Không feature-flag map synthetic trên prod pilot.

---

## 12. Tổ chức, RACI, phụ thuộc

| Vai trò | Người (điền tên khi kickoff) | Trách nhiệm |
|---|---|---|
| PO/BA | | Backlog FR, BA-01…07, cổng KPI |
| Sales Director | | Beachhead 1 CĐT × 2 sàn |
| Legal | | Policy DP, PII dispute |
| BE1 | | Search, map, events, freshness |
| BE2 | | CRM SLA, routing, identity, dispute, viewing calendar, alerts |
| FE | | Split search, Today, calendar, seeker OTP, mockup port |
| QA | | UAT 7 kịch bản, KPI không fake |
| Ops | | Cron worker, SMS/map keys, N freshness |
| NNHN Ops (sản phẩm) | | Owner dispute SLA |

**Phụ thuộc ngoài code:** SMS OTP, Map SDK billing, ZNS template (P1), chữ ký CĐT.

**Phụ thuộc nội bộ:** Booking module không refactor P0; inventory Golden Record phải có lat/lng trước map prod.

---

## 13. Rủi ro và giảm thiểu

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Chưa ký 2 sàn | Cao | DP vô nghĩa | Cổng Wave 0; nếu trễ → P0 chỉ staging, không prod |
| GR thiếu toạ độ | Trung bình | Map fail | Ẩn pin, không synthetic; ops bổ sung điểm |
| OTP vendor chậm | Trung bình | Trễ S2 | Sandbox SMS nội bộ đã có; prod sau |
| SLA 5 phút không đạt vì agent | Cao | KPI fail | Drill ca; escalate auto; không nới SLA trên giấy |
| Scope creep CMS/AI | Cao | P0 trượt | PO từ chối P1 lọt sprint P0 |
| 1 BE only | Trung bình | 6 tuần không đủ | Kéo P0 8–10 tuần, giữ nguyên FR |
| Tranh chấp legal phức tạp hơn workflow | Trung bình | Dispute v1 thiếu | v1 chỉ 6 trạng thái; adjudication chữ ký tay ngoài hệ thống vẫn ghi Close |

---

## 14. Backlog chi tiết P0 (để đưa tracker)

Ưu tiên trên board: **P0-S1 → S2 → S3**. Không kéo FR P1 vào S1/S2.

1. Search index `transactionType` + backfill + tab UI  
2. Sort verified-first + zero-result recovery  
3. Freshness pause job + `updatedAt` public  
4. `analytics_event` + 8 event names  
5. `crm_routing_rules` persist + test restart  
6. Seeker OTP + migrate saved search  
7. Alert worker + consent/cap/quiet hours  
8. SLA HOT 5 phút + escalate reassign + Today UI  
9. Map SDK split + cluster + search-on-move  
10. Viewing availability + conflict + calendar UI  
11. Dispute entity + UI PII-safe  
12. Cooling-off policy versioned  
13. ABAC org mask registration  
14. KPI dashboard 8 chỉ số  
15. UAT 7 kịch bản + regression booking sync  

P1/P2 giữ nguyên bảng FR SRS §15.2–15.3; tách ticket khi mở wave.

---

## 15. Kickoff checklist (ngày 1)

- [ ] Gán tên RACI mục 12  
- [ ] Tạo epic tracker: Wave0 / P0-S1 / S2 / S3 / P1 / P2  
- [ ] Confirm vendor map + SMS  
- [ ] Branch `feat/demand-os-p0` từ `main`; cấm mix commission  
- [ ] Freeze mockup CRM làm nguồn UI  
- [ ] Hẹn demo S1 (10/10), S2 (24/10), UAT P0 (07/11)  
- [ ] CĐT/sàn: lịch workshop policy ngày Wave 0.3  

---

## 16. Liên kết

| Tài liệu | Vai trò |
|---|---|
| `docs/specs/NNHN-SRS-Website-CRM.md` | Yêu cầu (FR, KPI, cấm scope) |
| `docs/mockups/nnhn-srs-ui/` | UI mục tiêu CRM + search split |
| `apps/api/src/modules/crm/README.md` | API Release A |
| `Tai-lieu-yeu-cau-phan-mem.md` | SRS REOS tổng |

Khi P0 đóng: cập nhật cột “Trạng thái hệ thống” trong SRS §3–4 và acceptance §11 thành **Release B Demand OS**.
