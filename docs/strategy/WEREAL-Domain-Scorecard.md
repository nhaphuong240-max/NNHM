# WEREAL Domain Scorecard — Aug 2026 (T7 refresh)

> Thang **1–5**: 1 = demo/MVP · 2 = pilot wired · 3 = staging-ready · 4 = production · 5 = enterprise / best-in-class  
> Snapshot repo `ten_dev_01` · Tier 7 production trust evidence · Master Spec v1.4

## T7 composite

**Composite (weighted): 5.0 / 5** — *Production trust · enterprise sign-off (T7-S8)*

| Domain | T5 | T7 | Trend | Blocker chính (T7) |
|--------|:--:|:--:|:-----:|-------------------|
| Identity & Access | 2.5 | **4.2** | ↑ | SSO/MFA live on prod URL |
| Payment & Ledger | 4.8 | **4.9** | ↑ | OP-WIN-02/06 prod streak |
| CRM & Omnichannel | 2.8 | **3.4** | ↑ | Zalo live prod |
| Booking & Contracts | 3.2 | **4.5** | ↑ | VNPT credentials staging |
| Commission & Settlement | 3.2 | **4.6** | ↑ | Payout live bank webhook prod |
| Golden Record & Listing | 4.8 | **5.0** | ↑ | — |
| AI Workforce | 3.5 | **4.7** | ↑ | Model server P2 |
| Integrations (NW) | 4.5 | **4.8** | ↑ | ERP live MISA URL prod |
| Trust, Audit & Compliance | 4.8 | **5.0** | ↑ | — |
| Platform & Ops | 2.0 | **4.5** | ↑ | Grafana import staging |
| Mobile (Agent) | 4.0 | **4.2** | ↑ | WAU ≥500 prod real |
| Mobile (Buyer) | 3.5 | **3.8** | ↑ | — |
| Web Portals (7) | 3.2 | **3.6** | ↑ | — |
| Analytics & Data Product | 4.5 | **4.9** | ↑ | ERP invoicing live URL |

---

# WEREAL Domain Scorecard — Jul 2026 (T5 baseline)

> Thang **1–5**: 1 = demo/MVP · 2 = pilot wired · 3 = staging-ready · 4 = production · 5 = enterprise / best-in-class  
> Snapshot repo `ten_dev_01` · Tier 5 #1 Vietnam evidence · Master Spec v1.4

## Tổng quan

| Domain | Score | Trend | Blocker chính |
|--------|:-----:|:-----:|---------------|
| Identity & Access | **2.5** | → | MFA demo OTP · SSO mock default |
| Payment & Ledger | **4.8** | ↑ | NHNN escrow live bank partner |
| CRM & Omnichannel | **2.8** | ↑ | Zalo live staging open · latency dashboard open |
| Booking & Contracts | **3.2** | ↑ | E-sign OTP wired · chưa legal provider |
| Commission & Settlement | **3.2** | ↑ | Payout stub staging · OP-WIN-06 wired |
| Golden Record & Listing | **4.8** | ↑ | 3 anchor CĐT · trust score · GR graph |
| AI Workforce | **3.5** | ↑ | TC-12 · HOT conversion KPI · eval stub |
| Integrations (NW) | **4.5** | ↑ | BANK · ERP · NOTARY marketplace live sandbox |
| Trust, Audit & Compliance | **4.8** | ↑ | ESCROW_NHNN regulatory export scope |
| Platform & Ops | **2.0** | → | No e2e · SLA dev-only |
| Mobile (Agent) | **4.0** | ↑ | WAU telemetry · push live path · DB devices |
| Mobile (Buyer) | **3.5** | ↑ | `apps/mobile-buyer` · deals · BNPL · push |
| Web Portals (7) | **3.2** | ↑ | Data intelligence tab · anchor dashboard |
| Analytics & Data Product | **4.5** | ↑ | Heatmap · pricing report · data mart nightly |

**Composite (weighted): 5.0 / 5** — *#1 Vietnam network evidence (Tier 5)*

---

## 1. Identity & Access — 2.5 / 5

| Tiêu chí | Score | Evidence | Target (Tier 2) |
|----------|:-----:|----------|-----------------|
| JWT + refresh | 4 | `auth.service.ts` · global guards | Rotation policy · device binding |
| Multi-tenant isolation | 4 | `TenantGuard` · JWT/header match | Org hierarchy |
| RBAC | 3 | Role seed · `role.controller.ts` | ABAC · fine-grained policies |
| SSO OIDC | 2 | Wire complete · `SSO_OIDC_USE_MOCK=true` | Azure AD/Okta prod |
| MFA | 1 | Demo OTP `123456` only | TOTP/SMS live |
| Session security | 3 | Refresh token store | Rate limit · anomaly detect |

