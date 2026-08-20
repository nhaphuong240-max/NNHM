# Phạm vi công việc — WEREAL PropTech SaaS

> **Phiên bản:** 2.0 | **Ngày:** 28/07/2026  
> **Dự án:** WEREAL — Real Estate Operating System (REOS)

---

## 1. Mục đích tài liệu

Xác định **in-scope / out-of-scope**, **deliverables** và **acceptance criteria** cho toàn bộ 6 phase (26 tháng), bao gồm tính năng hoàn thiện (Phase 1–4) và nâng cao đẳng cấp (Phase 5–6).

---

## 2. Tóm tắt phạm vi

| Hạng mục | Mô tả |
|----------|-------|
| **Tên dự án** | WEREAL — Real Estate Operating System |
| **Loại sản phẩm** | Multi-tenant SaaS B2B2C + Marketplace + Embedded Finance |
| **Phạm vi địa lý** | Việt Nam (Phase 1–5); multi-country prep (Phase 6) |
| **Ngôn ngữ UI** | Tiếng Việt (Phase 1); EN (Phase 3); đa ngôn ngữ (Phase 6) |
| **Thời hạn** | 26 tháng (6 phase) — `Timeline-so-bo.md` |
| **North star** | GMV đi qua platform |

---

## 3. Stakeholders

| Stakeholder | Kênh | Nhu cầu |
|-------------|------|---------|
| **Buyer** | Public Portal, Buyer App | AI discovery, booking, payment, track deal |
| **Sale/Agent** | Agent Portal, Mobile | CRM, AI copilot/agent, chốt deal hiện trường |
| **Developer** | Developer Portal | Golden Record, policy, forecast, agency marketplace |
| **Agency Admin** | Agent Portal + Marketplace | Lead pool, commission, distribution rights |
| **Ops/Admin** | Admin Portal | Moderation, dispute, audit, trust |
| **Platform Operator** | Admin + Billing | Tenant, GMV, SLA, partner management |
| **Partners** | API Marketplace | Bank, e-sign, valuation, ERP integrations |

---

## 4. Module lõi — Golden Record & Product Graph

| # | Chức năng | Phase | Mô tả |
|---|-----------|-------|-------|
| GR1 | Golden Record (Unit master) | 1 | Unit gốc từ Developer — nguồn chuẩn duy nhất |
| GR2 | Product Graph | 1 | Developer→Project→Phase→Building→Unit quan hệ graph |
| GR3 | Listing anti-drift | 1 | Agent listing bám unit gốc; block/flag khi lệch giá hoặc trạng thái |
| GR4 | Price/inventory/policy versioning | 1 | Snapshot mọi thay đổi; immutable history |
| GR5 | Time-travel query | 2 | Truy vấn trạng thái bảng hàng tại thời điểm T |
| GR6 | Distribution policy graph | 2 | Developer cấp quyền bán cho Agency theo project/khu vực |
| GR7 | Verified Listing Badge | 1 | Badge khi listing khớp Golden Record + media verified |
| GR8 | Bulk import bảng hàng | 2 | Excel/CSV import + validation + diff report |

---

## 5. Phạm vi theo lớp kiến trúc (9 lớp)

### 5.1 L1 — Experience Layer

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| E1 | Public Portal | 1 | Search, facet, geo, detail, lead, compare, AI concierge (Phase 3) |
| E2 | Agent Portal | 1 | CRM, pipeline, listing, booking, payment, AI copilot |
| E3 | Admin/Ops Portal | 1 | Tenant, moderation, audit, dispute queue, trust config |
| E4 | Developer Portal | 2 | Project, bảng hàng, policy, absorption, agency management |
| E5 | Mobile App (Sale) | 2 | Lead, booking, camera, offline, geo check-in, voice-to-CRM |
| E6 | Buyer App (native) | 3 | Favorites, price alert, booking, payment, deal tracking |
| E7 | Immersive Discovery | 6 | 3D tour/digital twin, map intelligence gắn unit ID |
| E8 | White-label Portal | 4 | Custom branding, subdomain, theme per tenant |
| E9 | Real-time UI updates | 1 | SSE/WebSocket: unit status, lead, booking live |
| E10 | Responsive / PWA | 1–2 | Tablet/mobile web; PWA offline-read (Phase 2) |

