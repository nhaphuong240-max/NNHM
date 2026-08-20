# ADR-001: Modular Monolith cho Phase 1

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-001 |
| **Status** | Accepted |
| **Date** | 15/07/2026 |
| **Deciders** | Architecture Team, Tech Lead, Product Owner |
| **Baseline** | WEREAL-BL-2026-002 |
| **Related FR/NFR** | CON-T01, NFR-SC04, FR-BK-02, FR-PAY-03 |
| **Supersedes** | — |
| **Superseded by** | — |

## Context

WEREAL REOS Phase 1 MVP có các ràng buộc sau:

- Team core **8–12 engineers**, go-live mục tiêu **31/12/2026**
- **39 functional requirements Must** cần triển khai trong ~26 tuần
- Chưa có production traffic — chưa cần scale horizontal ngay
- Booking + Payment yêu cầu **ACID transaction** trong cùng bounded context
- Module boundary trong monolith phải map được sang service boundary tương lai (Phase 2–3)

Các lựa chọn đã xem xét:

1. **Microservices** — tách Identity, GR, Booking, Payment, Search, CRM từ đầu
2. **Modular Monolith** — NestJS single deploy, module per domain
3. **Serverless** — Lambda + managed services (loại sớm do event sourcing + long-running booking state)

## Decision

Triển khai **NestJS modular monolith** cho Phase 1 thay vì microservices.

Cấu trúc module (18 modules M01–M18) với ranh giới rõ ràng:

- Mỗi module có controller, service, repository riêng
- Cross-module communication qua domain events hoặc public service interface — không import trực tiếp repository nội bộ
- Single PostgreSQL database với RLS — shared transaction cho Booking + Payment + Ledger

## Rationale

1. **Velocity** — single deploy, shared DB transactions, ít overhead DevOps
2. **Team size** — 8–12 engineers không đủ capacity vận hành 6+ microservices + service mesh
3. **Future extraction** — module boundary = future service boundary (Payment P2, Search P2, AI P3)
4. **ACID requirement** — Booking inventory lock + PaymentIntent + Ledger entry cần cùng transaction boundary
5. **Go-live constraint** — CON-T01 bắt buộc monolith Phase 1 trong baseline đã xác nhận

## Consequences

### Positive

- Fast iteration — single CI/CD pipeline, single deploy artifact
- Dễ refactor module internals mà không ảnh hưởng network contract
- Shared TypeScript types giữa modules
- Debugging đơn giản — single process, unified tracing

### Negative

- Single point of scale — vertical scaling trước, horizontal phức tạp hơn microservices
- Phải discipline module boundaries — code review enforce import rules
- Risk "big ball of mud" nếu không tách module đúng

### Neutral

- OpenAPI vẫn expose REST contract như distributed system — frontend không biết monolith vs microservices

## Migration Path

| Phase | Action | Trigger |
|-------|--------|---------|
| P2 | Extract **Payment + Ledger** service | Payment throughput > 100 TPS hoặc compliance isolation |
| P2 | Extract **Search indexer** worker (đã async) | OpenSearch cluster scale |
| P3 | Extract **AI Gateway** FastAPI sidecar | RAG + Agents scope (ADR-005) |
| P3 | Evaluate full microservices split | Team ≥ 20 engineers, independent deploy cadence needed |

## Implementation Notes

```
apps/api/src/modules/
├── identity/          # M01, M02, M03
├── golden-record/     # M04
├── listing/           # M05
├── search/            # M06
├── crm/               # M07
├── booking/           # M08
├── payment/           # M09
├── ledger/            # M10
├── ai/                # M11
└── ...
```

- ESLint rule: `no-cross-module-repository-import`
- Architecture review hàng tháng kiểm tra module coupling metrics

## References

- SDD §3.2 Modular Monolith Architecture
- SDD §4.3 Backend justification
- [`So-do-kien-truc.md`](../So-do-kien-truc.md) — C4 Container diagram
