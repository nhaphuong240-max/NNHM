# Quyết định D01–D12 còn chờ chữ ký

Giả định lấy từ `docs/spec-working-assumptions.md`. Mặc định dưới đây là chặt nhất đã gắn vào code của nhánh này.

| Mã | Giả định đang dùng | File:line | Cách đổi khi có chữ ký |
| --- | --- | --- | --- |
| D04 | Hai khoảng hiệu lực chồng thì từ chối. Chỉ `DEVELOPER_ADMIN` được mở khoảng mới. Không tính thuế, phí, ưu đãi. Quote `ACCEPTED` không đổi trạng thái. | `apps/api/src/modules/price-book/price-book.service.ts:15` | Khi ma trận vai trò được ký, đổi `PRICE_BOOK_WRITER_ROLE`. Không thêm số thuế trong service này. |
| D08 | Token `v1s` chỉ là vé vào route ký, hạn 15 phút, đúng một contract và tenant. OTP sandbox vẫn không phải chữ ký pháp lý. | `apps/api/src/modules/booking/contract-sign-token.ts:4` | Nếu chữ ký bắt buộc artifact nhà cung cấp, chặn `signContract` ghi `SIGNED` khi chưa có artifact. Không đổi mặc định trong PR này. |
| D12 | Câu trả lời listing chỉ dùng tên dự án đã lưu. Không có tên thì `không đủ dữ liệu`. Không in giá căn. | `apps/api/src/modules/ai-copilot/copilot.service.ts:85` | Khi có retrieval đã ký, thay câu abstain bằng đoạn có trích nguồn. Gỡ nốt cụm “giá trị” trong mẫu investment nếu chữ ký cấm mọi cụm giá. |
