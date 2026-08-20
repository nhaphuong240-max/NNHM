# Danh sách Use Case & User Story — WEREAL REOS

> **Dự án:** WEREAL — Real Estate Operating System (REOS)
> **Phiên bản tài liệu:** 2.0 | **Ngày:** 28/07/2026
> **Trạng thái:** Draft — chờ xác nhận stakeholder
> **Tham chiếu:** `Tai-lieu-yeu-cau-phan-mem.md` | `Tieu-chi-chap-nhan.md` | `Ke-hoach-du-an.md`

---

## 0. Kiểm soát tài liệu (Document Control v2.0)

| Mục | Nội dung |
|-----|----------|
| **Document ID** | WEREAL-UC-US-002 |
| **Version** | 2.0 |
| **Ngày phát hành** | 28/07/2026 |
| **Tác giả** | BA Team / Product |
| **Người phê duyệt** | Product Owner (Pending) |
| **Phạm vi** | Toàn bộ 6 phase (26 tháng) — chi tiết Phase 1 MVP |
| **Mục đích** | Mô tả use case, user story, epic, sprint backlog, ma trận actor cho phát triển & UAT |

### 0.1 Lịch sử thay đổi

| Version | Ngày | Mô tả | Author |
|---------|------|-------|--------|
| 1.0 | 28/07/2026 | Khởi tạo catalog cơ bản (42 UC, 68 US Phase 1) | BA Team |
| 2.0 | 28/07/2026 | Mở rộng toàn diện: 58 UC, 132 US, specs Phase 1 chi tiết, epic E1–E15, sprint S0–S10 | BA Team |

### 0.2 Phân phối tài liệu

| Vai trò | Mục đích sử dụng |
|---------|------------------|
| Product Owner | Prioritization, sign-off scope |
| Tech Lead | Thiết kế API, state machine, integration |
| Dev Team | Implementation reference |
| QA Team | Test case derivation từ AC |
| Stakeholder Pilot | UAT scenario |

### 0.3 Quy ước đặt tên

