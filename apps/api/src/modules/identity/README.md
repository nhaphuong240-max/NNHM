# Identity module

**Path:** `apps/api/src/modules/identity`  
**UC:** UC-ID-03 · **Sprint:** S1

## Responsibility

JWT authentication, refresh tokens, tenant isolation (`X-Tenant-Id`), guards for protected routes.

## Key endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | JWT |
| GET | `/auth/status` | Public |
| GET | `/auth/me` | JWT + tenant header |
| POST | `/auth/mfa/verify` | Public (demo OTP `123456`) |
| GET | `/tenants` | Public (login picker) |
| POST | `/tenants` | Public stub (S1-03 onboarding) |
| GET | `/tenants/:id` | Public |
| GET | `/users` | JWT · tenant-scoped (UC-ID-04 stub) |
| GET | `/users/:id` | JWT |
| PATCH | `/users/:userId/role` | JWT · assign role (UC-ID-02) |
| GET | `/roles` | JWT · role catalog + permissions matrix |
| GET | `/roles/policy` | JWT · ABAC project scope (in-memory stub) |
| PATCH | `/roles/policy` | JWT · update project scope per role |

## Headers

- `Authorization: Bearer <accessToken>`
- `X-Tenant-Id: ten_dev_01` (required on tenant-scoped routes)

## Demo users (dev seed)

| Email | Password | Role |
|-------|----------|------|
| admin@sunrise-dev.vn | DevAdmin123! | DEVELOPER_ADMIN |
| agent@sunrise-dev.vn | Agent123! | AGENT |

## Web UI

`/auth/login` — SCR-AUTH-001 unified login · tenant picker · role redirect  
`/admin/users/roles` — SCR-ADMIN-021 role matrix · assign role · ABAC project scope  
Legacy `/finance/login` redirects to `/auth/login?portal=finance`

## Tests

`auth.service.spec.ts` — login, invalid password, refresh.

## Runbook

Cross-tenant access → 403. See `docs/runbooks/on-call.md`.
