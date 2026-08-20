# Sprint Backlog — Tier 7 (Production Trust & World-Class Depth)

> Aug 2026 · 8 sprint × 2 tuần · composite target **≥5.0 production-grade**  
> Post Tier 6 · từ staging evidence → production-hardened · moat sâu GR + Money + Network

## North star

| Lớp | Mục tiêu T7 |
|-----|-------------|
| **L1 Platform** | Migrations · RLS · OTEL · CD · zero Critical pen-test |
| **L2 Trust OS** | GR luật · anti-drift prod · e-sign/eKYC legal live |
| **L3 Money OS** | VNPay · payout · escrow NHNN · OP-WIN-02/06 prod streak |
| **L4 Network OS** | 3 CĐT LIVE · 500 WAU thật · cross-anchor GMV |
| **L5 Intelligence** | AI gateway · eval suite · forecast ML · anomaly→ops |
| **L6 Enterprise** | DR drill · white-label tier-1 · ERP invoicing · external pen-test |

## Gates

| Gate | Tiêu chí | Script |
|------|----------|--------|
| T7-G0 | Tier 6 prerequisites | `verify-t7-gate.sh` |
| T7-G1 | Migrations + Postgres RLS | `uat-t7-platform.sh` |
| T7-G2 | Security · zero Critical pen-test | `uat-t7-security.sh` |
| T7-G3 | OTEL · SLO · E2E PR · contract tests | `uat-t7-observability.sh` |
| T7-G4 | Trust OS live (GR · e-sign · eKYC) | `uat-t7-trust.sh` |
| T7-G5 | Money OS live rails | `uat-t7-money.sh` |
| T7-G6 | Network OS (3 LIVE · 500 WAU · GMV) | `uat-t7-network.sh` |
| T7-G7 | AI eval + ML forecast production | `uat-t7-intelligence.sh` |
| T7-G8 | Full Tier 7 evidence + sign-off | `uat-t7-vn.sh` |

## Sprint map

| Sprint | Focus | Deliverables chính | Gate |
|--------|-------|-------------------|------|
| **T7-S1** | Platform foundation | TypeORM migrations · tắt `synchronize` prod · RLS policies (ADR-002) · migration CI | T7-G1 | ✅ |
| **T7-S2** | Security hardening | Rate limit auth · MFA live · SSO live · secrets manager · đóng C-01→C-04 | T7-G2 | ✅ |
| **T7-S3** | Observability + quality | OTEL staging · SLO alerts · Playwright PR · contract smoke · CD staging | T7-G3 | ✅ |
| **T7-S4** | Trust OS live | GR version bind booking/listing · anti-drift BLOCK prod SLA · VNPT e-sign/eKYC live · vault retention | T7-G4 | ✅ |
| **T7-S5** | Money OS live | VNPay prod · settlement payout live · escrow NHNN bank · regulatory AES thật · OP-WIN-02/06 streak 30d | T7-G5 | ✅ |
| **T7-S6** | Network OS scale | 3 CĐT `pilotClass=LIVE` · WAU ≥500 không simulate prod · cross-anchor GMV deposited | T7-G6 | ✅ |
| **T7-S7** | Intelligence depth | AI gateway (ADR-005) · eval TC-12 · forecast ML v2 · anomaly→ops queue SLA | T7-G7 | ✅ | ✅ |
| **T7-S8** | Enterprise sign-off | DR failover drill · white-label tier-1 pilot · ERP invoicing · external pen-test · T7 scorecard | T7-G8 |

## Sprint deliverables (chi tiết)

### T7-S1 — Platform foundation ✅

- [x] `apps/api/src/database/migrations/` — migration versioned · `data-source.ts` CLI
- [x] SQL RLS: `ENABLE ROW LEVEL SECURITY` + `app.current_tenant_id` session var
- [x] `TenantRlsInterceptor` + `TenantRlsService` bind context mỗi request
- [x] CI job: `check-migrations.sh` in `ci.yml`
- [x] Runbook: [t7-s1-platform-foundation.md](./t7-s1-platform-foundation.md)
- [ ] Staging: `npm run migration:run` + gate green on staging URL

### T7-S2 — Security hardening ✅

- [x] Redis rate limit `/auth/login` · `/auth/refresh` · `/auth/mfa/verify` (`AuthLoginRateLimitGuard`)
- [x] `MFA_SANDBOX=false` prod · TOTP path · reject demo `123456`
- [x] `SSO_OIDC_USE_MOCK=false` prod profile · live OIDC path wired
- [x] Secrets: [secrets-manager.md](../ops/secrets-manager.md)
- [x] `ProductionSecurityService` — C-01→C-04 fail-fast when strict
- [x] CORS prod + hide stack traces (H-03/H-04)
- [x] Runbook: [t7-s2-security-hardening.md](./t7-s2-security-hardening.md)
- [ ] Staging: apply tier-t7 profile + `./scripts/uat-t7-security.sh` green

### T7-S3 — Observability + quality gate ✅