| Ký hiệu | Ý nghĩa |
|---------|---------|
| **UC-XX-NN** | Use Case — module XX (GR, ID, LS, CRM, BK, PAY, COM, AI, TR, AN, MKT, UX, NW) |
| **US-XX-NN** | User Story |
| **FR-XX-NN** | Functional Requirement (SRS) |
| **NFR-XX-NN** | Non-Functional Requirement |
| **E1–E15** | Epic |
| **S0–S10** | Sprint (2 tuần/sprint) |
| **Priority** | M (Must) / S (Should) / C (Could) / W (Won't this phase) |

---

## 1. Tổng quan

### 1.1 Bối cảnh WEREAL REOS

WEREAL là **Real Estate Operating System (REOS)** — nền tảng SaaS đa tenant B2B2C phục vụ chuỗi giá trị phân phối BĐS: **Developer → Agency → Agent → Buyer**. Khác với marketplace đăng tin truyền thống, WEREAL xây dựng **Golden Record** (bảng hàng gốc), **transaction platform** (booking → payment → ledger → commission) và **AI Workforce** có guardrails.

### 1.2 Chỉ số tổng hợp v2.0

| Metric | Giá trị |
|--------|---------|
| **Tổng Use Case** | 58 (Phase 1: 28 chi tiết; Phase 2–6: 30 tóm tắt) |
| **Tổng User Story** | 132 (Phase 1: 68; Phase 2: 44; Phase 3–6: 20 tóm tắt) |
| **Module nghiệp vụ** | 13 (GR, ID, LS, CRM, BK, PAY, COM, AI, TR, AN, MKT, UX, NW) |
| **Epic** | 15 (E1–E15) |
| **Sprint Phase 1** | 11 (S0–S10) |
| **Story Points Phase 1** | ~280 SP |
| **Actors chính** | 12 vai trò + 3 hệ thống tự động |

### 1.3 Phân bổ Use Case theo Phase

| Phase | Thời gian | Use Cases | User Stories | Trọng tâm |
|-------|-----------|-----------|--------------|-----------|
| **Phase 1** | T7–T12/2026 | 28 | 68 | MVP: Golden Record, CRM, Booking, Payment, AI cơ bản |
| **Phase 2** | T1–T6/2027 | 14 | 44 | Commission, Omnichannel, Developer Portal, Mobile, E-sign |
| **Phase 3** | T7–T12/2027 | 8 | 12 | AI Agents, Trust/Dispute, Buyer App, Data Warehouse |
| **Phase 4** | T1–T6/2028 | 4 | 4 | SSO, White-label, Custom workflow, API Marketplace |
| **Phase 5** | T7–T12/2028 | 3 | 2 | Embedded finance: Escrow, BNPL, Auto payout |
| **Phase 6** | T1–T6/2029 | 1 | 2 | Immersive discovery, Multi-country prep |

### 1.4 Định nghĩa Actor (tóm tắt)

| Actor ID | Tên | Mô tả ngắn |
|--------|-----|------------|
| ACT-01 | **Buyer** | Khách mua/nhà đầu tư — tìm kiếm, lead, thanh toán cọc |
| ACT-02 | **Agent** | Môi giới/sale — CRM, listing, booking, AI copilot |
| ACT-03 | **Agency Admin** | Quản trị đại lý — phân quyền, routing, KPI team |
| ACT-04 | **Developer Admin** | Quản trị chủ đầu tư — Golden Record, policy, absorption |
| ACT-05 | **Ops Admin** | Kiểm duyệt, audit, dispute, moderation |
| ACT-06 | **Platform Admin** | Vận hành platform — tenant, billing, reconciliation |
| ACT-07 | **Finance Admin** | Kế toán platform — ledger, settlement, export |
| ACT-08 | **System (Routing)** | Engine tự động — lead routing, SLA, notification |
| ACT-09 | **System (AI)** | AI Gateway — copilot, scoring, guardrails |
| ACT-10 | **System (Payment)** | Payment orchestrator — webhook, reconciliation |
| ACT-11 | **Partner (Gateway)** | Payment gateway, e-sign, Zalo/Meta bên thứ 3 |
| ACT-12 | **Guest** | Người dùng chưa đăng nhập — browse, search, lead |

---

## 2. Danh mục Actor (Actor Catalog)

### 2.1 ACT-01: Buyer (Khách mua)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Người có nhu cầu mua/thuê BĐS, tương tác qua Public Portal hoặc Buyer App (Phase 3) |
| **Mục tiêu** | Tìm sản phẩm tin cậy, tư vấn nhanh, theo dõi giao dịch, thanh toán an toàn |
| **Portal** | Public Portal (Phase 1), Buyer App (Phase 3) |
| **Quyền (Permissions)** | Search/read listing published; submit lead form; view own booking/payment status; pay deposit via payment link; compare products; receive notification |
| **Hạn chế** | Không sửa Golden Record; không truy cập CRM nội bộ; không xem data tenant khác |
| **Use Case chính** | UC-LS-01, UC-LS-03, UC-LS-05, UC-CRM-01, UC-BK-02, UC-PAY-01, UC-UX-02 (P3) |

### 2.2 ACT-02: Agent (Môi giới / Sale)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Nhân viên kinh doanh thuộc Agency, làm việc hiện trường và online |
| **Mục tiêu** | Chốt deal, quản lý lead, tạo listing, booking, nhận hoa hồng |
| **Portal** | Agent Portal, Mobile App (Phase 2) |
| **Quyền** | CRUD listing (marketing layer); manage assigned leads; create booking; view commission (P2); use AI copilot; log CRM activities |
| **Hạn chế** | Không sửa giá Golden Record; không onboard tenant; ABAC giới hạn theo project/khu vực |
| **Use Case chính** | UC-GR-02, UC-CRM-03, UC-BK-01, UC-AI-01, UC-AI-02, UC-UX-01 (P2 mobile) |

### 2.3 ACT-03: Agency Admin (Quản trị đại lý)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Giám đốc/trưởng phòng sale của công ty đại lý |
| **Mục tiêu** | Tối ưu team sale, phân lead, theo dõi KPI, quản lý quyền bán project |
| **Portal** | Agent Portal (admin view), Marketplace (P2) |
| **Quyền** | User management trong tenant Agency; cấu hình routing rules; reassign lead; view team dashboard; apply distribution rights (P2); approve commission dispute (P2) |
| **Hạn chế** | Không truy cập Golden Record Developer; không platform-wide config |
| **Use Case chính** | UC-ID-02, UC-CRM-02, UC-AN-01, UC-MKT-02, UC-COM-01 (P2) |

### 2.4 ACT-04: Developer Admin (Quản trị chủ đầu tư)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | TP Sales Gallery / GD Kinh doanh của chủ đầu tư |
| **Mục tiêu** | Duy trì bảng hàng gốc, kiểm soát phân phối, theo dõi absorption & GMV |
| **Portal** | Developer Portal (P2 UI đầy đủ; P1 qua Admin/API) |
| **Quyền** | CRUD Golden Record; publish distribution policy (P2); view absorption report; approve agency partnership (P2); time-travel query (P2) |
| **Hạn chế** | Không can thiệp CRM Agency; không sửa commission policy Agency |
| **Use Case chính** | UC-GR-01, UC-GR-04 (P2), UC-GR-05 (P2), UC-MKT-01, UC-AN-02 |

### 2.5 ACT-05: Ops Admin (Vận hành / Kiểm duyệt)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Nhân viên vận hành platform hoặc Ops nội bộ tenant — moderation, trust |
| **Mục tiêu** | Duyệt listing, xử lý tranh chấp, audit, compliance |
| **Portal** | Admin/Ops Portal |
| **Quyền** | Listing approval/reject; view audit trail; replay transaction timeline (P2); manage dispute (P3); config moderation rules |
| **Hạn chế** | Không sửa Golden Record thay Developer; mọi action được audit |
| **Use Case chính** | UC-LS-02, UC-GR-03, UC-TR-01, UC-BK-03 (P2), UC-TR-02 (P3) |

### 2.6 ACT-06: Platform Admin (Quản trị nền tảng)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Product owner / platform operator — quản lý toàn hệ sinh thái WEREAL |
| **Mục tiêu** | Onboard tenant, SLA, billing, reconciliation, partner management |
| **Portal** | Admin Portal |
| **Quyền** | Tenant CRUD/suspend; global config; payment reconciliation; view cross-tenant analytics (aggregated); partner API keys |
| **Hạn chế** | Tuân thủ PDPA — không xem PII không cần thiết; MFA bắt buộc |
| **Use Case chính** | UC-ID-01, UC-PAY-02, UC-PAY-03 (P2), UC-AN-01 |

### 2.7 ACT-07: Finance Admin (Kế toán platform)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Kế toán/tài chính platform — đối soát, settlement, export |
| **Mục tiêu** | Ledger chính xác, đối soát 100%, chi hoa hồng batch |
| **Portal** | Admin Portal (Finance module) |
| **Quyền** | View ledger; run reconciliation; approve settlement batch (P2); export accounting CSV |
| **Use Case chính** | UC-PAY-02, UC-PAY-03, UC-COM-04 (P2) |

### 2.8 ACT-08: System (Routing Engine)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Dịch vụ tự động — lead routing, notification, SLA reminder |
| **Trigger** | Lead created, booking state change, timer expiry |
| **Use Case chính** | UC-CRM-02, UC-CRM-05 (P2), UC-BK-09 |

### 2.9 ACT-09: System (AI Gateway)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | AI service layer — copilot, lead scoring, RAG, guardrails |
| **Ràng buộc** | FR-AI-03: không mutate giá/tồn kho/booking; human-in-the-loop publish |
| **Use Case chính** | UC-AI-01, UC-AI-02, UC-AI-03 (P2), UC-AI-04 (P3) |

### 2.10 ACT-10: System (Payment Orchestrator)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Payment service — intent, webhook, ledger, reconciliation job |
| **Use Case chính** | UC-PAY-01, UC-PAY-02, UC-BK-05 |

### 2.11 ACT-11: Partner (External)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Payment gateway, Zalo OA, Meta Lead Ads, E-sign provider |
| **Use Case chính** | UC-CRM-04 (P2), UC-BK-04 (P2), UC-NW-01 (P2) |

### 2.12 ACT-12: Guest (Khách ẩn danh)

| Mục | Chi tiết |
|-----|----------|
| **Mô tả** | Người dùng chưa đăng nhập trên Public Portal |
| **Quyền** | Search, view published listing, submit lead (với consent) |
| **Use Case chính** | UC-LS-01, UC-LS-05, UC-CRM-01 |


---

## 3. Bảng Use Case tổng hợp (Full Catalog — Phase 1–6)

### 3.1 Module GR — Golden Record & Inventory

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-GR-01 | Quản lý Golden Record (Unit gốc) | Developer Admin | 1 | M | FR-GR-01, FR-GR-02 |
| UC-GR-02 | Tạo listing marketing từ unit gốc | Agent | 1 | M | FR-GR-03, FR-GR-04 |
| UC-GR-03 | Kiểm tra anti-drift listing | System, Ops Admin | 1 | M | FR-GR-04, FR-GR-05 |
| UC-GR-04 | Xem Product Graph & quan hệ unit | Developer Admin | 1 | M | FR-GR-01 |
| UC-GR-05 | Xem lịch sử giá/tồn kho (time-travel) | Developer Admin | 2 | S | FR-GR-06 |
| UC-GR-06 | Import bảng hàng bulk Excel/CSV | Developer Admin | 2 | S | FR-GR-07 |
| UC-GR-07 | Real-time push trạng thái unit (SSE) | System, All portals | 1 | M | FR-GR-08 |

### 3.2 Module ID — Identity & Tenant

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-ID-01 | Onboarding tenant Developer/Agency | Platform Admin | 1 | M | FR-ID-01 |
| UC-ID-02 | Phân quyền user theo role/project | Agency Admin, Developer Admin | 1 | M | FR-ID-02 |
| UC-ID-03 | Đăng nhập, refresh token & MFA | All users | 1 | M | FR-ID-04 |
| UC-ID-04 | Quản lý user trong tenant | Agency Admin, Developer Admin | 1 | M | FR-ID-02 |
| UC-ID-05 | KYC/KYB Agency và Developer | Platform Admin | 2 | S | FR-ID-05 |
| UC-ID-06 | SSO Enterprise SAML/OIDC | Enterprise User | 4 | C | FR-ID-06 |

### 3.3 Module LS — Listing, Search & Public Portal

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-LS-01 | Tìm kiếm & lọc sản phẩm | Buyer, Guest | 1 | M | FR-LS-02 |
| UC-LS-02 | Duyệt listing trước publish | Ops Admin | 1 | M | FR-LS-01 |
| UC-LS-03 | So sánh sản phẩm (2–3 unit) | Buyer | 1 | S | FR-LS-04 |
| UC-LS-04 | Upload media listing (ảnh/video) | Agent | 1 | M | FR-LS-03 |
| UC-LS-05 | Xem trang chi tiết project/unit | Buyer, Guest | 1 | M | FR-UX-01 |
| UC-LS-06 | Phát hiện listing trùng lặp | System, Ops Admin | 2 | S | FR-LS-05 |
| UC-LS-07 | Đồng bộ search index từ Golden Record | System | 1 | M | FR-LS-06 |

### 3.4 Module CRM — CRM & Lead Management

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-CRM-01 | Gửi yêu cầu tư vấn (lead form) | Buyer, Guest | 1 | M | FR-CRM-01, FR-CRM-02 |
| UC-CRM-02 | Phân công lead cho agent (routing) | System, Agency Admin | 1 | M | FR-CRM-03 |
| UC-CRM-03 | Quản lý pipeline & CRM activities | Agent | 1 | M | FR-CRM-04, FR-CRM-05 |
| UC-CRM-04 | Import lead thủ công (CSV/walk-in) | Agent, Agency Admin | 1 | S | FR-CRM-01 |
| UC-CRM-05 | Sync lead từ Zalo OA / Meta Lead Ads | System | 2 | M | FR-CRM-06, FR-CRM-07 |
| UC-CRM-06 | Nhắc SLA follow-up & escalation | System | 2 | S | FR-CRM-08 |
| UC-CRM-07 | Unified inbox đa kênh | Agent | 3 | C | FR-CRM-09 |

### 3.5 Module BK — Booking & Transaction

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-BK-01 | Tạo booking/giữ chỗ với expiry | Agent | 1 | M | FR-BK-01, FR-BK-02 |
| UC-BK-02 | Theo dõi trạng thái giao dịch | Agent, Buyer, Developer Admin | 1 | M | FR-BK-03 |
| UC-BK-03 | Xem domain event timeline giao dịch | Ops Admin, Agent | 1 | M | FR-BK-04 |
| UC-BK-04 | Replay timeline giao dịch (dispute evidence) | Ops Admin | 2 | S | FR-BK-04 |
| UC-BK-05 | Hủy booking & khởi tạo hoàn tiền | Agent, Ops Admin | 1 | M | FR-BK-07 |
| UC-BK-06 | Tạo hợp đồng từ template | Agent, System | 2 | S | FR-BK-05 |
| UC-BK-07 | Ký hợp đồng điện tử | Buyer, Agent | 2 | S | FR-BK-06 |
| UC-BK-08 | Custom workflow giao dịch theo tenant | Platform Admin | 4 | C | FR-BK-08 |

### 3.6 Module PAY — Payment & Finance

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-PAY-01 | Tạo & thanh toán cọc online | Buyer | 1 | M | FR-PAY-01, FR-PAY-02, FR-PAY-05 |
| UC-PAY-02 | Đối soát thanh toán hàng ngày | Platform Admin, Finance Admin | 1 | M | FR-PAY-04 |
| UC-PAY-03 | Xử lý refund & ledger reversal | System, Finance Admin | 1 | M | FR-PAY-02, FR-BK-07 |
| UC-PAY-04 | Chi hoa hồng batch settlement | Finance Admin | 2 | M | FR-PAY-07, FR-COM-05 |
| UC-PAY-05 | Multi-gateway routing & fallback | System | 3 | S | FR-PAY-06 |
| UC-PAY-06 | Escrow thông minh conditional release | Buyer, Developer Admin | 5 | C | FR-PAY-08 |
| UC-PAY-07 | BNPL / trả góp theo đợt | Buyer | 5 | C | FR-PAY-09 |

### 3.7 Module COM — Commission

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-COM-01 | Cấu hình commission policy theo project | Developer Admin | 2 | M | FR-COM-01 |
| UC-COM-02 | Snapshot policy tại thời điểm chốt deal | System | 2 | M | FR-COM-02 |
| UC-COM-03 | Split commission nhiều agent/agency | System, Finance Admin | 2 | S | FR-COM-03 |
| UC-COM-04 | Holdback khi tranh chấp | Ops Admin, Finance Admin | 2 | S | FR-COM-04 |
| UC-COM-05 | Export báo cáo hoa hồng kế toán | Finance Admin | 2 | M | FR-COM-05 |

### 3.8 Module AI — AI Layer

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-AI-01 | Tạo nội dung listing bằng AI copilot | Agent | 1 | M | FR-AI-01, FR-AI-04 |
| UC-AI-02 | Chấm điểm & ưu tiên lead | System, Agent | 1 | M | FR-AI-02 |
| UC-AI-03 | Tra cứu tài liệu pháp lý (RAG) | Agent | 2 | S | FR-AI-05 |
| UC-AI-04 | AI Sales Agent draft reply | Agent | 3 | S | FR-AI-07 |
| UC-AI-05 | AI phát hiện listing bất thường | Ops Admin, System | 3 | S | FR-AI-08, FR-AI-10 |
| UC-AI-06 | Buyer-product matching gợi ý | Buyer, System | 2 | S | FR-AI-06 |
| UC-AI-07 | Buyer conversational discovery | Buyer | 3 | C | FR-AI-09 |

### 3.9 Module TR — Trust & Compliance

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-TR-01 | Xem audit trail toàn hệ thống | Ops Admin, Platform Admin | 1 | M | FR-TR-01, FR-TR-05 |
| UC-TR-02 | Quản lý kho tài liệu (Document Vault) | Developer Admin, Ops Admin | 2 | S | FR-TR-02 |
| UC-TR-03 | Quản lý tranh chấp (Dispute Center) | Ops Admin, Buyer, Agent | 3 | S | FR-TR-03 |
| UC-TR-04 | Regulatory Export Pack | Platform Admin | 4 | C | FR-TR-04 |

### 3.10 Module AN — Analytics & Intelligence

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-AN-01 | Xem dashboard funnel & KPI | Agency Admin, Platform Admin | 1 | M | FR-AN-01 |
| UC-AN-02 | Báo cáo GMV & doanh thu platform | Platform Admin, Developer Admin | 2 | M | FR-AN-02 |
| UC-AN-03 | Báo cáo absorption & tồn kho | Developer Admin | 2 | S | FR-AN-03 |
| UC-AN-04 | Campaign attribution đa kênh | Developer Admin, Agency Admin | 3 | S | FR-AN-04 |
| UC-AN-05 | Dự báo absorption 30/60/90 ngày | Developer Admin | 3 | C | FR-AN-05 |

### 3.11 Module MKT — Marketplace & Distribution

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-MKT-01 | Publish policy phân phối project | Developer Admin | 2 | S | FR-MKT-01 |
| UC-MKT-02 | Agency apply/approve quyền bán project | Agency Admin, Developer Admin | 2 | S | FR-MKT-02 |
| UC-MKT-03 | Leaderboard & compliance score agency | Developer Admin | 3 | C | FR-MKT-03 |
| UC-MKT-04 | Marketplace ranking & SLA penalty | Platform Admin | 6 | C | FR-MKT-03 |

### 3.12 Module UX — Experience Layer

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-UX-01 | Agent làm việc hiện trường (Mobile/PWA) | Agent | 2 | S | FR-UX-05 |
| UC-UX-02 | Buyer theo dõi deal & notification | Buyer | 3 | C | FR-UX-06 |
| UC-UX-03 | Admin quản lý tenant & moderation | Platform Admin, Ops Admin | 1 | M | FR-UX-03 |
| UC-UX-04 | Developer Portal quản lý project | Developer Admin | 2 | M | FR-UX-04 |
| UC-UX-05 | White-label portal theo tenant | Platform Admin | 4 | C | FR-UX-07 |
| UC-UX-06 | Immersive discovery 3D/Map | Buyer | 6 | C | FR-UX-01 |

### 3.13 Module NW — Network & Omnichannel

| ID | Tên Use Case | Actor chính | Phase | Priority | FR liên kết |
|----|--------------|-------------|-------|----------|-------------|
| UC-NW-01 | Tích hợp Zalo OA/ZNS notification | System, Agent | 2 | M | FR-CRM-06 |
| UC-NW-02 | Tích hợp Meta Lead Ads webhook | System | 2 | M | FR-CRM-07 |
| UC-NW-03 | SMS gateway thông báo giao dịch | System, Buyer | 2 | S | FR-CRM-06 |
| UC-NW-04 | API Marketplace partner webhook | Partner, Platform Admin | 4 | C | — |
| UC-NW-05 | Webhook platform cho tenant | Developer Admin | 4 | C | — |

**Tổng catalog:** 58 Use Cases | 13 modules | Phase 1–6


## 4. Đặc tả Use Case chi tiết — Phase 1 (MVP)

> Phase 1 gồm **28 Use Case** được mô tả đầy đủ. Mỗi UC bao gồm luồng chính, thay thế, ngoại lệ, business rules và liên kết FR/US.


### UC-GR-01: Quản lý Golden Record (Unit gốc)

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-GR-01 |
| **Tên** | Quản lý Golden Record (Unit gốc) |
| **Mục tiêu (Goal)** | Developer duy trì bảng hàng gốc là single source of truth cho mọi kênh phân phối |
| **Actor chính** | Developer Admin |
| **Actor phụ** | System (Search Sync) |
| **Preconditions** | Tenant Developer đã onboard; user có role Developer Admin; project đã tạo |
| **Postconditions** | Unit được lưu với đầy đủ thuộc tính; version snapshot được tạo; search index được cập nhật |
| **Trigger** | Developer Admin chọn 'Quản lý bảng hàng' trên Developer Portal |

**Luồng chính (Main Flow):**

1. Developer Admin đăng nhập portal với MFA (nếu cấu hình)
2. Chọn Project cần quản lý
3. Hệ thống hiển thị danh sách unit với trạng thái available/reserved/sold
4. Developer thực hiện Create/Update/Delete unit (block, tầng, hướng, diện tích, giá, loại hình)
5. Hệ thống validate dữ liệu bắt buộc và business rules (giá > 0, status hợp lệ)
6. Hệ thống lưu unit + tạo version snapshot (price, status, policy tại thời điểm T)
7. Phát domain event UnitUpdated; CDC sync sang OpenSearch index
8. Hiển thị xác nhận thành công và audit log entry

**Luồng thay thế (Alternative Flows):**

- 4a. Developer chọn 'Xem lịch sử' → hiển thị version timeline của unit
- 4b. Developer filter theo block/tầng/trạng thái trước khi edit

**Luồng ngoại lệ (Exception Flows):**

- 5a. Validation fail → hiển thị lỗi field-level, không lưu
- 5b. Unit đang reserved/sold → chặn delete; chỉ cho phép status transition hợp lệ
- 7a. Search sync lag > 5s → alert Ops, retry outbox

**Quy tắc nghiệp vụ (Business Rules):**

- BR-GR-01: Mỗi unit thuộc duy nhất 1 project trong 1 Developer tenant
- BR-GR-02: Mọi thay đổi giá phải tạo version record immutable
- BR-GR-03: Status transition: available→reserved→sold; reserved→available chỉ qua cancel booking
- BR-GR-04: tenant_id bắt buộc mọi query — RLS enforce

**NFR liên quan:** NFR-P04, NFR-S02, NFR-S06
**FR liên kết:** FR-GR-01, FR-GR-02, FR-GR-08

**User Stories liên quan:**

| ID | User Story | Priority |
|----|------------|----------|
| US-GR-01 | CRUD unit Golden Record | M |
| US-GR-02 | Price/inventory versioning | M |
| US-GR-03 | Real-time unit status display | M |
| US-GR-07 | Inventory snapshot for audit | M |
| US-GR-10 | Product Graph relations | M |
| US-GR-13 | Golden Record API tenant isolated | M |

---

### UC-GR-02: Tạo listing marketing từ unit gốc

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-GR-02 |
| **Tên** | Tạo listing marketing từ unit gốc |
| **Mục tiêu (Goal)** | Agent tạo lớp nội dung marketing bám Golden Record, không drift giá/trạng thái |
| **Actor chính** | Agent |
| **Actor phụ** | System (Anti-drift), System (AI) |
| **Preconditions** | Agent đã đăng nhập; có quyền bán project (distribution rights); unit status = available |
| **Postconditions** | Listing ở trạng thái Draft hoặc Pending Review; giá gốc read-only; anti-drift pass |
| **Trigger** | Agent chọn 'Tạo listing mới' từ unit trên bảng hàng |

**Luồng chính (Main Flow):**

1. Agent mở Agent Portal → Listing Management → 'Tạo từ Golden Record'
2. Chọn project và unit available từ dropdown (chỉ unit có quyền bán)
3. Hệ thống pre-fill giá, diện tích, trạng thái từ Golden Record (read-only fields)
4. Agent nhập mô tả marketing, headline, upload ảnh/video (UC-LS-04)
5. (Optional) Agent mở AI Copilot → generate draft → review → approve (UC-AI-01)
6. Agent click Submit
7. Hệ thống chạy anti-drift check: so sánh listing vs Golden Record
8. Nếu pass → chuyển Pending Review; notify Ops Admin queue
9. Audit log ghi agent_id, unit_id, timestamp

**Luồng thay thế (Alternative Flows):**

- 5a. Agent bỏ qua AI → nhập thủ công mô tả
- 6a. Agent Save Draft → lưu Draft, không cần anti-drift full pass

**Luồng ngoại lệ (Exception Flows):**

- 7a. Anti-drift fail → block submit, highlight field lệch, hiển thị giá gốc đúng
- 2a. Unit không còn available → ẩn khỏi dropdown, thông báo 'Unit đã được giữ chỗ'
- 4a. Upload media fail → retry; file > limit → reject với message

**Quy tắc nghiệp vụ (Business Rules):**

- BR-GR-05: Agent không thể override price/status từ Golden Record
- BR-GR-06: Listing phải reference unit_id — không tạo listing orphan
- BR-GR-07: Một unit có thể có nhiều listing (multi-agency) nhưng cùng giá gốc

**NFR liên quan:** NFR-U02, NFR-P04
**FR liên kết:** FR-GR-03, FR-GR-04, FR-LS-01

**User Stories liên quan:**

| ID | User Story | Priority |
|----|------------|----------|
| US-GR-04 | Listing from Golden Record only | M |
| US-GR-05 | Anti-drift validation | M |
| US-GR-12 | Block edit price on listing form | M |
| US-CRM-14 | Agent portal listing management | M |

---

### UC-GR-03: Kiểm tra anti-drift listing

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-GR-03 |
| **Tên** | Kiểm tra anti-drift listing |
| **Mục tiêu (Goal)** | Hệ thống tự động phát hiện và chặn listing lệch so với Golden Record |
| **Actor chính** | System |
| **Actor phụ** | Ops Admin |
| **Preconditions** | Listing được submit hoặc scheduled re-check; Golden Record unit tồn tại |
| **Postconditions** | Listing pass (Verified badge eligible) hoặc bị block/flag với lý do cụ thể |
| **Trigger** | Event ListingSubmitted hoặc cron re-validation khi Golden Record thay đổi |

**Luồng chính (Main Flow):**

1. Nhận event ListingSubmitted với listing_id và unit_id
2. Load Golden Record snapshot hiện tại của unit
3. Load listing data (price display, status claim, attributes marketing)
4. So sánh: giá marketing vs giá gốc; trạng thái claim vs inventory thực
5. Nếu khớp 100% → mark anti_drift_status = PASS; eligible Verified badge
6. Nếu lệch → mark FAIL; block publish; notify Agent và Ops
7. Ops Admin xem queue listing bị flag → approve exception hoặc reject
8. Ghi audit: check result, diff fields, timestamp

**Luồng thay thế (Alternative Flows):**

- 6a. Lệch nhẹ (mô tả wording) → warning, vẫn cho submit nếu price/status khớp
- 7a. Ops approve exception → listing proceed với flag 'Manual Override'

**Luồng ngoại lệ (Exception Flows):**

- 3a. Golden Record unit deleted → auto-reject listing
- 4a. Timeout Golden Record fetch → retry 3 lần, fail safe = block publish

**Quy tắc nghiệp vụ (Business Rules):**

- BR-GR-08: Anti-drift chạy synchronously trước mọi publish transition
- BR-GR-09: Khi Golden Record đổi giá → re-check tất cả listing active của unit

**NFR liên quan:** NFR-P04, NFR-C01
**FR liên kết:** FR-GR-04, FR-GR-05

**User Stories liên quan:**

| ID | User Story | Priority |
|----|------------|----------|
| US-GR-05 | Anti-drift validation | M |
| US-GR-06 | Verified Listing badge | S |
| US-TR-04 | Listing moderation queue | M |

---

### UC-GR-04: Xem Product Graph & quan hệ unit

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-GR-04 |
| **Tên** | Xem Product Graph & quan hệ unit |
| **Mục tiêu (Goal)** | Developer và Agent hiểu cấu trúc phân cấp sản phẩm và quan hệ graph |
| **Actor chính** | Developer Admin |
| **Actor phụ** | Agent (read-only theo quyền) |
| **Preconditions** | Product Graph đã được cấu hình: Developer→Project→Phase→Building→Unit |
| **Postconditions** | User thấy cây phân cấp và có thể navigate/filter theo graph |
| **Trigger** | User mở 'Product Graph' hoặc breadcrumb trên trang unit |

**Luồng chính (Main Flow):**

1. User đăng nhập portal tương ứng (Developer/Agent)
2. Hệ thống load graph: Developer → Project → Phase → Building → Unit
3. Hiển thị cây phân cấp với số lượng unit theo trạng thái mỗi node
4. User click node → filter danh sách unit/listing bên dưới
5. User click unit leaf → mở chi tiết Golden Record hoặc listing
6. Graph highlight quan hệ: unit thuộc building nào, phase nào, policy nào

**Luồng thay thế (Alternative Flows):**

- 3a. Agent view → chỉ thấy project có distribution rights
- 4a. Export graph snapshot PDF cho báo cáo nội bộ (P2)

**Luồng ngoại lệ (Exception Flows):**

- 2a. Graph data incomplete → hiển thị warning, cho phép view flat list fallback

**Quy tắc nghiệp vụ (Business Rules):**

- BR-GR-10: Mỗi unit gắn duy nhất 1 building trong 1 phase
- BR-GR-11: Graph query filter tenant_id

**NFR liên quan:** NFR-P01
**FR liên kết:** FR-GR-01

**User Stories liên quan:**

| ID | User Story | Priority |
|----|------------|----------|
| US-GR-10 | Product Graph relations | M |
| US-GR-03 | Real-time unit status display | M |

---
### UC-GR-07: Real-time push trạng thái unit (SSE)

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-GR-07 |
| **Tên** | Real-time push trạng thái unit (SSE) |
| **Goal** | Cập nhật UI agent/public ≤5s khi inventory thay đổi |
| **Actor chính** | System |
| **Actor phụ** | Agent, Buyer, Developer Admin |
| **Preconditions** | SSE channel configured; unit status changed event emitted |
| **Postconditions** | Connected clients nhận event và refresh UI |
| **Trigger** | Domain event UnitStatusChanged published |

**Main Flow:**
1. Event UnitStatusChanged emitted từ Booking/Payment/Golden Record service
2. SSE broadcaster push message tới channel tenant+project+unit
3. Agent Portal và Public Portal subscribers nhận payload {unit_id, old_status, new_status, timestamp}
4. Client UI update badge/status không cần full page reload
5. Metric ghi sync lag; alert nếu > NFR-P04 threshold

**Alternative:**
- 3a. Client offline → reconnect và fetch latest state on reconnect

**Exception:**
- 2a. SSE connection drop → client fallback polling mỗi 30s

**Business Rules:**
- BR-GR-12: SSE payload không chứa PII buyer
- BR-GR-13: Chỉ push status public-safe tới Public Portal

**NFR:** NFR-P04 | **FR:** FR-GR-08

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-GR-09 | SSE push unit status change | M |
| US-GR-03 | Real-time unit status display | M |

---

### UC-ID-01: Onboarding tenant Developer/Agency

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-ID-01 |
| **Tên** | Onboarding tenant Developer/Agency |
| **Goal** | Platform Admin tạo tenant mới với hierarchy và config cơ bản |
| **Actor chính** | Platform Admin |
| **Actor phụ** | System |
| **Preconditions** | Platform Admin authenticated with MFA; tenant slug unique |
| **Postconditions** | Tenant active với admin user đầu tiên; RLS policies applied; subscription tier set |
| **Trigger** | Platform Admin click 'Tạo tenant mới' |

**Main Flow:**
1. Platform Admin mở Admin Portal → Tenant Management → Create
2. Chọn loại tenant: Developer hoặc Agency; nhập tên, slug, contact
3. Hệ thống validate slug unique, email format
4. Tạo tenant record + default roles + admin user invitation email
5. Apply RLS policies và tenant middleware config
6. Log audit TenantCreated; notify Platform team
7. Admin tenant nhận email invite → set password → first login

**Alternative:**
- 4a. Import tenant từ template pilot config

**Exception:**
- 3a. Slug trùng → reject
- 5a. Email invite fail → retry queue

**Business Rules:**
- BR-ID-01: Mỗi tenant isolated — shared DB + RLS
- BR-ID-02: Onboarding ≤ 1 ngày làm việc (NFR-U04)

**NFR:** NFR-U04, NFR-S02 | **FR:** FR-ID-01

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-ID-01 | Tenant onboarding Developer | M |
| US-ID-02 | Tenant onboarding Agency | M |
| US-UX-03 | Admin tenant management | M |

---

### UC-ID-02: Phân quyền user theo role/project

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-ID-02 |
| **Tên** | Phân quyền user theo role/project |
| **Goal** | Agency/Developer Admin gán role và scope project cho user |
| **Actor chính** | Agency Admin, Developer Admin |
| **Actor phụ** | System |
| **Preconditions** | Admin có quyền user management trong tenant; roles predefined |
| **Postconditions** | User permissions updated; effective immediately on next API call |
| **Trigger** | Admin mở User Management → Edit permissions |

**Main Flow:**
1. Admin chọn user cần phân quyền
2. Chọn role: Agent, Agency Admin, Viewer, etc.
3. Gán scope: project list, khu vực (ABAC Phase 2)
4. Preview effective permissions
5. Confirm → lưu role assignment + scope
6. Invalidate user session cache
7. Audit log PermissionChanged
8. User nhận notification (optional)

**Alternative:**
- 3a. Bulk assign cho team sale mới

**Exception:**
- 4a. Remove all project scope → user không access inventory

**Business Rules:**
- BR-ID-03: Least privilege — Agent chỉ thấy assigned leads + permitted projects
- BR-ID-04: Role change không retroactive cho audit logs

**NFR:** NFR-S07 | **FR:** FR-ID-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-ID-04 | RBAC roles enforcement | M |
| US-ID-08 | Admin user management | M |

---

### UC-ID-03: Đăng nhập, refresh token & MFA

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-ID-03 |
| **Tên** | Đăng nhập, refresh token & MFA |
| **Goal** | User xác thực an toàn; MFA cho hành động nhạy cảm |
| **Actor chính** | All users |
| **Actor phụ** | System |
| **Preconditions** | User account active; credentials hoặc SSO (P4) configured |
| **Postconditions** | Valid JWT issued; refresh token stored; MFA verified nếu required |
| **Trigger** | User truy cập portal login page hoặc API auth endpoint |

**Main Flow:**
1. User nhập email/password
2. Hệ thống validate credentials + tenant context
3. Issue access JWT (short TTL) + refresh token (httpOnly cookie)
4. User thực hiện hành động nhạy cảm (payment, admin delete) → trigger MFA OTP
5. User nhập OTP → verify → action proceeds
6. Logout → revoke refresh token; audit LoginSuccess/Logout

**Alternative:**
- 2a. Remember device → skip MFA 30 ngày (configurable)
- 4a. SSO redirect (Phase 4)

**Exception:**
- 2a. Wrong password 5 lần → lock 15 phút
- 4a. OTP fail 3 lần → lock MFA 15 phút

**Business Rules:**
- BR-ID-05: MFA bắt buộc payment và Platform Admin actions
- BR-ID-06: JWT chứa tenant_id claim

**NFR:** NFR-S05, NFR-S01 | **FR:** FR-ID-04

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-ID-03 | JWT login/logout/refresh | M |
| US-ID-07 | MFA OTP payment action | M |

---

### UC-ID-04: Quản lý user trong tenant

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-ID-04 |
| **Tên** | Quản lý user trong tenant |
| **Goal** | Admin CRUD user, invite, deactivate trong phạm vi tenant |
| **Actor chính** | Agency Admin, Developer Admin |
| **Actor phụ** | System |
| **Preconditions** | Admin có role user management |
| **Postconditions** | User created/updated/deactivated; audit logged |
| **Trigger** | Admin action trên User Management module |

**Main Flow:**
1. Admin xem danh sách user tenant
2. Invite user mới qua email
3. Edit profile, role, status
4. Deactivate user → revoke sessions
5. Reactivate user
6. Export user list (P2)

**Alternative:**
- 2a. Import users CSV bulk

**Exception:**
- 4a. Deactivate user có booking active → warning, require reassignment

**Business Rules:**
- BR-ID-07: Deactivated user không login; data ownership retained for audit

**NFR:** NFR-S07 | **FR:** FR-ID-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-ID-08 | Admin user management | M |

---

### UC-LS-01: Tìm kiếm & lọc sản phẩm

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-01 |
| **Tên** | Tìm kiếm & lọc sản phẩm |
| **Goal** | Buyer/Guest tìm BĐS theo đa tiêu chí nhanh chóng |
| **Actor chính** | Buyer, Guest |
| **Actor phụ** | System (OpenSearch) |
| **Preconditions** | Public portal live; ≥1 published listing indexed |
| **Postconditions** | Kết quả search phù hợp filter; P95 ≤200ms |
| **Trigger** | User nhập query hoặc chọn filter trên Public Portal |

**Main Flow:**
1. User mở Public Portal homepage
2. Nhập keyword hoặc chọn facet: khu vực, giá, loại, diện tích
3. Optional: geo radius search trên bản đồ
4. OpenSearch query với filter availability=published+available/reserved display
5. Trả kết quả paginated với thumbnail, giá, badge Verified
6. User sort theo giá, mới nhất, relevance
7. Click kết quả → UC-LS-05 detail page

**Alternative:**
- 3a. Save search (P3 Buyer App)
- 4a. Zero results → gợi ý filter nới rộng

**Exception:**
- 4a. Search timeout → fallback cached popular listings

**Business Rules:**
- BR-LS-01: Chỉ listing Published hiển thị
- BR-LS-02: Sold unit ẩn hoặc badge Sold

**NFR:** NFR-P03, NFR-U03 | **FR:** FR-LS-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-01 | Full-text + facet search | M |
| US-LS-06 | Full-text + facet search | M |
| US-LS-07 | Geo search | S |

---

### UC-LS-02: Duyệt listing trước publish

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-02 |
| **Tên** | Duyệt listing trước publish |
| **Goal** | Ops Admin review và approve/reject listing trước khi public |
| **Actor chính** | Ops Admin |
| **Actor phụ** | Agent, System |
| **Preconditions** | Listing status = Pending Review; anti-drift đã chạy |
| **Postconditions** | Listing Published hoặc Rejected với lý do |
| **Trigger** | Listing vào moderation queue |

**Main Flow:**
1. Ops mở Admin Portal → Moderation Queue
2. Xem listing detail side-by-side Golden Record
3. Review media, mô tả, compliance (quảng cáo BĐS VN)
4. Approve → status Published → sync search index
5. Reject → nhập lý do → notify Agent
6. Audit ModerationDecision logged

**Alternative:**
- 3a. Bulk approve listing cùng project đã verified

**Exception:**
- 4a. Approve listing anti-drift FAIL → block unless override flag

**Business Rules:**
- BR-LS-03: Mọi listing phải qua moderation Phase 1
- BR-LS-04: Reject lý do bắt buộc

**NFR:** NFR-C01 | **FR:** FR-LS-01

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-09 | Listing approval workflow | M |
| US-TR-04 | Listing moderation queue | M |

---

### UC-LS-03: So sánh sản phẩm

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-03 |
| **Tên** | So sánh sản phẩm |
| **Goal** | Buyer so sánh 2–3 căn side-by-side |
| **Actor chính** | Buyer, Guest |
| **Actor phụ** | System |
| **Preconditions** | User đã xem ≥2 listing; compare feature enabled |
| **Postconditions** | Compare table hiển thị thuộc tính chính |
| **Trigger** | User click 'So sánh' trên listing card |

**Main Flow:**
1. User browse search results hoặc detail page
2. Click 'Thêm vào so sánh' (max 3 units)
3. Mở panel Compare với bảng: giá, diện tích, hướng, tầng, phí, badge Verified
4. Highlight diff giữa các cột
5. User remove/add unit trong compare list
6. CTA 'Đăng ký tư vấn' trên từng cột → UC-CRM-01

**Alternative:**
- 2a. Share compare link (P3)

**Exception:**
- 2a. Unit sold while comparing → badge Sold, disable book CTA

**Business Rules:**
- BR-LS-05: Compare chỉ published listings
- BR-LS-06: Max 3 units per session

**NFR:** NFR-U03 | **FR:** FR-LS-04

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-04 | Compare products UI | S |
| US-LS-11 | Compare products UI | S |

---

### UC-LS-04: Upload media listing

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-04 |
| **Tên** | Upload media listing |
| **Goal** | Agent upload ảnh/video cho listing marketing |
| **Actor chính** | Agent |
| **Actor phụ** | System (S3) |
| **Preconditions** | Listing Draft exists; agent có quyền edit |
| **Postconditions** | Media attached to listing; CDN URLs generated |
| **Trigger** | Agent click Upload trên listing form |

**Main Flow:**
1. Agent chọn file ảnh/video từ device
2. Client validate size/format (jpg,png,webp; mp4 max duration)
3. Presigned URL upload to S3
4. Progress bar; retry on fail
5. Thumbnail auto-generate
6. Media gallery order drag-drop
7. Save listing → media linked

**Alternative:**
- 2a. Bulk upload nhiều ảnh

**Exception:**
- 2a. File virus scan fail → reject
- 3a. Upload timeout → resume multipart

**Business Rules:**
- BR-LS-07: Max 20 ảnh/listing Phase 1
- BR-LS-08: Watermark optional Phase 2

**NFR:** NFR-P02 | **FR:** FR-LS-03

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-10 | Media upload S3 | M |

---

### UC-LS-05: Xem trang chi tiết project/unit

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-05 |
| **Tên** | Xem trang chi tiết project/unit |
| **Goal** | Buyer/Guest xem thông tin đầy đủ sản phẩm và CTA |
| **Actor chính** | Buyer, Guest |
| **Actor phụ** | System |
| **Preconditions** | Listing Published; SEO slug valid |
| **Postconditions** | Page viewed; analytics event logged; lead CTA available |
| **Trigger** | User click listing từ search hoặc direct URL |

**Main Flow:**
1. Load listing + Golden Record data merged
2. Hiển thị gallery, giá, spec, map, badge Verified
3. Hiển thị availability status real-time (SSE)
4. Related units cùng project
5. CTA: Đăng ký tư vấn, So sánh, Share
6. Log UnitViewed domain event cho attribution

**Alternative:**
- 4a. 3D tour embed (Phase 6)

**Exception:**
- 1a. Listing unpublished mid-view → 404 friendly

**Business Rules:**
- BR-LS-09: Giá hiển thị = Golden Record price
- BR-LS-10: Lead form ≤3 click (NFR-U03)

**NFR:** NFR-U03, NFR-P01 | **FR:** FR-UX-01

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-08 | Public project/unit detail page | M |
| US-LS-12 | Lead form on detail page | M |

---

### UC-LS-07: Đồng bộ search index từ Golden Record

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-LS-07 |
| **Tên** | Đồng bộ search index từ Golden Record |
| **Goal** | CDC đảm bảo search phản ánh inventory thực |
| **Actor chính** | System |
| **Actor phụ** | Ops Admin (monitor) |
| **Preconditions** | Kafka/outbox configured; OpenSearch cluster healthy |
| **Postconditions** | Search index consistent với Golden Record ≤5s lag |
| **Trigger** | Domain event UnitUpdated/ListingPublished |

**Main Flow:**
1. Consumer nhận event từ outbox/Kafka
2. Transform payload → search document schema
3. Upsert/delete OpenSearch document
4. Verify index count vs source (health check)
5. Metric sync_lag_ms; alert if threshold exceeded

**Alternative:**
- 2a. Bulk reindex job nightly

**Exception:**
- 3a. OpenSearch unavailable → dead letter queue retry

**Business Rules:**
- BR-LS-11: Idempotent consumer — same event twice = same result

**NFR:** NFR-P04 | **FR:** FR-LS-06

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-LS-13 | Search sync from inventory events | M |
| US-LS-05 | OpenSearch index setup | M |

---
### UC-CRM-01: Gửi yêu cầu tư vấn (lead form)

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-CRM-01 |
| **Tên** | Gửi yêu cầu tư vấn (lead form) |
| **Goal** | Buyer capture nhu cầu mua nhanh từ Public Portal |
| **Actor chính** | Buyer, Guest |
| **Actor phụ** | System (AI Scoring) |
| **Preconditions** | Listing Published; consent checkbox PDPA |
| **Postconditions** | Lead created gắn unit/listing/campaign; confirmation shown |
| **Trigger** | Buyer click 'Đăng ký tư vấn' trên detail page |

**Main Flow:**
1. Buyer xem unit detail (UC-LS-05)
2. Click CTA 'Đăng ký tư vấn' (click 1)
3. Form popup: name, phone, email optional, note (click 2)
4. Tick consent PDPA
5. Submit (click 3)
6. Validate phone format; create Lead record gắn unit_id, listing_id, UTM source
7. Trigger AI lead scoring (UC-AI-02); trigger routing (UC-CRM-02)
8. Buyer thấy trang xác nhận; optional email/SMS confirmation

**Alternative:**
- 3a. Pre-fill phone nếu Buyer logged in (P3)

**Exception:**
- 5a. Duplicate phone same unit 24h → merge/update existing lead
- 6a. Scoring timeout → lead vẫn tạo, score pending

**Business Rules:**
- BR-CRM-01: Lead form ≤3 click (NFR-U03)
- BR-CRM-02: Consent bắt buộc trước submit
- BR-CRM-03: Mọi lead gắn source attribution

**NFR:** NFR-U03, NFR-P06 | **FR:** FR-CRM-01, FR-CRM-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-CRM-01 | Lead form ≤3 click | M |
| US-CRM-07 | Lead capture API | M |
| US-LS-12 | Lead form on detail page | M |

---

### UC-CRM-02: Phân công lead cho agent (routing)

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-CRM-02 |
| **Tên** | Phân công lead cho agent (routing) |
| **Goal** | Lead tự động assign agent phù hợp theo rules |
| **Actor chính** | System (Routing) |
| **Actor phụ** | Agency Admin |
| **Preconditions** | Lead created; routing rules configured for tenant |
| **Postconditions** | Lead assigned to agent; notification sent |
| **Trigger** | Event LeadCreated |

**Main Flow:**
1. Load routing rules: project, khu vực, round-robin, skill (P2)
2. Filter agent pool có quyền project + available
3. Apply AI score priority: hot lead → senior agent (US-AI-05)
4. Assign lead owner_id
5. Emit LeadAssigned event
6. Notify agent via email/in-app
7. Update CRM dashboard

**Alternative:**
- 3a. No agent available → queue unassigned + alert Agency Admin
- 3b. Manual assign by Agency Admin

**Exception:**
- 2a. Rule misconfiguration → fallback default pool + Ops alert

**Business Rules:**
- BR-CRM-04: Một lead một primary owner tại 1 thời điểm
- BR-CRM-05: Reassign phải audit lý do

**NFR:** NFR-P06 | **FR:** FR-CRM-03

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-CRM-03 | Lead routing rules engine | M |
| US-CRM-08 | Lead routing rules engine | M |
| US-CRM-12 | Lead assign/reassign | M |
| US-CRM-13 | Email notify new lead | M |

---

### UC-CRM-03: Quản lý pipeline & CRM activities

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-CRM-03 |
| **Tên** | Quản lý pipeline & CRM activities |
| **Goal** | Agent theo dõi và nurture lead qua pipeline |
| **Actor chính** | Agent |
| **Actor phụ** | Agency Admin (view team) |
| **Preconditions** | Lead assigned to agent; Agent logged in |
| **Postconditions** | Activity logged; pipeline stage updated |
| **Trigger** | Agent mở CRM Lead detail |

**Main Flow:**
1. Agent xem lead profile: contact, score, source, linked unit/listing
2. Xem pipeline kanban: New→Contacted→Qualified→Booking→Closed
3. Log activity: call, meeting, task, note với timestamp
4. Drag lead stage → sync transaction state machine nếu linked
5. Schedule follow-up task
6. View AI suggested next action (P3)

**Alternative:**
- 3a. Voice-to-note mobile (P2)
- 4a. Bulk move leads stage

**Exception:**
- 4a. Invalid stage transition → reject với valid options

**Business Rules:**
- BR-CRM-06: Activity timeline immutable append-only
- BR-CRM-07: Pipeline sync FR-CRM-05 với booking state

**NFR:** NFR-P01 | **FR:** FR-CRM-04, FR-CRM-05

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-CRM-05 | CRM activity timeline | M |
| US-CRM-09 | CRM activity timeline | M |
| US-CRM-10 | Pipeline kanban view | M |
| US-CRM-11 | Agent dashboard hot leads | M |

---

### UC-CRM-04: Import lead thủ công

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-CRM-04 |
| **Tên** | Import lead thủ công |
| **Goal** | Agent/Admin nhập lead walk-in hoặc CSV |
| **Actor chính** | Agent, Agency Admin |
| **Actor phụ** | System |
| **Preconditions** | User có quyền CRM write |
| **Postconditions** | Lead(s) imported với source=manual |
| **Trigger** | User chọn Import Lead |

**Main Flow:**
1. Chọn single entry form hoặc CSV upload
2. Validate required fields
3. Preview import rows
4. Confirm → bulk create leads
5. Apply routing rules per lead
6. Report success/fail count

**Alternative:**
- 1a. QR walk-in gallery check-in (P2)

**Exception:**
- 3a. CSV format error → row-level error report

**Business Rules:**
- BR-CRM-08: Manual lead vẫn gắn project và agent assigner

**NFR:** NFR-P02 | **FR:** FR-CRM-01

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-CRM-07 | Lead capture API | M |

---

### UC-BK-01: Tạo booking/giữ chỗ với expiry

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-BK-01 |
| **Tên** | Tạo booking/giữ chỗ với expiry |
| **Goal** | Agent giữ chỗ unit cho buyer với timer atomic lock |
| **Actor chính** | Agent |
| **Actor phụ** | System, Buyer |
| **Preconditions** | Unit available; Agent có quyền; lead linked optional |
| **Postconditions** | Booking Draft/Reserved; unit locked atomic; expiry scheduled |
| **Trigger** | Agent click 'Tạo booking' trên unit/lead |

**Main Flow:**
1. Agent chọn unit + buyer info (from lead or manual)
2. Nhập deposit amount, expiry duration (default 24-72h)
3. System atomic lock unit (Redis distributed lock + DB optimistic)
4. Create booking state=Reserved, Deposit Pending
5. Snapshot Golden Record price/policy at T
6. Schedule expiry job (UC-BK-09)
7. Generate payment link → notify buyer
8. Emit BookingCreated event

**Alternative:**
- 2a. Extend expiry before timeout (1 lần)
- 7a. Skip payment — hold only (config per tenant)

**Exception:**
- 3a. Lock fail — unit taken → error 'Unit no longer available'
- 3b. Concurrent lock → only 1 success (AC-GR-06)

**Business Rules:**
- BR-BK-01: Atomic lock — 0 double booking
- BR-BK-02: Expiry auto-release lock
- BR-BK-03: Price snapshot immutable

**NFR:** NFR-P08, NFR-P02 | **FR:** FR-BK-01, FR-BK-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-01 | Create booking with expiry | M |
| US-BK-02 | Atomic inventory lock | M |
| US-GR-08 | Atomic inventory lock | M |
| US-CRM-15 | Agent portal booking entry | M |

---

### UC-BK-02: Theo dõi trạng thái giao dịch

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-BK-02 |
| **Tên** | Theo dõi trạng thái giao dịch |
| **Goal** | Stakeholders theo dõi booking qua state machine |
| **Actor chính** | Agent, Buyer, Developer Admin |
| **Actor phụ** | System |
| **Preconditions** | Booking exists; user có quyền view |
| **Postconditions** | Current state và history visible |
| **Trigger** | User mở Booking detail |

**Main Flow:**
1. Load booking + linked unit, buyer, agent, payments
2. Hiển thị state machine visual: current state highlighted
3. Timeline events chronological
4. Buyer view (limited PII): status + payment CTA
5. Developer view: unit status impact
6. Export timeline PDF (P2)

**Alternative:**
- 3a. Real-time update via SSE on state change

**Exception:**
- 1a. Unauthorized → 403

**Business Rules:**
- BR-BK-04: Buyer chỉ xem own booking
- BR-BK-05: 15+ valid states Phase 1

**NFR:** NFR-P01 | **FR:** FR-BK-03

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-07 | State machine all transitions | M |
| US-BK-08 | Domain event store | M |

---

### UC-BK-03: Xem domain event timeline giao dịch

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-BK-03 |
| **Tên** | Xem domain event timeline giao dịch |
| **Goal** | Ops/Agent replay events cho audit và dispute prep |
| **Actor chính** | Ops Admin, Agent |
| **Actor phụ** | System |
| **Preconditions** | Booking có events trong event store |
| **Postconditions** | Full event timeline displayed |
| **Trigger** | User mở 'Transaction Timeline' tab |

**Main Flow:**
1. Query event store by booking_id
2. Render events: UnitViewed, BookingCreated, PaymentInitiated, PaymentConfirmed, etc.
3. Each event: timestamp, actor, payload hash
4. Filter by event type
5. Ops export evidence pack (P2)

**Alternative:**
- 4a. Replay to reconstruct state at time T (P2 UC-BK-04)

**Exception:**
- 2a. Event store unavailable → cached read replica

**Business Rules:**
- BR-BK-06: Event store append-only immutable

**NFR:** NFR-S06 | **FR:** FR-BK-04

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-08 | Domain event store | M |

---

### UC-BK-05: Hủy booking & khởi tạo hoàn tiền

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-BK-05 |
| **Tên** | Hủy booking & khởi tạo hoàn tiền |
| **Goal** | Hủy giao dịch và release inventory + refund |
| **Actor chính** | Agent, Ops Admin |
| **Actor phụ** | System (Payment) |
| **Preconditions** | Booking cancellable state; policy allows cancel |
| **Postconditions** | Booking Cancelled; unit available; refund initiated if paid |
| **Trigger** | Agent/Ops click Cancel Booking |

**Main Flow:**
1. Chọn booking → Cancel
2. Nhập lý do cancel (bắt buộc)
3. Confirm cancel
4. State → Cancelled; emit BookingCancelled
5. Release unit lock → available
6. If deposit paid → trigger refund workflow (UC-PAY-03)
7. Ledger reversal entries
8. Notify buyer, agent, developer

**Alternative:**
- 3a. Ops force cancel dispute case

**Exception:**
- 4a. Unit already sold downstream → block cancel, escalate Ops

**Business Rules:**
- BR-BK-07: Refund amount theo policy snapshot
- BR-BK-08: Cancel audit mandatory

**NFR:** NFR-P02 | **FR:** FR-BK-07, FR-PAY-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-10 | Cancel/refund workflow | M |
| US-BK-09 | Booking expiry job | M |

---

### UC-PAY-01: Tạo & thanh toán cọc online

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-PAY-01 |
| **Tên** | Tạo & thanh toán cọc online |
| **Goal** | Buyer thanh toán deposit qua payment gateway |
| **Actor chính** | Buyer |
| **Actor phụ** | System (Payment), Agent |
| **Preconditions** | Booking Deposit Pending; payment link valid |
| **Postconditions** | Payment success; booking Deposited; unit reserved; ledger balanced |
| **Trigger** | Buyer click payment link |

**Main Flow:**
1. Load payment page: amount, booking ref, unit info
2. Buyer chọn payment method (gateway Phase 1)
3. Create PaymentIntent; redirect/checkout gateway
4. Buyer complete payment on gateway
5. Gateway webhook → idempotent handler (UC-PAY-04 pattern)
6. Verify signature; update payment status
7. Double-entry ledger debit/credit
8. Booking → Deposited; unit → reserved confirmed
9. Notify agent, developer; emit PaymentConfirmed

**Alternative:**
- 2a. Buyer abandon → booking stays Deposit Pending until expiry

**Exception:**
- 5a. Webhook duplicate → idempotent skip
- 5b. Payment fail → retry; booking unchanged until expiry

**Business Rules:**
- BR-PAY-01: Webhook idempotent
- BR-PAY-02: Ledger balanced mọi transaction
- BR-PAY-03: MFA optional buyer (config)

**NFR:** NFR-S08, NFR-P02 | **FR:** FR-PAY-01, FR-PAY-02, FR-PAY-05

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-03 | Pay deposit online | M |
| US-PAY-02 | Payment gateway integration | M |
| US-PAY-03 | PaymentIntent create | M |
| US-PAY-07 | Payment page for buyer | M |
| US-PAY-08 | Booking state update on payment | M |

---

### UC-PAY-02: Đối soát thanh toán hàng ngày

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-PAY-02 |
| **Tên** | Đối soát thanh toán hàng ngày |
| **Goal** | Finance đối soát 100% gateway vs ledger |
| **Actor chính** | Platform Admin, Finance Admin |
| **Actor phụ** | System |
| **Preconditions** | Daily reconciliation job scheduled |
| **Postconditions** | Reconciliation report generated; mismatches flagged |
| **Trigger** | Cron 02:00 daily or manual trigger |

**Main Flow:**
1. Fetch gateway settlement file/API
2. Fetch ledger entries same period
3. Match by transaction_id, amount, status
4. Generate report: matched, unmatched, pending
5. Alert Finance if mismatch > 0
6. Ops runbook for investigation
7. Archive report 5 years

**Alternative:**
- 3a. Manual adjustment entry with approval

**Exception:**
- 2a. Gateway API down → retry + alert

**Business Rules:**
- BR-PAY-04: 100% match required before settlement batch (P2)
- BR-PAY-05: Mismatch SLA resolve 24h

**NFR:** NFR-O02 | **FR:** FR-PAY-04

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-PAY-01 | Daily reconciliation | M |
| US-PAY-06 | Daily reconciliation job | M |

---

### UC-PAY-03: Xử lý refund & ledger reversal

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-PAY-03 |
| **Tên** | Xử lý refund & ledger reversal |
| **Goal** | Hoàn tiền khi cancel booking với ledger chính xác |
| **Actor chính** | System (Payment), Finance Admin |
| **Actor phụ** | Agent, Ops |
| **Preconditions** | Payment success exists; cancel approved |
| **Postconditions** | Refund processed; ledger reversed; booking refunded state |
| **Trigger** | Event BookingCancelled with paid deposit |

**Main Flow:**
1. Initiate refund via gateway API
2. Create refund PaymentIntent/record
3. Webhook refund confirmation
4. Ledger reversal entries (mirror original)
5. Booking → Refunded
6. Notify buyer timeline 3-7 ngày làm việc

**Alternative:**
- 2a. Partial refund theo policy

**Exception:**
- 1a. Gateway refund fail → manual queue Finance

**Business Rules:**
- BR-PAY-06: Refund ≤ original payment amount
- BR-PAY-07: Reversal must balance ledger

**NFR:** NFR-S08 | **FR:** FR-PAY-02, FR-BK-07

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-BK-10 | Cancel/refund workflow | M |
| US-PAY-04 | Webhook handler idempotent | M |
| US-PAY-05 | Double-entry ledger | M |

---

### UC-AI-01: Tạo nội dung listing bằng AI copilot

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-AI-01 |
| **Tên** | Tạo nội dung listing bằng AI copilot |
| **Goal** | Agent generate draft mô tả listing nhanh với human approve |
| **Actor chính** | Agent |
| **Actor phụ** | System (AI Gateway) |
| **Preconditions** | Agent on listing form; AI Gateway configured |
| **Postconditions** | Draft content approved by agent; audit logged |
| **Trigger** | Agent click 'AI Copilot' on listing form |

**Main Flow:**
1. Agent click Generate
2. AI Gateway load unit context (no price mutation permission)
3. LLM generate headline + description tiếng Việt ≤10s
4. Display draft in 'Pending Approval' panel
5. Agent review, edit, click 'Approve & Use'
6. Content copy to listing form fields
7. Log AI action: prompt hash, latency, cost (FR-TR-05)

**Alternative:**
- 3a. Regenerate with different tone
- 4a. Agent reject draft → manual entry

**Exception:**
- 3a. Guardrail block (prompt injection) → error + log violation
- 3b. LLM timeout → retry once

**Business Rules:**
- BR-AI-01: AI không mutate price/inventory/booking
- BR-AI-02: Publish requires human approve
- BR-AI-03: AI disclaimer on generated content

**NFR:** NFR-P05, NFR-C03 | **FR:** FR-AI-01, FR-AI-04, FR-TR-05

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-AI-01 | AI draft listing ≤10s | M |
| US-AI-02 | Human approve AI content | M |
| US-AI-06 | AI Gateway setup | M |
| US-AI-07 | Content copilot API | M |
| US-AI-11 | Human approve AI content UI | M |

---

### UC-AI-02: Chấm điểm & ưu tiên lead

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-AI-02 |
| **Tên** | Chấm điểm & ưu tiên lead |
| **Goal** | System score lead hot/warm/cold cho prioritization |
| **Actor chính** | System (AI) |
| **Actor phụ** | Agent, Agency Admin |
| **Preconditions** | Lead created with minimum data (phone, source, unit) |
| **Postconditions** | Lead score computed ≤2s; displayed on CRM |
| **Trigger** | Event LeadCreated |

**Main Flow:**
1. Extract features: source, unit price tier, time, behavior, form completeness
2. Scoring model v1 inference ≤2s
3. Assign score 0-100 + label hot/warm/cold
4. Display on lead card and dashboard
5. Hot lead trigger priority routing (UC-CRM-02)

**Alternative:**
- 3a. Manual override score by Agency Admin (P2)

**Exception:**
- 2a. Model unavailable → default score 50, flag 'unscored'

**Business Rules:**
- BR-AI-04: Score không tự động reject lead
- BR-AI-05: Scoring accuracy ≥70% vs manual label

**NFR:** NFR-P06 | **FR:** FR-AI-02

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-AI-04 | Lead score on entry | M |
| US-AI-08 | Lead scoring model v1 | M |
| US-AI-05 | Hot lead priority routing | S |

---

### UC-TR-01: Xem audit trail toàn hệ thống

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-TR-01 |
| **Tên** | Xem audit trail toàn hệ thống |
| **Goal** | Ops/Admin truy vết ai làm gì khi nào |
| **Actor chính** | Ops Admin, Platform Admin, Developer Admin |
| **Actor phụ** | System |
| **Preconditions** | Audit logging enabled; user có quyền audit read |
| **Postconditions** | Audit entries displayed/filtered |
| **Trigger** | User mở Audit Trail viewer |

**Main Flow:**
1. Filter: tenant, user, entity type, date range, action
2. Search by entity_id (unit, booking, lead)
3. Display: timestamp, actor, action, old/new value diff
4. Export CSV for compliance
5. Immutable — no edit/delete UI

**Alternative:**
- 2a. AI action log filter (FR-TR-05)

**Exception:**
- 1a. Cross-tenant audit → Platform Admin only

**Business Rules:**
- BR-TR-01: Audit retention ≥5 năm
- BR-TR-02: Sensitive field masked in log

**NFR:** NFR-S06, NFR-S07 | **FR:** FR-TR-01, FR-TR-05

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-TR-03 | Audit trail viewer | M |
| US-AI-10 | AI action audit log | M |

---

### UC-AN-01: Xem dashboard funnel & KPI

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-AN-01 |
| **Tên** | Xem dashboard funnel & KPI |
| **Goal** | Agency/Platform theo dõi conversion và performance |
| **Actor chính** | Agency Admin, Platform Admin |
| **Actor phụ** | Agent (view own) |
| **Preconditions** | Analytics ETL Phase 1 basic; user có quyền dashboard |
| **Postconditions** | KPI charts rendered with 7/30 day range |
| **Trigger** | User mở Dashboard |

**Main Flow:**
1. Select date range: 7/30 ngày
2. Load metrics: leads, contacted, bookings, deposited, conversion %
3. Funnel visualization
4. Top agents, top projects (Agency scope)
5. Drill-down to lead list
6. Export PNG/CSV (P2)

**Alternative:**
- 3a. Compare period over period (P3)

**Exception:**
- 2a. Data delay → show 'as of' timestamp

**Business Rules:**
- BR-AN-01: Agency chỉ xem tenant data
- BR-AN-02: Platform xem aggregated cross-tenant

**NFR:** NFR-P01 | **FR:** FR-AN-01

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-AN-03 | KPI funnel dashboard | M |
| US-AN-04 | Inventory summary report | M |
| US-CRM-11 | Agent dashboard hot leads | M |

---

### UC-UX-03: Admin quản lý tenant & moderation

| Thuộc tính | Giá trị |
|-----------|---------|
| **ID** | UC-UX-03 |
| **Tên** | Admin quản lý tenant & moderation |
| **Goal** | Platform/Ops quản lý tenant lifecycle và moderation config |
| **Actor chính** | Platform Admin, Ops Admin |
| **Actor phụ** | System |
| **Preconditions** | Admin authenticated MFA |
| **Postconditions** | Tenant/config updated; moderation queue accessible |
| **Trigger** | Admin mở Admin Portal |

**Main Flow:**
1. Tenant list: create, suspend, view usage
2. Moderation queue config: auto-rules, SLA
3. Listing queue (UC-LS-02)
4. System health: sync lag, payment status
5. Feature flags per tenant (NFR-O05)

**Alternative:**
- 1a. Impersonate tenant support (audit logged, P2)

**Exception:**
- 1a. Suspend tenant with active bookings → warning workflow

**Business Rules:**
- BR-UX-01: Suspend tenant blocks new booking not cancel existing

**NFR:** NFR-O05, NFR-S05 | **FR:** FR-UX-03

**User Stories:**
| ID | Story | Pri |
|----|-------|-----|
| US-UX-03 | Admin tenant management | M |
| US-UX-04 | Ops config approval rules | M |

---

## 5. Tóm tắt Use Case Phase 2–6

### 5.1 Phase 2 (T1–T6/2027) — Growth & Omnichannel

| ID | Tên | Main Flow (5 bước) |
|----|-----|-------------------|
| UC-GR-05 | Time-travel query | 1) Chọn unit → 2) Chọn thời điểm T → 3) Query version store → 4) Hiển thị snapshot giá/status → 5) Export báo cáo |
| UC-GR-06 | Bulk import bảng hàng | 1) Upload Excel → 2) Validate schema → 3) Preview diff → 4) Confirm import → 5) Sync index + audit |
| UC-CRM-05 | Sync Zalo/Meta | 1) Webhook nhận lead → 2) Normalize payload → 3) Dedup → 4) Create lead + score → 5) Route agent |
| UC-CRM-06 | SLA reminder | 1) Timer check lead idle → 2) Compare SLA policy → 3) Send reminder → 4) Escalate manager → 5) Log SLA event |
| UC-BK-04 | Replay timeline dispute | 1) Ops chọn booking → 2) Query event store → 3) Reconstruct state tại T → 4) Export evidence PDF → 5) Attach dispute case |
| UC-BK-06 | Tạo hợp đồng template | 1) Chọn template → 2) Merge booking data → 3) Preview PDF → 4) Send review → 5) Save Contract Drafted |
| UC-BK-07 | E-sign | 1) Send sign link → 2) Buyer/Agent ký → 3) Webhook signed → 4) Update booking state → 5) Vault document |
| UC-PAY-04 | Commission settlement | 1) Close period → 2) Calc commission snapshot → 3) Approval workflow → 4) Batch payout → 5) Ledger + export |
| UC-COM-01 | Commission policy | 1) Dev config policy → 2) Set rate/split rules → 3) Publish → 4) Snapshot on deal close → 5) Audit |
| UC-COM-02 | Policy snapshot | 1) Deal closed → 2) Lock policy version → 3) Calc amounts → 4) Store immutable → 5) Notify finance |
| UC-COM-03 | Split commission | 1) Identify agents → 2) Apply split % → 3) Validate 100% → 4) Create entries → 5) Settlement queue |
| UC-AI-03 | RAG pháp lý | 1) Agent query → 2) Retrieve docs → 3) LLM answer + citations → 4) Display → 5) Log query |
| UC-AI-06 | Buyer-product matching | 1) Buyer profile → 2) Feature match → 3) Rank units → 4) Show recommendations → 5) Track click |
| UC-TR-02 | Document Vault | 1) Upload doc → 2) Watermark → 3) Access control → 4) Download log → 5) Retention policy |
| UC-AN-02 | GMV dashboard | 1) Select period → 2) Aggregate GMV → 3) Breakdown tenant/project → 4) Chart → 5) Export |
| UC-AN-03 | Absorption report | 1) Select project → 2) Calc sold/available ratio → 3) Trend chart → 4) Compare phase → 5) Export |
| UC-MKT-01 | Distribution policy | 1) Dev publish policy → 2) Set agency eligibility → 3) Commission terms → 4) Notify marketplace → 5) Audit |
| UC-MKT-02 | Agency apply rights | 1) Agency browse projects → 2) Submit apply → 3) Dev review → 4) Approve/reject → 5) Enable listing |
| UC-UX-01 | Mobile sale hiện trường | 1) Login mobile → 2) Offline cache inventory → 3) Log activity geo → 4) Create booking → 5) Sync online |
| UC-UX-04 | Developer Portal | 1) Dev login → 2) Manage Golden Record UI → 3) View absorption → 4) Manage agencies → 5) Reports |
| UC-NW-01 | Zalo OA/ZNS | 1) Configure OA → 2) Map templates → 3) Send notify lead/payment → 4) Track delivery → 5) Retry fail |
| UC-NW-02 | Meta Lead Ads | 1) Connect page → 2) Webhook subscribe → 3) Receive lead → 4) Map campaign → 5) CRM create |
| UC-NW-03 | SMS gateway | 1) Configure provider → 2) Template OTP/notify → 3) Send on event → 4) Delivery report → 5) Opt-out handle |
| UC-ID-05 | KYC/KYB | 1) Submit documents → 2) Verify API/manual → 3) Status pending/approved → 4) Badge verified → 5) Audit |

