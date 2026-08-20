# WEREAL REOS — Business Analysis Master Specification

> **Version:** 1.4 · **Generated:** 2026-07-29

## Document control

| Field | Value |
| --- | --- |
| Document ID | WEREAL-BA-MASTER |
| Title | WEREAL BA Master Spec — Screens & Use Cases |
| Version | 1.4 |
| Status | Draft — engineering reference |
| Source of truth | `scripts/wereal_ba_catalog_data.py` |
| Excel mirror | [`WEREAL_BA_Spec.xlsx`](../samples/WEREAL_BA_Spec.xlsx) |
| Prototype | `prototype/` — `/uc/:id` · `/developer` |

### Lịch sử (delta v1.1 → v1.4)

| Version | Ngày | Thay đổi |
| --- | --- | --- |
| 1.4 | 2026-07-29 | **As-Is inventory** · **AI federation** · **API shipped vs target** · **baseline KPI** |
| 1.3 | 2026-07-28 | Module catalog · SCR/UC top-20 · deep-spec backlog |
| 1.1 | 2026-07-20 | Skeleton inventory từ prototype catalog |

## Executive summary

| Metric | Count |
| --- | --- |
| Màn hình (SCR) | 73 |
| Use case (UC) | 78 |
| Manual deep-spec UC (P0) | 33 | GR · BK · PAY · CRM · LS · ID · COM · TR |
| Manual deep-spec SCR (P0) | 31 | go-live + commission + trust screens |
| Business rules (BR) | 25 |
| Test cases (TC) | 25 |
| Traceability links | 25 |

Cấu trúc bám template [`RNOSAI_BA_Spec.xlsx`](../../RNOSAI/docs/samples/RNOSAI_BA_Spec.xlsx):

1. **Master Spec** (file này) — inventory, traceability
2. **Excel Workbook** — sprint filter, validation, hyperlink SCR/UC → sheet chi tiết
3. **Prototype** — interactive UI 78 UC

## Module catalog

| Mã | Tên | Phạm vi |
| --- | --- | --- |
| MOD-GR | Golden Record | Unit gốc, Product Graph, anti-drift, SSE |
| MOD-ID | Identity & Tenant | Multi-tenant, RBAC/ABAC, MFA, KYC/KYB |
| MOD-LS | Listing & Search | Listing marketing, OpenSearch, moderation |
| MOD-CRM | CRM & Lead | Lead capture, routing, pipeline, SLA |
| MOD-BK | Booking & Deal | Giữ chỗ, state machine, contract, e-sign |
| MOD-PAY | Payment & Ledger | Cọc online, reconcile, refund, settlement |
| MOD-COM | Commission | Policy, snapshot, split, holdback |
| MOD-AI | AI Copilot | Listing copy, lead score, RAG, anomaly |
| MOD-TR | Trust & Compliance | Audit trail, document vault, dispute |
| MOD-AN | Analytics | Funnel, GMV, absorption, attribution |
| MOD-MKT | Distribution | Project policy, agency apply, leaderboard |
| MOD-UX | Experience | Mobile PWA, buyer track, white-label, 3D map |
| MOD-NW | Network & Integration | Zalo, Meta, SMS, webhooks |
| MOD-PUBLIC | Public Portal | Search, compare, unit detail, recommendations |
| MOD-AGENT | Agent Portal | Listing wizard, pipeline, booking, inbox |
| MOD-ADMIN | Platform Admin | Tenant, moderation, audit, integrations |
| MOD-DEV | Developer Portal | GR grid, import, absorption, commission |
| MOD-FIN | Finance Portal | Reconcile, refund, settlement, export |

## Screen inventory (top 20 — full list in Excel `01_DanhSach_ManHinh`)

