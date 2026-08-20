# Tiêu chí Chấp nhận (Acceptance Criteria) — WEREAL REOS

> **Phiên bản:** 2.0 | **Ngày phát hành:** 28/07/2026
> **Baseline ID:** WEREAL-AC-2026-v2.0
> **Trạng thái:** Draft — chờ QA Lead & PO sign-off
> **Tham chiếu:** `Tai-lieu-yeu-cau-phan-mem.md` (SRS v2.0 — 82 FR, 52 NFR) | `Danh-sach-use-case-user-story.md` (68 US Phase 1)

---

## Mục lục

0. [Kiểm soát tài liệu](#0-kiểm-soat-tai-liieu)
1. [Quy ước và định nghĩa](#1-quy-uoc-va-dinh-nghia)
2. [Tiêu chí FR Phase 1 Must](#2-tieu-chi-fr-phase-1-must)
3. [Bảng Test Case TC-XXX](#3-bang-test-case-tc-xxx)
4. [Given/When/Then — 68 User Story](#4-givenwhenthen--68-user-story)
5. [Tiêu chí NFR (52)](#5-tieu-chi-nfr-52)
6. [Kịch bản UAT UAT-01→15](#6-kich-ban-uat)
7. [Phase Gate P1–P6](#7-phase-gate-p1p6)
8. [Definition of Done](#8-definition-of-done)
9. [Regression R1.0–R5.0](#9-regression-r10r50)
10. [Security OWASP Checklist](#10-security-owasp-checklist)
11. [Performance k6 Benchmarks](#11-performance-k6-benchmarks)
12. [Ma trận truy vết FR→AC→TC→UAT](#12-ma-tran-truy-vet)
13. [Bảng Sign-off](#13-bang-sign-off)
14. [Tiêu chí thắng vận hành](#14-tieu-chi-thang-van-hanh)

---

## 0. Kiểm soát tài liệu

### 0.1 Thông tin phiên bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên tài liệu** | Tiêu chí Chấp nhận — WEREAL REOS |
| **Mã tài liệu** | WEREAL-AC-001 |
| **Phiên bản** | 2.0 |
| **Trạng thái** | Draft — Internal Review |
| **SRS tham chiếu** | WEREAL-SRS-2026-v2.0 |

### 0.2 Lịch sử thay đổi

| Version | Ngày | Mô tả | Author |
|---------|------|-------|--------|
| 1.0 | 28/07/2026 | AC Phase 1 MVP cơ bản | BA/QA |
| **2.0** | **28/07/2026** | **Toàn diện: 82 FR trace, 52 NFR scripts, 85+ TC, 68 US GWT, UAT-15, Phase Gate, OWASP, k6, regression** | **BA/QA Team** |
| **2.1** | **28/07/2026** | **§14 Tiêu chí thắng vận hành (OP-WIN-01→15); liên kết Ke-hoach §13** | **BA/QA Team** |

### 0.3 Phân phối

| Nhóm | Mục đích |
|------|----------|
| QA | Test plan, automation, regression |
| Engineering | Verification implementation |
| PO / Pilot | UAT và sign-off |
| DevOps/Security | NFR gate, pen test |

---

## 1. Quy ước và định nghĩa

### 1.1 Định dạng AC-ID

| Pattern | Mô tả | Ví dụ |
|---------|-------|-------|
| `AC-{MOD}-{FR#}-{SEQ}` | Acceptance Criteria chức năng | AC-GR-01-01 |
| `AC-NFR-{CAT}{##}` | Acceptance Criteria phi chức năng | AC-NFR-P01 |
| `TC-{MOD}-{##}` | Test Case | TC-GR-01 |
| `UAT-{##}` | User Acceptance Test scenario | UAT-01 |

**Module codes:** GR, ID, LS, CRM, BK, PAY, AI, TR, AN, UX, OP

### 1.2 Format Given/When/Then (Gherkin)

```gherkin
GIVEN <precondition — trạng thái hệ thống/dữ liệu>
  AND <precondition bổ sung nếu cần>
WHEN <hành động người dùng hoặc sự kiện hệ thống>
THEN <kết quả mong đợi — có thể đo được>
  AND <kết quả bổ sung>
```

### 1.3 Tiêu chí Pass/Fail

| Kết quả | Điều kiện |
|---------|-----------|
| **PASS** | 100% tiêu chí bắt buộc (Must) đạt; không bug Critical/Open; metric NFR trong ngưỡng |
| **PASS WITH NOTES** | Must pass; Should có workaround documented; High bug có fix plan ≤5 ngày |
| **FAIL** | Bất kỳ Must AC fail; Critical/High bug open; NFR gate fail |
| **BLOCKED** | Không test được do dependency (sandbox, data, env) — ghi rõ blocker |

### 1.4 Mức độ nghiêm trọng Bug (Severity)

| Level | Định nghĩa | Ví dụ WEREAL | Gate impact |
|-------|------------|--------------|-------------|
| **Critical (S0)** | Hệ thống down; mất dữ liệu; double booking; payment duplicate | 2 agent book 1 unit thành công | Block release |
| **High (S1)** | Chức năng Must fail; security breach; ledger không cân | Cross-tenant data leak | Block release |
| **Medium (S2)** | Should fail; workaround exists | Compare UI glitch | Release với plan |
| **Low (S3)** | Cosmetic; minor UX | Typo label | Release |

### 1.5 Priority MoSCoW (tham chiếu SRS §11)

| Priority | Ý nghĩa | Phase 1 gate |
|----------|---------|--------------|
| **M (Must)** | Bắt buộc go-live | 100% AC pass |
| **S (Should)** | Quan trọng, có thể defer 1 sprint | ≥80% pass |
| **C (Could)** | Nice-to-have | Best effort |
| **W (Won't)** | Phase sau | N/A |

---

## 2. Tiêu chí chấp nhận chức năng — Phase 1 Must FR

### 2.1 Module GR — Golden Record & Inventory

#### FR-GR-01: Quản lý Golden Record (Unit gốc)

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-01-01 | Tạo unit với đầy đủ trường bắt buộc (block, tầng, hướng, diện tích, giá, trạng thái) qua UI và API | ≥100 unit tạo thành công trong staging; mỗi unit có unit_id unique | TC-GR-01 | Must |
| AC-GR-01-02 | CRUD unit: update thuộc tính hợp lệ, soft-delete không xóa vật lý | Update reflect trong ≤2s; deleted unit không hiển thị list nhưng query audit được | TC-GR-02 | Must |
| AC-GR-01-03 | Product Graph hierarchy Developer→Project→Building→Unit navigable | Click node filter danh sách unit đúng scope; tree render ≤1s với 500 nodes | TC-GR-03 | Must |

#### FR-GR-02: Versioning giá, tồn kho, policy

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-02-01 | Mỗi thay đổi price tạo UnitVersion append-only | Query lịch sử trả ≥2 version sau 2 lần update; version cũ immutable | TC-GR-04 | Must |
| AC-GR-02-02 | Snapshot tại thời điểm booking lưu price/status/policy | Snapshot query by booking_id trả đúng giá T0; không UPDATE snapshot | TC-GR-05 | Must |
| AC-GR-02-03 | Version record ghi actor_id, timestamp, reason | 100% version có created_by và created_at; audit log khớp | TC-GR-06 | Must |

#### FR-GR-03: Listing marketing từ unit gốc

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-03-01 | Form listing hiển thị price read-only từ Golden Record | Agent không edit được price field UI; API agent update price trả 403 | TC-GR-07 | Must |
| AC-GR-03-02 | Listing tạo từ unit gốc lưu trạng thái Draft | listing.unit_id reference hợp lệ; status=Draft sau create | TC-GR-08 | Must |
| AC-GR-03-03 | Agent chỉ nhập marketing description và media | Payload listing không chứa price override; server reject nếu có | TC-GR-09 | Must |

#### FR-GR-04: Anti-drift auto-block/flag

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-04-01 | Submit listing claim status/price khác GR → block + message lỗi | 100% drift cases blocked; message hiển thị giá/trạng thái đúng từ GR | TC-GR-10 | Must |
| AC-GR-04-02 | Anti-drift chạy server-side trước submit/publish | Client bypass không thể publish listing drift; API validation bắt buộc | TC-GR-11 | Must |
| AC-GR-04-03 | Listing pass anti-drift được flag verified internally | Internal flag=true khi price+status khớp GR ±0 tolerance | TC-GR-12 | Must |

#### FR-GR-05: Verified Listing badge

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-05-01 | Listing Published pass anti-drift hiển thị badge Verified trên Public Portal | Badge visible cạnh giá; tooltip giải thích nghĩa Verified | TC-GR-13 | Must |
| AC-GR-05-02 | Listing drift hoặc chưa verify không hiển thị badge | 0% listing drift có badge Verified | TC-GR-14 | Must |

#### FR-GR-08: Real-time push trạng thái unit

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-GR-08-01 | SSE push unit status change tới Agent/Public trong ≤5s | Synthetic status change → UI update ≤5s P95; metric NFR-P04 pass | TC-GR-15 | Must |
| AC-GR-08-02 | 100 concurrent book cùng unit → đúng 1 success, 99 fail gracefully | 0 double booking /1000 attempts; loser nhận 'Unit no longer available' | TC-GR-16 | Must |
| AC-GR-08-03 | Audit log ghi mọi lock attempt (success và fail) | 100% concurrent attempts có audit entry với actor và timestamp | TC-GR-17 | Must |

### 2.2 Module ID — Identity & Tenant

#### FR-ID-01: Multi-tenant hierarchy

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-ID-01-01 | Tạo Developer + Agency tenant với hierarchy Platform→Dev→Agency→User | Tenant slug unique; type đúng; admin invite email gửi ≤5 phút | TC-ID-01 | Must |
| AC-ID-01-02 | Agency tenant link optional tới Developer projects | Agency chỉ thấy project được authorize; cross-link audit logged | TC-ID-02 | Must |
| AC-ID-01-03 | Tenant suspend block new booking, không cancel booking active | Suspend → new booking 403; existing booking viewable | TC-ID-03 | Must |

#### FR-ID-02: RBAC và ABAC

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-ID-02-01 | Agent role không thấy data project không được phân quyền | Query project B với scope=[A] → 403 hoặc empty; 100% test cases | TC-ID-04 | Must |
| AC-ID-02-02 | Agency Admin quản lý user invite/deactivate trong tenant | Deactivate user → login fail; sessions revoked ≤30s | TC-ID-05 | Must |
| AC-ID-02-03 | Role matrix enforce trên UI và API đồng nhất | UI hidden action = API 403; không bypass qua direct API call | TC-ID-06 | Must |

#### FR-ID-03: Tenant isolation RLS

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-ID-03-01 | Cross-tenant API call trả 403 Forbidden | Token tenant A access tenant B resource → 403; pen test pass | TC-ID-07 | Must |
| AC-ID-03-02 | PostgreSQL RLS: session tenant A không SELECT row tenant B | Direct DB query → 0 rows; RLS test suite 100% pass | TC-ID-08 | Must |
| AC-ID-03-03 | Missing tenant context → 401 Unauthorized | API request không có tenant header/context → 401 | TC-ID-09 | Must |

#### FR-ID-04: MFA/OTP nhạy cảm

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-ID-04-01 | Payment action yêu cầu OTP; fail 3 lần lock 15 phút | OTP required 100% payment flows; lock after 3 fails verified | TC-ID-10 | Must |
| AC-ID-04-02 | JWT login TTL 15m + refresh token rotation | Login → JWT issued; logout revokes token; refresh works | TC-ID-11 | Must |
| AC-ID-04-03 | Admin sensitive action yêu cầu MFA | Tenant suspend, payout approve require MFA; auth log audit | TC-ID-12 | Must |

### 2.3 Module LS — Listing, Search & Public Portal

#### FR-LS-01: CRUD listing + approval

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-LS-01-01 | Workflow Draft→Pending→Published/Rejected với email notify agent | State transitions valid only; reject notify ≤5 phút | TC-LS-01 | Must |
| AC-LS-01-02 | Ops moderation queue sorted by SLA; side-by-side GR view | Queue load ≤2s; GR comparison visible | TC-LS-02 | Must |
| AC-LS-01-03 | Published listing indexed search trong ≤5s | Approve → searchable ≤5s CDC lag | TC-LS-03 | Must |

#### FR-LS-02: Full-text + facet + geo search

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-LS-02-01 | Search keyword + facet (price, area, type) + geo radius | Results match criteria; facets update count realtime | TC-LS-04 | Must |
| AC-LS-02-02 | Search P95 ≤200ms với 10,000 indexed documents | k6 search benchmark pass NFR-P03 | TC-LS-05 | Must |
| AC-LS-02-03 | Full-text ranking relevant cho query tiếng Việt | Top 5 results relevance score ≥80% manual eval n=20 | TC-LS-06 | Must |

#### FR-LS-03: Media upload listing

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-LS-03-01 | Upload ảnh/video lên S3; thumbnail auto-generated | 5 images upload success; URLs attached; thumbnail ≤500KB | TC-LS-07 | Must |
| AC-LS-03-02 | Media upload P95 ≤800ms @ 50 concurrent (NFR-P02) | Load test write pass | TC-LS-08 | Must |
| AC-LS-03-03 | Invalid file type/size rejected với message rõ ràng | Reject .exe, >10MB; message tiếng Việt | TC-LS-09 | Must |

#### FR-LS-04: So sánh sản phẩm

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-LS-04-01 | Compare 2–3 unit hiển thị bảng so sánh thuộc tính | Attribute table visible; diff highlighted | TC-LS-10 | Must |
| AC-LS-04-02 | Compare panel accessible từ search results ≤2 click | UX path ≤2 click from result card | TC-LS-11 | Must |

#### FR-LS-06: Search sync CDC

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-LS-06-01 | Unit sold/reserved trên GR → search không trả available ≤5s | CDC lag ≤5s P95; synthetic probe pass | TC-LS-12 | Must |
| AC-LS-06-02 | Outbox pattern đảm bảo at-least-once delivery tới OpenSearch | 0 lost events trong chaos test 1000 events | TC-LS-13 | Must |
| AC-LS-06-03 | Reconciliation job detect và fix index drift | Injected drift fixed trong ≤15 phút job cycle | TC-LS-14 | Must |

### 2.4 Module CRM — CRM & Lead Management

#### FR-CRM-01: Lead capture đa nguồn

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-CRM-01-01 | Lead form portal tạo lead gắn unit, listing, UTM campaign | POST /leads → 201 + lead_id; UTM fields persisted | TC-CRM-01 | Must |
| AC-CRM-01-02 | Lead submission ≤3 click từ detail page (NFR-U03) | Usability test n=8 pass; analytics confirm ≤3 click median | TC-CRM-02 | Must |
| AC-CRM-01-03 | Consent checkbox bắt buộc trước submit (NFR-C03) | Submit without consent blocked; consent logged DB | TC-CRM-03 | Must |

#### FR-CRM-02: Lead gắn entity

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-CRM-02-01 | Lead reference unit_id, listing_id, project_id hợp lệ | 100% leads có ít nhất project_id; orphan lead = 0 | TC-CRM-04 | Must |
| AC-CRM-02-02 | Campaign attribution fields captured (source, medium, campaign) | UTM params stored; queryable by campaign | TC-CRM-05 | Must |

#### FR-CRM-03: Lead routing

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-CRM-03-01 | Rule routing: lead project A → agent pool A; round-robin trong pool | 10 leads project A → distributed round-robin; audit rule version | TC-CRM-06 | Must |
| AC-CRM-03-02 | Hot lead (score≥80) ưu tiên senior pool nếu configured | Hot lead assign senior agent ≥90% when pool configured | TC-CRM-07 | Must |
| AC-CRM-03-03 | Admin assign/reassign lead; notify agent ≤1 phút | Reassign → owner updated; email within 1 min | TC-CRM-08 | Must |

#### FR-CRM-04: CRM activities timeline

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-CRM-04-01 | Activity call/meeting/note hiển thị timeline chronological | Sorted desc; filter by type; immutable after create | TC-CRM-09 | Must |
| AC-CRM-04-02 | Timeline unified — một nguồn sự thật cho mọi activity | No duplicate entries; all channels in one timeline | TC-CRM-10 | Must |

#### FR-CRM-05: Pipeline + state machine

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-CRM-05-01 | Pipeline kanban view với drag-drop update stage | Drag-drop → stage updated; invalid transition rejected | TC-CRM-11 | Must |
| AC-CRM-05-02 | Lead stage sync với booking state machine | Booking Deposited → lead stage auto-update; audit logged | TC-CRM-12 | Must |
| AC-CRM-05-03 | Agent dashboard hot leads sorted by score | Hot leads top of list; refresh ≤5s after new lead | TC-CRM-13 | Must |

### 2.5 Module BK — Booking & Transaction

#### FR-BK-01: Reservation với expiry

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-BK-01-01 | Booking có expiry configurable (default 24–72h); job auto-expire | Past expiry unpaid → Expired; unit released available | TC-BK-01 | Must |
| AC-BK-01-02 | Expiry job chạy reliable; không miss booking | 100% expired bookings processed trong ±5 phút window | TC-BK-02 | Must |
| AC-BK-01-03 | Extend expiry 1 lần trước timeout (nếu policy allow) | Extend → new expiry_at; audit logged | TC-BK-03 | Must |

#### FR-BK-02: Atomic inventory lock

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-BK-02-01 | Redis distributed lock + DB optimistic; 0 double booking | 1000 concurrent → 0 double book (NFR-P08) | TC-BK-04 | Must |
| AC-BK-02-02 | Lock fail trả lỗi graceful 'Unit no longer available' | 99 losers get clear error; no 500 errors | TC-BK-05 | Must |

#### FR-BK-03: Transaction state machine 15 states

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-BK-03-01 | Mọi valid transition pass; invalid transition reject + audit | State machine integration test 100% valid pass | TC-BK-06 | Must |
| AC-BK-03-02 | Buyer view limited PII; Agent/Developer view theo scope | Buyer chỉ xem own booking; unauthorized → 403 | TC-BK-07 | Must |
| AC-BK-03-03 | Payment success → booking Deposited; notify agent | Webhook → state update ≤30s; agent notified | TC-BK-08 | Must |

#### FR-BK-04: Domain events event store

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-BK-04-01 | Event store append-only; query full chronological timeline | No UPDATE/DELETE on events; query by booking_id complete | TC-BK-09 | Must |
| AC-BK-04-02 | Mỗi event: timestamp, actor, payload hash | 100% events có required fields | TC-BK-10 | Must |
| AC-BK-04-03 | Events: BookingCreated, PaymentConfirmed, BookingCancelled, etc. | Lifecycle emits ≥8 event types verified | TC-BK-11 | Must |

#### FR-BK-07: Cancel/refund workflow

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-BK-07-01 | Cancel booking → refund initiated → ledger reversal → unit available | End-to-end cancel flow pass integration test | TC-BK-12 | Must |
| AC-BK-07-02 | Cancel reason bắt buộc; audit mandatory | Cancel without reason blocked; audit entry created | TC-BK-13 | Must |
| AC-BK-07-03 | Refund amount theo policy snapshot; không vượt original payment | Refund ≤ deposit paid; ledger balanced | TC-BK-14 | Must |

### 2.6 Module PAY — Payment & Finance

#### FR-PAY-01: Payment orchestration

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-PAY-01-01 | Tạo PaymentIntent và redirect/checkout gateway thành công | Sandbox payment complete; redirect works | TC-PAY-01 | Must |
| AC-PAY-01-02 | Payment page hiển thị amount, unit, booking ref rõ ràng | All fields visible; gateway options shown | TC-PAY-02 | Must |

#### FR-PAY-02: PaymentIntent Invoice Receipt Refund

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-PAY-02-01 | PaymentIntent create per booking; amount match | intent_id linked; amount = booking deposit | TC-PAY-03 | Must |
| AC-PAY-02-02 | Refund record created on cancel; status tracked | Refund PaymentIntent status transitions logged | TC-PAY-04 | Must |

#### FR-PAY-03: Double-entry ledger

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-PAY-03-01 | Mọi payment success có debit/credit entries cân bằng | debit=credit for 100% transactions; audit trail | TC-PAY-05 | Must |
| AC-PAY-03-02 | Ledger entries immutable; no UPDATE/DELETE | DB policy enforce append-only | TC-PAY-06 | Must |

#### FR-PAY-04: Webhook idempotent reconciliation

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-PAY-04-01 | Duplicate webhook same idempotency key → single ledger entry | Replay 10x → 1 entry; NFR-P07 ≤2s processing | TC-PAY-07 | Must |
| AC-PAY-04-02 | Daily reconciliation 100% match gateway vs ledger | 7 ngày liên tiếp staging 100% match; report 06:00 ICT | TC-PAY-08 | Must |
| AC-PAY-04-03 | Mismatch flagged; Finance alert within 15 phút | Inject mismatch → alert fired; runbook followed | TC-PAY-09 | Must |

#### FR-PAY-05: Deposit payment gắn booking

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-PAY-05-01 | Payment success → booking Deposited; unit reserved confirmed | Webhook handler ≤30s; GR unit=reserved | TC-PAY-10 | Must |
| AC-PAY-05-02 | Payment fail → booking giữ Deposit Pending until expiry | Failed payment no state change; unit lock until expiry | TC-PAY-11 | Must |

### 2.7 Module AI — AI Layer

#### FR-AI-01: Content copilot listing

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-AI-01-01 | Copilot generate listing description tiếng Việt ≤10s P95 | NFR-P05 ≤8s; 95% requests ≤10s | TC-AI-01 | Must |
| AC-AI-01-02 | AI Gateway centralize LLM calls với auth | All copilot calls routed via gateway; unauthorized blocked | TC-AI-02 | Must |
| AC-AI-01-03 | Draft hiển thị panel Pending Approval | Content not auto-fill listing without approve | TC-AI-03 | Must |

#### FR-AI-02: Lead scoring tự động

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-AI-02-01 | Lead scored ≤3s sau LeadCaptured (NFR-P06) | Event timestamp delta ≤3s P95 | TC-AI-04 | Must |
| AC-AI-02-02 | Score 0–100 + label hot/warm/cold visible on CRM | Score visible ≤2s on agent open lead | TC-AI-05 | Must |
| AC-AI-02-03 | Scoring correlation ≥70% vs manual labels on test set | Eval pipeline pass threshold | TC-AI-06 | Must |

#### FR-AI-03: Guardrails no mutate

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-AI-03-01 | Prompt injection 'sửa giá' → guardrail block + log violation | 100% mutate attempts blocked in test suite | TC-AI-07 | Must |
| AC-AI-03-02 | AI không có API permission mutate price/inventory/booking | Whitelist read-only; integration test verify | TC-AI-08 | Must |

#### FR-AI-04: Human approval AI content

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-AI-04-01 | AI content không publish without agent Approve & Use | Without approve → not in listing; with approve → copied | TC-AI-09 | Must |
| AC-AI-04-02 | Approve flow UI rõ ràng; disclaimer pháp lý hiển thị (NFR-C04) | Disclaimer visible on AI panel; legal sign-off | TC-AI-10 | Must |

### 2.8 Module TR — Trust & Compliance

#### FR-TR-01: Audit trail toàn hệ thống

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-TR-01-01 | Mọi update/delete có audit: user, timestamp, old/new value | 100% CRUD on GR/listing/booking audited | TC-TR-01 | Must |
| AC-TR-01-02 | Audit viewer filter tenant, user, entity, date range | Filter returns correct subset ≤2s | TC-TR-02 | Must |
| AC-TR-01-03 | Audit log append-only; retention ≥5 năm (NFR-S03) | No UPDATE/DELETE UI/API; retention config verified | TC-TR-03 | Must |

#### FR-TR-05: AI action log

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-TR-05-01 | Mọi AI call log: tenant, user, prompt_hash, cost, latency | 100% AI calls logged; queryable in audit viewer | TC-TR-04 | Must |
| AC-TR-05-02 | AI log PII redacted; retention 2 năm | No raw PII in AIActionLog; retention job verified | TC-TR-05 | Must |

### 2.9 Module AN — Analytics & Intelligence

#### FR-AN-01: KPI dashboard funnel lead booking

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-AN-01-01 | Dashboard hiển thị leads→bookings→deposited funnel 7/30 ngày | Charts render ≤3s; data as-of timestamp shown | TC-AN-01 | Must |
| AC-AN-01-02 | Agency chỉ xem tenant data; Platform xem aggregated | Cross-tenant dashboard blocked for Agency Admin | TC-AN-02 | Must |
| AC-AN-01-03 | Inventory summary report: available/reserved/sold counts | Counts match GR realtime ±CDC lag | TC-AN-03 | Must |

### 2.10 Module UX — Experience Layer

#### FR-UX-01: Public Portal

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-UX-01-01 | Public portal: search, detail, lead form, compare functional | Smoke test all public flows pass | TC-UX-01 | Must |
| AC-UX-01-02 | 100% UI tiếng Việt Phase 1 (NFR-U01) | UX review checklist 100% Vietnamese | TC-UX-02 | Must |
| AC-UX-01-03 | Responsive viewport ≥320px functional (NFR-U04) | 375px, 320px test pass | TC-UX-03 | Must |

#### FR-UX-02: Agent Portal

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-UX-02-01 | Agent portal: listing CRUD, CRM, booking, AI copilot in one place | No switch system for core flows | TC-UX-04 | Must |
| AC-UX-02-02 | Agent tạo listing median ≤5 phút with AI copilot (NFR-U02) | UAT timing study n≥5 agents pass | TC-UX-05 | Must |

#### FR-UX-03: Admin Portal

| AC-ID | Tiêu chí chấp nhận | Điều kiện đo lường | TC | Severity |
|-------|-------------------|-------------------|-----|----------|
| AC-UX-03-01 | Admin tạo/suspend tenant; moderation queue; system health | All admin flows functional; audit logged | TC-UX-06 | Must |
| AC-UX-03-02 | Ops config approval rules apply to moderation queue | Rule update → queue behavior changes immediately | TC-UX-07 | Must |

---

## 3. Bảng Test Case chi tiết (TC-XXX)

> **Tổng:** 85 test cases | **Automation target Phase 1:** ≥60% TC automated

| TC-ID | Tên Test Case | Module | FR | AC liên kết | Loại | Priority | Automation |
|-------|---------------|--------|-----|-------------|------|----------|------------|
| TC-GR-01 | Tạo unit với đầy đủ trường bắt buộc (block, tầng, hướng, diệ... | GR | FR-GR-01 | AC-GR-01-01 | Functional | Must | Yes |
| TC-GR-02 | CRUD unit: update thuộc tính hợp lệ, soft-delete không xóa v... | GR | FR-GR-01 | AC-GR-01-02 | Functional | Must | Yes |
| TC-GR-03 | Product Graph hierarchy Developer→Project→Building→Unit navi... | GR | FR-GR-01 | AC-GR-01-03 | Functional | Must | Yes |
| TC-GR-04 | Mỗi thay đổi price tạo UnitVersion append-only | GR | FR-GR-02 | AC-GR-02-01 | Functional | Must | Yes |
| TC-GR-05 | Snapshot tại thời điểm booking lưu price/status/policy | GR | FR-GR-02 | AC-GR-02-02 | Functional | Must | Yes |
| TC-GR-06 | Version record ghi actor_id, timestamp, reason | GR | FR-GR-02 | AC-GR-02-03 | Functional | Must | Yes |
| TC-GR-07 | Form listing hiển thị price read-only từ Golden Record | GR | FR-GR-03 | AC-GR-03-01 | Functional | Must | Yes |
| TC-GR-08 | Listing tạo từ unit gốc lưu trạng thái Draft | GR | FR-GR-03 | AC-GR-03-02 | Functional | Must | Yes |
| TC-GR-09 | Agent chỉ nhập marketing description và media | GR | FR-GR-03 | AC-GR-03-03 | Functional | Must | Yes |
| TC-GR-10 | Submit listing claim status/price khác GR → block + message ... | GR | FR-GR-04 | AC-GR-04-01 | Functional | Must | Yes |
| TC-GR-11 | Anti-drift chạy server-side trước submit/publish | GR | FR-GR-04 | AC-GR-04-02 | Functional | Must | Yes |
| TC-GR-12 | Listing pass anti-drift được flag verified internally | GR | FR-GR-04 | AC-GR-04-03 | Functional | Must | Yes |
| TC-GR-13 | Listing Published pass anti-drift hiển thị badge Verified tr... | GR | FR-GR-05 | AC-GR-05-01 | Functional | Must | Yes |
| TC-GR-14 | Listing drift hoặc chưa verify không hiển thị badge | GR | FR-GR-05 | AC-GR-05-02 | Functional | Must | Yes |
| TC-GR-15 | SSE push unit status change tới Agent/Public trong ≤5s | GR | FR-GR-08 | AC-GR-08-01 | Functional | Must | Yes |
| TC-GR-16 | 100 concurrent book cùng unit → đúng 1 success, 99 fail grac... | GR | FR-GR-08 | AC-GR-08-02 | Load | Must | Yes |
| TC-GR-17 | Audit log ghi mọi lock attempt (success và fail) | GR | FR-GR-08 | AC-GR-08-03 | Functional | Must | Yes |
| TC-ID-01 | Tạo Developer + Agency tenant với hierarchy Platform→Dev→Age... | ID | FR-ID-01 | AC-ID-01-01 | Functional | Must | Yes |
| TC-ID-02 | Agency tenant link optional tới Developer projects | ID | FR-ID-01 | AC-ID-01-02 | Functional | Must | Yes |
| TC-ID-03 | Tenant suspend block new booking, không cancel booking activ... | ID | FR-ID-01 | AC-ID-01-03 | Functional | Must | Yes |
| TC-ID-04 | Agent role không thấy data project không được phân quyền | ID | FR-ID-02 | AC-ID-02-01 | Functional | Must | Yes |
| TC-ID-05 | Agency Admin quản lý user invite/deactivate trong tenant | ID | FR-ID-02 | AC-ID-02-02 | Functional | Must | Yes |
| TC-ID-06 | Role matrix enforce trên UI và API đồng nhất | ID | FR-ID-02 | AC-ID-02-03 | Functional | Must | Yes |
| TC-ID-07 | Cross-tenant API call trả 403 Forbidden | ID | FR-ID-03 | AC-ID-03-01 | Security | Must | Yes |
| TC-ID-08 | PostgreSQL RLS: session tenant A không SELECT row tenant B | ID | FR-ID-03 | AC-ID-03-02 | Functional | Must | Yes |
| TC-ID-09 | Missing tenant context → 401 Unauthorized | ID | FR-ID-03 | AC-ID-03-03 | Functional | Must | Yes |
| TC-ID-10 | Payment action yêu cầu OTP; fail 3 lần lock 15 phút | ID | FR-ID-04 | AC-ID-04-01 | Functional | Must | Yes |
| TC-ID-11 | JWT login TTL 15m + refresh token rotation | ID | FR-ID-04 | AC-ID-04-02 | Functional | Must | Yes |
| TC-ID-12 | Admin sensitive action yêu cầu MFA | ID | FR-ID-04 | AC-ID-04-03 | Functional | Must | Yes |
| TC-LS-01 | Workflow Draft→Pending→Published/Rejected với email notify a... | LS | FR-LS-01 | AC-LS-01-01 | Functional | Must | Yes |
| TC-LS-02 | Ops moderation queue sorted by SLA; side-by-side GR view | LS | FR-LS-01 | AC-LS-01-02 | Functional | Must | Yes |
| TC-LS-03 | Published listing indexed search trong ≤5s | LS | FR-LS-01 | AC-LS-01-03 | Functional | Must | Yes |
| TC-LS-04 | Search keyword + facet (price, area, type) + geo radius | LS | FR-LS-02 | AC-LS-02-01 | Functional | Must | Yes |
| TC-LS-05 | Search P95 ≤200ms với 10,000 indexed documents | LS | FR-LS-02 | AC-LS-02-02 | Functional | Must | Yes |
| TC-LS-06 | Full-text ranking relevant cho query tiếng Việt | LS | FR-LS-02 | AC-LS-02-03 | Functional | Must | Yes |
| TC-LS-07 | Upload ảnh/video lên S3; thumbnail auto-generated | LS | FR-LS-03 | AC-LS-03-01 | Load | Must | Yes |
| TC-LS-08 | Media upload P95 ≤800ms @ 50 concurrent (NFR-P02) | LS | FR-LS-03 | AC-LS-03-02 | Load | Must | Yes |
| TC-LS-09 | Invalid file type/size rejected với message rõ ràng | LS | FR-LS-03 | AC-LS-03-03 | Functional | Must | Yes |
| TC-LS-10 | Compare 2–3 unit hiển thị bảng so sánh thuộc tính | LS | FR-LS-04 | AC-LS-04-01 | Functional | Must | Yes |
| TC-LS-11 | Compare panel accessible từ search results ≤2 click | LS | FR-LS-04 | AC-LS-04-02 | Functional | Must | Yes |
| TC-LS-12 | Unit sold/reserved trên GR → search không trả available ≤5s | LS | FR-LS-06 | AC-LS-06-01 | Functional | Must | Yes |
| TC-LS-13 | Outbox pattern đảm bảo at-least-once delivery tới OpenSearch | LS | FR-LS-06 | AC-LS-06-02 | Functional | Must | Yes |
| TC-LS-14 | Reconciliation job detect và fix index drift | LS | FR-LS-06 | AC-LS-06-03 | Functional | Must | Yes |
| TC-CRM-01 | Lead form portal tạo lead gắn unit, listing, UTM campaign | CRM | FR-CRM-01 | AC-CRM-01-01 | Functional | Must | Yes |
| TC-CRM-02 | Lead submission ≤3 click từ detail page (NFR-U03) | CRM | FR-CRM-01 | AC-CRM-01-02 | Functional | Must | Yes |
| TC-CRM-03 | Consent checkbox bắt buộc trước submit (NFR-C03) | CRM | FR-CRM-01 | AC-CRM-01-03 | Functional | Must | Yes |
| TC-CRM-04 | Lead reference unit_id, listing_id, project_id hợp lệ | CRM | FR-CRM-02 | AC-CRM-02-01 | Functional | Must | Yes |
| TC-CRM-05 | Campaign attribution fields captured (source, medium, campai... | CRM | FR-CRM-02 | AC-CRM-02-02 | Functional | Must | Yes |
| TC-CRM-06 | Rule routing: lead project A → agent pool A; round-robin tro... | CRM | FR-CRM-03 | AC-CRM-03-01 | Functional | Must | Yes |
| TC-CRM-07 | Hot lead (score≥80) ưu tiên senior pool nếu configured | CRM | FR-CRM-03 | AC-CRM-03-02 | Functional | Must | Yes |
| TC-CRM-08 | Admin assign/reassign lead; notify agent ≤1 phút | CRM | FR-CRM-03 | AC-CRM-03-03 | Functional | Must | Yes |
| TC-CRM-09 | Activity call/meeting/note hiển thị timeline chronological | CRM | FR-CRM-04 | AC-CRM-04-01 | Functional | Must | Yes |
| TC-CRM-10 | Timeline unified — một nguồn sự thật cho mọi activity | CRM | FR-CRM-04 | AC-CRM-04-02 | Functional | Must | Yes |
| TC-CRM-11 | Pipeline kanban view với drag-drop update stage | CRM | FR-CRM-05 | AC-CRM-05-01 | Functional | Must | Yes |
| TC-CRM-12 | Lead stage sync với booking state machine | CRM | FR-CRM-05 | AC-CRM-05-02 | Functional | Must | Yes |
| TC-CRM-13 | Agent dashboard hot leads sorted by score | CRM | FR-CRM-05 | AC-CRM-05-03 | Functional | Must | Yes |
| TC-BK-01 | Booking có expiry configurable (default 24–72h); job auto-ex... | BK | FR-BK-01 | AC-BK-01-01 | Functional | Must | Yes |
| TC-BK-02 | Expiry job chạy reliable; không miss booking | BK | FR-BK-01 | AC-BK-01-02 | Functional | Must | Yes |
| TC-BK-03 | Extend expiry 1 lần trước timeout (nếu policy allow) | BK | FR-BK-01 | AC-BK-01-03 | Functional | Must | Yes |
| TC-BK-04 | Redis distributed lock + DB optimistic; 0 double booking | BK | FR-BK-02 | AC-BK-02-01 | Functional | Must | Yes |
| TC-BK-05 | Lock fail trả lỗi graceful 'Unit no longer available' | BK | FR-BK-02 | AC-BK-02-02 | Functional | Must | Yes |
| TC-BK-06 | Mọi valid transition pass; invalid transition reject + audit | BK | FR-BK-03 | AC-BK-03-01 | Functional | Must | Yes |
| TC-BK-07 | Buyer view limited PII; Agent/Developer view theo scope | BK | FR-BK-03 | AC-BK-03-02 | Functional | Must | Yes |
| TC-BK-08 | Payment success → booking Deposited; notify agent | BK | FR-BK-03 | AC-BK-03-03 | Functional | Must | Yes |
| TC-BK-09 | Event store append-only; query full chronological timeline | BK | FR-BK-04 | AC-BK-04-01 | Functional | Must | Yes |
| TC-BK-10 | Mỗi event: timestamp, actor, payload hash | BK | FR-BK-04 | AC-BK-04-02 | Load | Must | Yes |
| TC-BK-11 | Events: BookingCreated, PaymentConfirmed, BookingCancelled, ... | BK | FR-BK-04 | AC-BK-04-03 | Functional | Must | Yes |
| TC-BK-12 | Cancel booking → refund initiated → ledger reversal → unit a... | BK | FR-BK-07 | AC-BK-07-01 | Functional | Must | Yes |
| TC-BK-13 | Cancel reason bắt buộc; audit mandatory | BK | FR-BK-07 | AC-BK-07-02 | Functional | Must | Yes |
| TC-BK-14 | Refund amount theo policy snapshot; không vượt original paym... | BK | FR-BK-07 | AC-BK-07-03 | Functional | Must | Yes |
| TC-PAY-01 | Tạo PaymentIntent và redirect/checkout gateway thành công | PAY | FR-PAY-01 | AC-PAY-01-01 | Functional | Must | Yes |
| TC-PAY-02 | Payment page hiển thị amount, unit, booking ref rõ ràng | PAY | FR-PAY-01 | AC-PAY-01-02 | Functional | Must | Yes |
| TC-PAY-03 | PaymentIntent create per booking; amount match | PAY | FR-PAY-02 | AC-PAY-02-01 | Functional | Must | Yes |
| TC-PAY-04 | Refund record created on cancel; status tracked | PAY | FR-PAY-02 | AC-PAY-02-02 | Functional | Must | Yes |
| TC-PAY-05 | Mọi payment success có debit/credit entries cân bằng | PAY | FR-PAY-03 | AC-PAY-03-01 | Functional | Must | Yes |
| TC-PAY-06 | Ledger entries immutable; no UPDATE/DELETE | PAY | FR-PAY-03 | AC-PAY-03-02 | Functional | Must | Yes |
| TC-PAY-07 | Duplicate webhook same idempotency key → single ledger entry | PAY | FR-PAY-04 | AC-PAY-04-01 | Functional | Must | Yes |
| TC-PAY-08 | Daily reconciliation 100% match gateway vs ledger | PAY | FR-PAY-04 | AC-PAY-04-02 | Functional | Must | Yes |
| TC-PAY-09 | Mismatch flagged; Finance alert within 15 phút | PAY | FR-PAY-04 | AC-PAY-04-03 | Functional | Must | Yes |
| TC-PAY-10 | Payment success → booking Deposited; unit reserved confirmed | PAY | FR-PAY-05 | AC-PAY-05-01 | Functional | Must | Yes |
| TC-PAY-11 | Payment fail → booking giữ Deposit Pending until expiry | PAY | FR-PAY-05 | AC-PAY-05-02 | Functional | Must | Yes |
| TC-AI-01 | Copilot generate listing description tiếng Việt ≤10s P95 | AI | FR-AI-01 | AC-AI-01-01 | Functional | Must | Yes |
| TC-AI-02 | AI Gateway centralize LLM calls với auth | AI | FR-AI-01 | AC-AI-01-02 | Functional | Must | Yes |
| TC-AI-03 | Draft hiển thị panel Pending Approval | AI | FR-AI-01 | AC-AI-01-03 | Functional | Must | Yes |
| TC-AI-04 | Lead scored ≤3s sau LeadCaptured (NFR-P06) | AI | FR-AI-02 | AC-AI-02-01 | Functional | Must | Yes |
| TC-AI-05 | Score 0–100 + label hot/warm/cold visible on CRM | AI | FR-AI-02 | AC-AI-02-02 | Functional | Must | Yes |
| TC-AI-06 | Scoring correlation ≥70% vs manual labels on test set | AI | FR-AI-02 | AC-AI-02-03 | Functional | Must | Yes |
| TC-AI-07 | Prompt injection 'sửa giá' → guardrail block + log violation | AI | FR-AI-03 | AC-AI-03-01 | Functional | Must | Yes |
| TC-AI-08 | AI không có API permission mutate price/inventory/booking | AI | FR-AI-03 | AC-AI-03-02 | Functional | Must | Yes |
| TC-AI-09 | AI content không publish without agent Approve & Use | AI | FR-AI-04 | AC-AI-04-01 | Functional | Must | Yes |
| TC-AI-10 | Approve flow UI rõ ràng; disclaimer pháp lý hiển thị (NFR-C0... | AI | FR-AI-04 | AC-AI-04-02 | Functional | Must | Yes |
| TC-TR-01 | Mọi update/delete có audit: user, timestamp, old/new value | TR | FR-TR-01 | AC-TR-01-01 | Functional | Must | Yes |
| TC-TR-02 | Audit viewer filter tenant, user, entity, date range | TR | FR-TR-01 | AC-TR-01-02 | Functional | Must | Yes |
| TC-TR-03 | Audit log append-only; retention ≥5 năm (NFR-S03) | TR | FR-TR-01 | AC-TR-01-03 | Functional | Must | Yes |
| TC-TR-04 | Mọi AI call log: tenant, user, prompt_hash, cost, latency | TR | FR-TR-05 | AC-TR-05-01 | Functional | Must | Yes |
| TC-TR-05 | AI log PII redacted; retention 2 năm | TR | FR-TR-05 | AC-TR-05-02 | Functional | Must | Yes |
| TC-AN-01 | Dashboard hiển thị leads→bookings→deposited funnel 7/30 ngày | AN | FR-AN-01 | AC-AN-01-01 | Functional | Must | Yes |
| TC-AN-02 | Agency chỉ xem tenant data; Platform xem aggregated | AN | FR-AN-01 | AC-AN-01-02 | Functional | Must | Yes |
| TC-AN-03 | Inventory summary report: available/reserved/sold counts | AN | FR-AN-01 | AC-AN-01-03 | Functional | Must | Yes |
| TC-UX-01 | Public portal: search, detail, lead form, compare functional | UX | FR-UX-01 | AC-UX-01-01 | Functional | Must | Yes |
| TC-UX-02 | 100% UI tiếng Việt Phase 1 (NFR-U01) | UX | FR-UX-01 | AC-UX-01-02 | Functional | Must | Yes |
| TC-UX-03 | Responsive viewport ≥320px functional (NFR-U04) | UX | FR-UX-01 | AC-UX-01-03 | Functional | Must | Yes |
| TC-UX-04 | Agent portal: listing CRUD, CRM, booking, AI copilot in one ... | UX | FR-UX-02 | AC-UX-02-01 | Functional | Must | Yes |
| TC-UX-05 | Agent tạo listing median ≤5 phút with AI copilot (NFR-U02) | UX | FR-UX-02 | AC-UX-02-02 | Functional | Must | Yes |
| TC-UX-06 | Admin tạo/suspend tenant; moderation queue; system health | UX | FR-UX-03 | AC-UX-03-01 | Functional | Must | Yes |
| TC-UX-07 | Ops config approval rules apply to moderation queue | UX | FR-UX-03 | AC-UX-03-02 | Functional | Must | Yes |
| TC-CRM-14 | Lead import CSV manual | CRM | FR-CRM-01 | AC-CRM-01-01 | Functional | Should | Yes |
| TC-CRM-15 | Email confirmation lead buyer | CRM | FR-CRM-01 | AC-CRM-01-02 | Integration | Should | Yes |
| TC-BK-15 | Booking extend expiry once | BK | FR-BK-01 | AC-BK-01-03 | Functional | Should | Yes |
| TC-UX-08 | Agent portal navigation smoke | UX | FR-UX-02 | AC-UX-02-01 | Smoke | Must | Yes |
| TC-UX-09 | Admin portal tenant suspend warning | UX | FR-UX-03 | AC-UX-03-01 | Functional | Must | Yes |
| TC-OP-01 | CI/CD pipeline staging deploy | OP | NFR-O04 | AC-NFR-O04 | Ops | Must | Yes |
| TC-OP-02 | OpenAPI contract test | OP | NFR-M02 | AC-NFR-M02 | Contract | Must | Yes |
| TC-OP-03 | Structured logging format lint | OP | NFR-O01 | AC-NFR-O01 | Ops | Must | Yes |
| TC-OP-04 | Feature flag toggle test | OP | NFR-O04 | AC-NFR-O04 | Ops | Must | Yes |
| TC-OP-05 | DR backup restore drill | OP | NFR-A03 | AC-NFR-A03 | DR | Must | Yes |

---

## 4. Given/When/Then — 68 User Story Phase 1

> Tham chiếu: `Danh-sach-use-case-user-story.md` §8

### 4.1 US-GR-01

**User Story:** Là Developer Admin, tôi muốn tạo unit với đầy đủ thuộc tính, để làm nguồn chuẩn bảng hàng.

**FR liên kết:** FR-GR-01

**Scenario 1:**

```gherkin

GIVEN Developer Admin đã đăng nhập và có quyền project X

WHEN tạo unit mới với các trường bắt buộc hợp lệ

THEN unit được lưu status=available; hiển thị trong list; audit log CREATE

```

### 4.2 US-GR-02

**User Story:** Là Developer Admin, tôi muốn mọi thay đổi giá lưu lịch sử version, để truy vết khi tranh chấp.

**FR liên kết:** FR-GR-02

**Scenario 1:**

```gherkin

GIVEN unit U1 price=3.000.000.000

WHEN cập nhật price=3.200.000.000

THEN version mới với timestamp; query lịch sử trả 2 version; version cũ không xóa

```

### 4.3 US-GR-03

**User Story:** Là Developer Admin, tôi muốn thấy trạng thái tồn kho real-time, để kiểm soát inventory chính xác.

**FR liên kết:** FR-GR-08

**Scenario 1:**

```gherkin

GIVEN unit U1 vừa chuyển reserved do booking

WHEN refresh bảng hàng

THEN U1 badge reserved ≤5s; count summary cập nhật đúng

```

### 4.4 US-GR-04

**User Story:** Là Agent, tôi muốn tạo listing từ unit gốc không sửa giá, để tránh sai lệch marketing.

**FR liên kết:** FR-GR-03

**Scenario 1:**

```gherkin

GIVEN Agent có quyền project X; unit U1 available price=3 tỷ

WHEN tạo listing từ U1

THEN price read-only=3 tỷ; chỉ nhập description/media; status=Draft

```

### 4.5 US-GR-05

**User Story:** Là Agent, tôi muốn biết ngay nếu listing lệch bảng gốc, để không publish tin sai.

**FR liên kết:** FR-GR-04

**Scenario 1:**

```gherkin

GIVEN Agent submit listing claim status khác GR

WHEN anti-drift check chạy

THEN submit blocked; message lỗi cụ thể; hiển thị giá/trạng thái đúng GR

```

### 4.6 US-GR-06

**User Story:** Là Buyer, tôi muốn thấy badge Verified khi tin khớp bảng gốc, để tin tưởng thông tin.

**FR liên kết:** FR-GR-05

**Scenario 1:**

```gherkin

GIVEN listing pass anti-drift và Published

WHEN xem listing Public Portal

THEN badge Verified cạnh giá; tooltip giải thích

```

### 4.7 US-GR-07

**User Story:** Là Developer Admin, tôi muốn có snapshot inventory tại thời điểm booking, để bằng chứng tranh chấp.

**FR liên kết:** FR-GR-02

**Scenario 1:**

```gherkin

GIVEN booking B1 tạo cho unit U1

WHEN query snapshot at booking time

THEN trả price/status/policy tại T0; snapshot immutable

```

### 4.8 US-GR-08

**User Story:** Là System, tôi muốn khóa unit atomic khi booking, để 0 double book.

**FR liên kết:** FR-BK-02

**Scenario 1:**

```gherkin

GIVEN unit U1 status=available

WHEN Agent A và B đồng thời tạo booking U1

THEN chỉ 1 success; U1=reserved; thứ 2 lỗi 'Unit no longer available'; audit cả 2 attempt

```

### 4.9 US-GR-09

**User Story:** Là Agent, tôi muốn nhận cập nhật trạng thái unit qua SSE, để phản ứng nhanh.

**FR liên kết:** FR-GR-08

**Scenario 1:**

```gherkin

GIVEN Agent xem bảng hàng project X

WHEN unit U1 đổi available→reserved

THEN UI cập nhật badge ≤5s qua SSE; không cần F5

```

### 4.10 US-GR-10

**User Story:** Là Developer Admin, tôi muốn navigate Product Graph, để hiểu cấu trúc sản phẩm.

**FR liên kết:** FR-GR-01

**Scenario 1:**

```gherkin

GIVEN Product Graph configured

WHEN mở Product Graph view

THEN cây phân cấp đầy đủ; click node filter unit list

```

### 4.11 US-GR-11

**User Story:** Là Developer Admin, tôi muốn import unit đơn lẻ nhanh, để bổ sung căn mới.

**FR liên kết:** FR-GR-01

**Scenario 1:**

```gherkin

GIVEN Developer Admin trên unit list

WHEN click Thêm unit và điền form

THEN unit mới trong list; sync search index

```

### 4.12 US-GR-12

**User Story:** Là Agent, tôi muốn không edit field giá trên listing form, để anti-drift UI level.

**FR liên kết:** FR-GR-03

**Scenario 1:**

```gherkin

GIVEN Agent mở listing form từ unit gốc

WHEN inspect price field

THEN field disabled/read-only; không API update golden price

```

### 4.13 US-GR-13

**User Story:** Là Tech Lead, tôi muốn Golden Record API tenant isolated, để bảo mật multi-tenant.

**FR liên kết:** FR-ID-03

**Scenario 1:**

```gherkin

GIVEN token tenant A

WHEN GET unit tenant B

THEN 403 Forbidden; pen test pass

```

### 4.14 US-ID-01

**User Story:** Là Platform Admin, tôi muốn onboard tenant Developer, để pilot nhập bảng hàng.

**FR liên kết:** FR-ID-01

**Scenario 1:**

```gherkin

GIVEN Platform Admin authenticated

WHEN tạo Developer tenant slug unique

THEN tenant active; admin invite email; RLS applied

```

### 4.15 US-ID-02

**User Story:** Là Platform Admin, tôi muốn onboard tenant Agency, để đại lý tham gia platform.

**FR liên kết:** FR-ID-01

**Scenario 1:**

```gherkin

GIVEN slug Agency chưa tồn tại

WHEN create Agency tenant

THEN type=Agency; link optional Developer projects

```

### 4.16 US-ID-03

**User Story:** Là User, tôi muốn đăng nhập/logout/refresh token an toàn, để truy cập portal liên tục.

**FR liên kết:** FR-ID-04

**Scenario 1:**

```gherkin

GIVEN valid credentials

WHEN login

THEN JWT TTL 15m + refresh cookie; logout revokes token

```

### 4.17 US-ID-04

**User Story:** Là Agency Admin, tôi muốn RBAC enforce Agent không thấy project không phân, để bảo mật dữ liệu.

**FR liên kết:** FR-ID-02

**Scenario 1:**

```gherkin

GIVEN Agent scope=[A]

WHEN query project B data

THEN 403 hoặc empty result

```

### 4.18 US-ID-05

**User Story:** Là Tech Lead, tôi muốn tenant middleware mọi API, để không leak cross-tenant.

**FR liên kết:** FR-ID-03

**Scenario 1:**

```gherkin

GIVEN API request

WHEN missing tenant context

THEN 401; wrong tenant → 403

```

### 4.19 US-ID-06

**User Story:** Là Tech Lead, tôi muốn RLS PostgreSQL verified, để defense in depth.

**FR liên kết:** FR-ID-03

**Scenario 1:**

```gherkin

GIVEN DB session tenant A

WHEN SELECT tenant B row

THEN 0 rows returned

```

### 4.20 US-ID-07

**User Story:** Là Buyer, tôi muốn MFA OTP khi thanh toán, để bảo vệ giao dịch.

**FR liên kết:** FR-ID-04

**Scenario 1:**

```gherkin

GIVEN payment action

WHEN OTP required

THEN SMS/email OTP sent; fail 3x lock 15 min

```

### 4.21 US-ID-08

**User Story:** Là Agency Admin, tôi muốn quản lý user invite/deactivate, để kiểm soát team.

**FR liên kết:** FR-ID-02

**Scenario 1:**

```gherkin

GIVEN admin role

WHEN deactivate user

THEN user cannot login; sessions revoked

```

### 4.22 US-LS-01

**User Story:** Là Buyer, tôi muốn tìm theo khu vực, giá, loại hình, diện tích, để tìm căn nhanh.

**FR liên kết:** FR-LS-02

**Scenario 1:**

```gherkin

GIVEN 50+ published listings

WHEN search filter applied

THEN results match criteria; P95 ≤200ms

```

### 4.23 US-LS-05

**User Story:** Là Tech Lead, tôi muốn OpenSearch index configured, để enable full-text search.

**FR liên kết:** FR-LS-02

**Scenario 1:**

```gherkin

GIVEN index template

WHEN deploy

THEN index wereal-listings exists; mapping matches schema

```

### 4.24 US-LS-06

**User Story:** Là Buyer, tôi muốn full-text + facet search, để lọc chính xác.

**FR liên kết:** FR-LS-02

**Scenario 1:**

```gherkin

GIVEN keyword '2PN Quận 7'

WHEN search

THEN relevant results ranked; facets update count

```

### 4.25 US-LS-07

**User Story:** Là Buyer, tôi muốn geo search radius, để tìm theo vị trí.

**FR liên kết:** FR-LS-02

**Scenario 1:**

```gherkin

GIVEN map center Q7 radius 5km

WHEN geo search

THEN only units in radius returned

```

### 4.26 US-LS-08

**User Story:** Là Buyer, tôi muốn xem trang chi tiết project/unit, để quyết định tư vấn.

**FR liên kết:** FR-UX-01

**Scenario 1:**

```gherkin

GIVEN published listing

WHEN open detail URL

THEN gallery, spec, map, CTA visible; Verified badge if applicable

```

### 4.27 US-LS-09

**User Story:** Là Ops Admin, tôi muốn workflow Draft→Pending→Published/Rejected, để kiểm soát chất lượng tin.

**FR liên kết:** FR-LS-01

**Scenario 1:**

```gherkin

GIVEN listing submitted

WHEN Ops approve

THEN Published + indexed; reject → agent notified

```

### 4.28 US-LS-10

**User Story:** Là Agent, tôi muốn upload media lên S3, để listing hấp dẫn.

**FR liên kết:** FR-LS-03

**Scenario 1:**

```gherkin

GIVEN listing draft

WHEN upload 5 images

THEN URLs attached; thumbnails generated

```

### 4.29 US-LS-11

**User Story:** Là Buyer, tôi muốn so sánh 2-3 căn side-by-side, để quyết định dễ hơn.

**FR liên kết:** FR-LS-04

**Scenario 1:**

```gherkin

GIVEN 2 units in compare

WHEN open compare panel

THEN attribute table; diff highlighted

```

### 4.30 US-LS-12

**User Story:** Là Buyer, tôi muốn lead form detail page ≤3 click, để liên hệ nhanh.

**FR liên kết:** FR-CRM-01

**Scenario 1:**

```gherkin

GIVEN detail page

WHEN register consult flow

THEN ≤3 clicks to confirmation; lead created

```

### 4.31 US-LS-13

**User Story:** Là System, tôi muốn search sync từ inventory events, để search đúng tồn kho.

**FR liên kết:** FR-LS-06

**Scenario 1:**

```gherkin

GIVEN unit sold event

WHEN CDC processed

THEN removed from available search ≤5s

```

### 4.32 US-LS-14

**User Story:** Là Buyer, tôi muốn Public Portal responsive mobile, để trải nghiệm mobile.

**FR liên kết:** FR-UX-01

**Scenario 1:**

```gherkin

GIVEN viewport 375px

WHEN browse portal

THEN layout usable; CTA accessible

```

### 4.33 US-CRM-01

**User Story:** Là Buyer, tôi muốn gửi form tư vấn ≤3 click, để liên hệ nhanh.

**FR liên kết:** FR-CRM-01

**Scenario 1:**

```gherkin

GIVEN detail page

WHEN submit lead form with consent

THEN confirmation page; lead in CRM

```

### 4.34 US-CRM-02

**User Story:** Là Buyer, tôi muốn nhận xác nhận email/SMS, để yên tâm đã gửi.

**FR liên kết:** FR-CRM-01

**Scenario 1:**

```gherkin

GIVEN lead submitted

WHEN confirmation enabled

THEN email/SMS within 1 min

```

### 4.35 US-CRM-03

**User Story:** Là Agency Admin, tôi muốn lead tự phân agent theo dự án, để không lead rơi.

**FR liên kết:** FR-CRM-03

**Scenario 1:**

```gherkin

GIVEN routing rule project A→pool A

WHEN lead project A created

THEN assigned round-robin pool A

```

### 4.36 US-CRM-04

**User Story:** Là Agent, tôi muốn thấy lead scored hot/warm/cold, để ưu tiên gọi đúng.

**FR liên kết:** FR-AI-02

**Scenario 1:**

```gherkin

GIVEN lead created

WHEN agent opens CRM

THEN score visible ≤2s; hot badge if ≥80

```

### 4.37 US-CRM-05

**User Story:** Là Agent, tôi muốn ghi call/meeting/note timeline, để không mất context.

**FR liên kết:** FR-CRM-04

**Scenario 1:**

```gherkin

GIVEN lead detail

WHEN log call activity

THEN appears chronological; immutable

```

### 4.38 US-CRM-07

**User Story:** Là System, tôi muốn Lead capture API public, để tích hợp form portal.

**FR liên kết:** FR-CRM-01

**Scenario 1:**

```gherkin

GIVEN POST /leads valid payload

WHEN API called

THEN 201 + lead_id; UTM captured

```

### 4.39 US-CRM-08

**User Story:** Là System, tôi muốn routing rules engine configurable, để Admin tùy chỉnh.

**FR liên kết:** FR-CRM-03

**Scenario 1:**

```gherkin

GIVEN rule JSON config

WHEN lead matches

THEN correct pool selected; audit rule version

```

### 4.40 US-CRM-09

**User Story:** Là Agent, tôi muốn CRM activity timeline unified, để một nguồn sự thật.

**FR liên kết:** FR-CRM-04

**Scenario 1:**

```gherkin

GIVEN multiple activities

WHEN view timeline

THEN sorted timestamp desc; filter by type

```

### 4.41 US-CRM-10

**User Story:** Là Agent, tôi muốn pipeline kanban view, để visualize funnel.

**FR liên kết:** FR-CRM-05

**Scenario 1:**

```gherkin

GIVEN leads various stages

WHEN open kanban

THEN columns by stage; drag-drop updates

```

### 4.42 US-CRM-11

**User Story:** Là Agent, tôi muốn dashboard hot leads, để focus căn nóng.

**FR liên kết:** FR-AN-01

**Scenario 1:**

```gherkin

GIVEN 10 new leads

WHEN open dashboard

THEN hot leads top sorted by score

```

### 4.43 US-CRM-12

**User Story:** Là Agency Admin, tôi muốn assign/reassign lead, để điều phối linh hoạt.

**FR liên kết:** FR-CRM-03

**Scenario 1:**

```gherkin

GIVEN unassigned lead

WHEN admin assign agent X

THEN owner=X; notify agent

```

### 4.44 US-CRM-13

**User Story:** Là Agent, tôi muốn email notify lead mới, để phản hồi nhanh.

**FR liên kết:** FR-CRM-03

**Scenario 1:**

```gherkin

GIVEN lead assigned

WHEN created

THEN email within 1 min to agent

```

### 4.45 US-CRM-14

**User Story:** Là Agent, tôi muốn quản lý listing Agent Portal, để một cửa làm việc.

**FR liên kết:** FR-UX-02

**Scenario 1:**

```gherkin

GIVEN agent login

WHEN listing CRUD from GR

THEN all flows in agent portal

```

### 4.46 US-CRM-15

**User Story:** Là Agent, tôi muốn tạo booking từ Agent Portal, để không switch hệ thống.

**FR liên kết:** FR-UX-02

**Scenario 1:**

```gherkin

GIVEN unit available

WHEN create booking from portal

THEN booking created + payment link

```

### 4.47 US-BK-01

**User Story:** Là Agent, tôi muốn tạo booking/giữ chỗ với expiry, để giữ căn có thời hạn.

**FR liên kết:** FR-BK-01

**Scenario 1:**

```gherkin

GIVEN unit available

WHEN create booking 48h expiry

THEN Reserved; expiry job scheduled

```

### 4.48 US-BK-02

**User Story:** Là System, tôi muốn atomic lock khi booking, để 0 double book.

**FR liên kết:** FR-BK-02

**Scenario 1:**

```gherkin

GIVEN unit available

WHEN 100 concurrent book

THEN exactly 1 success (covered US-GR-08)

```

### 4.49 US-BK-03

**User Story:** Là Buyer, tôi muốn thanh toán cọc online payment page, để không chuyển khoản thủ công.

**FR liên kết:** FR-PAY-05

**Scenario 1:**

```gherkin

GIVEN booking Deposit Pending

WHEN complete gateway payment

THEN webhook ≤30s; booking Deposited

```

### 4.50 US-BK-04

**User Story:** Là Agent, tôi muốn notify khi khách thanh toán thành công, để follow-up kịp.

**FR liên kết:** FR-BK-03

**Scenario 1:**

```gherkin

GIVEN payment success webhook

WHEN processed

THEN agent in-app + email notify

```

### 4.51 US-BK-05

**User Story:** Là Developer Admin, tôi muốn unit reserved ngay sau cọc, để bảng hàng chính xác.

**FR liên kết:** FR-GR-01

**Scenario 1:**

```gherkin

GIVEN deposit confirmed

WHEN state update

THEN GR unit=reserved; Dev portal reflects

```

### 4.52 US-BK-07

**User Story:** Là Tech Lead, tôi muốn state machine all valid transitions, để workflow nhất quán.

**FR liên kết:** FR-BK-03

**Scenario 1:**

```gherkin

GIVEN state machine spec

WHEN invalid transition attempted

THEN reject + audit; all valid pass

```

### 4.53 US-BK-08

**User Story:** Là Ops Admin, tôi muốn domain event store query, để audit dispute prep.

**FR liên kết:** FR-BK-04

**Scenario 1:**

```gherkin

GIVEN booking lifecycle

WHEN query events

THEN full chronological list; immutable

```

### 4.54 US-BK-09

**User Story:** Là System, tôi muốn booking expiry job auto-release, để không giữ chỗ vô hạn.

**FR liên kết:** FR-BK-01

**Scenario 1:**

```gherkin

GIVEN booking past expiry unpaid

WHEN job runs

THEN Expired; unit available

```

### 4.55 US-BK-10

**User Story:** Là Agent, tôi muốn cancel booking + refund workflow, để xử lý hủy deal.

**FR liên kết:** FR-BK-07

**Scenario 1:**

```gherkin

GIVEN deposited booking

WHEN cancel approved

THEN refund initiated; ledger reversal

```

### 4.56 US-PAY-01

**User Story:** Là Platform Admin, tôi muốn đối soát ledger vs gateway daily 100%, để phát hiện sai lệch sớm.

**FR liên kết:** FR-PAY-04

**Scenario 1:**

```gherkin

GIVEN daily job

WHEN reconciliation runs

THEN 100% match or flagged mismatches

```

### 4.57 US-PAY-02

**User Story:** Là Tech Lead, tôi muốn payment gateway integration, để enable online deposit.

**FR liên kết:** FR-PAY-01

**Scenario 1:**

```gherkin

GIVEN sandbox credentials

WHEN create test payment

THEN redirect works; webhook received

```

### 4.58 US-PAY-03

**User Story:** Là System, tôi muốn PaymentIntent create per booking, để link payment chuẩn.

**FR liên kết:** FR-PAY-02

**Scenario 1:**

```gherkin

GIVEN booking

WHEN create intent

THEN intent_id + amount match booking

```

### 4.59 US-PAY-04

**User Story:** Là System, tôi muốn webhook handler idempotent, để không double charge.

**FR liên kết:** FR-PAY-04

**Scenario 1:**

```gherkin

GIVEN duplicate webhook same key

WHEN process twice

THEN single ledger entry

```

### 4.60 US-PAY-05

**User Story:** Là Finance Admin, tôi muốn double-entry ledger balanced, để kế toán chính xác.

**FR liên kết:** FR-PAY-03

**Scenario 1:**

```gherkin

GIVEN payment success

WHEN ledger write

THEN debit=credit; audit trail

```

### 4.61 US-PAY-06

**User Story:** Là System, tôi muốn daily reconciliation job automated, để giảm manual work.

**FR liên kết:** FR-PAY-04

**Scenario 1:**

```gherkin

GIVEN cron 02:00

WHEN job runs

THEN report emailed to Finance

```

### 4.62 US-PAY-07

**User Story:** Là Buyer, tôi muốn payment page UX rõ ràng, để thanh toán tự tin.

**FR liên kết:** FR-PAY-01

**Scenario 1:**

```gherkin

GIVEN payment link

WHEN open page

THEN amount, unit, booking ref visible; gateway options

```

### 4.63 US-PAY-08

**User Story:** Là System, tôi muốn booking state update on payment, để đồng bộ transaction.

**FR liên kết:** FR-PAY-05

**Scenario 1:**

```gherkin

GIVEN webhook success

WHEN handler runs

THEN booking→Deposited; unit→reserved

```

### 4.64 US-PAY-09

**User Story:** Là QA, tôi muốn concurrent booking test suite, để verify 0 double book.

**FR liên kết:** FR-BK-02

**Scenario 1:**

```gherkin

GIVEN 100 concurrent book same unit

WHEN load test

THEN exactly 1 success

```

### 4.65 US-AI-01

**User Story:** Là Agent, tôi muốn AI draft listing ≤10s, để tiết kiệm thời gian viết tin.

**FR liên kết:** FR-AI-01

**Scenario 1:**

```gherkin

GIVEN listing form

WHEN click AI generate

THEN Vietnamese draft ≤10s

```

### 4.66 US-AI-02

**User Story:** Là Agent, tôi muốn approve AI content trước khi dùng, để kiểm soát chất lượng.

**FR liên kết:** FR-AI-04

**Scenario 1:**

```gherkin

GIVEN AI draft

WHEN without approve

THEN not copied; when approve → usable

```

### 4.67 US-AI-03

**User Story:** Là System, tôi muốn AI guardrails block mutate price/booking, để an toàn nghiệp vụ.

**FR liên kết:** FR-AI-03

**Scenario 1:**

```gherkin

GIVEN prompt injection sửa giá

WHEN AI gateway

THEN block + log violation

```

### 4.68 US-AI-04

**User Story:** Là Agent, tôi muốn lead score on entry, để prioritize outreach.

**FR liên kết:** FR-AI-02

**Scenario 1:**

```gherkin

GIVEN new lead

WHEN CRM loads

THEN score 0-100 visible ≤2s

```

### 4.69 US-AI-05

**User Story:** Là Agency Admin, tôi muốn hot lead route ưu tiên senior, để tăng conversion.

**FR liên kết:** FR-CRM-03

**Scenario 1:**

```gherkin

GIVEN hot lead score≥80

WHEN routing

THEN prefer senior pool if configured

```

### 4.70 US-AI-06

**User Story:** Là Tech Lead, tôi muốn AI Gateway setup, để centralize LLM calls.

**FR liên kết:** FR-AI-01

**Scenario 1:**

```gherkin

GIVEN gateway deployed

WHEN copilot API called

THEN routed via gateway with auth

```

### 4.71 US-AI-07

**User Story:** Là Agent, tôi muốn content copilot API integrated UI, để seamless UX.

**FR liên kết:** FR-AI-01

**Scenario 1:**

```gherkin

GIVEN agent portal listing

WHEN generate

THEN API returns draft to panel

```

### 4.72 US-AI-08

**User Story:** Là Data Team, tôi muốn lead scoring model v1, để accurate prioritization.

**FR liên kết:** FR-AI-02

**Scenario 1:**

```gherkin

GIVEN test set

WHEN evaluate

THEN correlation ≥70% vs manual labels

```

### 4.73 US-AI-09

**User Story:** Là Security, tôi muốn guardrails block mutate operations, để prevent AI harm.

**FR liên kết:** FR-AI-03

**Scenario 1:**

```gherkin

GIVEN mutate attempt via AI

WHEN guardrail check

THEN blocked 100% test cases

```

### 4.74 US-AI-10

**User Story:** Là Ops Admin, tôi muốn AI action audit log, để compliance AI usage.

**FR liên kết:** FR-TR-05

**Scenario 1:**

```gherkin

GIVEN any AI call

WHEN complete

THEN log tenant,user,prompt_hash,cost,latency

```

### 4.75 US-AI-11

**User Story:** Là Agent, tôi muốn human approve AI content UI, để clear approve flow.

**FR liên kết:** FR-AI-04

**Scenario 1:**

```gherkin

GIVEN draft panel

WHEN click Approve & Use

THEN content fills listing fields

```

### 4.76 US-TR-03

**User Story:** Là Ops Admin, tôi muốn audit trail viewer filter, để investigate incidents.

**FR liên kết:** FR-TR-01

**Scenario 1:**

```gherkin

GIVEN audit entries

WHEN filter entity+date

THEN matching logs displayed

```

### 4.77 US-TR-04

**User Story:** Là Ops Admin, tôi muốn listing moderation queue, để efficient review.

**FR liên kết:** FR-LS-01

**Scenario 1:**

```gherkin

GIVEN pending listings

WHEN open queue

THEN sorted by SLA; side-by-side GR view

```

### 4.78 US-AN-03

**User Story:** Là Agency Admin, tôi muốn KPI funnel dashboard 7/30 ngày, để theo dõi performance.

**FR liên kết:** FR-AN-01

**Scenario 1:**

```gherkin

GIVEN dashboard

WHEN select 30 days

THEN leads→bookings→deposited funnel

```

### 4.79 US-AN-04

**User Story:** Là Developer Admin, tôi muốn inventory summary report, để tổng quan tồn kho.

**FR liên kết:** FR-AN-01

**Scenario 1:**

```gherkin

GIVEN project X

WHEN open report

THEN available/reserved/sold counts

```

### 4.80 US-UX-03

**User Story:** Là Platform Admin, tôi muốn admin tenant management, để vận hành platform.

**FR liên kết:** FR-UX-03

**Scenario 1:**

```gherkin

GIVEN admin portal

WHEN create/suspend tenant

THEN effective immediately; audited

```

### 4.81 US-UX-04

**User Story:** Là Ops Admin, tôi muốn config approval rules, để tùy chỉnh moderation.

**FR liên kết:** FR-UX-03

**Scenario 1:**

```gherkin

GIVEN ops config

WHEN update rules

THEN moderation queue applies new rules

```

### 4.82 US-OP-01

**User Story:** Là DevOps, tôi muốn CI/CD pipeline, để automated deploy.

**FR liên kết:** NFR-O04

**Scenario 1:**

```gherkin

GIVEN push main

WHEN CI runs

THEN test+build+deploy staging pass

```

### 4.83 US-OP-02

**User Story:** Là DevOps, tôi muốn staging + production env, để safe release.

**FR liên kết:** NFR-O04

**Scenario 1:**

```gherkin

GIVEN infra

WHEN access staging

THEN isolated from prod data

```

### 4.84 US-OP-03

**User Story:** Là Tech Lead, tôi muốn OpenAPI documentation, để API contract clear.

**FR liên kết:** NFR-M02

**Scenario 1:**

```gherkin

GIVEN API endpoints

WHEN generate OpenAPI

THEN published matches implementation

```

### 4.85 US-OP-04

**User Story:** Là Ops, tôi muốn runbook payment ops, để incident response.

**FR liên kết:** NFR-O03

**Scenario 1:**

```gherkin

GIVEN runbook doc

WHEN payment webhook fail

THEN steps documented for on-call

```

---

## 5. Tiêu chí chấp nhận phi chức năng (52 NFR)

> Align SRS v2.0 §8 — mỗi NFR có metric, script/load params, pass criteria

### 5.1 Performance

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-P01 | NFR-P01 | API read latency P95 | ≤500ms @100 concurrent | k6 read scenario | `http_req_duration{type:read}` | `p(95)<500` | 100 VUs, 5m duration, ramp 30s | ☐ |
| AC-NFR-P02 | NFR-P02 | API write latency P95 | ≤800ms @50 concurrent | k6 write scenario | `http_req_duration{type:write}` | `p(95)<800` | 50 VUs POST/PUT, 5m | ☐ |
| AC-NFR-P03 | NFR-P03 | Search latency P95 | ≤200ms @10K docs | k6 search + OpenSearch slowlog | `search_duration` | `p(95)<200` | GET /search, 10K indexed, 50 VUs | ☐ |
| AC-NFR-P04 | NFR-P04 | Inventory sync lag GR→Search/SSE | ≤5 giây | CDC lag metric + synthetic probe | `cdc_lag_seconds` | `max<5` | Change unit status; probe search+SSE | ☐ |
| AC-NFR-P05 | NFR-P05 | AI copilot response P95 | ≤8 giây | AI action log latency | `ai_latency_ms` | `p(95)<8000` | 100 copilot requests batch | ☐ |
| AC-NFR-P06 | NFR-P06 | Lead scoring latency | ≤3 giây sau LeadCaptured | Event timestamp delta | `lead_score_lag_ms` | `p(95)<3000` | Create 50 leads; measure event delta | ☐ |
| AC-NFR-P07 | NFR-P07 | Payment webhook processing | ≤2 giây E2E | Webhook handler trace | `webhook_process_ms` | `p(95)<2000` | Replay 100 webhooks sandbox | ☐ |
| AC-NFR-P08 | NFR-P08 | Zero double booking | 0/1000 concurrent | Chaos test + audit | `double_book_count` | `==0` | 1000 concurrent lock same unit | ☐ |

### 5.2 Security

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-S01 | NFR-S01 | Encryption at rest | AES-256 DB + S3 | Infra audit, config scan | `encryption_enabled` | `==true` | aws rds describe; s3 bucket policy scan | ☐ |
| AC-NFR-S02 | NFR-S02 | Tenant isolation | 0 cross-tenant access | RLS test suite 100% | `cross_tenant_leak` | `==0` | 100 cross-tenant API+DB tests | ☐ |
| AC-NFR-S03 | NFR-S03 | Audit trail immutability | No UPDATE/DELETE audit | DB policy + replay | `audit_mutations` | `==0` | Attempt UPDATE audit_log; expect fail | ☐ |
| AC-NFR-S04 | NFR-S04 | OWASP Top 10 | Zero Critical/High at gate | SAST/DAST + pen test | `vuln_critical_high` | `==0` | SonarQube + OWASP ZAP + pen test report | ☐ |
| AC-NFR-S05 | NFR-S05 | MFA sensitive actions | 100% payment/e-sign/admin | Auth log audit | `mfa_coverage_pct` | `==100` | Sample 50 sensitive actions | ☐ |
| AC-NFR-S06 | NFR-S06 | PII encryption in transit | TLS 1.2+ all endpoints | SSL scan | `tls_min_version` | `>=1.2` | ssllabs/testssl scan all domains | ☐ |
| AC-NFR-S07 | NFR-S07 | Secrets management | No secrets in code/logs | Git secret scan | `secrets_in_repo` | `==0` | gitleaks + trufflehog CI gate | ☐ |
| AC-NFR-S08 | NFR-S08 | Rate limiting API | 429 after threshold | API gateway metrics | `rate_limit_429` | `triggered` | Abuse sim 1000 req/s tenant | ☐ |
| AC-NFR-S09 | NFR-S09 | Session timeout | ≤8h idle; refresh rotation | Auth config audit | `session_max_idle` | `<=28800` | Idle 8h test; token rotation verify | ☐ |
| AC-NFR-S10 | NFR-S10 | Document vault access control | Expiring signed URL | Vault access audit | `signed_url_ttl` | `<=3600` | Download log + URL expiry test | ☐ |

### 5.3 Scalability

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-SC01 | NFR-SC01 | Concurrent users Phase 1 | 500 concurrent no degrade | k6 load test | `error_rate` | `<1%` | 500 VUs mixed scenario 10m | ☐ |
| AC-NFR-SC02 | NFR-SC02 | Concurrent users Phase 3 | 5000 concurrent | k6 + auto-scale | `error_rate` | `<1%` | 5000 VUs; HPA verify | ☐ |
| AC-NFR-SC03 | NFR-SC03 | GR units/tenant | ≥50000 units | DB benchmark | `query_p95_ms` | `<500` | Insert 50K units; query benchmark | ☐ |
| AC-NFR-SC04 | NFR-SC04 | Event store throughput | ≥500 events/s/tenant | Stress test | `events_per_sec` | `>=500` | Burst 5000 events 10s | ☐ |
| AC-NFR-SC05 | NFR-SC05 | Search index size | ≥1M documents | OpenSearch monitor | `cluster_health` | `green` | Index 1M docs; search P95 still ≤200ms | ☐ |
| AC-NFR-SC06 | NFR-SC06 | Multi-region read replica | Read latency <100ms regional | Geo latency probe | `regional_read_ms` | `<100` | Probe from 3 regions | ☐ |

### 5.4 Availability

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-A01 | NFR-A01 | Uptime SLA production | ≥99.5% monthly | Pingdom/Statuspage | `uptime_pct` | `>=99.5` | Monthly SLA report | ☐ |
| AC-NFR-A02 | NFR-A02 | RPO | ≤24 giờ | Backup log + DR drill | `rpo_hours` | `<=24` | Quarterly backup restore verify | ☐ |
| AC-NFR-A03 | NFR-A03 | RTO | ≤4 giờ | DR drill timed restore | `rto_hours` | `<=4` | Quarterly full DR drill timed | ☐ |
| AC-NFR-A04 | NFR-A04 | Payment gateway failover | ≤30s switch fallback | Circuit breaker metric | `failover_seconds` | `<=30` | Kill primary gateway; measure switch | ☐ |
| AC-NFR-A05 | NFR-A05 | Planned maintenance | ≤4h/tháng; notify 72h | Change management log | `maintenance_hours` | `<=4` | Ops process audit monthly | ☐ |

### 5.5 Usability

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-U01 | NFR-U01 | UI ngôn ngữ tiếng Việt P1 | 100% UI Vietnamese | UX review checklist | `vi_coverage_pct` | `==100` | Walkthrough all portals | ☐ |
| AC-NFR-U02 | NFR-U02 | Agent tạo listing median | ≤5 phút with AI | Product analytics | `listing_create_median_s` | `<=300` | UAT timing n≥5 agents | ☐ |
| AC-NFR-U03 | NFR-U03 | Buyer lead submission | ≤3 click from search | UX analytics | `click_count_median` | `<=3` | Usability test n=8 | ☐ |
| AC-NFR-U04 | NFR-U04 | Mobile responsive | Functional ≥320px | Cross-browser matrix | `viewport_pass` | `320,375,768` | BrowserStack responsive suite | ☐ |
| AC-NFR-U05 | NFR-U05 | Accessibility WCAG | Level AA public portal | axe/Lighthouse | `a11y_violations_critical` | `==0` | axe-core scan all public pages | ☐ |

### 5.6 Compliance

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-C01 | NFR-C01 | KYC/KYB trước payout | 100% blocked if no KYC | Compliance workflow | `payout_without_kyc` | `==0` | Attempt payout unverified tenant | ☐ |
| AC-NFR-C02 | NFR-C02 | Quảng cáo BĐS VN | Listing pass compliance | Legal rule engine | `compliance_fail_published` | `==0` | Legal spot check 20 listings | ☐ |
| AC-NFR-C03 | NFR-C03 | Consent PDPA/GDPR-ready | Consent checkbox required | Form audit + DB | `leads_without_consent` | `==0` | Audit 100 lead forms | ☐ |
| AC-NFR-C04 | NFR-C04 | AI disclaimer | Mọi AI output có disclaimer | UI template audit | `ai_no_disclaimer` | `==0` | Scan all AI output templates | ☐ |
| AC-NFR-C05 | NFR-C05 | Data retention policy | Tuân thủ retention matrix | Retention job audit | `retention_violations` | `==0` | Verify purge job logs | ☐ |

### 5.7 Operability

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-O01 | NFR-O01 | Structured logging | 100% JSON log + trace_id | Log format lint | `json_log_coverage` | `==100` | Lint all service logs | ☐ |
| AC-NFR-O02 | NFR-O02 | Alert response P0 | On-call ack ≤15 phút | PagerDuty log | `p0_ack_minutes` | `<=15` | Incident drill quarterly | ☐ |
| AC-NFR-O03 | NFR-O03 | Daily reconciliation report | Auto 06:00 ICT | Cron success metric | `recon_job_success` | `==100%` | 7-day cron success rate | ☐ |
| AC-NFR-O04 | NFR-O04 | Feature flag rollout | Toggle without deploy | Feature flag audit | `flag_toggle_works` | `true` | Toggle flag; verify behavior change | ☐ |
| AC-NFR-O05 | NFR-O05 | Runbook coverage | Top 10 incident types | Ops doc review | `runbook_count` | `>=10` | Quarterly doc review | ☐ |

### 5.8 Maintainability

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-M01 | NFR-M01 | Code coverage backend | ≥70% critical modules | CI coverage report | `line_coverage_pct` | `>=70` | JaCoCo/pytest-cov CI gate | ☐ |
| AC-NFR-M02 | NFR-M02 | API documentation | OpenAPI 100% public endpoints | Spec diff CI | `openapi_coverage` | `==100` | Contract test vs spec | ☐ |
| AC-NFR-M03 | NFR-M03 | ADR architecture decisions | ADR cross-cutting | ADR registry audit | `adr_count` | `>=5` | Architecture review | ☐ |
| AC-NFR-M04 | NFR-M04 | Dependency update CVE | Critical patch ≤7 ngày | Dependabot/Snyk | `critical_cve_open_days` | `<=7` | Snyk report review | ☐ |

### 5.9 Compatibility

| AC-ID | NFR | Metric | Mục tiêu | Script/Tool | Metric key | Threshold | Load params | Pass |
|-------|-----|--------|----------|-------------|------------|-----------|-------------|------|
| AC-NFR-CM01 | NFR-CM01 | Browser support | Chrome/Firefox/Safari/Edge 2 ver | BrowserStack matrix | `browser_pass_rate` | `==100%` | Cross-browser CI nightly | ☐ |
| AC-NFR-CM02 | NFR-CM02 | Mobile OS | iOS 15+, Android 10+ | Device lab | `mobile_pass_rate` | `==100%` | Device lab P2 app test | ☐ |
| AC-NFR-CM03 | NFR-CM03 | Payment gateway adapter | Swap gateway ≤2 sprint | Adapter integration | `gateway_swap_sprints` | `<=2` | Sandbox cert second gateway | ☐ |
| AC-NFR-CM04 | NFR-CM04 | Zalo/Meta API version | Current + previous API | Webhook compat test | `webhook_compat` | `pass` | Partner sandbox both versions | ☐ |

### 5.10 Script đo lường mẫu (NFR)

#### Script k6 — API Read (NFR-P01)

```javascript

// k6/nfr-p01-api-read.js

import http from 'k6/http';

import { check } from 'k6';

export const options = { stages: [{ duration: '30s', target: 100 }, { duration: '5m', target: 100 }], thresholds: { http_req_duration: ['p(95)<500'] } };

export default function() {

  const res = http.get(`${__ENV.BASE_URL}/api/v1/units?project_id=${__ENV.PROJECT_ID}`, { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } });

  check(res, { 'status 200': r => r.status === 200, 'p95 ok': r => r.timings.duration < 500 });

}

```

#### Script k6 — Concurrent Booking (NFR-P08)

```javascript

// k6/nfr-p08-concurrent-booking.js

import http from 'k6/http';

export const options = { vus: 100, duration: '10s', thresholds: { 'checks{success:booking}': ['count==1'] } };

const UNIT_ID = __ENV.UNIT_ID;

export default function() {

  http.post(`${__ENV.BASE_URL}/api/v1/bookings`, JSON.stringify({ unit_id: UNIT_ID }), { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN}` } });

}

```

#### Script — Tenant Isolation (NFR-S02)

```bash

# scripts/nfr-s02-tenant-isolation.sh

TOKEN_A=$(curl -s -X POST $BASE_URL/auth/login -d '{"tenant":"A"}' | jq -r .token)

HTTP=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN_A" $BASE_URL/api/v1/units?tenant_id=B)

[ "$HTTP" = "403" ] && echo PASS || echo FAIL

```

---

## 6. Kịch bản UAT (UAT-01 → UAT-15)

### 6.1 UAT-01: Buyer search → lead → agent nhận lead scored

**Actor:** Buyer, Agent

**Preconditions:** Public portal có ≥50 listing Published

| Bước | Hành động |
|------|-----------|
| 1 | Buyer mở Public Portal, search '2PN Quận 7' filter giá 2–4 tỷ |
| 2 | Chọn listing, xem detail page |
| 3 | Click 'Đăng ký tư vấn', điền name+phone+consent, Submit |
| 4 | Agent login Agent Portal, kiểm tra lead mới |

**Kết quả mong đợi:** Lead tạo ≤3 click; score visible ≤2s; agent email ≤1 phút

**Pass criteria:** 100% steps pass; lead_id returned; score 0-100

### 6.2 UAT-02: Agent listing từ GR + AI copilot → Ops approve → publish

**Actor:** Agent, Ops

**Preconditions:** Unit available; Agent có quyền project

| Bước | Hành động |
|------|-----------|
| 1 | Agent tạo listing từ unit gốc (price read-only) |
| 2 | Click AI Copilot → review draft → Approve & Use |
| 3 | Upload 3 ảnh, Submit Pending |
| 4 | Ops Admin approve listing trong moderation queue |

**Kết quả mong đợi:** Listing Published; badge Verified; searchable ≤5s

**Pass criteria:** Listing Published; Verified badge; search returns listing

### 6.3 UAT-03: Agent booking → buyer pay cọc → unit reserved → ledger reconcile

**Actor:** Agent, Buyer, Finance

**Preconditions:** Unit available; payment sandbox active

| Bước | Hành động |
|------|-----------|
| 1 | Agent tạo booking 48h expiry, gửi payment link buyer |
| 2 | Buyer mở link, hoàn tất payment sandbox |
| 3 | Verify booking Deposited, unit reserved |
| 4 | Finance chạy daily reconciliation |

**Kết quả mong đợi:** Payment webhook ≤30s; ledger balanced; recon 100% match

**Pass criteria:** Booking Deposited; debit=credit; recon report clean

### 6.4 UAT-04: Anti-drift block listing sai giá/trạng thái

**Actor:** Agent

**Preconditions:** Unit GR price=3 tỷ, status=available

| Bước | Hành động |
|------|-----------|
| 1 | Agent tạo listing từ unit |
| 2 | Thử submit với marketing claim 'còn 5 căn' khi GR chỉ 1 |
| 3 | Hoặc API bypass attempt price override |

**Kết quả mong đợi:** Submit blocked; message hiển thị giá/trạng thái đúng GR

**Pass criteria:** 0% drift published; error message rõ ràng

### 6.5 UAT-05: Concurrent 2 agent book 1 unit — chỉ 1 success

**Actor:** Agent x2

**Preconditions:** Unit U1 available; 2 agent accounts

| Bước | Hành động |
|------|-----------|
| 1 | Agent A và B đồng thời click 'Tạo booking' unit U1 |
| 2 | Cả 2 confirm trong cùng 1 giây |
| 3 | Kiểm tra kết quả và audit log |

**Kết quả mong đợi:** 1 booking success; 1 error 'Unit no longer available'; 0 double book

**Pass criteria:** Exactly 1 booking; audit 2 attempts

### 6.6 UAT-06: Cancel booking → refund workflow

**Actor:** Agent, Ops, Buyer

**Preconditions:** Booking Deposited với payment success

| Bước | Hành động |
|------|-----------|
| 1 | Agent request cancel với lý do |
| 2 | Ops approve cancel (nếu policy require) |
| 3 | Verify refund initiated, unit available |
| 4 | Buyer nhận notification |

**Kết quả mong đợi:** Refund initiated; ledger reversal; unit=available

**Pass criteria:** Cancel complete; ledger balanced

### 6.7 UAT-07: Audit trail truy vết thay đổi giá unit

**Actor:** Developer, Ops

**Preconditions:** Unit có ≥2 lần đổi giá

| Bước | Hành động |
|------|-----------|
| 1 | Developer Admin đổi giá unit 2 lần |
| 2 | Ops mở Audit Trail viewer |
| 3 | Filter entity=unit, date range |
| 4 | Export CSV |

**Kết quả mong đợi:** 2 version records; audit log old/new value; export success

**Pass criteria:** Full history visible; immutable log

### 6.8 UAT-08: Tenant isolation — Agency A không thấy data Agency B

**Actor:** Agency Admin x2

**Preconditions:** 2 agency tenants với data riêng

| Bước | Hành động |
|------|-----------|
| 1 | Agency A admin login, query leads/bookings |
| 2 | Thử API call với unit_id tenant B |
| 3 | Verify RLS direct DB (QA script) |

**Kết quả mong đợi:** 403 cross-tenant; 0 rows leak

**Pass criteria:** 100% isolation tests pass

### 6.9 UAT-09: Lead routing round-robin theo project

**Actor:** Agency Admin, Buyer

**Preconditions:** Routing rule project A → pool 3 agents

| Bước | Hành động |
|------|-----------|
| 1 | Tạo 6 leads project A từ portal |
| 2 | Verify assignment round-robin |
| 3 | Hot lead (score≥80) → senior pool |

**Kết quả mong đợi:** 6 leads distributed evenly; hot lead senior

**Pass criteria:** Round-robin ±1; hot routing correct

### 6.10 UAT-10: CRM pipeline kanban + activity timeline

**Actor:** Agent

**Preconditions:** ≥5 leads various stages

| Bước | Hành động |
|------|-----------|
| 1 | Agent mở pipeline kanban |
| 2 | Drag lead sang stage tiếp theo |
| 3 | Log call activity trên lead |
| 4 | Verify timeline chronological |

**Kết quả mong đợi:** Stage updated; activity immutable on timeline

**Pass criteria:** Kanban sync; timeline correct order

### 6.11 UAT-11: MFA OTP payment action

**Actor:** Buyer

**Preconditions:** Booking Deposit Pending

| Bước | Hành động |
|------|-----------|
| 1 | Buyer mở payment page |
| 2 | Confirm payment → OTP prompt |
| 3 | Nhập sai OTP 3 lần |
| 4 | Nhập đúng OTP lần 4 (after lock expire test on separate account) |

**Kết quả mong đợi:** OTP required; lock 15 min after 3 fails

**Pass criteria:** MFA enforced 100% payment

### 6.12 UAT-12: KPI dashboard funnel 30 ngày

**Actor:** Agency Admin

**Preconditions:** Tenant có data leads/bookings 30 ngày

| Bước | Hành động |
|------|-----------|
| 1 | Agency Admin mở Dashboard |
| 2 | Select range 30 ngày |
| 3 | Verify funnel leads→bookings→deposited |
| 4 | Drill-down to lead list |

**Kết quả mong đợi:** Charts render ≤3s; counts match CRM

**Pass criteria:** Funnel numbers ±CDC lag

### 6.13 UAT-13: Search geo + facet performance

**Actor:** Buyer

**Preconditions:** 10K indexed listings staging

| Bước | Hành động |
|------|-----------|
| 1 | Search keyword + facet price/type |
| 2 | Geo search radius 5km |
| 3 | Measure response time (DevTools/k6) |

**Kết quả mong đợi:** Results correct; P95 ≤200ms

**Pass criteria:** NFR-P03 pass on staging

### 6.14 UAT-14: Booking expiry auto-release unit

**Actor:** Agent, System

**Preconditions:** Booking created 1h expiry (test config)

| Bước | Hành động |
|------|-----------|
| 1 | Agent tạo booking không payment |
| 2 | Wait expiry + job cycle (≤5 min) |
| 3 | Verify booking Expired, unit available |

**Kết quả mong đợi:** Unit released; booking Expired

**Pass criteria:** Auto-expire works; no manual intervention

### 6.15 UAT-15: End-to-end pilot happy path (North Star)

**Actor:** Buyer, Agent, Ops, Developer

**Preconditions:** Pilot tenant fully configured

| Bước | Hành động |
|------|-----------|
| 1 | Buyer search → lead (UAT-01) |
| 2 | Agent contact → create listing (UAT-02 shortened) |
| 3 | Agent booking → buyer pay (UAT-03) |
| 4 | Developer verify GR reserved + dashboard |
| 5 | Finance reconciliation |

**Kết quả mong đợi:** Full PP-01→PP-04 pain points resolved; GMV tracked

**Pass criteria:** Pilot sign-off all stakeholders

---

## 7. Tiêu chí Phase Gate (Phase 1–6)

### 7.1 Phase 1 — MVP Go-live (R1.0 — 31/12/2026)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G1.1 | 100% Must FR Phase 1 AC pass (modules GR, ID, LS, CRM, BK, PAY, AI, TR, AN, UX) | Tech Lead | ☐ |
| G1.2 | 100% Must NFR Phase 1 pass (NFR-P01→P08, S01→S09, SC01, A01→A05, U01→U04, C02→C05, O01→O05, M01→M04, CM01, CM03) | Tech Lead | ☐ |
| G1.3 | UAT-01→UAT-15 pass trên staging với pilot tenant | QA | ☐ |
| G1.4 | Zero Critical bug open; High bug có fix plan approved | Tech Lead | ☐ |
| G1.5 | Concurrent booking test: 0 double book /1000 attempts (NFR-P08) | QA | ☐ |
| G1.6 | Daily reconciliation 100% match 7 ngày liên tiếp staging | Tech Lead | ☐ |
| G1.7 | Pen test pass: zero Critical; High remediated or accepted risk documented | QA | ☐ |
| G1.8 | Runbook payment webhook fail + audit incident complete | Tech Lead | ☐ |
| G1.9 | OpenAPI spec published; contract test pass | QA | ☐ |
| G1.10 | Code coverage backend critical modules ≥70% (NFR-M01) | Tech Lead | ☐ |
| G1.11 | Pilot Developer + Agency sign-off UAT-15 | QA | ☐ |
| G1.12 | SLA monitoring configured; uptime baseline ready | Tech Lead | ☐ |

**Bổ sung vận hành (§14):** OP-WIN-01→10 phải pass trước pilot sign-off.

### 7.2 Phase 2 — Growth (R1.5 — 30/04/2027)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G2.1 | Commission E2E: policy→snapshot→settlement→export CSV | Tech Lead | ☐ |
| G2.2 | Zalo OA/ZNS + Meta Lead Ads sync operational | Tech Lead | ☐ |
| G2.3 | Developer Portal UI bảng hàng + absorption report | Tech Lead | ☐ |
| G2.4 | Mobile app sale beta: offline-read inventory + booking | Tech Lead | ☐ |
| G2.5 | E-sign integration sandbox pass | Tech Lead | ☐ |
| G2.6 | KYC/KYB workflow before payout enforced (NFR-C01) | Tech Lead | ☐ |
| G2.7 | Document Vault upload + watermark + access log | Tech Lead | ☐ |
| G2.8 | Bulk import Excel bảng hàng ≥1000 rows | Tech Lead | ☐ |
| G2.9 | Time-travel query GR history | Tech Lead | ☐ |
| G2.10 | Marketplace distribution policy publish + agency apply | Tech Lead | ☐ |
| G2.11 | NFR-CM02 mobile OS pass; NFR-CM04 Zalo/Meta compat | Tech Lead | ☐ |
| G2.12 | Regression R1.0 full pass + Phase 2 new TC | Tech Lead | ☐ |

### 7.3 Phase 3 — AI Agents & Trust (R2.0 — 30/09/2027)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G3.1 | AI Sales Agent draft reply approve-to-send adoption ≥60% agents | Tech Lead | ☐ |
| G3.2 | Dispute Resolution Center SLA <48 giờ | Tech Lead | ☐ |
| G3.3 | Buyer App native favorites + deal tracking | Tech Lead | ☐ |
| G3.4 | Data warehouse ETL nightly; GMV dashboard live | Tech Lead | ☐ |
| G3.5 | Inventory sync lag ≤1 giây (upgrade from 5s) | Tech Lead | ☐ |
| G3.6 | Campaign attribution ROI report | Tech Lead | ☐ |
| G3.7 | Multi-gateway payment fallback ≤30s (NFR-A04) | Tech Lead | ☐ |
| G3.8 | 5000 concurrent users load test pass (NFR-SC02) | QA | ☐ |
| G3.9 | Omnichannel unified inbox beta | Tech Lead | ☐ |
| G3.10 | Absorption forecast model v1 deployed | Tech Lead | ☐ |
| G3.11 | Pen test re-run pass | QA | ☐ |
| G3.12 | Regression R1.5 + R2.0 scope pass | Tech Lead | ☐ |

### 7.4 Phase 4 — Enterprise (R3.0 — 29/02/2028)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G4.1 | SSO Enterprise SAML/OIDC login | Tech Lead | ☐ |
| G4.2 | White-label portal branding per tenant | Tech Lead | ☐ |
| G4.3 | Custom transaction workflow engine (limited scope) | Tech Lead | ☐ |
| G4.4 | Multi-region read replica latency <100ms (NFR-SC06) | Tech Lead | ☐ |
| G4.5 | Regulatory Export Pack generation | Tech Lead | ☐ |
| G4.6 | API Marketplace partner registration | Tech Lead | ☐ |
| G4.7 | Enterprise SLA 99.9% agreement ready | Tech Lead | ☐ |
| G4.8 | Advanced RBAC ABAC policies | Tech Lead | ☐ |
| G4.9 | Disaster recovery multi-region drill pass | Tech Lead | ☐ |
| G4.10 | Security audit SOC2 readiness checklist | Tech Lead | ☐ |
| G4.11 | Regression R2.0 full pass | Tech Lead | ☐ |
| G4.12 | Steering committee enterprise sign-off | PO | ☐ |

### 7.5 Phase 5 — Embedded Finance (R4.0 — 30/06/2028)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G5.1 | Smart Escrow conditional release legal approved | Tech Lead | ☐ |
| G5.2 | BNPL installment schedule operational | Tech Lead | ☐ |
| G5.3 | Mortgage pre-qualification partner integration | Tech Lead | ☐ |
| G5.4 | Split commission multi-agent payout automated | Tech Lead | ☐ |
| G5.5 | Legal compliance finance VN sign-off | PO | ☐ |
| G5.6 | Bank partner sandbox certification | Tech Lead | ☐ |
| G5.7 | Financial audit trail 10-year retention | Tech Lead | ☐ |
| G5.8 | Fraud detection AI pricing intelligence | Tech Lead | ☐ |
| G5.9 | Payment multi-currency support (if scoped) | Tech Lead | ☐ |
| G5.10 | Escrow dispute workflow integrated TR-03 | Tech Lead | ☐ |
| G5.11 | Regression R3.0 pass | Tech Lead | ☐ |
| G5.12 | Finance Admin UAT all payment scenarios | QA | ☐ |

### 7.6 Phase 6 — Network & Data Product (R5.0 — 31/10/2028)

| # | Checklist Item | Owner | Pass |
|---|----------------|-------|------|
| G6.1 | Marketplace leaderboard + SLA penalty automation | Tech Lead | ☐ |
| G6.2 | Immersive 3D/Map discovery beta | Tech Lead | ☐ |
| G6.3 | Data intelligence product (heatmap, pricing report) GA | Tech Lead | ☐ |
| G6.4 | API ecosystem marketplace revenue tracking | Tech Lead | ☐ |
| G6.5 | Platform v2.0 architecture migration complete | Tech Lead | ☐ |
| G6.6 | 5000+ concurrent sustained; 1M search docs (NFR-SC05) | Tech Lead | ☐ |
| G6.7 | Agent platform adoption ≥95% | Tech Lead | ☐ |
| G6.8 | NPS Developer ≥60 | Tech Lead | ☐ |
| G6.9 | GMV +200% YoY baseline from Phase 1 | Tech Lead | ☐ |
| G6.10 | Full regression R1.0→R5.0 pass | Tech Lead | ☐ |
| G6.11 | Platform v2.0 documentation complete | Tech Lead | ☐ |
| G6.12 | Steering committee final sign-off | PO | ☐ |

---

## 8. Definition of Done

### 8.1 User Story DoD

- [ ] Code merged to main/develop với peer review ≥1 approval

- [ ] Unit test coverage critical path ≥80% cho code mới

- [ ] Integration test pass cho AC Given/When/Then liên quan

- [ ] OpenAPI spec cập nhật nếu có API change (NFR-M02)

- [ ] QA sign-off trên AC — không High/Critical bug open cho story

- [ ] Demo staging cho PO; AC checklist signed

- [ ] Audit log / AI log implemented nếu story touch sensitive data

- [ ] Feature flag configured nếu rollout gradual (NFR-O04)

### 8.2 Sprint DoD

- [ ] 100% committed Must stories meet Story DoD

- [ ] Sprint demo completed với PO attendance

- [ ] Regression smoke pass trên staging

- [ ] No new Critical bugs; High bugs triaged

- [ ] Sprint retro action items documented

- [ ] Velocity và burndown updated

### 8.3 Release DoD (R1.0→R5.0)

- [ ] 100% Must AC cho release scope pass

- [ ] Full regression scope cho release pass (§9)

- [ ] UAT scenarios applicable pass với pilot/stakeholder sign-off

- [ ] NFR gate metrics pass (performance, security)

- [ ] Release notes + migration runbook published

- [ ] Rollback plan tested

- [ ] Monitoring alerts configured cho new features

- [ ] Go/No-go meeting minutes approved

### 8.4 Phase DoD

- [ ] Phase Gate checklist (§7) 100% Must items pass

- [ ] Steering committee phase review completed

- [ ] Technical debt log updated; carry-over scoped

- [ ] ADR updated cho architecture changes

- [ ] Pilot feedback incorporated hoặc deferred với PO approval

- [ ] Next phase backlog refined ≥80% ready

---

## 9. Phạm vi Regression Test theo Release (R1.0–R5.0)

| Release | Ngày | Scope Functional | Scope NFR/Security | Pass Criteria | Effort est. |
|---------|------|------------------|-------------------|---------------|-------------|
| R1.0 MVP | 31/12/2026 | Full Phase 1: GR, ID, LS, CRM, BK, PAY, AI, TR, AN, UX | 85 TC + UAT-01→15 + NFR-P01,P03,P04,P08,S02 load/security | 100% Must TC | 4h automated + 2 ngày manual UAT |
| R1.5 Growth | 30/04/2027 | R1.0 full + Commission, Zalo/Meta, Mobile, Dev Portal, E-sign | +40 TC Phase 2; UAT commission + omnichannel | 100% R1.0 + 100% new Must | 6h automated + 3 ngày UAT |
| R2.0 AI Trust | 30/09/2027 | R1.5 + AI Agents, Dispute, Buyer App, Warehouse, Attribution | +35 TC Phase 3; performance scale test | 100% R1.5 + P3 Must | 8h automated + scale test 1 ngày |
| R3.0 Enterprise | 29/02/2028 | R2.0 + SSO, White-label, Custom workflow, Multi-region | +25 TC Phase 4; SSO security suite | 100% R2.0 + P4 Must | 10h automated + pen test |
| R4.0 Finance | 30/06/2028 | R3.0 + Escrow, BNPL, Mortgage, Split payout | +30 TC Phase 5; finance compliance | 100% R3.0 + P5 Must | 12h automated + finance UAT 2 ngày |
| R5.0 Platform | 31/10/2028 | Full platform R1.0→R4.0 + Marketplace, Data product, 3D | Full suite 200+ TC; quarterly perf baseline | 100% all releases Must | Full regression 3 ngày + load 1 ngày |

### 9.1 Smoke Test mỗi deploy (CI)

- [ ] Auth login/logout

- [ ] GET /units 200

- [ ] POST /leads 201

- [ ] Search /listings?q=test

- [ ] Health /health 200

---

## 10. Security Acceptance Checklist (OWASP Top 10 mapped)

| OWASP | Category | NFR/FR | Acceptance Criteria | Test | Method | Pass |
|-------|----------|--------|---------------------|------|--------|------|
| A01:2021 | Broken Access Control | NFR-S02, FR-ID-02,03 | Cross-tenant 403; RBAC matrix test 100% | TC-ID-04→09 | Pen test + automated | ☐ |
| A02:2021 | Cryptographic Failures | NFR-S01, S06 | AES-256 at rest; TLS 1.2+; no plaintext PII log | SSL scan + config audit | Infra review | ☐ |
| A03:2021 | Injection | NFR-S04 | SQLi/XSS/Command injection SAST/DAST zero High | OWASP ZAP scan | CI gate | ☐ |
| A04:2021 | Insecure Design | FR-AI-03 | AI guardrails; threat model documented | TC-AI-07,08 | Design review | ☐ |
| A05:2021 | Security Misconfiguration | NFR-S07 | No default creds; secrets in vault; headers secure | gitleaks + header scan | CI + manual | ☐ |
| A06:2021 | Vulnerable Components | NFR-M04 | Critical CVE patch ≤7 ngày; Snyk zero Critical | Dependabot report | Weekly scan | ☐ |
| A07:2021 | Auth Failures | NFR-S05, S09, FR-ID-04 | MFA payment; session timeout ≤8h; brute force lock | TC-ID-10,11 | Auth test suite | ☐ |
| A08:2021 | Software/Data Integrity | FR-PAY-04 | Webhook signature verify; idempotent handler | TC-PAY-07 | Integration test | ☐ |
| A09:2021 | Logging Failures | NFR-O01, FR-TR-01 | JSON structured log; audit append-only; AI log | TC-TR-01, TC-OP-03 | Log audit | ☐ |
| A10:2021 | SSRF | NFR-S04 | URL fetch whitelist; no internal network from user input | SSRF test cases | DAST | ☐ |

---

## 11. Performance Benchmark Scenarios (k6)

| Scenario | Tên | NFR | k6 Options | Endpoints | Threshold | Metric | Schedule |
|----------|-----|-----|------------|-----------|-----------|--------|----------|
| PERF-01 | API Read Mixed | NFR-P01 | 100 VUs, 5m, ramp 30s | GET /units, /listings, /leads | p(95)<500ms | http_req_duration | Daily staging |
| PERF-02 | API Write Mixed | NFR-P02 | 50 VUs, 5m | POST /leads, /bookings, PUT /listings | p(95)<800ms | http_req_duration | Pre-release |
| PERF-03 | Search Benchmark | NFR-P03 | 50 VUs, 10K docs | GET /search?q=&facet= | p(95)<200ms | search_duration | Sprint gate S12 |
| PERF-04 | CDC Sync Probe | NFR-P04 | 1 VU synthetic, 100 iterations | Change status → poll search | lag<5s | cdc_lag_seconds | Continuous monitor |
| PERF-05 | AI Copilot | NFR-P05 | 20 VUs, 50 requests | POST /ai/copilot/generate | p(95)<8000ms | ai_latency_ms | Sprint 7 gate |
| PERF-06 | Lead Scoring | NFR-P06 | 30 leads burst | POST /leads → measure score event | p(95)<3000ms | score_lag_ms | Integration CI |
| PERF-07 | Webhook Processing | NFR-P07 | 100 webhook replay | POST /webhooks/payment | p(95)<2000ms | webhook_ms | Sandbox CI |
| PERF-08 | Concurrent Booking | NFR-P08 | 100→1000 VUs spike | POST /bookings same unit_id | success_count==1 | double_book | Mandatory go-live |
| PERF-09 | Phase 1 Scale | NFR-SC01 | 500 VUs mixed 10m | Full user journey script | error_rate<1% | http_req_failed | Phase 1 gate |
| PERF-10 | Phase 3 Scale | NFR-SC02 | 5000 VUs 15m | Mixed read/write/search | error_rate<1% | http_req_failed | Phase 3 gate |

### 11.1 k6 Full User Journey Script (PERF-09)

```javascript

// k6/perf-09-phase1-journey.js — 500 VUs mixed scenario

import http from 'k6/http'; import { sleep } from 'k6';

export const options = { stages: [

  { duration: '2m', target: 100 }, { duration: '5m', target: 500 },

  { duration: '3m', target: 500 }, { duration: '2m', target: 0 }

], thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] } };

export default function() {

  http.get(`${__ENV.BASE_URL}/api/v1/search?q=can-ho`); sleep(1);

  http.post(`${__ENV.BASE_URL}/api/v1/leads`, JSON.stringify({ name: 'Test', phone: '0901234567' })); sleep(2);

}

```

---

## 12. Ma trận truy vết đầy đủ FR → AC → TC → UAT

> Pain Point (SRS §5) → FR → AC → TC → UAT

| FR-ID | AC-ID (sample) | TC-ID | UAT-ID | Pain Point | Phase |
|-------|----------------|-------|--------|------------|-------|
| FR-GR-01 | AC-GR-01-01 | TC-GR-01 | UAT-07 | PP-01 | P1 |
| FR-GR-03 | AC-GR-03-01 | TC-GR-07 | UAT-02 | PP-01 | P1 |
| FR-GR-04 | AC-GR-04-01 | TC-GR-10 | UAT-04 | PP-01 | P1 |
| FR-GR-08 | AC-GR-08-01 | TC-GR-15 | UAT-05 | PP-02 | P1 |
| FR-BK-02 | AC-BK-02-01 | TC-BK-04 | UAT-05 | PP-02 | P1 |
| FR-CRM-01 | AC-CRM-01-01 | TC-CRM-01 | UAT-01 | PP-03 | P1 |
| FR-CRM-03 | AC-CRM-03-01 | TC-CRM-06 | UAT-09 | PP-07 | P1 |
| FR-PAY-04 | AC-PAY-04-01 | TC-PAY-07 | UAT-03 | PP-04 | P1 |
| FR-AI-01 | AC-AI-01-01 | TC-AI-01 | UAT-02 | PP-06 | P1 |
| FR-AI-02 | AC-AI-02-01 | TC-AI-04 | UAT-01 | PP-07 | P1 |
| FR-AI-03 | AC-AI-03-01 | TC-AI-07 | — | — | P1 |
| FR-TR-01 | AC-TR-01-01 | TC-TR-01 | UAT-07 | PP-08 | P1 |
| FR-LS-02 | AC-LS-02-01 | TC-LS-04 | UAT-13 | PP-19 | P1 |
| FR-LS-06 | AC-LS-06-01 | TC-LS-12 | UAT-01 | PP-01 | P1 |
| FR-ID-03 | AC-ID-03-01 | TC-ID-07 | UAT-08 | — | P1 |
| FR-AN-01 | AC-AN-01-01 | TC-AN-01 | UAT-12 | PP-13 | P1 |
| FR-UX-01 | AC-UX-01-01 | TC-UX-01 | UAT-01 | — | P1 |
| FR-BK-07 | AC-BK-07-01 | TC-BK-12 | UAT-06 | — | P1 |
| FR-PAY-05 | AC-PAY-05-01 | TC-PAY-10 | UAT-03 | PP-12 | P1 |
| FR-CRM-05 | AC-CRM-05-01 | TC-CRM-11 | UAT-10 | — | P1 |

### 12.1 Ma trận đầy đủ Phase 1 Must FR

| FR-ID | Tên FR | # AC | TC chính | UAT | Module |
|-------|--------|------|----------|-----|--------|
| FR-GR-01 | Quản lý Golden Record (Unit gốc) | 3 | TC-GR-03, TC-GR-01, TC-GR-02 | UAT-15 | GR |
| FR-GR-02 | Versioning giá, tồn kho, policy | 3 | TC-GR-05, TC-GR-04, TC-GR-06 | UAT-15 | GR |
| FR-GR-03 | Listing marketing từ unit gốc | 3 | TC-GR-09, TC-GR-07, TC-GR-08 | UAT-15 | GR |
| FR-GR-04 | Anti-drift auto-block/flag | 3 | TC-GR-12, TC-GR-10, TC-GR-11 | UAT-04 | GR |
| FR-GR-05 | Verified Listing badge | 2 | TC-GR-14, TC-GR-13 | UAT-15 | GR |
| FR-GR-08 | Real-time push trạng thái unit | 3 | TC-GR-17, TC-GR-15, TC-GR-16 | UAT-15 | GR |
| FR-ID-01 | Multi-tenant hierarchy | 3 | TC-ID-02, TC-ID-01, TC-ID-03 | UAT-15 | ID |
| FR-ID-02 | RBAC và ABAC | 3 | TC-ID-04, TC-ID-05, TC-ID-06 | UAT-15 | ID |
| FR-ID-03 | Tenant isolation RLS | 3 | TC-ID-09, TC-ID-07, TC-ID-08 | UAT-08 | ID |
| FR-ID-04 | MFA/OTP nhạy cảm | 3 | TC-ID-10, TC-ID-12, TC-ID-11 | UAT-15 | ID |
| FR-LS-01 | CRUD listing + approval | 3 | TC-LS-01, TC-LS-02, TC-LS-03 | UAT-15 | LS |
| FR-LS-02 | Full-text + facet + geo search | 3 | TC-LS-05, TC-LS-06, TC-LS-04 | UAT-15 | LS |
| FR-LS-03 | Media upload listing | 3 | TC-LS-07, TC-LS-08, TC-LS-09 | UAT-15 | LS |
| FR-LS-04 | So sánh sản phẩm | 2 | TC-LS-11, TC-LS-10 | UAT-15 | LS |
| FR-LS-06 | Search sync CDC | 3 | TC-LS-12, TC-LS-14, TC-LS-13 | UAT-15 | LS |
| FR-CRM-01 | Lead capture đa nguồn | 3 | TC-CRM-01, TC-CRM-03, TC-CRM-02 | UAT-01 | CRM |
| FR-CRM-02 | Lead gắn entity | 2 | TC-CRM-05, TC-CRM-04 | UAT-15 | CRM |
| FR-CRM-03 | Lead routing | 3 | TC-CRM-08, TC-CRM-06, TC-CRM-07 | UAT-15 | CRM |
| FR-CRM-04 | CRM activities timeline | 2 | TC-CRM-09, TC-CRM-10 | UAT-15 | CRM |
| FR-CRM-05 | Pipeline + state machine | 3 | TC-CRM-13, TC-CRM-12, TC-CRM-11 | UAT-15 | CRM |
| FR-BK-01 | Reservation với expiry | 3 | TC-BK-02, TC-BK-01, TC-BK-03 | UAT-14 | BK |
| FR-BK-02 | Atomic inventory lock | 2 | TC-BK-05, TC-BK-04 | UAT-05 | BK |
| FR-BK-03 | Transaction state machine 15 states | 3 | TC-BK-06, TC-BK-07, TC-BK-08 | UAT-15 | BK |
| FR-BK-04 | Domain events event store | 3 | TC-BK-10, TC-BK-09, TC-BK-11 | UAT-15 | BK |
| FR-BK-07 | Cancel/refund workflow | 3 | TC-BK-12, TC-BK-13, TC-BK-14 | UAT-15 | BK |
| FR-PAY-01 | Payment orchestration | 2 | TC-PAY-01, TC-PAY-02 | UAT-15 | PAY |
| FR-PAY-02 | PaymentIntent Invoice Receipt Refund | 2 | TC-PAY-04, TC-PAY-03 | UAT-15 | PAY |
| FR-PAY-03 | Double-entry ledger | 2 | TC-PAY-05, TC-PAY-06 | UAT-15 | PAY |
| FR-PAY-04 | Webhook idempotent reconciliation | 3 | TC-PAY-07, TC-PAY-09, TC-PAY-08 | UAT-03 | PAY |
| FR-PAY-05 | Deposit payment gắn booking | 2 | TC-PAY-10, TC-PAY-11 | UAT-15 | PAY |
| FR-AI-01 | Content copilot listing | 3 | TC-AI-01, TC-AI-02, TC-AI-03 | UAT-02 | AI |
| FR-AI-02 | Lead scoring tự động | 3 | TC-AI-06, TC-AI-05, TC-AI-04 | UAT-15 | AI |
| FR-AI-03 | Guardrails no mutate | 2 | TC-AI-08, TC-AI-07 | UAT-15 | AI |
| FR-AI-04 | Human approval AI content | 2 | TC-AI-10, TC-AI-09 | UAT-15 | AI |
| FR-TR-01 | Audit trail toàn hệ thống | 3 | TC-TR-02, TC-TR-03, TC-TR-01 | UAT-07 | TR |
| FR-TR-05 | AI action log | 2 | TC-TR-04, TC-TR-05 | UAT-15 | TR |
| FR-AN-01 | KPI dashboard funnel lead booking | 3 | TC-AN-03, TC-AN-02, TC-AN-01 | UAT-12 | AN |
| FR-UX-01 | Public Portal | 3 | TC-UX-03, TC-UX-02, TC-UX-01 | UAT-15 | UX |
| FR-UX-02 | Agent Portal | 2 | TC-UX-04, TC-UX-05 | UAT-15 | UX |
| FR-UX-03 | Admin Portal | 2 | TC-UX-07, TC-UX-06 | UAT-15 | UX |

### 12.2 Traceability Flow

```

Pain Point (PP-XX) → Functional Requirement (FR-XX-XX) → Acceptance Criteria (AC-XX-XX-XX)

  → Test Case (TC-XX-XX) → UAT Scenario (UAT-XX) → Phase Gate (G-X.X) → Release (R-X.X)

```

---

## 13. Bảng Sign-off

### 13.1 Review tài liệu AC v2.0

| Vai trò | Họ tên | Ngày | Chữ ký | Ghi chú |
|---------|--------|------|--------|---------|
| Product Owner | [TBD] | ___/___/2026 | | |
| QA Lead | [TBD] | ___/___/2026 | | |
| Tech Lead | [TBD] | ___/___/2026 | | |
| BA Lead | [TBD] | ___/___/2026 | | |
| Steering Committee | [TBD] | ___/___/2026 | | |

### 13.2 UAT Pilot Sign-off (Phase 1 Go-live)

| Vai trò | Họ tên | Tenant Pilot | UAT Pass | Ngày | Chữ ký |
|---------|--------|--------------|----------|------|--------|
| Pilot Developer Admin | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |
| Pilot Agency Admin | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |
| Pilot Agent (×2) | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |
| Pilot Buyer (×2) | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |
| QA Lead | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |
| Product Owner | [TBD] | [TBD] | ☐ UAT-01→15 | ___/___/2026 | |

### 13.3 Phase 1 Gate Sign-off

| Gate Item | QA | PO | Tech Lead | Pilot Dev | Pilot Agency |
|-----------|-----|-----|-----------|-----------|--------------|
| G1.1 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.2 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.3 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.4 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.5 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.6 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.7 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.8 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.9 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.10 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.11 | ☐ | ☐ | ☐ | ☐ | ☐ |
| G1.12 | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 14. Tiêu chí thắng vận hành (Operational Win Criteria)

> **Mục đích:** Bổ sung gate ngoài functional AC — đảm bảo WEREAL **thắng khi vận hành**, không chỉ spec/prototype đẹp.  
> **Tham chiếu:** `Ke-hoach-du-an.md` §9, §13 · `Pham-vi-cong-viec.md` §13

### 14.1 Ba trụ cột bắt buộc (P0 pilot)

| ID | Tiêu chí | Đo lường | Owner |
|----|----------|----------|-------|
| OP-WIN-01 | **Không double-book** | 0/1000 concurrent booking attempts fail | QA |
| OP-WIN-02 | **Không lệch sổ** | Daily reconcile 100% match ≥ 7 ngày liên tiếp | Finance |
| OP-WIN-03 | **Timeline tranh chấp đầy đủ** | Replay 1 booking từ view→commission ≤ 3 phút | QA |
| OP-WIN-04 | **Anti-drift hard block** | 100% listing lệch GR bị block publish | QA |
| OP-WIN-05 | **Vertical slice E2E** | 1 deal thật pilot: GR→pay→ledger→commission | PO |

### 14.2 Stickiness & GMV (P1 — Phase 2 gate)

| ID | Tiêu chí | Pass |
|----|----------|------|
| OP-WIN-06 | Commission settlement batch E2E | G2.1 |
| OP-WIN-07 | Zalo/Meta lead vào CRM < 30s | G2.2 |
| OP-WIN-08 | Developer import ≥1000 rows + absorption report | G2.3, G2.8 |
| OP-WIN-09 | Agent mobile beta weekly active ≥ 70% pilot agents | G2.4 |

### 14.3 Trust & moat (P2–P3)

| ID | Tiêu chí | Phase gate |
|----|----------|------------|
| OP-WIN-10 | Dispute SLA median < 48h | G3.2 |
| OP-WIN-11 | Search inventory lag ≤ 1s P95 | G3.5 |
| OP-WIN-12 | GMV dashboard live + attribution | G3.4, G3.6 |
| OP-WIN-13 | Dev NPS ≥ 40 (pilot expanded) | KPI §7 Ke-hoach |
| OP-WIN-14 | Agent platform adoption ≥ 85% | Phase 3 KPI |
| OP-WIN-15 | Embedded finance legal sign-off | G5.5 |

### 14.4 Checklist 30 ngày (PO + Tech Lead)

- [ ] Pilot tenant hợp đồng ký (1 CĐT + ≥1 agency)
- [ ] Vertical slice production deployed staging
- [ ] Runbook payment + on-call roster published
- [ ] Figma Variables library published (DS gate §12)
- [ ] Deep-spec COM + TR sprint planned (BA Master backlog)

### 14.5 Out of scope cho pilot sign-off

- UC prototype-only không thuộc vertical slice P0
- Phase 2+ features (omnichannel production, mobile GA, escrow)
- White-label / SSO enterprise

---

## Phụ lục A — Liên kết tài liệu

| Tài liệu | File |
|----------|------|
| SRS v2.0 | `Tai-lieu-yeu-cau-phan-mem.md` |
| Use Case / User Story | `Danh-sach-use-case-user-story.md` |
| Yêu cầu xác nhận | `Yeu-cau-da-xac-nhan.md` |
| Kế hoạch dự án | `Ke-hoach-du-an.md` |
| Timeline | `Timeline-so-bo.md` |
| Roadmap vận hành | `Ke-hoach-du-an.md` §13 |
| Phạm vi OP-P0 | `Pham-vi-cong-viec.md` §13 |

## Phụ lục B — Thống kê tài liệu v2.0

| Hạng mục | Số lượng |
|----------|----------|
| User Stories GWT | 85 |
| Acceptance Criteria (FR) | 106 |
| NFR Acceptance Criteria | 52 |
| Test Cases | 116 |
| UAT Scenarios | 15 |
| Phase Gate Items | 72 |
| Operational Win Criteria | 15 (§14) |

---

*End of Document — WEREAL-AC-2026-v2.0*

