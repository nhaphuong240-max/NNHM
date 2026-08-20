# Architecture Decision Records — WEREAL REOS

> **Registry ID:** WEREAL-ADR-REGISTRY-2026-v1.0  
> **Baseline:** WEREAL-BL-2026-002  
> **Source SDD:** [`Tai-lieu-thiet-ke-he-thong.md`](../Tai-lieu-thiet-ke-he-thong.md) §18

## Mục đích

Thư mục này lưu trữ các **Architecture Decision Records (ADR)** — tài liệu hóa quyết định kiến trúc quan trọng, bối cảnh, lý do và hệ quả để đội phát triển và reviewer có thể truy vết.

## Quy ước đặt tên

```
ADR-{NNN}-{slug-kebab-case}.md
```

## Trạng thái ADR

| Status | Ý nghĩa |
|--------|---------|
| Proposed | Đang thảo luận, chưa chốt |
| Accepted | Đã phê duyệt, đang áp dụng |
| Deprecated | Thay thế bởi ADR mới |
| Superseded | Bị thay thế hoàn toàn |

## Danh sách ADR Phase 1

| ADR | Tiêu đề | Status | Date | Phase Impact |
|-----|---------|--------|------|--------------|
| [ADR-001](./ADR-001-modular-monolith-phase-1.md) | Modular Monolith cho Phase 1 | Accepted | 15/07/2026 | P1 architecture |
| [ADR-002](./ADR-002-postgresql-rls-tenant-isolation.md) | PostgreSQL 16 + RLS cho Tenant Isolation | Accepted | 15/07/2026 | P1 data isolation |
| [ADR-003](./ADR-003-event-store-postgresql-rabbitmq.md) | Event Store trên PostgreSQL + RabbitMQ (→ Kafka P3) | Accepted | 18/07/2026 | P1–P3 event architecture |
| [ADR-004](./ADR-004-payment-gateway-adapter-pattern.md) | Payment Gateway Adapter Pattern | Accepted | 20/07/2026 | P1–P3 payment |
| [ADR-005](./ADR-005-ai-gateway-architecture.md) | AI Gateway — NestJS Module P1, FastAPI Sidecar P2 | Accepted | 22/07/2026 | P1–P3 AI |

## Liên kết tài liệu liên quan

| Tài liệu | File |
|----------|------|
| System Design Document | [`Tai-lieu-thiet-ke-he-thong.md`](../Tai-lieu-thiet-ke-he-thong.md) |
| Sơ đồ kiến trúc | [`So-do-kien-truc.md`](../So-do-kien-truc.md) |
| Thiết kế API | [`Thiet-ke-API.md`](../Thiet-ke-API.md) |
| OpenAPI Specification | [`openapi.yaml`](../openapi.yaml) |

## Template tạo ADR mới

Khi thêm ADR mới, copy cấu trúc từ bất kỳ file ADR-00X nào và cập nhật bảng registry ở trên.