| SCR | Tên | Module | Route | Status | UC |
| --- | --- | --- | --- | --- | --- |
| SCR-ADMIN-001 | Dashboard funnel & KPI (+ shared route) | AN | /admin | Draft | UC-AN-01, UC-UX-03 |
| SCR-ADMIN-002 | AI phát hiện listing bất thường | AI | /admin/ai/anomaly | Pending | UC-AI-05 |
| SCR-ADMIN-003 | Báo cáo GMV & doanh thu platform | AN | /admin/analytics/gmv | Pending | UC-AN-02 |
| SCR-ADMIN-004 | API Marketplace partner webhook | NW | /admin/api-marketplace | Pending | UC-NW-04 |
| SCR-ADMIN-005 | Xem audit trail toàn hệ thống | TR | /admin/audit | Draft | UC-TR-01 |
| SCR-ADMIN-006 | Replay timeline (dispute evidence) | BK | /admin/bookings/replay | Pending | UC-BK-04 |
| SCR-ADMIN-007 | Holdback khi tranh chấp | COM | /admin/commission/holdback | Pending | UC-COM-04 |
| SCR-ADMIN-008 | Quản lý tranh chấp (Dispute Center) | TR | /admin/disputes | Pending | UC-TR-03 |
| SCR-ADMIN-009 | Phát hiện listing trùng lặp | LS | /admin/duplicates | Pending | UC-LS-06 |
| SCR-ADMIN-010 | Sync lead từ Zalo OA / Meta Lead Ads | CRM | /admin/integrations/leads | Pending | UC-CRM-05 |
| SCR-ADMIN-011 | Tích hợp Meta Lead Ads webhook | NW | /admin/integrations/meta | Pending | UC-NW-02 |
| SCR-ADMIN-012 | SMS gateway thông báo giao dịch | NW | /admin/integrations/sms | Pending | UC-NW-03 |
| SCR-ADMIN-013 | Tích hợp Zalo OA/ZNS notification | NW | /admin/integrations/zalo | Pending | UC-NW-01 |
| SCR-ADMIN-014 | KYC/KYB Agency và Developer | ID | /admin/kyc | Pending | UC-ID-05 |
| SCR-ADMIN-015 | Marketplace ranking & SLA penalty | MKT | /admin/marketplace | Pending | UC-MKT-04 |
| SCR-ADMIN-016 | Kiểm tra anti-drift listing (+ shared route) | GR | /admin/moderation | Draft | UC-GR-03, UC-LS-02 |
| SCR-ADMIN-017 | Multi-gateway routing & fallback | PAY | /admin/payment-gateways | Pending | UC-PAY-05 |
| SCR-ADMIN-018 | Regulatory Export Pack | TR | /admin/regulatory-export | Pending | UC-TR-04 |
| SCR-ADMIN-019 | Onboarding tenant Developer/Agency | ID | /admin/tenants/onboard | Draft | UC-ID-01 |
| SCR-ADMIN-020 | Quản lý user trong tenant | ID | /admin/users | Draft | UC-ID-04 |
| … | +53 màn hình | | | | |

## Use case inventory (top 20 — full list in Excel `03_DanhSach_UseCase`)

