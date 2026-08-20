# T7-S8 — Enterprise sign-off

> Sprint **T7-S8** · Gate **T7-G8** · DR drill · white-label · ERP · pen-test · scorecard

## Deliverables

| Artifact | Path |
|----------|------|
| DR failover drill | `scripts/dr-failover-drill.sh` · `docs/dev/evidence/t7-dr-failover.log` |
| ENTERPRISE pilot | `config/gtm/enterprise-pilot-cdt.json` · seed `ensureEnterpriseT7S8()` |
| ERP invoicing | `integrations/erp-invoicing.service.ts` · `POST /integrations/erp/invoices/sync` |
| External pen-test | `docs/security/pen-test-external-T7.md` |
| Enterprise health gate | `GET /health/enterprise` |
| Domain scorecard T7 | `docs/strategy/WEREAL-Domain-Scorecard.md` |
| Human sign-off | `docs/dev/OP-WIN-T7-signoff.md` |

## White-label ENTERPRISE pilot

| Field | Value |
|-------|-------|
| Tenant | `ten_pilot_cdt_01` |
| Tier | `ENTERPRISE` |
| Domain | `portal.thanglong-dev.vn` |
| Subdomain | `thanglong` |

```bash
./scripts/onboard-enterprise-pilot.sh http://localhost:3000/api/v1
curl -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_pilot_cdt_01" \
  http://localhost:3000/api/v1/tenants/branding | jq .
```

## ERP invoicing (data product billing)

Data mart billing summary → MISA ERP connector (stub or live HMAC).

| Env | Purpose |
|-----|---------|
| `ERP_INVOICING_ENABLED=true` | Enable sync endpoint |
| `ERP_INVOICING_STUB=true` | Accept without external URL (dev/staging) |
| `ERP_INVOICING_URL` | Live MISA endpoint (prod) |

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_dev_01" \
  http://localhost:3000/api/v1/integrations/erp/invoices/sync | jq .
```

## DR drill

Per [multi-region.md](../ops/multi-region.md):

```bash
./scripts/dr-failover-drill.sh http://localhost:3000/api/v1
cat docs/dev/evidence/t7-dr-failover.log
```

Target: RTO ≤ 60 min · RPO ≤ 15 min.

## Pen-test

Zero Critical required for T7-G8. External report: [pen-test-external-T7.md](../security/pen-test-external-T7.md).

## Verify (umbrella)

```bash
./scripts/dr-failover-drill.sh http://localhost:3000/api/v1
./scripts/uat-t7-vn.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/enterprise | jq .
```

## Human sign-off

Complete [OP-WIN-T7-signoff.md](./OP-WIN-T7-signoff.md) after prod URL evidence.
