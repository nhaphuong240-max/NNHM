# T7-S2 — Security hardening

> Sprint **T7-S2** · Gate **T7-G2** · pen-test C-01→C-04 + H-01/H-03/H-04

## Deliverables

| Artifact | Path |
|----------|------|
| Auth rate limit (Redis) | `infrastructure/security/auth-login-rate-limit.guard.ts` |
| Production security gate | `infrastructure/security/production-security.service.ts` |
| Hide stack traces prod | `infrastructure/security/production-http-exception.filter.ts` |
| CORS restrict prod | `main.ts` · `CORS_ORIGINS` |
| Secrets runbook | [secrets-manager.md](../ops/secrets-manager.md) |
| Security health | `GET /health/security` |

## Env flags

| Flag | Dev | Prod (`tier-t7/production-trust.env`) |
|------|-----|----------------------------------------|
| `MFA_SANDBOX` | `true` | `false` (TOTP via `mfaSecret`) |
| `SSO_OIDC_USE_MOCK` | `true` | `false` |
| `AUTH_LOGIN_RATE_LIMIT_ENABLED` | `true` | `true` |
| `AUTH_LOGIN_RATE_LIMIT_PER_MIN` | `10` | `10` |
| `STRICT_PRODUCTION_SECURITY` | — | `true` |
| `TLS_TERMINATED` | — | `true` (ingress HTTPS) |
| `CORS_ORIGINS` | `*` (dev open) | comma-separated prod origins |
| `TRUST_PROXY` | — | `true` behind LB |

## MFA live

When `MFA_SANDBOX=false`:

- Demo OTP `123456` **rejected**
- Requires `email` + user `mfaSecret` (TOTP)
- Seed: `ensureAdminMfaTotp()` in `database.seed.service.ts`

```bash
curl -X POST /api/v1/auth/mfa/verify \
  -d '{"email":"admin@sunrise-dev.vn","mfaOtp":"<totp>"}'
```

## SSO live

When `SSO_OIDC_USE_MOCK=false`:

- Requires `SSO_OIDC_CLIENT_SECRET` + discovery URL
- Status: `GET /auth/sso/status` → `mode: oidc-live`

## Rate limit

`/auth/login`, `/auth/refresh`, `/auth/mfa/verify` → **429** after limit (Redis bucket per IP/minute).

Test:

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST .../auth/login \
    -d '{"email":"x","password":"y"}'
done
# expect 401 then 429
```

## Pen-test closure (code-enforced)

| ID | Enforcement |
|----|-------------|
| C-01 | `ProductionSecurityService` · `WEBHOOK_SKIP_VERIFY !== true` |
| C-02 | `PILOT_DEMO_PASSWORDS_ALLOWED !== true` |
| C-03 | `JWT_SECRET` length ≥ 32 when strict |
| C-04 | `TLS_TERMINATED=true` when strict |
| H-01 | `AuthLoginRateLimitGuard` |
| H-03 | `CORS_ORIGINS` in prod |
| H-04 | `ProductionHttpExceptionFilter` |

## Verify

```bash
./scripts/uat-t7-security.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/security | jq .
npm test -- src/infrastructure/security
```

## Next (T7-S3)

Observability — OTEL default staging · Playwright PR gate · CD workflow.