| UC | Tên | SCR | Actor | Priority | Phase |
| --- | --- | --- | --- | --- | --- |
| UC-GR-01 | Quản lý Golden Record (Unit gốc) | SCR-DEV-012 | Developer Admin | High | Phase 1 |
| UC-GR-02 | Tạo listing marketing từ unit gốc | SCR-AGENT-011 | Agent | High | Phase 1 |
| UC-GR-03 | Kiểm tra anti-drift listing | SCR-ADMIN-016 | Ops Admin | High | Phase 1 |
| UC-GR-04 | Xem Product Graph & quan hệ unit | SCR-DEV-010 | Developer Admin | High | Phase 1 |
| UC-GR-05 | Lịch sử giá/tồn kho (time-travel) | SCR-DEV-011 | Developer Admin | Medium | Phase 2 |
| UC-GR-06 | Import bảng hàng bulk Excel/CSV | SCR-DEV-008 | Developer Admin | Medium | Phase 2 |
| UC-GR-07 | Real-time push trạng thái unit (SSE) | SCR-SYS-002 | All portals | High | Phase 1 |
| UC-ID-01 | Onboarding tenant Developer/Agency | SCR-ADMIN-019 | Platform Admin | High | Phase 1 |
| UC-ID-02 | Phân quyền user theo role/project | SCR-ADMIN-021 | Agency/Developer Admin | High | Phase 1 |
| UC-ID-03 | Đăng nhập, refresh token & MFA | SCR-AUTH-001 | All users | High | Phase 1 |
| UC-ID-04 | Quản lý user trong tenant | SCR-ADMIN-020 | Agency/Developer Admin | High | Phase 1 |
| UC-ID-05 | KYC/KYB Agency và Developer | SCR-ADMIN-014 | Platform Admin | Medium | Phase 2 |
| UC-ID-06 | SSO Enterprise SAML/OIDC | SCR-AUTH-002 | Enterprise User | Low | Phase 4 |
| UC-LS-01 | Tìm kiếm & lọc sản phẩm | SCR-PUBLIC-005 | Buyer, Guest | High | Phase 1 |
| UC-LS-02 | Duyệt listing trước publish | SCR-ADMIN-016 | Ops Admin | High | Phase 1 |
| UC-LS-03 | So sánh sản phẩm (2–3 unit) | SCR-PUBLIC-002 | Buyer | Medium | Phase 1 |
| UC-LS-04 | Upload media listing (ảnh/video) | SCR-AGENT-010 | Agent | High | Phase 1 |
| UC-LS-05 | Xem trang chi tiết project/unit | SCR-PUBLIC-006 | Buyer, Guest | High | Phase 1 |
| UC-LS-06 | Phát hiện listing trùng lặp | SCR-ADMIN-009 | Ops Admin | Medium | Phase 2 |
| UC-LS-07 | Đồng bộ search index từ GR | SCR-SYS-003 | System | High | Phase 1 |
| … | +58 UC | | | | |

## Lợi thế chuyên nghiệp & backlog vận hành

> Tham chiếu `Ke-hoach-du-an.md` §13 · `Tieu-chi-chap-nhan.md` §14

### Deep-spec modules (manual P0/P1)

| Module | UC deep-spec | SCR deep-spec |
| --- | --- | --- |
| GR · BK · PAY | 12 UC | 12 SCR (batch-1) |
| CRM · LS · ID | 12 UC | 11 SCR (batch-2) |
| **COM · TR** | **9 UC** | **9 SCR (batch-3)** |
| **Tổng manual** | **33 UC** | **31 SCR** |

### Deep-spec còn thiếu (đề xuất sprint tiếp)

| Module | UC | Lý do |
| --- | --- | --- |
| AN | UC-AN-01→02 | GMV dashboard pilot |
| NW | UC-NW-01→02 | Zalo/Meta go-live Phase 2 |
| AI | UC-AI-05 | Anomaly ops gate |

## As-Is inventory (engineering snapshot)

> Snapshot **2026-07-29** · WEREAL monorepo · demo tenant `ten_dev_01` · G → L (P0 vertical + Phase 2–5 pilot + production-harden)

### Ứng dụng đã triển khai

| App | Stack | As-Is | Trạng thái |
| --- | --- | --- | --- |
| `apps/api` | NestJS API | 55 controllers · 225 HTTP handlers · 82 test suites / 227 tests | Production pilot |
| `apps/web` | React Vite portals | ~80 routes · 7 portals · Waves I–L UI | Production pilot |
| `apps/mobile` | Expo agent app | UC-UX-01 · GPS · offline sync · push · EAS config G2.4 | Preview build ready |
| `prototype` | UC catalog UI | 78 UC · `/uc/:id` interactive flows | BA reference |

### UC coverage (78 catalog)

