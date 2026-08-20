# Timeline sơ bộ — WEREAL PropTech SaaS

> **Phiên bản:** 2.0 | **Ngày:** 28/07/2026  
> **Tổng thời gian:** 26 tháng (6 phase)  
> **Ngày bắt đầu giả định:** 01/08/2026  
> **MVP Go-live:** 31/12/2026 | **Platform v2.0 Go-live:** 31/10/2028

---

## 1. Tổng quan timeline

```
2026         2027                              2028
Aug────Dec   Jan────Apr   May────Sep   Oct───Feb   Mar────Jun   Jul────Oct
◄─ Phase 1 ► ◄─ Phase 2 ► ◄── Phase 3 ──► ◄Phase 4► ◄─ Phase 5 ► ◄─ Phase 6 ►
   MVP         Scale      Intel+Trust    Enterprise  Finance      Network
 Golden Rec   Comm+Omni   AI Agents     White-label  Escrow/BNPL  Marketplace
```

| Phase | Tên | Thời gian | Tháng | Go-live |
|-------|-----|-----------|-------|---------|
| **1** | MVP Foundation | T8–T12/2026 | 5 | 31/12/2026 |
| **2** | Scale & Distribution | T1–T4/2027 | 4 | 30/04/2027 |
| **3** | Intelligence & Trust | T5–T9/2027 | 5 | 30/09/2027 |
| **4** | Enterprise | T10/2027–T2/2028 | 5 | 29/02/2028 |
| **5** | Embedded Finance | T3–T6/2028 | 4 | 30/06/2028 |
| **6** | Network & Data Product | T7–T10/2028 | 4 | 31/10/2028 |

---

## 2. Phase 1 — MVP Foundation (T8–T12/2026)

### 2.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S0 | 01–14/08 | Kickoff & Foundation | Team, repo, CI/CD, ADR Golden Record + tenant RLS, DB schema v1 |
| S1 | 15–28/08 | Identity & Tenant | JWT auth, RBAC, tenant onboarding, RLS verified |
| S2 | 29/08–11/09 | Golden Record & Inventory | Product Graph, Unit CRUD, price versioning, snapshot |
| S3 | 12–25/09 | Listing Anti-drift & Search | Listing module, anti-drift rules, OpenSearch, Verified Badge |
| S4 | 26/09–09/10 | Lead CRM | Capture, routing, activities, pipeline, Agent Portal v1 |
| S5 | 10–23/10 | Booking & Event Store | State machine, domain events, atomic inventory lock, SSE |
| S6 | 24/10–06/11 | Payment & Ledger | Gateway, webhook idempotent, double-entry ledger, reconcile |
| S7 | 07–20/11 | AI v1 | AI Gateway, copilot, lead scoring, guardrails, action log |
| S8 | 21/11–04/12 | Admin, Audit, Public Portal | Admin portal, audit trail, Public Portal v1, KPI dashboard |
| S9 | 05–18/12 | Hardening | E2E test, concurrent booking test, security scan, load test |
| S10 | 19–31/12 | UAT & Go-live | Pilot UAT, runbook, **R1.0 MVP** |

### 2.2 Milestones Phase 1

| # | Milestone | Ngày | Tiêu chí |
|---|-----------|------|----------|
| M1.1 | Kickoff complete | 14/08/2026 | Team, CI/CD, ADR approved |
| M1.2 | Golden Record ready | 11/09/2026 | Unit + versioning + anti-drift rules |
| M1.3 | Public + Agent staging | 09/10/2026 | Search, CRM, listing functional |
| M1.4 | Event-sourced booking | 06/11/2026 | All transitions + replay test |
| M1.5 | Payment E2E | 20/11/2026 | Ledger 100% reconcile |
| M1.6 | AI + Guardrails verified | 04/12/2026 | Copilot + scoring + block mutate |
| M1.7 | UAT sign-off | 25/12/2026 | Pilot accepts critical flows |
| M1.8 | **MVP Go-live R1.0** | **31/12/2026** | SLA 99.5% |

### 2.3 Gantt Phase 1

```
Module                 Aug        Sep        Oct        Nov        Dec
Golden Record/Kickoff  ████
Identity & Tenant          ████
Inventory & Graph              ████
Listing+Search+Public              ████
Lead CRM+Agent                         ████
Booking+Event Store                        ████
Payment+Ledger                                 ████
AI Copilot+Scoring                                 ████
Admin+Audit+Dashboard                                  ████
Hardening+UAT                                              ████
```

