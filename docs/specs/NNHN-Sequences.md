# Sequence diagrams — 4 luồng bắt buộc UAT

> **Mã:** NNHN-SEQ-001 v1.0 · **Wave 0 BA-03**

## 1. Public contact (PDPA + dedup)

```mermaid
sequenceDiagram
  participant S as Seeker
  participant W as Website PDP
  participant API as POST /leads
  participant R as Lead Registry
  participant A as Agent Today

  S->>W: Điền form + tick PDPA v2026-07-01
  W->>API: fullName, phone, unitId, consent
  API->>R: normalize phone
  alt Trùng SĐT active
    R-->>API: merge + NOTE activity
    API-->>W: 200 leadId, meta.deduplicated=true
  else Mới
    R-->>API: NEW lead, score PENDING
    API-->>A: SLA clock HOT nếu score≥85
    API-->>W: 201 leadId
  end
  W-->>S: "Đã ghi nhận yêu cầu"
```

## 2. Viewing request → confirm

```mermaid
sequenceDiagram
  participant S as Seeker
  participant API as POST /viewings
  participant V as Viewing entity
  participant A as Agent calendar

  S->>API: timeslot + PDP context
  API->>API: create/merge lead
  API->>V: status REQUESTED
  A->>V: PATCH CONFIRMED
  V->>API: extend protection TTL
  A->>API: PATCH COMPLETED + outcome
  Note over V: Không chỉ cột kanban VIEWING
```

## 3. Hai sàn trùng SĐT + dự án

```mermaid
sequenceDiagram
  participant A1 as Sàn A Agent
  participant A2 as Sàn B Agent
  participant API as POST /lead-registrations
  participant R as Registry

  A1->>API: phone + project P
  API->>R: ACCEPTED, protectedUntil +30d
  A2->>API: cùng phone + project P
  API->>R: active protection org A
  API-->>A2: EXISTING_PROTECTED, PII masked
  Note over A2: Không thấy tên/SĐT đầy đủ
  A2->>API: Open dispute (P0-S3)
```

## 4. Booking từ lead NEW

```mermaid
sequenceDiagram
  participant A as Agent
  participant B as POST /bookings
  participant I as Inventory lock
  participant L as Lead pipeline

  A->>B: unitId, leadId, expectedUnitVersion
  B->>I: acquire lock
  I-->>B: ok
  B->>L: stage BOOKING
  B-->>A: bookingId
  Note over L: 100% booking có leadId (KPI)
```