### 5.2 Phase 3 (T7–T12/2027) — AI Agents & Trust

| ID | Tên | Main Flow (5 bước) |
|----|-----|-------------------|
| UC-AI-04 | AI Sales draft reply | 1) Inbound message → 2) AI draft reply → 3) Agent review → 4) Approve send → 5) Log conversation |
| UC-AI-05 | Anomaly detection | 1) Monitor listing/transactions → 2) ML flag anomaly → 3) Ops queue → 4) Investigate → 5) Resolve/escalate |
| UC-AI-07 | Buyer conversational | 1) Buyer chat → 2) Intent detect → 3) Recommend units → 4) Capture lead → 5) Handoff agent |
| UC-TR-03 | Dispute Center | 1) Open dispute → 2) Attach evidence → 3) Ops mediate → 4) Resolution → 5) Update booking/commission |
| UC-CRM-07 | Unified inbox | 1) Aggregate channels → 2) Single thread view → 3) Reply → 4) Sync CRM → 5) SLA track |
| UC-AN-04 | Campaign attribution | 1) UTM/campaign tag → 2) Track lead→booking → 3) Attribute revenue → 4) Report by channel → 5) ROI calc |
| UC-AN-05 | Absorption forecast | 1) Historical data → 2) ML forecast 30/60/90d → 3) Display confidence → 4) Dev review → 5) Export |
| UC-PAY-05 | Multi-gateway | 1) Route by rules → 2) Primary fail → 3) Fallback gateway → 4) Complete payment → 5) Log route |
| UC-MKT-03 | Agency leaderboard | 1) Calc compliance score → 2) Rank agencies → 3) Display leaderboard → 4) Penalty flag → 5) Dev action |
| UC-UX-02 | Buyer deal tracking | 1) Buyer login app → 2) View bookings → 3) Status timeline → 4) Push notify → 5) Support contact |

