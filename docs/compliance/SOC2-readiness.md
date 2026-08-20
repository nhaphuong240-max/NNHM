# SOC 2 Readiness — Tier 2 (Readiness only, not Type II audit)

**Owner:** Tech Lead + Compliance lead  
**Horizon:** 6–12 months to Type II  
**Scope:** WEREAL REOS modular monolith (staging)

## Trust Services Criteria mapping

| TSC | Control theme | WEREAL control | Evidence owner | Status |
|-----|---------------|----------------|----------------|--------|
| **Security (CC)** | Access control | JWT + tenant guard + RBAC | Identity TL | ✅ Pilot |
| CC6.1 | Logical access | SSO Azure AD/Okta prod staging | Identity | ✅ T2-S3 |
| CC6.2 | MFA | TOTP (`MFA_SANDBOX=false`) | Identity | ✅ P3-S6 |
| CC6.3 | Role provisioning | SSO role mapping + JIT | Identity | ✅ T2-S3 |
| CC7.2 | Change management | Git PR + CI + config version table | Platform | ✅ T2-S1 |
| CC7.3 | Config separation | Exit audit-as-DB | Platform | ✅ T2-S1/S6 |
| CC8.1 | Vulnerability mgmt | Dependency audit + pen test Tier 2 | Security | 🟡 Scheduled |
| **Availability (A)** | Uptime | SLO 99.5% monthly | SRE | ✅ T2-S6 |
| A1.2 | Monitoring | `/health` + RED metrics plan | SRE | 🟡 Grafana TBD |
| A1.3 | Incident response | On-call roster + post-mortem template | SRE | ✅ T2-S6 |
| **Confidentiality (C)** | Data protection | PDPA consent ledger | Legal | ✅ T2-S2 |
| C1.1 | Consent records | Append-only `consent_ledger_entries` | Legal | ✅ T2-S2 |
| C1.2 | Document vault | S3/MinIO signed contracts | Trust | 🟡 Staging S3 |

## Gap remediation (priority)

1. **Grafana dashboards + paging** — wire synthetic probes to PagerDuty (6 weeks)
2. **Access review quarterly** — export RBAC + SSO group mapping (4 weeks)
3. **Vendor management** — eKYC/e-sign DPAs with VNPT (8 weeks)
4. **Pen test re-run** — Tier 2 scope in T2 runbook (2 weeks)

## Evidence pack locations

- CI: `.github/workflows/nightly-smoke.yml`
- Audit export: `GET /audit/export` (Finance)
- Consent export: `GET /compliance/consent/export`
- Config history: `GET /admin/config/history`
- On-call: `docs/runbooks/on-call.md`
- SLO: `docs/ops/slo-99-5.md`

**Sign-off:** Tech Lead ☐ · Compliance ☐ · PO Enterprise ☐
