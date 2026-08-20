# SOP CĐT — Import bảng hàng tuần + PATCH giá

**Tenant:** `ten_pilot_cdt_01` · **Dự án:** `prj_thanglong_01` Thăng Long Central  
**Owner:** admin CĐT `pilot@thanglong-dev.vn` (`DEVELOPER_ADMIN`)  
**Công cụ:** `/developer/units/import` · `/developer/units`

Không dùng OTP `123456`. Tenant LIVE MFA = TOTP.

## Cadence

Mỗi **thứ Hai 09:00 ICT** (hoặc sau khi PĐT chốt giá tuần):

1. Export CSV từ PĐT / Excel: cột `code,floor,area,bedrooms,basePrice,status`.
2. Mở Import → upload → **Validate & preview diff**.
3. Chỉ commit dòng `CREATE` / `UPDATE`. Dòng invalid sửa file rồi preview lại.
4. Mở Bảng hàng GR, lọc căn vừa import, spot-check 3 căn.

Giá lẻ (1 căn, không đợi file tuần): **Sửa giá** trên grid — API từ chối role khác `DEVELOPER_ADMIN`.

## Cấm

| Hành động | Ai | Hệ thống |
|-----------|----|----------|
| PATCH `basePrice` | Sale / agency / finance | `403` |
| Sửa giá trên listing marketing lệch GR >10% | Agent | Anti-drift **BLOCK**, không duyệt |
| Import trên tenant demo `ten_dev_01` rồi coi là LIVE | Ops | Sai tenant |

## Checklist tuần

- [ ] CSV đã preview, 0 invalid
- [ ] Commit xong, absorption / AVAILABLE khớp PĐT
- [ ] Không sale nào PATCH giá
- [ ] Drift BLOCK trên `/admin/ops` = 0 trước ngày mở bán

## Liên hệ

Ops console `/admin/ops` · runbook `docs/runbooks/ops-console.md`