| Kênh | UC | Coverage | Ghi chú |
| --- | --- | --- | --- |
| Web UI (`apps/web`) | 70 | 90% | Shared routes cover demo IDs (`/public/units/:id`, `/agent/leads/:id`) |
| Mobile (`apps/mobile`) | 1 | 100% | UC-UX-01 — thay web PWA `/agent/mobile` |
| System / API-only | 3 | 100% | UC-GR-07 SSE · UC-LS-07 search worker · UC-COM-02 snapshot |
| Prototype-only reference | 4 | — | Demo path aliases trong `useCases.ts` — đã map dynamic route web |
| Tổng catalog | 78 | ≥97% pilot | 74+ màn hình wired · 3 system · 1 mobile |

### SCR theo portal (`apps/web`)

| Portal | SCR (approx) | Phạm vi chính |
| --- | --- | --- |
| Public + Buyer | 14 | Search · compare · chat · map 3D · payment · BNPL · e-sign |
| Agent | 18 | Pipeline · inbox · AI reply/legal · booking · listings · SLA |
| Admin | 22 | Moderation · KYC · integrations · GMV · disputes · workflows |
| Developer | 11 | GR · import · absorption · attribution · webhooks |
| Finance | 7 | Reconcile · refund · settlement · escrow · commission |
| Auth | 3 | Login · SSO OIDC · callback JWT |

## AI federation (MOD-AI)

> Kiến trúc **AI Workforce** — nhiều surface dùng chung guardrails, provider routing, human-in-the-loop. Tham chiếu `Ke-hoach-du-an.md` §5 · `apps/api/src/modules/ai-*`

### Surfaces

| Agent surface | Module | UC | Provider mode | API / behavior |
| --- | --- | --- | --- | --- |
| Sales Copilot | `ai-copilot` | UC-AI-01 | Template + guardrails | `POST /ai/copilot/generate` · block price/inventory mutation |
| Lead Scoring | `ai-scoring` | UC-AI-02 | Rules + async queue | `GET /ai/scoring/leads/:id` · explain factors · HOT/WARM tier |
| Legal RAG | `ai-legal` | UC-AI-03 | Corpus + retrieve | `POST /ai/legal/query` · cite sources · tenant corpus |
| Sales Reply | `ai-reply` | UC-AI-04 | OpenAI-compatible LLM | `AiReplyLlmClient` · template fallback · send → CRM inbox |
| Buyer Chat | `ai-chat` | UC-AI-07 | Session + recommend | `POST /ai/chat/messages` · unit recommendations · lead capture |
| Ops Anomaly | `ai-anomaly` | UC-AI-05 | Queue stub → ops | `GET /ai/anomalies` · moderation handoff |

### Federation rules

| Rule | Mô tả |
| --- | --- |
| Gateway pattern | Mỗi surface gọi service layer — không direct DB / không mutate GR |
| Provider routing | `OPENAI_API_KEY` → live LLM · thiếu key → template/sandbox (dev default) |
| Human-in-the-loop | Copilot + AI reply + chat handoff — agent approve trước outbound |
| Tenant isolation | `X-Tenant-Id` + JWT · vector/RAG corpus theo tenant |
| Audit | Prompt/response metadata → `audit_events` · AI action trace (FR-AI guardrails) |
| Delivery federation | AI reply send → `CrmInboxDeliveryService` (Zalo ZNS · SMS · web stub) |

## API — shipped vs target

> **Target:** OpenAPI 3.1 Phase 1 — 71 operations (`Thiet-ke-API.md` · `openapi.yaml`) · **Shipped:** NestJS `apps/api` handlers (auto-count từ controllers)