### 5.2 L2 — Identity & Access

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| I1 | Auth JWT + refresh | 1 | Email/password, session |
| I2 | RBAC + ABAC | 1–2 | Role + project/region scope |
| I3 | Tenant context middleware | 1 | Enforce mọi API |
| I4 | MFA/OTP | 1 | Payment, e-sign, admin |
| I5 | KYC/KYB | 2 | Agency/Developer verification |
| I6 | SSO Enterprise | 4 | SAML/OIDC |
| I7 | Zero-trust service auth | 4 | mTLS nội bộ service (Phase 4+) |

### 5.3 L3 — Domain Application

#### Tenant & Marketplace

| # | Chức năng | Phase |
|---|-----------|-------|
| T1 | Tenant onboarding (Dev/Agency) | 1 |
| T2 | Tenant hierarchy | 1 |
| T3 | Subscription & entitlements | 2 |
| T4 | Tenant branding | 2 |
| T5 | Dev–Agency Marketplace (apply/approve) | 2 |
| T6 | Agency leaderboard & compliance score | 3 |
| T7 | Marketplace full (ranking, SLA, penalty) | 6 |

#### Inventory & Listing

| # | Chức năng | Phase |
|---|-----------|-------|
| P1–P8 | Golden Record modules (GR1–GR8) | 1–2 |
| L1 | Marketing listing trên Golden Record | 1 |
| L2 | Media asset management | 1 |
| L3 | Approval workflow | 1 |
| L4 | Duplicate detection | 2 |
| L5 | Content moderation queue | 2 |
| L6 | Real-time inventory lock (Redis atomic) | 1 |
| L7 | Inventory SSE broadcast | 1 |

#### CRM & Omnichannel

| # | Chức năng | Phase |
|---|-----------|-------|
| C1 | Lead capture (form, portal, import) | 1 |
| C2 | Lead routing (rule + AI scoring) | 1 |
| C3 | CRM activities + timeline | 1 |
| C4 | SLA & reminders | 2 |
| C5 | Campaign attribution | 3 |
| C6 | Zalo OA/ZNS integration | 2 |
| C7 | Meta Lead Ads sync | 2 |
| C8 | SMS gateway | 2 |
| C9 | Omnichannel unified inbox | 3 |

#### Booking & Transaction

| # | Chức năng | Phase |
|---|-----------|-------|
| B1 | Reservation / giữ chỗ + expiry | 1 |
| B2 | Event-sourced state machine | 1 |
| B3 | Domain events (UnitViewed, PaymentConfirmed, v.v.) | 1 |
| B4 | Deposit management | 1 |
| B5 | Contract generation | 2 |
| B6 | E-sign integration | 2 |
| B7 | Cancellation / refund + ledger reversal | 1 |
| B8 | Custom workflow per tenant | 4 |
| B9 | Transaction replay (dispute evidence) | 2 |

#### Commission & Settlement

| # | Chức năng | Phase |
|---|-----------|-------|
| M1 | Commission policy snapshot | 2 |
| M2 | Split rules (multi-agent/agency) | 2 |
| M3 | Holdback & dispute hold | 2 |
| M4 | Settlement batch + payout | 2 |
| M5 | Export kế toán | 2 |
| M6 | Auto split payout qua ledger | 5 |

#### Compliance (trong Domain)

| # | Chức năng | Phase |
|---|-----------|-------|
| A1 | System-wide audit trail | 1 |
| A2 | AI action log | 1 |
| A3 | Payment action log | 1 |
| A4 | Approval workflow engine | 2 |
| A5 | Policy engine (OPA/Casbin) | 3 |

### 5.4 L4 — Data & Workflow

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| D1 | PostgreSQL + RLS | 1 | DB chính |
| D2 | Event Store (append-only) | 1 | Domain events, transaction replay |
| D3 | Kafka + Outbox pattern | 1–2 | Reliable event publishing |
| D4 | CQRS (inventory write/read split) | 3 | Real-time search sync |
| D5 | OpenSearch (full-text, facet, geo) | 1 | Search layer |
| D6 | CDC → Search (< 1s Phase 3) | 1–3 | Near-real-time index |
| D7 | Redis (cache, lock, session) | 1 | Distributed inventory lock |
| D8 | Object storage | 1 | Media, documents |
| D9 | Data warehouse + ETL | 3 | Analytics, feature store feed |
| D10 | Schema registry / data contract | 3 | API ↔ warehouse consistency |
| D11 | Multi-region replication | 4 | DR + latency |

### 5.5 L5 — AI Layer