---

## 3. Phase 2 — Scale & Distribution (T1–T4/2027)

### 3.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S11 | 01–14/01 | Developer Portal | Project UI, bảng hàng, policy, time-travel query |
| S12 | 15–28/01 | Commission OS | Policy snapshot, split, payable calc |
| S13 | 29/01–11/02 | Settlement & Payout | Batch, export kế toán, payout workflow |
| S14 | 12–25/02 | Contract & E-sign | Template, e-sign, transaction replay evidence |
| S15 | 26/02–11/03 | Omnichannel Hub | Zalo OA/ZNS, Meta Lead Ads, SMS, attribution stub |
| S16 | 12–25/03 | Mobile App v1 | Offline, geo check-in, voice-to-CRM, push |
| S17 | 26/03–08/04 | Service Split | Payment, Search, Notification services |
| S18 | 09–22/04 | AI RAG & Matching | Knowledge assistant, buyer-product matching |
| S19 | 23–30/04 | Dev–Agency Marketplace v1 | Distribution policy, apply/approve |
| S20 | 01–07/05 | Phase 2 UAT | Integration, pilot feedback, **R1.5 Go-live** |

### 3.2 Milestones Phase 2

| # | Milestone | Ngày |
|---|-----------|------|
| M2.1 | Developer Portal live | 14/01/2027 |
| M2.2 | Commission E2E | 11/02/2027 |
| M2.3 | Omnichannel (Zalo/Meta) live | 11/03/2027 |
| M2.4 | Mobile App beta | 25/03/2027 |
| M2.5 | Marketplace v1 | 22/04/2027 |
| M2.6 | **Phase 2 Go-live R1.5** | **30/04/2027** |

---

## 4. Phase 3 — Intelligence & Trust (T5–T9/2027)

### 4.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S21 | 08–21/05 | Data Warehouse | Schema, ETL, CDC pipeline |
| S22 | 22/05–04/06 | CQRS & Real-time Sync | Inventory→Search < 5s (target 1s) |
| S23 | 05–18/06 | Analytics Dashboards | GMV, absorption, broker scorecard |
| S24 | 19/06–02/07 | AI Agents v1 | Sales, Ops, Compliance agents + approve-to-send |
| S25 | 03–16/07 | Trust Layer | Document vault, watermark, Dispute Center |
| S26 | 17–30/07 | AI Pricing & Fraud | Pricing intel, anti-fraud graph |
| S27 | 31/07–13/08 | Buyer App + Concierge | Native app, conversational discovery |
| S28 | 14–27/08 | Campaign Attribution | Full funnel attribution |
| S29 | 28/08–10/09 | Multi-gateway + AI Service | Gateway routing, AI service split, feature store |
| S30 | 11–30/09 | Hardening & UAT | Load test, pen test, **R2.0 Go-live** |

### 4.2 Milestones Phase 3

| # | Milestone | Ngày |
|---|-----------|------|
| M3.1 | Warehouse + ETL live | 21/05/2027 |
| M3.2 | Real-time sync operational | 04/06/2027 |
| M3.3 | AI Agents live (approve-to-send) | 02/07/2027 |
| M3.4 | Dispute Center live | 30/07/2027 |
| M3.5 | Buyer App beta | 27/08/2027 |
| M3.6 | **Phase 3 Go-live R2.0** | **30/09/2027** |

---

## 5. Phase 4 — Enterprise (T10/2027–T2/2028)

### 5.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S31 | 01–14/10 | SSO Enterprise | SAML/OIDC |
| S32 | 15–28/10 | White-label Portal | Branding, subdomain, theme |
| S33 | 29/10–11/11 | Workflow Engine | Temporal/Camunda, custom workflow |
| S34 | 12–25/11 | Forecast Engine | Absorption forecast 30/60/90d |
| S35 | 26/11–09/12 | Market Heatmap | Geo visualization |
| S36 | 10–23/12 | API Marketplace v1 | Partner API, key management |
| S37 | 24/12–06/01 | Multi-region Prep | Replication, CDN, latency |
| S38 | 07–20/01 | Multi-region Deploy | 2 regions live |
| S39 | 21/01–03/02 | Regulatory Export | Compliance export pack |
| S40 | 04–29/02 | Enterprise Hardening | SLA 99.9%, DR drill, **R3.0 Go-live** |

### 5.2 Milestones Phase 4