### 5.3 Phase 4 (T1–T6/2028) — Enterprise & Ecosystem

| ID | Tên | Main Flow (5 bước) |
|----|-----|-------------------|
| UC-ID-06 | SSO Enterprise | 1) Configure IdP → 2) SAML/OIDC → 3) User login SSO → 4) Map roles → 5) Audit |
| UC-BK-08 | Custom workflow | 1) Define states/transitions → 2) Publish workflow → 3) Apply tenant → 4) Execute booking → 5) Validate |
| UC-TR-04 | Regulatory Export | 1) Select scope → 2) Compile audit+transactions → 3) Encrypt pack → 4) Download → 5) Access log |
| UC-UX-05 | White-label portal | 1) Configure brand → 2) Subdomain/DNS → 3) Theme apply → 4) Preview → 5) Go-live |
| UC-NW-04 | API Marketplace | 1) Partner register → 2) API key issue → 3) Consume webhook → 4) Rate limit → 5) Billing |
| UC-NW-05 | Tenant webhook | 1) Dev configure URL → 2) Select events → 3) Deliver retry → 4) Signature verify → 5) Monitor |

### 5.4 Phase 5 (T7–T12/2028) — Embedded Finance

| ID | Tên | Main Flow (5 bước) |
|----|-----|-------------------|
| UC-PAY-06 | Smart Escrow | 1) Deposit to escrow → 2) Milestone define → 3) Condition met → 4) Release funds → 5) Ledger |
| UC-PAY-07 | BNPL trả góp | 1) Buyer select BNPL → 2) Partner approve → 3) Schedule installments → 4) Collect → 5) Reconcile |

