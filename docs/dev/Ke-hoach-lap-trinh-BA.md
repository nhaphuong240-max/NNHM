# Kế hoạch Lập trình — bám WEREAL_BA_Spec.xlsx

> **Document ID:** WEREAL-DEV-PLAN-2026-v1.0  
> **Nguồn BA:** `docs/samples/WEREAL_BA_Spec.xlsx` (v1.3 · regenerate: `scripts/build_ba_spec_workbook.py`)  
> **Baseline:** 73 SCR · 78 UC · 33 UC deep-spec · 73 SCR deep-spec · OpenAPI 71 endpoint  
> **Sprint:** `Sprint-Backlog-P0.md` · 6 sprint × 2 tuần · Go-live MVP 31/12/2026

---

## 1. Mục tiêu giai đoạn Coding

Hiện thực **vertical slice P0**: 1 deal end-to-end **GR → Listing → Lead → Booking → Pay → Ledger → Commission**, đáp ứng **OP-WIN-01→05** và gate **G1.5** (0 double-book).

**Không** code 78 UC song song — ưu tiên **34 màn hình P0 (High)** và API contract trước, màn Phase 2+ giữ prototype.

---

## 2. Nguồn truth & cách đọc Excel

| Sheet / tab | Dùng khi code |
|-------------|----------------|
| **Danh sách màn hình** | SCR-ID, route, portal, UC liên kết → route Next.js / RN screen |
| **Danh sách use case** | UC-ID, pre/post, BR → acceptance criteria PR |
| **SCR-{id}** (73 sheet) | UI components, API, rules — spec implement từng màn |
| **UC-{id}** (78 sheet) | Main/alt flow, I/O, API — spec backend + E2E |
| **Traceability** | BR → SCR → UC → TC — checklist UAT |
| **Test cases TC-01→25** | QA gate cuối sprint |

**Luồng dev chuẩn (1 màn hình):**

```
SCR sheet → route apps/web|mobile → components (design tokens v2.1)
         → OpenAPI endpoint → NestJS module → unit test → demo script
         → cập nhật status sheet Excel: In progress → Done
```

---

## 3. Hiện trạng codebase (T7/2026)

| Layer | Trạng thái | Ghi chú |
|-------|------------|---------|
| `apps/api` | Scaffold S1 | 9 module · `GET /health` · stub `GET /leads` · stub `POST /bookings` |
| `apps/mobile` | S2–S3 partial | 4 tab · M-S3-01 cache · M-S3-02 quick book |
| `apps/web` | **Chưa tạo** | Migrate từ `prototype/` (S2-06) |
| `prototype/` | Reference UI | 22 page · 78 UC catalog · **không production** |
| `openapi.json` | Contract | 71 op — chưa sync hết stub API |
| Postgres/Redis | **Đã wire** | Docker S1 · booking lock Redis S3-01/02 |

---

## 4. Phân bổ 73 màn hình theo portal → app

| Portal | SCR | App target | Sprint ưu tiên |
|--------|-----|------------|----------------|
| Admin | 23 | `apps/web` `/admin/*` | S1, S2, S6 |
| Agent | 16 | `apps/web` + `apps/mobile` | S2, S3 |
| Developer | 13 | `apps/web` `/developer/*` | S1, S2, S5 |
| Finance | 6 | `apps/web` `/finance/*` | S4, S5 |
| Public | 6 | `apps/web` `/public/*` | S2 |
| Buyer | 4 | `apps/web` `/buyer/*` | S3, S4 |
| Auth | 2 | `apps/web` `/auth/*` | S1 |
| System | 3 | `apps/api` worker/SSE | S2, S3 |

---

## 5. Lộ trình 6 sprint — map SCR / UC / task

### Sprint S1 — Foundation (tuần 1–2)

**Demo:** Login → list units 1 project · audit 1 mutation

| Ưu tiên | SCR | UC | API / FE task |
|---------|-----|-----|----------------|
| P0 | SCR-AUTH-001 | UC-ID-03 | JWT + refresh + tenant guard (S1-02) |
| P0 | SCR-ADMIN-019 | UC-ID-01 | POST tenant onboarding stub (S1-03) |
| P0 | SCR-DEV-012 | UC-GR-01 | GET/PATCH units + Postgres + optimistic lock (S1-04, S2-01) |
| P0 | SCR-ADMIN-005 | UC-TR-01 | Audit interceptor append-only (S1-05) |
| Infra | — | — | Docker PG/Redis · CI lint/test (S1-01, S1-06) |

**Coding order:** `identity` → `golden-record` (read) → `audit` → health/CI.

---

### Sprint S2 — GR write + Listing + Web shell

**Demo:** Dev sửa giá GR → agent listing → ops approve · Agent app Leads