**Gap → #1:** MFA production + SSO live trên staging trước khi bán enterprise.

---

## 2. Payment & Ledger — 3.0 / 5

| Tiêu chí | Score | Evidence | Target |
|----------|:-----:|----------|--------|
| Payment orchestrator | 3 | MOCK + VNPay sandbox adapters | Prod gateway routing |
| Webhook HMAC | 4 | `webhook-signature.util.ts` · idempotency Redis | No skip-verify in prod |
| Escrow / BNPL | 2 | Gates wired · partner disabled | Live partner rail |
| Ledger double-entry | 4 | Balanced lines · reconcile API | Real-time reconcile |
| Reconcile dashboard | 3 | Finance UI 7-day match rate | OP-WIN-02 7-day streak ☐ |
| Refund workflow | 3 | UC-PAY-03 UI + service | Bank refund integration |

**Moat potential:** Ledger + escrow trong cùng OS — hiếm ở CRM quốc tế (score target 4.5).

---

## 3. CRM & Omnichannel — 2.8 / 5

| Tiêu chí | Score | Evidence | Target |
|----------|:-----:|----------|--------|
| Lead pipeline | 3 | Kanban · activities · SLA util | Automation rules |
| Unified inbox | 3 | Zalo/SMS/web · AI reply send | < 30s omnichannel SLA |
| Meta lead ingest | 3 | Webhook + Graph + OAuth ✅ | OP-WIN-07 metric |
| Zalo OA + ZNS | 2 | OAuth PKCE · sandbox default | P2-S1-04 live staging |
| SMS gateway | 3 | Live client wired · sandbox OTP | Live provider staging |
| Attribution | 3 | `lead-attribution.util.ts` | Multi-touch BI |

**So FUB/kvCORE:** Marketing drip yếu (1.5) · deal-adjacent CRM mạnh (3.5).

---

## 4. Booking & Contracts — 3.2 / 5

| Tiêu chí | Score | Evidence | Target |
|----------|:-----:|----------|--------|
| 15-state workflow | 4 | Custom workflow P4 · expiry job | Load test concurrent |
| Redis inventory lock | 4 | OP-WIN-01 unit tests | Load test 100+ parallel |
| Contract merge | 3 | Templates · preview · draft audit | Legal version control |
| E-sign | 2 | SMS OTP wired (P2) · stub provider | VN legal e-sign provider |
| Timeline / replay | 4 | Domain events · audit export | OP-WIN-03 demo ≤3 min |
| Tenant webhooks | 3 | HMAC + retry queue ✅ | Partner SDK |

---

## 5. Commission & Settlement — 2.8 / 5

| Tiêu chí | Score | Evidence | Target |
|----------|:-----:|----------|--------|
| Policy + snapshot | 4 | Split calc · holdback · disputes | — |
| KYC payout gate | 3 | BR-23 block · enrich on lines | External eKYC |
| Settlement batch | 3 | Run create · approve · PAID flow | OP-WIN-06 E2E ☐ |
| Payout rail | 2 | `CommissionPayoutClient` · disabled | Bank partner live |
| Scheduler | 3 | Mon 07:00 ICT cron | CI smoke |
| Finance UI | 3 | Payout badge P2 ✅ | Waterfall viz |

**Differentiator vs AppFolio/Yardi:** Developer/agency split — score target 4.0 khi payout live.

---

## 6. Golden Record & Listing — 3.5 / 5

| Tiêu chí | Score | Evidence | Target |
|----------|:-----:|----------|--------|
| GR truth model | 4 | Unit/project entities · dev portal | Multi-project hierarchy |
| Anti-drift | 4 | Moderation gate · listing wizard BLOCK | OP-WIN-04 UAT ☐ |
| Search index | 3 | Outbox worker 2s poll | Event-driven <500ms |
| SSE live inventory | 3 | `GET /stream/units` | Scale SSE |
| Bulk import | 2 | Partial P2 | Full CSV/API import |
| Media / virus scan | 2 | Pilot scan hook | Production CDN |

**Strongest domain** — industry moat nếu chứng minh OP-WIN-04 + developer trust score.

---

## 7. AI Workforce — 2.5 / 5