### 5.5 Phase 6 (T1–T6/2029) — Network Scale

| ID | Tên | Main Flow (5 bước) |
|----|-----|-------------------|
| UC-MKT-04 | Marketplace SLA penalty | 1) Monitor SLA → 2) Score drop → 3) Auto penalty → 4) Notify agency → 5) Appeal workflow |
| UC-UX-06 | Immersive 3D/Map | 1) Load 3D model → 2) Navigate unit → 3) Map intelligence → 4) Link Golden Record → 5) Book CTA |

---


## 6. Epic Map (E1–E15)

| Epic | Tên | Mô tả | Phase | Use Cases chính | Stories |
|------|-----|-------|-------|-----------------|---------|
| **E1** | Golden Record & Inventory | Single source of truth bảng hàng, anti-drift, atomic lock | 1–2 | UC-GR-01→07 | US-GR-01→13 |
| **E2** | Identity & Tenant | Multi-tenant, RBAC, RLS, MFA, onboarding | 1–2 | UC-ID-01→05 | US-ID-01→08 |
| **E3** | Listing, Search & Public Portal | Search, detail, compare, media, approval | 1 | UC-LS-01→07 | US-LS-01→14 |
| **E4** | CRM & Agent Portal | Lead capture, routing, pipeline, activities | 1–2 | UC-CRM-01→07 | US-CRM-01→15 |
| **E5** | Booking & Transaction | State machine, event store, expiry, cancel | 1–2 | UC-BK-01→08 | US-BK-01→10 |
| **E6** | Payment & Ledger | Gateway, webhook, ledger, reconciliation, refund | 1–2 | UC-PAY-01→05 | US-PAY-01→09 |
| **E7** | AI Copilot & Scoring | Content copilot, lead score, guardrails | 1–3 | UC-AI-01→07 | US-AI-01→11 |
| **E8** | Admin, Audit & Analytics | Audit trail, moderation, KPI dashboard | 1 | UC-TR-01, UC-AN-01, UC-UX-03 | US-TR-03→04, US-AN-03→04, US-UX-03→04 |
| **E9** | Commission OS | Policy, snapshot, split, settlement, export | 2 | UC-COM-01→05, UC-PAY-04 | US-COM-01→10 |
| **E10** | Omnichannel Hub | Zalo, Meta, SMS, attribution | 2 | UC-NW-01→03, UC-CRM-05 | US-NW-01→08 |
| **E11** | Developer Portal & Marketplace | Dev UI, distribution policy, agency apply | 2 | UC-MKT-01→02, UC-UX-04 | US-MKT-01→06, US-DEV-01→08 |
| **E12** | Mobile Sale Experience | PWA/mobile offline, geo, voice-to-CRM | 2 | UC-UX-01 | US-MOB-01→06 |
| **E13** | Trust & Dispute Layer | Document vault, dispute center, evidence | 2–3 | UC-TR-02→03, UC-BK-04 | US-TR-05→08 |
| **E14** | Data Warehouse & Intelligence | ETL, GMV, forecast, scorecard | 3 | UC-AN-02→05 | US-DW-01→05 |
| **E15** | Network & Ecosystem | API marketplace, white-label, multi-region | 4–6 | UC-NW-04→05, UC-UX-05→06 | US-NW-09→12 |

---


## 7. Sprint Backlog Map (S0–S10)

| Sprint | Thời gian | Mục tiêu Sprint | Epics | Story Points | Deliverables chính |
|--------|-----------|-----------------|-------|--------------|-------------------|
| **S0** | W1–W2 | Foundation & DevOps | E2 (partial), OP | ~25 SP | CI/CD, staging/prod env, repo structure, OpenAPI skeleton |
| **S1** | W3–W4 | Tenant & Identity core | E2 | ~28 SP | Tenant onboarding, JWT, RBAC, RLS, tenant middleware |
| **S2** | W5–W6 | Golden Record MVP | E1 | ~30 SP | CRUD unit, versioning, Product Graph, inventory API |
| **S3** | W7–W8 | Listing & Search | E1, E3 | ~32 SP | Listing from GR, anti-drift, OpenSearch, approval workflow, public detail |
| **S4** | W9–W10 | CRM & Lead | E4 | ~30 SP | Lead capture, routing, pipeline, agent portal CRM |
| **S5** | W11–W12 | Booking core | E1, E4, E5 | ~35 SP | Booking state machine, atomic lock, event store, expiry job |
| **S6** | W13–W14 | Payment & Ledger | E5, E6 | ~38 SP | Gateway integration, webhook, ledger, reconciliation, MFA payment |
| **S7** | W15–W16 | AI Layer | E7 | ~26 SP | AI Gateway, copilot, lead scoring, guardrails, approve UI |
| **S8** | W17–W18 | Admin & Analytics | E8, E3 | ~24 SP | Audit viewer, KPI dashboard, admin tenant, moderation, mobile responsive |
| **S9** | W19–W20 | Hardening & Docs | All | ~22 SP | Load test concurrent booking, pen test prep, OpenAPI docs |
| **S10** | W21–W22 | UAT & Go-live prep | All | ~20 SP | UAT pilot, runbook payment ops, bug fix buffer, go-live checklist |

**Tổng Phase 1:** S0–S10 = 11 sprint × 2 tuần = 22 tuần | ~280 SP | Go-live target: 31/12/2026

### 7.1 Phân bổ User Story theo Sprint (chi tiết)

| Sprint | User Stories |
|--------|--------------|
| S0 | US-OP-01, US-OP-02 |
| S1 | US-ID-01, US-ID-02, US-ID-03, US-ID-04, US-ID-05, US-ID-06, US-GR-13 |
| S2 | US-GR-01, US-GR-02, US-GR-03, US-GR-07, US-GR-10, US-GR-11 |
| S3 | US-GR-04, US-GR-05, US-GR-06, US-GR-12, US-LS-05, US-LS-06, US-LS-07, US-LS-08, US-LS-09, US-LS-10, US-LS-13 |
| S4 | US-LS-11, US-LS-12, US-CRM-07, US-CRM-08, US-CRM-09, US-CRM-10, US-CRM-11, US-CRM-12, US-CRM-13, US-CRM-14 |
| S5 | US-GR-08, US-GR-09, US-CRM-15, US-BK-07, US-BK-08, US-BK-09 |
| S6 | US-ID-07, US-BK-10, US-PAY-02, US-PAY-03, US-PAY-04, US-PAY-05, US-PAY-06, US-PAY-07, US-PAY-08 |
| S7 | US-AI-06, US-AI-07, US-AI-08, US-AI-09, US-AI-10, US-AI-11 |
| S8 | US-ID-08, US-LS-14, US-TR-03, US-TR-04, US-AN-03, US-AN-04, US-UX-03, US-UX-04 |
| S9 | US-PAY-09, US-OP-03 |
| S10 | US-OP-04 |

---

## 8. User Story Catalog — Phase 1 (68 Stories đầy đủ)

> Format chuẩn: *As a [role], I want [goal], so that [benefit]* — kèm AC Given/When/Then cho mỗi story.

### 8.1 Epic E1: Golden Record & Inventory (13 stories)


#### US-GR-01

**User Story:** Là Developer Admin, tôi muốn tạo unit với đầy đủ thuộc tính (block, tầng, hướng, diện tích, giá, trạng thái), để làm nguồn chuẩn bảng hàng cho mọi kênh.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 5 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-01 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Developer Admin đã đăng nhập và có quyền project X
**When** tạo unit mới với các trường bắt buộc hợp lệ
**Then** unit được lưu với status mặc định available
**And** unit hiển thị trong danh sách bảng hàng project X
**And** audit log ghi action CREATE

---

#### US-GR-02

**User Story:** Là Developer Admin, tôi muốn mọi thay đổi giá được lưu lịch sử version, để truy vết khi tranh chấp hoặc audit.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 5 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-02 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** unit U1 có price = 3.000.000.000
**When** Developer Admin cập nhật price = 3.200.000.000
**Then** version record mới được tạo với timestamp và user_id
**And** query lịch sử trả về cả 2 version
**And** version cũ không bị xóa

---

#### US-GR-03

**User Story:** Là Developer Admin, tôi muốn thấy trạng thái tồn kho real-time (available/reserved/sold), để kiểm soát inventory chính xác.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 3 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-08 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** unit U1 vừa chuyển reserved do booking
**When** Developer Admin refresh bảng hàng
**Then** U1 hiển thị badge reserved trong ≤ 5 giây
**And** count summary available/reserved/sold cập nhật đúng

---

#### US-GR-04

**User Story:** Là Agent, tôi muốn tạo listing từ unit gốc mà không sửa được giá gốc, để tránh sai lệch marketing vs bảng hàng.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 5 |
| **Sprint** | S3 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-03 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Agent có quyền project X và unit U1 available, price = 3 tỷ
**When** Agent tạo listing từ U1
**Then** form hiển thị price read-only = 3 tỷ
**And** Agent chỉ nhập marketing description và media
**And** listing lưu ở trạng thái Draft

---

#### US-GR-05

**User Story:** Là Agent, tôi muốn biết ngay nếu nội dung listing lệch bảng hàng gốc, để không publish tin sai.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 5 |
| **Sprint** | S3 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-04 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Agent submit listing với claim status khác Golden Record
**When** anti-drift check chạy
**Then** submit bị block với message lỗi cụ thể
**And** hiển thị giá/trạng thái đúng từ Golden Record

---

#### US-GR-06

**User Story:** Là Buyer, tôi muốn thấy badge Verified khi tin khớp bảng gốc, để tin tưởng thông tin giá và trạng thái.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 2 |
| **Sprint** | S3 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-05 |
| **Priority** | S |

**Acceptance Criteria (Given/When/Then):**

**Given** listing pass anti-drift và đã Published
**When** Buyer xem listing trên Public Portal
**Then** badge 'Verified' hiển thị cạnh giá
**And** tooltip giải thích Verified nghĩa là khớp Golden Record

---

#### US-GR-07

**User Story:** Là Developer Admin, tôi muốn có snapshot inventory tại mọi thời điểm booking, để làm bằng chứng khi tranh chấp.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 3 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-02 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** booking B1 được tạo cho unit U1
**When** query snapshot at booking time
**Then** trả về price, status, policy tại thời điểm T0
**And** snapshot immutable

---

#### US-GR-08

**User Story:** Là hệ thống, tôi muốn khóa unit atomic khi booking, để không double book.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 8 |
| **Sprint** | S5 |
| **Epic** | E1 |
| **FR liên kết** | FR-BK-02 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** unit U1 status = available
**When** Agent A và B đồng thời tạo booking cho U1
**Then** chỉ 1 booking thành công
**And** U1 chuyển reserved
**And** booking thứ 2 nhận lỗi 'Unit no longer available'
**And** audit log ghi cả 2 attempt

---

#### US-GR-09

**User Story:** Là Agent, tôi muốn nhận cập nhật trạng thái unit qua SSE không cần reload, để phản ứng nhanh khi căn vừa được giữ.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 3 |
| **Sprint** | S5 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-08 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Agent đang xem bảng hàng project X
**When** unit U1 đổi available → reserved
**Then** UI cập nhật badge trong ≤ 5 giây qua SSE
**And** không cần F5 trang

---

#### US-GR-10

**User Story:** Là Developer Admin, tôi muốn navigate Product Graph Developer→Project→Building→Unit, để hiểu cấu trúc sản phẩm.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 3 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-01 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Product Graph đã cấu hình cho tenant
**When** mở Product Graph view
**Then** hiển thị cây phân cấp đầy đủ
**And** click node filter danh sách unit

---

#### US-GR-11

**User Story:** Là Developer Admin, tôi muốn import unit đơn lẻ nhanh chóng, để bổ sung căn mới không cần bulk.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 2 |
| **Sprint** | S2 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-01 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Developer Admin trên trang unit list
**When** click 'Thêm unit' và điền form
**Then** unit mới xuất hiện trong list
**And** sync search index

---

#### US-GR-12

**User Story:** Là Agent, tôi muốn không thể edit field giá trên listing form, để đảm bảo anti-drift ở UI level.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 2 |
| **Sprint** | S3 |
| **Epic** | E1 |
| **FR liên kết** | FR-GR-03 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** Agent mở listing form từ unit gốc
**When** inspect price field
**Then** field disabled/read-only
**And** không có API endpoint cho agent update golden price

---

#### US-GR-13

