# Tier B Live Rails — Staging → Production

> **Goal:** Flip MOCK/sandbox defaults to live code paths (identity, payment, omnichannel, payout, Tier 5 push/escrow) without regressing OP-WIN gates.

## Profiles

| Profile | File | Use |
|---------|------|-----|
| `staging` | [config/tier-b/staging.env](../../config/tier-b/staging.env) | Cloud staging · payout **stub** OK |
| `staging-local` | [config/tier-b/staging-local.env](../../config/tier-b/staging-local.env) | Docker localhost · same flags as staging |
| `production` | [config/tier-b/production.env](../../config/tier-b/production.env) | Prod · **no** `SETTLEMENT_PAYOUT_STUB` · **no** `WAU_PILOT_SIM` |

Full templates (secrets + infra):

- Staging: [apps/api/.env.staging.example](../../apps/api/.env.staging.example)
- Production: [apps/api/.env.production.example](../../apps/api/.env.production.example)

---

## Rollout steps

### 1. Staging

```bash
cd WEREAL

# Option A — full template
cp apps/api/.env.staging.example apps/api/.env
# edit DATABASE_URL, JWT_SECRET, VNPay keys

# Option B — flip flags on existing dev .env
./scripts/apply-tier-b-env.sh staging-local apps/api/.env

./scripts/verify-production-flags.sh --profile staging --strict apps/api/.env
cd apps/api && docker compose up -d && npm run build && npm run start:prod
cd ../..
./scripts/uat-tier-b-rails.sh http://localhost:3000/api/v1
./scripts/uat-staging-live.sh http://localhost:3000/api/v1
```

### 2. Production

```bash
# Platform env (K8s / ECS / Railway) — copy from .env.production.example
./scripts/apply-tier-b-env.sh production /path/to/prod.env   # or inject keys manually

./scripts/verify-production-flags.sh --profile production --strict /path/to/prod.env
./scripts/uat-tier-b-rails.sh https://api.wereal.vn/api/v1
```

Restart API after **every** env change.

---

## Flag matrix (Tier B)

| Rail | Dev default | Staging | Production |
|------|-------------|---------|------------|
| MFA | `MFA_SANDBOX=true` | `false` | `false` |
| SSO | `SSO_OIDC_USE_MOCK=true` | `false` | `false` |
| Payment | `MOCK` | `VNPAY` sandbox | `VNPAY` live URL |
| Zalo ZNS | sandbox | `ZALO_ZNS_SANDBOX=false` | `false` + OA token |
| SMS | sandbox OTP 123456 | `SMS_SANDBOX=false` | `false` + provider URL |
| Payout OP-WIN-06 | disabled | `ENABLED` + `STUB=true` | `ENABLED` + partner URL |
| Push T5 | off | `PUSH_LIVE_ENABLED=true` | `true` + Expo token |
| Escrow NHNN | off | `ESCROW_BANK_PARTNER_ENABLED=true` | `true` |
| E-sign / eKYC | sandbox | `ESIGN_SANDBOX=false` · `EKYC_SANDBOX=false` | same |
| BNPL | off | `BNPL_PARTNER_ENABLED=true` | `true` + partner URL |
| WAU pilot sim | off | `WAU_PILOT_SIM_ENABLED=true` | **`false`** |

---

## Verification

| Step | Command |
|------|---------|
| Env only | `./scripts/verify-production-flags.sh --profile staging --strict apps/api/.env` |
| Runtime rails | `./scripts/uat-tier-b-rails.sh $BASE` |
| P3 integrations | `./scripts/uat-p3-s5.sh $BASE` |
| Full staging gate | `./scripts/uat-staging-live.sh $BASE` |

Evidence template: [docs/dev/evidence/](./evidence/) · append `tier-b-rails-YYYYMMDD.log`.

---

## Secrets checklist

| Secret | Staging | Prod |
|--------|---------|------|
| `JWT_SECRET` | rotate quarterly | rotate + HSM |
| `VNPAY_HASH_SECRET` | sandbox merchant | live merchant |
| `SETTLEMENT_PAYOUT_*` | stub OK | **required** |
| `SSO_OIDC_CLIENT_SECRET` | IdP staging app | IdP prod app |
| `PARTNER_WEBHOOK_SECRET` | shared w/ SDK v2 pilots | per-tenant rotate |

Never commit `apps/api/.env`. CI validates [config/tier-b/staging.env](../../config/tier-b/staging.env) against `.env.staging.example` keys.

---

## Related

- [staging-env.md](./staging-env.md) — P3-S5 integration detail
- [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md)
- [T5-runbook.md](./T5-runbook.md)
