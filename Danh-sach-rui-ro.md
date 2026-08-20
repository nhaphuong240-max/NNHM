# Danh sách rủi ro — WEREAL PropTech SaaS

> **Phiên bản:** 2.0 | **Ngày:** 28/07/2026  
> **Dự án:** WEREAL — Real Estate Operating System (REOS)  
> **Phương pháp:** Probability (1–5) × Impact (1–5) = Risk Score

**Thang điểm:** P/I 1–5 | Score: 1–6 Thấp | 7–12 TB | 13–19 Cao | 20–25 Rất cao

---

## 1. Tổng quan rủi ro (v2.0)

| Mức | Số lượng | Hành động |
|-----|----------|-----------|
| 🔴 Rất cao (20–25) | 3 | Escalate steering committee ngay |
| 🟠 Cao (13–19) | 14 | Mitigation bắt buộc, review hàng tuần |
| 🟡 Trung bình (7–12) | 18 | Monitor theo sprint |
| 🟢 Thấp (1–6) | 8 | Accept / monitor định kỳ |
| **Tổng** | **45** | |

---

## 2. Ma trận rủi ro chi tiết

### 2.1 Kiến trúc & kỹ thuật

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-T01 | Tenant data leak (RLS bypass) | 3 | 5 | 15 | RLS + middleware + cross-tenant test + pen test | Tech Lead | 1 |
| R-T02 | Monolith quá lớn trước khi tách | 3 | 4 | 12 | Module boundary, ADR, tách Phase 2 | Tech Lead | 1–2 |
| R-T03 | Search index out of sync | 3 | 4 | 12 | CDC + reconciliation job + lag alert | Backend | 1–3 |
| R-T04 | State machine edge case / deadlock | 3 | 5 | 15 | Event sourcing, full transition test, replay | Backend | 1 |
| R-T05 | Performance degradation at scale | 3 | 4 | 12 | Index, cache, CQRS, load test gate | DevOps | 1–4 |
| R-T06 | Single point of failure | 2 | 5 | 10 | HA Phase 2+, multi-region Phase 4 | DevOps | 1–4 |
| R-T07 | API breaking changes | 3 | 3 | 9 | Versioning, deprecation policy, contract test | Backend | 1–6 |
| R-T08 | **Event store corruption/loss** | 2 | 5 | 10 | Append-only, backup, replay test | Backend | 1 |
| R-T09 | **CQRS read/write inconsistency** | 3 | 4 | 12 | Outbox, reconciliation, monitoring lag | Backend | 3 |
| R-T10 | **Workflow engine complexity** | 3 | 4 | 12 | Temporal/Camunda POC, limit custom scope Phase 4 | Tech Lead | 4 |

### 2.2 Thanh toán & tài chính

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-P01 | Webhook duplicate/missed | 3 | 5 | 15 | Idempotency, signature, retry, reconciliation | Backend | 1 |
| R-P02 | Ledger không khớp provider | 3 | 5 | 15 | Double-entry, auto reconcile, alert | Finance/Tech | 1 |
| R-P03 | Double booking (race condition) | 3 | 5 | 15 | Redis atomic lock, concurrent test | Backend | 1 |
| R-P04 | Refund sai số tiền | 2 | 5 | 10 | Link original payment, approval threshold | Backend | 1 |
| R-P05 | Gateway downtime | 3 | 4 | 12 | Retry, multi-gateway Phase 3, queue | Backend | 1–3 |
| R-P06 | Commission tính sai | 2 | 4 | 8 | Policy snapshot, versioning | Backend | 2 |
| R-P07 | Chargeback/fraud payment | 2 | 5 | 10 | Fraud graph, velocity check, holdback | Product | 2–3 |
| R-P08 | **Escrow release sai điều kiện** | 2 | 5 | 10 | Multi-approval, legal checklist, audit | Legal/Tech | 5 |
| R-P09 | **BNPL partner default** | 2 | 5 | 10 | Partner due diligence, fallback, insurance | Finance | 5 |
| R-P10 | **Mortgage API unreliable** | 3 | 3 | 9 | Cache, graceful degrade, manual fallback | Backend | 5 |
| R-P11 | **Embedded finance regulatory** | 3 | 5 | 15 | Legal review, license check, compliance pack | Legal | 5 |

