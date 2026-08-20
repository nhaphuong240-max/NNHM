# Secrets manager — T7-S2

> Production secrets **must not** live in git-tracked `.env` files.

## Required secrets (production)

| Secret | Min | Store | Maps to |
|--------|-----|-------|---------|
| `JWT_SECRET` | 32 chars random | Vault / AWS SM / K8s Secret | JWT signing |
| `JWT_REFRESH_SECRET` | 32 chars | Same | Refresh token HMAC (if used) |
| `WEBHOOK_HMAC_SECRET` | 32 chars | Same | Payment webhooks |
| `VNPAY_HASH_SECRET` | provider | Same | VNPay |
| `SSO_OIDC_CLIENT_SECRET` | provider | Same | OIDC live (T7-S2) |
| Database URL | — | SM + rotation | `DATABASE_URL` |
| Redis URL | — | SM | `REDIS_URL` |

## Deployment pattern

1. **K8s:** `infra/k8s/staging/secret.example.yaml` → External Secrets Operator → pod env
2. **Local dev:** `apps/api/.env` (gitignored) from `.env.example` only
3. **CI:** no prod secrets; use `.env.staging.example` for flag verification only

## Rotation

| Secret | Cadence | Runbook |
|--------|---------|---------|
| JWT | 90d | Dual-sign window 24h · force re-login |
| Webhook HMAC | on compromise | Update gateway + partner notify |
| Pilot passwords | before prod | C-02 — rotate `DevAdmin123!` etc. |

## Verification

```bash
# C-03 gate (strict prod)
STRICT_PRODUCTION_SECURITY=true NODE_ENV=production \
  JWT_SECRET=$(openssl rand -hex 32) npm run start:prod

./scripts/uat-t7-security.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/security | jq .
```

See [pen-test-remediation-S6.md](../security/pen-test-remediation-S6.md) · [t7-s2-security-hardening.md](../dev/t7-s2-security-hardening.md)