| # | Milestone | Ngày |
|---|-----------|------|
| M4.1 | SSO + White-label | 28/10/2027 |
| M4.2 | Custom workflow engine | 11/11/2027 |
| M4.3 | API Marketplace v1 | 23/12/2027 |
| M4.4 | Multi-region live | 06/01/2028 |
| M4.5 | **Enterprise Go-live R3.0** | **29/02/2028** |

---

## 6. Phase 5 — Embedded Finance (T3–T6/2028)

### 6.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S41 | 01–14/03 | Legal & Compliance Prep | Finance license review, compliance pack |
| S42 | 15–28/03 | Smart Escrow | Escrow account, conditional release |
| S43 | 29/03–11/04 | BNPL / Trả góp | Partner finance integration |
| S44 | 12–25/04 | Mortgage Pre-qual | Bank API, buyer portal widget |
| S45 | 26/04–09/05 | Split Payout | Auto commission split via ledger |
| S46 | 10–23/05 | Chargeback Advanced | Case management upgrade |
| S47 | 24/05–06/06 | Finance Dashboard | GMV, escrow, payout executive view |
| S48 | 07–30/06 | Finance UAT & Go-live | Legal sign-off, **R4.0 Go-live** |

### 6.2 Milestones Phase 5

| # | Milestone | Ngày |
|---|-----------|------|
| M5.1 | Legal/compliance approved | 14/03/2028 |
| M5.2 | Smart Escrow live | 28/03/2028 |
| M5.3 | BNPL + Mortgage live | 25/04/2028 |
| M5.4 | Split payout automated | 09/05/2028 |
| M5.5 | **Finance Go-live R4.0** | **30/06/2028** |

---

## 7. Phase 6 — Network & Data Product (T7–T10/2028)

### 7.1 Sprint map

| Sprint | Thời gian | Theme | Deliverables |
|--------|-----------|-------|--------------|
| S49 | 01–14/07 | Marketplace Full | Leaderboard, SLA, penalty, compliance score |
| S50 | 15–28/07 | Market Data Product | Pricing report, heatmap subscription |
| S51 | 29/07–11/08 | API Marketplace v2 | Revenue share, partner billing |
| S52 | 12–25/08 | Immersive Discovery | 3D tour/digital twin integration |
| S53 | 26/08–08/09 | Recommendation Engine | Advanced personalization |
| S54 | 09–22/09 | Multi-country Prep | i18n, compliance framework |
| S55 | 23/09–06/10 | Network Analytics | Dev-agency network metrics |
| S56 | 07–31/10 | Platform v2.0 UAT | Full regression, **R5.0 Go-live** |

### 7.2 Milestones Phase 6

| # | Milestone | Ngày |
|---|-----------|------|
| M6.1 | Marketplace full live | 14/07/2028 |
| M6.2 | Data Product launched | 28/07/2028 |
| M6.3 | Immersive discovery live | 25/08/2028 |
| M6.4 | **Platform v2.0 R5.0** | **31/10/2028** |

---

## 8. Timeline theo module (cross-phase)

```
Module                      P1    P2    P3    P4    P5    P6
──────────────────────────────────────────────────────────────
Golden Record & Product Graph ████  ██
Event Store & Domain Events   ████  ██    ██
Real-time Inventory Lock      ████  ██    ██
Listing Anti-drift            ████  ██
Identity & Access             ████  ██          ██    ██
Lead CRM & Pipeline           ████  ██    ██
Omnichannel (Zalo/Meta)             ████  ██
Commission & Settlement             ████          ██
Dev–Agency Marketplace              ████  ██          ██    ████
Mobile App (Sale)                   ████
Buyer App                                 ████
AI Copilot & Scoring          ████  ██    ██
AI Agents (4 loại)                        ████
Trust & Dispute Center                    ████  ██
Payment & Ledger              ████  ██    ██    ██    ████
Embedded Finance                                    ████
Data Warehouse                          ████  ██          ██
CQRS / Real-time Sync                   ████  ██
Analytics & Forecast                    ██    ██    ████  ██    ██
Enterprise (SSO/White-label)                  ████
Workflow Engine                               ████
API Marketplace                               ██          ██    ████
Multi-region                                  ████
Immersive 3D                                              ████
Market Data Product                                       ████
```

---

## 9. Luồng giao dich — mapping phase