| # | Use case | Phase | Mô tả |
|---|----------|-------|-------|
| AI1 | Content copilot | 1 | Listing copy, headline A/B, project summary |
| AI2 | Lead scoring | 1 | Behavior + profile scoring |
| AI3 | RAG knowledge assistant | 2 | Legal, policy, FAQ với citation |
| AI4 | Buyer-product matching | 2 | Recommendation có giải thích |
| AI5 | **Sales Agent** (approve-to-send) | 3 | Draft reply, follow-up, script |
| AI6 | **Ops Agent** | 3 | Flag anomaly listing/lead/payment |
| AI7 | **Compliance Agent** | 3 | So khớp listing vs legal doc |
| AI8 | **Developer Agent** | 3 | Absorption insight, pricing suggest |
| AI9 | **Buyer Concierge** | 3 | Conversational discovery |
| AI10 | Pricing intelligence | 3 | Anomaly, competitive block/floor |
| AI11 | Fraud / anti-fraud graph | 3 | Spam ring, fake listing, payment fraud |
| AI12 | Feature store | 3 | Production ML features |
| AI13 | Eval pipeline + A/B | 2–3 | Model/prompt quality |
| AI14 | Recommendation engine | 6 | Advanced personalization |

**Thành phần bắt buộc (Phase 1):** AI Gateway | Prompt registry | Guardrails | Human-in-the-loop | Cost/latency logging

### 5.6 L6 — Payment & Finance Layer

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| PAY1 | Payment orchestration | 1 | 1 gateway → multi-gateway |
| PAY2 | PaymentIntent, Invoice, Receipt, Refund | 1 | Payment objects |
| PAY3 | Double-entry ledger | 1 | Debit/credit, reference, tenant |
| PAY4 | Webhook idempotent handler | 1 | Signature verify, retry |
| PAY5 | Escrow / cọc / giữ chỗ | 1 | Gắn booking state |
| PAY6 | Refund / ledger reversal | 1 | Partial/full refund |
| PAY7 | Daily reconciliation | 1 | Auto-match provider |
| PAY8 | Dunning / failed payment | 2 | Retry, notify, escalate |
| PAY9 | Commission payout batch | 2 | Settlement |
| PAY10 | Multi-gateway routing + fallback | 3 | Gateway A/B/C |
| PAY11 | Chargeback management | 3 | Case tracking |
| PAY12 | **Smart Escrow** | 5 | Release theo điều kiện pháp lý |
| PAY13 | **BNPL / trả góp đợt** | 5 | Partner finance integration |
| PAY14 | **Mortgage pre-qual** | 5 | Bank API |
| PAY15 | **Split payout** | 5 | Auto commission split |

### 5.7 L7 — Intelligence Layer

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| AN1 | KPI dashboard | 1 | Funnel, lead, booking |
| AN2 | GMV dashboard | 2 | Gross merchandise value tracking |
| AN3 | Inventory absorption | 2 | Sell-through by project/block |
| AN4 | Broker performance scorecard | 2 | Agent ranking |
| AN5 | Campaign attribution | 3 | Source → conversion → revenue |
| AN6 | **Absorption forecast** (30/60/90d) | 3 | Predictive |
| AN7 | Price trend analysis | 3 | Geo/block trend |
| AN8 | Market heatmap | 4 | Demand/supply map |
| AN9 | Executive reports | 4 | C-level dashboard |
| AN10 | **Market Data Product** | 6 | Bán report/heatmap cho bên thứ 3 |

### 5.8 L8 — Trust & Compliance Layer

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| TR1 | Verified Listing Badge | 1 | Golden Record match |
| TR2 | Document vault + watermark | 2 | Legal doc protection |
| TR3 | Access log per document | 2 | Who viewed what when |
| TR4 | Dispute Resolution Center | 3 | Ticket + evidence pack + SLA |
| TR5 | Regulatory Export Pack | 4 | Export theo mẫu cơ quan |
| TR6 | Anti-fraud graph | 3 | Entity relationship fraud detection |
| TR7 | Content compliance auto-check | 3 | AI Compliance Agent integration |
| TR8 | Immutable audit (5+ năm retention) | 1 | Legal defensibility |

### 5.9 L9 — Network & Ecosystem Layer

| # | Hạng mục | Phase | Mô tả |
|---|----------|-------|-------|
| NW1 | Zalo OA/ZNS hub | 2 | Lead, OTP, notify |
| NW2 | Meta Lead Ads connector | 2 | Auto-sync + attribution |
| NW3 | Webhook platform (outbound) | 3 | Tenant custom webhooks |
| NW4 | API Marketplace v1 | 4 | Partner registration, API key, billing |
| NW5 | Bank/e-sign/valuation integrations | 4–5 | Partner adapters |
| NW6 | API Marketplace v2 + revenue share | 6 | Ecosystem scale |
| NW7 | ERP export connectors | 4 | Accounting sync |

