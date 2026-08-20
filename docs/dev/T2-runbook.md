# T2 Runbook — Enterprise Trust Verification

## Prerequisites

```bash
cd apps/api && npm run db:up
npm run start:dev   # terminal 1
```

## Full trust smoke

```bash
./scripts/uat-t2-trust.sh
```

## Per-domain checks

### Config platform (T2-S1)

```bash
curl -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" \
  http://localhost:3000/api/v1/admin/config/status
curl ... /admin/config/history?domain=SSO_PROVIDER
```

### Consent ledger (T2-S2)

Create lead with consent → `GET /compliance/consent/LEAD/{id}` → export CSV.

### SSO (T2-S3)

```bash
./scripts/uat-t2-sso.sh
```

Live OIDC: set `SSO_OIDC_USE_MOCK=false`, `SSO_OIDC_CLIENT_SECRET`, Azure/Okta app registration.

### eKYC (T2-S4)

```bash
POST /kyc/ekyc/AGENCY/agcy_sunrise/start
POST /kyc/ekyc/simulate/approve  # sandbox
POST /kyc/ekyc/webhooks/vnpt     # vendor callback
```

BR-23: settlement must pass after `APPROVED`.

### E-sign (T2-S5)

```bash
GET /contracts/{id}/sign-session   # check provider + signingUrl
POST /contracts/{id}/sign          # OTP + consent
POST /contracts/webhooks/esign     # async completion
```

Set `WEREAL_ESIGN_STUB=false`, `ESIGN_PROVIDER=VNPT_SMARTCA` for legal provider path.

### Ops / SLA (T2-S6)

```bash
curl http://localhost:3000/api/v1/health/slo
```

Game day: simulate API down + webhook backlog — see `docs/ops/slo-99-5.md`.

## Pen test scope (Tier 2)

- Identity: SSO callback, MFA bypass
- Consent: ledger tamper attempts
- E-sign webhooks: signature verification bypass

Re-run before enterprise sign-off.
