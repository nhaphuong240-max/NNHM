# UAT OPS pilot — người thật (G-OPS-1)

> Tenant LIVE: `ten_pilot_cdt_01` · dự án `prj_thanglong_01`  
> Không tính pass khi chỉ chạy script / MOCK `mock/complete`.  
> Cổng: **G-OPS-1**. Fail → **không mở S4**.

**Actors**

| Vai | Tài khoản seed | Ghi chú |
|-----|----------------|---------|
| CĐT admin | `pilot@thanglong-dev.vn` | TOTP, không `123456` |
| Sale 1 | `agent@thanglong-dev.vn` | Book từ lead |
| Sale 2 | agency user trên pack G-OPS-0 | Cùng tenant hoặc phân phối |
| Finance | `finance@thanglong-dev.vn` | TOTP |

## UAT-OPS-01 — Ops console

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Login admin → `/admin/ops` thấy 4 widget | | | |
| 2 | Deep link drift → `/admin/moderation` | | | |
| 3 | Deep link mismatch → `/finance/reconciliation` | | | |
| 4 | `GET /health/ops` (Bearer + `X-Tenant-Id`) khớp UI | | | |

## UAT-OPS-02 — SOP CĐT

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | CĐT import CSV tuần trên `/developer/units/import` | | | |
| 2 | Sale thử Sửa giá → 403 | | | |
| 3 | CĐT PATCH 1 căn, GR version tăng | | | |

## UAT-OPS-03 — Book 30 giây (nhà mẫu)

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Sale mở lead trên mobile → Giữ chỗ | | | |
| 2 | Không GPS / không capture form trên đường book | | | |
| 3 | RESERVED < 30s (timer trên màn Giữ chỗ) | | | |

## UAT-OPS-04 — Cọc người thật

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Buyer/sale tạo intent VNPAY sandbox (không mock/complete) | | | |
| 2 | IPN HMAC → booking `DEPOSITED` | | | |
| 3 | `GET /ledger/entries?bookingId=` đúng 2 line, balanced | | | |
| 4 | Reconcile ngày ICT `MATCHED` | | | |

---

## G-OPS-1 sign-off (người thật)

| Role | Tiêu chí | Name | Date |
|------|----------|------|------|
| **PO** | 1 cọc người trên staging/prod URL, không MOCK complete | | |
| **Finance** | Ledger MATCHED, widget mismatch = 0 ngày cọc | | |
| **CĐT** | SOP import tuần + giá chỉ admin CĐT | | |

Automated PR gate (`e2e/ops.spec.ts`, `e2e/vnpay-ledger.spec.ts`) **không** thay chữ ký trên bảng này.
