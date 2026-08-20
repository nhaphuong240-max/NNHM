# ADR-003: Event Store trên PostgreSQL + RabbitMQ (→ Kafka P3)

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-003 |
| **Status** | Accepted |
| **Date** | 18/07/2026 |
| **Deciders** | Architecture Team, Tech Lead, Backend Lead |
| **Baseline** | WEREAL-BL-2026-002 |
| **Related FR/NFR** | FR-BK-04, FR-PAY-04, FR-GR-08, NFR-SC04, BR-08, BR-24 |
| **Supersedes** | — |
| **Superseded by** | — |

## Context

WEREAL yêu cầu **event sourcing** cho booking/payment lifecycle:

- 15-state booking state machine với 24 domain events
- Replay timeline cho dispute evidence (retention ≥ 5 năm — BR-24)
- Async search index sync (OpenSearch CDC)
- Notification, webhook retry, booking expiry timers

Ràng buộc Phase 1:

- Team **chưa có Kafka expertise**
- Target throughput: **500 events/s** (NFR-SC04)
- Cần ACID: business write + event append trong cùng transaction
- Ops team nhỏ — ưu tiên infra đơn giản

## Decision

1. **Event store** = PostgreSQL append-only table `domain_events` (cùng primary DB)
2. **Message queue Phase 1** = **RabbitMQ 3.12** với Outbox pattern
3. **Migration Kafka** = Phase 3 khi throughput hoặc replay requirements vượt ngưỡng

### Queue Topology Phase 1

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `wereal.search.index` | Outbox worker | Search indexer | Unit/listing CDC |
| `wereal.notification` | Domain modules | Notification worker | Email, SMS |
| `wereal.webhook.retry` | Payment module | Webhook handler | Failed webhook retry |
| `wereal.booking.expiry` | Booking module | Expiry worker | Reservation TTL |

## Rationale

1. **PG event store** — ACID cùng business transaction; không thêm infra P1; backup bao gồm events
2. **RabbitMQ** — ops đơn giản, single node đủ 500 events/s; delayed messages via TTL + DLX
3. **Outbox pattern** — reliable publish: write outbox row cùng transaction → worker publish → mark sent
4. **Event replay** — query `domain_events` table trực tiếp; không cần Kafka log retention P1
5. **Kafka P3** — khi cần partition, consumer group scale, hoặc event bus replay từ message log

## Consequences

### Positive

- Single DB backup includes business data + event history
- RabbitMQ ops familiar; CloudAMQP managed option
- Outbox guarantees at-least-once delivery without dual-write problem
- Dispute replay: `GET /bookings/{id}/events` reads PG directly

### Negative

- PG event store scale limit ~10K events/s — đủ P1–P2, cần review P3
- RabbitMQ limited event replay vs Kafka log retention
- Migration effort P3 — dual-write period during Kafka cutover

### Neutral

- OpenSearch sync async — eventual consistency ≤ 5s (NFR-P04)

## Alternatives Rejected

| Alternative | Lý do loại |
|-------------|------------|
| Kafka from day 1 | Overkill P1; ops complexity; team learning curve |
| Redis Streams only | Không đủ persistence guarantee cho dispute evidence |
| Separate EventStoreDB | Thêm infra + cost; PG đủ Phase 1 |
| In-process only (@nestjs/event-emitter) | Không durable; mất events on restart |

## Review Trigger (Kafka Migration)

Migrate to Kafka when **any** condition met:

- Event throughput **> 1000/s sustained** for 7 days
- Need **event replay from message bus** (not just DB query)
- Multiple consumer teams need independent replay offsets
- Phase 3 Agents + marketplace event volume

## Implementation Notes

```sql
CREATE TABLE domain_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id   VARCHAR(50) NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  payload        JSONB NOT NULL,
  metadata       JSONB,
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sequence_num   BIGINT NOT NULL
);

CREATE INDEX idx_events_aggregate ON domain_events (tenant_id, aggregate_type, aggregate_id, sequence_num);
```

**Outbox pattern:**

```sql
CREATE TABLE outbox_messages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  topic VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);
```

## References

- SDD §7 Event Sourcing Design
- SDD §4.5 Message Queue justification
- [`So-do-CSDL.md`](../So-do-CSDL.md) — `domain_events`, `outbox_messages` tables
- [`Thiet-ke-API.md`](../Thiet-ke-API.md) — API-059, API-060 booking events/timeline
