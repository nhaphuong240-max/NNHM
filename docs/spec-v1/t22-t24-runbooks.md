# T22–T24

Các bước này chạy trên database thử. Không triển khai production và không bật pilot.

## T22 — restore trên sandbox

- RPO và RTO chưa có chữ ký. SPEC chỉ đề xuất pilot RPO không quá 15 phút và RTO không quá 4 giờ khi hạ tầng cho phép; owner ký sau khi đo. Diễn tập in `rpo=unmeasured` và `rto_signed=false`. `restore_elapsed_ms` chỉ là thời gian của lần dump đó, không phải RTO đã ký.
- `scripts/t22-restore-drill.js` dùng `pg_dump --inserts` từ `wereal_t22_src` rồi nạp SQL sang `wereal_t22_dst` trên cùng server với `wereal_t02`. Dòng `SET transaction_timeout` và lệnh bắt đầu bằng `\\` bị bỏ vì client CI mới hơn Postgres 16. Xong thì xóa hai database thử. Không `DROP` `wereal_t02` và không restore database thật.
- `DB_SYNCHRONIZE` không được `true`. URL giống production bị script từ chối.
- `sandboxFlowWhenDisabled` trả `NOT_PAID` khi `mfaSandbox`, `vnpaySandbox`, và `smsSandbox` cùng tắt. Một cờ còn bật thì hàm không ghi trạng thái thanh toán.
- Migration cũ trên `main` đã có `DROP COLUMN`. Đợt này không thêm migration mới.

## T23 — pilot 1 CĐT / 1 dự án

`reviewPilotChecklist` và `openSyntheticDrill` giữ các điều kiện sau:

- Tài khoản khác `SYNTHETIC` bị từ chối.
- Field `phone`, `email`, `nationalId`, `fullName`, `address` có chữ thì bị từ chối.
- `collectsMoney` bị từ chối.
- `pilotFlag` bị từ chối.
- Payload lưu `class: SYNTHETIC`, `collectsMoney: false`, `pilotFlag: false`, và không chép field cá nhân.

## T24 — khung KPI

| Mã | Khung | Số liệu |
| --- | --- | --- |
| KP01 | Trust và inventory: nguồn còn hiệu lực, lag projection, CTA cũ, vi phạm giữ chỗ đôi | `measured: false` khi ô không có số |
| KP02 | Sales: cohort lead → viewing → hold → cọc đối soát → hợp đồng, SLA giờ làm việc, tranh chấp, no-show | `measured: false` khi ô không có số |
| KP03 | Finance: chứng từ chưa khớp, thời gian đối soát, hoàn/chi đang chờ, aging earned/payable/paid | `measured: false` khi ô không có số |
| KP04 | Adoption và AI: agency còn tác vụ hữu ích, thời gian xử lý ngoại lệ, citation và chi phí AI | `measured: false` khi ô không có số |

`measureDrillKpis` trả `recommendation: none` cả khi mọi ô đã có số. Không đề xuất expand, hold, hay stop. Số `double_hold_violations` in trong log của database thử không phải kết quả pilot.
