# Quyết định D01–D12 còn chờ chữ ký

Giả định lấy từ `docs/spec-working-assumptions.md`. Mặc định dưới đây là chặt nhất đã gắn vào code của nhánh này.

| Mã | Giả định đang dùng | File:line | Cách đổi khi có chữ ký |
| --- | --- | --- | --- |
| D08 | Token `v1s` chỉ là vé vào route ký, hạn 15 phút, đúng một contract và tenant. OTP sandbox vẫn không phải chữ ký pháp lý. | `apps/api/src/modules/booking/contract-sign-token.ts:4` | Nếu chữ ký bắt buộc artifact nhà cung cấp, chặn `signContract` ghi `SIGNED` khi chưa có artifact. Không đổi mặc định trong PR này. |