| Ưu tiên | SCR | UC | Task |
|---------|-----|-----|------|
| P0 | SCR-DEV-012 | UC-GR-01 | PATCH unit + version conflict 409 (S2-01) |
| P0 | SCR-AGENT-011 | UC-GR-02, UC-AI-01 | Listing wizard POST listing (S2-03) |
| P0 | SCR-ADMIN-016 | UC-GR-03, UC-LS-02 | Moderation queue (S2-04) |
| P0 | SCR-PUBLIC-005 | UC-LS-01 | Public search shell → `apps/web` (S2-06) |
| P0 | SCR-AGENT-014 | UC-CRM-03 | Pipeline kanban (prototype → web) |
| P0 | SCR-AGENT-013 | UC-UX-01 | Mobile tabs + GPS (M-S2-01/02) |
| P0 | SCR-SYS-002 | UC-GR-07 | SSE unit status (S3-04 — có thể bắt đầu cuối S2) |

**Coding order:** GR write → `listing` module → scaffold `apps/web` (Next 14) → migrate Public + Agent pages từ prototype.

---

### Sprint S3 — Booking + CRM + Mobile

**Demo:** 2 agent book 1 unit → 1 OK 1 fail · mobile quick book

| Ưu tiên | SCR | UC | Task |
|---------|-----|-----|------|
| P0 | SCR-AGENT-005 | UC-BK-01 | ✅ POST booking + **Redis** lock (S3-01) · expiry job (S3-02) |
| P0 | SCR-AGENT-003 | UC-BK-03 | GET timeline/events (S3-03) |
| P0 | SCR-PUBLIC-006 | UC-CRM-01, UC-LS-05 | Unit detail + lead form PDPA (S3-05) |
| Mobile | SCR-AGENT-013 | UC-UX-01 | ✅ M-S3-01 cache · ✅ M-S3-02 POST /bookings |
| Load | — | UC-BK-01 | k6 100 concurrent (S3-06) |

**Coding order:** ✅ Double-entry ledger · ✅ Daily reconcile (S4-04) · ✅ Refund/reversal (S4-05) · ✅ Finance reconcile UI (S4-06).

---

### Sprint S4 — Payment + Ledger

**Demo:** Book → pay sandbox → ledger → reconcile pass

| SCR | UC | Task |
|-----|-----|------|
| SCR-BUYER-004 | UC-PAY-01 | PaymentIntent + VNPay sandbox (S4-01, S4-02) |
| SCR-FIN-004 | UC-PAY-02 | Reconcile job + dashboard (S4-03, S4-04) |
| SCR-FIN-005 | UC-PAY-03 | Refund + reversal (S4-05) |
| SCR-BUYER-002 | UC-BK-02 | Buyer deal stepper (read) |
| SCR-AGENT-004 | UC-BK-05 | Cancel booking chain |

---

### Sprint S5 — Commission + Trust

| SCR | UC | Task |
|-----|-----|------|
| SCR-DEV-004 | UC-COM-01 | Policy CRUD publish (S5-01) |
| SCR-SYS-001 | UC-COM-02 | Snapshot on deal complete (S5-02) |
| SCR-FIN-001 | UC-COM-05 | Commission export |
| SCR-ADMIN-005 | UC-TR-01 | Audit export CSV (S5-05) |

---

### Sprint S6 — Pilot hardening

UAT TC-01→25 · pen test · runbook · regression smoke — ưu tiên SCR admin KPI (SCR-ADMIN-001, SCR-DEV-001).

---

## 6. Ma trận P0 — 34 màn hình High (coding backlog)

