# Pen test remediation checklist — S6-04 / T7-S2

> External pen test report: _TBD_. **Code enforcement** via `ProductionSecurityService` when `STRICT_PRODUCTION_SECURITY=true` or `NODE_ENV=production`.

## Pre-pilot controls (implemented)

| Control | Status | Notes |
|---------|--------|-------|
| JWT auth on protected routes | ✅ | `JwtAuthGuard` + tenant guard |
| Cross-tenant 403 | ✅ | Smoke test verifies |
| Webhook HMAC (BR-21) | ✅ | `X-Signature` required; no skip in prod |
| Password hashing | ✅ | bcrypt on users |
| Idempotent webhooks/refunds | ✅ | Postgres + Redis |
| Audit append-only | ✅ | Mutations logged |
| Auth rate limit (H-01) | ✅ | T7-S2 `AuthLoginRateLimitGuard` |
| Prod stack hidden (H-04) | ✅ | T7-S2 `ProductionHttpExceptionFilter` |
| CORS restrict prod (H-03) | ✅ | T7-S2 `CORS_ORIGINS` in `main.ts` |

## Must fix before production (Critical)

| # | Finding | Remediation | Owner | Done |
|---|---------|-------------|-------|------|
| C-01 | `WEBHOOK_SKIP_VERIFY=true` in prod | Set `false`; `ProductionSecurityService` fail-fast | Ops | ✅ code |
| C-02 | Default demo passwords | Rotate pilot tenants; `PILOT_DEMO_PASSWORDS_ALLOWED` gate | PO | ✅ code |
| C-03 | Weak `JWT_SECRET` | ≥32 random chars in secrets manager | Ops | ✅ code |
| C-04 | Missing TLS termination | HTTPS at ingress; `TLS_TERMINATED=true` | DevOps | ✅ code |

## High (pilot backlog)

| # | Finding | Remediation | Done |
|---|---------|-------------|------|
| H-01 | No rate limiting on `/auth/login` | Redis guard T7-S2 | ✅ |
| H-02 | No MFA on refund (BR-14) | Phase 2 finance MFA | ☐ |
| H-03 | CORS `*` in dev | Restrict origins prod | ✅ |
| H-04 | Verbose error stacks | Hide stack prod | ✅ |

## Verification

```bash
./scripts/uat-t7-security.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/security | jq .
grep WEBHOOK_SKIP_VERIFY apps/api/.env  # must not be true in staging/prod
./scripts/smoke-p0.sh
npm test --prefix apps/api
```

**Sign-off (zero Critical):** Security lead __________ Date ________

See [t7-s2-security-hardening.md](../dev/t7-s2-security-hardening.md) · [secrets-manager.md](../ops/secrets-manager.md)
