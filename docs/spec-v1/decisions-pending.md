# Quyết định D01–D12 còn chờ chữ ký

Giả định lấy từ `docs/spec-working-assumptions.md`. Mặc định dưới đây là chặt nhất đã gắn vào code của nhánh này.

| Mã | Giả định đang dùng | File:line | Cách đổi khi có chữ ký |
| --- | --- | --- | --- |
| D01 | Chỉ `DEVELOPER_ADMIN` của tenant trùng `stockOwnerTenantId` được cấp hoặc thu hồi phân bổ. Agreement phải `ACTIVE`. Placement chỉ đúng căn, còn hạn, trạng thái `ACTIVE`. | `apps/api/src/modules/allocation/allocation.service.ts:14` | Khi ranh giới sàn/F1 được ký, đổi `ALLOCATION_WRITER_ROLE` và điều kiện `stockOwnerTenantId`. |
| D03 | Export chỉ ghi job `REQUESTED` rồi `APPROVED` khi người duyệt khác người yêu cầu, còn hạn, và không vượt hạn mức dòng. Phản hồi không kèm dòng khách. | `apps/api/src/modules/export-job/export-job.service.ts:48` | Khi có allowlist mục đích, từ chối purpose ngoài danh sách đã ký. |
| D04 | Hai khoảng hiệu lực chồng thì từ chối. Chỉ `DEVELOPER_ADMIN` được mở khoảng mới. Không tính thuế, phí, ưu đãi. Quote `ACCEPTED` không đổi trạng thái. | `apps/api/src/modules/price-book/price-book.service.ts:15` | Khi ma trận vai trò được ký, đổi `PRICE_BOOK_WRITER_ROLE`. Không thêm số thuế trong service này. |
| D05 | SĐT đã chuẩn hóa được băm SHA-256 rồi so với `customers.phone_hash` cùng tenant. Trùng thì hàng `PENDING`. Chỉ `OPS_ADMIN` hoặc `DEVELOPER_ADMIN` được đánh `DISTINCT`. Không gộp, không gán HOT. | `apps/api/src/modules/dedup/dedup-review.service.ts:16` | Khi có số ngày bảo vệ đã ký, đọc policy đó. Nếu được phép gộp hồ sơ, thêm bước riêng có kiểm soát dữ liệu. |
| D08 | Token `v1s` chỉ là vé vào route ký, hạn 15 phút, đúng một contract và tenant. OTP sandbox vẫn không phải chữ ký pháp lý. | `apps/api/src/modules/booking/contract-sign-token.ts:4` | Nếu chữ ký bắt buộc artifact nhà cung cấp, chặn `signContract` ghi `SIGNED` khi chưa có artifact. Không đổi mặc định trong PR này. |
| D12 | Câu trả lời listing chỉ dùng tên dự án đã lưu. Không có tên thì `không đủ dữ liệu`. Không in giá căn. | `apps/api/src/modules/ai-copilot/copilot.service.ts:85` | Khi có retrieval đã ký, thay câu abstain bằng đoạn có trích nguồn. Gỡ nốt cụm “giá trị” trong mẫu investment nếu chữ ký cấm mọi cụm giá. |
