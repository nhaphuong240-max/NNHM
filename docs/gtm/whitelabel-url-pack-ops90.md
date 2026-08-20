# White-label URL pack — CĐT Thăng Long (OPS-S6-02)

> Tenant: `ten_pilot_cdt_01` · Custom domain: `portal.thanglong-dev.vn`  
> CĐT đưa link khách (5 public) + nội bộ dev (5 màn).

## 5 public (buyer / khách)

| # | URL | Mô tả |
|---|-----|-------|
| 1 | `https://portal.thanglong-dev.vn/public/search` | Tìm căn |
| 2 | `https://portal.thanglong-dev.vn/public/map` | Bản đồ dự án |
| 3 | `https://portal.thanglong-dev.vn/public/compare` | So sánh căn |
| 4 | `https://portal.thanglong-dev.vn/public/units/tl_un_01` | Chi tiết căn mẫu |
| 5 | `https://portal.thanglong-dev.vn/buyer/esign?contractId=ctr_pilot_deposit01&tenantId=ten_pilot_cdt_01` | Ký phiếu cọc |

Local dev: thay host bằng `http://localhost:5174` + query `tenantId=ten_pilot_cdt_01` nếu cần.

## 5 dev (CĐT / admin)

| # | URL | Mô tả |
|---|-----|-------|
| 1 | `/developer/units` | Golden Record — danh sách căn |
| 2 | `/developer/units/import` | Import GR (CSV) |
| 3 | `/developer/commission` | Chính sách HH |
| 4 | `/developer/absorption` | Absorption / GMV |
| 5 | `/admin/whitelabel` | Branding + custom domain |

Admin ops: `/admin/ops` · Finance settlement: `/finance/settlement`

## DNS checklist

- [ ] CNAME `portal.thanglong-dev.vn` → staging web ingress
- [ ] TLS cert issued
- [ ] `GET /health/enterprise` → `enterpriseReady: true`

Config: `config/gtm/enterprise-pilot-cdt.json`
