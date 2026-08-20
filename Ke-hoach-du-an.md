# Kế hoạch dự án WEREAL

> **Nền tảng:** PropTech SaaS — Real Estate Operating System (REOS)  
> **Phiên bản tài liệu:** 2.1  
> **Ngày lập:** 28/07/2026 | **Cập nhật:** 28/07/2026  
> **Tham chiếu:** Kiến trúc hệ thống giao dịch sản phẩm cấp cao cho SaaS; Sơ đồ kiến trúc kỹ thuật chi tiết; Đề xuất nâng cao đẳng cấp

---

## 1. Tổng quan dự án

### 1.1 Tầm nhìn

WEREAL là **Operating System cho phân phối bất động sản (REOS)** — nền tảng SaaS đa tenant, AI-native, có lớp thanh toán chuẩn hóa, workflow giao dịch event-sourced và network marketplace tích hợp. Đây không phải website đăng tin mà là **transaction platform + data platform + distribution network** phục vụ chủ đầu tư, đại lý, sale và khách mua.

### 1.2 Ba hào kinh doanh (Competitive Moats)

| Moat | Mô tả | Đối thủ thiếu |
|------|-------|---------------|
| **Data Moat** | Golden Record — single source of truth cho bảng hàng, versioning, time-travel query | Marketplace chỉ có listing rời rạc |
| **Transaction Moat** | Booking → Payment → Ledger → Contract → Commission end-to-end trên platform | Portal/CRM không khóa được dòng tiền |
| **Network Moat** | Developer ↔ Agency marketplace, omnichannel VN, API ecosystem | Kênh phân phối tách rời, không có network effect |

### 1.3 Định vị sản phẩm

| Khía cạnh | Mô tả |
|-----------|-------|
| **Loại hình** | Multi-tenant PropTech SaaS B2B2C |
| **Đối tượng chính** | Developer, Agency, Sale/Môi giới, Buyer, Platform Operator |
| **Điểm khác biệt cốt lõi** | Golden Record — đại lý chỉ tạo lớp marketing, không drift khỏi dữ liệu gốc |
| **Giao dịch** | Event-sourced state machine + real-time inventory lock |
| **AI** | AI Workforce (Agent) có guardrails — không chỉ chatbot |
| **Tài chính** | Embedded finance: escrow, trả góp, mortgage pre-qual, split payout |
| **Trust** | Verified Listing, Dispute Center, Regulatory Export — compliance là sản phẩm |

### 1.4 Mục tiêu dự án

#### Mục tiêu kinh doanh
- Xây dựng REOS có thể scale theo tenant và GMV (Gross Merchandise Value)
- Chuẩn hóa quy trình booking → cọc → ký → thanh toán → đối soát → hoa hồng
- Tạo network effect Developer–Agency trong platform
- North star metric: **GMV đi qua platform**, không phải số listing
- Doanh thu đa dạng: subscription, transaction fee, payment processing, AI usage, data intelligence, settlement fee

#### Mục tiêu kỹ thuật
- Kiến trúc 9 lớp (mở rộng từ 7 lớp gốc + Trust + Network/Ecosystem)
- Golden Record & Product Graph với time-travel query
- Event sourcing cho transaction timeline
- Real-time inventory sync (< 1 giây Phase 3+)
- Payment orchestration + double-entry ledger + embedded finance
- AI Agent workforce qua service trung gian, guardrails, human-in-the-loop
- Omnichannel native: Zalo OA/ZNS, Meta Lead Ads, SMS
- SLA enterprise: 99.9% uptime, P95 API < 200ms

---

## 2. Kiến trúc tổng thể

### 2.1 Chín lớp kiến trúc

