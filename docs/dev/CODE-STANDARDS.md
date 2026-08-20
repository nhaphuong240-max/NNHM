# Chuẩn code — WEREAL REOS

> **Document ID:** WEREAL-DEV-STD-2026-v1.0

## Backend (NestJS — `apps/api`)

| Khía cạnh | Chuẩn |
|-----------|--------|
| Ngôn ngữ | TypeScript strict (`strict: true`) |
| Style | Prettier + ESLint `@typescript-eslint` |
| Naming | `camelCase` biến/hàm · `PascalCase` class · `kebab-case` file/folder |
| API | JSON:API-ish envelope `{ data, meta, errors }` theo OpenAPI |
| DTO | `class-validator` + `class-transformer` |
| DB | TypeORM hoặc Prisma (chốt S1) · migration bắt buộc |
| Events | `{ aggregateId, eventType, payload, tenantId, occurredAt }` |
| Logging | Structured JSON · `requestId` · OpenTelemetry traceId |
| Errors | HTTP status chuẩn · không leak stack trace production |

## Frontend (Next.js — `apps/web`, tham chiếu `prototype/`)

| Khía cạnh | Chuẩn |
|-----------|--------|
| Tokens | `designTokens.ts` — **không hardcode hex** |
| Components | shadcn/ui + Tailwind · match Design System Spec v2.1 |
| Data | TanStack Query · server state qua BFF |
| Forms | react-hook-form + zod |
| i18n | vi-VN default Phase 1 |

## Git commit

```
<type>(<scope>): <subject>

feat(booking): atomic inventory lock with Redis TTL
fix(payment): idempotent webhook by eventId
docs(dev): add sprint S3 tasks
```

## Test

- Unit: Jest — service logic, state transitions
- Integration: supertest + Testcontainers Postgres
- E2E: Playwright — vertical slice P0 paths
- Load: k6 — concurrent booking G1.5

## Security

- JWT + `X-Tenant-Id` header (OpenAPI)
- MFA cho payment/refund (BR-14)
- Không log PAN/OTP/PII plaintext