**User Story:** Là Tech Lead, tôi muốn Golden Record API tenant isolated, để đảm bảo bảo mật multi-tenant.

| Thuộc tính | Giá trị |
|-----------|---------|
| **Story Points** | 3 |
| **Sprint** | S1 |
| **Epic** | E1 |
| **FR liên kết** | FR-ID-03 |
| **Priority** | M |

**Acceptance Criteria (Given/When/Then):**

**Given** token tenant A
**When** gọi API GET unit của tenant B
**Then** response 403 Forbidden
**And** pen test tenant isolation pass

---
### 8.2 Epic E2: Identity & Tenant (8 stories)

#### US-ID-01
**User Story:** Là Platform Admin, tôi muốn onboard tenant Developer với hierarchy và admin user, để pilot có thể bắt đầu nhập bảng hàng.
| SP | 5 | Sprint | S1 | Epic | E2 | FR | FR-ID-01 | Pri | M |
**AC:**
- Given Platform Admin authenticated
- When tạo Developer tenant với slug unique
- Then tenant active + admin invite email sent
- And RLS applied

---

#### US-ID-02
**User Story:** Là Platform Admin, tôi muốn onboard tenant Agency tương tự Developer, để đại lý tham gia platform.
| SP | 5 | Sprint | S1 | Epic | E2 | FR | FR-ID-01 | Pri | M |
**AC:**
- Given slug Agency chưa tồn tại
- When create Agency tenant
- Then tenant type=Agency
- And link optional to Developer projects

---

#### US-ID-03
**User Story:** Là user, tôi muốn đăng nhập/logout/refresh token an toàn, để truy cập portal liên tục.
| SP | 3 | Sprint | S1 | Epic | E2 | FR | FR-ID-04 | Pri | M |
**AC:**
- Given valid credentials
- When login
- Then JWT issued TTL 15m + refresh cookie
- When logout Then token revoked

---

#### US-ID-04
**User Story:** Là Agency Admin, tôi muốn RBAC enforce — Agent không thấy project không được phân, để bảo mật dữ liệu.
| SP | 5 | Sprint | S1 | Epic | E2 | FR | FR-ID-02 | Pri | M |
**AC:**
- Given Agent role project scope=[A]
- When query project B data
- Then 403 or empty result

---

#### US-ID-05
**User Story:** Là Tech Lead, tôi muốn tenant middleware trên mọi API, để không leak cross-tenant.
| SP | 5 | Sprint | S1 | Epic | E2 | FR | FR-ID-03 | Pri | M |
**AC:**
- Given API request
- When missing tenant context
- Then 401
- When wrong tenant Then 403

---

#### US-ID-06
**User Story:** Là Tech Lead, tôi muốn RLS PostgreSQL verified, để defense in depth tenant isolation.
| SP | 5 | Sprint | S1 | Epic | E2 | FR | FR-ID-03 | Pri | M |
**AC:**
- Given direct DB query tenant A session
- When SELECT tenant B row
- Then 0 rows returned

---

#### US-ID-07
**User Story:** Là Buyer, tôi muốn MFA OTP khi thanh toán, để bảo vệ giao dịch tài chính.
| SP | 3 | Sprint | S6 | Epic | E2 | FR | FR-ID-04 | Pri | M |
**AC:**
- Given payment action
- When OTP required
- Then SMS/email OTP sent
- Fail 3 times Then lock 15 min

---

#### US-ID-08
**User Story:** Là Agency Admin, tôi muốn quản lý user invite/deactivate trong tenant, để kiểm soát team.
| SP | 3 | Sprint | S8 | Epic | E2 | FR | FR-ID-02 | Pri | M |
**AC:**
- Given admin role
- When deactivate user
- Then user cannot login
- And sessions revoked

---

#### US-LS-01
**User Story:** Là Buyer, tôi muốn tìm theo khu vực, giá, loại hình, diện tích, để tìm căn phù hợp nhanh.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-LS-02 | Pri | M |
**AC:**
- Given 50+ published listings
- When search filter applied
- Then results match criteria
- And P95 ≤200ms

---

#### US-LS-05
**User Story:** Là Tech Lead, tôi muốn OpenSearch index configured, để enable full-text search.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-LS-02 | Pri | M |
**AC:**
- Given index template
- When deploy
- Then index wereal-listings exists
- And mapping matches schema

---

#### US-LS-06
**User Story:** Là Buyer, tôi muốn full-text + facet search, để lọc chính xác.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-LS-02 | Pri | M |
**AC:**
- Given keyword '2PN Quận 7'
- When search
- Then relevant results ranked
- And facets update count

---

#### US-LS-07
**User Story:** Là Buyer, tôi muốn geo search radius, để tìm theo vị trí.
| SP | 3 | Sprint | S3 | Epic | E3 | FR | FR-LS-02 | Pri | S |
**AC:**
- Given map center Q7 radius 5km
- When geo search
- Then only units in radius returned

---

#### US-LS-08
**User Story:** Là Buyer, tôi muốn xem trang chi tiết project/unit đầy đủ, để quyết định tư vấn.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-UX-01 | Pri | M |
**AC:**
- Given published listing
- When open detail URL
- Then gallery, spec, map, CTA visible
- And Verified badge if applicable

---

#### US-LS-09
**User Story:** Là Ops Admin, tôi muốn workflow Draft→Pending→Published/Rejected, để kiểm soát chất lượng tin.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-LS-01 | Pri | M |
**AC:**
- Given listing submitted
- When Ops approve
- Then status Published + search indexed
- When reject Then agent notified

---

#### US-LS-10
**User Story:** Là Agent, tôi muốn upload media lên S3, để listing hấp dẫn hơn.
| SP | 3 | Sprint | S3 | Epic | E3 | FR | FR-LS-03 | Pri | M |
**AC:**
- Given listing draft
- When upload 5 images
- Then URLs attached
- And thumbnails generated

---

#### US-LS-11
**User Story:** Là Buyer, tôi muốn so sánh 2-3 căn side-by-side, để quyết định dễ hơn.
| SP | 3 | Sprint | S4 | Epic | E3 | FR | FR-LS-04 | Pri | S |
**AC:**
- Given 2 units in compare
- When open compare panel
- Then attribute table displayed
- And diff highlighted

---

#### US-LS-12
**User Story:** Là Buyer, tôi muốn lead form trên detail page ≤3 click, để liên hệ nhanh.
| SP | 2 | Sprint | S4 | Epic | E3 | FR | FR-CRM-01 | Pri | M |
**AC:**
- Given detail page
- When register consult flow
- Then ≤3 clicks to confirmation
- And lead created

---

#### US-LS-13
**User Story:** Là System, tôi muốn search sync từ inventory events, để kết quả search đúng tồn kho.
| SP | 5 | Sprint | S3 | Epic | E3 | FR | FR-LS-06 | Pri | M |
**AC:**
- Given unit sold event
- When CDC processed
- Then unit removed from available search ≤5s

---

#### US-LS-14
**User Story:** Là Buyer, tôi muốn Public Portal responsive mobile, để trải nghiệm tốt trên điện thoại.
| SP | 3 | Sprint | S8 | Epic | E3 | FR | FR-UX-01 | Pri | S |
**AC:**
- Given mobile viewport 375px
- When browse portal
- Then layout usable
- And CTA accessible

---

#### US-CRM-01
**User Story:** Là Buyer, tôi muốn gửi form tư vấn ≤3 click, để liên hệ nhanh không rườm rà.
| SP | 3 | Sprint | S4 | Epic | E4 | FR | FR-CRM-01 | Pri | M |
**AC:**
- Given detail page
- When submit lead form with consent
- Then confirmation page
- And lead in CRM

---

#### US-CRM-02
**User Story:** Là Buyer, tôi muốn nhận xác nhận qua email/SMS, để yên tâm đã gửi thành công.
| SP | 2 | Sprint | S4 | Epic | E4 | FR | FR-CRM-01 | Pri | S |
**AC:**
- Given lead submitted
- When confirmation enabled
- Then email/SMS sent within 1 min

---

#### US-CRM-03
**User Story:** Là Agency Admin, tôi muốn lead tự phân agent theo dự án/khu vực, để không lead rơi rụng.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-CRM-03 | Pri | M |
**AC:**
- Given routing rule project A → pool A
- When lead project A created
- Then assigned round-robin pool A

---

#### US-CRM-04
**User Story:** Là Agent, tôi muốn thấy lead được chấm điểm hot/warm/cold, để ưu tiên gọi đúng.
| SP | 3 | Sprint | S4 | Epic | E4 | FR | FR-AI-02 | Pri | M |
**AC:**
- Given lead created
- When agent opens CRM
- Then score visible ≤2s
- And hot badge if ≥80

---

#### US-CRM-05
**User Story:** Là Agent, tôi muốn ghi call/meeting/note trên timeline, để không mất context khách.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-CRM-04 | Pri | M |
**AC:**
- Given lead detail
- When log call activity
- Then appears chronological timeline
- And immutable

---

#### US-CRM-07
**User Story:** Là System, tôi muốn Lead capture API public, để tích hợp form portal.
| SP | 3 | Sprint | S4 | Epic | E4 | FR | FR-CRM-01 | Pri | M |
**AC:**
- Given POST /leads valid payload
- When API called
- Then 201 + lead_id
- And UTM captured

---

#### US-CRM-08
**User Story:** Là System, tôi muốn routing rules engine configurable, để Admin tùy chỉnh logic.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-CRM-03 | Pri | M |
**AC:**
- Given rule JSON config
- When lead matches
- Then correct pool selected
- And audit rule version

---

#### US-CRM-09
**User Story:** Là Agent, tôi muốn CRM activity timeline unified, để một nguồn sự thật.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-CRM-04 | Pri | M |
**AC:**
- Given multiple activities
- When view timeline
- Then sorted by timestamp desc
- And filter by type

---

#### US-CRM-10
**User Story:** Là Agent, tôi muốn pipeline kanban view, để visualize funnel.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-CRM-05 | Pri | M |
**AC:**
- Given leads various stages
- When open kanban
- Then columns by stage
- And drag-drop updates stage

---

#### US-CRM-11
**User Story:** Là Agent, tôi muốn dashboard hot leads, để focus căn nóng.
| SP | 3 | Sprint | S4 | Epic | E4 | FR | FR-AN-01 | Pri | M |
**AC:**
- Given 10 new leads
- When open dashboard
- Then hot leads top sorted by score

---

#### US-CRM-12
**User Story:** Là Agency Admin, tôi muốn assign/reassign lead, để điều phối linh hoạt.
| SP | 3 | Sprint | S4 | Epic | E4 | FR | FR-CRM-03 | Pri | M |
**AC:**
- Given unassigned lead
- When admin assign agent X
- Then owner=X
- And notify agent

---

#### US-CRM-13
**User Story:** Là Agent, tôi muốn email notify lead mới, để phản hồi nhanh.
| SP | 2 | Sprint | S4 | Epic | E4 | FR | FR-CRM-03 | Pri | M |
**AC:**
- Given lead assigned
- When created
- Then email within 1 min to agent

---

#### US-CRM-14
**User Story:** Là Agent, tôi muốn quản lý listing trên Agent Portal, để một cửa làm việc.
| SP | 5 | Sprint | S4 | Epic | E4 | FR | FR-UX-02 | Pri | M |
**AC:**
- Given agent login
- When listing CRUD from GR
- Then all flows in agent portal

---

#### US-CRM-15
**User Story:** Là Agent, tôi muốn tạo booking từ Agent Portal, để không switch hệ thống.
| SP | 3 | Sprint | S5 | Epic | E4 | FR | FR-UX-02 | Pri | M |
**AC:**
- Given unit available
- When create booking from portal
- Then booking created + payment link

---

#### US-BK-01
**User Story:** Là Agent, tôi muốn tạo booking/giữ chỗ với expiry, để giữ căn cho khách có thời hạn.
| SP | 5 | Sprint | S5 | Epic | E5 | FR | FR-BK-01 | Pri | M |
**AC:**
- Given unit available
- When create booking 48h expiry
- Then booking Reserved
- And expiry job scheduled

---

#### US-BK-02
**User Story:** Là hệ thống, tôi muốn atomic lock khi booking, để 0 double book.
| SP | 8 | Sprint | S5 | Epic | E5 | FR | FR-BK-02 | Pri | M |
**AC:**
- Covered by US-GR-08

---

#### US-BK-03
**User Story:** Là Buyer, tôi muốn thanh toán cọc online qua payment page, để không chuyển khoản thủ công.
| SP | 5 | Sprint | S6 | Epic | E5 | FR | FR-PAY-05 | Pri | M |
**AC:**
- Given booking Deposit Pending
- When complete gateway payment
- Then webhook updates ≤30s
- And booking Deposited

---

#### US-BK-04
**User Story:** Là Agent, tôi muốn notify khi khách thanh toán thành công, để follow-up kịp thời.
| SP | 2 | Sprint | S6 | Epic | E5 | FR | FR-BK-03 | Pri | M |
**AC:**
- Given payment success webhook
- When processed
- Then agent in-app + email notify

---

#### US-BK-05
**User Story:** Là Developer Admin, tôi muốn unit chuyển reserved ngay sau cọc, để bảng hàng chính xác.
| SP | 3 | Sprint | S6 | Epic | E5 | FR | FR-GR-01 | Pri | M |
**AC:**
- Given deposit confirmed
- When state update
- Then Golden Record unit=reserved
- And Dev portal reflects

---

#### US-BK-07
**User Story:** Là Tech Lead, tôi muốn state machine all valid transitions, để workflow nhất quán.
| SP | 8 | Sprint | S5 | Epic | E5 | FR | FR-BK-03 | Pri | M |
**AC:**
- Given state machine spec
- When invalid transition attempted
- Then reject + audit
- All valid pass integration test

---

#### US-BK-08
**User Story:** Là Ops Admin, tôi muốn domain event store query, để audit và dispute prep.
| SP | 5 | Sprint | S5 | Epic | E5 | FR | FR-BK-04 | Pri | M |
**AC:**
- Given booking lifecycle
- When query events
- Then full chronological list
- And immutable

---

#### US-BK-09
**User Story:** Là System, tôi muốn booking expiry job auto-release, để không giữ chỗ vô hạn.
| SP | 3 | Sprint | S5 | Epic | E5 | FR | FR-BK-01 | Pri | M |
**AC:**
- Given booking past expiry unpaid
- When job runs
- Then booking Expired
- And unit available

---

#### US-BK-10
**User Story:** Là Agent, tôi muốn cancel booking + refund workflow, để xử lý hủy deal.
| SP | 5 | Sprint | S6 | Epic | E5 | FR | FR-BK-07 | Pri | M |
**AC:**
- Given deposited booking
- When cancel approved
- Then refund initiated
- And ledger reversal

---

#### US-PAY-01
**User Story:** Là Platform Admin, tôi muốn đối soát ledger vs gateway 100% daily, để phát hiện sai lệch sớm.
| SP | 5 | Sprint | S6 | Epic | E6 | FR | FR-PAY-04 | Pri | M |
**AC:**
- Given daily job
- When reconciliation runs
- Then report 100% match or flagged mismatches

---

#### US-PAY-02
**User Story:** Là Tech Lead, tôi muốn payment gateway integration, để enable online deposit.
| SP | 8 | Sprint | S6 | Epic | E6 | FR | FR-PAY-01 | Pri | M |
**AC:**
- Given sandbox credentials
- When create test payment
- Then gateway redirect works
- And webhook received

---

#### US-PAY-03
**User Story:** Là System, tôi muốn PaymentIntent create per booking, để link payment chuẩn.
| SP | 3 | Sprint | S6 | Epic | E6 | FR | FR-PAY-02 | Pri | M |
**AC:**
- Given booking
- When create intent
- Then intent_id + amount match booking

---

#### US-PAY-04
**User Story:** Là System, tôi muốn webhook handler idempotent, để không double charge.
| SP | 5 | Sprint | S6 | Epic | E6 | FR | FR-PAY-04 | Pri | M |
**AC:**
- Given duplicate webhook same idempotency key
- When process twice
- Then single ledger entry

---

#### US-PAY-05
**User Story:** Là Finance Admin, tôi muốn double-entry ledger balanced, để kế toán chính xác.
| SP | 8 | Sprint | S6 | Epic | E6 | FR | FR-PAY-03 | Pri | M |
**AC:**
- Given payment success
- When ledger write
- Then debit=credit
- And audit trail

---

#### US-PAY-06
**User Story:** Là System, tôi muốn daily reconciliation job automated, để giảm manual work.
| SP | 5 | Sprint | S6 | Epic | E6 | FR | FR-PAY-04 | Pri | M |
**AC:**
- Given cron 02:00
- When job runs
- Then report emailed to Finance

---

#### US-PAY-07
**User Story:** Là Buyer, tôi muốn payment page UX rõ ràng, để thanh toán tự tin.
| SP | 3 | Sprint | S6 | Epic | E6 | FR | FR-PAY-01 | Pri | M |
**AC:**
- Given payment link
- When open page
- Then amount, unit, booking ref visible
- And gateway options shown

---

#### US-PAY-08
**User Story:** Là System, tôi muốn booking state update on payment, để đồng bộ transaction.
| SP | 3 | Sprint | S6 | Epic | E6 | FR | FR-PAY-05 | Pri | M |
**AC:**
- Given webhook success
- When handler runs
- Then booking→Deposited
- And unit→reserved

---

#### US-PAY-09
**User Story:** Là QA, tôi muốn concurrent booking test suite, để verify 0 double book.
| SP | 5 | Sprint | S9 | Epic | E6 | FR | FR-BK-02 | Pri | M |
**AC:**
- Given 100 concurrent book same unit
- When load test
- Then exactly 1 success

---

#### US-AI-01
**User Story:** Là Agent, tôi muốn AI draft listing description ≤10s, để tiết kiệm thời gian viết tin.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-01 | Pri | M |
**AC:**
- Given listing form
- When click AI generate
- Then Vietnamese draft ≤10s

---

