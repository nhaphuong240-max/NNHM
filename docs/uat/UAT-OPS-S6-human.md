# UAT OPS S6 — chuyên nghiệp (G-OPS-4)

> Tenant LIVE: `ten_pilot_cdt_01`  
> Cổng: **G-OPS-4**. Eng + Security ký sau incident drill.

**Rails pilot (verify SSO optional off):**

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_pilot_cdt_01" \
  "$API/admin/config/rails/resolved" | jq '.data | {ssoOidcEnabled,ssoOidcMock}'
```

Kỳ vọng mặc định: `ssoOidcEnabled: false` (SSO không chặn GTM).

## UAT-S6-01 — Grafana + on-call + incident drill

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Import dashboard + alerts lên Grafana staging URL | | | |
| 2 | Điền roster `docs/ops/on-call-roster-ops90.md` | | | |
| 3 | Chạy `./scripts/ops-incident-drill.sh` → evidence log | | | |
| 4 | `GET /ops/readiness` → grafana + onCall + incidentDrill | | | |

## UAT-S6-02 — White-label domain CĐT

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Admin → Whitelabel: `customDomain` = portal.thanglong-dev.vn | | | |
| 2 | 5 public + 5 dev URLs trong `docs/gtm/whitelabel-url-pack-ops90.md` | | | |
| 3 | `GET /health/enterprise` → enterpriseReady | | | |
| 4 | CĐT đưa link khách thử public search | | | |

## UAT-S6-03 — SSO OIDC (optional)

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Nếu IT **không** đòi SSO → tick N/A trên OP-WIN-OPS-signoff | | | |
| 2 | Nếu bật: `ssoOidcEnabled=true` + provider Azure AD/Okta | | | |
| 3 | Login SSO không chặn agent password login | | | |

## UAT-S6-04 — OpenAPI contract gate

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | CI `contract-gate` green (Spectral + route coverage) | | | |
| 2 | Required OPS paths documented (ops, commission, bank webhook…) | | | |
| 3 | `openapi.ops-s6-extensions.yaml` merged in validate script | | | |

## UAT-S6-05 — Security: no demo OTP on staging pilot

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | OTP `123456` reject trên `ten_pilot_cdt_01` | | | |
| 2 | Checkout / e-sign không placeholder demo trên LIVE tenant | | | |
| 3 | Incident drill log ghi nhận OTP reject step | | | |

---

## G-OPS-4 sign-off

| Role | Tiêu chí | Name | Date |
|------|----------|------|------|
| **Eng on-call** | 1 incident drill + Grafana staging import | | |
| **Security** | Không OTP `123456` trên staging pilot LIVE | | |
| **Product** | White-label URL pack delivered to CĐT | | |

Automated gate (`e2e/s6-ops.spec.ts`, `scripts/uat-ops-signoff.sh`) không thay chữ ký trên bảng này.
