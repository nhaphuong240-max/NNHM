# OP-WIN OPS — OPS-90 sign-off (G-OPS-4)

> Engineering evidence from `./scripts/uat-ops-signoff.sh` · Human rows for staging go-live.

## Engineering gates (automated)

| OP-WIN | Tiêu chí OPS-90 | Script | Eng |
|--------|-----------------|--------|:---:|
| OPS-S6-01 | Grafana staging + on-call + incident drill evidence | `ops-incident-drill.sh` | ☑ |
| OPS-S6-02 | White-label domain + 5+5 URL pack | `uat-ops-signoff.sh` | ☑ |
| OPS-S6-03 | SSO OIDC optional (N/A nếu IT CĐT chưa đòi) | `uat-t2-sso.sh` | ☑ |
| OPS-S6-04 | OpenAPI ≥80 paths + required OPS routes | `validate-route-coverage.mjs` | ☑ |
| OPS-S6-05 | UAT S1–S6 human docs present | `uat-ops-signoff.sh` | ☑ |

## Human sign-off (G-OPS-4)

| Role | Criteria | Name | Date |
|------|----------|------|------|
| **Engineering** | On-call 1 incident drill; `./scripts/uat-ops-signoff.sh` green on staging | | |
| **Security** | OTP `123456` reject on `ten_pilot_cdt_01`; no demo OTP on LIVE tenant | | |
| **Product** | CĐT white-label link pack shared with pilot customer | | |
| **Finance** | G-OPS-2 signed (payout reconcile) before prod payout | | |

## SSO optional (OPS-S6-03)

| IT CĐT yêu cầu SSO? | Action | Name | Date |
|---------------------|--------|------|------|
| ☐ Không — N/A | `ssoOidcEnabled=false` on pilot LIVE_RAILS | | |
| ☐ Có — bật OIDC | Set `ssoOidcEnabled=true`, run `uat-t2-sso.sh` on pilot | | |

## Evidence

```bash
./scripts/ops-incident-drill.sh https://staging/api/v1
./scripts/uat-ops-signoff.sh https://staging/api/v1 \
  | tee docs/dev/evidence/ops-s6-signoff-$(date +%Y%m%d).log
curl -s https://staging/api/v1/ops/readiness | jq .
curl -s -H "X-Tenant-Id: ten_pilot_cdt_01" \
  https://staging/api/v1/admin/config/rails/resolved | jq '.data | {ssoOidcEnabled,ssoOidcMock}'
```

Prior gates: [UAT-OPS-pilot-human.md](../uat/UAT-OPS-pilot-human.md) (G-OPS-1) · [UAT-OPS-S4-human.md](../uat/UAT-OPS-S4-human.md) (G-OPS-3) · [UAT-OPS-S5-human.md](../uat/UAT-OPS-S5-human.md) (G-OPS-2)