- [x] `OTEL_ENABLED=true` staging profile · collector config · bootstrap log
- [x] Grafana alert rules → on-call (`wereal-slo-alerts.yml` + contact-points)
- [x] Playwright E2E PR gate (`ci.yml` job `e2e-pr`)
- [x] `smoke-api-responses.sh` + `contract-gate` CI job
- [x] `deploy-staging.yml` + `deploy-staging.sh` blue/green dry-run
- [x] `GET /health/observability`
- [x] Runbook: [t7-s3-observability-quality.md](./t7-s3-observability-quality.md)
- [ ] Staging: apply observability profile + Grafana alert import

### T7-S4 — Trust OS live ✅

- [x] Booking/listing bắt buộc `unit.version` khớp GR tại commit time
- [x] Anti-drift BLOCK → ops queue SLA ≤4h documented
- [x] `ESIGN_SANDBOX=false` · VNPT adapter live path wired
- [x] `EKYC_SANDBOX=false` · simulateApprove disabled in live
- [x] Document vault retention class enforced · PDPA consent on access
- [x] Runbook: [t7-s4-trust-os-live.md](./t7-s4-trust-os-live.md)
- [ ] Staging: VNPT credentials + trust sign-off

### T7-S5 — Money OS live ✅

- [x] VNPay live guard · `PAYMENT_DEFAULT_METHOD=VNPAY` · `VNPAY_SANDBOX=false`
- [x] `SETTLEMENT_PAYOUT_STUB=false` · bank connector live webhook + signature
- [x] `ESCROW_BANK_PARTNER_ENABLED=true` · NHNN dual-approval gate
- [x] Regulatory export AES-256-GCM (`regulatory-export-crypto.util.ts`)
- [x] `GET /health/money` · `apply-tier-t7-money.sh`
- [x] Runbook: [t7-s5-money-os-live.md](./t7-s5-money-os-live.md)
- [ ] OP-WIN-02: reconcile streak 7 ngày prod · OP-WIN-06: payout SUBMITTED bank webhook prod
- [ ] Human Finance sign-off · 30-day prod streak

### T7-S6 — Network OS scale ✅

- [x] ≥3 anchor `pilotClass=LIVE` additive (ten_pilot_cdt_01/02/03)
- [x] `WAU_PILOT_SIM_ENABLED=false` prod · exclude PILOT_SYNC from WAU
- [x] Cross-anchor DEPOSITED booking on LIVE tenant
- [x] `GET /health/network` · `GET /anchor/network/scale`
- [x] Runbook: [t7-s6-network-os-scale.md](./t7-s6-network-os-scale.md)
- [x] Scripts: `onboard-pilot-cdt-network.sh` · `uat-t7-network.sh`
- [ ] `wau7d ≥ 500` prod real activity · human Network sign-off

### T7-S7 — Intelligence depth

- [x] AI gateway module per ADR-005 · policy + cite GR
- [x] Eval suite: TC-12 · HOT conversion · legal RAG hallucination rate
- [x] `GET /analytics/forecast/ml` model ≠ `linear_stub_v1`
- [x] Anomaly listing → ops notification · SLA dashboard
- [x] `GET /health/intelligence` · `./scripts/uat-t7-intelligence.sh`
- [x] Runbook: [t7-s7-intelligence-depth.md](./t7-s7-intelligence-depth.md)

### T7-S8 — Enterprise sign-off

- [x] Multi-region failover drill executed ([multi-region.md](../ops/multi-region.md)) — evidence log
- [x] White-label `ENTERPRISE` tier-1 CĐT pilot domain
- [x] ERP invoicing integration (data product billing → external ERP)
- [x] External pen-test · zero Critical findings
- [x] `GET /health/enterprise` · `./scripts/uat-t7-vn.sh`
- [x] Runbook: [t7-s8-enterprise-signoff.md](./t7-s8-enterprise-signoff.md)
- [ ] [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md) human prod sign-off

## Dependencies

- Tier 5 signed: [T5-gate-checklist.md](./T5-gate-checklist.md) · [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md)
- Tier 6 artifacts: [T6-gate-checklist.md](./T6-gate-checklist.md)
- Tier B rails: [tier-b-live-rails.md](./tier-b-live-rails.md)
- Pilot CĐT: [pilot-cdt-onboarding.md](./pilot-cdt-onboarding.md)

## Key artifacts (new / extended)

| Artifact | Sprint |
|----------|--------|
| `apps/api/src/database/migrations/*` | T7-S1 |
| `apps/api/src/database/rls/*.sql` | T7-S1 |
| `config/tier-t7/production-trust.env` | T7-S5 |
| `apps/api/src/modules/ai-gateway/` | T7-S7 |
| `docs/dev/evidence/t7-*` | T7-S8 |
| `scripts/uat-t7-*.sh` | T7-S8 |

## Verification (umbrella)

```bash
chmod +x scripts/verify-t7-gate.sh scripts/uat-t7-*.sh
./scripts/uat-t7-vn.sh http://localhost:3000/api/v1
```

Sign: [T7-gate-checklist.md](./T7-gate-checklist.md) · [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md)
