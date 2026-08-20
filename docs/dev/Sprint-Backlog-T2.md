# Sprint Backlog — Tier 2 Enterprise Trust

Mirror format P3 backlog. Sprint map 6 × 2 tuần.

## T2-S1 — Config platform ✅

- [x] `tenant_config_versions` entity + `TenantConfigService`
- [x] Dual-read/write `CONFIG_PLATFORM_READ|WRITE=v1|v2|dual`
- [x] SSO + payment routing off audit-as-DB
- [x] `GET /admin/config/history` + backfill API

## T2-S2 — PDPA consent + SOC2 kickoff ✅

- [x] `consent_ledger_entries` append-only
- [x] Hooks: CRM lead create
- [x] `GET /compliance/consent/:subjectType/:subjectId` + CSV export
- [x] `docs/compliance/SOC2-readiness.md`

## T2-S3 — SSO prod ✅

- [x] Config platform provider storage
- [x] Email domain allowlist (`SSO_EMAIL_DOMAIN_ALLOWLIST`)
- [x] `scripts/uat-t2-sso.sh`

## T2-S4 — eKYC VN ✅

- [x] `EkycProviderAdapter` + VNPT stub
- [x] Extend `kyc_profiles` (externalRef, provider, …)
- [x] Webhook + simulate approve

## T2-S5 — E-sign legal ✅

- [x] `EsignProviderAdapter` + VNPT SmartCA stub
- [x] Consent hook before sign
- [x] Webhook `POST /contracts/webhooks/esign`
- [x] Buyer UI signingUrl display

## T2-S6 — Ops + close-out ✅

- [x] Webhook + settlement schedule config phase 2
- [x] `GET /health/slo` + `docs/ops/slo-99-5.md`
- [x] On-call roster update
- [x] `scripts/uat-t2-trust.sh`
- [x] Pen test scope note in T2 runbook

## Definition of Done — Tier 2

| Gate | Status |
|------|--------|
| T2-G1 Identity | SSO staging + MFA not sandbox OTP |
| T2-G2 Compliance | Consent export + eKYC webhook + e-sign provider ref |
| T2-G3 Platform | Config reads via tenant_config (dual→v2) |
| T2-G4 Ops | SLO 99.5% doc + on-call roster |
| T2-G5 Evidence | UAT scripts green |
