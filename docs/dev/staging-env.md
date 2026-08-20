# Staging environment — no MOCK defaults (P3-S5)

> **Gate:** G3.2 staging live · **Sprint:** P3-S5 · **OP-WIN-06** payout SUBMITTED  
> Dev defaults in `apps/api/.env` use sandbox/MOCK; staging must flip the flags below.

---

## Required overrides (staging)

Copy from `apps/api/.env.example` and set **non-sandbox** values:

```bash
# Payment — UC-PAY-01
PAYMENT_DEFAULT_METHOD=VNPAY
VNPAY_TMN_CODE=<staging-merchant-code>
VNPAY_HASH_SECRET=<from-vnpay-portal>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# Zalo — UC-NW-01
ZALO_ZNS_SANDBOX=false
ZALO_OA_ACCESS_TOKEN=<from-oauth-connect>
ZALO_OA_REFRESH_TOKEN=<from-oauth-connect>

# SMS — UC-NW-03
SMS_SANDBOX=false
SMS_PROVIDER_URL=https://<sms-partner>/send
SMS_PROVIDER_API_KEY=<secret>

# Settlement — UC-PAY-04 · OP-WIN-06
SETTLEMENT_PAYOUT_ENABLED=true
SETTLEMENT_PAYOUT_URL=https://<payout-partner>/batch
SETTLEMENT_PAYOUT_API_KEY=<secret>
```

---

## Pilot / local automation (without external partners)

Use **stub flags** to prove live code paths without real credentials:

```bash
SETTLEMENT_PAYOUT_ENABLED=true
SETTLEMENT_PAYOUT_STUB=true          # → payout status SUBMITTED

SMS_SANDBOX=false
SMS_PROVIDER_STUB=true               # → OTP ≠ 123456, no SMS_PROVIDER_URL

ZALO_ZNS_SANDBOX=true                # dev: SENT + PATCH delivered → DELIVERED
# staging: ZALO_ZNS_SANDBOX=false + real OA token
```

Restart API after changing env. Verify:

```bash
./scripts/uat-p3-s5.sh
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" \
  http://localhost:3000/api/v1/commission/settlement/status | jq .payout
```

---

## Optional (P3-S6 scope)

```bash
MFA_SANDBOX=false
# Admin TOTP secret seeded as JBSWY3DPEHPK3PXP (replace in production)

SSO_OIDC_USE_MOCK=false
META_GRAPH_SANDBOX=false
META_APP_ID=...
META_APP_SECRET=...
```

---

## Tier 5 live rails (post #1 Vietnam code)

**Runbook:** [tier-b-live-rails.md](./tier-b-live-rails.md) (staging → prod rollout)

Copy full profile from [apps/api/.env.staging.example](../../apps/api/.env.staging.example) or apply flag overrides:

```bash
./scripts/apply-tier-b-env.sh staging-local apps/api/.env
./scripts/verify-production-flags.sh --profile staging --strict apps/api/.env
./scripts/uat-tier-b-rails.sh http://localhost:3000/api/v1
./scripts/uat-staging-live.sh http://localhost:3000/api/v1
```

Production: [apps/api/.env.production.example](../../apps/api/.env.production.example) · `--profile production --strict`.

See [T5-runbook.md](./T5-runbook.md) · [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md) · [gtm-anchor-onboarding.md](./gtm-anchor-onboarding.md).

---

## Secrets handling

| Rule | Detail |
|------|--------|
| Never commit | `.env`, API keys, VNPay hash secret |
| CI / staging | Inject via secret manager or deploy platform env |
| Rotate | VNPay + payout partner keys per merchant onboarding |

---

## Verification checklist

| Check | Command / UI |
|-------|----------------|
| ZNS DELIVERED | `./scripts/uat-p3-s5.sh` · Admin → Integrations → Zalo |
| SMS live OTP | OTP in API response ≠ `123456` when `SMS_SANDBOX=false` |
| VNPay txn ref | `POST /payment-intents` method `VNPAY` → `gatewayRef` + `vnp_TxnRef` in URL |
| Payout SUBMITTED | `GET /commission/settlement/runs/:id` → `attributes.payout.status` |
| OP-WIN-07 p95 | `./scripts/uat-p3-s6.sh` · Admin → Integrations → Leads |
| E2E CI nightly | GitHub Actions · `nightly-smoke.yml` |

---

## Related

- [P3-S5-runbook.md](./P3-S5-runbook.md)
- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md) § P3-S5
- [apps/api/.env.example](../../apps/api/.env.example)