---

## 6. Data model — thực thể đầy đủ

### Phase 1 (Core)
```
Tenant, User, Role, Permission, Organization
Developer, Agency, Project, Phase, Building, Unit (Golden Record)
Listing, MediaAsset, Document, InventorySnapshot, PriceVersion
Lead, CRMActivity, Campaign, Booking, Reservation, Deposit
Payment, PaymentIntent, Refund, LedgerEntry, AuditEvent, DomainEvent
AIInsight, AIActionLog
```

### Phase 2+
```
DistributionPolicy, AgencyApplication, CommissionPolicy, Commission, Settlement
Contract, Approval, DisputeCase, DocumentAccessLog
Notification, OmnichannelMessage (Zalo/Meta/SMS)
Subscription, PlanEntitlement, UsageMetric
```

### Phase 3+
```
FeatureRecord, FraudSignal, ForecastModel, AttributionTouch
AIAgentRun, EvalResult
```

### Phase 5+
```
EscrowAccount, BNPLPlan, MortgagePreQual, ChargebackCase, SplitPayout
```

### Versioning bắt buộc
Giá | Tồn kho | Chính sách bán | Tài liệu pháp lý | Quyền phân phối | Marketing content | Trạng thái giao dịch | Commission policy

---

## 7. Hạ tầng & DevOps

| # | Hạng mục | Phase |
|---|----------|-------|
| INF1 | Cloud/VPS prod + staging | 1 |
| INF2 | CI/CD + automated test | 1 |
| INF3 | API Gateway (rate limit, versioning) | 1 |
| INF4 | CDN + WAF | 1 |
| INF5 | OpenTelemetry observability | 1 |
| INF6 | HA load balancer | 2 |
| INF7 | Backup & DR (RPO 24h → 1h) | 1→4 |
| INF8 | SAST/DAST + pen test | 1 (mỗi phase gate) |
| INF9 | Load test gate | Mỗi phase |
| INF10 | Multi-region | 4 |
| INF11 | Service mesh / mTLS | 4 |

---

## 8. Out-of-scope

| # | Hạng mục | Ghi chú |
|---|----------|---------|
| O1 | Tự xây payment gateway | Dùng provider |
| O2 | Tự train foundation LLM | Dùng LLM provider + fine-tune nhẹ Phase 3+ |
| O3 | ERP thay thế hoàn toàn | Chỉ export/sync |
| O4 | Quản lý thi công/xây dựng | Ngoài REOS |
| O5 | Blockchain smart contract | Không yêu cầu — dùng event store thay thế |
| O6 | Call center VoIP sâu | Phase 6+ nếu CR |
| O7 | Migration legacy | Dự án riêng |
| O8 | Content/SEO agency | Platform cung cấp tool |
| O9 | Tư vấn pháp lý | Platform hỗ trợ workflow |
| O10 | IoT smart building | Ngoài phạm vi |

---

## 9. Deliverables theo phase

### Phase 1 — MVP (T8–T12/2026)
D-P1-01 → D-P1-18: Monolith API, Golden Record schema, RLS, Event Store, Public/Agent/Admin portals, Search, Payment+Ledger, Real-time inventory lock, AI copilot+scoring, Verified Listing, Audit, KPI dashboard, CI/CD, UAT, Runbook

### Phase 2 — Scale (T1–T4/2027)
D-P2-01 → D-P2-15: Developer Portal, Commission OS, Settlement, E-sign, Mobile App, Omnichannel (Zalo/Meta), Dev–Agency marketplace cơ bản, Service split (Payment/Search/Notification), AI RAG+matching, Time-travel query, Subscription billing, KYC/KYB

### Phase 3 — Intelligence & Trust (T5–T9/2027)
D-P3-01 → D-P3-14: Warehouse+ETL, CQRS+CDC, AI Agents (4 loại), Buyer App, Buyer Concierge, Absorption forecast, Fraud graph, Dispute Center, Campaign attribution, Multi-gateway, AI service split, Feature store, Omnichannel inbox

### Phase 4 — Enterprise (T10/2027–T2/2028)
D-P4-01 → D-P4-10: SSO, White-label, Workflow engine, Multi-region, Heatmap, Forecast engine, API Marketplace v1, Regulatory Export, Executive dashboard, SLA 99.9%

### Phase 5 — Embedded Finance (T3–T6/2028)
D-P5-01 → D-P5-08: Smart Escrow, BNPL, Mortgage pre-qual, Split payout, Chargeback advanced, Financial compliance pack, Partner bank integration, GMV finance dashboard

