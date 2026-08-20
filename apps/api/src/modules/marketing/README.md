# Marketing / Distribution (MOD-MKT)

UC-MKT-01 · UC-MKT-02 · BR-19

## Endpoints

| Method | Path | Actor |
|--------|------|-------|
| GET | `/marketing/distribution/policies?projectId=` | Developer |
| POST | `/marketing/distribution/policies` | Developer |
| POST | `/marketing/distribution/policies/:id/publish` | Developer |
| GET | `/marketing/marketplace/projects` | Agency (cross-tenant read) |
| POST | `/marketing/marketplace/applications` | Agency |
| GET | `/marketing/applications?status=` | Developer / Agency |
| PATCH | `/marketing/applications/:id/review` | Developer |
| GET | `/marketing/marketplace/admin/rankings` | Platform ops · SCR-ADMIN-015 |
| POST | `/marketing/marketplace/admin/penalties` | Apply SLA penalty |
| POST | `/marketing/marketplace/admin/appeals/:agencyTenantId` | Agency appeal stub |

## Seed (cross-tenant demo)

| Tenant | ID | User |
|--------|-----|------|
| Developer | `ten_dev_01` | `admin@sunrise-dev.vn` |
| Agency | `ten_agency_01` | `agency@sunrise-realty.vn` / `Agency123!` |

Published policy `dp_sunrise_mkt_v1` on `prj_sunrise` + pending application `aa_pilot01`.

## Smoke

```bash
# Agency browse marketplace
curl -s -H "Authorization: Bearer $AGENCY_TOKEN" \
  http://localhost:3000/api/v1/marketing/marketplace/projects | jq .

# Developer review queue
curl -s -H "Authorization: Bearer $DEV_TOKEN" -H 'X-Tenant-Id: ten_dev_01' \
  http://localhost:3000/api/v1/marketing/applications | jq .
```