#### US-AI-02
**User Story:** Là Agent, tôi muốn approve AI content trước khi dùng, để kiểm soát chất lượng.
| SP | 3 | Sprint | S7 | Epic | E7 | FR | FR-AI-04 | Pri | M |
**AC:**
- Given AI draft
- When without approve
- Then not copied to listing
- When approve Then usable

---

#### US-AI-03
**User Story:** Là hệ thống, tôi muốn AI guardrails block mutate price/booking, để an toàn nghiệp vụ.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-03 | Pri | M |
**AC:**
- Given prompt injection sửa giá
- When AI gateway
- Then block + log violation

---

#### US-AI-04
**User Story:** Là Agent, tôi muốn lead score on entry, để prioritize outreach.
| SP | 3 | Sprint | S7 | Epic | E7 | FR | FR-AI-02 | Pri | M |
**AC:**
- Given new lead
- When CRM loads
- Then score 0-100 visible ≤2s

---

#### US-AI-05
**User Story:** Là Agency Admin, tôi muốn hot lead route ưu tiên agent senior, để tăng conversion.
| SP | 3 | Sprint | S7 | Epic | E7 | FR | FR-CRM-03 | Pri | S |
**AC:**
- Given hot lead score≥80
- When routing
- Then prefer senior pool if configured

---

#### US-AI-06
**User Story:** Là Tech Lead, tôi muốn AI Gateway setup, để centralize LLM calls.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-01 | Pri | M |
**AC:**
- Given gateway deployed
- When copilot API called
- Then routed via gateway with auth

---

#### US-AI-07
**User Story:** Là Agent, tôi muốn content copilot API integrated UI, để seamless UX.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-01 | Pri | M |
**AC:**
- Given agent portal listing
- When generate
- Then API returns draft to panel

---

#### US-AI-08
**User Story:** Là Data Team, tôi muốn lead scoring model v1, để accurate prioritization.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-02 | Pri | M |
**AC:**
- Given test set
- When evaluate
- Then correlation ≥70% vs manual labels

---

#### US-AI-09
**User Story:** Là Security, tôi muốn guardrails block mutate operations, để prevent AI harm.
| SP | 5 | Sprint | S7 | Epic | E7 | FR | FR-AI-03 | Pri | M |
**AC:**
- Given mutate attempt via AI
- When guardrail check
- Then blocked 100% test cases

---

#### US-AI-10
**User Story:** Là Ops Admin, tôi muốn AI action audit log, để compliance AI usage.
| SP | 3 | Sprint | S7 | Epic | E7 | FR | FR-TR-05 | Pri | M |
**AC:**
- Given any AI call
- When complete
- Then log tenant,user,prompt_hash,cost,latency

---

#### US-AI-11
**User Story:** Là Agent, tôi muốn human approve AI content UI, để clear approve flow.
| SP | 3 | Sprint | S7 | Epic | E7 | FR | FR-AI-04 | Pri | M |
**AC:**
- Given draft panel
- When click Approve & Use
- Then content fills listing fields

---

#### US-TR-03
**User Story:** Là Ops Admin, tôi muốn audit trail viewer filter, để investigate incidents.
| SP | 5 | Sprint | S8 | Epic | E8 | FR | FR-TR-01 | Pri | M |
**AC:**
- Given audit entries
- When filter by entity+date
- Then matching logs displayed

---

#### US-TR-04
**User Story:** Là Ops Admin, tôi muốn listing moderation queue, để efficient review.
| SP | 3 | Sprint | S8 | Epic | E8 | FR | FR-LS-01 | Pri | M |
**AC:**
- Given pending listings
- When open queue
- Then sorted by SLA
- And side-by-side GR view

---

#### US-AN-03
**User Story:** Là Agency Admin, tôi muốn KPI funnel dashboard 7/30 ngày, để theo dõi performance.
| SP | 5 | Sprint | S8 | Epic | E8 | FR | FR-AN-01 | Pri | M |
**AC:**
- Given dashboard
- When select 30 days
- Then leads→bookings→deposited funnel

---

#### US-AN-04
**User Story:** Là Developer Admin, tôi muốn inventory summary report, để tổng quan tồn kho.
| SP | 3 | Sprint | S8 | Epic | E8 | FR | FR-AN-01 | Pri | M |
**AC:**
- Given project X
- When open report
- Then available/reserved/sold counts

---

#### US-UX-03
**User Story:** Là Platform Admin, tôi muốn admin tenant management, để vận hành platform.
| SP | 5 | Sprint | S8 | Epic | E8 | FR | FR-UX-03 | Pri | M |
**AC:**
- Given admin portal
- When create/suspend tenant
- Then effective immediately audited

---

#### US-UX-04
**User Story:** Là Ops Admin, tôi muốn config approval rules, để tùy chỉnh moderation.
| SP | 3 | Sprint | S8 | Epic | E8 | FR | FR-UX-03 | Pri | M |
**AC:**
- Given ops config
- When update rules
- Then moderation queue applies new rules

---

#### US-OP-01
**User Story:** Là DevOps, tôi muốn CI/CD pipeline, để automated deploy.
| SP | 5 | Sprint | S0 | Epic | E8 | FR | NFR-O04 | Pri | M |
**AC:**
- Given push main
- When CI runs
- Then test+build+deploy staging pass

---

#### US-OP-02
**User Story:** Là DevOps, tôi muốn staging + production env, để safe release.
| SP | 3 | Sprint | S0 | Epic | E8 | FR | NFR-O04 | Pri | M |
**AC:**
- Given infra
- When access staging
- Then isolated from prod data

---

#### US-OP-03
**User Story:** Là Tech Lead, tôi muốn OpenAPI documentation, để API contract clear.
| SP | 3 | Sprint | S9 | Epic | E8 | FR | NFR-O04 | Pri | M |
**AC:**
- Given API endpoints
- When generate OpenAPI
- Then published and matches implementation

---

#### US-OP-04
**User Story:** Là Ops, tôi muốn runbook payment ops, để incident response.
| SP | 2 | Sprint | S10 | Epic | E8 | FR | NFR-O03 | Pri | M |
**AC:**
- Given runbook doc
- When payment webhook fail
- Then steps documented for on-call

---


**Tổng Phase 1 User Stories:** 68 | ~280 SP

---

## 9. User Story Catalog — Phase 2 (44 Stories)

> Phase 2 mở rộng Commission, Omnichannel, Developer Portal, Mobile, E-sign, Marketplace, AI RAG.

### 9.1 Bảng tổng hợp Phase 2

| ID | User Story | SP | Sprint | Epic | FR | Pri |
|----|------------|-----|--------|------|-----|-----|

| US-COM-01 | Là Developer Admin, tôi muốn cấu hình commission policy theo project, để tính hoa hồng tự động đúng rule. | 5 | P2-S1 | E9 | FR-COM-01 | M |
| AC-US-COM-01 | Given project X; When set rate 2% + split rules; Then policy published and versioned | | | | | |
| US-COM-02 | Là System, tôi muốn snapshot policy tại thời điểm chốt deal, để không tranh cãi policy đổi sau. | 5 | P2-S1 | E9 | FR-COM-02 | M |
| AC-US-COM-02 | Given deal closed T1; When calc commission; Then use policy version at T1 | | | | | |
| US-COM-03 | Là Finance Admin, tôi muốn split commission nhiều agent, để chia đúng cho co-broker. | 5 | P2-S2 | E9 | FR-COM-03 | S |
| AC-US-COM-03 | Given 2 agents 60/40 split; When settlement; Then amounts match split | | | | | |
| US-COM-04 | Là Ops Admin, tôi muốn holdback commission khi dispute, để bảo vệ các bên. | 3 | P2-S2 | E9 | FR-COM-04 | S |
| AC-US-COM-04 | Given open dispute; When settlement run; Then commission held until resolved | | | | | |
| US-COM-05 | Là Finance Admin, tôi muốn export CSV hoa hồng cho kế toán, để đóng sổ nhanh. | 3 | P2-S2 | E9 | FR-COM-05 | M |
| AC-US-COM-05 | Given period closed; When export; Then CSV matches ledger totals | | | | | |
| US-COM-06 | Là Agency Admin, tôi muốn xem commission statement theo quý, để minh bạch thu nhập team. | 3 | P2-S3 | E9 | FR-COM-05 | M |
| AC-US-COM-06 | Given Q1 data; When open statement; Then breakdown by deal and agent | | | | | |
| US-COM-07 | Là Developer Admin, tôi muốn approve commission trước payout, để kiểm soát chi phí. | 3 | P2-S3 | E9 | FR-PAY-07 | M |
| AC-US-COM-07 | Given batch pending; When dev approve; Then payout proceeds | | | | | |
| US-COM-08 | Là Agent, tôi muốn xem commission forecast trên deal, để động lực bán hàng. | 2 | P2-S3 | E9 | FR-COM-01 | S |
| AC-US-COM-08 | Given booking Deposited; When view deal; Then estimated commission shown | | | | | |
| US-COM-09 | Là System, tôi muốn settlement batch job hàng tháng, để tự động hóa payout. | 5 | P2-S3 | E9 | FR-PAY-07 | M |
| AC-US-COM-09 | Given month end; When batch job; Then payout records created | | | | | |
| US-COM-10 | Là Finance Admin, tôi muốn reconcile commission vs ledger, để đảm bảo khớp sổ. | 3 | P2-S4 | E9 | FR-PAY-07 | M |
| AC-US-COM-10 | Given settlement batch; When reconcile; Then 100% match ledger | | | | | |
| US-NW-01 | Là Tech Lead, tôi muốn tích hợp Zalo OA webhook, để lead và notify qua Zalo. | 5 | P2-S1 | E10 | FR-CRM-06 | M |
| AC-US-NW-01 | Given Zalo webhook; When lead event; Then CRM lead created | | | | | |
| US-NW-02 | Là Tech Lead, tôi muốn ZNS template notify payment, để buyer nhận tin cọc thành công. | 3 | P2-S2 | E10 | FR-CRM-06 | M |
| AC-US-NW-02 | Given payment success; When ZNS send; Then delivery status tracked | | | | | |
| US-NW-03 | Là Tech Lead, tôi muốn Meta Lead Ads auto-sync, để không export CSV thủ công. | 5 | P2-S1 | E10 | FR-CRM-07 | M |
| AC-US-NW-03 | Given Meta webhook; When lead received; Then CRM lead + campaign tag | | | | | |
| US-NW-04 | Là Agency Admin, tôi muốn attribution lead theo campaign Meta, để biết kênh hiệu quả. | 3 | P2-S2 | E10 | FR-AN-04 | S |
| AC-US-NW-04 | Given Meta lead; When view lead; Then campaign_id and adset visible | | | | | |
| US-NW-05 | Là System, tôi muốn SMS OTP và notify, để kênh dự phòng. | 3 | P2-S2 | E10 | FR-CRM-06 | S |
| AC-US-NW-05 | Given OTP trigger; When SMS send; Then deliver ≤30s | | | | | |
| US-NW-06 | Là Agent, tôi muốn nhận lead Zalo trong CRM timeline, để quản lý một nguồn duy nhất. | 3 | P2-S3 | E10 | FR-CRM-06 | M |
| AC-US-NW-06 | Given Zalo message logged; When view lead; Then Zalo thread in timeline | | | | | |
| US-NW-07 | Là System, tôi muốn dedup lead cross-channel, để tránh trùng khách. | 5 | P2-S3 | E10 | FR-CRM-07 | M |
| AC-US-NW-07 | Given same phone Meta+Form; When second lead; Then merge or flag duplicate | | | | | |
| US-NW-08 | Là Agency Admin, tôi muốn SLA reminder khi lead idle, để không bỏ quên khách. | 3 | P2-S4 | E10 | FR-CRM-08 | S |
| AC-US-NW-08 | Given lead idle 24h; When SLA job; Then reminder to agent + manager | | | | | |
| US-DEV-01 | Là Developer Admin, tôi muốn Developer Portal UI bảng hàng, để quản lý trực quan. | 8 | P2-S1 | E11 | FR-UX-04 | M |
| AC-US-DEV-01 | Given dev login; When open inventory UI; Then CRUD unit without API only | | | | | |
| US-DEV-02 | Là Developer Admin, tôi muốn publish distribution policy, để kiểm soát đại lý được bán. | 5 | P2-S2 | E11 | FR-MKT-01 | S |
| AC-US-DEV-02 | Given project X; When publish policy; Then eligible agencies notified | | | | | |
| US-DEV-03 | Là Developer Admin, tôi muốn approve agency apply quyền bán, để mở rộng mạng lưới có kiểm soát. | 5 | P2-S2 | E11 | FR-MKT-02 | S |
| AC-US-DEV-03 | Given agency application; When approve; Then agency can list project | | | | | |
| US-DEV-04 | Là Developer Admin, tôi muốn absorption report dashboard, để theo dõi tỷ lệ bán. | 5 | P2-S3 | E11 | FR-AN-03 | S |
| AC-US-DEV-04 | Given project data; When open absorption; Then sold/available chart by phase | | | | | |
| US-DEV-05 | Là Developer Admin, tôi muốn GMV report theo project, để đo hiệu quả kinh doanh. | 5 | P2-S3 | E11 | FR-AN-02 | M |
| AC-US-DEV-05 | Given transactions; When GMV report; Then total GMV by project period | | | | | |
| US-DEV-06 | Là Developer Admin, tôi muốn time-travel query bảng hàng, để truy vết lịch sử giá. | 5 | P2-S2 | E11 | FR-GR-06 | S |
| AC-US-DEV-06 | Given unit U1; When query at date T; Then snapshot at T displayed | | | | | |
| US-DEV-07 | Là Developer Admin, tôi muốn bulk import Excel bảng hàng, để onboard nhanh inventory lớn. | 8 | P2-S2 | E11 | FR-GR-07 | S |
| AC-US-DEV-07 | Given Excel template; When import 500 units; Then preview diff + confirm | | | | | |
| US-DEV-08 | Là Developer Admin, tôi muốn quản lý agency partnership, để network effect. | 3 | P2-S4 | E11 | FR-MKT-02 | S |
| AC-US-DEV-08 | Given marketplace; When view partners; Then status active/pending/suspended | | | | | |
| US-MKT-01 | Là Developer Admin, tôi muốn marketplace listing projects mở phân phối, để agency tìm dự án. | 3 | P2-S2 | E11 | FR-MKT-01 | S |
| AC-US-MKT-01 | Given published policy; When agency browse; Then eligible projects listed | | | | | |
| US-MKT-02 | Là Agency Admin, tôi muốn apply quyền bán project trên marketplace, để mở rộng danh mục. | 3 | P2-S2 | E11 | FR-MKT-02 | S |
| AC-US-MKT-02 | Given project open; When submit apply; Then dev receives notification | | | | | |
| US-MKT-03 | Là Agency Admin, tôi muốn nhận thông báo approve/reject apply, để biết kết quả nhanh. | 2 | P2-S3 | E11 | FR-MKT-02 | S |
| AC-US-MKT-03 | Given application reviewed; When decision made; Then email to agency admin | | | | | |
| US-MOB-01 | Là Agent, tôi muốn mobile app xem bảng hàng offline-read, để làm việc gallery mạng yếu. | 8 | P2-S3 | E12 | FR-UX-05 | S |
| AC-US-MOB-01 | Given cached data; When offline; Then last synced inventory visible | | | | | |
| US-MOB-02 | Là Agent, tôi muốn geo check-in khi visit khách, để attendance tracking. | 3 | P2-S4 | E12 | FR-UX-05 | S |
| AC-US-MOB-02 | Given mobile GPS on; When check-in at site; Then activity logged with geo | | | | | |
| US-MOB-03 | Là Agent, tôi muốn voice-to-CRM note sau cuộc gọi, để không mất thông tin. | 5 | P2-S4 | E12 | FR-UX-05 | S |
| AC-US-MOB-03 | Given voice note recorded; When sync; Then transcribed note on timeline | | | | | |
| US-MOB-04 | Là Agent, tôi muốn tạo booking từ mobile, để chốt deal hiện trường. | 5 | P2-S3 | E12 | FR-UX-05 | S |
| AC-US-MOB-04 | Given mobile app; When create booking; Then same flow as portal | | | | | |
| US-MOB-05 | Là Agent, tôi muốn push notify lead hot trên mobile, để phản hồi tức thì. | 2 | P2-S4 | E12 | FR-UX-05 | S |
| AC-US-MOB-05 | Given hot lead assigned; When push enabled; Then mobile notification ≤1min | | | | | |
| US-MOB-06 | Là Agent, tôi muốn camera upload ảnh listing tại chỗ, để tin đăng fresh. | 3 | P2-S4 | E12 | FR-UX-05 | S |
| AC-US-MOB-06 | Given mobile camera; When capture upload; Then attached to listing draft | | | | | |
| US-ESIGN-01 | Là Agent, tôi muốn generate hợp đồng từ template + booking data, để không soạn Word thủ công. | 5 | P2-S3 | E5 | FR-BK-05 | S |
| AC-US-ESIGN-01 | Given booking Deposited; When generate contract; Then PDF with merged fields | | | | | |
| US-ESIGN-02 | Là Buyer, tôi muốn ký hợp đồng điện tử qua link, để không cần đến văn phòng. | 8 | P2-S4 | E5 | FR-BK-06 | S |
| AC-US-ESIGN-02 | Given sign link; When e-sign complete; Then webhook updates Contract Signed | | | | | |
| US-AI-12 | Là Agent, tôi muốn RAG tra cứu pháp lý/policy dự án, để trả lời khách tại chỗ. | 5 | P2-S2 | E7 | FR-AI-05 | S |
| AC-US-AI-12 | Given legal question; When RAG query; Then answer + doc citations ≤15s | | | | | |
| US-AI-13 | Là Buyer, tôi muốn AI gợi ý sản phẩm phù hợp profile, để discovery thông minh. | 5 | P2-S3 | E7 | FR-AI-06 | S |
| AC-US-AI-13 | Given buyer preferences; When request match; Then ranked unit list | | | | | |
| US-TR-05 | Là Developer Admin, tôi muốn upload tài liệu pháp lý vào Document Vault, để quản lý tập trung. | 5 | P2-S2 | E13 | FR-TR-02 | S |
| AC-US-TR-05 | Given legal PDF; When upload vault; Then access controlled + watermark | | | | | |
| US-TR-06 | Là Ops Admin, tôi muốn download log tài liệu vault, để audit truy cập. | 3 | P2-S3 | E13 | FR-TR-02 | S |
| AC-US-TR-06 | Given doc downloaded; When audit query; Then user+timestamp logged | | | | | |
| US-BK-11 | Là Ops Admin, tôi muốn replay transaction timeline export PDF, để bằng chứng dispute. | 5 | P2-S3 | E13 | FR-BK-04 | S |
| AC-US-BK-11 | Given booking dispute; When export replay; Then PDF with all events | | | | | |
| US-ID-09 | Là Platform Admin, tôi muốn KYC/KYB verify Agency/Developer, để tin cậy đối tác. | 5 | P2-S1 | E2 | FR-ID-05 | S |
| AC-US-ID-09 | Given KYC submission; When review approve; Then tenant badge verified | | | | | |
| US-CRM-16 | Là Agency Admin, tôi muốn lead Facebook tự vào CRM, để không mất lead social. | 5 | P2-S1 | E10 | FR-CRM-07 | M |
| AC-US-CRM-16 | Given Meta connected; When lead ad submitted; Then CRM within 1 min | | | | | |
| US-CRM-17 | Là Agent, tôi muốn nhận reminder SLA trước deadline, để follow-up đúng hạn. | 3 | P2-S4 | E10 | FR-CRM-08 | S |
| AC-US-CRM-17 | Given SLA 4h; When 3h elapsed no activity; Then reminder notification | | | | | |

