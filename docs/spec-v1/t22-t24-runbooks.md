# T22–T24

Các tài liệu này không triển khai production và không bật pilot.

## T22 — restore trên sandbox

- RPO mục tiêu sandbox: 24 giờ, đo bằng bản `pg_dump` của database thử, không phải database thật.
- RTO mục tiêu sandbox: thời gian restore cộng `migration:run` trên database trống tên `wereal_t02`.
- `DB_SYNCHRONIZE` không được `true`. URL giống production bị harness từ chối.
- Demo rails (`mfaSandbox`, `vnpaySandbox`, `smsSandbox`) phải tắt được bằng cấu hình tenant. Tắt thì luồng sandbox dừng, không ghi `PAID`.
- App cũ đọc được cột mới vì migration chỉ thêm bảng và nới index, không xóa cột cũ.

## T23 — pilot 1 CĐT / 1 dự án

Checklist, chưa thực hiện:

- Chưa tạo tài khoản thật.
- Chưa nhập PII.
- Chưa thu tiền.
- Chưa bật cờ pilot.
- Diễn tập ngoại lệ dùng dữ liệu `SYNTHETIC` trên database thử.

## T24 — khung KPI

| Mã | Khung | Số liệu |
| --- | --- | --- |
| KP01 | Tỷ lệ lead đủ consent trước khi giao | Chưa đo |
| KP02 | Một hold active trên một căn | Chưa đo trên production |
| KP03 | Đối soát sandbox cân bằng | Chưa đo |
| KP04 | Export có người duyệt và TTL | Chưa đo |

Không đề xuất expand, hold, hay stop từ các ô trống này.