```
┌──────────────────────────────────────────────────────────────────┐
│  L1: Experience Layer                                            │
│  Public Portal | Agent | Developer | Admin | Buyer App | Mobile│
│  Immersive Discovery (3D/Map) | White-label Portal               │
├──────────────────────────────────────────────────────────────────┤
│  L2: Identity & Access Layer                                     │
│  SSO/JWT | KYC/KYB | RBAC/ABAC | MFA | E-Sign | Zero-trust       │
├──────────────────────────────────────────────────────────────────┤
│  L3: Domain Application Layer                                    │
│  Golden Record | Product Graph | Listing | CRM | Booking         │
│  Transaction Engine | Commission | Compliance | Billing          │
│  Marketplace (Dev↔Agency) | Workflow Engine                      │
├──────────────────────────────────────────────────────────────────┤
│  L4: Data & Workflow Layer                                       │
│  PostgreSQL+RLS | CQRS | Event Bus (Kafka) | Event Store         │
│  Search (OpenSearch) | Object Storage | Redis | CDC | Warehouse  │
├──────────────────────────────────────────────────────────────────┤
│  L5: AI Layer                                                    │
│  AI Gateway | RAG | Vector DB | Copilot | Lead Scoring           │
│  AI Agents (Sales/Ops/Compliance/Dev) | Feature Store | Eval     │
├──────────────────────────────────────────────────────────────────┤
│  L6: Payment & Finance Layer                                     │
│  Orchestration | Ledger | Escrow | Refund | Settlement           │
│  BNPL | Mortgage Pre-qual | Split Payout | Reconciliation        │
├──────────────────────────────────────────────────────────────────┤
│  L7: Intelligence Layer                                          │
│  KPI | Funnel | Attribution | Absorption Forecast | Heatmap      │
│  Pricing Intelligence | Broker Scorecard | Executive Reports     │
├──────────────────────────────────────────────────────────────────┤
│  L8: Trust & Compliance Layer                                    │
│  Verified Listing | Document Vault | Watermark | Dispute Center│
│  Regulatory Export | Anti-fraud Graph | AI Action Audit          │
├──────────────────────────────────────────────────────────────────┤
│  L9: Network & Ecosystem Layer                                   │
│  Omnichannel Hub (Zalo/Meta/SMS) | API Marketplace               │
│  Partner Integrations (Bank/E-sign/Valuation) | Webhook Platform │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Golden Record & Product Graph

```
Developer → Project → Phase → Building → Unit (Golden Record)
    ↓           ↓
 Policy     Legal Doc ──→ Version Snapshot (time-travel)
    ↓
 Distribution Policy → Agency (Marketplace)
    ↓
 Agency → Listing (marketing layer only — anti-drift)
    ↓
 Lead → Journey → Booking → Payment → Contract → Commission
         ↓
    Domain Events (event-sourced audit trail)