**Tổng Phase 2 User Stories:** 44 | ~180 SP

---

## 10. User Story Summary — Phase 3–6

### 10.1 Phase 3 (12 stories)

| ID | User Story | Epic | FR | Pri |
|----|------------|------|-----|-----|
| US-AI-14 | AI Sales Agent draft reply approve-to-send | E7 | FR-AI-07 | S |
| US-AI-15 | Ops AI flag listing/transaction anomaly | E7 | FR-AI-08 | S |
| US-AI-16 | Buyer conversational discovery chatbot | E7 | FR-AI-09 | C |
| US-TR-07 | Dispute Center mở case + evidence pack | E13 | FR-TR-03 | S |
| US-TR-08 | Ops mediate dispute resolution workflow | E13 | FR-TR-03 | S |
| US-CRM-18 | Unified omnichannel inbox | E10 | FR-CRM-09 | C |
| US-AN-05 | Campaign attribution ROI report | E14 | FR-AN-04 | S |
| US-AN-06 | Absorption forecast 30/60/90 ngày | E14 | FR-AN-05 | C |
| US-DW-01 | Data warehouse ETL nightly | E14 | FR-AN-02 | S |
| US-DW-02 | Broker scorecard dashboard | E14 | FR-MKT-03 | S |
| US-UX-05 | Buyer App favorites + deal tracking | E12 | FR-UX-06 | C |
| US-PAY-10 | Multi-gateway payment fallback | E6 | FR-PAY-06 | S |

### 10.2 Phase 4 (4 stories)

| ID | User Story | Epic | FR | Pri |
|----|------------|------|-----|-----|
| US-ID-10 | SSO Enterprise SAML/OIDC login | E2 | FR-ID-06 | C |
| US-BK-12 | Custom transaction workflow per tenant | E5 | FR-BK-08 | C |
| US-UX-06 | White-label portal branding | E15 | FR-UX-07 | C |
| US-NW-09 | API Marketplace partner registration | E15 | — | C |

### 10.3 Phase 5 (2 stories)

| ID | User Story | Epic | FR | Pri |
|----|------------|------|-----|-----|
| US-PAY-11 | Smart Escrow conditional fund release | E6 | FR-PAY-08 | C |
| US-PAY-12 | BNPL installment schedule | E6 | FR-PAY-09 | C |

### 10.4 Phase 6 (2 stories)

| ID | User Story | Epic | FR | Pri |
|----|------------|------|-----|-----|
| US-MKT-04 | Marketplace SLA penalty automation | E15 | FR-MKT-03 | C |
| US-UX-07 | Immersive 3D/Map discovery | E15 | FR-UX-01 | C |

**Tổng toàn dự án:** 132 User Stories (68 + 44 + 12 + 4 + 2 + 2)

---

## 11. Ma trận Actor × Use Case (Complete)

| Use Case | Guest | Buyer | Agent | Agency | Dev Admin | Ops | Platform | Finance | System |
|----------|-------|-------|-------|--------|-----------|-----|----------|---------|--------|
| UC-GR-01 | | | | | ✓ | | | | |
| UC-GR-02 | | | ✓ | | | | | | ✓ |
| UC-GR-03 | | | | | | ✓ | | | ✓ |
| UC-GR-04 | | | R | ✓ | | | | | |
| UC-GR-05 | | | | | ✓ | | | | |
| UC-GR-06 | | | | | ✓ | | | | |
| UC-GR-07 | | | ✓ | | ✓ | | | | ✓ |
| UC-ID-01 | | | | | | | ✓ | | |
| UC-ID-02 | | | | ✓ | ✓ | | | | |
| UC-ID-03 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| UC-ID-04 | | | | ✓ | ✓ | | | | |
| UC-ID-05 | | | | | | | ✓ | | |
| UC-LS-01 | ✓ | ✓ | | | | | | | ✓ |
| UC-LS-02 | | | | | | ✓ | | | |
| UC-LS-03 | ✓ | ✓ | | | | | | | |
| UC-LS-04 | | | ✓ | | | | | | |
| UC-LS-05 | ✓ | ✓ | | | | | | | |
| UC-LS-06 | | | | | | ✓ | | | ✓ |
| UC-LS-07 | | | | | | | | | ✓ |
| UC-CRM-01 | ✓ | ✓ | | | | | | | ✓ |
| UC-CRM-02 | | | | ✓ | | | | | ✓ |
| UC-CRM-03 | | | ✓ | ✓ | | | | | |
| UC-CRM-04 | | | ✓ | ✓ | | | | | |
| UC-CRM-05 | | | | | | | | | ✓ |
| UC-CRM-06 | | | ✓ | | | | | | ✓ |
| UC-CRM-07 | | | ✓ | | | | | | |
| UC-BK-01 | | | ✓ | | | | | | ✓ |
| UC-BK-02 | | ✓ | ✓ | | ✓ | | | | |
| UC-BK-03 | | | ✓ | | | ✓ | | | |
| UC-BK-04 | | | | | | ✓ | | | |
| UC-BK-05 | | | ✓ | | | ✓ | | | ✓ |
| UC-BK-06 | | | ✓ | | | | | | ✓ |
| UC-BK-07 | | ✓ | ✓ | | | | | | ✓ |
| UC-PAY-01 | | ✓ | | | | | | | ✓ |
| UC-PAY-02 | | | | | | | ✓ | ✓ | ✓ |
| UC-PAY-03 | | | | | | | | ✓ | ✓ |
| UC-PAY-04 | | | | | | | | ✓ | ✓ |
| UC-COM-01 | | | | | ✓ | | | | |
| UC-COM-02 | | | | | | | | | ✓ |
| UC-COM-03 | | | | | | | | ✓ | ✓ |
| UC-AI-01 | | | ✓ | | | | | | ✓ |
| UC-AI-02 | | | ✓ | ✓ | | | | | ✓ |
| UC-AI-03 | | | ✓ | | | | | | ✓ |
| UC-TR-01 | | | | ✓ | ✓ | ✓ | ✓ | | |
| UC-AN-01 | | | ✓ | ✓ | | | ✓ | | |
| UC-AN-02 | | | | | ✓ | | ✓ | | |
| UC-MKT-01 | | | | | ✓ | | | | |
| UC-MKT-02 | | | | ✓ | ✓ | | | | |
| UC-UX-01 | | | ✓ | | | | | | |
| UC-UX-03 | | | | | | ✓ | ✓ | | |
| UC-NW-01 | | ✓ | ✓ | | | | | | ✓ |
| UC-NW-02 | | | | | | | | | ✓ |

*Chú thích: R = Read-only; ✓ = Primary hoặc Secondary actor*

---

## 12. Sơ đồ Use Case dạng Text/ASCII

### 12.1 Luồng Lead Capture & Routing

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Buyer  │     │ Public Portal│     │  CRM Service│     │ AI Scoring   │
│ / Guest │     │  (UC-LS-05)  │     │ (UC-CRM-01) │     │ (UC-AI-02)   │
└────┬────┘     └──────┬───────┘     └──────┬──────┘     └──────┬───────┘
     │  1. View unit   │                      │                    │
     ├────────────────►│                      │                    │
     │  2. Click CTA   │                      │                    │
     │  "Tư vấn"       │                      │                    │
     ├────────────────►│  3. POST /leads      │                    │
     │                 ├─────────────────────►│                    │
     │                 │                      │  4. Score lead     │
     │                 │                      ├───────────────────►│
     │                 │                      │◄───────────────────┤
     │                 │                      │  5. Route (UC-CRM-02)
     │                 │                      ├──────────┐         │
     │                 │                      │          ▼         │
     │                 │                      │    ┌──────────┐    │
     │  6. Confirm     │                      │    │  Agent   │    │
     │◄────────────────┤                      │    │  Portal  │    │
     │     page        │                      │    └──────────┘    │
```

### 12.2 Luồng Listing từ Golden Record

```
Developer Admin          Golden Record           Agent              Anti-drift         Ops Admin
      │                       │                    │                    │                  │
      │  UC-GR-01 CRUD unit     │                    │                    │                  │
      ├──────────────────────►│                    │                    │                  │
      │                       │  unit available    │                    │                  │
      │                       ├───────────────────►│  UC-GR-02 Create   │                  │
      │                       │                    │  listing (draft)   │                  │
      │                       │                    ├───────────────────►│  UC-GR-03 Check  │
      │                       │                    │                    │                  │
      │                       │                    │◄── PASS ───────────┤                  │
      │                       │                    │  Submit Pending    │                  │
      │                       │                    ├──────────────────────────────────────►│
      │                       │                    │                    │  UC-LS-02 Approve│
      │                       │                    │                    │                  │
      │                       │◄── Published listing sync search ────│                  │
      │                       │                    │                    │                  │
 Buyer ◄── UC-LS-05 Public detail + Verified badge (UC-GR-06) ─────────────────────────────
```

### 12.3 Luồng Booking & Payment

```
  Agent              Booking Service        Inventory Lock        Payment           Buyer
    │                      │                     │                  │                │
    │ UC-BK-01 Create      │                     │                  │                │
    ├─────────────────────►│                     │                  │                │
    │                      │ Atomic lock UC-GR-08│                  │                │
    │                      ├────────────────────►│                  │                │
    │                      │◄──── locked ────────┤                  │                │
    │                      │ State: Deposit Pending                 │                │
    │                      │ PaymentIntent       │                  │                │
    │                      ├─────────────────────────────────────►│                │
    │                      │                     │                  │ Pay link       │
    │                      │                     │                  ├───────────────►│
    │                      │                     │                  │ UC-PAY-01 Pay  │
    │                      │                     │                  │◄───────────────┤
    │                      │◄── webhook success ────────────────────┤                │
    │                      │ Ledger + Deposited  │                  │                │
    │                      ├────────────────────►│ unit=reserved    │                │
    │◄── notify success ───┤                     │                  │                │
```

---

## 13. Sequence Flow Narratives

### 13.1 UC-CRM-01: Gửi yêu cầu tư vấn (Lead Form)

**Mô tả:** Buyer/Guest gửi form tư vấn từ trang chi tiết sản phẩm; hệ thống tạo lead, chấm điểm AI và phân công agent.

| Bước | From | To | Message / Action |
|------|------|-----|------------------|
| 1 | Buyer | Public Portal | GET `/listings/{slug}` — xem chi tiết unit |
| 2 | Buyer | Public Portal | Click "Đăng ký tư vấn" (click 1/3) |
| 3 | Buyer | Public Portal | Điền form: name, phone, consent PDPA (click 2/3) |
| 4 | Buyer | Lead API | POST `/api/v1/leads` {unit_id, listing_id, utm_source, ...} (click 3/3) |
| 5 | Lead API | Lead DB | INSERT lead, status=New |
| 6 | Lead API | Event Bus | Publish `LeadCreated` |
| 7 | AI Service | Event Bus | Consume → score lead (UC-AI-02) ≤2s |
| 8 | Routing Engine | Event Bus | Consume → apply rules (UC-CRM-02) |
| 9 | Routing Engine | Agent DB | UPDATE lead.owner_id = agent_X |
| 10 | Notification | Agent | Email/push "Lead mới assigned" |
| 11 | Lead API | Buyer | 201 + redirect confirmation page |
| 12 | Notification | Buyer | Optional SMS/email "Đã nhận yêu cầu" |

**Điểm kiểm soát:** Consent PDPA bắt buộc (NFR-C04); tổng ≤3 click (NFR-U03); lead gắn attribution (FR-CRM-02).

### 13.2 UC-BK-01: Tạo booking/giữ chỗ

**Mô tả:** Agent tạo booking cho buyer; hệ thống khóa unit atomic, tạo payment intent và schedule expiry.

| Bước | From | To | Message / Action |
|------|------|-----|------------------|
| 1 | Agent | Agent Portal | Chọn unit U1 (available) + buyer từ lead |
| 2 | Agent Portal | Booking API | POST `/bookings` {unit_id, buyer_id, expiry_hours, deposit_amount} |
| 3 | Booking API | Redis Lock | SET lock:unit:U1 NX EX 30 |
| 4 | Booking API | Inventory DB | BEGIN TX; SELECT unit FOR UPDATE; verify available |
| 5 | Booking API | Inventory DB | UPDATE unit status=reserved; INSERT booking state=DepositPending |
| 6 | Booking API | Event Store | APPEND BookingCreated, UnitReserved events |
| 7 | Booking API | Golden Record | Snapshot price/policy at T0 |
| 8 | Booking API | Scheduler | Schedule expiry job at T0 + expiry_hours |
| 9 | Booking API | Payment Service | Create PaymentIntent |
| 10 | Payment Service | Agent/Buyer | Return payment_url |
| 11 | Booking API | SSE | Broadcast unit status change |
| 12 | Agent Portal | Agent | Display booking ref + payment link to share |

**Nhánh lỗi:** Bước 3 lock fail → 409 "Unit no longer available" (UC-GR-08); không partial state — rollback TX.

### 13.3 UC-PAY-01: Tạo & thanh toán cọc online

**Mô tả:** Buyer thanh toán deposit qua gateway; webhook cập nhật booking, ledger và notify stakeholders.

| Bước | From | To | Message / Action |
|------|------|-----|------------------|
| 1 | Buyer | Payment Page | GET `/pay/{payment_intent_id}` |
| 2 | Payment Page | Payment Service | Load intent: amount, booking_ref, unit_info |
| 3 | Buyer | Gateway | Complete card/bank payment |
| 4 | Gateway | Payment Webhook | POST `/webhooks/payment` + signature |
| 5 | Payment Service | Idempotency Store | Check idempotency_key — skip if processed |
| 6 | Payment Service | Ledger | Double-entry: debit buyer, credit escrow |
| 7 | Payment Service | Booking API | PATCH booking state=Deposited |
| 8 | Booking API | Event Store | APPEND PaymentConfirmed |
| 9 | Booking API | Inventory | Confirm unit=reserved (final) |
| 10 | Notification | Agent, Dev, Buyer | Payment success notifications |
| 11 | Payment Service | Gateway | 200 ACK webhook |

**NFR:** Webhook xử lý ≤30s (AC-BK-03); idempotent (AC-PAY-03); ledger balanced (AC-PAY-02).

---

## 14. Liên kết tài liệu & Traceability

| Tài liệu | File | Mối quan hệ |
|----------|------|-------------|
| SRS | `Tai-lieu-yeu-cau-phan-mem.md` | FR/NFR source |
| Acceptance Criteria | `Tieu-chi-chap-nhan.md` | AC chi tiết theo FR |
| Yêu cầu xác nhận | `Yeu-cau-da-xac-nhan.md` | Sign-off register |
| Kế hoạch dự án | `Ke-hoach-du-an.md` | Roadmap 6 phase |
| Phạm vi | `Pham-vi-cong-viec.md` | In/out scope |
| Timeline | `Timeline-so-bo.md` | Milestone dates |
| Rủi ro | `Danh-sach-rui-ro.md` | Risk vs UC |

### 14.1 Traceability Matrix (Sample)

| User Story | Use Case | FR | Test Case |
|------------|----------|-----|-----------|
| US-GR-08 | UC-BK-01, UC-GR-07 | FR-BK-02 | TC-GR-06 load test |
| US-CRM-01 | UC-CRM-01 | FR-CRM-01 | TC-CRM-01 |
| US-BK-03 | UC-PAY-01 | FR-PAY-05 | TC-PAY-01 |
| US-AI-02 | UC-AI-01 | FR-AI-04 | TC-AI-02 |

---

## 15. Phụ lục — Glossary

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| Golden Record | Unit gốc từ Developer — nguồn chuẩn duy nhất |
| Anti-drift | Cơ chế ngăn listing lệch giá/trạng thái vs Golden Record |
| GMV | Gross Merchandise Value — tổng giá trị giao dịch qua platform |
| Deposit Pending | Trạng thái booking chờ buyer thanh toán cọc |
| Event Store | Kho lưu domain events append-only cho replay |
| Verified Listing | Listing pass anti-drift, hiển thị badge tin cậy |

---

*Kết thúc tài liệu Danh sách Use Case & User Story v2.0 — WEREAL REOS*