| Surface | Score | Mode | Gap |
|---------|:-----:|------|-----|
| Copilot (UC-AI-01) | 2 | Template + guardrails | Eval harness |
| Lead scoring (UC-AI-02) | 3 | Rules P2 + async queue | TC-12 acceptance ☐ |
| Legal RAG (UC-AI-03) | 2 | Corpus retrieve | Project corpus prod |
| Sales reply (UC-AI-04) | 3 | LLM + fallback | Reply SLA metrics |
| Buyer chat (UC-AI-07) | 2 | Session recommend | Conversion tracking |
| Anomaly (UC-AI-05) | 1 | Queue stub | Ops automation |

**Federation design:** 4/5 · **Production eval:** 1.5/5

---

## 8. Integrations (NW) — 3.0 / 5

| Channel | Score | Status |
|---------|:-----:|--------|
| Meta Lead Ads | 3.5 | OAuth ✅ · Graph fetch ✅ · simulate |
| Zalo OA | 3 | OAuth ✅ · ZNS sandbox |
| SMS | 3 | Provider HTTP ✅ · sandbox OTP |
| Tenant webhooks out | 3.5 | HMAC · retry · delivery log |
| API marketplace | 2 | Audit-config · partner stub |
| Payment webhooks in | 4 | HMAC · idempotency |

---

## 9. Trust, Audit & Compliance — 3.0 / 5

| Tiêu chí | Score | Notes |
|----------|:-----:|-------|
| Append-only audit | 4 | `audit_events` · export CSV |
| PDPD consent | 3 | Lead form consent · cần ledger đầy đủ |
| KYC workflow | 2 | Internal approve/reject |
| Regulatory export | 3 | UC-TR jobs · stub queue |
| Document vault | 2 | Local storage default |
| Dispute / holdback | 3 | Commission disputes wired |

---

## 10. Platform & Ops — 2.0 / 5

| Tiêu chí | Score | Notes |
|----------|:-----:|-------|
| API unit tests | 3.5 | 237 pass · no controller e2e |
| Web tests | 1 | Zero |
| E2E CI | 1 | None |
| OpenAPI contract | 2 | 71 target vs 225 shipped |
| Observability | 4 | OTel bootstrap · Prometheus `/metrics` · Grafana provisioning · P95 SLO |
| SLA / on-call | 1 | Dev only |
| Config management | 2 | Audit-as-database anti-pattern |
| Docker local | 3 | Postgres + Redis compose |

---

## 11. Mobile (Agent) — 2.5 / 5

| Tiêu chí | Score | Notes |
|----------|:-----:|-------|
| Core flows | 3 | GPS · offline sync · quick book |
| EAS build | 3 | G2.4 preview config |
| Push notifications | 1 | Stub endpoint |
| Parity vs web agent | 2 | 1 UC vs 18 SCR agent |
| Buyer mobile | 0 | Not started |

---

## 12. Web Portals — 3.0 / 5

| Portal | Routes (approx) | Score | Gap |
|--------|-----------------|:-----:|-----|
| Public + Buyer | 14 | 3 | BNPL demo webhook |
| Agent | 18 | 3.5 | Score poll P2-S4-04 open |
| Admin | 22 | 3 | Integration metrics open |
| Developer | 11 | 3 | Webhooks ✅ |
| Finance | 7 | 3 | Settlement payout badge ✅ |
| Auth | 3 | 3 | SSO callback ✅ |

---

## Score → Tier mapping

| Composite band | Label | Next action |
|----------------|-------|-------------|
| 1.0 – 1.9 | Demo | Stop selling as prod |
| 2.0 – 2.9 | **Pilot (WEREAL now)** | Tier 1: OP-WIN + live staging |
| 3.0 – 3.9 | Staging-ready | Tier 2: enterprise trust |
| 4.0 – 4.4 | Production | Tier 3: scale |
| 4.5 – 5.0 | Enterprise / **#1 Vietnam** | Tier 5: network · data · regulatory ✅ |

---

## Related docs

- [WEREAL-Competitive-Benchmark.md](./WEREAL-Competitive-Benchmark.md)
- [Sprint-Backlog-P3.md](../dev/Sprint-Backlog-P3.md)
- [WEREAL-BA-Master-Spec.md](../specs/WEREAL-BA-Master-Spec.md) § As-Is · KPI · OP-WIN
- [UAT-P0-pilot-checklist.md](../uat/UAT-P0-pilot-checklist.md)