```

**Nguyên tắc Golden Record:**
- Listing không thể lệch giá/tồn kho so với unit gốc — auto-block hoặc flag
- Mọi thay đổi giá, policy, tồn kho đều versioned
- Time-travel query: truy vết trạng thái dữ liệu tại bất kỳ thời điểm nào
- Một unit truy vết end-to-end: ai xem → ai tư vấn → ai giữ chỗ → ai nhận hoa hồng

### 2.3 Mô hình multi-tenant

| Cấp tenant | Vai trò |
|------------|---------|
| **Platform tenant** | Hệ thống mẹ |
| **Developer tenant** | Mỗi chủ đầu tư |
| **Agency tenant** | Mỗi công ty đại lý |
| **Branch tenant** | Chi nhánh |
| **User scope** | Từng sale/môi giới |

**Nguyên tắc bắt buộc:** `tenant_id` mọi bảng | tenant context mọi API | auto-filter query | audit mọi mutation | idempotent webhook

### 2.4 Stack công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js / React |
| Mobile | React Native / Flutter |
| Backend API | NestJS / FastAPI |
| Database | PostgreSQL (RLS) + Event Store |
| Cache/Lock | Redis (distributed lock) |
| Search | OpenSearch / Elasticsearch |
| Queue/Event | Kafka + Outbox pattern |
| Workflow | Temporal / Camunda (Phase 4) |
| Policy | OPA / Casbin (ABAC) |
| Storage | S3-compatible |
| BI | Metabase / Superset |
| AI | LLM Gateway + Vector DB + RAG + Feature Store |
| Observability | OpenTelemetry (logs, metrics, traces) |

---

## 3. Chiến lược triển khai — 6 Phase (26 tháng)

### Phase 1 — MVP Foundation (T8–T12/2026)
**Mục tiêu:** Giao dịch end-to-end + Golden Record cơ bản + tenant pilot.

| Thành phần | Nội dung |
|------------|----------|
| Core | Tenant, Golden Record/Unit, Listing anti-drift, CRM, Booking, Payment+Ledger |
| Real-time | Inventory lock atomic, SSE push trạng thái unit |
| AI | Content copilot + Lead scoring + guardrails |
| Trust | Audit trail, Verified Listing badge cơ bản |
| Portal | Public + Agent + Admin |

### Phase 2 — Scale & Distribution (T1–T4/2027)
**Mục tiêu:** Commission OS, omnichannel, developer portal, mobile.

- Developer Portal + Commission & Settlement đầy đủ
- Omnichannel Hub: Zalo OA/ZNS, Meta Lead Ads sync
- Mobile App sale (offline mode, geo check-in, voice-to-CRM)
- Developer–Agency distribution policy & marketplace cơ bản
- Tách Payment, Search, Notification service
- AI RAG knowledge assistant + buyer-product matching
- Contract + E-sign

### Phase 3 — Intelligence & Trust (T5–T9/2027)
**Mục tiêu:** Data platform, AI nâng cao, trust layer hoàn chỉnh.

- Data warehouse + CDC + ETL pipeline
- AI Agents: Sales Agent (approve-to-send), Ops Agent, Compliance Agent
- Predictive absorption forecast + campaign attribution
- AI pricing intelligence + fraud/anomaly detection (anti-fraud graph)
- Trust Layer: Document vault, watermark, Dispute Resolution Center
- Buyer App native + AI conversational discovery
- Real-time inventory sync < 1 giây (CQRS + CDC → Search)
- Multi payment gateway routing

### Phase 4 — Enterprise (T10/2027–T2/2028)
**Mục tiêu:** Enterprise-ready, white-label, custom workflow.

- SSO enterprise (SAML/OIDC)
- White-label portal + custom branding
- Workflow engine (Temporal) — custom workflow per tenant
- Multi-region deployment, SLA 99.9%
- Market heatmap + forecast engine
- API Marketplace v1 (partner integrations)
- Regulatory Export Pack

### Phase 5 — Embedded Finance (T3–T6/2028)
**Mục tiêu:** GMV đi qua platform qua dòng tiền.

- Smart Escrow (giữ cọc đến đủ điều kiện pháp lý)
- Trả góp đợt / BNPL (tích hợp đối tác tài chính)
- Mortgage pre-qualification (API ngân hàng)
- Split payout tự động (commission qua ledger)
- Chargeback management nâng cao
- Financial compliance & licensing review

### Phase 6 — Network & Data Product (T7–T10/2028)
**Mục tiêu:** Network effect + data monetization.

- Developer–Agency Marketplace đầy đủ (apply, approve, leaderboard)
- Market Data Product (heatmap, pricing report bán cho developer)
- API ecosystem mở rộng (valuation, interior, ERP)
- Immersive discovery: 3D tour/digital twin gắn unit ID
- Multi-country expansion prep
- Recommendation engine nâng cao

---

## 4. Luồng giao dịch cốt lõi

### 4.1 Event-sourced state machine

```
Domain Events:
UnitViewed → LeadCaptured → LeadQualified → LeadScored → AgentAssigned
→ BookingCreated → InventoryLocked → PaymentIntentCreated
→ PaymentConfirmed → LedgerEntryWritten → ContractGenerated
→ ContractSigned → DealCompleted → CommissionCalculated → SettlementTriggered
                                    ↓
              BookingCancelled / Expired / Refunded (with ledger reversal)
```

**Trạng thái (state machine):**
```
Draft → Published → Viewed → Qualified → Contacted → Scheduled
  → Reserved → Deposit Pending → Deposited → Contract Drafted
  → Contract Signed → Completed
                                    ↓
              Cancelled / Expired / Refunded