### Phase 6 — Network & Data Product (T7–T10/2028)
D-P6-01 → D-P6-08: Marketplace full, Market Data Product, API Marketplace v2, 3D/Immersive discovery, Recommendation engine, Multi-country prep, Network analytics, Platform v2.0 go-live

---

## 10. Acceptance Criteria

### Tiêu chí chung (mọi phase)
- 100% critical/high test pass; zero critical bug open
- Security review + pen test pass
- OpenAPI docs khớp implementation
- Runbook cập nhật

### SLA theo phase

| Metric | Phase 1 | Phase 3 | Phase 4+ |
|--------|---------|---------|----------|
| API P95 read | ≤ 500ms | ≤ 200ms | ≤ 150ms |
| Search P95 | ≤ 200ms | ≤ 100ms | ≤ 80ms |
| Inventory sync lag | ≤ 5s | ≤ 1s | ≤ 500ms |
| Uptime | 99.5% | 99.9% | 99.95% |

### Tiêu chí theo module (trích yếu)

| Module | Acceptance |
|--------|------------|
| **Golden Record** | Listing không drift giá; block/flag khi vi phạm |
| **Inventory Lock** | 100 concurrent booking test — zero double book |
| **Event Store** | Replay full transaction timeline cho dispute |
| **Payment/Ledger** | 100% daily reconciliation; idempotent webhook |
| **AI Guardrails** | 100% block AI mutate price/inventory |
| **Sales Agent** | Approve-to-send flow; zero auto-send without approval |
| **Omnichannel** | Zalo/Meta lead sync < 30s; attribution tracked |
| **Dispute Center** | Evidence pack auto-generated; SLA < 48h Phase 3 |
| **Escrow (P5)** | Release chỉ khi điều kiện pháp lý met; audit trail |
| **Marketplace (P6)** | Dev publish policy → Agency apply → approve → sell |

---

## 13. Roadmap nâng cấp vận hành (Operational Excellence)

> **Tham chiếu:** `Ke-hoach-du-an.md` §13 · `Tieu-chi-chap-nhan.md` §14

Bổ sung phạm vi **go-live và thắng cạnh tranh khi vận hành** — ngoài module tính năng ở §4–9.

### 13.1 P0 — MVP pilot (T8–T12/2026)

| ID | Deliverable | In-scope | Acceptance |
|----|-------------|----------|------------|
| OP-P0-1 | Vertical slice GR→Pay→Ledger | 1 deal path production | UAT-01→05 pass |
| OP-P0-2 | Concurrent booking load test | Redis lock + BK service | 0 double-book /1000 |
| OP-P0-3 | Daily reconciliation job | PAY + FIN portal | 100% match 7 ngày |
| OP-P0-4 | Runbook v1 | webhook fail, lock orphan, reconcile | G1.8 |
| OP-P0-5 | On-call + SLA dashboard | uptime, P95, payment queue | G1.12 |
| OP-P0-6 | Pilot playbook | 1 CĐT + 2 agency onboarding ≤ 5 ngày | G1.11 |

### 13.2 P1 — Stickiness (Phase 2)

Commission OS E2E · Omnichannel Zalo/Meta · Developer Portal live · Mobile agent beta · E-sign sandbox — chi tiết §Phase 2 trong `Ke-hoach-du-an.md`.

### 13.3 P2 — Trust & scale (Phase 3)

Dispute SLA < 48h · Regulatory export · CDC search < 1s · AI Ops approve-to-send.

### 13.4 P3 — Network moat (Phase 5–6)

Embedded finance · Dev–Agency marketplace · Data intelligence product · API ecosystem.

### 13.5 Out-of-scope cho đến khi P0 pass

- White-label, SSO enterprise (Phase 4)
- BNPL / escrow production (Phase 5)
- Multi-country (Phase 6)
- UC prototype-only không thuộc P0 vertical slice

---

## 14. Change Request

Mọi thay đổi phạm vi qua CR: submit → impact assessment → PO+Tech Lead approve → cập nhật 4 tài liệu → thông báo stakeholders.

---

## 15. Liên kết tài liệu

| Tài liệu | File |
|----------|------|
| Kế hoạch dự án | `Ke-hoach-du-an.md` |
| Danh sách rủi ro | `Danh-sach-rui-ro.md` |
| Timeline sơ bộ | `Timeline-so-bo.md` |
| Roadmap vận hành | `Ke-hoach-du-an.md` §13 |
| Tiêu chí thắng vận hành | `Tieu-chi-chap-nhan.md` §14 |
