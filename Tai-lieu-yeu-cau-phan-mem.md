# Tài liệu yêu cầu phần mềm (SRS) — WEREAL REOS

> **Dự án:** WEREAL — Real Estate Operating System (REOS)
> **Phiên bản tài liệu:** 2.0
> **Ngày phát hành:** 28/07/2026
> **Trạng thái:** Draft — chờ Steering Committee sign-off
> **Baseline ID:** WEREAL-SRS-2026-v2.0
> **Liên kết:** `Danh-sach-use-case-user-story.md` | `Tieu-chi-chap-nhan.md` | `Yeu-cau-da-xac-nhan.md` | `Ke-hoach-du-an.md` | `Pham-vi-cong-viec.md`

---

## Mục lục

0. [Kiểm soát tài liệu](#0-kiem-soat-tai-lieu)
1. [Tóm tắt điều hành](#1-tom-tat-dieu-hanh)
2. [Giới thiệu](#2-gioi-thieu)
3. [Nghiên cứu người dùng](#3-nghien-cuu-nguoi-dung)
4. [Quy trình AS-IS](#4-quy-trinh-as-is)
5. [Ma trận điểm đau](#5-ma-tran-diem-dau)
6. [Quy trình TO-BE](#6-quy-trinh-to-be)
7. [Yêu cầu chức năng](#7-yeu-cau-chuc-nang)
8. [Yêu cầu phi chức năng](#8-yeu-cau-phi-chuc-nang)
9. [Yêu cầu dữ liệu](#9-yeu-cau-du-lieu)
10. [Yêu cầu giao diện](#10-yeu-cau-giao-dien)
11. [Ưu tiên MoSCoW](#11-uu-tien-moscow)
12. [Ràng buộc và giả định](#12-rang-buoc-va-gia-dinh)
13. [Phụ thuộc và rủi ro](#13-phu-thuoc-va-rui-ro)
14. [Ma trận truy vết](#14-ma-tran-truy-vet)
15. [Phụ lục](#15-phu-luc)

---

## 0. Kiểm soát tài liệu

### 0.1 Thông tin phiên bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên tài liệu** | Tài liệu Yêu cầu Phần mềm (SRS) — WEREAL REOS |
| **Mã tài liệu** | WEREAL-SRS-001 |
| **Phiên bản** | 2.0 |
| **Trạng thái** | Draft — Internal Review |
| **Phân loại** | Confidential — Nội bộ dự án |
| **Ngôn ngữ** | Tiếng Việt (Thuật ngữ kỹ thuật giữ nguyên EN khi cần) |
| **Kiến trúc tham chiếu** | WEREAL Architecture v2.0 — 9 lớp |
| **Roadmap** | 6 Phase / 26 tháng (T8/2026 — T10/2028) |

### 0.2 Tác giả và phê duyệt

| Vai trò | Họ tên | Chức danh | Email |
|---------|--------|-----------|-------|
| **Product Owner** | [TBD] | Head of Product | po@wereal.vn |
| **BA Lead** | [TBD] | Business Analyst Lead | ba@wereal.vn |
| **Tech Lead / Architect** | [TBD] | Principal Architect | arch@wereal.vn |
| **AI Lead** | [TBD] | Head of AI/ML | ai@wereal.vn |
| **Compliance/Legal** | [TBD] | Legal Counsel | legal@wereal.vn |

### 0.3 Lịch sử sửa đổi

| Version | Ngày | Mô tả thay đổi | Author | Reviewer |
|---------|------|----------------|--------|----------|
| 0.1 | 15/07/2026 | Draft nội bộ từ workshop kiến trúc v2.0 | BA Team | PO |
| 1.0 | 28/07/2026 | SRS v1.0 — phỏng vấn INT-01→06, FR baseline Phase 1 | BA Team | Tech Lead |
| **2.0** | **28/07/2026** | **Mở rộng toàn diện: personas, AS-IS chi tiết, pain matrix 5-Why, state machine 15 states, FR đầy đủ 82 items, NFR metrics, data/interface reqs, traceability** | **BA Team** | **Steering Committee** |

### 0.4 Phân phối tài liệu

| Nhóm nhận | Mục đích |
|-----------|----------|
| Steering Committee | Sign-off scope và priority |
| Engineering (BE/FE/Mobile/AI) | Implementation reference |
| QA | Test plan và acceptance criteria |
| Pilot Developer / Agency | UAT validation |
| Legal / Compliance | Regulatory alignment |
| Partnership (Payment, Zalo, Meta) | Integration requirements |

---

## 1. Tóm tắt điều hành

WEREAL là **Real Estate Operating System (REOS)** — nền tảng PropTech SaaS đa tenant, AI-native, được thiết kế để trở thành hệ điều hành phân phối bất động sản tại Việt Nam. Khác với marketplace đăng tin truyền thống, WEREAL xây dựng **transaction platform + data platform + distribution network** với ba hào kinh doanh: Golden Record (Data Moat), giao dịch end-to-end (Transaction Moat), và Developer–Agency marketplace (Network Moat).

### 1.1 Bối cảnh và vấn đề

Thị trường BĐS Việt Nam phân mảnh dữ liệu nghiêm trọng: Developer gửi bảng hàng Excel qua Zalo/email, Agency copy sang web riêng, Agent giữ chỗ miệng, kế toán đối soát bank thủ công 2–3 ngày. Hệ quả: double booking, tranh chấp giá, lead rơi rụng, hoa hồng Excel tranh cãi, buyer mất niềm tin. Không có single source of truth — chỉ có kênh marketing rời rạc.

### 1.2 Giải pháp WEREAL

| Thành phần | Mô tả | Phase |
|------------|-------|-------|
| **Golden Record** | Unit gốc từ Developer — nguồn chuẩn duy nhất, versioning, anti-drift | 1 |
| **Transaction Engine** | Booking → Payment → Ledger → Contract → Commission event-sourced | 1–2 |
| **AI Workforce** | Copilot, lead scoring, RAG, Agents với guardrails human-in-the-loop | 1–3 |
| **Omnichannel Hub** | Zalo OA/ZNS, Meta Lead Ads native integration | 2 |
| **Trust Layer** | Verified Listing, audit trail, Dispute Center | 1–3 |
| **Embedded Finance** | Escrow, BNPL, mortgage pre-qual | 5 |
| **Network Marketplace** | Developer↔Agency distribution, leaderboard | 2–6 |

### 1.3 Kiến trúc 9 lớp (v2.0)

```
L1 Experience → L2 Identity → L3 Domain Apps → L4 Data/Workflow
→ L5 AI → L6 Payment → L7 Intelligence → L8 Trust → L9 Network
```

### 1.4 Roadmap và mục tiêu

| Phase | Thời gian | Mục tiêu chính | Go-live |
|-------|-----------|----------------|---------|
| **Phase 1** | T8–T12/2026 | MVP E2E transaction + Golden Record | 31/12/2026 |
| **Phase 2** | T1–T4/2027 | Commission OS, omnichannel, mobile, dev portal | T4/2027 |
| **Phase 3** | T5–T9/2027 | Data platform, AI Agents, trust layer, buyer app | T9/2027 |
| **Phase 4** | T10/2027–T2/2028 | Enterprise SSO, white-label, multi-region | T2/2028 |
| **Phase 5** | T3–T6/2028 | Embedded finance (escrow, BNPL, mortgage) | T6/2028 |
| **Phase 6** | T7–T10/2028 | Network marketplace, data product, 3D discovery | T10/2028 |

**North Star Metric:** GMV đi qua platform — không phải số listing.

### 1.5 Phạm vi SRS v2.0

Tài liệu này định nghĩa **82 Functional Requirements (FR)**, **45+ Non-Functional Requirements (NFR)**, **18 Pain Points** với root cause analysis, **6 Personas**, **5 quy trình AS-IS chi tiết**, state machine **15 trạng thái**, **24 domain events**, ma trận truy vết Pain→BR→FR→UC→US, và MoSCoW cho toàn bộ 6 phase.

---

## 2. Giới thiệu

### 2.1 Mục đích

Tài liệu SRS v2.0 mô tả đầy đủ yêu cầu phần mềm cho WEREAL REOS, phục vụ:
- **Thiết kế kiến trúc:** Cơ sở cho ADR, module boundary, API contract
- **Phát triển:** Backlog sprint, definition of done
- **Kiểm thử:** Test plan, UAT scenarios, acceptance criteria
- **Nghiệm thu:** Phase gate review, sign-off baseline
- **Quản trị thay đổi:** Change Request impact analysis

### 2.2 Phạm vi

#### 2.2.1 Trong phạm vi (In-Scope)

| Hạng mục | Mô tả | Phase |
|----------|-------|-------|
| Multi-tenant SaaS B2B2C | Developer, Agency, Branch, Agent, Buyer | 1+ |
| Golden Record & Product Graph | Unit gốc, versioning, anti-drift, time-travel | 1–2 |
| Listing & Search | CRUD, approval, full-text, geo, CDC sync | 1–3 |
| CRM & Omnichannel | Lead capture, routing, Zalo, Meta | 1–3 |
| Booking & Transaction | State machine, atomic lock, event store | 1 |
| Payment & Ledger | Gateway, double-entry, reconciliation | 1–3 |
| Commission OS | Policy, snapshot, split, settlement | 2 |
| AI Layer | Copilot, scoring, RAG, Agents, guardrails | 1–3 |
| Trust & Compliance | Audit, vault, dispute, regulatory export | 1–4 |
| Analytics & Intelligence | KPI, GMV, absorption, forecast | 1–3 |
| Marketplace | Distribution policy, agency apply/approve | 2–6 |
| Experience Layer | Public, Agent, Admin, Dev portals, mobile, buyer app | 1–4 |
| Embedded Finance | Escrow, BNPL, mortgage | 5 |

#### 2.2.2 Ngoài phạm vi (Out-of-Scope)

| Hạng mục | Lý do | Ghi chú |
|----------|-------|---------|
| Quản lý thi công/xây dựng | Ngoài REOS domain | Dự án riêng nếu cần |
| Tự xây payment gateway | Dùng partner VNPay/MoMo | EX-01 |
| Tự host LLM foundation model | Dùng LLM provider Phase 1–4 | CON-07 |
| Migration hệ thống legacy | Phạm vi dự án riêng | EX-04 |
| Blockchain smart contract | Event store đủ audit | EX-02 |
| Call center VoIP sâu | Phase 6+ nếu CR | EX-05 |
| ERP thay thế hoàn toàn | Export/integration only | — |
| IoT smart building | Không thuộc transaction OS | Won't v1 |

### 2.3 Thuật ngữ và định nghĩa (Glossary)

| # | Thuật ngữ | Định nghĩa |
|---|-----------|------------|
| 1 | **Golden Record** | Dữ liệu unit gốc từ Developer — single source of truth cho giá, trạng thái tồn kho, policy. Agency chỉ tạo lớp marketing, không drift. |
| 2 | **Product Graph** | Mô hình quan hệ Developer→Project→Phase→Building→Unit→Listing→Lead→Booking→Payment→Commission. |
| 3 | **Listing Marketing** | Lớp nội dung bán hàng do Agency/Agent tạo trên Golden Record — mô tả, ảnh, headline — không chứa giá gốc editable. |
| 4 | **Anti-drift** | Cơ chế tự động phát hiện và block/flag listing lệch giá hoặc trạng thái so với Golden Record. |
| 5 | **GMV** | Gross Merchandise Value — tổng giá trị giao dịch đi qua platform. |
| 6 | **Tenant** | Tổ chức độc lập trên platform: Platform, Developer, Agency, Branch. |
| 7 | **RLS** | Row-Level Security — cách ly dữ liệu tenant ở t/database PostgreSQL. |
| 8 | **RBAC** | Role-Based Access Control — phân quyền theo vai trò user. |
| 9 | **ABAC** | Attribute-Based Access Control — phân quyền theo thuộc tính project/khu vực. |
| 10 | **Event Sourcing** | Pattern lưu trạng thái qua chuỗi domain events append-only, cho phép replay timeline. |
| 11 | **State Machine** | Máy trạng thái giao dịch 15 states định nghĩa lifecycle deal từ Draft đến Completed. |
| 12 | **PaymentIntent** | Đối tượng thanh toán abstract trước khi charge gateway — link booking. |
| 13 | **Double-entry Ledger** | Sổ cái kế toán kép — mọi giao dịch có debit/credit cân bằng. |
| 14 | **Commission Snapshot** | Bản chụp policy hoa hồng tại thời điểm chốt deal — immutable. |
| 15 | **Distribution Policy** | Chính sách Developer cấp quyền bán project cho Agency theo khu vực/tier. |
| 16 | **Verified Listing** | Badge xác nhận listing khớp 100% Golden Record và đã qua duyệt. |
| 17 | **Lead Scoring** | AI chấm điểm lead hot/warm/cold để ưu tiên follow-up. |
| 18 | **Omnichannel Hub** | Lớp tích hợp Zalo OA/ZNS, Meta Lead Ads, SMS vào CRM thống nhất. |
| 19 | **CDC** | Change Data Capture — đồng bộ thay đổi Golden Record sang Search index real-time. |
| 20 | **CQRS** | Command Query Responsibility Segregation — tách write model và read model. |
| 21 | **Outbox Pattern** | Đảm bảo event publish đáng tin cậy cùng DB transaction. |
| 22 | **Human-in-the-loop** | Yêu cầu con người approve trước khi AI action có impact (publish, send). |
| 23 | **Guardrails** | Ràng buộc AI không mutate giá, tồn kho, tạo booking — read-only domain. |
| 24 | **Time-travel Query** | Truy vấn trạng thái dữ liệu tại thời điểm T trong quá khứ. |
| 25 | **REOS** | Real Estate Operating System — định vị sản phẩm WEREAL. |
| 26 | **PropTech** | Property Technology — công nghệ ứng dụng cho ngành bất động sản. |
| 27 | **UAT** | User Acceptance Testing — kiểm thử chấp nhận với tenant pilot. |
| 28 | **MoSCoW** | Must / Should / Could / Won't — phương pháp ưu tiên yêu cầu. |

### 2.4 Tài liệu tham chiếu

| # | Tài liệu | Phiên bản | Mô tả |
|---|----------|-----------|-------|
| REF-01 | `Ke-hoach-du-an.md` | 2.0 | Kế hoạch dự án, kiến trúc 9 lớp, roadmap 6 phase |
| REF-02 | `Pham-vi-cong-viec.md` | 2.0 | In/out scope, deliverables theo phase |
| REF-03 | `Danh-sach-use-case-user-story.md` | 1.0 | 42 UC, 68 US Phase 1 |
| REF-04 | `Tieu-chi-chap-nhan.md` | 1.0 | Acceptance criteria theo FR ID |
| REF-05 | `Yeu-cau-da-xac-nhan.md` | 1.0 | Register yêu cầu sign-off |
| REF-06 | `Danh-sach-rui-ro.md` | 2.0 | 42 rủi ro với mitigation |
| REF-07 | `Timeline-so-bo.md` | 2.0 | Lịch triển khai 26 tháng |
| REF-08 | `WEREAL Architecture v2.0` | 2.0 | Sơ đồ 9 lớp, Golden Record, event flow |
| REF-09 | `ADR Registry` | — | Architecture Decision Records |
| REF-10 | `OpenAPI Specification` | — | API contract (Sprint 9+) |

### 2.5 Stakeholders và ma trận RACI

| Stakeholder | Vai trò | R | A | C | I | Mức ảnh hưởng |
|-------------|---------|---|---|---|---|---------------|
| Chủ đầu tư (Developer) | Quản lý Golden Record, policy, absorption | ✓ | ✓ | ✓ | ✓ | Cao |
| Đại lý (Agency Admin) | CRM, lead pool, commission, distribution | ✓ | ✓ | ✓ | ✓ | Cao |
| Môi giới (Agent) | Listing, tư vấn, booking, chốt deal hiện trường | ✓ |  | ✓ | ✓ | Cao |
| Khách mua (Buyer) | Tìm kiếm, lead, booking, payment, track deal |  |  | ✓ | ✓ | Trung bình |
| Ops/Admin Platform | Moderation, audit, dispute, trust config | ✓ | ✓ | ✓ | ✓ | Cao |
| Platform Operator | Tenant, billing, GMV, SLA, partnership | ✓ | ✓ | ✓ | ✓ | Cao |
| Platform Finance | Ledger, reconciliation, settlement, payout |  |  | ✓ | ✓ | Cao |
| Legal/Compliance | KYC, quảng cáo BĐS, embedded finance |  |  | ✓ | ✓ | Trung bình |
| Payment Partner | Gateway, webhook, settlement |  |  |  | ✓ | Trung bình |
| AI/LLM Provider | Copilot, scoring, RAG inference |  |  |  | ✓ | Thấp |

*R=Responsible, A=Accountable, C=Consulted, I=Informed*

---

## 3. Nghiên cứu người dùng

### 3.1 Tổng quan phương pháp

| Thuộc tính | Giá trị |
|------------|---------|
| **Phương pháp** | Semi-structured interview, shadowing, focus group, workshop |
| **Thời gian** | T6–T7/2026 |
| **Tổng buổi** | 20 buổi + 2 focus group |
| **Participant** | 2 Developer org, 2 Agency org, 6 Agent, 8 Buyer, 2 Ops, 2 Platform |
| **Deliverable** | Persona × 6, Pain matrix, FR mapping |

### 3.2 Kế hoạch phỏng vấn

| ID | Nhóm | Số buổi | Phương pháp | Thời lượng | Mục tiêu |
|---|------|---------|-------------|------------|----------|
| INT-01 | Developer (2 org pilot) | 4 | Semi-structured interview | 60 phút | Golden Record, policy, đối soát |
| INT-02 | Agency (2 org pilot) | 4 | Interview + shadowing sale | 90 phút | CRM, lead, listing, commission |
| INT-03 | Agent (6 người) | 6 | Interview + quan sát gallery | 45 phút | Hiện trường, mobile, booking |
| INT-04 | Buyer (8 người) | 2 focus group | Focus group | 90 phút | Trust, search, payment UX |
| INT-05 | Ops/Admin | 2 | Interview | 60 phút | Moderation, audit, dispute |
| INT-06 | Platform/Finance | 2 | Workshop | 120 phút | GMV, ledger, SLA, roadmap |

### 3.3 Script phỏng vấn theo nhóm stakeholder

#### 3.3.1 Developer (INT-01)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | Quy trình cập nhật bảng hàng hiện tại như thế nào? Ai sửa, tần suất, công cụ? | Hiểu AS-IS Golden Record |
| 2 | Khi giá hoặc trạng thái căn thay đổi, thông tin đến đại lý qua kênh nào? Mất bao lâu? | Pain drift, latency |
| 3 | Bao nhiêu lần/tháng xảy ra tranh chấp giữ chỗ? Quy trình xử lý? | Double booking frequency |
| 4 | Đối soát cọc với ngân hàng mất bao lâu? Ai thực hiện? | Payment reconciliation pain |
| 5 | Làm sao biết đại lý nào bán hiệu quả? Lead đến từ đâu? | Attribution, scorecard need |
| 6 | Khi mở quyền bán cho đại lý mới, lo ngại gì nhất? | Distribution policy, compliance |
| 7 | Dữ liệu nào bắt buộc trên mỗi unit? Field nào hay sai? | GR schema requirements |
| 8 | Nếu có hệ thống trung tâm, tính năng nào không thể thiếu? | Priority validation |

#### 3.3.2 Agency (INT-02)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | Mỗi dự án nhận bảng hàng format thế nào? Sale nhập liệu ra sao? | Excel fragmentation |
| 2 | Lead từ Facebook/Zalo vào hệ thống nào? Có mất lead không? | Omnichannel pain |
| 3 | Sale giỏi và sale yếu khác nhau ở bước nào? Content listing? | AI copilot need |
| 4 | Tiêu chí ưu tiên lead khi gọi? Có scoring không? | Lead scoring requirements |
| 5 | Sau khi chốt cọc, báo developer/kế toán thế nào? | Booking notification workflow |
| 6 | Hoa hồng tính thế nào? Tần suất tranh chấp? | Commission OS requirements |
| 7 | Agent có bypass platform không? Vì sao? | Adoption barrier R-B01 |
| 8 | Mobile/field sales cần gì nhất tại gallery? | Mobile requirements |

#### 3.3.3 Agent (INT-03)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | Tại gallery, tra cứu bảng hàng bằng gì? Mạng yếu có vấn đề? | Offline mobile need |
| 2 | Khách hỏi pháp lý — mất bao lâu để trả lời? | RAG assistant need |
| 3 | Sau cuộc gọi, ghi note thế nào? Có bỏ qua không? | Voice-to-CRM need |
| 4 | Tạo link thanh toán cọc hiện tại? | Payment intent integration |
| 5 | Double booking từng gặp? Hậu quả? | Lock inventory validation |
| 6 | Listing mất bao lâu để tạo? Bước khó nhất? | AI copilot UX |
| 7 | Công cụ nào dùng hàng ngày? (Excel, Zalo, CRM?) | Tool landscape |
| 8 | Điều gì khiến bạn tin/tin tưởng platform mới? | Adoption drivers |

#### 3.3.4 Buyer (INT-04)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | Tìm căn hộ/chung cư qua kênh nào? Tin cậy kênh nào nhất? | Channel trust |
| 2 | Từng gặp web báo còn hàng nhưng hết thật? | Inventory sync pain |
| 3 | Sau khi cọc, biết tiến độ deal qua đâu? | Deal tracking need |
| 4 | So sánh nhiều căn — dùng công cụ gì? | Compare engine need |
| 5 | Lo ngại gì khi thanh toán online cọc BĐS? | Payment UX, trust |
| 6 | Badge/tick xác minh có quan trọng? | Verified Listing validation |
| 7 | Chatbot tư vấn tự động — thái độ? | AI concierge acceptance |
| 8 | Thông tin nào quyết định liên hệ agent? | Lead form optimization |

#### 3.3.5 Ops/Admin (INT-05)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | Duyệt listing hiện tại mất bao lâu? So khớp bảng gốc thế nào? | Approval + anti-drift |
| 2 | Khiếu nại/tranh chấp — có timeline rõ không? | Dispute center need |
| 3 | Audit ai sửa giá lúc nào — khả thi không? | Audit trail requirements |
| 4 | Listing vi phạm quảng cáo BĐS — xử lý? | Compliance workflow |
| 5 | SLA xử lý khiếu nại mong muốn? | Ops SLA targets |
| 6 | Báo cáo regulator cần export gì? | Regulatory export Phase 4 |

#### 3.3.6 Platform/Finance (INT-06)

| # | Câu hỏi | Mục đích |
|---|---------|----------|
| 1 | North star metric platform là gì? GMV hay listing count? | GMV alignment |
| 2 | Revenue model ưu tiên Phase 1? | Monetization scope |
| 3 | Payment gateway partner nào? Sandbox timeline? | R-O05 dependency |
| 4 | Ledger/reconciliation yêu cầu kế toán? | Double-entry requirements |
| 5 | Multi-tenant isolation concern? | RLS priority |
| 6 | SLA uptime target enterprise? | NFR-A01 targets |
| 7 | AI cost budget cap Phase 1? | R-A03 constraint |
| 8 | Phase 5 embedded finance — legal blocker? | R-P11 dependency |

### 3.4 Bảng kết quả phỏng vấn tổng hợp

| ID | Nhóm | Trích dẫn | Pain point | Requirement ID | Priority |
|---|------|-----------|------------|----------------|----------|
| DEV-I01 | Developer | "Bảng hàng Excel gửi đại lý tuần sau đã lệch — không biết ai sửa giá" | PP-01 | FR-GR-01,02,04 | Must |
| DEV-I02 | Developer | "Không biết đại lý nào bán hiệu quả, lead đến từ đâu" | PP-13 | FR-AN-04, FR-MKT-03 | Should |
| DEV-I03 | Developer | "Tranh chấp giữ chỗ — 2 khách cùng book 1 căn, không có bằng chứng" | PP-02 | FR-BK-02, FR-BK-04 | Must |
| DEV-I04 | Developer | "Đối soát cọc với ngân hàng mất 2 ngày cuối tháng" | PP-04 | FR-PAY-03,04 | Must |
| DEV-I05 | Developer | "Muốn mở quyền bán đại lý mới nhưng sợ spam listing sai" | PP-14 | FR-MKT-01,02 | Should |
| AGY-I01 | Agency | "Mỗi dự án một file Excel khác nhau, sale nhập sai liên tục" | PP-01 | FR-GR-03, FR-GR-07 | Must |
| AGY-I02 | Agency | "Lead Facebook/Zalo vào nhiều nơi, mất lead" | PP-03 | FR-CRM-06,07 | Must P2 |
| AGY-I03 | Agency | "Sale giỏi viết tin, sale yếu để trống mô tả" | PP-06 | FR-AI-01,04 | Must |
| AGY-I04 | Agency | "Không biết lead nào ưu tiên gọi trước" | PP-07 | FR-AI-02, FR-CRM-03 | Must |
| AGY-I05 | Agency | "Chốt cọc xong phải báo thủ công, hay quên" | PP-15 | FR-BK-01, FR-PAY-05 | Must |
| AGY-I06 | Agency | "Hoa hồng tính Excel, tranh cãi mỗi quý" | PP-05 | FR-COM-01→05 | Must P2 |
| AGT-I01 | Agent | "Ngoài gallery mạng yếu, không xem được bảng hàng" | PP-09 | FR-UX-05 | Should P2 |
| AGT-I02 | Agent | "Khách hỏi pháp lý, phải gọi về office tra 10 phút" | PP-16 | FR-AI-05 | Should P2 |
| AGT-I03 | Agent | "Nhập note sau cuộc gọi lười, mất thông tin" | PP-17 | FR-CRM-04, FR-AI-07 | Should |
| AGT-I04 | Agent | "Tạo link thanh toán cọc thủ công qua chuyển khoản" | PP-04 | FR-PAY-01,05 | Must |
| BUY-I01 | Buyer | "Web báo còn hàng, đến gallery hết" | PP-02 | FR-GR-08, FR-LS-06 | Must |
| BUY-I02 | Buyer | "Không biết đã cọc đến bước nào" | PP-18 | FR-BK-03, FR-UX-06 | Could P3 |
| BUY-I03 | Buyer | "So sánh 3 căn khó, phải mở nhiều tab" | PP-19 | FR-LS-04, FR-AI-06 | Should |
| BUY-I04 | Buyer | "Sợ tin đăng ảo, giá không đúng" | PP-10 | FR-GR-05 | Should |
| OPS-I01 | Ops | "Duyệt listing thủ công, không so được với bảng gốc" | PP-01 | FR-GR-04, FR-LS-01 | Must |
| OPS-I02 | Ops | "Khiếu nại không có timeline rõ" | PP-08 | FR-TR-03, FR-BK-04 | Should P3 |
| OPS-I03 | Ops | "Không audit được ai sửa giá lúc nào" | PP-08 | FR-TR-01, FR-GR-06 | Must |
| PLT-I01 | Platform | "GMV qua platform là north star — không listing count" | PP-12 | FR-AN-02, FR-PAY-03 | Must |
| PLT-I02 | Platform | "Agent bypass nếu workflow chậm hơn Zalo" | PP-12 | FR-BK-01, FR-UX-02 | Must |

### 3.5 Personas (6 personas)

#### Persona P1: Minh Tuấn — Developer Sales Director

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Developer Admin |
| **Demographics** | 45 tuổi, TP Kinh doanh CĐT tier-1 |
| **Goals** | Kiểm soát bảng hàng gốc; biết đại lý nào bán tốt; zero tranh chấp giữ chỗ |
| **Frustrations** | Excel lệch; đối soát bank 2 ngày; không attribution |
| **Needs from WEREAL** | Cập nhật GR real-time; dashboard absorption; auto reconcile cọc |
| **Scenario** | Tuần mở bán Block A — cập nhật giá 50 unit, 5 agency nhận push instant, zero drift |

#### Persona P2: Lan Hương — Agency Director

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Agency Admin |
| **Demographics** | 38 tuổi, Giám đốc đại lý 80 agent |
| **Goals** | Lead không mất; sale hiệu quả; hoa hồng minh bạch |
| **Frustrations** | Lead FB/Zalo rơi; hoa hồng Excel tranh cãi; sale bypass CRM |
| **Needs from WEREAL** | Omnichannel hub; AI scoring; commission snapshot |
| **Scenario** | Tháng cao điểm — 500 lead FB auto vào CRM, hot lead route top agent, commission batch cuối quý không tranh cãi |

#### Persona P3: Hoàng Nam — Field Agent

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Agent |
| **Demographics** | 28 tuổi, sale gallery cao cấp |
| **Goals** | Chốt deal nhanh tại gallery; tra cứu offline; link cọc 1 click |
| **Frustrations** | Mạng yếu; tra pháp lý 10 phút; nhập note lười |
| **Needs from WEREAL** | Mobile offline; RAG assistant; payment link + voice-to-CRM |
| **Scenario** | Khách VIP tại gallery — offline xem bảng hàng, AI trả lời pháp lý 30s, gửi link cọc, khách pay trong 5 phút |

#### Persona P4: Thu Trang — First-time Buyer

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Buyer |
| **Demographics** | 32 tuổi, mua căn hộ đầu tiên |
| **Goals** | Tin tồn kho chính xác; so sánh căn; track deal |
| **Frustrations** | Web hết hàng thật; không tin tin đăng; không biết tiến độ cọc |
| **Needs from WEREAL** | Verified badge; compare engine; deal notification |
| **Scenario** | Tìm 3BR Q7 — compare 3 căn, badge Verified, cọc online, nhận SMS mỗi bước đến ký HĐ |

#### Persona P5: Quốc Bảo — Platform Ops Admin

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Ops Admin |
| **Demographics** | 35 tuổi, Trust & Compliance team |
| **Goals** | Duyệt listing nhanh; audit đầy đủ; xử lý dispute có evidence |
| **Frustrations** | Duyệt thủ công không so GR; khiếu nại thiếu timeline |
| **Needs from WEREAL** | Anti-drift auto-check; event replay; dispute center |
| **Scenario** | Listing flagged drift — auto-block, audit show ai sửa giá 14:32, dispute replay timeline 48h resolve |

#### Persona P6: Kim Anh — Platform Finance Manager

| Thuộc tính | Chi tiết |
|------------|----------|
| **Role** | Platform Operator |
| **Demographics** | 40 tuổi, Head of Finance Platform |
| **Goals** | GMV tracking live; 100% reconcile; settlement tự động |
| **Frustrations** | Ledger mismatch; manual payout; không visibility GMV |
| **Needs from WEREAL** | Double-entry ledger; daily reconcile; GMV dashboard |
| **Scenario** | Cuối tháng — reconcile 100% 10,000 txn, GMV dashboard live, commission batch approved payout |

---

## 4. Quy trình nghiệp vụ hiện tại (AS-IS)

### 4.1 Phân phối và bán hàng (Developer → Agency → Buyer)

```
Developer                    Agency                      Buyer
    │                            │                          │
    │ Excel bảng hàng (email)    │                          │
    ├───────────────────────────►│                          │
    │                            │ Copy web/Excel riêng     │
    │                            │ Đăng marketplace         │
    │                            ├─────────────────────────►│ Tìm kiếm
    │                            │                          │ Gọi/Zalo
    │                            │◄─────────────────────────┤
    │                            │ CRM Excel / note giấy    │
    │                            │ Giữ chỗ miệng            │
    │◄───────────────────────────┤ Báo cọc qua chat         │
    │ Xác nhận thủ công          │                          │
    │                            │ Chuyển khoản thủ công    │
    │ Đối soát bank 2–3 ngày     │                          │
    │ Hoa hồng Excel cuối quý    │                          │
```

| Bước | Vai trò | Công cụ | Hoạt động | Pain |
|---|------|---------|-----------|------|
| 1 | Developer | Excel, Email/Zalo | Xuất bảng hàng, gửi agency | Format không chuẩn; delay |
| 2 | Agency Admin | Excel, Google Sheet | Nhận, normalize, phân cho sale | Mỗi dự án format khác |
| 3 | Agent | Web riêng, Facebook | Copy listing, đăng tin | Drift giá/trạng thái |
| 4 | Buyer | Marketplace, Google | Tìm kiếm, liên hệ | Thông tin không đồng bộ |
| 5 | Agent | Zalo, điện thoại | Tư vấn, note giấy/Excel | Mất context lead |
| 6 | Agent | Miệng, giấy tay | Giữ chỗ không lock | Double booking |
| 7 | Developer | Chat, email | Xác nhận cọc thủ công | Không bằng chứng timeline |
| 8 | Kế toán | Bank statement, Excel | Đối soát 2–3 ngày | Unit vẫn available trên web |
| 9 | Agency | Excel | Tính hoa hồng cuối quý | Tranh chấp policy |

### 4.2 Lead capture đa kênh (AS-IS)

| Bước | Vai trò | Công cụ | Hoạt động | Pain |
|---|------|---------|-----------|------|
| 1 | Marketing | Facebook Lead Ads | Chạy campaign, export CSV | Trễ 24–48h; mất lead |
| 2 | Agent | Zalo OA cá nhân | Chat riêng từng sale | Không vào CRM tập trung |
| 3 | Agent | Website form | Email notification | Không scoring/routing |
| 4 | Agent | Sổ giấy gallery | Ghi walk-in | Không sync digital |
| 5 | Agency Admin | Excel tổng hợp | Merge lead thủ công | Duplicate; mất attribution |
| 6 | Agent | Phone | Gọi theo cảm tính | Không ưu tiên lead nóng |

### 4.3 Quy trình giữ chỗ / cọc (AS-IS)

| Bước | Vai trò | Công cụ | Hoạt động | Pain |
|---|------|---------|-----------|------|
| 1 | Agent | Miệng | Báo giữ chỗ cho khách | Không lock; double book |
| 2 | Buyer | Bank transfer | Chuyển khoản, screenshot Zalo | Không auto reconcile |
| 3 | Kế toán Dev | Internet banking | Check sao kê 1–3 ngày sau | Unit vẫn hiển thị available |
| 4 | Agent | Word template | Lập HĐ draft thủ công | Không link CRM |
| 5 | Buyer/Dev | Giấy, con dấu | Ký HĐ offline | Không sync platform |
| 6 | Agency | Excel | Ghi nhận deal cho hoa hồng | Policy tranh chấp |
| 7 | Developer | Email | Xác nhận sold thủ công | Delay cập nhật bảng hàng |

### 4.4 Quy trình đối soát hoa hồng (AS-IS)

| Bước | Vai trò | Công cụ | Hoạt động | Pain |
|---|------|---------|-----------|------|
| 1 | Developer | Policy PDF/Email | Gửi policy hoa hồng | Không version; thay đổi retroactive |
| 2 | Agency | Excel | Track deal closed | Thiếu link payment proof |
| 3 | Agency Admin | Excel | Tính hoa hồng từng agent | Split phức tạp; error prone |
| 4 | Developer Finance | Excel, Bank | Verify và transfer | Manual; 5–10 ngày |
| 5 | Agent | Zalo/Email | Nhận thông báo hoa hồng | Không breakdown; tranh cãi |
| 6 | All | Email thread | Dispute resolution | Không audit trail |

### 4.5 Quy trình quản lý nội dung / listing (AS-IS)

| Bước | Vai trò | Công cụ | Hoạt động | Pain |
|---|------|---------|-----------|------|
| 1 | Agent | Copy từ Excel | Nhập giá, mô tả listing | Sai giá so GR |
| 2 | Agent | Canva, Word | Viết mô tả marketing | Sale yếu để trống |
| 3 | Agent | Google Drive | Upload ảnh riêng | Không gắn unit ID |
| 4 | Agency Admin | Email | Gửi duyệt nội bộ | Không so GR |
| 5 | Ops/Dev | Manual check | Duyệt listing (nếu có) | Chậm; không anti-drift |
| 6 | Agent | Facebook, Batdongsan | Publish đa kênh | Drift giữa kênh |
| 7 | Buyer | Web | Xem tin — không biết verified | Mất niềm tin |

---

## 5. Ma trận điểm đau (Pain Points)

### 5.1 Ma trận tổng hợp (18 items)

| ID | Pain point | Stakeholder | Impact | Priority | FR giải pháp |
|---|------------|-------------|--------|----------|--------------|
| PP-01 | Bảng hàng lệch giá/trạng thái giữa kênh | Dev, Agency, Buyer | Revenue loss, trust | 🔴 P0 | FR-GR-01→04 |
| PP-02 | Double booking / tranh chấp giữ chỗ | Dev, Agent, Buyer | Legal, reputation | 🔴 P0 | FR-BK-02, FR-GR-08 |
| PP-03 | Lead rơi rụng đa kênh | Agency | Lost revenue | 🔴 P0 | FR-CRM-06,07 |
| PP-04 | Đối soát cọc thủ công | Dev, Finance | Cash flow delay | 🔴 P0 | FR-PAY-03,04 |
| PP-05 | Hoa hồng tranh chấp | Agency, Dev | Partner conflict | 🟠 P1 | FR-COM-01→05 |
| PP-06 | Sale yếu không tạo content | Agency | Conversion drop | 🟠 P1 | FR-AI-01,04 |
| PP-07 | Không ưu tiên lead | Agency | SLA miss | 🟠 P1 | FR-AI-02 |
| PP-08 | Không audit lịch sử thay đổi | Ops, Dev | Dispute lose | 🟠 P1 | FR-TR-01, FR-BK-04 |
| PP-09 | Sale hiện trường thiếu công cụ | Agent | Deal lost | 🟡 P2 | FR-UX-05 |
| PP-10 | Khách không tin tin đăng | Buyer | Lead quality | 🟡 P2 | FR-GR-05 |
| PP-11 | Không dự báo tỷ lệ bán | Dev | Planning blind | 🟡 P2 | FR-AN-05 |
| PP-12 | Giao dịch bypass platform | Platform | GMV leak | 🔴 P0 | FR-BK-01, FR-PAY-05 |
| PP-13 | Không campaign attribution | Dev | ROI unknown | 🟡 P2 | FR-AN-04 |
| PP-14 | Mở đại lý mới rủi ro spam | Dev | Brand damage | 🟠 P1 | FR-MKT-01,02 |
| PP-15 | Báo cọc thủ công hay quên | Agency | Sync delay | 🟠 P1 | FR-BK-01, FR-PAY-05 |
| PP-16 | Tra cứu pháp lý chậm | Agent | SLA miss | 🟡 P2 | FR-AI-05 |
| PP-17 | Note CRM không đầy đủ | Agent | Lost context | 🟡 P2 | FR-CRM-04 |
| PP-18 | Buyer không track deal | Buyer | Anxiety, churn | 🟡 P2 | FR-BK-03, FR-UX-06 |
| PP-19 | So sánh sản phẩm khó | Buyer | Decision delay | 🟡 P2 | FR-LS-04 |

### 5.2 Root Cause Analysis — 5 Why (mẫu chi tiết)

#### PP-02: Double booking / tranh chấp giữ chỗ

| Why # | Câu hỏi | Trả lời |
|-------|---------|---------|
| 1 | Tại sao tranh chấp giữ chỗ xảy ra? | Hai khách cùng được báo còn căn |
| 2 | Tại sao hai khách cùng được báo còn? | Bảng hàng không cập nhật real-time |
| 3 | Tại sao không cập nhật real-time? | Mỗi bên giữ bản Excel/chat riêng |
| 4 | Tại sao không có hệ thống trung tâm? | Chưa có transaction platform |
| 5 | Tại sao chưa có transaction platform? | Chỉ có kênh marketing, không khóa tồn kho |

**Root cause:** Thiếu Golden Record + atomic inventory lock + payment gắn booking.
**Yêu cầu gốc:** FR-GR-01, FR-BK-02, FR-PAY-05, BR-02, BR-03.

#### PP-01: Bảng hàng lệch giá/trạng thái

| Why # | Câu hỏi | Trả lời |
|-------|---------|---------|
| 1 | Tại sao giá lệch giữa kênh? | Agency copy/sửa giá trên listing |
| 2 | Tại sao Agency sửa được? | Không có GR read-only constraint |
| 3 | Tại sao không có constraint? | Không có platform làm source of truth |
| 4 | Tại sao không có source of truth? | Developer chỉ gửi Excel, không enforce |
| 5 | Tại sao không enforce? | Thiếu REOS — anti-drift architecture |

**Root cause:** Không có Golden Record với anti-drift enforcement.

#### PP-04: Đối soát cọc thủ công

| Why # | Câu hỏi | Trả lời |
|-------|---------|---------|
| 1 | Tại sao đối soát mất 2 ngày? | Kế toán check bank thủ công |
| 2 | Tại sao thủ công? | Payment không qua platform |
| 3 | Tại sao không qua platform? | Không có payment link tích hợp booking |
| 4 | Tại sao không tích hợp? | Không có PaymentIntent + webhook |
| 5 | Tại sao? | Thiếu Payment & Ledger layer (L6) |

**Root cause:** Thiếu payment orchestration + double-entry ledger + daily reconciliation.

---
## 6. Quy trình nghiệp vụ mục tiêu (TO-BE)

Quy trình TO-BE mô tả luồng giao dịch chuẩn trên WEREAL REOS — từ tìm kiếm buyer đến chốt deal và settlement hoa hồng, event-sourced end-to-end.

### 6.1 Luồng giao dịch chuẩn — 12 bước

```
Buyer       Public Portal    CRM/Agent      Booking       Payment        Developer
  │              │               │              │              │               │
  ├─1.Search───►│               │              │              │               │
  │              ├─2.Lead───────►│              │              │               │
  │              │               ├─3.AI Score   │              │               │
  │              │               ├─4.Assign────►│              │               │
  │◄─5.Tư vấn────┼───────────────┤              │              │               │
  │              │               ├─6.Booking──►│ Lock unit    │               │
  │              │               │              ├─7.PayIntent►│               │
  │◄─8.Pay link──┼───────────────┼──────────────┼──────────────┤               │
  ├─9.Thanh toán─┼───────────────┼──────────────┼──────────────►│ Webhook       │
  │              │               │              ├─10.Ledger────►│ Sync GR       │
  │              │               ├─11.Contract►│              │               │
  ├─12.Ký HĐ─────┼───────────────┼──────────────┼──────────────┼──────────────►│
  │              │               │              ├─Commission──►│ Settlement    │
```

| Bước | Mô tả | Actor | Domain Event | FR liên kết |
|------|-------|-------|--------------|-------------|
| 1 | Khách tìm kiếm trên Public Portal (search/filter/geo) | Buyer | UnitViewed | FR-LS-02, FR-UX-01 |
| 2 | Lead capture + campaign attribution | Buyer, System | LeadCaptured | FR-CRM-01, FR-CRM-02 |
| 3 | AI lead scoring (hot/warm/cold) | System | LeadScored | FR-AI-02 |
| 4 | Lead routing → assign agent | System | AgentAssigned | FR-CRM-03 |
| 5 | Agent tư vấn (AI draft reply optional P3) | Agent | LeadContacted | FR-CRM-04 |
| 6 | Tạo booking → atomic inventory lock | Agent, System | BookingCreated, InventoryLocked | FR-BK-01, FR-BK-02 |
| 7 | Sinh PaymentIntent → gateway | System | PaymentIntentCreated | FR-PAY-01, FR-PAY-02 |
| 8 | Gửi payment link cho buyer | System | PaymentLinkSent | FR-PAY-05 |
| 9 | Buyer thanh toán cọc online | Buyer | PaymentSubmitted | FR-PAY-01 |
| 10 | Webhook → ledger → sync Golden Record status | System | PaymentConfirmed, LedgerEntryWritten | FR-PAY-03, FR-PAY-04, FR-GR-01 |
| 11 | Sinh hợp đồng → e-sign (Phase 2) | System, Buyer | ContractGenerated, ContractSigned | FR-BK-05, FR-BK-06 |
| 12 | Chốt deal → commission snapshot → settlement | System | DealCompleted, CommissionCalculated | FR-COM-02, FR-PAY-07 |

### 6.2 State machine giao dịch — 15 trạng thái

**Trạng thái chính (15):**

```
Draft → Published → Viewed → Qualified → Contacted → Scheduled
  → Reserved → DepositPending → Deposited → ContractDrafted
  → ContractSigned → Completed
```

**Nhánh kết thúc (3):** `Cancelled` | `Expired` | `Refunded`

Mỗi trạng thái map 1:1 với pipeline CRM và event store — cho phép replay timeline khi tranh chấp.

### 6.3 Bảng quy tắc chuyển trạng thái (Transition Rules — 18 hàng)

| # | From State | Event/Trigger | To State | Guard Condition | Actor | Side Effect |
|---|------------|---------------|----------|-----------------|-------|-------------|
| 1 | — | ListingCreated | Draft | Unit available; agent authorized | Agent | Create listing record |
| 2 | Draft | ListingApproved | Published | Anti-drift pass; Ops/Dev approve | Ops Admin | Index search; SSE push |
| 3 | Published | UnitViewed | Viewed | Buyer opens detail | Buyer | Log view event |
| 4 | Viewed | LeadSubmitted | Qualified | Lead form valid; consent OK | Buyer | Create lead; AI score |
| 5 | Qualified | AgentContacted | Contacted | Agent logs call/meeting | Agent | SLA timer start |
| 6 | Contacted | VisitScheduled | Scheduled | Meeting booked | Agent | Calendar event |
| 7 | Scheduled | BookingCreated | Reserved | Atomic lock success; expiry set | Agent | Lock unit; timer start |
| 8 | Reserved | PaymentIntentCreated | DepositPending | Min deposit policy met | System | Payment link sent |
| 9 | DepositPending | PaymentConfirmed | Deposited | Webhook verified; amount OK | System | Ledger write; GR→reserved |
| 10 | Deposited | ContractGenerated | ContractDrafted | Template merged | System | Doc vault store |
| 11 | ContractDrafted | ContractSigned | ContractSigned | E-sign complete + MFA | Buyer | Audit trail |
| 12 | ContractSigned | DealClosed | Completed | All conditions met | System | Commission snapshot |
| 13 | Reserved | TimerExpired | Expired | expiry_at passed; no payment | System | Release lock; GR→available |
| 14 | DepositPending | PaymentFailed | Reserved | Gateway fail; retry window | System | Notify agent |
| 15 | Any pre-Completed | CancelRequested | Cancelled | Policy allows; approval if needed | Agent/Ops | Release lock if reserved |
| 16 | Deposited | RefundApproved | Refunded | Refund processed | Ops Admin | Ledger reversal |
| 17 | Published | ListingRejected | Draft | Ops reject with reason | Ops Admin | Notify agent |
| 18 | Qualified | AutoExpire | Expired | SLA breach no contact | System | Re-route lead |

### 6.4 Domain Events — Event-Sourced (24 events)

Mọi thay đổi trạng thái nghiệp vụ phát sinh domain event append-only — phục vụ audit, replay, CDC search, và analytics.

| # | Event Name | Payload chính | Emitter | Consumer |
|---|------------|---------------|---------|----------|
| 1 | UnitCreated | unit_id, project_id, attributes, version | GR Service | Search CDC, Audit |
| 2 | UnitPriceChanged | unit_id, old_price, new_price, version_id | GR Service | Anti-drift, SSE, Search |
| 3 | UnitStatusChanged | unit_id, old_status, new_status | GR Service | SSE, Search, Listing |
| 4 | ListingCreated | listing_id, unit_id, agent_id | Listing Service | Anti-drift check |
| 5 | ListingPublished | listing_id, verified | Listing Service | Search index, Portal |
| 6 | ListingDriftDetected | listing_id, violations[] | Anti-drift Engine | Ops alert, Block |
| 7 | LeadCaptured | lead_id, source, campaign, unit_id | CRM Service | AI Scoring, Routing |
| 8 | LeadScored | lead_id, score, tier | AI Service | CRM, Routing |
| 9 | AgentAssigned | lead_id, agent_id, rule | CRM Service | Notification |
| 10 | BookingCreated | booking_id, unit_id, buyer_id, expiry | Booking Service | Inventory Lock |
| 11 | InventoryLocked | unit_id, booking_id, lock_token | Booking Service | GR status, SSE |
| 12 | InventoryReleased | unit_id, booking_id, reason | Booking Service | GR status, SSE |
| 13 | PaymentIntentCreated | intent_id, booking_id, amount | Payment Service | Notification |
| 14 | PaymentConfirmed | intent_id, gateway_ref, amount | Payment Service | Booking, Ledger, GR |
| 15 | PaymentFailed | intent_id, reason, retry_count | Payment Service | Booking, Alert |
| 16 | LedgerEntryWritten | entry_id, debit, credit, ref | Ledger Service | Reconciliation, AN |
| 17 | ContractGenerated | contract_id, booking_id, template_ver | Contract Service | Doc Vault |
| 18 | ContractSigned | contract_id, signer, timestamp | E-sign Adapter | Booking state |
| 19 | DealCompleted | deal_id, booking_id, final_amount | Booking Service | Commission, AN |
| 20 | CommissionCalculated | deal_id, snapshot_id, splits[] | Commission Service | Settlement |
| 21 | SettlementTriggered | batch_id, period, total | Payment Service | Payout, Export |
| 22 | BookingCancelled | booking_id, reason, actor | Booking Service | Lock release, Notify |
| 23 | RefundProcessed | refund_id, original_payment, amount | Payment Service | Ledger reversal |
| 24 | DisputeOpened | case_id, deal_id, evidence_refs[] | Trust Service | Holdback COM, Ops |

---

## 7. Yêu cầu chức năng (Functional Requirements)

Tài liệu định nghĩa **82 Functional Requirements** theo 12 module — baseline từ SRS v1.0, mở rộng mô tả và traceability Phase 1–6.

### 7.1 Tổng quan theo module

| Module | Mã | Số FR | Phase 1 Must |
|--------|-----|-------|--------------|
| Golden Record & Inventory | GR | 8 | 6 |
| Tenant & Identity | ID | 6 | 4 |
| Listing & Search | LS | 6 | 4 |
| CRM & Omnichannel | CRM | 9 | 5 |
| Booking & Transaction | BK | 8 | 5 |
| Payment & Finance | PAY | 10 | 5 |
| Commission | COM | 5 | 0 (P2) |
| AI Layer | AI | 10 | 4 |
| Trust & Compliance | TR | 5 | 2 |
| Analytics | AN | 5 | 1 |
| Marketplace | MKT | 3 | 0 (P2) |
| Experience Layer | UX | 7 | 3 |
| **Tổng** | | **82** | **39 Must P1** |

### 7.2 Golden Record & Inventory (GR)

#### FR-GR-01: Quản lý Golden Record (Unit gốc)

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-01 |
| **Tên** | Quản lý Golden Record (Unit gốc) |
| **Mô tả** | Hệ thống lưu trữ unit gốc từ Developer với đầy đủ thuộc tính (block, tầng, hướng, diện tích, giá, trạng thái available/reserved/sold) làm nguồn chuẩn duy nhất cho mọi kênh phân phối. Mọi thay đổi giá và trạng thái tồn kho phải xuất phát từ Golden Record. |
| **Actor** | Developer Admin |
| **Precondition** | Tenant Developer onboard; role Developer Admin; project tồn tại. |
| **Postcondition** | Unit lưu kèm version snapshot; sync search index trong SLA NFR-P04. |
| **Business rules** | Unit thuộc Product Graph; mọi mutation ghi audit; không hard-delete giá/trạng thái. |
| **Input/Output** | Input: unit attributes, project_id. Output: unit_id, version_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-ID-01, FR-ID-03 |
| **Pain / UC liên kết** | PP-01 → UC-GR-01 |

#### FR-GR-02: Versioning giá, tồn kho, policy

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-02 |
| **Tên** | Versioning giá, tồn kho, policy |
| **Mô tả** | Mọi thay đổi giá, trạng thái tồn kho, chính sách bán được lưu immutable snapshot kèm timestamp, actor, lý do thay đổi. Hỗ trợ truy vết lịch sử và time-travel query phục vụ tranh chấp. |
| **Actor** | Developer Admin, System |
| **Precondition** | Unit tồn tại. |
| **Postcondition** | Version mới tạo; snapshot tại booking truy xuất được. |
| **Business rules** | Không sửa version cũ; snapshot bắt buộc trước Deposited. |
| **Input/Output** | Input: unit_id, changes, reason. Output: version_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | PP-08 → UC-GR-01 |

#### FR-GR-03: Listing marketing từ unit gốc

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-03 |
| **Tên** | Listing marketing từ unit gốc |
| **Mô tả** | Agent tạo listing marketing chỉ từ Golden Record; không được sửa giá gốc, trạng thái tồn kho gốc trên form listing. Marketing content tách biệt hoàn toàn khỏi dữ liệu gốc. |
| **Actor** | Agent |
| **Precondition** | Quyền bán project; unit=available. |
| **Postcondition** | Listing Draft/Pending Review. |
| **Business rules** | Reference unit_id bắt buộc; AI không override giá. |
| **Input/Output** | Input: unit_id, content, media. Output: listing_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01, FR-LS-01 |
| **Pain / UC liên kết** | PP-01 → UC-GR-02 |

#### FR-GR-04: Anti-drift auto-block/flag

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-04 |
| **Tên** | Anti-drift auto-block/flag |
| **Mô tả** | Hệ thống tự động so khớp listing với Golden Record; block submit hoặc flag khi lệch giá, trạng thái, hoặc unit không còn available. Ops nhận cảnh báo khi drift nghiêm trọng. |
| **Actor** | System, Ops Admin |
| **Precondition** | Listing tồn tại. |
| **Postcondition** | Block/flag kèm lý do; Ops notified. |
| **Business rules** | Drift check mỗi submit và khi GR thay đổi; tolerance=0 giá. |
| **Input/Output** | Input: listing_id. Output: drift_status. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-03 |
| **Pain / UC liên kết** | PP-01 → UC-GR-03 |

#### FR-GR-05: Verified Listing badge

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-05 |
| **Tên** | Verified Listing badge |
| **Mô tả** | Hiển thị badge Verified trên public portal khi listing khớp 100% Golden Record và đã qua approval. Badge tự ẩn khi phát hiện drift. |
| **Actor** | System, Buyer |
| **Precondition** | Listing Published; drift pass. |
| **Postcondition** | Badge hiển thị portal. |
| **Business rules** | Badge ẩn khi drift; refresh SSE. |
| **Input/Output** | Input: listing_id. Output: verified. |
| **Phase** | 1 |
| **Priority** | Should |
| **Dependencies** | FR-GR-04 |
| **Pain / UC liên kết** | PP-10 → UC-LS-01 |

#### FR-GR-06: Time-travel query

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-06 |
| **Tên** | Time-travel query |
| **Mô tả** | Truy vấn trạng thái bảng hàng (giá, tồn kho, policy) tại thời điểm T bất kỳ trong quá khứ — phục vụ dispute resolution và audit. |
| **Actor** | Developer Admin, Ops |
| **Precondition** | Version history tồn tại. |
| **Postcondition** | Snapshot tại T trả về. |
| **Business rules** | Query ISO8601; nearest version fallback. |
| **Input/Output** | Input: unit_id, as_of. Output: snapshot. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-GR-02 |
| **Pain / UC liên kết** | PP-08 → UC-GR-04 |

#### FR-GR-07: Bulk import Excel/CSV

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-07 |
| **Tên** | Bulk import Excel/CSV |
| **Mô tả** | Import hàng loạt unit từ Excel/CSV với validation, preview diff, confirm trước khi apply. Hỗ trợ rollback khi lỗi nghiêm trọng. |
| **Actor** | Developer Admin |
| **Precondition** | Template chuẩn; project tồn tại. |
| **Postcondition** | Import report chi tiết. |
| **Business rules** | Max 5000 rows; duplicate detect; rollback on error. |
| **Input/Output** | Input: file, project_id. Output: report. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | DEV-I01 → UC-GR-05 |

#### FR-GR-08: Real-time push trạng thái unit

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-GR-08 |
| **Tên** | Real-time push trạng thái unit |
| **Mô tả** | Push thay đổi trạng thái unit qua SSE/WebSocket tới Agent Portal, Public Portal, Developer Portal trong SLA đồng bộ tồn kho. |
| **Actor** | System |
| **Precondition** | Connection established. |
| **Postcondition** | Event trong SLA NFR-P04. |
| **Business rules** | Tenant-scoped channels; payload unit_id, status. |
| **Input/Output** | Input: status event. Output: SSE msg. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | PP-02 → US-GR-09 |

### 7.3 Tenant & Identity (ID)

#### FR-ID-01: Multi-tenant hierarchy

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-01 |
| **Tên** | Multi-tenant hierarchy |
| **Mô tả** | Platform→Developer→Agency→Branch→User với isolation. |
| **Actor** | Platform Admin |
| **Precondition** | Platform configured. |
| **Postcondition** | Tenant onboard với RLS. |
| **Business rules** | Mọi entity có tenant_id. |
| **Input/Output** | Input: config. Output: tenant_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | — |
| **Pain / UC liên kết** | PP-08 → UC-ID-01 |

#### FR-ID-02: RBAC và ABAC

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-02 |
| **Tên** | RBAC và ABAC |
| **Mô tả** | RBAC role; ABAC project/region Phase 2. |
| **Actor** | Agency Admin |
| **Precondition** | User thuộc tenant. |
| **Postcondition** | Permissions enforced API. |
| **Business rules** | Deny-by-default; OPA Phase 2. |
| **Input/Output** | Input: user, resource. Output: allow. |
| **Phase** | 1–2 |
| **Priority** | Must |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | PP-08 → UC-ID-02 |

#### FR-ID-03: Tenant isolation RLS

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-03 |
| **Tên** | Tenant isolation RLS |
| **Mô tả** | PostgreSQL RLS filter tenant_id mọi query. |
| **Actor** | System |
| **Precondition** | RLS deployed. |
| **Postcondition** | Cross-tenant = 0 rows/403. |
| **Business rules** | Middleware inject context; test bắt buộc. |
| **Input/Output** | Input: query. Output: filtered. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | R-T01 → US-ID-06 |

#### FR-ID-04: MFA/OTP nhạy cảm

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-04 |
| **Tên** | MFA/OTP nhạy cảm |
| **Mô tả** | MFA cho payment, e-sign, admin action. |
| **Actor** | All users |
| **Precondition** | Authenticated. |
| **Postcondition** | OTP verified + audit. |
| **Business rules** | Expiry 5 phút; 3 attempts. |
| **Input/Output** | Input: otp. Output: verified. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | NFR-S05 → UC-ID-03 |

#### FR-ID-05: KYC/KYB

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-05 |
| **Tên** | KYC/KYB |
| **Mô tả** | Xác minh Developer/Agency trước publish/payout. |
| **Actor** | Platform Admin |
| **Precondition** | Docs uploaded. |
| **Postcondition** | KYC approved/rejected. |
| **Business rules** | Manual review Phase 2. |
| **Input/Output** | Input: docs. Output: status. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | NFR-C01 → — |

#### FR-ID-06: SSO Enterprise

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-ID-06 |
| **Tên** | SSO Enterprise |
| **Mô tả** | SAML/OIDC SSO enterprise tenant. |
| **Actor** | Enterprise Admin |
| **Precondition** | IdP configured. |
| **Postcondition** | JWT session. |
| **Business rules** | Azure AD, Okta support. |
| **Input/Output** | Input: assertion. Output: JWT. |
| **Phase** | 4 |
| **Priority** | Could |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | — → — |

### 7.4 Listing & Search (LS)

#### FR-LS-01: CRUD listing + approval

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-01 |
| **Tên** | CRUD listing + approval |
| **Mô tả** | Listing workflow Draft→Review→Published. |
| **Actor** | Agent, Ops Admin |
| **Precondition** | Agent có quyền; unit available. |
| **Postcondition** | Listing Published hoặc rejected. |
| **Business rules** | Ops/Developer duyệt BR-09; reject kèm lý do. |
| **Input/Output** | Input: listing data. Output: status. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-03 |
| **Pain / UC liên kết** | BR-09 → UC-LS-02 |

#### FR-LS-02: Full-text + facet + geo search

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-02 |
| **Tên** | Full-text + facet + geo search |
| **Mô tả** | Tìm kiếm full-text, facet filter, geo radius. |
| **Actor** | Buyer |
| **Precondition** | Search index synced. |
| **Postcondition** | Results P95 ≤ NFR-P03. |
| **Business rules** | Geo Haversine; facet project/type/price. |
| **Input/Output** | Input: query, filters. Output: results. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-LS-06 |
| **Pain / UC liên kết** | BUY-I01 → UC-LS-01 |

#### FR-LS-03: Media upload listing

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-03 |
| **Tên** | Media upload listing |
| **Mô tả** | Upload ảnh/video gắn listing; S3 storage. |
| **Actor** | Agent |
| **Precondition** | Listing Draft. |
| **Postcondition** | Media URLs attached. |
| **Business rules** | Max 20 ảnh; video 100MB; virus scan. |
| **Input/Output** | Input: files. Output: urls. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-LS-01 |
| **Pain / UC liên kết** | — → US-LS-10 |

#### FR-LS-04: So sánh sản phẩm

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-04 |
| **Tên** | So sánh sản phẩm |
| **Mô tả** | Compare ≥2 unit side-by-side. |
| **Actor** | Buyer |
| **Precondition** | Units Published. |
| **Postcondition** | Compare view rendered. |
| **Business rules** | Max 3 units; highlight diff attributes. |
| **Input/Output** | Input: unit_ids[]. Output: compare UI. |
| **Phase** | 1 |
| **Priority** | Should |
| **Dependencies** | FR-LS-02 |
| **Pain / UC liên kết** | BUY-I03 → UC-LS-03 |

#### FR-LS-05: Duplicate listing detection

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-05 |
| **Tên** | Duplicate listing detection |
| **Mô tả** | Phát hiện listing trùng unit/agent. |
| **Actor** | System, Ops |
| **Precondition** | Listings exist. |
| **Postcondition** | Duplicate flagged. |
| **Business rules** | Same unit_id + agent = warn; auto-merge optional P3. |
| **Input/Output** | Input: listing. Output: dup_score. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-GR-03 |
| **Pain / UC liên kết** | — → — |

#### FR-LS-06: Search sync CDC

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-LS-06 |
| **Tên** | Search sync CDC |
| **Mô tả** | CDC sync Golden Record → OpenSearch. |
| **Actor** | System |
| **Precondition** | CDC pipeline active. |
| **Postcondition** | Lag ≤ NFR-P04. |
| **Business rules** | Outbox pattern; reconciliation job. |
| **Input/Output** | Input: GR event. Output: index update. |
| **Phase** | 1–3 |
| **Priority** | Must |
| **Dependencies** | FR-GR-08 |
| **Pain / UC liên kết** | R-T03 → US-LS-13 |

### 7.5 CRM & Omnichannel (CRM)

#### FR-CRM-01: Lead capture đa nguồn

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-01 |
| **Tên** | Lead capture đa nguồn |
| **Mô tả** | Capture lead từ form, portal, import CSV. |
| **Actor** | Buyer, Agent, System |
| **Precondition** | Source configured. |
| **Postcondition** | Lead created in CRM. |
| **Business rules** | Dedup phone/email 24h window. |
| **Input/Output** | Input: lead_form. Output: lead_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-ID-03 |
| **Pain / UC liên kết** | PP-03 → UC-CRM-01 |

#### FR-CRM-02: Lead gắn entity

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-02 |
| **Tên** | Lead gắn entity |
| **Mô tả** | Lead link listing/unit/agent/campaign. |
| **Actor** | System |
| **Precondition** | Lead created. |
| **Postcondition** | Relations persisted. |
| **Business rules** | Campaign UTM captured; attribution Phase 3. |
| **Input/Output** | Input: lead_id, refs. Output: linked. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-01 |
| **Pain / UC liên kết** | DEV-I02 → US-CRM-07 |

#### FR-CRM-03: Lead routing

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-03 |
| **Tên** | Lead routing |
| **Mô tả** | Route theo khu vực, dự án, round-robin, AI score. |
| **Actor** | Agency Admin, System |
| **Precondition** | Routing rules configured. |
| **Postcondition** | Lead assigned to agent. |
| **Business rules** | Hot lead priority route; SLA timer start. |
| **Input/Output** | Input: lead. Output: assignee. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-01, FR-AI-02 |
| **Pain / UC liên kết** | PP-07 → UC-CRM-02 |

#### FR-CRM-04: CRM activities timeline

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-04 |
| **Tên** | CRM activities timeline |
| **Mô tả** | Call, meeting, task, note trên timeline. |
| **Actor** | Agent |
| **Precondition** | Lead exists. |
| **Postcondition** | Activity logged. |
| **Business rules** | Immutable log; voice-to-CRM Phase 2. |
| **Input/Output** | Input: activity. Output: timeline entry. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-01 |
| **Pain / UC liên kết** | AGT-I03 → UC-CRM-03 |

#### FR-CRM-05: Pipeline + state machine

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-05 |
| **Tên** | Pipeline + state machine |
| **Mô tả** | Pipeline kanban tích hợp transaction state machine. |
| **Actor** | Agent, Agency Admin |
| **Precondition** | Lead qualified. |
| **Postcondition** | Stage sync với BK state. |
| **Business rules** | One lead → one active transaction max. |
| **Input/Output** | Input: stage change. Output: pipeline update. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-BK-03 |
| **Pain / UC liên kết** | — → UC-CRM-03 |

#### FR-CRM-06: Zalo OA/ZNS integration

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-06 |
| **Tên** | Zalo OA/ZNS integration |
| **Mô tả** | Tích hợp Zalo OA/ZNS: sync lead inbound, gửi OTP/notify, log hai chiều. Tuân thủ rate limit Zalo. |
| **Actor** | System |
| **Precondition** | Zalo API credentials. |
| **Postcondition** | Messages sent/received logged. |
| **Business rules** | Webhook inbound; rate limit Zalo policy. |
| **Input/Output** | Input: zalo_event. Output: lead/msg. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-01 |
| **Pain / UC liên kết** | PP-03, ASM-05 → UC-CRM-04 |

#### FR-CRM-07: Meta Lead Ads sync

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-07 |
| **Tên** | Meta Lead Ads sync |
| **Mô tả** | Auto-sync Facebook/Instagram Lead Ads vào CRM < 5 phút kèm campaign attribution. |
| **Actor** | System |
| **Precondition** | Meta Business API. |
| **Postcondition** | Lead in CRM < 5 phút. |
| **Business rules** | Field mapping configurable; retry on fail. |
| **Input/Output** | Input: meta_webhook. Output: lead. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-02 |
| **Pain / UC liên kết** | PP-03 → UC-CRM-04 |

#### FR-CRM-08: SLA reminder escalation

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-08 |
| **Tên** | SLA reminder escalation |
| **Mô tả** | Nhắc follow-up; escalate nếu quá SLA. |
| **Actor** | System |
| **Precondition** | SLA rules set. |
| **Postcondition** | Notification sent. |
| **Business rules** | Hot=15min, Warm=2h, Cold=24h default. |
| **Input/Output** | Input: lead_id. Output: alert. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-CRM-03 |
| **Pain / UC liên kết** | — → UC-CRM-05 |

#### FR-CRM-09: Omnichannel unified inbox

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-CRM-09 |
| **Tên** | Omnichannel unified inbox |
| **Mô tả** | Inbox thống nhất Zalo/Meta/email/chat. |
| **Actor** | Agent |
| **Precondition** | Phase 3 channels connected. |
| **Postcondition** | Messages in single thread. |
| **Business rules** | Tenant-scoped; AI draft reply optional. |
| **Input/Output** | Input: channel msg. Output: unified thread. |
| **Phase** | 3 |
| **Priority** | Could |
| **Dependencies** | FR-CRM-06,07 |
| **Pain / UC liên kết** | — → — |

### 7.6 Booking & Transaction (BK)

#### FR-BK-01: Reservation với expiry

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-01 |
| **Tên** | Reservation với expiry |
| **Mô tả** | Tạo giữ chỗ với timer expiry configurable. |
| **Actor** | Agent |
| **Precondition** | Unit available; lead exists. |
| **Postcondition** | Booking Reserved với expiry_at. |
| **Business rules** | Default expiry 24–72h tenant config. |
| **Input/Output** | Input: unit_id, buyer, duration. Output: booking_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | PP-02 → UC-BK-01 |

#### FR-BK-02: Atomic inventory lock

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-02 |
| **Tên** | Atomic inventory lock |
| **Mô tả** | Redis distributed lock đảm bảo exactly-one booking thành công dưới 100 concurrent request — zero double booking là tiêu chí go-live bắt buộc. |
| **Actor** | System |
| **Precondition** | Booking request concurrent. |
| **Postcondition** | Exactly one lock succeeds. |
| **Business rules** | 0 double book under 100 concurrent NFR-P08. |
| **Input/Output** | Input: unit_id. Output: lock_token. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | PP-02 → US-BK-02 |

#### FR-BK-03: Transaction state machine 15 states

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-03 |
| **Tên** | Transaction state machine 15 states |
| **Mô tả** | State machine 15 trạng thái chính + 3 nhánh kết thúc (Cancelled, Expired, Refunded) định nghĩa lifecycle giao dịch end-to-end. |
| **Actor** | System, Agent, Buyer |
| **Precondition** | Valid transition. |
| **Postcondition** | State updated + event emitted. |
| **Business rules** | See Section 7.2 transition table. |
| **Input/Output** | Input: event. Output: new_state. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-BK-04 |
| **Pain / UC liên kết** | PP-02 → UC-BK-02 |

#### FR-BK-04: Domain events event store

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-04 |
| **Tên** | Domain events event store |
| **Mô tả** | Append-only event store; replay timeline. |
| **Actor** | System |
| **Precondition** | Event store available. |
| **Postcondition** | Event persisted immutable. |
| **Business rules** | Retention ≥ 5 năm; replay for dispute. |
| **Input/Output** | Input: domain_event. Output: event_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | — |
| **Pain / UC liên kết** | PP-08 → UC-BK-03 |

#### FR-BK-05: Contract template merge

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-05 |
| **Tên** | Contract template merge |
| **Mô tả** | Template hợp đồng + merge booking data. |
| **Actor** | Agent, System |
| **Precondition** | Booking Deposited. |
| **Postcondition** | Contract PDF generated. |
| **Business rules** | Template per project; version controlled. |
| **Input/Output** | Input: booking_id, template_id. Output: contract_doc. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-BK-03 |
| **Pain / UC liên kết** | — → UC-BK-04 |

#### FR-BK-06: E-sign integration

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-06 |
| **Tên** | E-sign integration |
| **Mô tả** | Tích hợp e-sign provider; update state on sign. |
| **Actor** | Buyer, Agent |
| **Precondition** | Contract drafted. |
| **Postcondition** | Contract Signed state. |
| **Business rules** | MFA before sign; audit trail. |
| **Input/Output** | Input: contract_id. Output: signed_doc. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-ID-04, FR-BK-05 |
| **Pain / UC liên kết** | — → UC-BK-04 |

#### FR-BK-07: Cancel/refund workflow

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-07 |
| **Tên** | Cancel/refund workflow |
| **Mô tả** | Hủy booking + ledger reversal. |
| **Actor** | Agent, Ops Admin |
| **Precondition** | Booking cancellable state. |
| **Postcondition** | Cancelled/Refunded + ledger entry. |
| **Business rules** | Approval threshold refund > X VND. |
| **Input/Output** | Input: booking_id, reason. Output: refund_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-03 |
| **Pain / UC liên kết** | — → UC-BK-05 |

#### FR-BK-08: Custom workflow per tenant

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-BK-08 |
| **Tên** | Custom workflow per tenant |
| **Mô tả** | Temporal workflow engine custom per tenant. |
| **Actor** | Platform Admin |
| **Precondition** | Phase 4 engine deployed. |
| **Postcondition** | Custom states/transitions. |
| **Business rules** | Limit 5 custom states tenant. |
| **Input/Output** | Input: workflow_def. Output: deployed. |
| **Phase** | 4 |
| **Priority** | Could |
| **Dependencies** | FR-BK-03 |
| **Pain / UC liên kết** | R-T10 → — |

### 7.7 Payment & Finance (PAY)

#### FR-PAY-01: Payment orchestration

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-01 |
| **Tên** | Payment orchestration |
| **Mô tả** | Orchestrate 1 gateway Phase 1; multi Phase 3. |
| **Actor** | System, Buyer |
| **Precondition** | Gateway configured. |
| **Postcondition** | PaymentIntent created. |
| **Business rules** | Adapter pattern; sandbox/prod keys separated. |
| **Input/Output** | Input: amount, booking_id. Output: intent_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-BK-01 |
| **Pain / UC liên kết** | PP-04 → UC-PAY-01 |

#### FR-PAY-02: PaymentIntent Invoice Receipt Refund

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-02 |
| **Tên** | PaymentIntent Invoice Receipt Refund |
| **Mô tả** | Full payment document lifecycle. |
| **Actor** | System |
| **Precondition** | Intent created. |
| **Postcondition** | Documents generated. |
| **Business rules** | Idempotent create; link booking. |
| **Input/Output** | Input: payment data. Output: docs. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-01 |
| **Pain / UC liên kết** | PP-04 → UC-PAY-01 |

#### FR-PAY-03: Double-entry ledger

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-03 |
| **Tên** | Double-entry ledger |
| **Mô tả** | Double-entry ledger — mọi giao dịch thanh toán ghi debit/credit cân bằng; daily balance = 0 per tenant pool. |
| **Actor** | System |
| **Precondition** | Payment confirmed. |
| **Postcondition** | Ledger entries written. |
| **Business rules** | Daily balance = 0 per tenant pool. |
| **Input/Output** | Input: txn. Output: entries[]. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-02 |
| **Pain / UC liên kết** | PP-04 → US-PAY-05 |

#### FR-PAY-04: Webhook idempotent reconciliation

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-04 |
| **Tên** | Webhook idempotent reconciliation |
| **Mô tả** | Webhook handler idempotent + daily reconciliation job đảm bảo 100% khớp gateway trước settlement. |
| **Actor** | System, Platform Admin |
| **Precondition** | Gateway webhook. |
| **Postcondition** | 100% reconcile daily. |
| **Business rules** | Signature verify; idempotency key; alert mismatch. |
| **Input/Output** | Input: webhook. Output: status. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-03 |
| **Pain / UC liên kết** | PP-04, R-P01 → UC-PAY-02 |

#### FR-PAY-05: Deposit payment gắn booking

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-05 |
| **Tên** | Deposit payment gắn booking |
| **Mô tả** | Cọc/giữ chỗ trigger state Deposited. |
| **Actor** | Buyer, System |
| **Precondition** | PaymentIntent active. |
| **Postcondition** | Booking Deposited; unit reserved. |
| **Business rules** | Amount ≥ min deposit policy snapshot. |
| **Input/Output** | Input: payment. Output: booking update. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-BK-01, FR-PAY-01 |
| **Pain / UC liên kết** | PP-02 → US-PAY-08 |

#### FR-PAY-06: Multi-gateway routing fallback

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-06 |
| **Tên** | Multi-gateway routing fallback |
| **Mô tả** | Route/fallback giữa nhiều gateway. |
| **Actor** | System |
| **Precondition** | Phase 3 multi-gateway. |
| **Postcondition** | Payment routed. |
| **Business rules** | Primary/fallback config; circuit breaker. |
| **Input/Output** | Input: amount. Output: gateway_used. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | FR-PAY-01 |
| **Pain / UC liên kết** | R-P05 → — |

#### FR-PAY-07: Commission settlement batch payout

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-07 |
| **Tên** | Commission settlement batch payout |
| **Mô tả** | Batch settlement + payout agency/agent. |
| **Actor** | Platform Admin |
| **Precondition** | Deals completed; COM calculated. |
| **Postcondition** | Payout initiated. |
| **Business rules** | Batch weekly/monthly; approval workflow. |
| **Input/Output** | Input: period. Output: batch_id. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-COM-02 |
| **Pain / UC liên kết** | PP-05 → UC-PAY-03 |

#### FR-PAY-08: Smart Escrow conditional release

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-08 |
| **Tên** | Smart Escrow conditional release |
| **Mô tả** | Escrow release theo điều kiện pháp lý. |
| **Actor** | System, Developer |
| **Precondition** | Phase 5 legal approved. |
| **Postcondition** | Funds released/hold. |
| **Business rules** | Multi-approval; legal checklist. |
| **Input/Output** | Input: escrow_id. Output: release. |
| **Phase** | 5 |
| **Priority** | Could |
| **Dependencies** | FR-PAY-03 |
| **Pain / UC liên kết** | R-P08 → UC-PAY-04 |

#### FR-PAY-09: BNPL trả góp đợt

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-09 |
| **Tên** | BNPL trả góp đợt |
| **Mô tả** | BNPL partner integration installment. |
| **Actor** | Buyer |
| **Precondition** | Phase 5 partner. |
| **Postcondition** | Installment schedule. |
| **Business rules** | Partner API; fallback manual. |
| **Input/Output** | Input: booking. Output: schedule. |
| **Phase** | 5 |
| **Priority** | Could |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-P09 → — |

#### FR-PAY-10: Mortgage pre-qualification

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-PAY-10 |
| **Tên** | Mortgage pre-qualification |
| **Mô tả** | API ngân hàng pre-qual mortgage. |
| **Actor** | Buyer, Agent |
| **Precondition** | Bank partner Phase 5. |
| **Postcondition** | Pre-qual result. |
| **Business rules** | Cache result 30 days; not binding offer. |
| **Input/Output** | Input: buyer_financials. Output: prequal. |
| **Phase** | 5 |
| **Priority** | Could |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-P10 → — |

### 7.8 Commission (COM)

#### FR-COM-01: Commission policy per project

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-COM-01 |
| **Tên** | Commission policy per project |
| **Mô tả** | Policy % hoa hồng theo project/phase. |
| **Actor** | Developer Admin |
| **Precondition** | Project exists. |
| **Postcondition** | Policy saved versioned. |
| **Business rules** | Effective date range; override per agency optional. |
| **Input/Output** | Input: policy. Output: policy_id. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | PP-05 → UC-PAY-03 |

#### FR-COM-02: Policy snapshot at deal close

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-COM-02 |
| **Tên** | Policy snapshot at deal close |
| **Mô tả** | Snapshot policy tại thời điểm chốt deal. |
| **Actor** | System |
| **Precondition** | Deal Completed. |
| **Postcondition** | Snapshot immutable linked deal. |
| **Business rules** | No retroactive policy change on closed deals. |
| **Input/Output** | Input: deal_id. Output: snapshot. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-COM-01 |
| **Pain / UC liên kết** | PP-05, AGY-I06 → — |

#### FR-COM-03: Split commission multi agent

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-COM-03 |
| **Tên** | Split commission multi agent |
| **Mô tả** | Chia hoa hồng nhiều agent/agency. |
| **Actor** | Agency Admin, System |
| **Precondition** | Split rules defined. |
| **Postcondition** | Split entries calculated. |
| **Business rules** | Total split = 100%; min 1 primary agent. |
| **Input/Output** | Input: deal_id, splits. Output: entries. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-COM-02 |
| **Pain / UC liên kết** | AGY-I06 → — |

#### FR-COM-04: Holdback khi tranh chấp

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-COM-04 |
| **Tên** | Holdback khi tranh chấp |
| **Mô tả** | Giữ % hoa hồng khi dispute active. |
| **Actor** | System, Ops |
| **Precondition** | Dispute opened. |
| **Postcondition** | Holdback applied. |
| **Business rules** | Release on dispute resolved; max hold 90 days. |
| **Input/Output** | Input: dispute_id. Output: holdback. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-TR-03 |
| **Pain / UC liên kết** | — → — |

#### FR-COM-05: Export kế toán CSV/Excel

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-COM-05 |
| **Tên** | Export kế toán CSV/Excel |
| **Mô tả** | Export settlement cho kế toán. |
| **Actor** | Platform Admin, Agency Admin |
| **Precondition** | Batch completed. |
| **Postcondition** | File downloaded. |
| **Business rules** | Format chuẩn VN accounting; PII masked option. |
| **Input/Output** | Input: batch_id. Output: file. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-07 |
| **Pain / UC liên kết** | AGY-I06 → — |

### 7.9 AI Layer (AI)

#### FR-AI-01: Content copilot listing

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-01 |
| **Tên** | Content copilot listing |
| **Mô tả** | AI draft mô tả, headline, tóm tắt dự án. |
| **Actor** | Agent |
| **Precondition** | Listing Draft; AI quota. |
| **Postcondition** | Draft content generated ≤ NFR-P05. |
| **Business rules** | Không mutate giá/tồn kho; tenant context only. |
| **Input/Output** | Input: unit attrs. Output: draft text. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-GR-03 |
| **Pain / UC liên kết** | PP-06 → UC-AI-01 |

#### FR-AI-02: Lead scoring tự động

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-02 |
| **Tên** | Lead scoring tự động |
| **Mô tả** | Score lead hot/warm/cold real-time. |
| **Actor** | System |
| **Precondition** | Lead captured. |
| **Postcondition** | Score ≤ NFR-P06. |
| **Business rules** | Model v1 rules+ML; human override. |
| **Input/Output** | Input: lead. Output: score. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-CRM-01 |
| **Pain / UC liên kết** | PP-07 → UC-AI-02 |

#### FR-AI-03: Guardrails no mutate

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-03 |
| **Tên** | Guardrails no mutate |
| **Mô tả** | AI layer read-only — không mutate giá, tồn kho, tạo booking. Whitelist tools; audit mọi vi phạm guardrail. |
| **Actor** | System |
| **Precondition** | AI request any. |
| **Postcondition** | Mutate blocked. |
| **Business rules** | Whitelist read-only tools; audit violations. |
| **Input/Output** | Input: ai_action. Output: allow/deny. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-A02 → US-AI-09 |

#### FR-AI-04: Human approval AI content

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-04 |
| **Tên** | Human approval AI content |
| **Mô tả** | Agent approve trước publish AI content. |
| **Actor** | Agent |
| **Precondition** | AI draft exists. |
| **Postcondition** | Approved content in listing. |
| **Business rules** | Cannot publish without approve checkbox. |
| **Input/Output** | Input: draft_id, approve. Output: status. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-AI-01 |
| **Pain / UC liên kết** | BR-06 → US-AI-11 |

#### FR-AI-05: RAG knowledge assistant

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-05 |
| **Tên** | RAG knowledge assistant |
| **Mô tả** | RAG tra cứu pháp lý, policy, FAQ. |
| **Actor** | Agent |
| **Precondition** | Vector index populated. |
| **Postcondition** | Answer with citations. |
| **Business rules** | Tenant-isolated index; disclaimer mandatory. |
| **Input/Output** | Input: question. Output: answer+cites. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | — |
| **Pain / UC liên kết** | AGT-I02 → UC-AI-03 |

#### FR-AI-06: Buyer-product matching

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-06 |
| **Tên** | Buyer-product matching |
| **Mô tả** | Gợi ý unit phù hợp buyer profile. |
| **Actor** | System, Agent |
| **Precondition** | Buyer profile/lead exists. |
| **Postcondition** | Ranked recommendations. |
| **Business rules** | Explain why; no auto-booking. |
| **Input/Output** | Input: buyer_prefs. Output: units[]. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-LS-02 |
| **Pain / UC liên kết** | BUY-I03 → — |

#### FR-AI-07: Sales Agent draft reply

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-07 |
| **Tên** | Sales Agent draft reply |
| **Mô tả** | AI draft reply Zalo/email; approve-to-send. |
| **Actor** | Agent |
| **Precondition** | Message inbound. |
| **Postcondition** | Draft for review. |
| **Business rules** | Never auto-send Phase 3; kill switch. |
| **Input/Output** | Input: message. Output: draft. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | FR-CRM-09 |
| **Pain / UC liên kết** | R-A07 → UC-AI-04 |

#### FR-AI-08: Ops Compliance Agent anomaly

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-08 |
| **Tên** | Ops Compliance Agent anomaly |
| **Mô tả** | Flag listing drift, spam, payment anomaly. |
| **Actor** | Ops Admin, System |
| **Precondition** | Monitoring active. |
| **Postcondition** | Alert created. |
| **Business rules** | Severity levels; auto-block critical. |
| **Input/Output** | Input: signals. Output: alert. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | FR-GR-04 |
| **Pain / UC liên kết** | OPS-I01 → UC-AI-05 |

#### FR-AI-09: Buyer conversational discovery

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-09 |
| **Tên** | Buyer conversational discovery |
| **Mô tả** | Chatbot tìm kiếm/so sánh read-only. |
| **Actor** | Buyer |
| **Precondition** | Phase 3 portal. |
| **Postcondition** | Search results in chat. |
| **Business rules** | Read-only; not financial advice disclaimer. |
| **Input/Output** | Input: chat. Output: results. |
| **Phase** | 3 |
| **Priority** | Could |
| **Dependencies** | FR-LS-02 |
| **Pain / UC liên kết** | BUY-I03 → — |

#### FR-AI-10: Pricing intelligence fraud detection

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AI-10 |
| **Tên** | Pricing intelligence fraud detection |
| **Mô tả** | Pricing suggest + fraud graph signals. |
| **Actor** | Developer Admin, Ops |
| **Precondition** | Historical data Phase 3+. |
| **Postcondition** | Insights/alerts. |
| **Business rules** | Confidence score; human review forecast. |
| **Input/Output** | Input: market data. Output: insight. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-A08 → UC-AI-05 |

### 7.10 Trust & Compliance (TR)

#### FR-TR-01: Audit trail toàn hệ thống

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-TR-01 |
| **Tên** | Audit trail toàn hệ thống |
| **Mô tả** | Log ai, gì, khi, before/after mọi mutation. |
| **Actor** | Ops Admin, Developer Admin |
| **Precondition** | System running. |
| **Postcondition** | Audit queryable. |
| **Business rules** | Retention ≥ 5 năm; immutable store. |
| **Input/Output** | Input: entity_id. Output: audit log. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-BK-04 |
| **Pain / UC liên kết** | PP-08 → UC-TR-01 |

#### FR-TR-02: Document vault watermark

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-TR-02 |
| **Tên** | Document vault watermark |
| **Mô tả** | Vault lưu HĐ, CMND; watermark; access log. |
| **Actor** | Ops, Agent |
| **Precondition** | Doc uploaded. |
| **Postcondition** | Secure access URL. |
| **Business rules** | Expiring links; download logged. |
| **Input/Output** | Input: doc. Output: vault_id. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-S06 → — |

#### FR-TR-03: Dispute Resolution Center

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-TR-03 |
| **Tên** | Dispute Resolution Center |
| **Mô tả** | Case dispute + evidence pack + timeline replay. |
| **Actor** | Ops Admin |
| **Precondition** | Dispute filed. |
| **Postcondition** | Case resolved SLA 48h P3. |
| **Business rules** | Link event store replay; holdback COM. |
| **Input/Output** | Input: case. Output: resolution. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | FR-BK-04 |
| **Pain / UC liên kết** | OPS-I02 → UC-TR-02 |

#### FR-TR-04: Regulatory Export Pack

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-TR-04 |
| **Tên** | Regulatory Export Pack |
| **Mô tả** | Export báo cáo format regulator. |
| **Actor** | Platform Admin |
| **Precondition** | Phase 4 templates. |
| **Postcondition** | Export file validated. |
| **Business rules** | Legal template review. |
| **Input/Output** | Input: period. Output: export. |
| **Phase** | 4 |
| **Priority** | Could |
| **Dependencies** | — |
| **Pain / UC liên kết** | R-S07 → — |

#### FR-TR-05: AI action log

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-TR-05 |
| **Tên** | AI action log |
| **Mô tả** | Log prompt, response, cost, latency mọi AI call. |
| **Actor** | System |
| **Precondition** | AI invoked. |
| **Postcondition** | Log persisted. |
| **Business rules** | Tenant-scoped; PII redacted in logs. |
| **Input/Output** | Input: ai_call. Output: log_id. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-AI-03 |
| **Pain / UC liên kết** | R-A01 → US-AI-10 |

### 7.11 Analytics (AN)

#### FR-AN-01: KPI dashboard funnel lead booking

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AN-01 |
| **Tên** | KPI dashboard funnel lead booking |
| **Mô tả** | Dashboard funnel, lead, booking KPI. |
| **Actor** | Agency Admin, Developer Admin |
| **Precondition** | Data pipeline P1 basic. |
| **Postcondition** | Dashboard rendered. |
| **Business rules** | Refresh hourly P1; realtime P3. |
| **Input/Output** | Input: filters. Output: charts. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | — |
| **Pain / UC liên kết** | DEV-I02 → UC-AN-01 |

#### FR-AN-02: GMV dashboard

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AN-02 |
| **Tên** | GMV dashboard |
| **Mô tả** | GMV tracking live executive view. |
| **Actor** | Platform Admin, Developer |
| **Precondition** | Payments ledger. |
| **Postcondition** | GMV metrics accurate. |
| **Business rules** | Reconcile với ledger daily. |
| **Input/Output** | Input: period. Output: gmv. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-PAY-03 |
| **Pain / UC liên kết** | — → UC-AN-02 |

#### FR-AN-03: Inventory absorption report

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AN-03 |
| **Tên** | Inventory absorption report |
| **Mô tả** | Báo cáo tốc độ bán theo project/phase. |
| **Actor** | Developer Admin |
| **Precondition** | GR data. |
| **Postcondition** | Report generated. |
| **Business rules** | Sold/reserved/available breakdown. |
| **Input/Output** | Input: project_id. Output: report. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | DEV-I02 → UC-AN-02 |

#### FR-AN-04: Campaign attribution

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AN-04 |
| **Tên** | Campaign attribution |
| **Mô tả** | Attribution lead→campaign→deal. |
| **Actor** | Agency Admin |
| **Precondition** | UTM/campaign tags. |
| **Postcondition** | Attribution report. |
| **Business rules** | Multi-touch model Phase 3. |
| **Input/Output** | Input: campaign_id. Output: attribution. |
| **Phase** | 3 |
| **Priority** | Should |
| **Dependencies** | FR-CRM-02 |
| **Pain / UC liên kết** | DEV-I02 → — |

#### FR-AN-05: Absorption forecast 30/60/90

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-AN-05 |
| **Tên** | Absorption forecast 30/60/90 |
| **Mô tả** | ML forecast tỷ lệ bán. |
| **Actor** | Developer Admin |
| **Precondition** | Phase 3 warehouse. |
| **Postcondition** | Forecast with confidence. |
| **Business rules** | Disclaimer; accuracy target 80% 30-day P3. |
| **Input/Output** | Input: project. Output: forecast. |
| **Phase** | 3 |
| **Priority** | Could |
| **Dependencies** | — |
| **Pain / UC liên kết** | PP-11 → — |

### 7.12 Marketplace & Distribution (MKT)

#### FR-MKT-01: Distribution policy publish

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-MKT-01 |
| **Tên** | Distribution policy publish |
| **Mô tả** | Developer publish policy phân phối project. |
| **Actor** | Developer Admin |
| **Precondition** | Project GR ready. |
| **Postcondition** | Policy visible marketplace. |
| **Business rules** | Region, commission tier, quota per agency. |
| **Input/Output** | Input: policy. Output: policy_id. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | DEV-I05 → UC-MKT-01 |

#### FR-MKT-02: Agency apply approve quyền bán

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-MKT-02 |
| **Tên** | Agency apply approve quyền bán |
| **Mô tả** | Agency apply; Developer approve/reject. |
| **Actor** | Agency Admin, Developer Admin |
| **Precondition** | Policy published. |
| **Postcondition** | Distribution rights granted. |
| **Business rules** | Expiry renewal; compliance score factor P6. |
| **Input/Output** | Input: application. Output: status. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-MKT-01 |
| **Pain / UC liên kết** | DEV-I05 → UC-MKT-02 |

#### FR-MKT-03: Marketplace leaderboard compliance

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-MKT-03 |
| **Tên** | Marketplace leaderboard compliance |
| **Mô tả** | Leaderboard agency; compliance score. |
| **Actor** | Platform Admin |
| **Precondition** | Phase 6 data. |
| **Postcondition** | Rankings published. |
| **Business rules** | Score: GMV, drift rate, SLA, dispute rate. |
| **Input/Output** | Input: period. Output: leaderboard. |
| **Phase** | 3–6 |
| **Priority** | Could |
| **Dependencies** | FR-AN-02 |
| **Pain / UC liên kết** | — → — |

### 7.13 Experience Layer (UX)

#### FR-UX-01: Public Portal

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-01 |
| **Tên** | Public Portal |
| **Mô tả** | Search, detail, lead, compare buyer-facing. |
| **Actor** | Buyer |
| **Precondition** | Portal deployed. |
| **Postcondition** | Buyer journeys complete. |
| **Business rules** | Responsive; ≤3 click lead NFR-U03. |
| **Input/Output** | Input: user actions. Output: pages. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-LS-02 |
| **Pain / UC liên kết** | BUY-I01 → UC-LS-01 |

#### FR-UX-02: Agent Portal

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-02 |
| **Tên** | Agent Portal |
| **Mô tả** | CRM, listing, booking, payment agent UI. |
| **Actor** | Agent |
| **Precondition** | Agent onboarded. |
| **Postcondition** | Agent workflows E2E. |
| **Business rules** | Listing ≤5 min NFR-U02. |
| **Input/Output** | Input: agent actions. Output: workflows. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | Multiple |
| **Pain / UC liên kết** | AGT-I01 → UC-CRM-03 |

#### FR-UX-03: Admin Portal

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-03 |
| **Tên** | Admin Portal |
| **Mô tả** | Tenant, moderation, audit ops UI. |
| **Actor** | Ops Admin, Platform Admin |
| **Precondition** | Admin role. |
| **Postcondition** | Admin tasks complete. |
| **Business rules** | Moderation queue; audit viewer. |
| **Input/Output** | Input: admin actions. Output: config. |
| **Phase** | 1 |
| **Priority** | Must |
| **Dependencies** | FR-TR-01 |
| **Pain / UC liên kết** | OPS-I01 → UC-LS-02 |

#### FR-UX-04: Developer Portal

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-04 |
| **Tên** | Developer Portal |
| **Mô tả** | GR management, policy, absorption dev UI. |
| **Actor** | Developer Admin |
| **Precondition** | Phase 2. |
| **Postcondition** | Dev self-service GR. |
| **Business rules** | Bulk import UI; policy editor. |
| **Input/Output** | Input: dev actions. Output: GR mgmt. |
| **Phase** | 2 |
| **Priority** | Must |
| **Dependencies** | FR-GR-01 |
| **Pain / UC liên kết** | DEV-I01 → — |

#### FR-UX-05: Mobile App sale

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-05 |
| **Tên** | Mobile App sale |
| **Mô tả** | Offline-read, geo, voice-to-CRM mobile. |
| **Actor** | Agent |
| **Precondition** | Phase 2 app released. |
| **Postcondition** | Field sales enabled. |
| **Business rules** | PWA offline-read P2; native features. |
| **Input/Output** | Input: mobile. Output: field ops. |
| **Phase** | 2 |
| **Priority** | Should |
| **Dependencies** | FR-CRM-04 |
| **Pain / UC liên kết** | AGT-I01 → UC-UX-01 |

#### FR-UX-06: Buyer App native

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-06 |
| **Tên** | Buyer App native |
| **Mô tả** | Favorites, booking, deal tracking native app. |
| **Actor** | Buyer |
| **Precondition** | Phase 3. |
| **Postcondition** | Buyer mobile E2E. |
| **Business rules** | Push notification deal status. |
| **Input/Output** | Input: buyer mobile. Output: app flows. |
| **Phase** | 3 |
| **Priority** | Could |
| **Dependencies** | FR-BK-03 |
| **Pain / UC liên kết** | BUY-I02 → UC-UX-02 |

#### FR-UX-07: White-label portal

| Thuộc tính | Nội dung |
|------------|----------|
| **ID** | FR-UX-07 |
| **Tên** | White-label portal |
| **Mô tả** | Custom branding subdomain per tenant. |
| **Actor** | Platform Admin |
| **Precondition** | Phase 4. |
| **Postcondition** | Branded portal live. |
| **Business rules** | Theme, logo, domain config. |
| **Input/Output** | Input: brand config. Output: portal. |
| **Phase** | 4 |
| **Priority** | Could |
| **Dependencies** | FR-ID-01 |
| **Pain / UC liên kết** | — → — |

---

## 8. Yêu cầu phi chức năng (Non-Functional Requirements)

NFR được đo lường bằng metric cụ thể, phương pháp đo, mục tiêu theo phase, và cách kiểm thử — gate trước mỗi go-live.

### 8.1 Performance

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-P01 | API read latency P95 | ≤ 500ms @ 100 concurrent | APM (Datadog/New Relic), k6 | P1 | Load test gate Sprint 12 |
| NFR-P02 | API write latency P95 | ≤ 800ms @ 50 concurrent | APM + k6 write scenario | P1 | Integration load test |
| NFR-P03 | Search latency P95 | ≤ 200ms @ 10K documents | OpenSearch slowlog + k6 | P1 | Search benchmark suite |
| NFR-P04 | Inventory sync lag (GR→Search/SSE) | ≤ 5 giây | CDC lag metric, synthetic probe | P1 | Chaos test + metric alert |
| NFR-P05 | AI copilot response time P95 | ≤ 8 giây | AI action log latency field | P1 | AI eval pipeline |
| NFR-P06 | Lead scoring latency | ≤ 3 giây sau LeadCaptured | Event timestamp delta | P1 | Integration test |
| NFR-P07 | Payment webhook processing | ≤ 2 giây end-to-end | Webhook handler trace | P1 | Sandbox replay test |
| NFR-P08 | Zero double booking | 0/1000 concurrent lock attempts | Chaos test + audit log | P1 | Mandatory go-live gate |

### 8.2 Security

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-S01 | Encryption at rest | AES-256 DB + S3 | Infra audit, config scan | P1 | Compliance checklist |
| NFR-S02 | Tenant isolation | 0 cross-tenant access | RLS test suite 100% pass | P1 | Pen test + integration |
| NFR-S03 | Audit trail immutability | No UPDATE/DELETE on audit store | DB policy + replay test | P1 | Security review |
| NFR-S04 | OWASP Top 10 | Zero Critical/High at gate | SAST/DAST CI + pen test | P1 | Third-party pen test |
| NFR-S05 | MFA sensitive actions | 100% payment/e-sign/admin | Auth log audit | P1 | UAT security scenarios |
| NFR-S06 | PII encryption in transit | TLS 1.2+ mọi endpoint | SSL scan, cert audit | P1 | Automated scan |
| NFR-S07 | Secrets management | No secrets in code/logs | Git secret scan, vault audit | P1 | CI gate |
| NFR-S08 | Rate limiting API | 429 sau threshold tenant | API gateway metrics | P1–2 | Abuse simulation |
| NFR-S09 | Session timeout | ≤ 8h idle; refresh token rotation | Auth config audit | P1 | Manual + auto test |
| NFR-S10 | Document vault access control | Expiring signed URL; download log | Vault access audit | P2 | Security test cases |

### 8.3 Scalability

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-SC01 | Concurrent users Phase 1 | 500 concurrent without degrade | Load test k6 | P1 | Phase 1 gate |
| NFR-SC02 | Concurrent users Phase 3 | 5,000 concurrent | Load test + auto-scale | P3 | Scale test quarterly |
| NFR-SC03 | Golden Record units/tenant | ≥ 50,000 units | DB benchmark | P2 | Performance test |
| NFR-SC04 | Event store throughput | ≥ 500 events/s per tenant | Event store metrics | P2 | Stress test |
| NFR-SC05 | Search index size | ≥ 1M documents cluster | OpenSearch cluster monitor | P3 | Capacity planning |
| NFR-SC06 | Multi-region read replica | Read latency < 100ms regional | Geo latency probe | P4 | Multi-region drill |

### 8.4 Availability

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-A01 | Uptime SLA production | ≥ 99.5% monthly | Uptime monitoring (Pingdom/Statuspage) | P1 | SLA report monthly |
| NFR-A02 | RPO (Recovery Point Objective) | ≤ 24 giờ | Backup log + DR drill | P1 | Quarterly DR drill |
| NFR-A03 | RTO (Recovery Time Objective) | ≤ 4 giờ | DR drill timed restore | P1 | Quarterly DR drill |
| NFR-A04 | Payment gateway failover | ≤ 30s switch fallback gateway | Circuit breaker metric | P3 | Failover simulation |
| NFR-A05 | Planned maintenance window | ≤ 4h/tháng; notify 72h trước | Change management log | P1 | Ops process audit |

### 8.5 Usability

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-U01 | UI ngôn ngữ | 100% UI tiếng Việt Phase 1 | UX review checklist | P1 | UAT walkthrough |
| NFR-U02 | Agent tạo listing | ≤ 5 phút median (with AI copilot) | Product analytics funnel | P1 | UAT timing study |
| NFR-U03 | Buyer lead submission | ≤ 3 click từ search | UX analytics | P1 | Usability test n=8 |
| NFR-U04 | Mobile responsive | Functional trên viewport ≥ 320px | Cross-browser test matrix | P1 | Responsive test suite |
| NFR-U05 | Accessibility WCAG | Level AA cho public portal | axe/Lighthouse audit | P2 | A11y audit report |

### 8.6 Compliance

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-C01 | KYC/KYB trước payout | 100% payout blocked nếu chưa KYC | Compliance workflow audit | P2 | Process verification |
| NFR-C02 | Quảng cáo BĐS VN | Listing pass compliance check | Legal rule engine + manual spot check | P1–3 | Legal review sample |
| NFR-C03 | Consent PDPA/GDPR-ready | Lead form consent checkbox bắt buộc | Form audit + DB consent log | P1 | Compliance test |
| NFR-C04 | AI disclaimer | Mọi AI output có disclaimer pháp lý | UI template audit | P1 | Legal sign-off |
| NFR-C05 | Data retention policy | Tuân thủ retention matrix Section 9 | Retention job audit | P1 | Compliance audit |

### 8.7 Operability

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-O01 | Structured logging | 100% services JSON log + trace_id | Log format lint | P1 | Observability review |
| NFR-O02 | Alert response P0 | On-call acknowledge ≤ 15 phút | PagerDuty/incident log | P1 | Incident drill |
| NFR-O03 | Daily reconciliation report | Auto-generated 06:00 ICT | Cron job success metric | P1 | Finance sign-off |
| NFR-O04 | Feature flag rollout | Toggle without deploy | Feature flag platform audit | P1 | Ops runbook test |
| NFR-O05 | Runbook coverage | Runbook cho top 10 incident types | Ops doc review | P1 | Quarterly review |

### 8.8 Maintainability

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-M01 | Code coverage backend | ≥ 70% line coverage critical modules | CI coverage report | P1 | Sprint gate |
| NFR-M02 | API documentation | OpenAPI spec 100% public endpoints | Spec diff CI gate | P1 | Contract test |
| NFR-M03 | ADR for architecture decisions | ADR cho mọi quyết định cross-cutting | ADR registry audit | P1 | Architecture review |
| NFR-M04 | Dependency update cadence | Critical CVE patch ≤ 7 ngày | Dependabot/Snyk report | P1 | Security sprint |

### 8.9 Compatibility

| ID | Metric | Mục tiêu | Phương pháp đo | Phase target | Test approach |
|----|--------|----------|----------------|--------------|---------------|
| NFR-CM01 | Browser support | Chrome/Firefox/Safari/Edge 2 versions | BrowserStack matrix | P1 | Cross-browser CI |
| NFR-CM02 | Mobile OS | iOS 15+, Android 10+ (P2 app) | Device lab test | P2 | Mobile UAT |
| NFR-CM03 | Payment gateway API | Adapter tách biệt; swap gateway ≤ 2 sprint | Adapter integration test | P1 | Sandbox certification |
| NFR-CM04 | Zalo/Meta API version | Support current + previous API version | Webhook compatibility test | P2 | Partner sandbox test |

---

## 9. Yêu cầu dữ liệu (Data Requirements)

Mô hình dữ liệu WEREAL tuân thủ Product Graph và event-sourced transaction — mọi entity có tenant_id, audit fields, và retention policy.

### 9.1 Entity chính và trường khóa

| Entity | Mô tả | Key fields | Retention | Versioning |
|--------|-------|------------|-----------|------------|
| Tenant | Tổ chức Platform/Developer/Agency/Branch | tenant_id, type, name, status, parent_id | Vĩnh viễn (soft-delete) | Config version |
| User | Người dùng thuộc tenant | user_id, tenant_id, email, role[], mfa_enabled | 7 năm sau deactivate | Profile history |
| Project | Dự án BĐS Developer | project_id, developer_id, name, location, legal_status | Vĩnh viễn | Phase versioning |
| Unit (Golden Record) | Căn hộ/đất nền gốc | unit_id, project_id, code, price, status, attributes JSON | Vĩnh viễn | Immutable version snapshots |
| UnitVersion | Snapshot thay đổi GR | version_id, unit_id, diff, actor, reason, as_of | ≥ 10 năm | Append-only |
| Listing | Marketing layer trên GR | listing_id, unit_id, agent_id, content, media[], status | 5 năm sau unpublish | Draft revisions |
| Lead | Khách tiềm năng | lead_id, source, campaign, score, assignee_id | 5 năm | Stage history |
| Booking | Giữ chỗ/giao dịch | booking_id, unit_id, buyer_id, state, expiry_at | ≥ 10 năm | State machine events |
| DomainEvent | Event store | event_id, aggregate_id, type, payload, timestamp | ≥ 10 năm | Append-only, no update |
| PaymentIntent | Thanh toán abstract | intent_id, booking_id, amount, gateway_ref, status | ≥ 10 năm | Status transitions logged |
| LedgerEntry | Sổ cái kép | entry_id, debit_acct, credit_acct, amount, ref | ≥ 10 năm | Immutable |
| CommissionPolicy | Policy hoa hồng | policy_id, project_id, rules, effective_from/to | Vĩnh viễn | Versioned policies |
| CommissionSnapshot | Snapshot tại chốt deal | snapshot_id, deal_id, policy_version, splits[] | Vĩnh viễn | Immutable |
| Contract | Hợp đồng e-sign | contract_id, booking_id, template_ver, signed_doc_url | ≥ 15 năm | Template version + sign events |
| DocumentVault | KYC, CMND, HĐ scan | doc_id, owner_id, type, watermark, access_log[] | Theo luật (≥ 10 năm) | Access audit only |
| AuditLog | Audit toàn hệ thống | log_id, actor, entity, action, before, after | ≥ 5 năm (NFR-S03) | Append-only |
| AIActionLog | Log mọi AI call | log_id, prompt_hash, response, cost, latency | 2 năm (PII redacted) | Append-only |
| DisputeCase | Tranh chấp/khiếu nại | case_id, deal_id, status, evidence_refs[] | ≥ 10 năm | Case timeline events |

### 9.2 Quy tắc dữ liệu chung

| Quy tắc | Mô tả |
|---------|-------|
| **Tenant isolation** | Mọi bảng nghiệp vụ có `tenant_id`; PostgreSQL RLS enforce |
| **Audit fields** | `created_at`, `created_by`, `updated_at`, `updated_by` bắt buộc |
| **Soft delete** | Không hard-delete entity giao dịch; dùng `deleted_at` + retention job |
| **Idempotency** | Payment, webhook, import có idempotency key |
| **PII classification** | Phone, email, CMND tagged; mask trong log/export |
| **Referential integrity** | Listing phải reference unit_id hợp lệ; Booking phải reference unit available/reserved |

### 9.3 Data lineage (Golden Record → downstream)

```
Developer GR → UnitVersion → Listing (read-only price)
           → CDC → OpenSearch (search index)
           → SSE → Portals (real-time status)
Booking → DomainEvent → Ledger → CommissionSnapshot
Lead → AI Score → CRM Pipeline → Booking
```

---

## 10. Yêu cầu giao diện (Interface Requirements)

### 10.1 REST API nội bộ và public

| Nhóm API | Endpoint pattern | Auth | Phase | Ghi chú |
|----------|------------------|------|-------|---------|
| Identity | /api/v1/auth/*, /api/v1/tenants/* | JWT + RLS context | P1 | OAuth2 password + refresh |
| Golden Record | /api/v1/units/*, /api/v1/projects/* | RBAC Developer Admin | P1 | Versioning + bulk import P2 |
| Listing | /api/v1/listings/* | RBAC Agent/Ops | P1 | Approval workflow |
| Search | /api/v1/search/* | Public read / JWT write | P1 | OpenSearch backend |
| CRM | /api/v1/leads/*, /api/v1/activities/* | RBAC Agent | P1 | Pipeline sync state machine |
| Booking | /api/v1/bookings/* | RBAC Agent/Buyer | P1 | State transitions via events |
| Payment | /api/v1/payments/*, /api/v1/ledger/* | MFA + RBAC | P1 | Webhook /webhooks/payment |
| Commission | /api/v1/commissions/* | RBAC Admin | P2 | Settlement batch |
| AI | /api/v1/ai/copilot/*, /api/v1/ai/score/* | RBAC + quota | P1 | Guardrails middleware |
| Analytics | /api/v1/analytics/* | RBAC Admin | P1 | Read-only aggregates |
| SSE | /api/v1/stream/units | JWT tenant-scoped | P1 | Real-time inventory |

### 10.2 Payment Gateway Integration

| Thuộc tính | Yêu cầu |
|------------|---------|
| **Provider Phase 1** | 1 gateway (VNPay hoặc MoMo — TBD contract) |
| **Adapter pattern** | Interface `PaymentGatewayAdapter` — swap provider ≤ 2 sprint |
| **Operations** | CreateIntent, Capture, Refund, QueryStatus |
| **Webhook** | HMAC signature verify; idempotency key; retry 3x exponential backoff |
| **Sandbox** | Sandbox keys trước 01/10/2026 (ASM-02) |
| **Multi-gateway** | Primary/fallback routing Phase 3 (FR-PAY-06) |

### 10.3 Zalo / Meta Omnichannel

| Kênh | Integration | Direction | Phase | FR |
|------|-------------|-----------|-------|-----|
| Zalo OA | Webhook inbound message → CRM lead/thread | Inbound + Outbound | P2 | FR-CRM-06 |
| Zalo ZNS | OTP, payment link, booking notify template | Outbound | P2 | FR-CRM-06, FR-ID-04 |
| Meta Lead Ads | Webhook lead form → CRM auto-create | Inbound | P2 | FR-CRM-07 |
| Meta Messenger | Optional unified inbox | Bidirectional | P3 | FR-CRM-09 |
### 10.4 E-Sign Provider

| Thuộc tính | Yêu cầu |
|------------|---------|
| **Provider** | FPT/eContract hoặc tương đương — legal approved |
| **Flow** | ContractGenerated → send sign link → webhook ContractSigned |
| **Security** | MFA trước ký; audit trail signer, IP, timestamp |
| **Storage** | Signed PDF → Document Vault (FR-TR-02) |

### 10.5 LLM / AI Provider

| Thuộc tính | Yêu cầu |
|------------|---------|
| **Provider Phase 1** | OpenAI/Azure OpenAI hoặc tương đương (CON-07: không self-host) |
| **Use cases** | Copilot listing, lead scoring, RAG assistant |
| **Tenant isolation** | Separate vector index per tenant; metadata filter bắt buộc |
| **Cost control** | Rate limit, quota per tenant, model routing (R-A03) |
| **Logging** | Mọi call → AIActionLog (FR-TR-05) |

---

## 11. Ưu tiên MoSCoW (82 FR × Phase 1–6)

MoSCoW: **M**=Must, **S**=Should, **C**=Could, **W**=Won't (phase đó). Cột Phase = phase triển khai chính.

| FR ID | Tên (rút gọn) | Phase | P1 | P2 | P3 | P4 | P5 | P6 |
|-------|---------------|-------|----|----|----|----|----|-----|
| FR-GR-01 | Quản lý Golden Record (Unit gốc) | P1 | M | — | — | — | — | — |
| FR-GR-02 | Versioning giá, tồn kho, policy | P1 | M | — | — | — | — | — |
| FR-GR-03 | Listing marketing từ unit gốc | P1 | M | — | — | — | — | — |
| FR-GR-04 | Anti-drift auto-block/flag | P1 | M | — | — | — | — | — |
| FR-GR-05 | Verified Listing badge | P1 | S | — | — | — | — | — |
| FR-GR-06 | Time-travel query | P2 | W | S | — | — | — | — |
| FR-GR-07 | Bulk import Excel/CSV | P2 | W | S | — | — | — | — |
| FR-GR-08 | Real-time push trạng thái unit | P1 | M | — | — | — | — | — |
| FR-ID-01 | Multi-tenant hierarchy | P1 | M | — | — | — | — | — |
| FR-ID-02 | RBAC và ABAC | P1 | M | — | — | — | — | — |
| FR-ID-03 | Tenant isolation RLS | P1 | M | — | — | — | — | — |
| FR-ID-04 | MFA/OTP nhạy cảm | P1 | M | — | — | — | — | — |
| FR-ID-05 | KYC/KYB | P2 | W | S | — | — | — | — |
| FR-ID-06 | SSO Enterprise | P4 | W | — | — | C | — | — |
| FR-LS-01 | CRUD listing + approval | P1 | M | — | — | — | — | — |
| FR-LS-02 | Full-text + facet + geo search | P1 | M | — | — | — | — | — |
| FR-LS-03 | Media upload listing | P1 | M | — | — | — | — | — |
| FR-LS-04 | So sánh sản phẩm | P1 | S | — | — | — | — | — |
| FR-LS-05 | Duplicate listing detection | P2 | W | S | — | — | — | — |
| FR-LS-06 | Search sync CDC | P1 | M | — | — | — | — | — |
| FR-CRM-01 | Lead capture đa nguồn | P1 | M | — | — | — | — | — |
| FR-CRM-02 | Lead gắn entity | P1 | M | — | — | — | — | — |
| FR-CRM-03 | Lead routing | P1 | M | — | — | — | — | — |
| FR-CRM-04 | CRM activities timeline | P1 | M | — | — | — | — | — |
| FR-CRM-05 | Pipeline + state machine | P1 | M | — | — | — | — | — |
| FR-CRM-06 | Zalo OA/ZNS integration | P2 | M | M | — | — | — | — |
| FR-CRM-07 | Meta Lead Ads sync | P2 | M | M | — | — | — | — |
| FR-CRM-08 | SLA reminder escalation | P2 | W | S | — | — | — | — |
| FR-CRM-09 | Omnichannel unified inbox | P3 | — | — | C | — | — | — |
| FR-BK-01 | Reservation với expiry | P1 | M | — | — | — | — | — |
| FR-BK-02 | Atomic inventory lock | P1 | M | — | — | — | — | — |
| FR-BK-03 | Transaction state machine 15 states | P1 | M | — | — | — | — | — |
| FR-BK-04 | Domain events event store | P1 | M | — | — | — | — | — |
| FR-BK-05 | Contract template merge | P2 | W | S | — | — | — | — |
| FR-BK-06 | E-sign integration | P2 | W | S | — | — | — | — |
| FR-BK-07 | Cancel/refund workflow | P1 | M | — | — | — | — | — |
| FR-BK-08 | Custom workflow per tenant | P4 | — | — | — | C | — | — |
| FR-PAY-01 | Payment orchestration | P1 | M | — | — | — | — | — |
| FR-PAY-02 | PaymentIntent Invoice Receipt Refund | P1 | M | — | — | — | — | — |
| FR-PAY-03 | Double-entry ledger | P1 | M | — | — | — | — | — |
| FR-PAY-04 | Webhook idempotent reconciliation | P1 | M | — | — | — | — | — |
| FR-PAY-05 | Deposit payment gắn booking | P1 | M | — | — | — | — | — |
| FR-PAY-06 | Multi-gateway routing fallback | P3 | — | — | S | — | — | — |
| FR-PAY-07 | Commission settlement batch payout | P2 | M | M | — | — | — | — |
| FR-PAY-08 | Smart Escrow conditional release | P5 | — | — | — | — | C | — |
| FR-PAY-09 | BNPL trả góp đợt | P5 | — | — | — | — | C | — |
| FR-PAY-10 | Mortgage pre-qualification | P5 | — | — | — | — | C | — |
| FR-COM-01 | Commission policy per project | P2 | M | M | — | — | — | — |
| FR-COM-02 | Policy snapshot at deal close | P2 | M | M | — | — | — | — |
| FR-COM-03 | Split commission multi agent | P2 | W | S | — | — | — | — |
| FR-COM-04 | Holdback khi tranh chấp | P2 | W | S | — | — | — | — |
| FR-COM-05 | Export kế toán CSV/Excel | P2 | M | M | — | — | — | — |
| FR-AI-01 | Content copilot listing | P1 | M | — | — | — | — | — |
| FR-AI-02 | Lead scoring tự động | P1 | M | — | — | — | — | — |
| FR-AI-03 | Guardrails no mutate | P1 | M | — | — | — | — | — |
| FR-AI-04 | Human approval AI content | P1 | M | — | — | — | — | — |
| FR-AI-05 | RAG knowledge assistant | P2 | W | S | — | — | — | — |
| FR-AI-06 | Buyer-product matching | P2 | — | S | — | — | — | — |
| FR-AI-07 | Sales Agent draft reply | P3 | — | — | S | — | — | — |
| FR-AI-08 | Ops Compliance Agent anomaly | P3 | — | — | S | — | — | — |
| FR-AI-09 | Buyer conversational discovery | P3 | — | — | C | — | — | — |
| FR-AI-10 | Pricing intelligence fraud detection | P3 | — | — | S | — | — | — |
| FR-TR-01 | Audit trail toàn hệ thống | P1 | M | — | — | — | — | — |
| FR-TR-02 | Document vault watermark | P2 | — | S | — | — | — | — |
| FR-TR-03 | Dispute Resolution Center | P3 | — | — | S | — | — | — |
| FR-TR-04 | Regulatory Export Pack | P4 | — | — | — | C | — | — |
| FR-TR-05 | AI action log | P1 | M | — | — | — | — | — |
| FR-AN-01 | KPI dashboard funnel lead booking | P1 | M | — | — | — | — | — |
| FR-AN-02 | GMV dashboard | P2 | M | M | — | — | — | — |
| FR-AN-03 | Inventory absorption report | P2 | W | S | — | — | — | — |
| FR-AN-04 | Campaign attribution | P3 | — | — | S | — | — | — |
| FR-AN-05 | Absorption forecast 30/60/90 | P3 | — | — | C | — | — | — |
| FR-MKT-01 | Distribution policy publish | P2 | W | S | — | — | — | — |
| FR-MKT-02 | Agency apply approve quyền bán | P2 | W | S | — | — | — | — |
| FR-MKT-03 | Marketplace leaderboard compliance | P3 | W | — | C | — | — | — |
| FR-UX-01 | Public Portal | P1 | M | — | — | — | — | — |
| FR-UX-02 | Agent Portal | P1 | M | — | — | — | — | — |
| FR-UX-03 | Admin Portal | P1 | M | — | — | — | — | — |
| FR-UX-04 | Developer Portal | P2 | M | M | — | — | — | — |
| FR-UX-05 | Mobile App sale | P2 | W | S | — | — | — | — |
| FR-UX-06 | Buyer App native | P3 | — | — | C | — | — | — |
| FR-UX-07 | White-label portal | P4 | — | — | — | C | — | — |

---

## 12. Ràng buộc (Constraints) và Giả định (Assumptions)

### 12.1 Ràng buộc (15+)

| ID | Loại | Mô tả | Ảnh hưởng |
|----|------|-------|-----------|
| CON-01 | Thời gian | Go-live MVP Phase 1: 31/12/2026 | Scope P1 phải fit 5 tháng dev |
| CON-02 | Nguồn lực | Team Phase 1: 8–10 FTE (BE/FE/QA/DevOps/BA) | Parallel workstream giới hạn |
| CON-03 | Kỹ thuật | 1 payment gateway Phase 1 | Adapter pattern bắt buộc |
| CON-04 | Kỹ thuật | PostgreSQL primary DB; OpenSearch search | Stack lock Phase 1 |
| CON-05 | Pháp lý | Tuân thủ quy định quảng cáo BĐS Việt Nam | Compliance check listing |
| CON-06 | Ngân sách | AI cost cap Phase 1: [TBD] USD/tháng/tenant | Rate limit + quota |
| CON-07 | Kỹ thuật | Không self-host LLM foundation model P1–4 | Dùng LLM provider API |
| CON-08 | Kỹ thuật | Event store retention ≥ 5 năm minimum | Storage planning |
| CON-09 | Nghiệp vụ | Golden Record do Developer sở hữu — Agency read-only giá | Anti-drift architecture |
| CON-10 | Bảo mật | MFA bắt buộc payment, e-sign, admin action | Auth UX trade-off |
| CON-11 | Hạ tầng | Cloud region: ap-southeast-1 (Singapore) Phase 1 | Latency VN ~30–50ms |
| CON-12 | Đối tác | Zalo/Meta API subject to partner policy change | Abstraction layer |
| CON-13 | Nghiệp vụ | Pilot: ≥ 1 Developer + 1 Agency trước UAT | Onboarding dependency |
| CON-14 | Kỹ thuật | Mobile native app không thuộc Phase 1 | PWA/responsive only P1 |
| CON-15 | Pháp lý | Embedded finance Phase 5 cần legal license review | R-P11 blocker |
| CON-16 | Kỹ thuật | Không blockchain/smart contract v1 | Event store đủ audit |
| CON-17 | Ngân sách | Pen test third-party 1 lần/phase gate | Security budget |

### 12.2 Giả định (15+)

| ID | Giả định | Nếu sai → Rủi ro |
|----|----------|------------------|
| ASM-01 | ≥ 1 Developer + 1 Agency pilot commit UAT Phase 1 | R-O02 |
| ASM-02 | Payment gateway sandbox available trước 01/10/2026 | R-O05 |
| ASM-03 | Developer cung cấp bảng hàng chuẩn onboarding (Excel template) | R-B02 |
| ASM-04 | Agent chấp nhận workflow platform nếu nhanh hơn Zalo | R-B01 |
| ASM-05 | Zalo OA API credentials được cấp Phase 2 | R-O07 |
| ASM-06 | Meta Business API access approved Phase 2 | R-O07 |
| ASM-07 | LLM provider SLA ≥ 99% uptime | R-A06 |
| ASM-08 | Pilot tenant có ≤ 5,000 units Phase 1 | NFR-SC03 |
| ASM-09 | Legal review BR-01→10 hoàn thành trước go-live P1 | R-S02 |
| ASM-10 | E-sign provider contract ký Phase 2 | FR-BK-06 delay |
| ASM-11 | Ops team ≥ 2 FTE moderation Phase 1 | Listing approval SLA |
| ASM-12 | Internet banking webhook reliable ≥ 99% | R-P01 |
| ASM-13 | Buyer adoption online deposit ≥ 30% pilot deals | GMV target |
| ASM-14 | Steering Committee sign-off SRS v2.0 trong T8/2026 | Scope creep R-O01 |
| ASM-15 | Không thay đổi luật BĐS major trong Phase 1–2 | R-S02 |
| ASM-16 | OpenSearch managed service đủ cho 10K docs Phase 1 | R-T03 |
| ASM-17 | Team có kinh nghiệm event sourcing hoặc training 2 tuần | R-T04 |

---

## 13. Phụ thuộc và Rủi ro (Dependencies & Risks)

Bảng liên kết Assumption/Constraint → Risk ID — tham chiếu `Danh-sach-rui-ro.md` v2.0 (42 rủi ro).

| ASM/CON ID | Mô tả ngắn | Risk ID liên kết | Mitigation chính | Phase |
|------------|------------|------------------|------------------|-------|
| ASM-01 | Pilot tenant commit | R-O02 | Weekly feedback, contract pilot | P1 |
| ASM-02 | Payment sandbox timeline | R-O05 | Early negotiation, mock payment | P1 |
| ASM-03 | Developer data onboarding | R-B02 | Import tool FR-GR-07, onboarding SLA | P1 |
| ASM-04 | Agent adoption platform | R-B01 | Mandatory booking, incentive, UX speed | P1–2 |
| ASM-05 | Zalo API credentials | R-O07 | Abstraction layer, fallback SMS | P2 |
| CON-03 | Single gateway P1 | R-P05 | Adapter + multi-gateway P3 | P1–3 |
| CON-07 | No self-host LLM | R-A06 | Fallback model, graceful degrade | P1 |
| CON-10 | MFA mandatory | R-S05 | OTP via Zalo/SMS | P1 |
| CON-15 | Embedded finance legal | R-P11 | Separate legal track Phase 5 | P5 |
| FR-ID-03 | RLS tenant isolation | R-T01 | RLS + pen test + cross-tenant test | P1 |
| FR-BK-02 | Atomic lock | R-P03 | Redis lock + 1000 concurrent test | P1 |
| FR-PAY-04 | Webhook reconciliation | R-P01, R-P02 | Idempotency + daily reconcile | P1 |
| FR-AI-03 | AI guardrails | R-A01, R-A02 | Read-only whitelist + human approval | P1 |
| FR-LS-06 | Search CDC sync | R-T03 | Outbox + reconciliation job | P1–3 |
| FR-CRM-06/07 | Zalo/Meta integration | R-O07 | Adapter pattern, monitor changelog | P2 |
| FR-BK-08 | Custom workflow engine | R-T10 | Temporal POC, limit custom scope | P4 |
| FR-PAY-08 | Smart Escrow | R-P08 | Multi-approval, legal checklist | P5 |
| FR-AI-07 | AI auto-send | R-A07 | Approve-to-send, kill switch | P3 |
| CON-01 | Go-live deadline | R-O01 | CR process, MVP discipline | P1 |
| CON-09 | Golden Record ownership | R-S02 | Anti-drift + legal review listing | P1 |

### 13.1 Top rủi ro P0 Phase 1 (không go-live nếu chưa verify)

| Risk ID | Mô tả | Score | FR/NFR liên quan |
|---------|-------|-------|------------------|
| R-T01 | Tenant data leak (RLS bypass) | 15 | FR-ID-03, NFR-S02 |
| R-T04 | State machine edge case / deadlock | 15 | FR-BK-03, FR-BK-04 |
| R-P01 | Webhook duplicate/missed | 15 | FR-PAY-04 |
| R-P02 | Ledger không khớp provider | 15 | FR-PAY-03, NFR-O03 |
| R-P03 | Double booking race condition | 15 | FR-BK-02, NFR-P08 |
| R-S02 | Vi phạm quy định BĐS/quảng cáo | 15 | NFR-C02, FR-LS-01 |
| R-A01 | AI hallucination pháp lý/giá | 16 | FR-AI-03, FR-AI-04, NFR-C04 |

---

## 14. Ma trận truy vết (Traceability Matrix)

Liên kết Pain Point → Business Rule → Functional Requirement → Use Case → User Story.

| Pain | Business Rule | FR | UC | US | Phase |
|------|---------------|----|----|-----|-------|
| PP-01 | BR-01 | FR-GR-01, FR-GR-03, FR-GR-04 | UC-GR-01, UC-GR-02, UC-GR-03 | US-GR-01, US-GR-04, US-GR-05 | P1 |
| PP-02 | BR-02, BR-03 | FR-BK-02, FR-GR-08, FR-BK-01 | UC-BK-01, UC-BK-02 | US-BK-02, US-GR-09 | P1 |
| PP-03 | BR-05 | FR-CRM-06, FR-CRM-07, FR-CRM-01 | UC-CRM-04, UC-CRM-01 | US-CRM-07 | P2 |
| PP-04 | BR-04 | FR-PAY-03, FR-PAY-04, FR-PAY-05 | UC-PAY-01, UC-PAY-02 | US-PAY-05, US-PAY-08 | P1 |
| PP-05 | BR-04 | FR-COM-01, FR-COM-02, FR-PAY-07 | UC-PAY-03 | US-PAY-05 | P2 |
| PP-06 | BR-06 | FR-AI-01, FR-AI-04 | UC-AI-01 | US-AI-11 | P1 |
| PP-07 | BR-07 | FR-AI-02, FR-CRM-03 | UC-AI-02, UC-CRM-02 | US-CRM-07 | P1 |
| PP-08 | BR-08 | FR-TR-01, FR-BK-04, FR-GR-06 | UC-TR-01, UC-BK-03, UC-GR-04 | US-ID-06 | P1–3 |
| PP-09 | — | FR-UX-05 | UC-UX-01 | US-LS-10 | P2 |
| PP-10 | BR-10 | FR-GR-05 | UC-LS-01 | US-LS-02 | P1 |
| PP-11 | — | FR-AN-05 | UC-AN-02 | — | P3 |
| PP-12 | BR-02 | FR-BK-01, FR-PAY-05, FR-UX-02 | UC-BK-01, UC-CRM-03 | US-PAY-08 | P1 |
| PP-13 | — | FR-AN-04, FR-MKT-03 | UC-MKT-01 | — | P2–6 |
| PP-14 | BR-09 | FR-MKT-01, FR-MKT-02, FR-LS-01 | UC-MKT-01, UC-MKT-02, UC-LS-02 | — | P2 |
| PP-15 | BR-02 | FR-BK-01, FR-PAY-05 | UC-BK-01 | US-PAY-08 | P1 |
| PP-16 | — | FR-AI-05 | UC-AI-03 | US-AI-09 | P2 |
| PP-17 | — | FR-CRM-04, FR-AI-07 | UC-CRM-03 | US-CRM-07 | P2–3 |
| PP-18 | — | FR-BK-03, FR-UX-06 | UC-UX-02 | US-BK-02 | P3 |
| PP-19 | — | FR-LS-04, FR-AI-06 | UC-LS-03 | US-LS-02 | P1–2 |
| DEV-I01 | BR-01 | FR-GR-01, FR-GR-02 | UC-GR-01 | US-GR-01 | P1 |
| AGY-I02 | BR-05 | FR-CRM-06, FR-CRM-07 | UC-CRM-04 | US-CRM-07 | P2 |
| OPS-I01 | BR-09 | FR-GR-04, FR-LS-01 | UC-GR-03, UC-LS-02 | US-GR-05 | P1 |
| PLT-I01 | — | FR-AN-02, FR-PAY-03 | UC-AN-02 | US-PAY-05 | P2 |

---

## 15. Phụ lục (Appendices)

### 15.1 Bảng phê duyệt (Sign-off)

| Vai trò | Họ tên | Chữ ký | Ngày | Ghi chú |
|---------|--------|--------|------|---------|
| Product Owner | [TBD] |  |  | Scope và priority MoSCoW |
| BA Lead | [TBD] |  |  | FR/NFR completeness |
| Tech Lead / Architect | [TBD] |  |  | Feasibility kỹ thuật |
| AI Lead | [TBD] |  |  | AI guardrails và cost |
| Legal / Compliance | [TBD] |  |  | BR-01→10, NFR-C01→05 |
| Steering Committee Chair | [TBD] |  |  | Final baseline approval |

### 15.2 Liên kết tài liệu dự án

| # | Tài liệu | File | Phiên bản |
|---|----------|------|-----------|
| REF-01 | Kế hoạch dự án | `Ke-hoach-du-an.md` | 2.0 |
| REF-02 | Phạm vi công việc | `Pham-vi-cong-viec.md` | 2.0 |
| REF-03 | Use Case & User Story | `Danh-sach-use-case-user-story.md` | 1.0 |
| REF-04 | Tiêu chí chấp nhận | `Tieu-chi-chap-nhan.md` | 1.0 |
| REF-05 | Yêu cầu đã xác nhận | `Yeu-cau-da-xac-nhan.md` | 1.0 |
| REF-06 | Danh sách rủi ro | `Danh-sach-rui-ro.md` | 2.0 |
| REF-07 | Timeline sơ bộ | `Timeline-so-bo.md` | 2.0 |
| REF-08 | WEREAL Architecture | Architecture v2.0 (Confluence) | 2.0 |
| REF-09 | OpenAPI Specification | Git repo /docs/openapi.yaml | TBD |
| REF-10 | ADR Registry | Git repo /docs/adr/ | Ongoing |

### 15.3 Business Rules tham chiếu (BR-01 → BR-10)

| BR ID | Mô tả | FR chính |
|-------|-------|----------|
| BR-01 | Golden Record do Developer quản lý — Agency không sửa giá gốc | FR-GR-01, FR-GR-03, FR-GR-04 |
| BR-02 | Mọi giao dịch giữ chỗ/cọc phải qua platform | FR-BK-01, FR-PAY-05 |
| BR-03 | Chống double booking tuyệt đối | FR-BK-02 |
| BR-04 | Đối soát thanh toán tự động hàng ngày | FR-PAY-03, FR-PAY-04 |
| BR-05 | Lead Facebook/Zalo vào CRM tự động | FR-CRM-06, FR-CRM-07 |
| BR-06 | AI hỗ trợ viết tin — agent duyệt trước publish | FR-AI-01, FR-AI-04 |
| BR-07 | Lead scoring ưu tiên lead nóng | FR-AI-02, FR-CRM-03 |
| BR-08 | Audit trail đầy đủ khi tranh chấp | FR-TR-01, FR-BK-04 |
| BR-09 | Listing phải Ops/Developer duyệt trước public | FR-LS-01 |
| BR-10 | Buyer thấy trạng thái tin cậy (Verified) | FR-GR-05 |

### 15.4 Change Log sau sign-off

| Version | Ngày | Thay đổi | CR ID | Approved by |
|---------|------|----------|-------|-------------|
| 2.0 | 28/07/2026 | Baseline SRS v2.0 — sections 0–15 complete | — | Pending |

---

*Kết thúc tài liệu SRS v2.0 — WEREAL REOS*

**Baseline ID:** WEREAL-SRS-2026-v2.0

