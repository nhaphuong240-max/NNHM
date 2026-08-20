# ADR-002: PostgreSQL 16 + RLS cho Tenant Isolation

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-002 |
| **Status** | Accepted |
| **Date** | 15/07/2026 |
| **Deciders** | Architecture Team, Tech Lead, Security Lead |
| **Baseline** | WEREAL-BL-2026-002 |
| **Related FR/NFR** | FR-ID-03, NFR-S02, BR-08, PDPA |
| **Supersedes** | — |
| **Superseded by** | — |

## Context

WEREAL là **multi-tenant SaaS B2B2C** phục vụ Developer, Agency, Branch trong cùng platform:

- **Zero cross-tenant data leak** — NFR-S02 bắt buộc, không có exception
- **PDPA compliance** — dữ liệu cá nhân lead/buyer phải cô lập theo tenant
- Event store, Golden Record, CRM, Booking đều chứa dữ liệu nhạy cảm
- Team quen thuộc PostgreSQL; Phase 1 chưa cần sharding

Các mô hình isolation đã xem xét:

| Model | Mô tả |
|-------|-------|
| **Shared DB + RLS** | Single database, `tenant_id` column + Row-Level Security policies |
| **Schema-per-tenant** | Mỗi tenant một PostgreSQL schema |
| **DB-per-tenant** | Mỗi tenant một database instance |
| **App-only filter** | WHERE tenant_id trong application code, không RLS |

## Decision

Sử dụng **PostgreSQL 16 Row-Level Security (RLS)** làm lớp isolation chính ở database level.

Mọi bảng multi-tenant có:

- Column `tenant_id UUID NOT NULL`
- RLS policy: `tenant_id = current_setting('app.current_tenant_id')::uuid`
- Middleware set tenant context mỗi request: `SET LOCAL app.current_tenant_id = '{uuid}'`

## Rationale

1. **Defense in depth** — lỗi application (quên WHERE clause) không leak cross-tenant
2. **Native PG feature** — mature, auditable via `pg_policies`
3. **Event store cùng DB** — append-only `domain_events` table trong cùng transaction ACID
4. **Team familiarity** — PostgreSQL 16 managed RDS, không học thêm engine
5. **Cost** — single instance đủ Phase 1; read replica P2

## Consequences

### Positive

- DB-level guarantee tenant isolation
- Audit policy qua `pg_policies` catalog
- Integration test có thể verify RLS 100% coverage
- Platform Admin bypass qua separate role/policy

### Negative

- Connection pool phải `SET tenant per request` — overhead ~1ms
- RLS query overhead ~5% — acceptable cho Phase 1 load
- Platform Admin cross-tenant queries cần policy riêng, dễ misconfigure

### Neutral

- `X-Tenant-Id` header bắt buộc mọi authenticated API — validate JWT tenantId == header

## Alternatives Rejected

| Alternative | Lý do loại |
|-------------|------------|
| Schema-per-tenant | Ops nightmare khi scale 100+ tenants; migration phức tạp |
| DB-per-tenant | Cost cao; connection pool explosion; backup phức tạp |
| App-only filter | Risky — single bug = data breach; không pass security audit |

## Implementation Notes

```sql
-- Example RLS policy
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON units
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Platform admin bypass
CREATE POLICY platform_admin_all ON units
  USING (current_setting('app.is_platform_admin', true)::boolean = true);
```

**NestJS middleware:**

```typescript
// Pseudocode
async use(req, res, next) {
  const tenantId = req.headers['x-tenant-id'];
  await this.dataSource.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
  next();
}
```

**Testing:**

- Integration test suite: `rls-isolation.spec.ts` — verify Agent tenant A cannot read tenant B data
- CI gate: 100% tables with RLS enabled (see `So-do-CSDL.md`)

## References

- SDD §6.2 Multi-tenant Data Model
- [`So-do-CSDL.md`](../So-do-CSDL.md) — RLS policies per table
- [`Thiet-ke-API.md`](../Thiet-ke-API.md) §4.3 X-Tenant-Id header
