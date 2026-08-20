# Thiết kế API — WEREAL REOS Phase 1

> **Document Control:** WEREAL-API-2026-v1.0
> **Phiên bản:** 1.0 | **Ngày phát hành:** 28/07/2026
> **Trạng thái:** Draft — Chờ Tech Lead review
> **Baseline tham chiếu:** WEREAL-BL-2026-002
> **Liên kết:** `Tai-lieu-yeu-cau-phan-mem.md` | `Yeu-cau-da-xac-nhan.md` | `Mockup-UI-mau.md`

---

## Mục lục

- [1. Kiểm soát tài liệu](#1-kiểm-soát-tài-liệu)
- [2. Mục đích và phạm vi](#2-mục-đích-và-phạm-vi)
- [3. Nguyên tắc thiết kế API](#3-nguyên-tắc-thiết-kế-api)
- [4. Xác thực và phân quyền](#4-xác-thực-và-phân-quyền)
- [5. Schema phản hồi chuẩn](#5-schema-phản-hồi-chuẩn)
- [6. Catalog API Phase 1 theo module](#6-catalog-api-phase-1-theo-module)
- [7. Webhook specifications](#7-webhook-specifications)
- [8. Rate limiting](#8-rate-limiting)
- [9. OpenAPI tags structure](#9-openapi-tags-structure)
- [10. Chiến lược versioning](#10-chiến-lược-versioning)
- [11. BFF aggregation patterns](#11-bff-aggregation-patterns)
- [12. Phụ lục](#12-phụ-lục)

---

## 1. Kiểm soát tài liệu

| Thuộc tính | Giá trị |
|------------|---------|
| **Mã tài liệu** | WEREAL-API-2026-v1.0 |
| **Tên tài liệu** | Thiết kế API — WEREAL REOS Phase 1 |
| **Phiên bản** | 1.0 |
| **Trạng thái** | Draft |
| **Phân loại** | Confidential — Nội bộ dự án |
| **Ngôn ngữ** | Tiếng Việt (thuật ngữ kỹ thuật EN) |
| **Base URL (Production)** | `https://api.wereal.vn/api/v1` |
| **Base URL (Staging)** | `https://api.staging.wereal.vn/api/v1` |

### 1.1 Lịch sử sửa đổi

| Version | Ngày | Mô tả | Author | Reviewer |
|---------|------|-------|--------|----------|
| 0.1 | 20/07/2026 | Draft nội bộ endpoint skeleton | BA Team | Tech Lead |
| **1.0** | **28/07/2026** | **Catalog đầy đủ 45+ endpoints Phase 1, webhook, BFF, OpenAPI tags** | **BA + Arch Team** | **Tech Lead** |

### 1.2 Phân phối

| Nhóm | Mục đích |
|------|----------|
| Backend Team | Implementation contract |
| Frontend / BFF Team | Portal integration |
| QA | Test plan, contract testing |
| DevOps | Gateway, rate limit, WAF config |
| Partner (Payment) | Webhook integration spec |

---

## 2. Mục đích và phạm vi

Tài liệu này định nghĩa **hợp đồng API REST** cho WEREAL REOS Phase 1 MVP, phục vụ:

- Triển khai modular monolith backend (PostgreSQL + RLS, OpenSearch, Redis, Event Store)
- Tích hợp Public Portal (FR-UX-01), Agent Portal (FR-UX-02), Admin Portal (FR-UX-03)
- OpenAPI 3.1 spec generation (NFR-M02: 100% public endpoints documented)
- Contract testing giữa FE/BFF và BE

### 2.1 Phạm vi Phase 1

| Module | Endpoints | FR liên kết |
|--------|-----------|-------------|
| Identity | 13 | FR-ID-01→04 |
| Golden Record | 17 | FR-GR-01→04,08 |
| Listing | 8 | FR-LS-01,03 |
| Search | 2 | FR-LS-02,06 |
| CRM | 12 | FR-CRM-01→05 |
| Booking | 7 | FR-BK-01→04,07 |
| Payment | 3 | FR-PAY-01→05 |
| Ledger | 2 | FR-PAY-03,04 |
| AI | 2 | FR-AI-01→04 |
| Analytics | 1 | FR-AN-01 |
| Audit | 1 | FR-TR-01,05 |
| SSE | 1 | FR-GR-08 |
| **Tổng** | **69** | **38 Must FR P1** |

### 2.2 Out-of-scope API Phase 1

| Hạng mục | Phase | Ghi chú |
|----------|-------|---------|
| Commission API | P2 | FR-COM-01→05 |
| Zalo/Meta webhook inbound | P2 | FR-CRM-06,07 |
| Bulk import Excel | P2 | FR-GR-07 — P1 chỉ POST /units/import đơn lẻ/batch nhỏ |
| SSO SAML/OIDC | P4 | FR-ID-06 |
| Multi-gateway routing | P3 | FR-PAY-06 |

---

## 3. Nguyên tắc thiết kế API

### 3.1 REST conventions

| Quy tắc | Mô tả | Ví dụ |
|---------|-------|-------|
| Resource-oriented URLs | Danh từ số nhiều, kebab-case | `/units`, `/payment-intents` |
| HTTP verbs semantic | GET=read, POST=create/action, PATCH=partial update, DELETE=soft-delete | |
| Nested resources ≤ 2 cấp | Tránh URL quá sâu | `/bookings/{id}/timeline` ✅ |
| Action endpoints | POST cho state transition | `/listings/{id}/submit-review` |
| Collection filtering | Query params | `?status=available&projectId=...` |
| Sorting | `sort=field:asc` | `sort=createdAt:desc` |
| Field selection | `fields=id,name,status` (optional P2) | Giảm payload |

### 3.2 Versioning

- **URL path versioning:** `/api/v1/...` — version chính thức Phase 1
- **Header tùy chọn:** `Accept: application/vnd.wereal.v1+json` — dự phòng migration
- **Breaking change policy:** Chỉ tăng major version (`v2`); `v1` maintained ≥ 12 tháng sau `v2` GA
- **Deprecation header:** `Sunset: Sat, 01 Jan 2028 00:00:00 GMT` + `Deprecation: true`

### 3.3 Pagination

**Cursor-based pagination** (mặc định cho list endpoints lớn):

```json
{
  "data": [...],
  "meta": {
    "page": {
      "cursor": "eyJpZCI6InVuXzEyMyJ9",
      "nextCursor": "eyJpZCI6InVuXzQ1NiJ9",
      "hasMore": true,
      "limit": 20
    }
  }
}
```

**Offset pagination** (chỉ cho admin/report nhỏ):

- Query: `?page=1&limit=20` (max limit=100)
- Response meta: `{ "page": { "number": 1, "size": 20, "totalElements": 150, "totalPages": 8 } }`

### 3.4 Error format (RFC 7807 Problem Details)

```json
{
  "type": "https://api.wereal.vn/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Giá listing không khớp Golden Record",
  "instance": "/api/v1/listings/ls_abc123",
  "traceId": "7f3a2b1c-9d8e-4f5a-b6c7-d8e9f0a1b2c3",
  "errors": [
    { "field": "marketingPrice", "code": "ANTI_DRIFT_PRICE_MISMATCH", "message": "Giá marketing lệch 5% so với GR" }
  ]
}
```

| HTTP Status | Ý nghĩa | Khi nào dùng |
|-------------|---------|--------------|
| 200 | OK | GET/PATCH thành công |
| 201 | Created | POST tạo resource |
| 204 | No Content | DELETE/logout thành công |
| 400 | Bad Request | Malformed JSON, invalid param |
| 401 | Unauthorized | Token missing/expired |
| 403 | Forbidden | RBAC/ABAC deny, anti-drift block |
| 404 | Not Found | Resource không tồn tại hoặc cross-tenant |
| 409 | Conflict | Double booking, duplicate idempotency conflict |
| 422 | Unprocessable Entity | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance, dependency down |

### 3.5 Idempotency

| Loại endpoint | Header | TTL | Ghi chú |
|---------------|--------|-----|---------|
| POST tạo resource (booking, payment-intent, lead) | `Idempotency-Key: {uuid}` | 24h | Redis store request hash + response |
| POST webhook payment | Provider event ID | 7 ngày | BR-21, FR-PAY-04 |
| POST AI generate | `Idempotency-Key` optional | 1h | Tránh double charge LLM |
| GET/PATCH/DELETE | Không cần | — | Inherently idempotent |

**Conflict behavior:** Nếu cùng `Idempotency-Key` nhưng body khác → `409 Conflict` với code `IDEMPOTENCY_KEY_REUSED`

### 3.6 Headers chuẩn

| Header | Bắt buộc | Mô tả |
|--------|----------|-------|
| `Authorization` | Có (trừ public) | `Bearer {accessToken}` |
| `X-Tenant-Id` | Có (authenticated) | UUID tenant context — FR-ID-03 RLS |
| `X-Request-Id` | Khuyến nghị | UUID trace correlation — NFR-O01 |
| `X-Idempotency-Key` | POST nhạy cảm | UUID v4 |
| `Accept-Language` | Khuyến nghị | `vi-VN` (default) |
| `Content-Type` | POST/PATCH | `application/json` |

---

## 4. Xác thực và phân quyền

### 4.1 JWT Access Token structure

```json
{
  "sub": "usr_01HXYZ...",
  "iss": "https://auth.wereal.vn",
  "aud": "wereal-api",
  "exp": 1730123456,
  "iat": 1730119856,
  "jti": "at_01HABC...",
  "tenantId": "ten_dev_pilot_01",
  "tenantType": "DEVELOPER",
  "roles": ["DEVELOPER_ADMIN"],
  "permissions": ["units:write", "projects:read"],
  "scope": {
    "projectIds": ["prj_vinhomes_q9"],
    "regionCodes": ["HCM"]
  }
}
```

| Claim | Mô tả |
|-------|-------|
| `sub` | User ID |
| `tenantId` | Tenant mặc định — phải khớp `X-Tenant-Id` header |
| `tenantType` | `PLATFORM`, `DEVELOPER`, `AGENCY`, `BRANCH` |
| `roles` | RBAC roles — FR-ID-02 |
| `scope.projectIds` | ABAC project scope |
| `exp` | Access token TTL: **15 phút** |

### 4.2 Refresh Token flow

```
Client                          Auth Service                    API
  │ POST /auth/login               │                              │
  ├───────────────────────────────►│                              │
  │◄───────────────────────────────┤ accessToken (15m)            │
  │                                │ refreshToken (7d, httpOnly)  │
  │ GET /units + Bearer            │                              │
  ├───────────────────────────────────────────────────────────────►│
  │◄───────────────────────────────────────────────────────────────┤ 401 (expired)
  │ POST /auth/refresh             │                              │
  ├───────────────────────────────►│ rotate refresh token         │
  │◄───────────────────────────────┤ new access + refresh         │
  │ POST /auth/logout              │                              │
  ├───────────────────────────────►│ revoke refresh token family  │
```

- **Refresh token rotation:** Mỗi refresh issue token mới, revoke token cũ (NFR-S09)
- **Idle timeout:** Session expire sau 8h không hoạt động
- **MFA step-up:** Payment action yêu cầu `mfaVerified: true` claim — FR-ID-04, BR-14

### 4.3 X-Tenant-Id header

- Mọi API authenticated **bắt buộc** header `X-Tenant-Id`
- Middleware validate: JWT `tenantId` == header OR user có quyền cross-tenant (Platform Admin)
- PostgreSQL RLS policy set `app.current_tenant_id` từ header — FR-ID-03
- Cross-tenant access attempt → `403 Forbidden` + audit log `TENANT_ISOLATION_VIOLATION`

### 4.4 Role matrix (trích yếu Phase 1)

| Role | Identity | GR | Listing | CRM | Booking | Payment | Admin |
|------|----------|-----|---------|-----|---------|---------|-------|
| `PLATFORM_ADMIN` | RW | R | R | R | R | R | RW |
| `DEVELOPER_ADMIN` | R | RW | R | R | R | R | — |
| `AGENCY_ADMIN` | RW users | R | RW | RW | R | R | — |
| `AGENT` | R self | R | RW own | RW own | RW own | R | — |
| `OPS_ADMIN` | R | R | Approve | R | R | R | RW audit |
| `FINANCE_ADMIN` | R | R | R | R | R | RW | R ledger |
| `GUEST` | — | R public | R public | POST lead | — | — | — |

---

## 5. Schema phản hồi chuẩn

### 5.1 Success envelope

```json
{
  "data": { "id": "un_01HABC", "type": "unit", "attributes": {} },
  "meta": {
    "requestId": "req_7f3a2b1c",
    "timestamp": "2026-07-28T08:00:00+07:00"
  }
}
```

### 5.2 Collection response

```json
{
  "data": [
    { "id": "un_001", "type": "unit", "attributes": { "code": "A-12-05", "status": "AVAILABLE" } }
  ],
  "meta": {
    "page": { "cursor": null, "nextCursor": "eyJ...", "hasMore": true, "limit": 20 },
    "requestId": "req_abc",
    "timestamp": "2026-07-28T08:00:00+07:00"
  }
}
```

### 5.3 Common entity fields

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | string | Prefixed ULID: `un_`, `ls_`, `bk_`, `ld_` |
| `type` | string | Resource type discriminator |
| `attributes` | object | Business fields |
| `relationships` | object | Linked resources (optional) |
| `createdAt` | ISO8601+TZ | Audit |
| `updatedAt` | ISO8601+TZ | Audit |
| `createdBy` | string | User ID |
| `tenantId` | string | Tenant owner |

---

## 6. Catalog API Phase 1 theo module

> **Quy ước mô tả endpoint:** Mỗi endpoint gồm Method, Path, Auth, Request, Response, Status codes, Business rules, FR link, Idempotency.

### 6.0 Bảng tổng hợp endpoint (71 endpoints)

| # | Method | Path | Module | Auth | FR |
|---|--------|------|--------|------|-----|
| 1 | POST | /auth/login | Identity | Public | FR-ID-01 |
| 2 | POST | /auth/refresh | Identity | Refresh token | FR-ID-01 |
| 3 | POST | /auth/logout | Identity | Bearer | FR-ID-01 |
| 4 | GET | /tenants | Identity | Platform Admin | FR-ID-01 |
| 5 | POST | /tenants | Identity | Platform Admin | FR-ID-01 |
| 6-71 | ... | (xem chi tiết bên dưới) | ... | ... | ... |

---

#### API-001: `POST /auth/login`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/login` |
| **Auth** | Public (email + password) |
| **FR link** | FR-ID-01, US-ID-03 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "email": "agent@agency.vn", "password": "string", "tenantId": "ten_agy_01" }
```

**Response schema:**

```json
{ "data": { "accessToken": "eyJ...", "expiresIn": 900, "refreshToken": "rt_...", "tokenType": "Bearer", "user": { "id": "usr_01", "roles": ["AGENT"] } } }
```

**Status codes:**

- 200 OK — tokens issued
- 401 Unauthorized — invalid credentials
- 423 Locked — account locked after 5 failures
- 429 Too Many Requests — brute force protection

**Business rules:**

- Rate limit 10 req/min/IP
- Lock account 15 phút sau 5 lần sai
- Audit log mọi login attempt
- Multi-tenant user phải chọn tenant nếu thuộc >1 org

---

#### API-002: `POST /auth/refresh`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/refresh` |
| **Auth** | Refresh token (cookie or body) |
| **FR link** | FR-ID-01, NFR-S09 |
| **Idempotency** | Không (token rotation) |

**Request body schema:**

```json
{ "refreshToken": "rt_01HABC..." }
```

**Response schema:**

```json
{ "data": { "accessToken": "eyJ...", "expiresIn": 900, "refreshToken": "rt_NEW..." } }
```

**Status codes:**

- 200 OK — new token pair
- 401 Unauthorized — invalid/expired refresh
- 403 Forbidden — revoked token family

**Business rules:**

- Rotate refresh token mỗi lần refresh
- Reuse detected → revoke entire token family
- Refresh token TTL 7 ngày

---

#### API-003: `POST /auth/logout`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/logout` |
| **Auth** | Bearer + Refresh token |
| **FR link** | FR-ID-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "refreshToken": "rt_01HABC..." }
```

**Response schema:**

```json
(empty body — 204 No Content)
```

**Status codes:**

- 204 No Content
- 401 Unauthorized

**Business rules:**

- Revoke refresh token family
- Access token vẫn valid đến hết TTL (short-lived 15m)
- Audit log logout event

---

#### API-004: `GET /tenants`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/tenants` |
| **Auth** | Platform Admin |
| **FR link** | FR-ID-01, US-ID-01,02 |
| **Idempotency** | Không |

**Request body schema:**

```json
(query params) ?type=DEVELOPER&status=ACTIVE&cursor=&limit=20
```

**Response schema:**

```json
{ "data": [{ "id": "ten_dev_01", "type": "tenant", "attributes": { "name": "Vinhomes Pilot", "type": "DEVELOPER", "status": "ACTIVE" } }] }
```

**Status codes:**

- 200 OK
- 403 Forbidden

**Business rules:**

- Cursor pagination default limit=20
- Filter: ?type=DEVELOPER|AGENCY&status=ACTIVE
- Platform Admin only — tenant list toàn platform

---

#### API-005: `POST /tenants`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/tenants` |
| **Auth** | Platform Admin |
| **FR link** | FR-ID-01, UC-ID-01 |
| **Idempotency** | Có — Idempotency-Key |

**Request body schema:**

```json
{ "name": "Agency Pilot ABC", "type": "AGENCY", "slug": "agency-abc", "adminEmail": "admin@abc.vn", "settings": { "timezone": "Asia/Ho_Chi_Minh", "locale": "vi-VN" } }
```

**Response schema:**

```json
{ "data": { "id": "ten_agy_01", "type": "tenant", "attributes": { "name": "Agency Pilot ABC", "status": "PENDING_SETUP" } } }
```

**Status codes:**

- 201 Created
- 409 Conflict — slug exists
- 422 Unprocessable — invalid tenant config

**Business rules:**

- Tenant slug unique globally
- Onboarding workflow: tạo tenant → default roles → admin user invite
- Developer vs Agency type immutable after create
- Pilot commit: CON-13

---

#### API-006: `GET /tenants/{tenantId}`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/tenants/{tenantId}` |
| **Auth** | Platform Admin / Tenant Admin |
| **FR link** | FR-ID-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path param) tenantId
```

**Response schema:**

```json
{ "data": { "id": "ten_dev_01", "attributes": { "name": "Dev Pilot", "type": "DEVELOPER", "status": "ACTIVE" } } }
```

**Status codes:**

- 200 OK
- 404 Not Found

**Business rules:**

- Return tenant config, entitlements, branding (P2)
- Sensitive billing data excluded P1

---

#### API-007: `PATCH /tenants/{tenantId}`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/tenants/{tenantId}` |
| **Auth** | Platform Admin |
| **FR link** | FR-ID-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "status": "ACTIVE", "settings": { "bookingExpiryHours": 48 } }
```

**Response schema:**

```json
{ "data": { "id": "ten_dev_01", "attributes": { "status": "ACTIVE" } } }
```

**Status codes:**

- 200 OK
- 422 Unprocessable

**Business rules:**

- Cannot change tenant type
- Status transition: PENDING_SETUP → ACTIVE requires admin user confirmed

---

#### API-008: `GET /users`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/users` |
| **Auth** | Agency/Developer Admin |
| **FR link** | FR-ID-02, US-ID-08 |
| **Idempotency** | Không |

**Request body schema:**

```json
?role=AGENT&projectId=prj_01&cursor=&limit=20
```

**Response schema:**

```json
{ "data": [{ "id": "usr_01", "attributes": { "email": "nam@agency.vn", "fullName": "Hoàng Nam", "roles": ["AGENT"], "status": "ACTIVE" } }] }
```

**Status codes:**

- 200 OK
- 403 Forbidden

**Business rules:**

- Scoped to X-Tenant-Id
- Filter: ?role=AGENT&status=ACTIVE
- Không trả password hash

---

#### API-009: `POST /users`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/users` |
| **Auth** | Agency/Developer Admin |
| **FR link** | FR-ID-02 |
| **Idempotency** | Có — Idempotency-Key |

**Request body schema:**

```json
{ "email": "newagent@agency.vn", "fullName": "Nguyễn Văn A", "roles": ["AGENT"], "scope": { "projectIds": ["prj_01"] } }
```

**Response schema:**

```json
{ "data": { "id": "usr_new", "attributes": { "status": "INVITED" } } }
```

**Status codes:**

- 201 Created
- 409 Conflict — email exists in tenant
- 422 Unprocessable

**Business rules:**

- Email unique per tenant
- Invite flow: gửi email set password
- RBAC role required
- ABAC project scope optional

---

#### API-010: `GET /users/{userId}`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/users/{userId}` |
| **Auth** | Admin / Self |
| **FR link** | FR-ID-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path) userId
```

**Response schema:**

```json
{ "data": { "id": "usr_01", "attributes": { "email": "nam@agency.vn", "roles": ["AGENT"] } } }
```

**Status codes:**

- 200 OK
- 403 Forbidden — not self and not admin
- 404 Not Found

**Business rules:**

- Agent chỉ xem profile self
- Admin xem users trong tenant

---

#### API-011: `PATCH /users/{userId}`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/users/{userId}` |
| **Auth** | Admin / Self (limited) |
| **FR link** | FR-ID-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "fullName": "Hoàng Nam", "phone": "+84901234567", "status": "ACTIVE" }
```

**Response schema:**

```json
{ "data": { "id": "usr_01", "attributes": { "fullName": "Hoàng Nam" } } }
```

**Status codes:**

- 200 OK
- 403 Forbidden

**Business rules:**

- Self chỉ đổi password, phone, avatar
- Admin đổi roles, status, scope
- Deactivate user → revoke all sessions

---

#### API-012: `GET /roles`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/roles` |
| **Auth** | Admin |
| **FR link** | FR-ID-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
?
```

**Response schema:**

```json
{ "data": [{ "id": "role_agent", "attributes": { "code": "AGENT", "permissions": ["listings:write", "leads:write"] } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Return system + custom roles P2
- Include permission list

---

#### API-013: `POST /roles`

**Module:** Identity

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/roles` |
| **Auth** | Platform Admin |
| **FR link** | FR-ID-02 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "code": "CUSTOM_ROLE", "permissions": ["listings:read"] }
```

**Response schema:**

```json
{ "data": { "id": "role_custom", "attributes": { "code": "CUSTOM_ROLE" } } }
```

**Status codes:**

- 201 Created
- 403 Forbidden — P1 system roles only

**Business rules:**

- Phase 1: predefined roles only — custom role P2
- Permission format: resource:action

---

#### API-014: `GET /projects`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/projects` |
| **Auth** | Authenticated (Dev R, Agent R scoped) |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
?status=ACTIVE&city=HCM&cursor=
```

**Response schema:**

```json
{ "data": [{ "id": "prj_01", "attributes": { "name": "Vinhomes Q9", "city": "HCM", "status": "ACTIVE", "totalUnits": 1200 } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- ABAC filter theo scope.projectIds
- Public metadata cho search index
- Include unit count summary

---

#### API-015: `POST /projects`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/projects` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01, BR-01 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "name": "Vinhomes Q9", "code": "VH-Q9", "address": { "city": "HCM", "district": "Q9" }, "developerId": "dev_01" }
```

**Response schema:**

```json
{ "data": { "id": "prj_01", "attributes": { "name": "Vinhomes Q9", "status": "DRAFT" } } }
```

**Status codes:**

- 201 Created
- 422 Validation

**Business rules:**

- Developer tenant only
- Product Graph root node
- Audit trail on create

---

#### API-016: `GET /projects/{projectId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/projects/{projectId}` |
| **Auth** | Authenticated |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path) projectId
```

**Response schema:**

```json
{ "data": { "id": "prj_01", "relationships": { "buildings": { "data": [{ "id": "bld_A", "type": "building" }] } } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Include phases, buildings summary
- Agent read-only

---

#### API-017: `PATCH /projects/{projectId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/projects/{projectId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "name": "Vinhomes Q9 Updated", "status": "ACTIVE" }
```

**Response schema:**

```json
{ "data": { "id": "prj_01", "attributes": { "status": "ACTIVE" } } }
```

**Status codes:**

- 200 OK
- 403 Agency cannot write

**Business rules:**

- Agency read-only — CON-09, BR-01
- Status workflow: DRAFT → ACTIVE

---

#### API-018: `DELETE /projects/{projectId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/projects/{projectId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204 No Content
- 409 — has active units

**Business rules:**

- Soft delete only
- Cannot delete if units in RESERVED/DEPOSITED state

---

#### API-019: `GET /buildings`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/buildings` |
| **Auth** | Authenticated |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
?projectId=prj_01
```

**Response schema:**

```json
{ "data": [{ "id": "bld_A", "attributes": { "name": "Block A", "floors": 35 } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?projectId=
- Include floor/unit count

---

#### API-020: `POST /buildings`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/buildings` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "projectId": "prj_01", "name": "Block A", "code": "A", "floors": 35 }
```

**Response schema:**

```json
{ "data": { "id": "bld_A", "attributes": { "name": "Block A" } } }
```

**Status codes:**

- 201 Created

**Business rules:**

- Must link to existing project
- Building code unique within project

---

#### API-021: `GET /buildings/{buildingId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/buildings/{buildingId}` |
| **Auth** | Authenticated |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "bld_A", "attributes": { "availableUnits": 45, "totalUnits": 200 } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Include unit availability summary

---

#### API-022: `PATCH /buildings/{buildingId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/buildings/{buildingId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "name": "Block A - Tower 1" }
```

**Response schema:**

```json
{ "data": { "id": "bld_A" } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Audit price-unaffected metadata changes

---

#### API-023: `DELETE /buildings/{buildingId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/buildings/{buildingId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204
- 409

**Business rules:**

- Soft delete if no active units

---

#### API-024: `GET /units`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/units` |
| **Auth** | Authenticated |
| **FR link** | FR-GR-01,08 |
| **Idempotency** | Không |

**Request body schema:**

```json
?buildingId=bld_A&status=AVAILABLE&bedrooms=3
```

**Response schema:**

```json
{ "data": [{ "id": "un_01", "attributes": { "code": "A-12-05", "status": "AVAILABLE", "basePrice": 3500000000, "area": 85.5, "bedrooms": 3 } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter: ?projectId=&buildingId=&status=AVAILABLE
- Agent sees GR read-only
- Real-time status via cache ≤5s lag NFR-P04

---

#### API-025: `POST /units`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/units` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01,02 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "buildingId": "bld_A", "code": "A-12-05", "floor": 12, "area": 85.5, "bedrooms": 3, "basePrice": 3500000000, "currency": "VND", "status": "AVAILABLE" }
```

**Response schema:**

```json
{ "data": { "id": "un_01", "attributes": { "code": "A-12-05", "version": 1 } } }
```

**Status codes:**

- 201 Created
- 422

**Business rules:**

- basePrice authoritative — Agency cannot set via listing
- Emit UnitCreated domain event → search CDC
- Version 1 auto-created

---

#### API-026: `GET /units/{unitId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/units/{unitId}` |
| **Auth** | Authenticated / Public (published) |
| **FR link** | FR-GR-01, FR-LS-05 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "un_01", "attributes": { "code": "A-12-05", "status": "AVAILABLE", "basePrice": 3500000000, "priceVersion": 3, "verified": true } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Public portal via BFF may expose subset fields
- Include verified status, current price version

---

#### API-027: `PATCH /units/{unitId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/units/{unitId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01,02,04 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "basePrice": 3600000000, "status": "AVAILABLE", "reason": "Price adjustment Block A" }
```

**Response schema:**

```json
{ "data": { "id": "un_01", "attributes": { "basePrice": 3600000000, "priceVersion": 4 } } }
```

**Status codes:**

- 200 OK
- 403 Agency denied
- 422 invalid transition

**Business rules:**

- Price change → new PriceVersion immutable
- Status AVAILABLE→RESERVED only via booking atomic lock
- Emit UnitStatusChanged → SSE + search ≤5s

---

#### API-028: `DELETE /units/{unitId}`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/units/{unitId}` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204
- 409 booked unit

**Business rules:**

- Soft delete
- Cannot delete RESERVED/DEPOSITED

---

#### API-029: `GET /units/{unitId}/versions`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/units/{unitId}/versions` |
| **Auth** | Developer Admin / Ops |
| **FR link** | FR-GR-02, UC-GR-05(P2) |
| **Idempotency** | Không |

**Request body schema:**

```json
?type=PRICE&cursor=
```

**Response schema:**

```json
{ "data": [{ "version": 4, "attributes": { "basePrice": 3600000000, "changedAt": "2026-07-28T10:00:00+07:00", "changedBy": "usr_dev" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Return price + inventory version history
- Time-travel query full P2 — P1 snapshot list
- Audit cho dispute BR-08

---

#### API-030: `POST /units/import`

**Module:** Golden Record

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/units/import` |
| **Auth** | Developer Admin |
| **FR link** | FR-GR-01, US-GR-11 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "projectId": "prj_01", "dryRun": false, "units": [{ "code": "A-01-01", "floor": 1, "area": 50, "basePrice": 2000000000 }] }
```

**Response schema:**

```json
{ "data": { "jobId": "imp_01", "attributes": { "status": "PROCESSING", "accepted": 98, "rejected": 2, "errors": [{ "row": 5, "code": "DUPLICATE_CODE" }] } } }
```

**Status codes:**

- 202 Accepted
- 422 validation errors

**Business rules:**

- P1: batch JSON max 100 units/request — bulk Excel P2
- Validation report in response
- Diff preview before commit ?dryRun=true
- Persona P1 Minh Tuấn: onboarding nhanh

---

#### API-031: `GET /listings`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/listings` |
| **Auth** | Agent / Ops |
| **FR link** | FR-LS-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
?
```

**Response schema:**

```json
{ "data": [{ "id": "ls_01", "attributes": { "title": "Căn 3PN view sông", "status": "PUBLISHED", "unitId": "un_01", "verified": true } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?status=DRAFT|PENDING_REVIEW|PUBLISHED
- Agent sees own + team per RBAC

---

#### API-032: `POST /listings`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/listings` |
| **Auth** | Agent |
| **FR link** | FR-LS-01, FR-GR-03, FR-AI-01 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "unitId": "un_01", "title": "Căn 3PN premium", "description": "...", "highlights": ["View sông", "Nội thất cao cấp"], "mediaIds": ["med_01"] }
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "status": "DRAFT", "antiDriftStatus": "PASS" } } }
```

**Status codes:**

- 201 Created
- 403 anti-drift
- 422

**Business rules:**

- Must reference existing unitId
- Cannot edit basePrice — marketing fields only
- Anti-drift check on create FR-GR-04
- Persona P3 Hoàng Nam: tạo listing ≤5 phút NFR-U02

---

#### API-033: `GET /listings/{listingId}`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/listings/{listingId}` |
| **Auth** | Authenticated / Public |
| **FR link** | FR-LS-01, FR-LS-05 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "title": "Căn 3PN", "verified": true, "unit": { "code": "A-12-05", "basePrice": 3500000000 } } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Public via BFF strips internal fields
- Include verified badge FR-GR-05
- Persona P4 Thu Trang: trust signal

---

#### API-034: `PATCH /listings/{listingId}`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/listings/{listingId}` |
| **Auth** | Agent (owner) |
| **FR link** | FR-LS-01, FR-GR-04 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "description": "Updated copy", "highlights": ["Gần metro"] }
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "antiDriftStatus": "PASS" } } }
```

**Status codes:**

- 200 OK
- 403 drift block

**Business rules:**

- Re-run anti-drift on save
- Cannot publish directly — must submit-review
- Block price mutation US-GR-12

---

#### API-035: `DELETE /listings/{listingId}`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/listings/{listingId}` |
| **Auth** | Agent / Admin |
| **FR link** | FR-LS-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204
- 409 published

**Business rules:**

- Soft delete
- Unpublish from search index

---

#### API-036: `POST /listings/{listingId}/submit-review`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/listings/{listingId}/submit-review` |
| **Auth** | Agent |
| **FR link** | FR-LS-01, BR-09, FR-AI-04 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "note": "Sẵn sàng publish" }
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "status": "PENDING_REVIEW", "submittedAt": "2026-07-28T14:00:00+07:00" } } }
```

**Status codes:**

- 200 OK
- 422 incomplete

**Business rules:**

- Requires AI content human-approved if AI used
- Status DRAFT → PENDING_REVIEW
- Notify Ops moderation queue
- Persona P5 Quốc Bảo: vào queue duyệt

---

#### API-037: `PATCH /listings/{listingId}/approve`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/listings/{listingId}/approve` |
| **Auth** | Ops Admin |
| **FR link** | FR-LS-01, BR-09 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "note": "Approved" }
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "status": "PUBLISHED", "verified": true } } }
```

**Status codes:**

- 200 OK
- 403
- 422 drift fail

**Business rules:**

- Final anti-drift check
- Set verified badge
- Publish to search index CDC ≤5s
- Audit: approver, timestamp

---

#### API-038: `PATCH /listings/{listingId}/reject`

**Module:** Listing

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/listings/{listingId}/reject` |
| **Auth** | Ops Admin |
| **FR link** | FR-LS-01 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "reason": "Ảnh không đạt chất lượng", "code": "MEDIA_QUALITY" }
```

**Response schema:**

```json
{ "data": { "id": "ls_01", "attributes": { "status": "REJECTED" } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Require rejection reason
- Notify agent
- Status → REJECTED

---

#### API-039: `GET /search/units`

**Module:** Search

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/units` |
| **Auth** | Public (Guest) |
| **FR link** | FR-LS-02,06, NFR-P03 |
| **Idempotency** | Không |

**Request body schema:**

```json
?q=vinhomes+q9&bedrooms=3&priceMax=4000000000&sort=price:asc
```

**Response schema:**

```json
{ "data": [{ "id": "un_01", "attributes": { "code": "A-12-05", "projectName": "Vinhomes Q9", "basePrice": 3500000000, "verified": true, "thumbnailUrl": "https://..." } }], "meta": { "facets": { "bedrooms": [{ "value": 3, "count": 45 }] } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- OpenSearch full-text + facet + geo
- P95 ≤200ms @10K docs
- Only PUBLISHED listings/units
- Persona P4: search Q7 3BR
- Filter: ?q=&city=HCM&bedrooms=3&priceMin=&priceMax=&lat=&lng=&radiusKm=

---

#### API-040: `GET /search/suggest`

**Module:** Search

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/search/suggest` |
| **Auth** | Public |
| **FR link** | FR-LS-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
?q=vinh&types=project,district
```

**Response schema:**

```json
{ "data": [{ "type": "project", "label": "Vinhomes Grand Park", "id": "prj_01" }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Autocomplete projects, districts, developers
- Debounce-friendly, max 10 suggestions
- Cache 60s

---

#### API-041: `GET /leads`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/leads` |
| **Auth** | Agent / Agency Admin |
| **FR link** | FR-CRM-01,03 |
| **Idempotency** | Không |

**Request body schema:**

```json
?status=NEW&scoreMin=80
```

**Response schema:**

```json
{ "data": [{ "id": "ld_01", "attributes": { "fullName": "Thu Trang", "phone": "+849***", "score": 85, "tier": "HOT", "source": "PUBLIC_FORM" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?status=&scoreMin=&assignedTo=
- Hot lead badge score≥80 BR-07
- Tenant isolated

---

#### API-042: `POST /leads`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/leads` |
| **Auth** | Public (lead form) / Agent |
| **FR link** | FR-CRM-01, BR-15, NFR-C03 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "fullName": "Nguyễn Thu Trang", "phone": "+84901234567", "email": "trang@gmail.com", "listingId": "ls_01", "unitId": "un_01", "message": "Muốn xem căn 3PN", "consent": { "marketing": true, "privacyPolicyVersion": "2026-07-01" }, "utm": { "source": "google", "campaign": "q7_launch" } }
```

**Response schema:**

```json
{ "data": { "id": "ld_01", "attributes": { "status": "NEW", "score": null, "routingStatus": "PENDING" } } }
```

**Status codes:**

- 201 Created
- 422 consent missing

**Business rules:**

- Consent checkbox bắt buộc PDPA
- Auto-trigger AI scoring async ≤3s NFR-P06
- Attribution: UTM, listingId, unitId
- Persona P4: ≤3 click lead NFR-U03

---

#### API-043: `GET /leads/{leadId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/leads/{leadId}` |
| **Auth** | Agent (assigned) |
| **FR link** | FR-CRM-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "ld_01", "relationships": { "unit": { "data": { "id": "un_01" } }, "activities": { "meta": { "count": 5 } } } } }
```

**Status codes:**

- 200 OK
- 403 not assigned

**Business rules:**

- Include linked unit/listing/project
- PII masked for non-assigned

---

#### API-044: `PATCH /leads/{leadId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/leads/{leadId}` |
| **Auth** | Agent |
| **FR link** | FR-CRM-05 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "stage": "QUALIFIED", "notes": "Khách có nhu cầu mua trong T8", "tags": ["VIP"] }
```

**Response schema:**

```json
{ "data": { "id": "ld_01", "attributes": { "stage": "QUALIFIED" } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Update stage, notes, tags
- Stage sync with booking if linked FR-CRM-05
- Cannot assign self — use /assign

---

#### API-045: `DELETE /leads/{leadId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/leads/{leadId}` |
| **Auth** | Agency Admin |
| **FR link** | FR-CRM-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204
- 409 has booking

**Business rules:**

- Soft delete / GDPR anonymize P2
- Retain audit trail

---

#### API-046: `POST /leads/{leadId}/assign`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/leads/{leadId}/assign` |
| **Auth** | Agency Admin / System |
| **FR link** | FR-CRM-03, BR-07 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "assigneeId": "usr_agent_01", "reason": "Round-robin", "notify": true }
```

**Response schema:**

```json
{ "data": { "id": "ld_01", "attributes": { "assignedTo": "usr_agent_01", "assignedAt": "2026-07-28T15:00:00+07:00" } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Round-robin default OI-07
- Hot lead priority queue
- Notify agent email US-CRM-13
- Persona P2 Lan Hương: routing tự động

---

#### API-047: `GET /activities`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/activities` |
| **Auth** | Agent |
| **FR link** | FR-CRM-04 |
| **Idempotency** | Không |

**Request body schema:**

```json
?leadId=ld_01
```

**Response schema:**

```json
{ "data": [{ "id": "act_01", "attributes": { "type": "CALL", "summary": "Gọi tư vấn lần 1", "createdAt": "2026-07-28T16:00:00+07:00" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?leadId=&type=CALL|NOTE|MEETING
- Timeline sort desc

---

#### API-048: `POST /activities`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/activities` |
| **Auth** | Agent |
| **FR link** | FR-CRM-04 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "leadId": "ld_01", "type": "NOTE", "summary": "Khách quan tâm view sông", "metadata": { "duration": null } }
```

**Response schema:**

```json
{ "data": { "id": "act_01", "attributes": { "type": "NOTE" } } }
```

**Status codes:**

- 201 Created

**Business rules:**

- Must link leadId
- Auto-update lead lastActivityAt

---

#### API-049: `GET /activities/{activityId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/activities/{activityId}` |
| **Auth** | Agent |
| **FR link** | FR-CRM-04 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "act_01", "attributes": { "type": "CALL", "summary": "..." } } }
```

**Status codes:**

- 200 OK
- 404

**Business rules:**

- Owner or team lead access

---

#### API-050: `PATCH /activities/{activityId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/activities/{activityId}` |
| **Auth** | Agent (creator) |
| **FR link** | FR-CRM-04 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "summary": "Updated note" }
```

**Response schema:**

```json
{ "data": { "id": "act_01" } }
```

**Status codes:**

- 200 OK
- 403

**Business rules:**

- Edit within 24h only

---

#### API-051: `DELETE /activities/{activityId}`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/activities/{activityId}` |
| **Auth** | Agent (creator) / Admin |
| **FR link** | FR-CRM-04 |
| **Idempotency** | Không |

**Request body schema:**

```json
(empty)
```

**Response schema:**

```json
(empty)
```

**Status codes:**

- 204

**Business rules:**

- Soft delete, retain audit

---

#### API-052: `GET /crm/pipeline`

**Module:** CRM

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/crm/pipeline` |
| **Auth** | Agent / Agency Admin |
| **FR link** | FR-CRM-05 |
| **Idempotency** | Không |

**Request body schema:**

```json
?projectId=prj_01
```

**Response schema:**

```json
{ "data": { "stages": [{ "code": "NEW", "count": 12, "leads": [{ "id": "ld_01", "tier": "HOT" }] }, { "code": "QUALIFIED", "count": 8 }] } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Kanban columns by stage
- Include counts + hot lead highlights
- Persona P3: pipeline view mobile-friendly

---

#### API-053: `GET /bookings`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/bookings` |
| **Auth** | Agent |
| **FR link** | FR-BK-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
?status=RESERVED
```

**Response schema:**

```json
{ "data": [{ "id": "bk_01", "attributes": { "status": "RESERVED", "unitId": "un_01", "expiresAt": "2026-07-29T15:00:00+07:00" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?status=&unitId=&leadId=
- Include expiry countdown

---

#### API-054: `POST /bookings`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/bookings` |
| **Auth** | Agent |
| **FR link** | FR-BK-01,02, BR-03 |
| **Idempotency** | Có — bắt buộc |

**Request body schema:**

```json
{ "unitId": "un_01", "leadId": "ld_01", "expiryHours": 48, "depositAmount": 50000000, "notes": "Khách VIP gallery" }
```

**Response schema:**

```json
{ "data": { "id": "bk_01", "attributes": { "status": "RESERVED", "expiresAt": "2026-07-29T15:00:00+07:00", "lockId": "lock_01" } } }
```

**Status codes:**

- 201 Created
- 409 double booking
- 422 unit unavailable

**Business rules:**

- Atomic inventory lock Redis FR-BK-02
- Zero double booking NFR-P08
- Default expiry 48h OI-08
- State initial: RESERVED
- Persona P3: chốt deal gallery

---

#### API-055: `GET /bookings/{bookingId}`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/bookings/{bookingId}` |
| **Auth** | Agent / Buyer (linked) |
| **FR link** | FR-BK-03 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "bk_01", "attributes": { "status": "DEPOSIT_PENDING", "allowedTransitions": ["CANCEL", "CREATE_PAYMENT"] } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Include state machine current state + allowed transitions
- Buyer sees limited view

---

#### API-056: `PATCH /bookings/{bookingId}`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `PATCH` |
| **Path** | `/api/v1/bookings/{bookingId}` |
| **Auth** | Agent |
| **FR link** | FR-BK-03 |
| **Idempotency** | Không |

**Request body schema:**

```json
{ "notes": "Khách confirm pay T8", "expiryHours": 24 }
```

**Response schema:**

```json
{ "data": { "id": "bk_01" } }
```

**Status codes:**

- 200 OK
- 422 invalid

**Business rules:**

- Limited field update — use /transitions for state
- Extend expiry max 1 time

---

#### API-057: `DELETE /bookings/{bookingId}`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `DELETE` |
| **Path** | `/api/v1/bookings/{bookingId}` |
| **Auth** | Agent / Ops |
| **FR link** | FR-BK-07, BR-22 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "reason": "Khách hủy", "initiateRefund": true }
```

**Response schema:**

```json
{ "data": { "id": "bk_01", "attributes": { "status": "CANCELLED" } } }
```

**Status codes:**

- 200 OK
- 422 non-cancellable

**Business rules:**

- Cancel workflow → release lock → refund if deposited
- Ledger reversal if payment made

---

#### API-058: `POST /bookings/{bookingId}/transitions`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/bookings/{bookingId}/transitions` |
| **Auth** | Agent / System |
| **FR link** | FR-BK-03, US-BK-07 |
| **Idempotency** | Có — bắt buộc |

**Request body schema:**

```json
{ "transition": "CREATE_PAYMENT", "metadata": { "paymentIntentId": "pi_01" } }
```

**Response schema:**

```json
{ "data": { "id": "bk_01", "attributes": { "status": "DEPOSIT_PENDING", "previousStatus": "RESERVED" } } }
```

**Status codes:**

- 200 OK
- 422 invalid transition

**Business rules:**

- 15-state machine SRS §6.3
- Valid: RESERVED→DEPOSIT_PENDING→DEPOSITED→...
- Emit domain event each transition FR-BK-04
- System transition on payment webhook

---

#### API-059: `GET /bookings/{bookingId}/timeline`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/bookings/{bookingId}/timeline` |
| **Auth** | Agent / Ops |
| **FR link** | FR-BK-04, BR-08 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": [{ "timestamp": "2026-07-28T15:00:00+07:00", "event": "BookingCreated", "actor": "usr_agent", "description": "Giữ chỗ căn A-12-05" }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Human-readable timeline for UI
- Include actor, timestamp, state changes

---

#### API-060: `GET /bookings/{bookingId}/events`

**Module:** Booking

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/bookings/{bookingId}/events` |
| **Auth** | Ops Admin |
| **FR link** | FR-BK-04, FR-TR-01 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": [{ "eventId": "evt_01", "type": "InventoryLocked", "payload": {}, "occurredAt": "2026-07-28T15:00:01+07:00" }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Raw domain events for dispute evidence
- Retention ≥5 năm BR-24
- Persona P5: replay tranh chấp

---

#### API-061: `POST /payment-intents`

**Module:** Payment

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/payment-intents` |
| **Auth** | Agent / Buyer |
| **FR link** | FR-PAY-01,02,05, BR-02 |
| **Idempotency** | Có — bắt buộc |

**Request body schema:**

```json
{ "bookingId": "bk_01", "amount": 50000000, "currency": "VND", "method": "VNPAY", "returnUrl": "https://portal.wereal.vn/payment/result" }
```

**Response schema:**

```json
{ "data": { "id": "pi_01", "attributes": { "status": "PENDING", "paymentUrl": "https://pay.vnpay.vn/...", "expiresAt": "2026-07-28T16:00:00+07:00" } } }
```

**Status codes:**

- 201 Created
- 403 MFA required

**Business rules:**

- Link bookingId required
- MFA OTP for buyer payment FR-ID-04
- Return payment URL + QR
- Persona P3: link cọc 1 click

---

#### API-062: `GET /payments`

**Module:** Payment

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/payments` |
| **Auth** | Finance / Agent |
| **FR link** | FR-PAY-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
?bookingId=bk_01
```

**Response schema:**

```json
{ "data": [{ "id": "pay_01", "attributes": { "amount": 50000000, "status": "SUCCEEDED", "gatewayRef": "VNPAY_123" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Filter ?bookingId=&status=&dateFrom=
- Tenant scoped

---

#### API-063: `GET /payments/{paymentId}`

**Module:** Payment

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/payments/{paymentId}` |
| **Auth** | Finance / Agent |
| **FR link** | FR-PAY-02 |
| **Idempotency** | Không |

**Request body schema:**

```json
(path)
```

**Response schema:**

```json
{ "data": { "id": "pay_01", "attributes": { "status": "SUCCEEDED", "receiptUrl": "https://..." } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Include receipt data, ledger entry refs

---

#### API-064: `POST /webhooks/payment`

**Module:** Payment

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/webhooks/payment` |
| **Auth** | Internal (Gateway IP allowlist + HMAC) |
| **FR link** | FR-PAY-04, BR-21, NFR-P07 |
| **Idempotency** | Provider event ID |

**Request body schema:**

```json
{ "eventId": "vnp_12345", "eventType": "payment.success", "transactionId": "VNPAY_TXN_001", "amount": 50000000, "paymentIntentId": "pi_01", "timestamp": "2026-07-28T15:30:00+07:00", "signature": "hmac..." }
```

**Response schema:**

```json
{ "received": true, "processed": true, "ledgerEntryId": "le_01" }
```

**Status codes:**

- 200 OK
- 401 invalid signature
- 409 duplicate

**Business rules:**

- Idempotent by gateway transaction ID
- HMAC-SHA256 signature verify
- Update booking → DEPOSITED on success
- Write ledger double-entry FR-PAY-03
- Processing ≤2s NFR-P07
- Persona P6 Kim Anh: auto reconcile

---

#### API-065: `GET /ledger/entries`

**Module:** Ledger

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/ledger/entries` |
| **Auth** | Finance Admin |
| **FR link** | FR-PAY-03, BR-18 |
| **Idempotency** | Không |

**Request body schema:**

```json
?bookingId=bk_01&dateFrom=2026-07-01
```

**Response schema:**

```json
{ "data": [{ "id": "le_01", "attributes": { "debitAccount": "CASH_VNPAY", "creditAccount": "DEPOSIT_LIABILITY", "amount": 50000000, "reference": "pay_01" } }] }
```

**Status codes:**

- 200 OK

**Business rules:**

- Double-entry: debit/credit balanced
- Filter ?bookingId=&dateFrom=
- Immutable — no UPDATE/DELETE

---

#### API-066: `GET /ledger/reconciliation`

**Module:** Ledger

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/ledger/reconciliation` |
| **Auth** | Finance Admin |
| **FR link** | FR-PAY-04, BR-04, NFR-O03 |
| **Idempotency** | Không |

**Request body schema:**

```json
?date=2026-07-28
```

**Response schema:**

```json
{ "data": { "date": "2026-07-28", "attributes": { "status": "MATCHED", "gatewayTotal": 500000000, "ledgerTotal": 500000000, "discrepancies": [] } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Daily report generated 06:00 ICT
- Match gateway vs ledger 100%
- UAT-13 gate

---

#### API-067: `POST /ai/copilot/generate`

**Module:** AI

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/ai/copilot/generate` |
| **Auth** | Agent |
| **FR link** | FR-AI-01,03,04, BR-06,16 |
| **Idempotency** | Optional |

**Request body schema:**

```json
{ "listingId": "ls_01", "unitId": "un_01", "task": "LISTING_DESCRIPTION", "tone": "premium", "language": "vi", "context": { "projectName": "Vinhomes Q9", "bedrooms": 3 } }
```

**Response schema:**

```json
{ "data": { "id": "ai_01", "attributes": { "content": "Căn hộ 3 phòng ngủ...", "disclaimer": "Nội dung AI — cần agent duyệt trước publish", "requiresApproval": true, "latencyMs": 4200 } } }
```

**Status codes:**

- 200 OK
- 403 guardrail block
- 429 quota

**Business rules:**

- Guardrails: no price/inventory mutation FR-AI-03
- Disclaimer in response NFR-C04
- Human approve before publish FR-AI-04
- P95 ≤8s NFR-P05
- Cost cap per tenant CON-06
- Persona P3: AI viết tin

---

#### API-068: `POST /ai/leads/{leadId}/score`

**Module:** AI

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `POST` |
| **Path** | `/api/v1/ai/leads/{leadId}/score` |
| **Auth** | System / Agent |
| **FR link** | FR-AI-02, BR-07, NFR-P06 |
| **Idempotency** | Có |

**Request body schema:**

```json
{ "force": false }
```

**Response schema:**

```json
{ "data": { "leadId": "ld_01", "attributes": { "score": 85, "tier": "HOT", "factors": [{ "name": "budget_match", "weight": 0.3 }] } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Score 0-100, tier HOT≥80 WARM≥50 COLD<50
- Latency ≤3s after lead capture
- Log AI action FR-TR-05
- Trigger routing if hot

---

#### API-069: `GET /analytics/dashboard/kpi`

**Module:** Analytics

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/analytics/dashboard/kpi` |
| **Auth** | Agency Admin / Platform Admin |
| **FR link** | FR-AN-01, US-AN-03 |
| **Idempotency** | Không |

**Request body schema:**

```json
?days=30&tenantId=ten_agy_01
```

**Response schema:**

```json
{ "data": { "period": "30d", "metrics": { "leads": 120, "hotLeads": 25, "bookings": 18, "deposits": 12, "conversionRate": 0.10, "gmv": 600000000 } } }
```

**Status codes:**

- 200 OK

**Business rules:**

- Funnel: views→leads→bookings→deposits
- Period: ?days=7|30
- Persona P2: dashboard hot leads
- Persona P6: GMV visibility P2

---

#### API-070: `GET /audit-logs`

**Module:** Audit

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/audit-logs` |
| **Auth** | Ops / Platform Admin |
| **FR link** | FR-TR-01,05, BR-08 |
| **Idempotency** | Không |

**Request body schema:**

```json
?entityType=unit&entityId=un_01&from=2026-07-01
```

**Response schema:**

```json
{ "data": [{ "id": "aud_01", "attributes": { "action": "UNIT_PRICE_CHANGED", "actorId": "usr_dev", "entityId": "un_01", "changes": { "basePrice": { "from": 3500000000, "to": 3600000000 } }, "timestamp": "2026-07-28T10:00:00+07:00" } }] }
```

**Status codes:**

- 200 OK
- 403

**Business rules:**

- Immutable append-only NFR-S03
- Filter ?entityType=&entityId=&actorId=&from=
- Retention ≥5 năm
- Persona P5: audit viewer

---

#### API-071: `GET /stream/units`

**Module:** SSE

| Thuộc tính | Giá trị |
|------------|---------|
| **Method** | `GET` |
| **Path** | `/api/v1/stream/units` |
| **Auth** | Authenticated (SSE) |
| **FR link** | FR-GR-08, NFR-P04, UC-GR-07 |
| **Idempotency** | Không |

**Request body schema:**

```json
Headers: Accept: text/event-stream
```

**Response schema:**

```json
event: unit.status.changed
data: {"unitId":"un_01","status":"RESERVED","timestamp":"2026-07-28T15:00:00+07:00"}


```

**Status codes:**

- 200 text/event-stream

**Business rules:**

- SSE push unit status changes ≤5s lag
- Filter ?projectId=&buildingId=
- Events: unit.status.changed, unit.price.changed
- Reconnect with Last-Event-ID
- Persona P1: real-time bảng hàng

---

## 7. Webhook specifications

### 7.1 Payment gateway inbound webhook

| Thuộc tính | Giá trị |
|------------|---------|
| **Endpoint** | `POST /api/v1/webhooks/payment` |
| **Auth** | HMAC signature + IP allowlist |
| **FR** | FR-PAY-04, BR-21 |
| **Idempotency key** | Provider `eventId` / `transactionId` |

**Security checklist:**

- Verify HMAC-SHA256 signature với shared secret per environment
- Reject replay: timestamp window ±5 phút
- Store raw payload immutable cho audit
- Rate limit 1000 req/min per gateway IP

**Event types supported Phase 1:**

| Event | Action |
|-------|--------|
| `payment.success` | Booking → DEPOSITED, ledger write, notify agent |
| `payment.failed` | Log failure, booking giữ DEPOSIT_PENDING |
| `payment.refunded` | Ledger reversal, booking → REFUNDED |

**Retry policy (gateway → WEREAL):**

- Gateway retry exponential backoff 1m, 5m, 30m, 2h (max 24h)
- WEREAL return 200 only after idempotent processing complete

---

## 8. Rate limiting

| Tier | Limit | Scope | Header response |
|------|-------|-------|-----------------|
| Public search | 60 req/min | IP | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` |
| Authenticated read | 300 req/min | User + Tenant |同上 |
| Authenticated write | 60 req/min | User + Tenant |同上 |
| AI copilot | 20 req/min | Tenant | CON-06 cost cap |
| Webhook inbound | 1000 req/min | Gateway IP | — |
| Lead form public | 10 req/min | IP + fingerprint | Anti-spam |

**429 Response:**

```json
{ "type": "https://api.wereal.vn/errors/rate-limit", "title": "Too Many Requests", "status": 429, "detail": "Vượt giới hạn 60 req/min", "retryAfter": 45 }
```

---

## 9. OpenAPI tags structure

```yaml
tags:
  - name: Identity
    description: Auth, tenant, user, role — FR-ID-01→04
  - name: GoldenRecord
    description: Project, building, unit GR — FR-GR-01→04
  - name: Listing
    description: Marketing listing + moderation — FR-LS-01
  - name: Search
    description: Public search + suggest — FR-LS-02
  - name: CRM
    description: Lead, activity, pipeline — FR-CRM-01→05
  - name: Booking
    description: Transaction state machine — FR-BK-01→04
  - name: Payment
    description: PaymentIntent, webhook — FR-PAY-01→05
  - name: Ledger
    description: Double-entry, reconciliation — FR-PAY-03,04
  - name: AI
    description: Copilot, lead scoring — FR-AI-01→04
  - name: Analytics
    description: KPI dashboard — FR-AN-01
  - name: Audit
    description: Audit trail — FR-TR-01
  - name: Stream
    description: SSE real-time — FR-GR-08
```

---

## 10. Chiến lược versioning

| Giai đoạn | Chiến lược |
|-----------|------------|
| Phase 1 | `/api/v1` only — breaking changes blocked before GA |
| Phase 2 | Introduce `/api/v2` for commission API; v1 maintained |
| Deprecation | Minimum 6 tháng notice; Sunset header |
| Schema evolution | Additive only trong cùng major version |
| OpenAPI | Published tại `https://api.wereal.vn/openapi/v1.json` |
| **OpenAPI file (repo)** | [`openapi.yaml`](./openapi.yaml) — 71 endpoints, auto-generated từ catalog §6 |
| **Generator script** | [`scripts/generate-openapi.py`](./scripts/generate-openapi.py) — chạy lại khi cập nhật catalog |

---

## 11. BFF aggregation patterns

### 11.1 Portal BFF mapping

| Portal | BFF Route prefix | Aggregated endpoints | FR-UX |
|--------|------------------|---------------------|-------|
| Public Portal | `/bff/public/v1` | search + unit detail + lead form + compare | FR-UX-01 |
| Agent Portal | `/bff/agent/v1` | dashboard KPI + pipeline + listing wizard + booking | FR-UX-02 |
| Admin Portal | `/bff/admin/v1` | tenant mgmt + moderation queue + audit + KPI | FR-UX-03 |
| Developer Portal (P2) | `/bff/developer/v1` | GR grid + import wizard | FR-UX-04 |

### 11.2 Public Portal BFF examples

| BFF Endpoint | Aggregates | Lợi ích |
|--------------|------------|---------|
| `GET /bff/public/v1/units/{id}` | GET unit + listing + project + media | 1 round-trip cho detail page |
| `GET /bff/public/v1/search` | search/units + facets + suggest | Search results page |
| `POST /bff/public/v1/leads` | POST lead + trigger score async | Lead form ≤3 click |
| `GET /bff/public/v1/compare?ids=` | multi unit fetch + normalize | Compare page FR-LS-04 |

### 11.3 Agent Portal BFF examples

| BFF Endpoint | Aggregates | Persona |
|--------------|------------|---------|
| `GET /bff/agent/v1/dashboard` | KPI + hot leads + tasks | P3 Hoàng Nam |
| `GET /bff/agent/v1/leads/{id}` | lead + activities + unit + timeline | P3 |
| `POST /bff/agent/v1/listings/wizard` | unit lookup + AI copilot + anti-drift precheck | P3, FR-AI-01 |
| `POST /bff/agent/v1/bookings/quick` | create booking + payment intent | P3 BR-02 |

### 11.4 Admin Portal BFF examples

| BFF Endpoint | Aggregates | Persona |
|--------------|------------|---------|
| `GET /bff/admin/v1/moderation/queue` | pending listings + anti-drift report | P5 Quốc Bảo |
| `GET /bff/admin/v1/audit/search` | audit-logs + entity context | P5 |
| `GET /bff/admin/v1/tenants` | tenants + user count + KPI summary | Platform Admin |

---

## 12. Phụ lục

### 12.1 Traceability API → FR → Persona

| API Module | FR chính | Persona phục vụ |
|------------|----------|-----------------|
| Identity | FR-ID-01→04 | P5, P6 Platform |
| Golden Record | FR-GR-01→04,08 | P1 Minh Tuấn |
| Listing/Search | FR-LS-01→03,06 | P4 Thu Trang |
| CRM/AI | FR-CRM-01→05, FR-AI-02 | P2 Lan Hương, P3 Hoàng Nam |
| Booking/Payment | FR-BK-01→04, FR-PAY-01→05 | P3, P4, P6 |
| Audit/Analytics | FR-TR-01, FR-AN-01 | P5, P2 |

### 12.2 Booking state machine reference (15 states)

```
Draft → Published → Viewed → Qualified → Contacted → Scheduled
  → Reserved → Deposit Pending → Deposited → Contract Drafted
  → Contract Signed → Completed
              ↓
    Cancelled / Expired / Refunded
```

### 12.3 Error code registry (trích yếu)

| Code | HTTP | Mô tả |
|------|------|-------|
| `ANTI_DRIFT_PRICE_MISMATCH` | 403 | Listing giá lệch GR |
| `INVENTORY_LOCK_FAILED` | 409 | Double booking prevented |
| `INVALID_STATE_TRANSITION` | 422 | State machine violation |
| `TENANT_ISOLATION_VIOLATION` | 403 | Cross-tenant access |
| `MFA_REQUIRED` | 403 | Payment cần OTP |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Key trùng body khác |
| `AI_GUARDRAIL_BLOCKED` | 403 | AI mutate attempt blocked |
| `CONSENT_REQUIRED` | 422 | Lead form thiếu consent |

*Kết thúc tài liệu Thiết kế API — WEREAL-API-2026-v1.0*