```

### 4.2 Luồng chuẩn (12 bước + event trail)

1. Khách tìm kiếm (AI concierge hoặc search/filter) trên Public Portal
2. Query Search Index (CDC sync real-time từ Golden Record)
3. Chọn unit → Lead capture + campaign attribution
4. AI lead scoring + phân công agent (rule + AI)
5. Agent tư vấn (AI Sales Agent draft reply, human approve)
6. Tạo booking → atomic inventory lock
7. Sinh PaymentIntent → gateway
8. Webhook idempotent → cập nhật payment state
9. Ghi ledger (double-entry) + emit domain event
10. Sinh hợp đồng → e-sign
11. Chốt deal → commission policy snapshot → settlement batch
12. BI pipeline + AI feature store learning

---

## 5. AI Workforce — chiến lược AI đẳng cấp

| Agent | Chức năng | Human-in-the-loop |
|-------|-----------|-------------------|
| **Sales Agent** | Draft reply, follow-up schedule, call script | Agent approve trước gửi |
| **Ops Agent** | Flag listing drift, spam lead, payment anomaly | Ops xác nhận |
| **Compliance Agent** | So khớp listing vs tài liệu pháp lý | Auto-block nếu vi phạm nặng |
| **Developer Agent** | Absorption report, pricing suggestion, campaign ROI | Developer approve |
| **Buyer Concierge** | Conversational search, so sánh unit, gợi ý sản phẩm | Read-only, không mutate |

**Nguyên tắc AI bất biến:**
- AI không truy cập trực tiếp DB — qua service layer
- AI không tự ý sửa giá, tồn kho, tạo giao dịch
- Mọi AI action đều log (prompt, response, cost, latency)
- Tenant-isolated vector index

---

## 6. Cấu trúc tổ chức dự án

| Vai trò | Trách nhiệm |
|---------|-------------|
| **Product Owner** | Vision, backlog, moat prioritization, GMV metrics |
| **Tech Lead / Architect** | 9-layer architecture, ADR, Golden Record, event sourcing |
| **Backend Team** | Domain services, workflow engine, payment, marketplace |
| **Frontend Team** | Portals, Buyer App, white-label, immersive UI |
| **Mobile Team** | Sale app (offline, geo, voice-to-CRM) |
| **AI/ML Team** | Agents, RAG, scoring, feature store, eval pipeline |
| **Data Engineer** | Warehouse, CDC, ETL, analytics (Phase 3+) |
| **DevOps/SRE** | CI/CD, observability, multi-region, SLA |
| **QA** | Automation, load test, UAT |
| **BA/Compliance/Legal** | Workflow, trust layer, regulatory export |
| **Partnership** | Payment gateway, bank, e-sign, Zalo/Meta (Phase 2+) |

---

## 7. Tiêu chí thành công (Definition of Done)

### Phase 1 — MVP
- [ ] Golden Record: unit gốc + listing anti-drift
- [ ] Tenant onboarding (Developer + Agency)
- [ ] Real-time inventory lock (atomic, concurrent test pass)
- [ ] Event-sourced transaction timeline
- [ ] Booking → Payment → Ledger end-to-end (100% reconciliation)
- [ ] AI copilot + lead scoring + guardrails verified
- [ ] Verified Listing badge cơ bản
- [ ] Audit log toàn hệ thống
- [ ] UAT pass ≥ 1 tenant pilot
- [ ] SLA uptime ≥ 99.5%

### Phase 3+ — Platform đẳng cấp
- [ ] Inventory sync search < 1 giây
- [ ] AI Sales Agent approve-to-send adoption ≥ 60% agents
- [ ] Absorption forecast accuracy ≥ 80% (30-day)
- [ ] Dispute resolution SLA < 48 giờ
- [ ] GMV tracking live trên executive dashboard

### KPI North Star & vận hành

| KPI | Phase 1 | Phase 3 | Phase 6 |
|-----|---------|---------|---------|
| GMV qua platform | Baseline | +50% YoY | +200% YoY |
| Listing creation time | -40% (AI) | -60% | -70% |
| Lead response (hot) | < 15 phút | < 5 phút | < 2 phút |
| Booking → deposit rate | +10% | +25% | +40% |
| Payment reconciliation | 100% daily | 100% realtime | 100% realtime |
| Inventory sync lag | < 5s | < 1s | < 500ms |
| Agent platform adoption | 70% | 85% | 95% |
| NPS (Developer) | ≥ 40 | ≥ 50 | ≥ 60 |
| API P95 latency | < 500ms | < 200ms | < 150ms |
| Uptime | 99.5% | 99.9% | 99.95% |

---

## 8. Mô hình doanh thu

| Nguồn thu | Phase | Mô tả |
|-----------|-------|-------|
| Subscription theo tenant | 1+ | Gói theo agent, project, feature tier |
| Phí theo sản phẩm/unit | 1+ | Per unit managed trên Golden Record |
| Phí theo lead/booking | 1+ | Quota vượt mức |
| **Platform transaction fee** | 1+ | % trên GMV giao dịch thành công |
| Payment processing fee | 1+ | Spread trên cọc/thanh toán đợt |
| AI usage fee | 1+ | Token/agent request vượt quota |
| Settlement/payout fee | 2+ | Phí chi hoa hồng tự động |
| Enterprise/white-label | 4+ | Setup + SLA premium |
| **Data intelligence product** | 3+ | Heatmap, pricing report, market brief |
| API marketplace revenue share | 4+ | Partner integration fee |
| Embedded finance fee | 5+ | BNPL/mortgage referral, escrow fee |

---

## 9. Ma trận cạnh tranh

### 9.1 Lợi thế chuyên nghiệp hiện tại (spec + prototype v2.1)

So với marketplace VN, CRM đại lý và phần mềm bảng hàng nội bộ, WEREAL **đã vượt ở tầm định nghĩa sản phẩm**:

| Hạng mục | WEREAL hiện có | Đối thủ điển hình |
|----------|----------------|-------------------|
| BA & traceability | 78 UC / 73 SCR, Excel ~160 sheet, 24 UC deep-spec P0 | Mockup lẻ, không trace FR→TC |
| Kiến trúc REOS | Golden Record + 9 lớp + 3 moat (Data · Transaction · Network) | Listing rời hoặc CRM note |
| Portal coverage | 7 portal (gồm **Portal Chủ đầu tư**) | Thiếu developer portal |
| Design system | Tokens v2.1, Figma Variables, `/design-system` | UI không thống nhất |
| Transaction vision | Event-sourced BK→PAY→COM đã spec | Giao dịch ngoài hệ thống |

### 9.2 Khoảng cách prototype → vận hành thật

| Hạng mục | Trạng thái | Rủi ro nếu go-live sớm |
|----------|------------|------------------------|
| Backend production (GR lock, PAY, ledger) | Chưa triển khai | Double-book, mất cọc |
| Real-time SSE / search CDC | Spec only | Agent thấy còn hàng, buyer hết |
| Pilot tenant UAT | Chưa | Workflow thật lệch spec |
| Omnichannel Zalo/Meta | Pending Phase 2 | Lead rò ra spreadsheet |
| SRE runbook + on-call | Kế hoạch | Sự cố payment = mất tenant |

**Nguyên tắc:** Chuyên nghiệp trên giấy chỉ thắng vận hành khi **3 trụ cột production** chạy thật: không double-book · không lệch sổ · timeline tranh chấp đầy đủ.

### 9.3 Ma trận cạnh tranh (target state)

| Tiêu chí | Marketplace VN | CRM BĐS | WEREAL hiện tại | WEREAL Phase 1 | WEREAL Phase 6 |
|----------|----------------|---------|-----------------|----------------|----------------|
| Golden Record / anti-drift | ❌ | ⚠️ | ✅ spec + prototype | ✅ production | ✅✅ time-travel |
| Transaction end-to-end | ❌ | ⚠️ | ✅ spec | ✅ | ✅✅ event-sourced |
| Ledger & reconciliation | ❌ | ❌ | ✅ spec | ✅ | ✅✅ realtime |
| BA / design maturity | ⚠️ | ⚠️ | ✅✅ | ✅✅ | ✅✅ |
| Production proven | ✅ | ✅ | ⚠️ prototype | ✅ pilot | ✅✅ scale |
| Commission auto-settlement | ❌ | ⚠️ | spec | Phase 2 | ✅✅ split payout |
| AI Agent workforce | ❌ | ⚠️ | spec | Copilot | ✅✅ multi-agent |
| Predictive analytics | ❌ | ⚠️ | spec | Phase 3 | ✅✅ forecast |
| Trust/Dispute center | ⚠️ | ❌ | spec | Basic | ✅✅ full product |
| Omnichannel VN (Zalo/Meta) | ⚠️ | ⚠️ | spec | Phase 2 | ✅✅ native |
| Embedded finance | ❌ | ❌ | spec | ❌ | ✅✅ escrow/BNPL |
| Dev–Agency marketplace | ❌ | ❌ | spec | ❌ | ✅✅ network effect |
| API ecosystem | ❌ | ⚠️ | OpenAPI 71 EP | Phase 4 | ✅✅ marketplace |

---

## 10. Quản trị dự án

### 10.1 Phương pháp
- Agile/Scrum — sprint 2 tuần
- Phase gate review cuối mỗi phase (6 gates)
- ADR cho: Golden Record, event sourcing, tenant isolation, payment, AI guardrails

### 10.2 Governance

| Hoạt động | Tần suất |
|-----------|----------|
| Sprint planning/review/retro | 2 tuần |
| Architecture review | Hàng tháng |
| Risk review | Hàng tuần (Phase 1), hàng tháng (Phase 2+) |
| Steering committee | Hàng tháng |
| GMV & moat review | Hàng quý (Phase 2+) |

### 10.3 Tài liệu bắt buộc

**Phân tích nghiệp vụ (BA) — hoàn thành v2.0**
- Tài liệu yêu cầu phần mềm (SRS)
- Danh sách use case / user story
- Tiêu chí chấp nhận
- Yêu cầu đã được xác nhận

**Thiết kế hệ thống (SD) — hoàn thành v1.0**
- Tài liệu thiết kế hệ thống (SDD)
- Sơ đồ kiến trúc
- Sơ đồ CSDL
- Thiết kế API
- Mockup / UI mẫu

**Quản lý dự án — hoàn thành v2.0**
- Phạm vi công việc v2.0
- Danh sách rủi ro v2.0
- Timeline sơ bộ v2.0 (26 tháng)

**Triển khai — kế hoạch**
- ~~ADR registry (5 ADR trong SDD §4)~~ → **`adr/`** — 5 ADR files + README registry
- ~~OpenAPI specification (từ `Thiet-ke-API.md`)~~ → **`openapi.yaml`** (71 endpoints, OpenAPI 3.1)
- Runbook: payment webhook, reconciliation, dispute, AI incident
- **Roadmap vận hành P0→P3:** `Ke-hoach-du-an.md` §13 · `Tieu-chi-chap-nhan.md` §14 (OP-WIN-01→15)

---

## 11. Phụ thuộc và giả định

### Giả định
- ≥ 1 Developer + 1 Agency pilot cam kết từ Phase 1
- Payment gateway sandbox sẵn sàng trước T10/2026
- Zalo OA / Meta Business API access (Phase 2)
- LLM provider SLA ổn định
- Team core ≥ 8 FTE Phase 1; ≥ 16 FTE Phase 4+

### Phụ thuộc bên ngoài
- Payment gateway, e-sign provider, bank/mortgage partner (Phase 5)
- Zalo/Meta API partnership
- Cloud infrastructure + CDN
- Legal review embedded finance (Phase 5)

---

## 12. Liên kết tài liệu

| Tài liệu | File |
|----------|------|
| Tài liệu yêu cầu phần mềm (SRS v2.0) | `Tai-lieu-yeu-cau-phan-mem.md` — 82 FR, 52 NFR, 6 personas |
| Use case / User story (v2.0) | `Danh-sach-use-case-user-story.md` — 58 UC, 132 US |
| Tiêu chí chấp nhận (v2.0) | `Tieu-chi-chap-nhan.md` — 117 TC, 15 UAT, Phase Gate P1–P6 |
| Yêu cầu đã xác nhận (v2.0) | `Yeu-cau-da-xac-nhan.md` — Baseline WEREAL-BL-2026-002 |
| **Tài liệu thiết kế hệ thống** | `Tai-lieu-thiet-ke-he-thong.md` — SDD, 18 modules, 5 ADR |
| **Sơ đồ kiến trúc** | `So-do-kien-truc.md` — C4, sequence, deployment, integration |
| **Sơ đồ CSDL** | `So-do-CSDL.md` — 35 bảng, ERD, RLS, event store |
| **Thiết kế API** | `Thiet-ke-API.md` — 71 endpoints Phase 1, webhook, BFF |
| **OpenAPI Specification** | `openapi.yaml` / `openapi.json` — OpenAPI 3.1, auto-generated |
| **ADR Registry** | `adr/` — 5 Architecture Decision Records (ADR-001→005) |
| **Mockup / UI mẫu** | `Mockup-UI-mau.md` — Design system, wireframe 4 portal |
| **UI Prototype (interactive)** | `prototype/` — v2.1, **78 UC**, 7 portals, `/design-system` |
| **Design System Spec** | `docs/specs/WEREAL-Design-System-Spec.md` |
| **BA Master Spec** | `docs/specs/WEREAL-BA-Master-Spec.md` |
| **Figma Variables export** | `design-tokens/figma/` — `scripts/export_figma_tokens.py` |
| **Quy trình phát triển** | `docs/dev/Quy-trinh-phat-trien.md` · Sprint P0 · `apps/api/` · **`apps/mobile/`** |
| Phạm vi công việc | `Pham-vi-cong-viec.md` |
| Danh sách rủi ro | `Danh-sach-rui-ro.md` |
| Timeline sơ bộ | `Timeline-so-bo.md` |

---

## 13. Roadmap nâng cấp vận hành — thắng tuyệt đối

> **North star vận hành:** GMV đi qua platform · switching cost cao · compliance là sản phẩm  
> **Tham chiếu chi tiết:** `Pham-vi-cong-viec.md` §13 · `Tieu-chi-chap-nhan.md` §14 · `WEREAL-BA-Master-Spec.md` §Operational backlog

### 13.1 P0 — Không được fail (T8–T12/2026, trước pilot)

Mục tiêu: **1 Developer + 2–3 Agency** chạy deal thật trên staging/production.

| # | Nâng cấp | Module / UC | Tiêu chí pass |
|---|----------|-------------|---------------|
| P0-1 | Golden Record **hard enforcement** (auto-block drift) | GR, LS | UC-GR-03, UC-LS-02 — zero publish khi lệch giá/tồn kho |
| P0-2 | Atomic inventory lock + TTL booking | BK, GR | UC-BK-01 — 0 double-book /1000 concurrent (G1.5) |
| P0-3 | SSE push trạng thái unit | GR, SYS | UC-GR-07 — lag ≤ 3s MVP |
| P0-4 | Payment idempotent webhook + reversal | PAY | UC-PAY-01→03 — 100% reconcile 7 ngày (G1.6) |
| P0-5 | Double-entry ledger | PAY, FIN | Finance portal daily match |
| P0-6 | Event-sourced transaction timeline + replay | BK, TR | UC-BK-04, UC-TR-01 — dispute evidence ≤ 1 click |
| P0-7 | Tenant RLS + audit mọi mutation | ID | UC-ID-01→04 — pen test zero Critical |
| P0-8 | Commission policy snapshot tại deal | COM | Immutable tại thời điểm chốt |
| P0-9 | Ops pack: runbook + alert + on-call | OP | G1.8, G1.12 — payment stuck ≤ 15 phút MTTR |
| P0-10 | Vertical slice E2E | ALL P0 | 1 unit GR → listing → book → pay → ledger → 1 commission line |

### 13.2 P1 — Stickiness & GMV (T1–T4/2027)

| # | Nâng cấp | Lý do thắng |
|---|----------|-------------|
| P1-1 | Commission OS + settlement batch | Developer trả HH qua platform → switching cost |
| P1-2 | Omnichannel Hub (Zalo OA/ZNS, Meta Lead Ads) | Lead không rò spreadsheet |
| P1-3 | Developer Portal production (import Excel, absorption) | CĐT coi WEREAL là source of truth |
| P1-4 | Mobile agent (offline lead, geo check-in) | Adoption hàng ngày > UI đẹp |
| P1-5 | E-sign + contract template | Deal khép kín trong platform |

### 13.3 P2 — Trust & scale (T5–T9/2027)

| # | Nâng cấp | Gate |
|---|----------|------|
| P2-1 | Dispute Center + commission holdback | G3.2 SLA < 48h |
| P2-2 | Regulatory Export Pack | G4.5 |
| P2-3 | Verified Listing + document vault + watermark | G2.7 |
| P2-4 | Search CDC lag ≤ 1s | G3.5 |
| P2-5 | AI Ops Agent (drift/anomaly) approve-to-send | G3.1 |

### 13.4 P3 — Network effect & moat dài hạn (2028+)

| Moat | Nâng cấp |
|------|----------|
| Network | Dev ↔ Agency marketplace, leaderboard, SLA penalty |
| Transaction | Embedded finance: escrow, BNPL, mortgage pre-qual |
| Data | Heatmap, pricing intelligence — data product revenue |
| Ecosystem | API marketplace — bank, valuation, ERP |

### 13.5 Việc ưu tiên ngay (30 ngày)

1. **Chốt 1 pilot tenant** (1 CĐT + agency) — freeze scope P0, không thêm UC mới.
2. **Build vertical slice production** — GR → Pay → Ledger (1 deal path).
3. **Deep-spec P0 còn lại** — COM, TR cơ bản + automation TC booking/payment.
4. **Ops pack v1** — runbook webhook, dashboard reconcile, alert anomaly.
5. **Giữ design system** — mọi màn production dùng tokens/Figma; không drift UI khi scale team.
