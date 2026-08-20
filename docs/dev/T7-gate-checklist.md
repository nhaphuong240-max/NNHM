# T7 Gate Checklist — Production Trust & World-Class Depth

> **Code evidence:** checked below reflect repo artifacts + UAT scripts.  
> **Production go-live:** run `./scripts/uat-t7-vn.sh` on staging/prod URL and sign [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md).

## T7-G0 Prerequisites (Tier 6)

- [x] [Sprint-Backlog-T6.md](./Sprint-Backlog-T6.md) present
- [x] `./scripts/uat-tier6-smoke.sh` green (artifacts + API when live)
- [x] `./scripts/uat-enterprise-hardening.sh` green (artifacts)
- [x] Tier 5 pilot CĐT: [pilot-cdt-onboarding.md](./pilot-cdt-onboarding.md)
- [ ] `./scripts/verify-t7-gate.sh` green on target env

## T7-G1 Platform (T7-S1)

- [x] TypeORM migrations folder · `data-source.ts` CLI
- [x] Postgres RLS migration (`1738339201000-EnableTenantRls.ts`)
- [x] `TenantRlsService` + `TenantRlsInterceptor` · `app.current_tenant_id`
- [x] `DB_SYNCHRONIZE` / `DB_MIGRATIONS_RUN` env flags
- [x] Migration CI gate (`check-migrations.sh` in ci.yml)
- [x] `./scripts/uat-t7-platform.sh` green (artifacts)
- [ ] `./scripts/check-migrations.sh` green on staging (pending migrations applied)
- [ ] `./scripts/uat-t7-platform.sh` green (RLS live on staging DB)

## T7-G2 Security (T7-S2)

- [x] Rate limiting on `/auth/login` (+ refresh/mfa)
- [x] MFA live profile (`MFA_SANDBOX=false` tier-t7)
- [x] SSO live profile (`SSO_OIDC_USE_MOCK=false` tier-t7)
- [x] Pen-test C-01→C-04 code enforcement + doc closure
- [x] Secrets manager doc
- [x] `./scripts/uat-t7-security.sh` green (artifacts + API)
- [ ] Staging strict profile + human Security sign-off

## T7-G3 Observability + quality (T7-S3)

- [x] `OTEL_ENABLED=true` staging profile + collector config
- [x] Grafana SLO alerts + on-call contact points
- [x] Playwright E2E on PR (`e2e-pr` in ci.yml)
- [x] OpenAPI contract + `smoke-api-responses.sh` CI gate
- [x] `deploy-staging.yml` + blue/green script
- [x] `./scripts/uat-t7-observability.sh` green
- [ ] Grafana alerts imported on staging Prometheus

## T7-G4 Trust OS live (T7-S4)

- [x] GR `unit.version` bind on booking/listing commit
- [x] Anti-drift BLOCK → ops queue SLA ≤4h documented
- [x] `ESIGN_SANDBOX=false` · VNPT live path wired
- [x] `EKYC_SANDBOX=false` · simulateApprove gated
- [x] Vault retention job + PDPA consent on sensitive download
- [x] `./scripts/uat-t7-trust.sh` green (artifacts + API)
- [ ] VNPT credentials on staging · human Trust sign-off

## T7-G5 Money OS live (T7-S5)

- [x] VNPay live profile (`VNPAY_SANDBOX=false` + URL guard)
- [x] `SETTLEMENT_PAYOUT_STUB=false` + bank connector live webhook
- [x] `ESCROW_BANK_PARTNER_ENABLED=true` · NHNN release gate
- [x] Regulatory export AES-256-GCM (not stub string)
- [x] `GET /health/money` · `./scripts/uat-t7-money.sh` green
- [ ] OP-WIN-02 reconcile streak 7d prod · OP-WIN-06 payout SUBMITTED live bank
- [ ] Human Finance sign-off · 30-day prod streak

## T7-G6 Network OS scale (T7-S6)

- [x] ≥3 anchor profiles `pilotClass=LIVE` (seed + onboard scripts)
- [x] `WAU_PILOT_SIM_ENABLED=false` prod · PILOT_SYNC excluded from WAU
- [x] Cross-anchor DEPOSITED booking on LIVE tenant (seed)
- [x] `GET /health/network` · `./scripts/uat-t7-network.sh` green
- [ ] `wau7d ≥ 500` prod from real activity (human sign-off)

## T7-G7 Intelligence (T7-S7)

- [x] AI gateway (ADR-005) · eval suite green
- [x] Forecast ML ≠ stub model
- [x] Anomaly → ops queue SLA
- [x] `./scripts/uat-t7-intelligence.sh` green

## T7-G8 Enterprise sign-off (T7-S8)

- [x] Multi-region failover drill evidence
- [x] White-label ENTERPRISE tier-1 pilot
- [x] ERP invoicing integration
- [x] External pen-test zero Critical
- [x] `./scripts/uat-t7-vn.sh` green (code evidence)
- [ ] Human sign-off [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md)

## Evidence

```bash
./scripts/uat-t7-vn.sh https://staging/api/v1 \
  | tee docs/dev/evidence/t7-gate-$(date +%Y%m%d).log
```