| Domain | Target P1 ops | Shipped handlers | Δ | Ghi chú |
| --- | --- | --- | --- | --- |
| Identity / Auth / Tenant | 13 | 23 | +10 | SSO OIDC · branding · expanded user/role |
| Golden Record + Projects | 17 | 11 | −6 | P1 core · bulk import P2 partial |
| Listing + Media | 8 | 18 | +10 | Wizard · moderation · virus scan pilot |
| Search + Index | 2 | 4 | +2 | UC-LS-07 worker · index status |
| CRM + Inbox + SLA | 12 | 15 | +3 | Unified inbox · routing · activities |
| Booking + Contracts + Workflow | 7 | 19 | +12 | 15-state · e-sign · custom workflow P4 |
| Payment + Refund + Webhook | 3 | 17 | +14 | VNPay · orchestrator · escrow · BNPL partner |
| Ledger + Commission | 2 | 28 | +26 | P2 settlement · split · export · holdback |
| AI (copilot + scoring) | 2 | 13 | +11 | 6 federation surfaces (see above) |
| Analytics | 1 | 5 | +4 | Funnel · GMV · absorption · forecast · attribution |
| Trust + Audit + Export | 1 | 11 | +10 | Disputes · regulatory export · document vault |
| Integrations (NW) | 0 | 22 | +22 | Zalo · Meta · SMS · API marketplace · tenant webhooks |
| Portal BFF + Mobile | 0 | 11 | +11 | Public map 3D · dev dashboard · mobile-agent |
| Stream (SSE) | 1 | 1 | 0 | `GET /stream/units` · UC-GR-07 |
| Health / Ops | 0 | 1 | +1 | `GET /health` |
| Tổng OpenAPI P1 contract | 71 | ~71 core + ~154 extended | +154 extended | 225 handlers total · Waves G–L |

**Env keys (AI + integrations):** `OPENAI_API_KEY` · `SSO_OIDC_*` · `BNPL_PARTNER_*` · `ZALO_*` · `SMS_*` — xem `apps/api/.env.example`

## Baseline KPI & operational gates

> North Star từ `Ke-hoach-du-an.md` §7 · OP-WIN từ `Tieu-chi-chap-nhan.md` §14 · cột **As-Is** = trạng thái repo hiện tại

### KPI matrix

| KPI | As-Is (Jul 2026) | Phase 1 target | Phase 3 | Phase 6 |
| --- | --- | --- | --- | --- |
| GMV qua platform | — | Baseline pilot | +50% YoY | +200% YoY |
| Lead response (hot) | Manual / spreadsheet | < 15 phút | < 5 phút | < 2 phút |
| Booking → deposit rate | N/A offline | +10% | +25% | +40% |
| Payment reconcile match | Pilot stub verified | 100% daily | 100% realtime | 100% realtime |
| Inventory sync lag (search) | Worker 2s poll | < 5s | < 1s | < 500ms |
| Agent platform adoption | Mobile preview | 70% | 85% | 95% |
| API P95 latency | Dev localhost | < 500ms | < 200ms | < 150ms |
| Uptime SLA | Dev only | 99.5% | 99.9% | 99.95% |
| UC catalog coverage | 78 UC spec | ≥97% wired | 100% P0 vertical | 100% Must FR |
| API contract (OpenAPI P1) | 71 ops documented | 71 core shipped | Contract test CI | Partner SDK |
| Automated tests (API) | 0 → 227 | 227 pass / 82 suites | Regression gate | Load + chaos |
| OP-WIN pilot gates | OP-WIN-01→05 spec | Smoke + UAT checklist | OP-WIN-06→09 | OP-WIN-10→15 |

### OP-WIN baseline (pilot)

| ID | Tiêu chí | As-Is evidence | Gate |
| --- | --- | --- | --- |
| OP-WIN-01 | Không double-book | Redis lock + booking tests | ☐ pilot load test |
| OP-WIN-02 | Không lệch sổ | Reconcile dashboard live | ☐ 7-day streak |
| OP-WIN-03 | Timeline tranh chấp | Booking replay API | ☐ ≤3 min demo |
| OP-WIN-04 | Anti-drift block | Moderation + GR patch gate | ☐ 100% drift block |
| OP-WIN-05 | Vertical slice E2E | GR→book→pay→ledger→COM stub | ☐ 1 real deal |
| OP-WIN-09 | Mobile beta WAU | apps/mobile + EAS G2.4 | ☐ ≥70% pilot agents |

## Regenerate

```bash
cd WEREAL/scripts
python3 build_ba_spec_workbook.py
python3 generate_wereal_ba_spec_markdown.py
```
