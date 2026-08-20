# T7-S1 — Platform foundation (migrations + RLS)

> Sprint **T7-S1** · Gate **T7-G1** · ADR-002 implementation kickoff.

## Deliverables

| Artifact | Path |
|----------|------|
| TypeORM CLI data source | `apps/api/src/database/data-source.ts` |
| Shared ORM options | `apps/api/src/database/typeorm-options.ts` |
| Baseline migration | `migrations/1738339200000-BaselineSchemaMarker.ts` |
| RLS migration | `migrations/1738339201000-EnableTenantRls.ts` |
| RLS table registry | `apps/api/src/database/rls/tenant-scoped-tables.ts` |
| Session context service | `apps/api/src/database/tenant-rls.service.ts` |
| HTTP interceptor | `apps/api/src/database/tenant-rls.interceptor.ts` |

## Env flags

| Flag | Dev | Prod |
|------|-----|------|
| `DB_SYNCHRONIZE` | `true` (default) | `false` |
| `DB_MIGRATIONS_RUN` | `false` | `true` |

Prod profile: `config/tier-t7/production-trust.env`

## Commands

```bash
cd apps/api
npm run db:up
npm run migration:run
npm run migration:show
./scripts/check-migrations.sh
./scripts/uat-t7-platform.sh http://localhost:3000/api/v1
npm test -- src/database/rls-isolation.spec.ts src/database/tenant-rls.service.spec.ts
```

## RLS session variables

- `app.current_tenant_id` — set per HTTP request (`TenantRlsInterceptor`)
- `app.is_platform_admin` — `true` for seed/jobs via `TenantRlsService.runAsPlatformAdmin()`

Policies: `tenant_isolation` OR platform admin on **54** tenant-scoped tables + `tenants` + `agency_applications`.

## Verify readiness

`GET /health/ready` includes `checks.migrations: up|pending`.

## Next (T7-S2)

Security hardening — rate limit, MFA live, pen-test Critical closure.