| SCR | Route | UC chính | Sprint | App | Status |
|-----|-------|----------|--------|-----|--------|
| SCR-AUTH-001 | /auth/login | UC-ID-03 | S1 | web | Prototype only |
| SCR-ADMIN-019 | /admin/tenants/onboard | UC-ID-01 | S1 | web | Prototype only |
| SCR-ADMIN-020 | /admin/users | UC-ID-04 | S1 | web | Prototype only |
| SCR-ADMIN-021 | /admin/users/roles | UC-ID-02 | S1 | web | — |
| SCR-ADMIN-005 | /admin/audit | UC-TR-01 | S1 | web | Prototype partial |
| SCR-ADMIN-016 | /admin/moderation | UC-GR-03, UC-LS-02 | S2 | web | Prototype partial |
| SCR-ADMIN-001 | /admin | UC-AN-01 | S6 | web | Prototype partial |
| SCR-DEV-012 | /developer/units | UC-GR-01 | S1–S2 | web | Prototype partial |
| SCR-DEV-010 | /developer/product-graph | UC-GR-04 | S2 | web | — |
| SCR-DEV-001 | /developer | UC-UX-04 | S2 | web | Prototype partial |
| SCR-DEV-004 | /developer/commission | UC-COM-01 | S5 | web | ✅ S5-06 policy UI |
| SCR-AGENT-011 | /agent/listings/new | UC-GR-02 | S2 | web | Prototype partial |
| SCR-AGENT-014 | /agent/pipeline | UC-CRM-03 | S2 | web+mobile | Prototype · mobile list |
| SCR-AGENT-005 | /agent/bookings/new | UC-BK-01 | S3 | web+mobile | Mobile stub ✅ |
| SCR-AGENT-003 | /agent/bookings/bk_018 | UC-BK-03 | S3 | web | — |
| SCR-AGENT-004 | /agent/bookings/cancel | UC-BK-05 | S4 | web | — |
| SCR-AGENT-013 | /agent/mobile | UC-UX-01 | S2–S3 | mobile | ✅ shell |
| SCR-PUBLIC-005 | /public/search | UC-LS-01 | S2 | web | Prototype partial |
| SCR-PUBLIC-006 | /public/units/un_01 | UC-LS-05, UC-CRM-01 | S2–S3 | web | Prototype partial |
| SCR-BUYER-002 | /buyer/deals | UC-BK-02 | S4 | web | — |
| SCR-BUYER-004 | /buyer/payment | UC-PAY-01 | S4 | web | — |
| SCR-FIN-004 | /finance/reconciliation | UC-PAY-02 | S4 | web | ✅ S4-06 dashboard |
| SCR-FIN-005 | /finance/refunds | UC-PAY-03 | S4 | web | ✅ SCR-FIN-005 refunds UI |
| SCR-FIN-006 | /finance/settlement | UC-PAY-04 | S5 | web | — |
| SCR-FIN-001 | /finance/commission/export | UC-COM-05 | S5 | web | ✅ API export.csv |
| SCR-SYS-002 | SSE | UC-GR-07 | S3 | api | — |
| SCR-SYS-001 | worker | UC-COM-02 | S5 | api | — |
| SCR-SYS-003 | CDC | UC-LS-07 | S2 | api | — |

*(Các SCR Admin integrations NW/CRM Phase 2: SCR-ADMIN-010/011/013 — sau P0 vertical slice.)*

---

## 7. Thứ tự module backend (`apps/api`)

```
S1: health → identity → golden-record (read) → audit
S2: golden-record (write) → listing
S3: crm → booking (Redis) → stream/SSE
S4: payment → ledger
S5: commission
S6: hardening + integration tests
```

**Quy tắc:** Mỗi mutation → audit event · mọi endpoint tenant-scoped · OpenAPI cập nhật cùng PR.

---

## 8. Frontend — migrate prototype → `apps/web`

| Phase | Việc |
|-------|------|
| S2 W1 | `create-next-app` · Tailwind · design tokens v2.1 · layout Public/Agent/Admin/Dev |
| S2 W2 | Port SCR-PUBLIC-005, SCR-PUBLIC-006, SCR-AGENT-011, SCR-DEV-012 |
| S3 | Port SCR-AGENT-005, SCR-AGENT-014, BFF fetch API |
| S4+ | Buyer + Finance portals |

**Shared:** `packages/shared` — types từ OpenAPI · constants UC/SCR IDs.

---

## 9. Definition of Done — 1 SCR

- [ ] Route production khớp cột **Route** trong Excel
- [ ] UI components khớp sheet **SCR-{id}** (cột UI checklist)
- [ ] API khớp cột **API** trong SCR sheet + OpenAPI
- [ ] UC linked: main flow + alt E1/E2 pass manual test
- [ ] BR trong traceability có evidence (test hoặc audit log)
- [ ] Unit test critical path · PR link UC-ID / SCR-ID
- [ ] Excel status → **Done**

---

## 10. Bắt đầu coding — Tuần 1 (ngay)

### Ngày 1–2: Infra S1
1. Docker Compose Postgres + Redis (`apps/api`)
2. Prisma/TypeORM schema: `tenants`, `users`, `units`, `audit_events`
3. Wire `GET /units` từ DB thay stub (SCR-DEV-012)

### Ngày 3–4: Identity S1
4. `POST /auth/login` + JWT + `TenantMiddleware` (SCR-AUTH-001 / UC-ID-03)
5. Mobile M-S2-01: login screen + SecureStore

### Ngày 5: Audit + CI
6. Audit interceptor on PATCH unit (UC-TR-01)
7. CI GitHub Actions: lint + test api/mobile

### Deliverable tuần 1
**Demo:** Login agent → GR grid 1 project từ Postgres → sửa giá → thấy audit event.

---

## 11. Liên kết tài liệu

| File | Vai trò |
|------|---------|
| `docs/samples/WEREAL_BA_Spec.xlsx` | SCR/UC master |
| `docs/dev/Sprint-Backlog-P0.md` | Task ID sprint |
| `docs/dev/Quy-trinh-phat-trien.md` | Git, CI, module rules |
| `openapi.json` | API contract |
| `prototype/src/config/useCases.ts` | UC catalog sync prototype |
| `Tieu-chi-chap-nhan.md` §14 | AC-XX acceptance |

---

*Cập nhật khi hoàn thành sprint — sync status với Excel BA Spec.*
