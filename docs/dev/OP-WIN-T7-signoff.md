# OP-WIN T7 — Production Trust Sign-off

> Engineering evidence from `./scripts/uat-t7-vn.sh` · Human rows for prod go-live.

## Engineering gates (automated)

| OP-WIN | Tiêu chí T7 | Script | Eng |
|--------|-------------|--------|:---:|
| T7-PLAT-01 | Migrations + RLS green | `uat-t7-platform.sh` | ☑ |
| T7-SEC-01 | Zero Critical pen-test | `uat-t7-security.sh` | ☑ |
| T7-OBS-01 | OTEL + E2E PR gate | `uat-t7-observability.sh` | ☑ |
| T7-TRUST-01 | E-sign/eKYC live + GR bind | `uat-t7-trust.sh` | ☑ |
| T7-MONEY-01 | Money rails live + OP-WIN-02/06 prod | `uat-t7-money.sh` | ☑ |
| T7-NET-01 | 3 LIVE anchors · WAU ≥500 | `uat-t7-network.sh` | ☑ |
| T7-AI-01 | Eval suite + ML forecast v2 | `uat-t7-intelligence.sh` | ☑ |
| T7-ENT-01 | DR drill + ERP + white-label + pen-test | `uat-t7-vn.sh` | ☑ |

## Human sign-off (production)

| Role | Criteria | Name | Date |
|------|----------|------|------|
| **Product** | 3 CĐT LIVE · network GMV pilot | | |
| **Finance** | OP-WIN-02/06 prod 30d · payout live | | |
| **Compliance** | NHNN escrow · eKYC · regulatory export | | |
| **Security** | External pen-test zero Critical · MFA/SSO live | | |
| **Engineering** | `./scripts/uat-t7-vn.sh` green on prod URL | | |

## Evidence

```bash
./scripts/dr-failover-drill.sh https://staging/api/v1
./scripts/uat-t7-vn.sh https://prod/api/v1 \
  | tee docs/dev/evidence/t7-signoff-$(date +%Y%m%d).log
curl https://prod/api/v1/health/enterprise | jq .
```

Prior tier: [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md)