| Bước | Luồng | Phase hoàn thiện |
|------|-------|------------------|
| 1–2 | AI Concierge/Search → Golden Record | P1 search; P3 AI concierge |
| 3–4 | Lead + AI scoring + routing | P1 |
| 5–6 | Booking + atomic lock + PaymentIntent | P1 |
| 7–9 | Gateway → Webhook → Ledger → Event | P1 |
| 10 | Contract + E-sign | P2 |
| 11 | Commission → Settlement → Split payout | P2 (P5 auto split) |
| 12 | BI + AI learning + Forecast | P3 (P4 forecast) |
| + | Omnichannel attribution | P2–P3 |
| + | Dispute resolution | P3 |
| + | Escrow/BNPL/Mortgage | P5 |
| + | Marketplace distribution | P2 seed, P6 full |

---

## 10. Resource plan

| Phase | Team size | Roles thêm |
|-------|-----------|------------|
| P1 | 8–10 | Core team |
| P2 | 10–12 | +Mobile, +Backend |
| P3 | 12–14 | +Data Engineer, +AI |
| P4 | 14–16 | +DevOps, +Security |
| P5 | 14–16 | +Legal/Compliance, +Finance integration |
| P6 | 16–18 | +Partnership, +Data Product |

---

## 11. Critical path

```
P1: Kickoff → Golden Record → Listing → CRM → Booking+Events → Payment → AI → UAT
P2: Developer Portal → Commission → Omnichannel (parallel Mobile)
P3: Warehouse → CQRS → AI Agents → Trust Layer (parallel Buyer App)
P4: SSO → White-label → Workflow → Multi-region
P5: Legal approval → Escrow → BNPL/Mortgage (BLOCKER) → Split payout
P6: Marketplace → Data Product → Platform v2.0
```

**Blockers ngoài:** Payment sandbox (P1), Zalo/Meta API (P2), Legal finance (P5), Bank partner (P5)

---

## 12. Release calendar

| Release | Ngày | Version | Nội dung |
|---------|------|---------|----------|
| R0.1 Alpha | 09/10/2026 | 0.1.0 | Public + Agent staging |
| R0.5 Beta | 20/11/2026 | 0.5.0 | Payment E2E staging |
| **R1.0 MVP** | **31/12/2026** | 1.0.0 | Golden Record, transaction, AI v1 |
| **R1.5** | **30/04/2027** | 1.5.0 | Commission, omnichannel, mobile, marketplace v1 |
| **R2.0** | **30/09/2027** | 2.0.0 | AI Agents, trust, buyer app, analytics |
| **R3.0** | **29/02/2028** | 3.0.0 | Enterprise, white-label, multi-region |
| **R4.0** | **30/06/2028** | 4.0.0 | Embedded finance |
| **R5.0** | **31/10/2028** | 5.0.0 | Network, data product, platform v2.0 |

---

## 13. Buffer & contingency

| Phase | Duration | Buffer | Go-live window |
|-------|----------|--------|----------------|
| P1 | 5 tháng | 2 tuần | 15–31/12/2026 |
| P2 | 4 tháng | 1 tuần | 23–30/04/2027 |
| P3 | 5 tháng | 2 tuần | 16–30/09/2027 |
| P4 | 5 tháng | 2 tuần | 15–29/02/2028 |
| P5 | 4 tháng | 2 tuần | 16–30/06/2028 |
| P6 | 4 tháng | 2 tuần | 17–31/10/2028 |

**Quy tắc:** Trễ > 2 tuần → steering committee; ưu tiên giảm scope phase hiện tại, không trễ MVP scope.

---

## 14. Governance calendar

| Sự kiện | Tần suất |
|---------|----------|
| Sprint review/demo | 2 tuần |
| Phase gate (6 gates) | Cuối mỗi phase |
| Architecture review | Hàng tháng |
| Risk review | Weekly P1; bi-weekly P2+ |
| GMV & moat review | Hàng quý (P2+) |
| Go/No-go | Trước mỗi release |

---

## 15. Giả định

1. Team 8 FTE từ 01/08/2026; scale theo resource plan
2. Payment sandbox trước 01/10/2026
3. Tenant pilot cam kết UAT 15/12/2026
4. Zalo/Meta API trước 01/02/2027
5. Legal embedded finance approval trước 01/03/2028
6. Sprint 2 tuần; velocity ổn định sau S2

---

## 16. Liên kết tài liệu

| Tài liệu | File |
|----------|------|
| Kế hoạch dự án | `Ke-hoach-du-an.md` |
| Phạm vi công việc | `Pham-vi-cong-viec.md` |
| Danh sách rủi ro | `Danh-sach-rui-ro.md` |