### 2.3 AI

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-A01 | AI hallucination (pháp lý/giá) | 4 | 4 | 16 | Guardrails, RAG citation, human approval | AI Lead | 1 |
| R-A02 | AI mutate data nhạy cảm | 2 | 5 | 10 | Read-only service, action whitelist | AI Lead | 1 |
| R-A03 | LLM cost overrun | 3 | 3 | 9 | Rate limit, quota, model routing | AI Lead | 1 |
| R-A04 | RAG cross-tenant contamination | 2 | 5 | 10 | Tenant-isolated index, metadata filter | AI Lead | 2 |
| R-A05 | Lead scoring bias | 3 | 3 | 9 | Eval pipeline, A/B, human override | AI Lead | 1–2 |
| R-A06 | LLM provider outage | 3 | 3 | 9 | Fallback model, graceful degrade | AI Lead | 1 |
| R-A07 | **AI Agent auto-send without approval** | 3 | 5 | 15 | Approve-to-send enforce, audit, kill switch | AI Lead | 3 |
| R-A08 | **Forecast model inaccurate** | 3 | 4 | 12 | Confidence score, disclaimer, human review | AI Lead | 3 |
| R-A09 | **Buyer Concierge misleading advice** | 3 | 4 | 12 | Read-only, citation, "not financial advice" | AI Lead | 3 |

### 2.4 Bảo mật & compliance

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-S01 | PII data breach | 2 | 5 | 10 | Encryption, access control, incident plan | Security | 1 |
| R-S02 | Vi phạm quy định BĐS/quảng cáo | 3 | 5 | 15 | Legal review, Compliance Agent, approval | Legal/PO | 1–3 |
| R-S03 | Audit trail không đủ | 2 | 5 | 10 | Event store, 5yr retention, replay test | Backend | 1 |
| R-S04 | OWASP vulnerabilities | 3 | 4 | 12 | SAST/DAST, pen test mỗi gate | Security | 1 |
| R-S05 | Insider threat | 2 | 4 | 8 | Least privilege, access log, MFA admin | Security | 1 |
| R-S06 | **Document vault leak** | 2 | 5 | 10 | Watermark, access log, expiring links | Backend | 2 |
| R-S07 | **Regulatory export sai format** | 2 | 4 | 8 | Legal template review, validation | Legal | 4 |

### 2.5 Dự án & tổ chức

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-O01 | Scope creep | 4 | 4 | 16 | CR process, phase gate, MVP discipline | PO | 1–6 |
| R-O02 | Thiếu tenant pilot | 3 | 5 | 15 | Confirm pilot S0, weekly feedback | PO | 1 |
| R-O03 | Key person dependency | 3 | 4 | 12 | Docs, pair prog, backup plan | PM | 1–6 |
| R-O04 | Team capacity thiếu | 3 | 4 | 12 | Phase scope control, hiring, outsource | PM | 1–4 |
| R-O05 | Payment gateway delay | 3 | 5 | 15 | Early negotiation, mock payment | PO/Tech | 1 |
| R-O06 | Third-party API breaking | 2 | 4 | 8 | Adapter pattern, monitor changelog | Tech Lead | 1–6 |
| R-O07 | **Zalo/Meta API policy change** | 3 | 4 | 12 | Abstraction layer, multi-channel | Backend | 2 |
| R-O08 | **Phase 5 finance scope explosion** | 3 | 4 | 12 | Separate legal track, phased rollout | PO/Legal | 5 |

### 2.6 Nghiệp vụ & thị trường

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-B01 | Agent bypass platform | 4 | 4 | 16 | Incentive, mandatory booking, audit | PO | 1–2 |
| R-B02 | Developer không cung cấp data gốc | 3 | 4 | 12 | Onboarding SLA, import tool, contract | PO | 1 |
| R-B03 | Thị trường BĐS suy giảm | 3 | 4 | 12 | Diversify tenant, subscription stability | Business | 2–6 |
| R-B04 | Cạnh tranh marketplace VN | 3 | 3 | 9 | 3 moats: data, transaction, network | Business | 1–6 |
| R-B05 | Agent resistance to AI | 3 | 3 | 9 | Training, ROI demo, gamification | PO | 1–3 |
| R-B06 | **Marketplace cold start** | 4 | 4 | 16 | Seed dev+agency pilot, incentive program | PO | 2–6 |
| R-B07 | **Data product low demand** | 3 | 3 | 9 | Validate with 3 developers before build | PO | 6 |

### 2.7 Vận hành

| ID | Rủi ro | P | I | Score | Mitigation | Owner | Phase |
|----|--------|---|---|-------|------------|-------|-------|
| R-OP01 | Production incident kéo dài | 2 | 5 | 10 | Runbook, on-call, post-mortem | DevOps | 1 |
| R-OP02 | Backup restore fail | 2 | 5 | 10 | Monthly restore drill | DevOps | 1 |
| R-OP03 | Monitoring blind spots | 3 | 3 | 9 | OpenTelemetry, synthetic monitor | DevOps | 1 |
| R-OP04 | **Multi-region failover fail** | 2 | 5 | 10 | DR drill quarterly, RTO/RPO test | DevOps | 4 |
| R-OP05 | **Go-live trước P0 vertical slice** | 4 | 5 | 20 | Freeze scope; G1.5/G1.6; `Ke-hoach-du-an.md` §13 | PO | 1 |
| R-OP06 | **Spec/prototype lệch production** | 3 | 4 | 12 | BA operational backlog; vertical slice E2E | Tech Lead | 1 |
| R-OP07 | **Design drift khi scale FE** | 3 | 3 | 9 | Figma Variables gate; DS Spec §12 | Frontend | 1–2 |

