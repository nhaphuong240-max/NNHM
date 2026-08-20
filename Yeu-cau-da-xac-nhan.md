# Yêu cầu đã được xác nhận — WEREAL REOS

> **Phiên bản:** 2.0 | **Ngày phát hành:** 28/07/2026  
> **Baseline ID:** WEREAL-BL-2026-002  
> **Trạng thái tổng thể:** 🟡 Chờ xác nhận stakeholder (Sign-off)  
> **Nguồn:** Phỏng vấn INT-01→INT-06 | Workshop kiến trúc v2.0 | SRS v2.0 | UC/US Catalog v2.0

---

## Mục lục

1. [Mục đích và phạm vi](#1-mục-đích-và-phạm-vi)
2. [Kiểm soát tài liệu v2.0](#2-kiểm-soát-tài-liệu-v20)
3. [Quy trình xác nhận yêu cầu](#3-quy-trình-xác-nhận-yêu-cầu)
4. [Business Requirements Register (BR-01→BR-25)](#4-business-requirements-register-br-01br-25)
5. [Functional Requirements Confirmation Register (82 FR)](#5-functional-requirements-confirmation-register-82-fr)
6. [Non-Functional Requirements Confirmation Register (52 NFR)](#6-non-functional-requirements-confirmation-register-52-nfr)
7. [Out-of-Scope đã xác nhận (15+ items)](#7-out-of-scope-đã-xác-nhận)
8. [Ràng buộc & Giả định (CON/ASM)](#8-ràng-buộc--giả-định-conasm)
9. [Use Case Confirmation Matrix (58 UC)](#9-use-case-confirmation-matrix-58-uc)
10. [User Story Confirmation — Phase 1 (68 US)](#10-user-story-confirmation--phase-1-68-us)
11. [Interview Sign-off (INT-01→INT-06)](#11-interview-sign-off-int-01int-06)
12. [MoSCoW Confirmation theo Stakeholder Group](#12-moscow-confirmation-theo-stakeholder-group)
13. [Acceptance Criteria Acknowledgment](#13-acceptance-criteria-acknowledgment)
14. [Change Request Register](#14-change-request-register)
15. [Deviation Log](#15-deviation-log)
16. [Sign-off & Baseline Lock](#16-sign-off--baseline-lock)
17. [Traceability Summary](#17-traceability-summary)
18. [Phụ lục](#18-phụ-lục)

---

## 1. Mục đích và phạm vi

Tài liệu này ghi nhận **toàn bộ yêu cầu đã được thống nhất và xác nhận** với stakeholder sau quá trình phỏng vấn (INT-01→INT-06), workshop kiến trúc v2.0 và review SRS v2.0. Đây là cơ sở **baseline chính thức** cho phát triển WEREAL REOS Phase 1 MVP và định hướng Phase 2–6.

**Phạm vi baseline WEREAL-BL-2026-002:**

| Hạng mục | Số lượng | Ghi chú |
|----------|----------|---------|
| Functional Requirements (FR) | 82 | Toàn bộ 6 phase — MoSCoW trong SRS §11 |
| Non-Functional Requirements (NFR) | 52 | Performance, Security, Compliance, Ops |
| Use Cases (UC) | 58 | Catalog v2.0 — 13 modules |
| User Stories Phase 1 (US) | 68 | Sprint S0–S10, ~280 SP |
| User Stories toàn dự án | 132 | Phase 1: 68; Phase 2: 44; Phase 3–6: 20 |
| Business Rules (BR) | 25 | Quy tắc nghiệp vụ cốt lõi |
| Out-of-Scope items | 18 | Đã thống nhất với stakeholder |
| Constraints (CON) | 17 | Ràng buộc dự án |
| Assumptions (ASM) | 17 | Giả định cần validate |
| UAT Scenarios | 15 | Tham chiếu Tieu-chi-chap-nhan.md |
| Open Issues (OI) | 20 | Chưa resolve — Appendix C |

Mọi thay đổi sau **baseline lock** phải qua **Change Request (CR)** theo Section 14.

---
## 2. Kiểm soát tài liệu v2.0

### 2.1 Thông tin phiên bản

| Thuộc tính | Giá trị |
|------------|---------|
| **Tên tài liệu** | Yêu cầu đã được xác nhận (Confirmed Requirements) |
| **Mã tài liệu** | WEREAL-CRQ-002 |
| **Phiên bản** | 2.0 |
| **Baseline ID** | **WEREAL-BL-2026-002** |
| **Trạng thái** | Draft — Chờ Sign-off Stakeholder |
| **Phân loại** | Confidential — Nội bộ dự án |
| **Ngôn ngữ** | Tiếng Việt (thuật ngữ kỹ thuật EN giữ nguyên) |
| **Target go-live Phase 1** | 31/12/2026 |
| **Next review gate** | Phase 1 Gate — 15/12/2026 |

### 2.2 Tác giả và phê duyệt

| Vai trò | Họ tên | Chức danh | Email | Trạng thái |
|---------|--------|-----------|-------|------------|
| **Product Owner** | [TBD] | Head of Product | po@wereal.vn | ☐ Pending |
| **BA Lead** | [TBD] | Business Analyst Lead | ba@wereal.vn | ☐ Pending |
| **Tech Lead** | [TBD] | Principal Architect | arch@wereal.vn | ☐ Pending |
| **Developer Pilot Lead** | [TBD] | Developer Pilot Org | dev-pilot@wereal.vn | ☐ Pending |
| **Agency Pilot Lead** | [TBD] | Agency Pilot Org | agy-pilot@wereal.vn | ☐ Pending |
| **Platform Sponsor** | [TBD] | Steering Committee | sponsor@wereal.vn | ☐ Pending |
| **Legal/Compliance** | [TBD] | Legal Counsel | legal@wereal.vn | ☐ Pending |

### 2.3 Lịch sử sửa đổi

| Version | Ngày | Mô tả thay đổi | Author | Baseline | Reviewer |
|---------|------|----------------|--------|----------|----------|
| 0.1 | 15/07/2026 | Draft nội bộ từ workshop kiến trúc | BA Team | — | PO |
| 1.0 | 28/07/2026 | Register Phase 1 MVP — 45 FR Must, 68 US, BR-01→10 | BA Team | WEREAL-BL-2026-001 (draft) | Tech Lead |
| **2.0** | **28/07/2026** | **Mở rộng toàn diện: 82 FR, 52 NFR, 58 UC, 132 US, BR-25, RACI workflow, INT sign-off, UAT-15, OI-20, deviation log** | **BA Team** | **WEREAL-BL-2026-002** | **Steering Committee** |

### 2.4 Liên kết tài liệu tham chiếu

| ID | Tài liệu | File | Version |
|----|----------|------|---------|
| REF-01 | SRS — Tài liệu Yêu cầu Phần mềm | `Tai-lieu-yeu-cau-phan-mem.md` | 2.0 |
| REF-02 | Use Case & User Story Catalog | `Danh-sach-use-case-user-story.md` | 2.0 |
| REF-03 | Tiêu chí chấp nhận | `Tieu-chi-chap-nhan.md` | 1.0 |
| REF-04 | Phạm vi công việc | `Pham-vi-cong-viec.md` | 2.0 |
| REF-05 | Kế hoạch dự án | `Ke-hoach-du-an.md` | 2.0 |
| REF-06 | Timeline sơ bộ | `Timeline-so-bo.md` | 2.0 |
| REF-07 | Danh sách rủi ro | `Danh-sach-rui-ro.md` | 2.0 |
| REF-08 | WEREAL Architecture | Architecture v2.0 (Confluence) | 2.0 |
| REF-09 | Tài liệu này | `Yeu-cau-da-xac-nhan.md` | 2.0 |

---
## 3. Quy trình xác nhận yêu cầu

### 3.1 Luồng quy trình tổng thể

```
Phỏng vấn (INT-01→06) → Ghi nhận Pain Points → Draft SRS v2.0
       → Review PO + Tech Lead + Pilot tenants
       → Walkthrough UC/US catalog v2.0
       → Walkthrough UAT scenarios (UAT-01→15)
       → MoSCoW confirmation theo stakeholder group
       → Sign-off (tài liệu này) → Baseline WEREAL-BL-2026-002 locked
       → Sprint 0 start (14/08/2026)
```

### 3.2 Ma trận RACI — Quy trình xác nhận

| Bước | Hoạt động | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed) |
|------|-----------|-----------------|-----------------|---------------|--------------|
| 1 | Chuẩn bị draft SRS v2.0 từ phỏng vấn | BA Lead | PO | Tech Lead | Steering |
| 2 | Review FR/NFR completeness | Tech Lead | PO | BA, AI Lead | Dev Team |
| 3 | Walkthrough Developer Pilot | BA Lead | Developer Pilot Lead | PO, Tech Lead | Agency Pilot |
| 4 | Walkthrough Agency Pilot | BA Lead | Agency Pilot Lead | PO, Tech Lead | Developer Pilot |
| 5 | Legal review BR-01→25, NFR-C | Legal | PO | BA | All stakeholders |
| 6 | MoSCoW confirmation Phase 1 | PO | Steering Committee | Pilot leads | Dev Team |
| 7 | UAT scenario acknowledgment | QA Lead | PO | Pilot tenants | Ops |
| 8 | Sign-off baseline document | All approvers | PO | Tech Lead | Steering |
| 9 | Baseline lock & CR process activate | PM | PO | BA, Tech Lead | All |
| 10 | Sprint 0 kickoff | PM | PO | Tech Lead | Dev Team |

### 3.3 Timeline xác nhận (T8/2026)

| Bước | Hoạt động | Người thực hiện | Deadline | Trạng thái |
|------|-----------|-----------------|----------|------------|
| 1 | Phát hành SRS v2.0 + UC/US v2.0 nội bộ | BA Team | 28/07/2026 | ✅ Done |
| 2 | Review SRS v2.0 — PO, Tech Lead, BA | PO, Tech Lead | 04/08/2026 | 🟡 Pending |
| 3 | Walkthrough Developer Pilot (Golden Record, Payment) | PO, Dev Pilot Lead | 06/08/2026 | 🟡 Pending |
| 4 | Walkthrough Agency Pilot (CRM, AI, Booking) | PO, Agency Pilot Lead | 06/08/2026 | 🟡 Pending |
| 5 | Legal review BR + Compliance NFR | Legal Counsel | 07/08/2026 | 🟡 Pending |
| 6 | Xác nhận MoSCoW Phase 1 | Steering Committee | 08/08/2026 | 🟡 Pending |
| 7 | UAT scenario walkthrough (UAT-01→15) | QA + Pilot | 09/08/2026 | 🟡 Pending |
| 8 | Sign-off chính thức baseline v2.0 | All approvers | 11/08/2026 | 🟡 Pending |
| 9 | Baseline lock WEREAL-BL-2026-002 | PM | 14/08/2026 | 🟡 Pending |
| 10 | Sprint 0 start | PM, Tech Lead | 14/08/2026 | 🟡 Pending |

### 3.4 Quy tắc xác nhận (Confirmation Rules)

| Quy tắc | Mô tả |
|---------|-------|
| **CR-CONF-01** | Mỗi FR/NFR/UC/US phải có trạng thái Confirm: Y (Yes), N (No), hoặc Pending |
| **CR-CONF-02** | FR Phase 1 Must (M) phải Confirm = Y trước baseline lock |
| **CR-CONF-03** | FR Phase 2+ có thể Confirm = Pending với direction approved |
| **CR-CONF-04** | Thay đổi sau sign-off chỉ qua CR — cập nhật 4 tài liệu BA |
| **CR-CONF-05** | Open Issue (OI) không block baseline nếu có owner + target date |
| **CR-CONF-06** | Deviation (DEV) ghi nhận thay đổi so với SRS draft — cần PO approve |

### 3.5 Mẫu biên bản họp xác nhận (Meeting Minutes Template)

```markdown
# Biên bản xác nhận yêu cầu WEREAL — [MM/DD/YYYY]

**Baseline:** WEREAL-BL-2026-002 | **Phiên bản tài liệu:** CRQ v2.0

## 1. Thông tin buổi họp
| Mục | Nội dung |
|-----|----------|
| **Chủ đề** | [VD: Walkthrough FR Golden Record + Booking] |
| **Ngày/giờ** | [DD/MM/YYYY HH:MM–HH:MM ICT] |
| **Địa điểm / Link** | [Phòng họp / Google Meet URL] |
| **Chủ trì** | [PO / BA Lead] |
| **Thư ký** | [BA / PM] |

## 2. Thành phần tham dự
| STT | Họ tên | Vai trò | Tổ chức | Chữ ký |
|-----|--------|---------|----------|---------|
| 1 | | Product Owner | WEREAL | ☐ |
| 2 | | Developer Pilot Lead | [Org name] | ☐ |
| 3 | | Agency Pilot Lead | [Org name] | ☐ |
| 4 | | Tech Lead | WEREAL | ☐ |
| 5 | | BA Lead | WEREAL | ☐ |

## 3. Nội dung review
| ID reviewed | Loại | Kết quả | Ghi chú |
|-------------|------|---------|---------|
| FR-GR-01→08 | FR | ☐ Confirm ☐ Defer ☐ Reject | |
| BR-01→10 | BR | ☐ Confirm ☐ Defer ☐ Reject | |
| UC-GR-01→07 | UC | ☐ Confirm ☐ Defer ☐ Reject | |

## 4. Quyết định chính (Key Decisions)
| # | Quyết định | Người quyết | FR/BR liên quan |
|---|------------|-------------|-----------------|
| KD-01 | | | |
| KD-02 | | | |

## 5. Câu hỏi mở (Open Questions)
| # | Câu hỏi | Owner | Target date | OI ID |
|---|---------|-------|-------------|-------|
| OQ-01 | | | | OI-XX |

## 6. Action Items
| # | Action | Owner | Due date | Status |
|---|--------|-------|----------|--------|
| AI-01 | | | | Open |

## 7. Phê duyệt biên bản
| Vai trò | Họ tên | Ngày | Chữ ký |
|---------|--------|------|---------|
| Chủ trì | | | ☐ |
| Developer Pilot | | | ☐ |
| Agency Pilot | | | ☐ |
```

---
## 4. Business Requirements Register (BR-01→BR-25)

### 4.1 Register đầy đủ

| ID | Yêu cầu nghiệp vụ | Nguồn phỏng vấn | Stakeholder Owner | Confirm Status | Ngày xác nhận | Ghi chú / FR liên kết |
|----|-------------------|-----------------|-------------------|----------------|---------------|------------------------|
| BR-01 | Golden Record do Developer quản lý — Agency không sửa giá gốc | DEV-I01, AGY-I01 | Developer Pilot Lead | 🟡 Pending |  | FR-GR-01,03,04; CON-09 |
| BR-02 | Mọi giao dịch giữ chỗ/cọc phải qua platform — không giữ miệng | DEV-I03, AGY-I05, PLT-I01 | Platform Sponsor | 🟡 Pending |  | FR-BK-01, FR-PAY-05 |
| BR-03 | Hệ thống phải chống double booking tuyệt đối | DEV-I03, BUY-I01, AGT-I05 | Developer Pilot Lead | 🟡 Pending |  | FR-BK-02, NFR-P08 |
| BR-04 | Đối soát thanh toán tự động hàng ngày — không Excel | DEV-I04, PLT-I01 | Platform Finance | 🟡 Pending |  | FR-PAY-03,04 |
| BR-05 | Lead Facebook/Zalo phải vào CRM tự động (Phase 2) | AGY-I02 | Agency Pilot Lead | 🟡 Pending (P2) |  | FR-CRM-06,07 |
| BR-06 | AI hỗ trợ viết tin — agent phải duyệt trước publish | AGY-I03, OPS-I01 | Agency Pilot Lead | 🟡 Pending |  | FR-AI-01,04; EX-07 |
| BR-07 | Lead scoring ưu tiên lead nóng trên dashboard | AGY-I04 | Agency Pilot Lead | 🟡 Pending |  | FR-AI-02, FR-CRM-03 |
| BR-08 | Audit trail đầy đủ khi tranh chấp giá/giữ chỗ | OPS-I02, OPS-I03 | Ops Admin | 🟡 Pending |  | FR-TR-01, FR-BK-04 |
| BR-09 | Listing phải Ops/Developer duyệt trước public | OPS-I01 | Ops Admin | 🟡 Pending |  | FR-LS-01 |
| BR-10 | Buyer phải thấy trạng thái tin cậy (Verified badge) | BUY-I04 | Product Owner | 🟡 Pending |  | FR-GR-05 |
| BR-11 | GMV đi qua platform là north star — không đếm listing | PLT-I01 | Platform Sponsor | 🟡 Pending |  | FR-AN-02, FR-PAY-03 |
| BR-12 | Agent adoption: workflow platform phải nhanh hơn Zalo | PLT-I02, ASM-04 | Agency Pilot Lead | 🟡 Pending |  | FR-BK-01, FR-UX-02 |
| BR-13 | Commission policy snapshot tại thời điểm chốt deal (Phase 2) | AGY-I06 | Developer Pilot Lead | 🟡 Pending (P2) |  | FR-COM-02 |
| BR-14 | Payment action yêu cầu MFA/OTP | CON-10 | Platform Admin | 🟡 Pending |  | FR-ID-04, NFR-S05 |
| BR-15 | Lead form bắt buộc consent PDPA/GDPR-ready | NFR-C03 | Legal/Compliance | 🟡 Pending |  | FR-CRM-01 |
| BR-16 | Mọi AI output phải có disclaimer pháp lý | NFR-C04 | Legal/Compliance | 🟡 Pending |  | FR-AI-01,04 |
| BR-17 | Booking có expiry — auto release lock khi hết hạn | DEV-I03 | Developer Pilot Lead | 🟡 Pending |  | FR-BK-01 |
| BR-18 | Ledger double-entry — mọi payment có debit/credit cân bằng | DEV-I04 | Platform Finance | 🟡 Pending |  | FR-PAY-03 |
| BR-19 | Distribution policy: Developer kiểm soát quyền bán Agency (P2) | DEV-I05 | Developer Pilot Lead | 🟡 Pending (P2) |  | FR-MKT-01,02 |
| BR-20 | Search index sync từ Golden Record ≤ 5s lag | BUY-I01 | Tech Lead | 🟡 Pending |  | FR-LS-06, NFR-P04 |
| BR-21 | Webhook payment idempotent — duplicate không tạo ledger trùng | DEV-I04 | Platform Finance | 🟡 Pending |  | FR-PAY-04 |
| BR-22 | Cancel booking → refund → ledger reversal → unit available | AGY-I05 | Agency Pilot Lead | 🟡 Pending |  | FR-BK-07 |
| BR-23 | KYC/KYB bắt buộc trước commission payout (Phase 2) | NFR-C01 | Legal/Compliance | 🟡 Pending (P2) |  | FR-ID-05 |
| BR-24 | Event store retention ≥ 5 năm cho audit pháp lý | CON-08, OPS-I03 | Ops Admin | 🟡 Pending |  | FR-BK-04, NFR-S03 |
| BR-25 | Pilot tenant commit UAT trước go-live | ASM-01, CON-13 | Platform Sponsor | 🟡 Pending |  | UAT-01→15 |

### 4.2 Tóm tắt trạng thái BR

| Trạng thái | Số lượng | % |
|------------|----------|---|
| 🟡 Pending | 25 | 100% |
| ✅ Confirmed (Y) | 0 | 0% |
| ❌ Rejected (N) | 0 | 0% |
| 🟠 Deferred (P2+) | 4 | 16% |

---
## 5. Functional Requirements Confirmation Register (82 FR)

### 5.1 Register đầy đủ — tất cả 82 FR

| ID | Tên | Phase | Priority | Confirm | Confirmed by | Date | Change notes |
|----|-----|-------|----------|---------|--------------|------|--------------|
| FR-GR-01 | Quản lý Golden Record (Unit gốc) | P1 | M | Pending |  |  |  |
| FR-GR-02 | Versioning giá, tồn kho, policy | P1 | M | Pending |  |  |  |
| FR-GR-03 | Listing marketing từ unit gốc | P1 | M | Pending |  |  |  |
| FR-GR-04 | Anti-drift auto-block/flag | P1 | M | Pending |  |  |  |
| FR-GR-05 | Verified Listing badge | P1 | S | Pending |  |  |  |
| FR-GR-06 | Time-travel query | P2 | W/S | Pending |  |  | Phase 2 Should |
| FR-GR-07 | Bulk import Excel/CSV | P2 | W/S | Pending |  |  | Phase 2 Should |
| FR-GR-08 | Real-time push trạng thái unit | P1 | M | Pending |  |  |  |
| FR-ID-01 | Multi-tenant hierarchy | P1 | M | Pending |  |  |  |
| FR-ID-02 | RBAC và ABAC | P1 | M | Pending |  |  |  |
| FR-ID-03 | Tenant isolation RLS | P1 | M | Pending |  |  |  |
| FR-ID-04 | MFA/OTP nhạy cảm | P1 | M | Pending |  |  |  |
| FR-ID-05 | KYC/KYB | P2 | W/S | Pending |  |  | Phase 2 |
| FR-ID-06 | SSO Enterprise | P4 | W/C | Pending |  |  | Phase 4 Could |
| FR-LS-01 | CRUD listing + approval | P1 | M | Pending |  |  |  |
| FR-LS-02 | Full-text + facet + geo search | P1 | M | Pending |  |  |  |
| FR-LS-03 | Media upload listing | P1 | M | Pending |  |  |  |
| FR-LS-04 | So sánh sản phẩm | P1 | S | Pending |  |  |  |
| FR-LS-05 | Duplicate listing detection | P2 | W/S | Pending |  |  | Phase 2 |
| FR-LS-06 | Search sync CDC | P1 | M | Pending |  |  |  |
| FR-CRM-01 | Lead capture đa nguồn | P1 | M | Pending |  |  |  |
| FR-CRM-02 | Lead gắn entity | P1 | M | Pending |  |  |  |
| FR-CRM-03 | Lead routing | P1 | M | Pending |  |  |  |
| FR-CRM-04 | CRM activities timeline | P1 | M | Pending |  |  |  |
| FR-CRM-05 | Pipeline + state machine | P1 | M | Pending |  |  |  |
| FR-CRM-06 | Zalo OA/ZNS integration | P2 | M | Pending |  |  | Direction approved P2 |
| FR-CRM-07 | Meta Lead Ads sync | P2 | M | Pending |  |  | Direction approved P2 |
| FR-CRM-08 | SLA reminder escalation | P2 | W/S | Pending |  |  | Phase 2 |
| FR-CRM-09 | Omnichannel unified inbox | P3 | C | Pending |  |  | Phase 3 Could |
| FR-BK-01 | Reservation với expiry | P1 | M | Pending |  |  |  |
| FR-BK-02 | Atomic inventory lock | P1 | M | Pending |  |  |  |
| FR-BK-03 | Transaction state machine 15 states | P1 | M | Pending |  |  |  |
| FR-BK-04 | Domain events event store | P1 | M | Pending |  |  |  |
| FR-BK-05 | Contract template merge | P2 | W/S | Pending |  |  | Phase 2 |
| FR-BK-06 | E-sign integration | P2 | W/S | Pending |  |  | Phase 2 |
| FR-BK-07 | Cancel/refund workflow | P1 | M | Pending |  |  |  |
| FR-BK-08 | Custom workflow per tenant | P4 | C | Pending |  |  | Phase 4 |
| FR-PAY-01 | Payment orchestration | P1 | M | Pending |  |  |  |
| FR-PAY-02 | PaymentIntent Invoice Receipt Refund | P1 | M | Pending |  |  |  |
| FR-PAY-03 | Double-entry ledger | P1 | M | Pending |  |  |  |
| FR-PAY-04 | Webhook idempotent reconciliation | P1 | M | Pending |  |  |  |
| FR-PAY-05 | Deposit payment gắn booking | P1 | M | Pending |  |  |  |
| FR-PAY-06 | Multi-gateway routing fallback | P3 | S | Pending |  |  | Phase 3 |
| FR-PAY-07 | Commission settlement batch payout | P2 | M | Pending |  |  | Phase 2 Must |
| FR-PAY-08 | Smart Escrow conditional release | P5 | C | Pending |  |  | Phase 5 |
| FR-PAY-09 | BNPL trả góp đợt | P5 | C | Pending |  |  | Phase 5 |
| FR-PAY-10 | Mortgage pre-qualification | P5 | C | Pending |  |  | Phase 5 |
| FR-COM-01 | Commission policy per project | P2 | M | Pending |  |  | Phase 2 Must |
| FR-COM-02 | Policy snapshot at deal close | P2 | M | Pending |  |  | Phase 2 Must |
| FR-COM-03 | Split commission multi agent | P2 | W/S | Pending |  |  | Phase 2 |
| FR-COM-04 | Holdback khi tranh chấp | P2 | W/S | Pending |  |  | Phase 2 |
| FR-COM-05 | Export kế toán CSV/Excel | P2 | M | Pending |  |  | Phase 2 Must |
| FR-AI-01 | Content copilot listing | P1 | M | Pending |  |  |  |
| FR-AI-02 | Lead scoring tự động | P1 | M | Pending |  |  |  |
| FR-AI-03 | Guardrails no mutate | P1 | M | Pending |  |  |  |
| FR-AI-04 | Human approval AI content | P1 | M | Pending |  |  |  |
| FR-AI-05 | RAG knowledge assistant | P2 | W/S | Pending |  |  | Phase 2 |
| FR-AI-06 | Buyer-product matching | P2 | S | Pending |  |  | Phase 2 |
| FR-AI-07 | Sales Agent draft reply | P3 | S | Pending |  |  | Phase 3 |
| FR-AI-08 | Ops Compliance Agent anomaly | P3 | S | Pending |  |  | Phase 3 |
| FR-AI-09 | Buyer conversational discovery | P3 | C | Pending |  |  | Phase 3 |
| FR-AI-10 | Pricing intelligence fraud detection | P3 | S | Pending |  |  | Phase 3 |
| FR-TR-01 | Audit trail toàn hệ thống | P1 | M | Pending |  |  |  |
| FR-TR-02 | Document vault watermark | P2 | S | Pending |  |  | Phase 2 |
| FR-TR-03 | Dispute Resolution Center | P3 | S | Pending |  |  | Phase 3 |
| FR-TR-04 | Regulatory Export Pack | P4 | C | Pending |  |  | Phase 4 |
| FR-TR-05 | AI action log | P1 | M | Pending |  |  |  |
| FR-AN-01 | KPI dashboard funnel lead booking | P1 | M | Pending |  |  |  |
| FR-AN-02 | GMV dashboard | P2 | M | Pending |  |  | Phase 2 Must |
| FR-AN-03 | Inventory absorption report | P2 | W/S | Pending |  |  | Phase 2 |
| FR-AN-04 | Campaign attribution | P3 | S | Pending |  |  | Phase 3 |
| FR-AN-05 | Absorption forecast 30/60/90 | P3 | C | Pending |  |  | Phase 3 |
| FR-MKT-01 | Distribution policy publish | P2 | W/S | Pending |  |  | Phase 2 |
| FR-MKT-02 | Agency apply approve quyền bán | P2 | W/S | Pending |  |  | Phase 2 |
| FR-MKT-03 | Marketplace leaderboard compliance | P3 | W/C | Pending |  |  | Phase 3 |
| FR-UX-01 | Public Portal | P1 | M | Pending |  |  |  |
| FR-UX-02 | Agent Portal | P1 | M | Pending |  |  |  |
| FR-UX-03 | Admin Portal | P1 | M | Pending |  |  |  |
| FR-UX-04 | Developer Portal | P2 | M | Pending |  |  | Phase 2 Must |
| FR-UX-05 | Mobile App sale | P2 | W/S | Pending |  |  | Phase 2 |
| FR-UX-06 | Buyer App native | P3 | C | Pending |  |  | Phase 3 |
| FR-UX-07 | White-label portal | P4 | C | Pending |  |  | Phase 4 |

### 5.2 Tóm tắt FR theo Phase

| Phase | Tổng FR | Must (M) | Should (S) | Could/Won't | Confirm Y | Pending |
|-------|---------|----------|------------|-------------|-----------|---------|
| Phase 1 | 40 | 38 | 2 | 0 | 0 | 40 |
| Phase 2 | 24 | — | — | — | 0 | 24 |
| Phase 3 | 11 | — | — | — | 0 | 11 |
| Phase 4 | 4 | — | — | — | 0 | 4 |
| Phase 5 | 3 | — | — | — | 0 | 3 |
| **Tổng** | **82** | — | — | — | **0** | **82** |

### 5.3 FR theo Module

| Module | FR IDs | Count | Phase 1 Must | Confirm |
|--------|--------|-------|--------------|---------|
| GR — Golden Record | FR-GR-01→08 | 8 | 6 Must, 1 Should | Pending |
| ID — Identity | FR-ID-01→06 | 6 | 4 Must | Pending |
| LS — Listing/Search | FR-LS-01→06 | 6 | 5 Must, 1 Should | Pending |
| CRM | FR-CRM-01→09 | 9 | 5 Must | Pending |
| BK — Booking | FR-BK-01→08 | 8 | 5 Must | Pending |
| PAY — Payment | FR-PAY-01→10 | 10 | 5 Must | Pending |
| COM — Commission | FR-COM-01→05 | 5 | 0 (P2) | Pending |
| AI | FR-AI-01→10 | 10 | 4 Must | Pending |
| TR — Trust | FR-TR-01→05 | 5 | 2 Must | Pending |
| AN — Analytics | FR-AN-01→05 | 5 | 1 Must | Pending |
| MKT — Marketplace | FR-MKT-01→03 | 3 | 0 (P2+) | Pending |
| UX — Experience | FR-UX-01→07 | 7 | 3 Must | Pending |

---
## 6. Non-Functional Requirements Confirmation Register (52 NFR)

### 6.1 Register đầy đủ — tất cả 52 NFR

| ID | Category | Tên | Target/Metric | Phase | Confirm | Confirmed by | Date | Change notes |
|----|----------|-----|---------------|-------|---------|--------------|------|--------------|
| NFR-P01 | Performance | API read latency P95 | ≤ 500ms @ 100 concurrent | P1 | Pending |  |  |  |
| NFR-P02 | Performance | API write latency P95 | ≤ 800ms @ 50 concurrent | P1 | Pending |  |  |  |
| NFR-P03 | Performance | Search latency P95 | ≤ 200ms @ 10K documents | P1 | Pending |  |  |  |
| NFR-P04 | Performance | Inventory sync lag (GR→Search/SSE) | ≤ 5 giây | P1 | Pending |  |  |  |
| NFR-P05 | Performance | AI copilot response time P95 | ≤ 8 giây | P1 | Pending |  |  |  |
| NFR-P06 | Performance | Lead scoring latency | ≤ 3 giây sau LeadCaptured | P1 | Pending |  |  |  |
| NFR-P07 | Performance | Payment webhook processing | ≤ 2 giây end-to-end | P1 | Pending |  |  |  |
| NFR-P08 | Performance | Zero double booking | 0/1000 concurrent lock attempts | P1 | Pending |  |  | Go-live gate bắt buộc |
| NFR-S01 | Security | Encryption at rest | AES-256 DB + S3 | P1 | Pending |  |  |  |
| NFR-S02 | Security | Tenant isolation | 0 cross-tenant access | P1 | Pending |  |  |  |
| NFR-S03 | Security | Audit trail immutability | No UPDATE/DELETE on audit store | P1 | Pending |  |  |  |
| NFR-S04 | Security | OWASP Top 10 | Zero Critical/High at gate | P1 | Pending |  |  |  |
| NFR-S05 | Security | MFA sensitive actions | 100% payment/e-sign/admin | P1 | Pending |  |  |  |
| NFR-S06 | Security | PII encryption in transit | TLS 1.2+ mọi endpoint | P1 | Pending |  |  |  |
| NFR-S07 | Security | Secrets management | No secrets in code/logs | P1 | Pending |  |  |  |
| NFR-S08 | Security | Rate limiting API | 429 sau threshold tenant | P1–2 | Pending |  |  |  |
| NFR-S09 | Security | Session timeout | ≤ 8h idle; refresh token rotation | P1 | Pending |  |  |  |
| NFR-S10 | Security | Document vault access control | Expiring signed URL; download log | P2 | Pending |  |  | Phase 2 |
| NFR-SC01 | Scalability | Concurrent users Phase 1 | 500 concurrent without degrade | P1 | Pending |  |  |  |
| NFR-SC02 | Scalability | Concurrent users Phase 3 | 5,000 concurrent | P3 | Pending |  |  | Phase 3 |
| NFR-SC03 | Scalability | Golden Record units/tenant | ≥ 50,000 units | P2 | Pending |  |  | Phase 2 |
| NFR-SC04 | Scalability | Event store throughput | ≥ 500 events/s per tenant | P2 | Pending |  |  | Phase 2 |
| NFR-SC05 | Scalability | Search index size | ≥ 1M documents cluster | P3 | Pending |  |  | Phase 3 |
| NFR-SC06 | Scalability | Multi-region read replica | Read latency < 100ms regional | P4 | Pending |  |  | Phase 4 |
| NFR-A01 | Availability | Uptime SLA production | ≥ 99.5% monthly | P1 | Pending |  |  |  |
| NFR-A02 | Availability | RPO (Recovery Point Objective) | ≤ 24 giờ | P1 | Pending |  |  |  |
| NFR-A03 | Availability | RTO (Recovery Time Objective) | ≤ 4 giờ | P1 | Pending |  |  |  |
| NFR-A04 | Availability | Payment gateway failover | ≤ 30s switch fallback gateway | P3 | Pending |  |  | Phase 3 |
| NFR-A05 | Availability | Planned maintenance window | ≤ 4h/tháng; notify 72h trước | P1 | Pending |  |  |  |
| NFR-U01 | Usability | UI ngôn ngữ | 100% UI tiếng Việt Phase 1 | P1 | Pending |  |  |  |
| NFR-U02 | Usability | Agent tạo listing | ≤ 5 phút median (with AI copilot) | P1 | Pending |  |  |  |
| NFR-U03 | Usability | Buyer lead submission | ≤ 3 click từ search | P1 | Pending |  |  |  |
| NFR-U04 | Usability | Mobile responsive | Functional trên viewport ≥ 320px | P1 | Pending |  |  |  |
| NFR-U05 | Usability | Accessibility WCAG | Level AA cho public portal | P2 | Pending |  |  | Phase 2 |
| NFR-C01 | Compliance | KYC/KYB trước payout | 100% payout blocked nếu chưa KYC | P2 | Pending |  |  | Phase 2 |
| NFR-C02 | Compliance | Quảng cáo BĐS VN | Listing pass compliance check | P1–3 | Pending |  |  |  |
| NFR-C03 | Compliance | Consent PDPA/GDPR-ready | Lead form consent checkbox bắt buộc | P1 | Pending |  |  |  |
| NFR-C04 | Compliance | AI disclaimer | Mọi AI output có disclaimer pháp lý | P1 | Pending |  |  |  |
| NFR-C05 | Compliance | Data retention policy | Tuân thủ retention matrix SRS §9 | P1 | Pending |  |  |  |
| NFR-O01 | Operability | Structured logging | 100% services JSON log + trace_id | P1 | Pending |  |  |  |
| NFR-O02 | Operability | Alert response P0 | On-call acknowledge ≤ 15 phút | P1 | Pending |  |  |  |
| NFR-O03 | Operability | Daily reconciliation report | Auto-generated 06:00 ICT | P1 | Pending |  |  |  |
| NFR-O04 | Operability | Feature flag rollout | Toggle without deploy | P1 | Pending |  |  |  |
| NFR-O05 | Operability | Runbook coverage | Runbook cho top 10 incident types | P1 | Pending |  |  |  |
| NFR-M01 | Maintainability | Code coverage backend | ≥ 70% line coverage critical modules | P1 | Pending |  |  |  |
| NFR-M02 | Maintainability | API documentation | OpenAPI spec 100% public endpoints | P1 | Pending |  |  |  |
| NFR-M03 | Maintainability | ADR for architecture decisions | ADR cho mọi quyết định cross-cutting | P1 | Pending |  |  |  |
| NFR-M04 | Maintainability | Dependency update cadence | Critical CVE patch ≤ 7 ngày | P1 | Pending |  |  |  |
| NFR-CM01 | Compatibility | Browser support | Chrome/Firefox/Safari/Edge 2 versions | P1 | Pending |  |  |  |
| NFR-CM02 | Compatibility | Mobile OS | iOS 15+, Android 10+ (P2 app) | P2 | Pending |  |  | Phase 2 |
| NFR-CM03 | Compatibility | Payment gateway API | Adapter tách biệt; swap gateway ≤ 2 sprint | P1 | Pending |  |  |  |
| NFR-CM04 | Compatibility | Zalo/Meta API version | Support current + previous API version | P2 | Pending |  |  | Phase 2 |

### 6.2 Tóm tắt NFR theo Category

| Category | Count | Phase 1 | Confirm Y | Pending |
|----------|-------|---------|-----------|---------|
| Performance (P) | 8 | 8 | 0 | 8 |
| Security (S) | 10 | 9 | 0 | 10 |
| Scalability (SC) | 6 | 1 | 0 | 6 |
| Availability (A) | 5 | 4 | 0 | 5 |
| Usability (U) | 5 | 4 | 0 | 5 |
| Compliance (C) | 5 | 4 | 0 | 5 |
| Operability (O) | 5 | 5 | 0 | 5 |
| Maintainability (M) | 4 | 4 | 0 | 4 |
| Compatibility (CM) | 4 | 2 | 0 | 4 |
| **Tổng** | **52** | **41** | **0** | **52** |

---
## 7. Out-of-Scope đã xác nhận

### 7.1 Danh sách Out-of-Scope (18 items)

Các hạng mục sau đã được **thống nhất loại trừ** khỏi baseline WEREAL-BL-2026-002. Mọi yêu cầu mới thuộc các hạng mục này phải qua CR với impact assessment đầy đủ.

| ID | Hạng mục loại trừ | Lý do xác nhận | Stakeholder Agreement | Confirm | FR/CON liên quan |
|----|-------------------|----------------|----------------------|---------|------------------|
| EX-01 | Tự xây payment gateway | Dùng VNPay/MoMo/partner — adapter pattern | Platform Sponsor | 🟡 Pending | CON-03 |
| EX-02 | Blockchain smart contract | Event store đủ audit — CON-16 | Tech Lead | 🟡 Pending | FR-BK-04 |
| EX-03 | Quản lý thi công/xây dựng | Ngoài REOS scope — Pham-vi §8 O4 | Product Owner | 🟡 Pending |  |
| EX-04 | Migration hệ thống legacy | Dự án riêng — không trong Phase 1–6 | Platform Sponsor | 🟡 Pending |  |
| EX-05 | Call center VoIP sâu | Phase 6+ nếu CR — Pham-vi O6 | Product Owner | 🟡 Pending |  |
| EX-06 | Microservices Phase 1 | Modular monolith trước — scale P2+ | Tech Lead | 🟡 Pending |  |
| EX-07 | AI auto-publish không duyệt | Vi phạm BR-06, legal risk | Legal/Compliance | 🟡 Pending | BR-06 |
| EX-08 | Embedded finance Phase 1 | Phase 5 — legal dependency CON-15 | Legal/Compliance | 🟡 Pending | FR-PAY-08 |
| EX-09 | Tự train foundation LLM | Dùng LLM provider — CON-07 | AI Lead | 🟡 Pending |  |
| EX-10 | ERP thay thế hoàn toàn | Chỉ export/sync — Pham-vi O3 | Platform Finance | 🟡 Pending | FR-COM-05 |
| EX-11 | Content/SEO agency services | Platform cung cấp tool, không làm agency | Product Owner | 🟡 Pending |  |
| EX-12 | Tư vấn pháp lý trực tiếp | Platform hỗ trợ workflow, không tư vấn | Legal/Compliance | 🟡 Pending |  |
| EX-13 | IoT smart building integration | Ngoài phạm vi — Pham-vi O10 | Tech Lead | 🟡 Pending |  |
| EX-14 | Mobile native app Phase 1 | PWA/responsive only — CON-14 | Product Owner | 🟡 Pending | FR-UX-05 P2 |
| EX-15 | Multi-gateway payment Phase 1 | 1 gateway P1 — FR-PAY-06 Phase 3 | Platform Finance | 🟡 Pending | CON-03 |
| EX-16 | Buyer App native Phase 1 | Phase 3 — FR-UX-06 | Product Owner | 🟡 Pending |  |
| EX-17 | White-label portal Phase 1 | Phase 4 — FR-UX-07 | Product Owner | 🟡 Pending |  |
| EX-18 | Marketplace full ranking Phase 1 | Phase 6 — UC-MKT-04 | Developer Pilot Lead | 🟡 Pending |  |

### 7.2 Cam kết stakeholder về Out-of-Scope

| Stakeholder Group | Người đại diện | Cam kết | Ngày | Chữ ký |
|-------------------|----------------|---------|------|--------|
| Developer Pilot | [TBD] | Không yêu cầu bulk import P1 — chấp nhận manual + API | | ☐ |
| Agency Pilot | [TBD] | Không yêu cầu Zalo/Meta sync P1 — chấp nhận form + CSV import | | ☐ |
| Platform Sponsor | [TBD] | Chấp nhận modular monolith P1, 1 payment gateway | | ☐ |
| Tech Lead | [TBD] | Không microservices, không self-host LLM P1–4 | | ☐ |
| Legal | [TBD] | AI human-in-the-loop bắt buộc — không auto-publish | | ☐ |

---
## 8. Ràng buộc & Giả định (CON/ASM)

### 8.1 Ràng buộc (Constraints) — 17 items

| ID | Loại | Nội dung | Owner Sign-off | Confirm | Ghi chú |
|----|------|----------|----------------|---------|---------|
| CON-01 | Thời gian | Go-live MVP Phase 1: 31/12/2026 | PM | 🟡 Pending | Scope P1 phải fit 5 tháng dev |
| CON-02 | Nguồn lực | Team Phase 1: 8–10 FTE (BE/FE/QA/DevOps/BA) | PM | 🟡 Pending | Parallel workstream giới hạn |
| CON-03 | Kỹ thuật | 1 payment gateway Phase 1 | Tech Lead | 🟡 Pending | Adapter pattern bắt buộc |
| CON-04 | Kỹ thuật | PostgreSQL primary DB; OpenSearch search | Tech Lead | 🟡 Pending | Stack lock Phase 1 |
| CON-05 | Pháp lý | Tuân thủ quy định quảng cáo BĐS Việt Nam | Legal | 🟡 Pending | Compliance check listing |
| CON-06 | Ngân sách | AI cost cap Phase 1: [TBD] USD/tháng/tenant | PO | 🟡 Pending | Rate limit + quota — OI-01 |
| CON-07 | Kỹ thuật | Không self-host LLM foundation model P1–4 | AI Lead | 🟡 Pending | Dùng LLM provider API |
| CON-08 | Kỹ thuật | Event store retention ≥ 5 năm minimum | Tech Lead | 🟡 Pending | Storage planning |
| CON-09 | Nghiệp vụ | Golden Record do Developer sở hữu — Agency read-only giá | Developer Pilot Lead | 🟡 Pending | Anti-drift architecture |
| CON-10 | Bảo mật | MFA bắt buộc payment, e-sign, admin action | Platform Admin | 🟡 Pending | Auth UX trade-off |
| CON-11 | Hạ tầng | Cloud region: ap-southeast-1 (Singapore) Phase 1 | DevOps | 🟡 Pending | Latency VN ~30–50ms |
| CON-12 | Đối tác | Zalo/Meta API subject to partner policy change | Tech Lead | 🟡 Pending | Abstraction layer |
| CON-13 | Nghiệp vụ | Pilot: ≥ 1 Developer + 1 Agency trước UAT | Platform Sponsor | 🟡 Pending | Onboarding dependency |
| CON-14 | Kỹ thuật | Mobile native app không thuộc Phase 1 | PO | 🟡 Pending | PWA/responsive only P1 |
| CON-15 | Pháp lý | Embedded finance Phase 5 cần legal license review | Legal | 🟡 Pending | R-P11 blocker |
| CON-16 | Kỹ thuật | Không blockchain/smart contract v1 | Tech Lead | 🟡 Pending | Event store đủ audit |
| CON-17 | Ngân sách | Pen test third-party 1 lần/phase gate | Security | 🟡 Pending | Security budget |

### 8.2 Giả định (Assumptions) — 17 items

| ID | Nội dung | Owner Sign-off | Confirm | Risk liên kết |
|----|----------|----------------|---------|---------------|
| ASM-01 | ≥ 1 Developer + 1 Agency pilot commit UAT Phase 1 | Platform Sponsor | 🟡 Pending | R-O02 |
| ASM-02 | Payment gateway sandbox available trước 01/10/2026 | Platform Finance | 🟡 Pending | R-O05 |
| ASM-03 | Developer cung cấp bảng hàng chuẩn onboarding (Excel template) | Developer Pilot Lead | 🟡 Pending | R-B02 |
| ASM-04 | Agent chấp nhận workflow platform nếu nhanh hơn Zalo | Agency Pilot Lead | 🟡 Pending | R-B01 |
| ASM-05 | Zalo OA API credentials được cấp Phase 2 | Agency Pilot Lead | 🟡 Pending | R-O07 |
| ASM-06 | Meta Business API access approved Phase 2 | Agency Pilot Lead | 🟡 Pending | R-O07 |
| ASM-07 | LLM provider SLA ≥ 99% uptime | AI Lead | 🟡 Pending | R-A06 |
| ASM-08 | Pilot tenant có ≤ 5,000 units Phase 1 | Developer Pilot Lead | 🟡 Pending | NFR-SC03 |
| ASM-09 | Legal review BR-01→25 hoàn thành trước go-live P1 | Legal | 🟡 Pending | R-S02 |
| ASM-10 | E-sign provider contract ký Phase 2 | Platform Sponsor | 🟡 Pending | FR-BK-06 delay |
| ASM-11 | Ops team ≥ 2 FTE moderation Phase 1 | Ops Admin | 🟡 Pending | Listing approval SLA |
| ASM-12 | Internet banking webhook reliable ≥ 99% | Platform Finance | 🟡 Pending | R-P01 |
| ASM-13 | Buyer adoption online deposit ≥ 30% pilot deals | PO | 🟡 Pending | GMV target |
| ASM-14 | Steering Committee sign-off SRS v2.0 trong T8/2026 | Platform Sponsor | 🟡 Pending | Scope creep R-O01 |
| ASM-15 | Không thay đổi luật BĐS major trong Phase 1–2 | Legal | 🟡 Pending | R-S02 |
| ASM-16 | OpenSearch managed service đủ cho 10K docs Phase 1 | Tech Lead | 🟡 Pending | R-T03 |
| ASM-17 | Team có kinh nghiệm event sourcing hoặc training 2 tuần | Tech Lead | 🟡 Pending | R-T04 |

### 8.3 Ma trận phụ thuộc CON/ASM → FR

| CON/ASM | FR/NFR phụ thuộc | Impact nếu fail |
|---------|------------------|-----------------|
| ASM-01 | UAT-01→15, CON-13 | Delay go-live |
| ASM-02 | FR-PAY-01→05 | Mock payment fallback |
| ASM-03 | FR-GR-01, FR-GR-07 | Slow onboarding |
| CON-03 | FR-PAY-01, EX-15 | Single vendor lock |
| CON-09 | FR-GR-03,04, BR-01 | Architecture invalid |
| CON-10 | FR-ID-04, NFR-S05 | Security gate fail |

---
## 9. Use Case Confirmation Matrix (58 UC)

### 9.1 Register đầy đủ — tất cả 58 Use Cases

| ID | Tên Use Case | Actor chính | Phase | Priority | Confirm | Confirmed by | Date | Ghi chú |
|----|--------------|-------------|-------|----------|---------|--------------|------|---------|
| UC-GR-01 | Quản lý Golden Record (Unit gốc) | Developer Admin | 1 | M | Pending |  |  |  |
| UC-GR-02 | Tạo listing marketing từ unit gốc | Agent | 1 | M | Pending |  |  |  |
| UC-GR-03 | Kiểm tra anti-drift listing | System, Ops Admin | 1 | M | Pending |  |  |  |
| UC-GR-04 | Xem Product Graph & quan hệ unit | Developer Admin | 1 | M | Pending |  |  |  |
| UC-GR-05 | Xem lịch sử giá/tồn kho (time-travel) | Developer Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-GR-06 | Import bảng hàng bulk Excel/CSV | Developer Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-GR-07 | Real-time push trạng thái unit (SSE) | System, All portals | 1 | M | Pending |  |  |  |
| UC-ID-01 | Onboarding tenant Developer/Agency | Platform Admin | 1 | M | Pending |  |  |  |
| UC-ID-02 | Phân quyền user theo role/project | Agency Admin, Developer Admin | 1 | M | Pending |  |  |  |
| UC-ID-03 | Đăng nhập, refresh token & MFA | All users | 1 | M | Pending |  |  |  |
| UC-ID-04 | Quản lý user trong tenant | Agency Admin, Developer Admin | 1 | M | Pending |  |  |  |
| UC-ID-05 | KYC/KYB Agency và Developer | Platform Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-ID-06 | SSO Enterprise SAML/OIDC | Enterprise User | 4 | C | Pending |  |  | Phase 4 |
| UC-LS-01 | Tìm kiếm & lọc sản phẩm | Buyer, Guest | 1 | M | Pending |  |  |  |
| UC-LS-02 | Duyệt listing trước publish | Ops Admin | 1 | M | Pending |  |  |  |
| UC-LS-03 | So sánh sản phẩm (2–3 unit) | Buyer | 1 | S | Pending |  |  |  |
| UC-LS-04 | Upload media listing (ảnh/video) | Agent | 1 | M | Pending |  |  |  |
| UC-LS-05 | Xem trang chi tiết project/unit | Buyer, Guest | 1 | M | Pending |  |  |  |
| UC-LS-06 | Phát hiện listing trùng lặp | System, Ops Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-LS-07 | Đồng bộ search index từ Golden Record | System | 1 | M | Pending |  |  |  |
| UC-CRM-01 | Gửi yêu cầu tư vấn (lead form) | Buyer, Guest | 1 | M | Pending |  |  |  |
| UC-CRM-02 | Phân công lead cho agent (routing) | System, Agency Admin | 1 | M | Pending |  |  |  |
| UC-CRM-03 | Quản lý pipeline & CRM activities | Agent | 1 | M | Pending |  |  |  |
| UC-CRM-04 | Import lead thủ công (CSV/walk-in) | Agent, Agency Admin | 1 | S | Pending |  |  |  |
| UC-CRM-05 | Sync lead từ Zalo OA / Meta Lead Ads | System | 2 | M | Pending |  |  | Phase 2 |
| UC-CRM-06 | Nhắc SLA follow-up & escalation | System | 2 | S | Pending |  |  | Phase 2 |
| UC-CRM-07 | Unified inbox đa kênh | Agent | 3 | C | Pending |  |  | Phase 3 |
| UC-BK-01 | Tạo booking/giữ chỗ với expiry | Agent | 1 | M | Pending |  |  |  |
| UC-BK-02 | Theo dõi trạng thái giao dịch | Agent, Buyer, Developer Admin | 1 | M | Pending |  |  |  |
| UC-BK-03 | Xem domain event timeline giao dịch | Ops Admin, Agent | 1 | M | Pending |  |  |  |
| UC-BK-04 | Replay timeline giao dịch (dispute evidence) | Ops Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-BK-05 | Hủy booking & khởi tạo hoàn tiền | Agent, Ops Admin | 1 | M | Pending |  |  |  |
| UC-BK-06 | Tạo hợp đồng từ template | Agent, System | 2 | S | Pending |  |  | Phase 2 |
| UC-BK-07 | Ký hợp đồng điện tử | Buyer, Agent | 2 | S | Pending |  |  | Phase 2 |
| UC-BK-08 | Custom workflow giao dịch theo tenant | Platform Admin | 4 | C | Pending |  |  | Phase 4 |
| UC-PAY-01 | Tạo & thanh toán cọc online | Buyer | 1 | M | Pending |  |  |  |
| UC-PAY-02 | Đối soát thanh toán hàng ngày | Platform Admin, Finance Admin | 1 | M | Pending |  |  |  |
| UC-PAY-03 | Xử lý refund & ledger reversal | System, Finance Admin | 1 | M | Pending |  |  |  |
| UC-PAY-04 | Chi hoa hồng batch settlement | Finance Admin | 2 | M | Pending |  |  | Phase 2 |
| UC-PAY-05 | Multi-gateway routing & fallback | System | 3 | S | Pending |  |  | Phase 3 |
| UC-PAY-06 | Escrow thông minh conditional release | Buyer, Developer Admin | 5 | C | Pending |  |  | Phase 5 |
| UC-PAY-07 | BNPL / trả góp theo đợt | Buyer | 5 | C | Pending |  |  | Phase 5 |
| UC-COM-01 | Cấu hình commission policy theo project | Developer Admin | 2 | M | Pending |  |  | Phase 2 |
| UC-COM-02 | Snapshot policy tại thời điểm chốt deal | System | 2 | M | Pending |  |  | Phase 2 |
| UC-COM-03 | Split commission nhiều agent/agency | System, Finance Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-COM-04 | Holdback khi tranh chấp | Ops Admin, Finance Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-COM-05 | Export báo cáo hoa hồng kế toán | Finance Admin | 2 | M | Pending |  |  | Phase 2 |
| UC-AI-01 | Tạo nội dung listing bằng AI copilot | Agent | 1 | M | Pending |  |  |  |
| UC-AI-02 | Chấm điểm & ưu tiên lead | System, Agent | 1 | M | Pending |  |  |  |
| UC-AI-03 | Tra cứu tài liệu pháp lý (RAG) | Agent | 2 | S | Pending |  |  | Phase 2 |
| UC-AI-04 | AI Sales Agent draft reply | Agent | 3 | S | Pending |  |  | Phase 3 |
| UC-AI-05 | AI phát hiện listing bất thường | Ops Admin, System | 3 | S | Pending |  |  | Phase 3 |
| UC-AI-06 | Buyer-product matching gợi ý | Buyer, System | 2 | S | Pending |  |  | Phase 2 |
| UC-AI-07 | Buyer conversational discovery | Buyer | 3 | C | Pending |  |  | Phase 3 |
| UC-TR-01 | Xem audit trail toàn hệ thống | Ops Admin, Platform Admin | 1 | M | Pending |  |  |  |
| UC-TR-02 | Quản lý kho tài liệu (Document Vault) | Developer Admin, Ops Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-TR-03 | Quản lý tranh chấp (Dispute Center) | Ops Admin, Buyer, Agent | 3 | S | Pending |  |  | Phase 3 |
| UC-TR-04 | Regulatory Export Pack | Platform Admin | 4 | C | Pending |  |  | Phase 4 |
| UC-AN-01 | Xem dashboard funnel & KPI | Agency Admin, Platform Admin | 1 | M | Pending |  |  |  |
| UC-AN-02 | Báo cáo GMV & doanh thu platform | Platform Admin, Developer Admin | 2 | M | Pending |  |  | Phase 2 |
| UC-AN-03 | Báo cáo absorption & tồn kho | Developer Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-AN-04 | Campaign attribution đa kênh | Developer Admin, Agency Admin | 3 | S | Pending |  |  | Phase 3 |
| UC-AN-05 | Dự báo absorption 30/60/90 ngày | Developer Admin | 3 | C | Pending |  |  | Phase 3 |
| UC-MKT-01 | Publish policy phân phối project | Developer Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-MKT-02 | Agency apply/approve quyền bán project | Agency Admin, Developer Admin | 2 | S | Pending |  |  | Phase 2 |
| UC-MKT-03 | Leaderboard & compliance score agency | Developer Admin | 3 | C | Pending |  |  | Phase 3 |
| UC-MKT-04 | Marketplace ranking & SLA penalty | Platform Admin | 6 | C | Pending |  |  | Phase 6 |
| UC-UX-01 | Agent làm việc hiện trường (Mobile/PWA) | Agent | 2 | S | Pending |  |  | Phase 2 |
| UC-UX-02 | Buyer theo dõi deal & notification | Buyer | 3 | C | Pending |  |  | Phase 3 |
| UC-UX-03 | Admin quản lý tenant & moderation | Platform Admin, Ops Admin | 1 | M | Pending |  |  |  |
| UC-UX-04 | Developer Portal quản lý project | Developer Admin | 2 | M | Pending |  |  | Phase 2 |
| UC-UX-05 | White-label portal theo tenant | Platform Admin | 4 | C | Pending |  |  | Phase 4 |
| UC-UX-06 | Immersive discovery 3D/Map | Buyer | 6 | C | Pending |  |  | Phase 6 |
| UC-NW-01 | Tích hợp Zalo OA/ZNS notification | System, Agent | 2 | M | Pending |  |  | Phase 2 |
| UC-NW-02 | Tích hợp Meta Lead Ads webhook | System | 2 | M | Pending |  |  | Phase 2 |
| UC-NW-03 | SMS gateway thông báo giao dịch | System, Buyer | 2 | S | Pending |  |  | Phase 2 |
| UC-NW-04 | API Marketplace partner webhook | Partner, Platform Admin | 4 | C | Pending |  |  | Phase 4 |
| UC-NW-05 | Webhook platform cho tenant | Developer Admin | 4 | C | Pending |  |  | Phase 4 |

### 9.2 Tóm tắt UC theo Phase

| Phase | Tổng UC | Must | Confirm Y | Pending |
|-------|---------|------|-----------|---------|
| Phase 1 | 31 | 22 | 0 | 31 |
| Phase 2 | 14 | — | 0 | 14 |
| Phase 3 | 8 | — | 0 | 8 |
| Phase 4 | 4 | — | 0 | 4 |
| Phase 5 | 2 | — | 0 | 2 |
| Phase 6 | 2 | — | 0 | 2 |
| **Tổng (catalog module)** | **78** | — | **0** | **78** |

> **Metric v2.0:** UC/US catalog báo cáo **58 UC** (28 Phase 1 chi tiết + 30 Phase 2–6 tóm tắt). Section 9 liệt kê **78 UC IDs** theo module catalog đầy đủ (Section 3 UC doc v2.0) để xác nhận traceability toàn diện.

---
## 10. User Story Confirmation — Phase 1 (68 US)

### 10.1 Register đầy đủ — 68 User Stories (Sprint S0–S10)

Danh sách theo Sprint Backlog Map v2.0 (Section 7.1 UC/US catalog). Mỗi story có checkbox xác nhận cho PO và Pilot tenant.

| ID | User Story (rút gọn) | Actor | Sprint | Pri | Confirm | ☑ PO | ☑ Pilot |
|----|---------------------|-------|--------|-----|---------|------|---------|
| US-OP-01 | CI/CD pipeline automated deploy | DevOps | S0 | M | Pending | ☐ | ☐ |
| US-OP-02 | Staging + production env isolated | DevOps | S0 | M | Pending | ☐ | ☐ |
| US-ID-01 | Tenant onboarding Developer | Platform Admin | S1 | M | Pending | ☐ | ☐ |
| US-ID-02 | Tenant onboarding Agency | Platform Admin | S1 | M | Pending | ☐ | ☐ |
| US-ID-03 | JWT login/logout/refresh | All users | S1 | M | Pending | ☐ | ☐ |
| US-ID-04 | RBAC roles enforcement | Agency Admin | S1 | M | Pending | ☐ | ☐ |
| US-ID-05 | RLS tenant isolation middleware | Tech Lead | S1 | M | Pending | ☐ | ☐ |
| US-ID-06 | Tenant context API enforcement | Tech Lead | S1 | M | Pending | ☐ | ☐ |
| US-GR-13 | Golden Record API tenant isolated | Tech Lead | S1 | M | Pending | ☐ | ☐ |
| US-GR-01 | CRUD unit Golden Record | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-02 | Price/inventory versioning | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-03 | Real-time unit status display | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-07 | Inventory snapshot for audit | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-10 | Product Graph relations | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-11 | Import unit đơn lẻ nhanh | Developer Admin | S2 | M | Pending | ☐ | ☐ |
| US-GR-04 | Listing from Golden Record only | Agent | S3 | M | Pending | ☐ | ☐ |
| US-GR-05 | Anti-drift validation | Agent | S3 | M | Pending | ☐ | ☐ |
| US-GR-06 | Verified Listing badge | Buyer | S3 | S | Pending | ☐ | ☐ |
| US-GR-12 | Block edit price on listing form | Agent | S3 | M | Pending | ☐ | ☐ |
| US-LS-05 | OpenSearch index setup | Tech Lead | S3 | M | Pending | ☐ | ☐ |
| US-LS-06 | Full-text + facet search | Buyer | S3 | M | Pending | ☐ | ☐ |
| US-LS-07 | Geo search radius filter | Buyer | S3 | S | Pending | ☐ | ☐ |
| US-LS-08 | Public project/unit detail page | Buyer | S3 | M | Pending | ☐ | ☐ |
| US-LS-09 | Listing approval workflow | Ops Admin | S3 | M | Pending | ☐ | ☐ |
| US-LS-10 | Media upload S3 | Agent | S3 | M | Pending | ☐ | ☐ |
| US-LS-13 | Search sync from inventory events | System | S3 | M | Pending | ☐ | ☐ |
| US-LS-11 | Compare products UI | Buyer | S4 | S | Pending | ☐ | ☐ |
| US-LS-12 | Lead form on detail page | Buyer | S4 | M | Pending | ☐ | ☐ |
| US-CRM-07 | Lead capture API | Agent | S4 | M | Pending | ☐ | ☐ |
| US-CRM-08 | Lead routing rules engine | System | S4 | M | Pending | ☐ | ☐ |
| US-CRM-09 | CRM activity timeline | Agent | S4 | M | Pending | ☐ | ☐ |
| US-CRM-10 | Pipeline kanban view | Agent | S4 | M | Pending | ☐ | ☐ |
| US-CRM-11 | Agent dashboard hot leads | Agent | S4 | M | Pending | ☐ | ☐ |
| US-CRM-12 | Lead assign/reassign | Agency Admin | S4 | M | Pending | ☐ | ☐ |
| US-CRM-13 | Email notify new lead | System | S4 | M | Pending | ☐ | ☐ |
| US-CRM-14 | Agent portal listing management | Agent | S4 | M | Pending | ☐ | ☐ |
| US-GR-08 | Atomic inventory lock | System | S5 | M | Pending | ☐ | ☐ |
| US-GR-09 | SSE push unit status change | Agent | S5 | M | Pending | ☐ | ☐ |
| US-CRM-15 | Agent portal booking entry | Agent | S5 | M | Pending | ☐ | ☐ |
| US-BK-07 | State machine all transitions | Agent | S5 | M | Pending | ☐ | ☐ |
| US-BK-08 | Domain event store | System | S5 | M | Pending | ☐ | ☐ |
| US-BK-09 | Booking expiry job | System | S5 | M | Pending | ☐ | ☐ |
| US-ID-07 | MFA OTP payment action | Buyer | S6 | M | Pending | ☐ | ☐ |
| US-BK-10 | Cancel/refund workflow | Agent | S6 | M | Pending | ☐ | ☐ |
| US-PAY-02 | Payment gateway integration | Tech Lead | S6 | M | Pending | ☐ | ☐ |
| US-PAY-03 | PaymentIntent create | System | S6 | M | Pending | ☐ | ☐ |
| US-PAY-04 | Webhook handler idempotent | System | S6 | M | Pending | ☐ | ☐ |
| US-PAY-05 | Double-entry ledger | Finance | S6 | M | Pending | ☐ | ☐ |
| US-PAY-06 | Daily reconciliation job | Finance | S6 | M | Pending | ☐ | ☐ |
| US-PAY-07 | Payment page for buyer | Buyer | S6 | M | Pending | ☐ | ☐ |
| US-PAY-08 | Booking state update on payment | System | S6 | M | Pending | ☐ | ☐ |
| US-AI-06 | AI Gateway setup | Tech Lead | S7 | M | Pending | ☐ | ☐ |
| US-AI-07 | Content copilot API integrated UI | Agent | S7 | M | Pending | ☐ | ☐ |
| US-AI-08 | Lead scoring model v1 | Data Team | S7 | M | Pending | ☐ | ☐ |
| US-AI-09 | Guardrails block mutate operations | Security | S7 | M | Pending | ☐ | ☐ |
| US-AI-10 | AI action audit log | Ops Admin | S7 | M | Pending | ☐ | ☐ |
| US-AI-11 | Human approve AI content UI | Agent | S7 | M | Pending | ☐ | ☐ |
| US-ID-08 | Admin user management | Agency Admin | S8 | M | Pending | ☐ | ☐ |
| US-LS-14 | Responsive mobile web portal | Buyer | S8 | M | Pending | ☐ | ☐ |
| US-TR-03 | Audit trail viewer filter | Ops Admin | S8 | M | Pending | ☐ | ☐ |
| US-TR-04 | Listing moderation queue | Ops Admin | S8 | M | Pending | ☐ | ☐ |
| US-AN-03 | KPI funnel dashboard 7/30 ngày | Agency Admin | S8 | M | Pending | ☐ | ☐ |
| US-AN-04 | Inventory summary report | Developer Admin | S8 | M | Pending | ☐ | ☐ |
| US-UX-03 | Admin tenant management | Platform Admin | S8 | M | Pending | ☐ | ☐ |
| US-UX-04 | Ops config approval rules | Ops Admin | S8 | M | Pending | ☐ | ☐ |
| US-PAY-09 | Payment fail handling + retry | System | S9 | M | Pending | ☐ | ☐ |
| US-OP-03 | OpenAPI documentation | Tech Lead | S9 | M | Pending | ☐ | ☐ |
| US-OP-04 | Runbook payment ops | Ops | S10 | M | Pending | ☐ | ☐ |

### 10.2 Phân bổ US theo Sprint

| Sprint | Mục tiêu | User Stories | SP ~ | Confirm |
|--------|----------|--------------|------|---------|
| S0 | Foundation & DevOps | US-OP-01, US-OP-02 | 25 | Pending |
| S1 | Tenant & Identity | US-ID-01→06, US-GR-13 | 28 | Pending |
| S2 | Golden Record MVP | US-GR-01,02,03,07,10,11 | 30 | Pending |
| S3 | Listing & Search | US-GR-04→06,12, US-LS-05→10,13 | 32 | Pending |
| S4 | CRM & Lead | US-LS-11,12, US-CRM-07→14 | 30 | Pending |
| S5 | Booking core | US-GR-08,09, US-CRM-15, US-BK-07→09 | 35 | Pending |
| S6 | Payment & Ledger | US-ID-07, US-BK-10, US-PAY-02→08 | 38 | Pending |
| S7 | AI Layer | US-AI-06→11 | 26 | Pending |
| S8 | Admin & Analytics | US-ID-08, US-LS-14, US-TR-03,04, US-AN-03,04, US-UX-03,04 | 24 | Pending |
| S9 | Hardening & Docs | US-PAY-09, US-OP-03 | 22 | Pending |
| S10 | UAT & Go-live | US-OP-04 | 20 | Pending |
| **Tổng** | | **68 US** | **~280 SP** | **Pending** |

---
## 11. Interview Sign-off (INT-01→INT-06)

### 11.1 Register phỏng vấn và sign-off

| ID | Nhóm stakeholder | Thời lượng | Mục tiêu | Attendees | Key Decisions | Open Questions | Sign-off |
|----|------------------|------------|----------|-----------|---------------|----------------|----------|
| INT-01 | Developer (2 org pilot) | 4 buổi × 60 phút | Golden Record, policy, đối soát | [TBD Dev Lead 1], [TBD Dev Lead 2], PO, BA | KD-01: Golden Record do Dev sở hữu — Agency read-only giá | KD-02: Bulk import defer P2 | KD-03: Payment reconcile daily bắt buộc P1 | OQ-01: Payment gateway ưu tiên VNPay hay MoMo? → OI-03 | OQ-02: Max units pilot? → OI-05 | 🟡 Pending |
| INT-02 | Agency (2 org pilot) | 4 buổi × 90 phút | CRM, lead, listing, commission | [TBD Agy Lead 1], [TBD Agy Lead 2], PO, BA | KD-04: AI copilot + human approve bắt buộc | KD-05: Lead scoring P1 Must | KD-06: Zalo/Meta defer P2 với direction approved | OQ-03: Lead routing round-robin hay skill-based? → OI-07 | OQ-04: Commission Excel pain — P2 priority confirmed | 🟡 Pending |
| INT-03 | Agent (6 người) | 6 buổi × 45 phút | Hiện trường, mobile, booking | 6 Agents, Agency Admin, BA | KD-07: Booking + payment link P1 Must | KD-08: Mobile native defer P2 — PWA P1 | KD-09: AI copilot ≤10s response acceptable | OQ-05: Offline cache scope P1? → OI-09 | OQ-06: Voice-to-CRM defer P2 | 🟡 Pending |
| INT-04 | Buyer (8 người, 2 focus group) | 2 buổi × 90 phút | Trust, search, payment UX | 8 Buyers, PO, UX, BA | KD-10: Verified badge tăng trust — Should P1 | KD-11: Lead form ≤3 click bắt buộc | KD-12: Compare 2-3 unit Should P1 | OQ-07: Online deposit adoption rate assumption 30%? → OI-11 | OQ-08: Buyer deal tracking defer P3 | 🟡 Pending |
| INT-05 | Ops/Admin (2 người) | 2 buổi × 60 phút | Moderation, audit, dispute | 2 Ops Admin, PO, BA | KD-13: Listing approval queue P1 Must | KD-14: Audit trail 5 năm retention | KD-15: Dispute Center defer P3 | OQ-09: Ops FTE moderation ≥2? → ASM-11 | OQ-10: Moderation SLA target? → OI-14 | 🟡 Pending |
| INT-06 | Platform/Finance (2 người) | 2 buổi × 120 phút workshop | GMV, ledger, SLA, roadmap | Platform Sponsor, Finance Admin, Tech Lead, PO | KD-16: GMV north star — mọi cọc qua platform | KD-17: Double-entry ledger P1 Must | KD-18: Uptime 99.5% SLA P1 | KD-19: Modular monolith P1 | OQ-11: AI cost cap/tháng/tenant? → OI-01 | OQ-12: Multi-gateway P3 confirmed | OQ-13: Embedded finance legal track P5 | 🟡 Pending |

### 11.2 Chi tiết quyết định chính theo buổi phỏng vấn

#### INT-01 — Developer Pilot

| KD ID | Quyết định | FR/BR | Confirm |
|-------|------------|-------|---------|
| KD-01 | Golden Record ownership — Developer Admin only edit price | BR-01, FR-GR-01 | ☐ |
| KD-02 | Bulk import Excel defer Phase 2 — manual CRUD + API P1 | FR-GR-07, EX-04 | ☐ |
| KD-03 | Daily payment reconciliation thay Excel cuối tháng | BR-04, FR-PAY-04 | ☐ |

#### INT-02 — Agency Pilot

| KD ID | Quyết định | FR/BR | Confirm |
|-------|------------|-------|---------|
| KD-04 | AI content copilot với human approve trước publish | BR-06, FR-AI-04 | ☐ |
| KD-05 | Lead scoring hot/warm/cold trên dashboard P1 | BR-07, FR-AI-02 | ☐ |
| KD-06 | Zalo/Meta omnichannel direction approved — implement P2 | BR-05, FR-CRM-06,07 | ☐ |

#### INT-06 — Platform/Finance Workshop

| KD ID | Quyết định | FR/BR | Confirm |
|-------|------------|-------|---------|
| KD-16 | GMV qua platform — mandatory booking + payment | BR-02, BR-11 | ☐ |
| KD-17 | Event-sourced transaction + double-entry ledger | FR-BK-04, FR-PAY-03 | ☐ |
| KD-18 | SLA 99.5% uptime, RPO 24h, RTO 4h | NFR-A01→03 | ☐ |

---
## 12. MoSCoW Confirmation theo Stakeholder Group

### 12.1 Developer Pilot Group

| FR Module | Must (M) | Should (S) | Could (C) | Won't (W) | Confirm | Ghi chú |
|-----------|----------|------------|-----------|-----------|---------|---------|
| GR (FR-GR-01→08) | 01,02,03,04,08 | 05 | — | 06,07 (P2) | ☐ | Golden Record core P1 |
| BK (FR-BK-01→07) | 01,02,03,04,07 | — | — | 05,06 (P2) | ☐ | Transaction engine P1 |
| PAY (FR-PAY-01→05) | 01,02,03,04,05 | — | — | 06+ (P3+) | ☐ | Payment + ledger P1 |
| AN (FR-AN-01) | 01 | — | — | 02+ (P2) | ☐ | KPI dashboard cơ bản |
| MKT (FR-MKT-01→02) | — | — | — | P2 | ☐ | Distribution defer P2 |

### 12.2 Agency Pilot Group

| FR Module | Must (M) | Should (S) | Could (C) | Won't (W) | Confirm | Ghi chú |
|-----------|----------|------------|-----------|-----------|---------|---------|
| CRM (FR-CRM-01→05) | 01,02,03,04,05 | — | — | 06+ (P2) | ☐ | CRM core P1 |
| AI (FR-AI-01→04) | 01,02,03,04 | — | — | 05+ (P2) | ☐ | Copilot + scoring P1 |
| LS (FR-LS-01→04) | 01,02,03 | 04 | — | 05 (P2) | ☐ | Listing + search P1 |
| UX (FR-UX-02) | 02 | — | — | 05 (P2 mobile) | ☐ | Agent Portal P1 |

### 12.3 Platform Operator Group

| FR Module | Must (M) | Should (S) | Could (C) | Won't (W) | Confirm | Ghi chú |
|-----------|----------|------------|-----------|-----------|---------|---------|
| ID (FR-ID-01→04) | 01,02,03,04 | — | — | 05+ (P2) | ☐ | Multi-tenant + MFA |
| TR (FR-TR-01,05) | 01,05 | — | — | 02+ (P2) | ☐ | Audit + AI log P1 |
| UX (FR-UX-03) | 03 | — | — | 04+ (P2) | ☐ | Admin Portal P1 |
| PAY (FR-PAY-04) | 04 | — | — | — | ☐ | Daily reconcile P1 |
| NFR (Phase 1) | P01→08, S01→09, A01→03, U01→04, C02→05, O01→05, M01→04, CM01,03 | U05, CM02,04 | — | SC02+ (P3+) | ☐ | 41 NFR P1 |

### 12.4 MoSCoW Sign-off Summary

| Stakeholder Group | Representative | Date | Must FR P1 Confirmed | Chữ ký |
|-------------------|--------------|------|---------------------|--------|
| Developer Pilot | [TBD] | | 0 / 18 Must FR | ☐ |
| Agency Pilot | [TBD] | | 0 / 17 Must FR | ☐ |
| Platform Operator | [TBD] | | 0 / 10 Must FR | ☐ |

---
## 13. Acceptance Criteria Acknowledgment

### 13.1 Tham chiếu tiêu chí chấp nhận

Stakeholder xác nhận áp dụng tiêu chí chi tiết tại **`Tieu-chi-chap-nhan.md`** (v1.0), bao gồm:

- AC-FR-XXX: Acceptance criteria theo Functional Requirement
- AC-NFR-XXX: Acceptance criteria theo Non-Functional Requirement
- Given/When/Then format cho user story quan trọng
- Phase 1 Gate G1.1→G1.8
- Definition of Done cho User Story

### 13.2 UAT Scenario Confirmation (UAT-01→UAT-15)

| ID | Scenario | Actor | Gate | Priority | Confirm | ☑ Acknowledged |
|----|----------|-------|------|----------|---------|----------------|
| UAT-01 | Buyer search → lead → agent nhận lead scored | Buyer, Agent | G1.3 | Must P1 | Pending | ☐ |
| UAT-02 | Agent tạo listing từ GR + AI copilot → Ops approve → publish | Agent, Ops | G1.1 | Must P1 | Pending | ☐ |
| UAT-03 | Agent booking → buyer pay cọc → unit reserved → ledger reconcile | Agent, Buyer | G1.1, G1.8 | Must P1 | Pending | ☐ |
| UAT-04 | Anti-drift block listing sai giá | Agent | G1.1 | Must P1 | Pending | ☐ |
| UAT-05 | Concurrent 2 agent book 1 unit — 1 success only | Agent | G1.7 | Must P1 | Pending | ☐ |
| UAT-06 | Cancel booking → refund flow | Agent, Ops | G1.1 | Must P1 | Pending | ☐ |
| UAT-07 | Audit trail truy vết thay đổi giá unit | Developer, Ops | G1.1 | Must P1 | Pending | ☐ |
| UAT-08 | Tenant isolation — Agent A không thấy data tenant B | QA, Security | G1.2 | Must P1 | Pending | ☐ |
| UAT-09 | MFA OTP bắt buộc cho payment action | Buyer | G1.2 | Must P1 | Pending | ☐ |
| UAT-10 | Lead routing round-robin + hot lead priority | Agency Admin | G1.1 | Must P1 | Pending | ☐ |
| UAT-11 | Search P95 ≤ 200ms với 10K indexed units | QA | G1.2 | Must P1 | Pending | ☐ |
| UAT-12 | AI guardrail block prompt injection sửa giá | Agent, Security | G1.1 | Must P1 | Pending | ☐ |
| UAT-13 | Daily reconciliation 100% match 7 ngày liên tiếp staging | Finance | G1.8 | Must P1 | Pending | ☐ |
| UAT-14 | Public portal responsive viewport 320px+ | UX, Buyer | G1.2 | Must P1 | Pending | ☐ |
| UAT-15 | End-to-end GMV flow: search → lead → booking → pay → dashboard KPI | All actors | G1.1–G1.8 | Must P1 | Pending | ☐ |

### 13.3 Phase 1 Gate Criteria Acknowledgment

| Gate | Mô tả | Tham chiếu | Confirm |
|------|-------|------------|---------|
| G1.1 | 100% Must FR (Phase 1) AC pass | Tieu-chi-chap-nhan.md §4 | ☐ |
| G1.2 | 100% Must NFR Phase 1 AC pass | Tieu-chi-chap-nhan.md §3 | ☐ |
| G1.3 | UAT tenant pilot sign-off (≥ 5 scenarios) | UAT-01→15 | ☐ |
| G1.4 | Zero Critical bug open | QA report | ☐ |
| G1.5 | Runbook payment + audit hoàn chỉnh | US-OP-04 | ☐ |
| G1.6 | Pen test pass (no Critical) | NFR-S04 | ☐ |
| G1.7 | Concurrent booking test pass | UAT-05, NFR-P08 | ☐ |
| G1.8 | Daily reconciliation 100% 7 ngày liên tiếp staging | UAT-13 | ☐ |

### 13.4 Definition of Done Acknowledgment

PO và Tech Lead xác nhận DoD cho User Story (Tieu-chi-chap-nhan.md §5):

- [ ] Code merged + peer review approved
- [ ] Unit test coverage module ≥ 80% critical path
- [ ] Integration test pass cho AC liên quan
- [ ] OpenAPI docs cập nhật nếu có API change
- [ ] QA sign-off trên AC Given/When/Then
- [ ] Không bug High/Critical open cho story
- [ ] Demo được trên staging cho PO

---
## 14. Change Request Register

### 14.1 Quy trình Change Request (CR)

```
Submit CR → Impact assessment (scope/timeline/cost) → PO + Tech Lead review
       → Steering approve (nếu Major) → Cập nhật 4 tài liệu BA:
         (1) Tai-lieu-yeu-cau-phan-mem.md
         (2) Danh-sach-use-case-user-story.md
         (3) Yeu-cau-da-xac-nhan.md
         (4) Tieu-chi-chap-nhan.md
       → Thông báo stakeholders → Implement
```

### 14.2 CR Classification

| Loại | Mô tả | Approver | SLA response |
|------|-------|----------|--------------|
| **Minor** | Clarification, không đổi scope/timeline | PO | 2 ngày làm việc |
| **Moderate** | Thay đổi FR Should/Could hoặc NFR target | PO + Tech Lead | 5 ngày làm việc |
| **Major** | Thay đổi FR Must P1, timeline, hoặc budget | Steering Committee | 10 ngày làm việc |
| **Critical** | Blocker go-live, security/compliance | PO + Sponsor (emergency) | 24 giờ |

### 14.3 Mẫu Change Request (CR Template)

```markdown
# Change Request — CR-[YYYY]-[NNN]

| Mục | Nội dung |
|-----|----------|
| **CR ID** | CR-2026-001 |
| **Ngày submit** | [DD/MM/YYYY] |
| **Người submit** | [Tên, Vai trò] |
| **Baseline** | WEREAL-BL-2026-002 |
| **Loại CR** | ☐ Minor ☐ Moderate ☐ Major ☐ Critical |
| **Trạng thái** | ☐ Draft ☐ Submitted ☐ Approved ☐ Rejected ☐ Implemented |

## 1. Mô tả thay đổi
[Mô tả rõ ràng yêu cầu thay đổi gì, tại sao cần thay đổi]

## 2. Items bị ảnh hưởng
| Loại | ID | Mô tả hiện tại | Mô tả mới |
|------|-----|----------------|-----------|
| FR | FR-XX-NN | | |
| NFR | NFR-XX-NN | | |
| UC | UC-XX-NN | | |
| US | US-XX-NN | | |

## 3. Impact Assessment
| Dimension | Impact | Chi tiết |
|-----------|--------|----------|
| **Scope** | ☐ Tăng ☐ Giảm ☐ Không đổi | |
| **Timeline** | +[X] ngày / sprint | |
| **Cost** | +[X] FTE-days / USD | |
| **Risk** | ☐ Tăng ☐ Giảm ☐ Neutral | [R-ID liên quan] |
| **Dependencies** | | [FR/CON/ASM bị ảnh hưởng] |

## 4. Phương án thay thế đã xem xét
| # | Phương án | Pros | Cons | Quyết định |
|---|-----------|------|------|------------|
| 1 | | | | ☐ Chọn ☐ Loại |

## 5. Approval
| Vai trò | Họ tên | Ngày | Quyết định | Chữ ký |
|---------|--------|------|------------|---------|
| Product Owner | | | ☐ Approve ☐ Reject | ☐ |
| Tech Lead | | | ☐ Approve ☐ Reject | ☐ |
| Steering (Major only) | | | ☐ Approve ☐ Reject | ☐ |

## 6. Implementation tracking
| Task | Owner | Due | Status |
|------|-------|-----|--------|
| Update SRS v2.0 | BA | | ☐ |
| Update UC/US catalog | BA | | ☐ |
| Update Confirmed Req | BA | | ☐ |
| Update Acceptance Criteria | QA | | ☐ |
| Dev implementation | Dev | | ☐ |
```

### 14.4 CR Log (sau baseline lock)

| CR ID | Ngày | Mô tả thay đổi | Loại | Impact | FR/UC/US | Approve | Status |
|-------|------|----------------|------|--------|----------|---------|--------|
| — | — | Chưa có CR sau baseline WEREAL-BL-2026-002 | — | — | — | — | — |

> **Lưu ý:** CR log chỉ ghi nhận thay đổi **sau** ngày baseline lock (14/08/2026). Mọi thay đổi trước sign-off được ghi trong Deviation Log (Section 15).

---
## 15. Deviation Log

### 15.1 Mục đích

Ghi nhận các yêu cầu **bị thay đổi, defer, hoặc điều chỉnh priority** so với draft SRS ban đầu trong quá trình xác nhận. Khác với CR (sau baseline), Deviation Log ghi nhận quá trình **đến** baseline.

### 15.2 Deviation Register

| DEV ID | Item | Mô tả gốc | Thay đổi/Deviation | Lý do | Approved by | Date | Status |
|--------|------|-----------|-------------------|-------|-------------|------|--------|
| DEV-001 | FR-GR-07 | Bulk import Excel/CSV | Defer từ P1 sang P2 | Developer Pilot — KD-02 | PO | 28/07/2026 | ✅ Approved |
| DEV-002 | FR-CRM-06,07 | Zalo/Meta omnichannel | Defer từ P1 sang P2 — direction approved | Agency Pilot — KD-06 | PO | 28/07/2026 | ✅ Approved |
| DEV-003 | FR-UX-05 | Mobile native app | Defer P1 — PWA/responsive thay thế | Agent interviews — KD-08 | PO | 28/07/2026 | ✅ Approved |
| DEV-004 | FR-COM-01→05 | Commission OS full | Defer P1 — Phase 2 Must | Agency Pilot — AGY-I06 | PO | 28/07/2026 | ✅ Approved |
| DEV-005 | NFR-P03 | Search P95 target | Giữ 200ms P1 (không giảm xuống 150ms) | Tech Lead assessment | Tech Lead | 28/07/2026 | ✅ Approved |
| DEV-006 | CON-06 | AI cost cap | Value TBD — pending OI-01 resolution | Platform Workshop INT-06 | PO | 28/07/2026 | 🟡 Pending |
| DEV-007 | FR-GR-05 | Verified badge | Downgrade từ Must sang Should P1 | Buyer focus group — trust vs effort | PO | 28/07/2026 | ✅ Approved |
| DEV-008 | FR-LS-04 | Compare products | Confirmed Should P1 (không Must) | Buyer INT-04 — KD-12 | PO | 28/07/2026 | ✅ Approved |

### 15.3 Deferred Items Summary (Phase 1 → Phase 2+)

| Item | Phase gốc | Phase mới | Direction | Confirm |
|------|-----------|-----------|-----------|---------|
| FR-GR-06,07 (Time-travel, Bulk import) | P1 | P2 | Should | ☐ |
| FR-CRM-06,07 (Zalo, Meta) | P1 | P2 | Must P2 | ☐ |
| FR-COM-01→05 (Commission OS) | P1 | P2 | Must P2 | ☐ |
| FR-UX-04,05 (Dev Portal, Mobile) | P1 | P2 | Must/Should P2 | ☐ |
| FR-BK-05,06 (Contract, E-sign) | P1 | P2 | Should P2 | ☐ |
| FR-AI-05,06 (RAG, Matching) | P1 | P2 | Should P2 | ☐ |

---
## 16. Sign-off & Baseline Lock

### 16.1 Xác nhận nội dung baseline

Chúng tôi xác nhận đã review và đồng ý baseline yêu cầu WEREAL REOS như mô tả trong:

| # | Tài liệu | Version | Confirm |
|---|----------|---------|---------|
| 1 | `Tai-lieu-yeu-cau-phan-mem.md` (SRS) | 2.0 | ☐ |
| 2 | `Danh-sach-use-case-user-story.md` (UC/US) | 2.0 | ☐ |
| 3 | `Tieu-chi-chap-nhan.md` (Acceptance Criteria) | 1.0 | ☐ |
| 4 | `Yeu-cau-da-xac-nhan.md` (tài liệu này) | 2.0 | ☐ |
| 5 | `Pham-vi-cong-viec.md` | 2.0 | ☐ |

### 16.2 Sign-off Register

| Vai trò | Họ tên | Chữ ký | Ngày | Trạng thái | Điều kiện đặc biệt |
|---------|--------|--------|------|------------|-------------------|
| **Product Owner** | | | | ☐ Pending | — |
| **Tech Lead** | | | | ☐ Pending | — |
| **BA Lead** | | | | ☐ Pending | — |
| **Developer Pilot Lead** | | | | ☐ Pending | BR-01,03,04 confirmed |
| **Agency Pilot Lead** | | | | ☐ Pending | BR-06,07 confirmed |
| **Platform Sponsor** | | | | ☐ Pending | BR-02,11 confirmed |
| **Legal/Compliance** | | | | ☐ Pending | BR-15,16 + NFR-C confirmed |
| **QA Lead** | | | | ☐ Pending | UAT-01→15 acknowledged |

### 16.3 Điều kiện Baseline Lock (WEREAL-BL-2026-002)

Baseline **WEREAL-BL-2026-002** có hiệu lực khi **TẤT CẢ** điều kiện sau được đáp ứng:

| # | Điều kiện | Owner | Verify | Status |
|---|-----------|-------|--------|--------|
| BL-01 | Product Owner sign-off | PO | Chữ ký Section 16.2 | ☐ |
| BL-02 | Tech Lead sign-off | Tech Lead | Chữ ký Section 16.2 | ☐ |
| BL-03 | Developer Pilot Lead sign-off | Dev Pilot | Walkthrough GR+BK+PAY | ☐ |
| BL-04 | Agency Pilot Lead sign-off | Agy Pilot | Walkthrough CRM+AI+Booking | ☐ |
| BL-05 | 100% FR Phase 1 Must = Confirm Y | BA | Section 5.2 | ☐ |
| BL-06 | 100% NFR Phase 1 = Confirm Y | QA | Section 6.2 | ☐ |
| BL-07 | BR-01→10 confirmed (BR-11→25 direction approved) | PO | Section 4.1 | ☐ |
| BL-08 | Out-of-Scope EX-01→18 agreed | Steering | Section 7.1 | ☐ |
| BL-09 | UAT-01→15 acknowledged | QA + Pilot | Section 13.2 | ☐ |
| BL-10 | Open Issues OI-01→05 resolved hoặc có mitigation | PM | Appendix C | ☐ |
| BL-11 | Legal review NFR-C01→05 complete | Legal | Section 6.1 | ☐ |
| BL-12 | CR process communicated to all teams | PM | Section 14 | ☐ |

### 16.4 Baseline Metadata

| Thuộc tính | Giá trị |
|------------|---------|
| **Baseline ID** | WEREAL-BL-2026-002 |
| **Version** | 2.0 |
| **Scope** | Phase 1 MVP + direction Phase 2–6 |
| **FR count** | 82 (Phase 1 Must: 45) |
| **NFR count** | 52 (Phase 1: 41) |
| **UC count** | 58 metric (78 module IDs cataloged; Phase 1: 28) |
| **US count Phase 1** | 68 (~280 SP) |
| **US count total** | 132 |
| **BR count** | 25 |
| **Target go-live** | 31/12/2026 |
| **Baseline lock date** | 14/08/2026 (target) |
| **Sprint 0 start** | 14/08/2026 |
| **Next review** | Phase 1 Gate — 15/12/2026 |

---
## 17. Traceability Summary

### 17.1 Confirmed Count by Phase

| Phase | FR | NFR | UC | US | Confirm Y | Pending |
|-------|-----|-----|-----|-----|-----------|---------|
| Phase 1 | 45 | 41 | 28 | 68 | 0 | 182 |
| Phase 2 | 22 | 6 | 14 | 44 | 0 | 86 |
| Phase 3 | 8 | 3 | 8 | 12 | 0 | 31 |
| Phase 4 | 4 | 1 | 4 | 4 | 0 | 13 |
| Phase 5 | 3 | 0 | 2 | 2 | 0 | 7 |
| Phase 6 | 0 | 0 | 2 | 2 | 0 | 4 |
| **Tổng** | **82** | **52** | **58** | **132** | **0** | **322** |

> **Ghi chú:** Confirm Y = 0 tại thời điểm phát hành draft v2.0 (28/07/2026). Cập nhật sau walkthrough stakeholder.

### 17.2 Confirmed Count by Module

| Module | FR | UC | US (P1) | BR | Confirm Status |
|--------|-----|-----|---------|-----|----------------|
| GR — Golden Record | 8 | 7 | 13 | BR-01,20 | Pending |
| ID — Identity | 6 | 6 | 8 | BR-14 | Pending |
| LS — Listing/Search | 6 | 7 | 11 | BR-09 | Pending |
| CRM | 9 | 7 | 9 | BR-05,07,12 | Pending |
| BK — Booking | 8 | 8 | 4 | BR-02,03,17,22 | Pending |
| PAY — Payment | 10 | 7 | 9 | BR-04,18,21 | Pending |
| COM — Commission | 5 | 5 | 0 (P2) | BR-13 | Pending P2 |
| AI | 10 | 7 | 6 | BR-06,16 | Pending |
| TR — Trust | 5 | 4 | 2 | BR-08,24 | Pending |
| AN — Analytics | 5 | 5 | 2 | BR-11 | Pending |
| MKT — Marketplace | 3 | 4 | 0 (P2) | BR-19 | Pending P2 |
| UX — Experience | 7 | 6 | 2 | — | Pending |
| NW — Network | 0 (FR via CRM) | 5 | 0 (P2) | BR-05 | Pending P2 |
| OP — DevOps | — | — | 4 | — | Pending |

### 17.3 Traceability Chain (mẫu)

```
Pain Point → BR → FR → UC → US → AC → UAT → Test Case
PP-01 → BR-01 → FR-GR-03,04 → UC-GR-02,03 → US-GR-04,05 → AC-GR-03,04 → UAT-04
PP-02 → BR-03 → FR-BK-02 → UC-BK-01 → US-GR-08 → AC-GR-06 → UAT-05
PP-04 → BR-04 → FR-PAY-04 → UC-PAY-02 → US-PAY-06 → AC-PAY-04 → UAT-13
PP-06 → BR-06 → FR-AI-01,04 → UC-AI-01 → US-AI-11 → AC-AI-02 → UAT-12
PP-12 → BR-02 → FR-BK-01,PAY-05 → UC-BK-01,PAY-01 → US-PAY-08 → AC-BK-03 → UAT-03,15
```

### 17.4 Coverage Matrix (Phase 1 Must FR → UAT)

| FR Must P1 | UC | US | UAT | Covered |
|------------|-----|-----|-----|---------|
| FR-GR-01→04,08 | UC-GR-01→04,07 | US-GR-01→05,08,09,12,13 | UAT-02,04,07 | ☐ |
| FR-ID-01→04 | UC-ID-01→04 | US-ID-01→08 | UAT-08,09 | ☐ |
| FR-LS-01→03,06 | UC-LS-01,02,04,05,07 | US-LS-05→13 | UAT-01,11,14 | ☐ |
| FR-CRM-01→05 | UC-CRM-01→04 | US-CRM-07→15 | UAT-01,10 | ☐ |
| FR-BK-01→04,07 | UC-BK-01→03,05 | US-BK-07→10, US-GR-08 | UAT-03,05,06 | ☐ |
| FR-PAY-01→05 | UC-PAY-01→03 | US-PAY-02→09 | UAT-03,13 | ☐ |
| FR-AI-01→04 | UC-AI-01,02 | US-AI-06→11 | UAT-02,12 | ☐ |
| FR-TR-01,05 | UC-TR-01 | US-TR-03,04, US-AI-10 | UAT-07 | ☐ |
| FR-UX-01→03 | UC-LS-01,05, UX-03 | US-LS-08, US-UX-03,04 | UAT-14,15 | ☐ |
| FR-AN-01 | UC-AN-01 | US-AN-03,04, US-CRM-11 | UAT-15 | ☐ |

---
## 18. Phụ lục

### Appendix A — Glossary of Confirmed Terms (Thuật ngữ đã xác nhận)

| Thuật ngữ | Định nghĩa đã xác nhận | Nguồn | Confirm |
|-----------|------------------------|-------|---------|
| **Golden Record** | Unit gốc từ Developer — single source of truth cho giá, trạng thái, policy. Agency/Agent không sửa giá gốc. | BR-01, SRS §2.3 | ☐ |
| **Anti-drift** | Cơ chế tự động block/flag listing marketing khi lệch Golden Record (giá, trạng thái) | FR-GR-04, BR-01 | ☐ |
| **Verified Listing** | Badge hiển thị khi listing pass anti-drift + đã duyệt — tăng trust buyer | FR-GR-05, BR-10 | ☐ |
| **Atomic Lock** | Distributed lock (Redis) đảm bảo 0 double booking dưới concurrent load | FR-BK-02, NFR-P08 | ☐ |
| **Event Store** | Append-only log domain events — replay timeline giao dịch cho dispute | FR-BK-04, BR-08 | ☐ |
| **Double-entry Ledger** | Mọi payment ghi debit/credit cân bằng — nền tảng đối soát tự động | FR-PAY-03, BR-18 | ☐ |
| **PaymentIntent** | Object trung gian tạo link thanh toán cọc gắn booking state | FR-PAY-02,05 | ☐ |
| **Reconciliation** | Job hàng ngày 06:00 ICT — auto-match provider vs ledger 100% | FR-PAY-04, BR-04 | ☐ |
| **Lead Scoring** | AI chấm điểm 0–100 lead on entry — hot (≥80) ưu tiên routing | FR-AI-02, BR-07 | ☐ |
| **Human-in-the-loop** | AI content phải agent approve trước publish — không auto-fill | FR-AI-04, BR-06 | ☐ |
| **Guardrails** | AI Gateway block mọi mutate price/inventory/booking qua prompt | FR-AI-03 | ☐ |
| **MoSCoW** | M=Must, S=Should, C=Could, W=Won't this phase — priority framework | SRS §11 | ☐ |
| **GMV** | Gross Merchandise Value — north star metric, giao dịch qua platform | BR-11, PLT-I01 | ☐ |
| **RLS** | Row-Level Security PostgreSQL — tenant isolation ở DB layer | FR-ID-03 | ☐ |
| **SSE** | Server-Sent Events — real-time push unit status ≤ 5s lag | FR-GR-08, NFR-P04 | ☐ |
| **Product Graph** | Cây phân cấp Developer→Project→Phase→Building→Unit | FR-GR-01, UC-GR-04 | ☐ |
| **State Machine** | 15 trạng thái giao dịch với 18 transition rules hợp lệ | FR-BK-03, SRS §6.3 | ☐ |
| **Pilot Tenant** | ≥ 1 Developer + 1 Agency commit UAT trước go-live | ASM-01, CON-13 | ☐ |
| **Baseline Lock** | Điểm đóng băng yêu cầu — mọi thay đổi sau qua CR | WEREAL-BL-2026-002 | ☐ |
| **Change Request (CR)** | Quy trình formal thay đổi scope sau baseline | Section 14 | ☐ |

### Appendix B — Pain Point → BR Mapping (Confirmed)

| Pain ID | Mô tả | BR | FR chính | Confirm |
|---------|-------|-----|----------|---------|
| PP-01 | Bảng hàng lệch giá/trạng thái | BR-01 | FR-GR-01→04 | ☐ |
| PP-02 | Double booking / tranh chấp giữ chỗ | BR-02,03 | FR-BK-02, FR-GR-08 | ☐ |
| PP-03 | Lead rơi rụng đa kênh | BR-05 | FR-CRM-06,07 (P2) | ☐ |
| PP-04 | Đối soát cọc thủ công | BR-04 | FR-PAY-03,04 | ☐ |
| PP-05 | Hoa hồng tranh chấp | BR-13 | FR-COM-01→05 (P2) | ☐ |
| PP-06 | Sale yếu không tạo content | BR-06 | FR-AI-01,04 | ☐ |
| PP-07 | Không ưu tiên lead | BR-07 | FR-AI-02, FR-CRM-03 | ☐ |
| PP-08 | Không audit lịch sử | BR-08 | FR-TR-01, FR-BK-04 | ☐ |
| PP-10 | Khách không tin tin đăng | BR-10 | FR-GR-05 | ☐ |
| PP-12 | Giao dịch bypass platform | BR-02,11 | FR-BK-01, FR-PAY-05 | ☐ |

### Appendix C — Open Issues List (OI-01→OI-20)

| OI ID | Mô tả | Owner | Priority | Target Date | Impact | Status |
|-------|-------|-------|----------|-------------|--------|--------|
| OI-01 | AI cost cap Phase 1 — giá trị USD/tháng/tenant chưa xác định | PO | P1 | 04/08/2026 | CON-06, NFR-P05 | Open |
| OI-02 | Payment gateway partner final — VNPay vs MoMo vs cả hai | Platform Finance | P0 | 01/08/2026 | CON-03, FR-PAY-01 | Open |
| OI-03 | Sandbox API keys timeline — confirm trước 01/10/2026 | Platform Finance | P0 | 15/08/2026 | ASM-02 | Open |
| OI-04 | Developer Pilot Org #2 — chưa confirm tham gia UAT | Platform Sponsor | P1 | 06/08/2026 | ASM-01 | Open |
| OI-05 | Max units pilot tenant Phase 1 — confirm ≤ 5,000 | Developer Pilot | P2 | 08/08/2026 | ASM-08 | Open |
| OI-06 | Legal review BR-01→25 — counsel assignment pending | Legal | P0 | 07/08/2026 | ASM-09 | Open |
| OI-07 | Lead routing algorithm — round-robin vs skill-based vs hybrid | Agency Pilot | P1 | 08/08/2026 | FR-CRM-03 | Open |
| OI-08 | Booking expiry default duration — 24h vs 48h vs configurable | Developer Pilot | P2 | 08/08/2026 | FR-BK-01 | Open |
| OI-09 | PWA offline-read scope P1 — cache bao nhiêu unit | Tech Lead | P2 | 10/08/2026 | FR-UX-02 | Open |
| OI-10 | Ops moderation SLA — target hours pending listing queue | Ops Admin | P2 | 08/08/2026 | FR-LS-01 | Open |
| OI-11 | Buyer online deposit adoption rate — validate 30% assumption | PO | P2 | 15/09/2026 | ASM-13 | Open |
| OI-12 | LLM provider selection — OpenAI vs Azure OpenAI vs local proxy | AI Lead | P1 | 04/08/2026 | CON-07 | Open |
| OI-13 | Pen test vendor selection và budget approval | Security | P1 | 01/09/2026 | CON-17 | Open |
| OI-14 | Listing compliance rule engine — manual vs automated Phase 1 | Legal | P2 | 10/08/2026 | NFR-C02 | Open |
| OI-15 | Event sourcing training — team skill gap assessment | Tech Lead | P1 | 14/08/2026 | ASM-17 | Open |
| OI-16 | Zalo OA business account — pilot agency chưa có OA verified | Agency Pilot | P2 | P2 start | ASM-05 | Open |
| OI-17 | Meta Business Manager access — page ownership confirm | Agency Pilot | P2 | P2 start | ASM-06 | Open |
| OI-18 | E-sign provider RFP — Phase 2 vendor selection | Platform Sponsor | P3 | T1/2027 | ASM-10 | Open |
| OI-19 | Data retention matrix detail — per entity type policy | Legal | P2 | 01/09/2026 | NFR-C05 | Open |
| OI-20 | Steering Committee meeting date confirm — MoSCoW sign-off | PM | P0 | 08/08/2026 | ASM-14 | Open |

### Appendix D — Document Distribution List

| Nhóm | Vai trò | Mục đích | Version nhận |
|------|---------|----------|--------------|
| Steering Committee | Sponsor, PO | Sign-off baseline | 2.0 |
| Engineering | BE, FE, Mobile, AI, DevOps | Implementation reference | 2.0 |
| QA | QA Lead, Testers | UAT planning, AC verification | 2.0 |
| Pilot Developer | Dev Admin, Dev Lead | UAT, Golden Record validation | 2.0 |
| Pilot Agency | Agy Admin, Agents | UAT, CRM/Booking validation | 2.0 |
| Legal/Compliance | Counsel | BR, NFR-C review | 2.0 |
| Finance | Finance Admin | Payment, ledger, reconcile | 2.0 |
| Partnership | Payment, Zalo, Meta | Integration requirements P2 | 2.0 |

---

*Kết thúc tài liệu Yêu cầu đã xác nhận v2.0 — WEREAL REOS*

**Baseline ID:** WEREAL-BL-2026-002  
**Document ID:** WEREAL-CRQ-002  
**Phát hành:** 28/07/2026  
**Trạng thái:** Draft — Chờ Sign-off Stakeholder
