# Giả định làm việc D01–D12

Nguồn: SPEC v1.0 là TARGET. Các giá trị dưới đây là giả định để triển khai khi chưa có chữ ký D01–D12. Không thay chữ ký pháp lý.

| Mã | Giá trị đã chọn | Còn cần người ký |
| --- | --- | --- |
| D01 | Tenant là pháp nhân. `stockOwnerTenantId` là CĐT. Sàn/F1/F2 là tổ chức riêng, chỉ thấy field được grant. Header không tự đổi tenant. | Ranh giới pháp nhân thật của từng CĐT và sàn |
| D02 | Deny mặc định. Membership không phải grant. Grant có hạn và không rộng hơn grant cha. Ma trận vai trò SPEC được map từ vai trò cũ thành hàng đợi duyệt, không tự cấp mọi dự án. | Chữ ký ma trận thật, MFA step-up, break-glass |
| D03 | PII che mặc định. Export cần purpose, người duyệt khác người yêu cầu, hạn mức và TTL. | Mục đích xử lý và allowlist thật |
| D04 | Giá là PriceBookVersion. Hai khoảng hiệu lực chồng thì chặn. Quote `ACCEPTED` bất biến. Không bịa thuế suất. | Biểu thuế, phí, ưu đãi |
| D05 | `protectionDays` lấy từ policy. SĐT trùng vào hàng đợi. Lead HOT vẫn chờ người duyệt. | Số ngày bảo vệ từng dự án |
| D06 | Hold không phải cọc. DepositAgreement tách khỏi booking. Thiếu rule hoàn thì không tự bịa phí. | Điều khoản giữ chỗ và phí |
| D07 | Chỉ sandbox. Số tiền và currency của intent lấy từ booking phía server. Amount hoặc currency client khác thì từ chối. Đây là thay đổi luôn bật, không thêm cờ mới. | Merchant và chứng thư cổng thật |
| D08 | Thiếu artifact thì không ghi `EXECUTED`. Nhãn sandbox không phải chữ ký. | Nhà cung cấp chữ ký |
| D09 | BNPL không thay sổ phải thu. ERP chỉ stub. | Hợp đồng công nợ |
| D10 | `earned` khác `payable` khác `paid`. `SIMULATED`/`SKIPPED` không phải `PAID`. | Chính sách hoa hồng đã ký |
| D11 | Trang công khai chỉ listing đã duyệt. Không index trang riêng. | Chính sách SEO |
| D12 | AI không ghi giá, tồn, hold, hoa hồng, hoàn, hợp đồng. Thiếu nguồn thì abstain. | Ngưỡng gửi ra ngoài |

`users.email` giữ unique toàn hệ thống. Câu hỏi pháp nhân email vẫn mở.