---

## 3. Top 15 rủi ro ưu tiên

| Rank | ID | Rủi ro | Score | Phase |
|------|----|--------|-------|-------|
| 1 | R-OP05 | Go-live trước P0 vertical slice | 20 | 1 |
| 2 | R-A01 | AI hallucination pháp lý/giá | 16 | 1 |
| 3 | R-O01 | Scope creep | 16 | 1–6 |
| 4 | R-B01 | Agent bypass platform | 16 | 1–2 |
| 5 | R-B06 | Marketplace cold start | 16 | 2–6 |
| 6 | R-T01 | Tenant data leak | 15 | 1 |
| 7 | R-T04 | State machine edge case | 15 | 1 |
| 8 | R-P01 | Webhook duplicate/missed | 15 | 1 |
| 9 | R-P02 | Ledger không khớp | 15 | 1 |
| 10 | R-P03 | Double booking | 15 | 1 |
| 11 | R-P11 | Embedded finance regulatory | 15 | 5 |
| 12 | R-S02 | Vi phạm quy định BĐS | 15 | 1–3 |
| 13 | R-O02 | Thiếu tenant pilot | 15 | 1 |
| 14 | R-O05 | Payment gateway delay | 15 | 1 |
| 15 | R-A07 | AI Agent auto-send | 15 | 3 |

---

## 4. Kế hoạch ứng phó theo phase

### Phase 1 — MVP (P0 trước go-live)
**P0:** R-T01, R-T04, R-P01, R-P02, R-P03, R-S02, R-A01, R-T08, **R-OP05**  
**P1:** R-S01, R-S03, R-S04, R-O01, R-O02, R-O05, R-B01, R-OP06, R-OP07  

**Mitigation bắt buộc:** `Ke-hoach-du-an.md` §13 (OP-P0-1→6) · `Pham-vi-cong-viec.md` §13  
**Gate:** Không go-live nếu P0 chưa verified

### Phase 2 — Scale
**P0:** R-P06, R-A04, R-O07, R-B06  
**P1:** R-P05, R-T06, R-B02

### Phase 3 — Intelligence & Trust
**P0:** R-A07, R-A08, R-T09, Dispute SLA  
**P1:** R-P07, R-A09, R-S06

### Phase 4 — Enterprise
**P0:** R-T10, R-OP04, R-S07  
**P1:** Multi-region, API marketplace security

### Phase 5 — Embedded Finance
**P0:** R-P11, R-P08, R-P09  
**P1:** R-P10, R-O08

### Phase 6 — Network
**P0:** R-B06, R-B07  
**P1:** Multi-country compliance prep

---

## 5. Kịch bản ứng phó khẩn cấp

### 5.1 Tenant data leak
Isolate → notify security/legal 1h → RCA 24h → notify tenants → patch + pen test → restore

### 5.2 Payment reconciliation failure
Pause payout → manual reconcile → fix root cause → 100% match → resume

### 5.3 Double booking
Identify conflict → contact both buyers 2h → refund per policy → fix lock → concurrent test

### 5.4 AI content pháp lý sai
Gỡ content → review guardrail → notify tenant → re-eval → steering report

### 5.5 AI Agent gửi nhầm cho khách
Kill switch agent → recall if possible → root cause → enforce approve-to-send → post-mortem

### 5.6 Escrow release sai (Phase 5)
Freeze escrow → manual review → legal assessment → fix workflow → audit replay

### 5.7 Marketplace fraud (agency giả)
Suspend agency → anti-fraud graph analysis → KYC re-verify → policy update

---

## 6. Quy trình quản lý rủi ro

| Hoạt động | Tần suất | Owner |
|-----------|----------|-------|
| Risk review | Weekly (P1), Bi-weekly (P2+), Monthly (P5+) | PM + Tech Lead |
| Risk register update | End of sprint | PM |
| Pen test | Before each phase gate | Security |
| Reconciliation test | Daily automated | DevOps |
| DR drill | Quarterly | DevOps |
| AI eval review | Bi-weekly (Phase 3+) | AI Lead |
| Legal/compliance review | Monthly (Phase 5+) | Legal |
| Steering risk report | Monthly | PM |

---

## 7. Liên kết tài liệu

| Tài liệu | File |
|----------|------|
| Kế hoạch dự án | `Ke-hoach-du-an.md` |
| Phạm vi công việc | `Pham-vi-cong-viec.md` |
| Timeline sơ bộ | `Timeline-so-bo.md` |
| **Roadmap vận hành** | `Ke-hoach-du-an.md` §13 · `Pham-vi-cong-viec.md` §13 |
