# T22–T24

Các tài liệu này không triển khai production và không bật pilot.

## T22 — restore trên sandbox

- RPO và RTO chưa có chữ ký. SPEC chỉ đề xuất pilot RPO không quá 15 phút và RTO không quá 4 giờ khi hạ tầng cho phép; owner ký sau khi đo. Bản này không ghi một số đã đo.
- Diễn tập restore, nếu làm, chỉ dùng `pg_dump` của database thử. Không restore database thật.
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
| KP01 | Trust và inventory: nguồn còn hiệu lực, lag projection, CTA cũ, vi phạm giữ chỗ đôi | Chưa đo |
| KP02 | Sales: cohort lead → viewing → hold → cọc đối soát → hợp đồng, SLA giờ làm việc, tranh chấp, no-show | Chưa đo |
| KP03 | Finance: chứng từ chưa khớp, thời gian đối soát, hoàn/chi đang chờ, aging earned/payable/paid | Chưa đo |
| KP04 | Adoption và AI: agency còn tác vụ hữu ích, thời gian xử lý ngoại lệ, citation và chi phí AI | Chưa đo |

Không đề xuất expand, hold, hay stop từ các ô trống này.
