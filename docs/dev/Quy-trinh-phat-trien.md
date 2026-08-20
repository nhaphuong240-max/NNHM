# Quy trình Phát triển / Lập trình — WEREAL REOS

> **Document ID:** WEREAL-DEV-2026-v1.0  
> **Baseline:** WEREAL-BL-2026-002 · Go-live MVP 31/12/2026  
> **Tham chiếu:** SDD · OpenAPI · BA Spec · ADR · `Sprint-Backlog-P0.md`

---

## 1. Mục đích

Giai đoạn **Phát triển/Lập trình** hiện thực hóa thiết kế thành sản phẩm chạy được. Tài liệu này chuẩn hóa cách làm việc của team Engineering — bám **modular monolith** (ADR-001) và **vertical slice P0** (`Ke-hoach-du-an.md` §13).

---

## 2. Nguyên tắc (checklist giai đoạn)

| # | Nên làm | Cách WEREAL áp dụng |
|---|---------|---------------------|
| 1 | Chia công việc thành module nhỏ | 18 domain modules NestJS · sprint theo bounded context |
| 2 | Viết mã theo chuẩn dự án | `CODE-STANDARDS.md` · ESLint · OpenAPI contract-first |
| 3 | Quản lý mã nguồn Git | Branch `feature/*` · PR bắt buộc · không push thẳng `main` |
| 4 | Review code thường xuyên | ≥1 approval · checklist PR · architecture review hàng tháng |
| 5 | Tích hợp liên tục | CI: lint + test + OpenAPI diff · staging deploy mỗi sprint |
| 6 | Tài liệu kỹ thuật khi cần | ADR cho quyết định mới · README module · runbook ops |
| 7 | Theo dõi tiến độ sprint/task | Jira/Linear map UC-ID · demo cuối sprint · burndown |

---

## 3. Cấu trúc repository

```
WEREAL/
├── apps/
│   ├── api/              # NestJS modular monolith (production backend)
│   ├── mobile/           # Expo React Native — Agent app (UC-UX-01)
│   └── web/              # Next.js 14 (Phase 1 — migrate từ prototype/)
├── packages/
│   └── shared/           # Types, constants (sync OpenAPI / design tokens)
├── prototype/            # UI prototype v2.1 (reference — không production)
├── openapi.yaml          # Contract source — generate client/server stubs
├── adr/                  # Architecture Decision Records
├── docs/
│   ├── dev/              # Quy trình dev (file này)
│   └── specs/            # BA, Design System
└── scripts/              # BA Excel, OpenAPI generator
```

**Luồng code:** BA deep-spec → OpenAPI → module implementation → FE BFF → UAT (`Tieu-chi-chap-nhan.md` §14).

---

## 4. Modular monolith — ranh giới module

Theo ADR-001, mỗi module trong `apps/api/src/modules/`:

| Module | Mã SDD | Sprint P0 | UC chính |
|--------|--------|-----------|----------|
| `identity` | M01–M03 | S1 | UC-ID-01→04 |
| `golden-record` | M04 | S1–S2 | UC-GR-01→03 |
| `listing` | M05 | S3 | UC-GR-02, UC-LS-02 |
| `booking` | M08 | S2–S3 | UC-BK-01→05 |
| `payment` | M09 | S3–S4 | UC-PAY-01→03 |
| `ledger` | M10 | S4 | UC-PAY-02, reconcile |
| `audit` | TR | S2 | UC-TR-01 |
| `commission` | COM | S5–S6 | UC-COM-01→02 |

**Quy tắc import (enforce PR review):**

- Controller → Service (cùng module) hoặc **public interface** module khác
- **Cấm** import Repository trực tiếp từ module khác
- Cross-module: domain events (RabbitMQ ADR-003) hoặc application service facade

---

## 5. Git workflow

```
main          ← production-ready, protected
develop       ← integration branch (optional)
feature/WREAL-123-gr-unit-patch
fix/WREAL-456-webhook-idempotency
```

| Bước | Hành động |
|------|-----------|
| 1 | Pull `main` / `develop` mới nhất |
| 2 | Branch `feature/{ticket}-{slug}` |
| 3 | Commit nhỏ, message: `feat(gr): add unit patch optimistic lock` |
| 4 | Push → mở PR → link UC/FR/ticket |
| 5 | CI pass + 1 reviewer approve → merge |
| 6 | Squash hoặc merge commit theo team convention |

**Commit prefix:** `feat` · `fix` · `refactor` · `test` · `docs` · `chore`

---

## 6. Code review checklist

- [ ] Khớp OpenAPI (`openapi.yaml`) — không breaking change không version
- [ ] `tenant_id` + RLS / guard mọi mutation (ADR-002)
- [ ] Audit event cho thao tác nhạy cảm (UC-TR-01)
- [ ] Idempotency payment/webhook (BR-21)
- [ ] Không cross-module repository import
- [ ] Unit test critical path ≥80% code mới (NFR-M01)
- [ ] Không secret trong code — dùng env / vault

Template PR: `.github/PULL_REQUEST_TEMPLATE.md`

---

## 7. CI/CD (mục tiêu Sprint S1)

| Stage | Lệnh / công cụ |
|-------|----------------|
| Lint | `npm run lint` (api + web) |
| Typecheck | `npm run build` |
| Unit test | `npm run test` |
| Contract | OpenAPI diff vs `openapi.yaml` |
| Integration | Testcontainers PostgreSQL + booking lock |
| Deploy staging | Docker → `api.staging.wereal.vn` |

---

## 8. Tích hợp theo vertical slice P0

Thứ tự **tích hợp end-to-end** (không làm hết UI rồi mới nối API):

```
S1: Identity + GR read
S2: GR write + Audit + Listing draft
S3: Booking lock + SSE stub
S4: Payment intent + webhook + Ledger
S5: Commission snapshot (COM-02) + Finance reconcile UI
S6: Pilot UAT OP-WIN-01→05
```

Chi tiết task: [`Sprint-Backlog-P0.md`](./Sprint-Backlog-P0.md)

---

## 9. Tài liệu kỹ thuật — khi nào viết

| Tình huống | Deliverable |
|------------|-------------|
| Quyết định kiến trúc mới | ADR mới trong `adr/` |
| Module mới / API phức tạp | `apps/api/src/modules/{name}/README.md` |
| Runbook vận hành | `docs/runbooks/` (payment, reconcile) |
| Thay đổi schema DB | Migration + cập nhật `So-do-CSDL.md` |
| Thay đổi contract | Regenerate `openapi.yaml` qua `scripts/generate-openapi.py` |

---

## 10. Liên kết

| Tài liệu | File |
|----------|------|
| Sprint backlog P0 | `docs/dev/Sprint-Backlog-P0.md` |
| Code standards | `docs/dev/CODE-STANDARDS.md` |
| API backend README | `apps/api/README.md` |
| **Mobile Agent app** | `apps/mobile/README.md` · `docs/dev/Mobile-Strategy.md` |
| Kế hoạch vận hành | `Ke-hoach-du-an.md` §13 |
| Tiêu chí chấp nhận | `Tieu-chi-chap-nhan.md` §14 |
| OpenAPI | `openapi.yaml` |
