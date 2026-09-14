# Chính sách bảo vệ quyền chăm sóc khách (Deal Protection)

> **Mã tài liệu:** `policy.dealProtection.v1`  
> **Trạng thái:** Mẫu Wave 0 — **chưa ký** · thay `[CĐT]`, `[Dự án]`, `[Ngày]` trước go-live  
> **Tham chiếu kỹ thuật:** `TenantDemandPolicyPayload.dealProtection` · API `/crm/demand-policy`

---

## 1. Phạm vi

Áp dụng cho mọi đối tác bán hàng (sàn, đại lý) tham gia phân phối dự án **[Tên dự án]** của **[Chủ đầu tư]**, thông qua nền tảng Ngôi Nhà Hôm Nay.

## 2. Đăng ký khách hợp lệ

Đối tác đăng ký khách trên hệ thống với: họ tên, SĐT chính xác, dự án, consent khách (theo PDPA). Hệ thống xác nhận **Accepted** khi không có bảo vệ hiệu lực của đối tác khác cho cùng SĐT + dự án.

## 3. Thời hạn bảo vệ

- **30 ngày** kể từ Accepted (cấu hình `protectionDays`).
- Gia hạn khi **xem nhà confirmed/completed** (nếu `viewingConfirmedExtendsProtection = true`).
- Hết hạn do **không hoạt động** sau `coolingOffDaysInactive` ngày (mặc định 14).

## 4. Ưu tiên tranh chấp

Mặc định: **First valid registration** (`FIRST_VALID_REGISTRATION`).  
Tùy chọn dự án: **First site visit** (`FIRST_SITE_VISIT`) — phải ghi trong phụ lục ký.

Khi trùng: hệ thống trả **Existing Protected**; đối tác không thấy PII đối tác khác. Tranh chấp mở **case** (Open → Evidence → Review → Quyết định → Appeal → Close), SLA **5 ngày làm việc**.

## 5. Booking

Chỉ tạo booking inventory khi registration còn hiệu lực **hoặc** có quyết định dispute / override có audit NNHN Ops.

## 6. Phụ lục ký (beachhead)

| Mục | Giá trị |
|---|---|
| CĐT | __________________ |
| Dự án | __________________ |
| Sàn tham gia (2) | __________________ |
| Ngày hiệu lực | __________________ |
| Chữ ký CĐT | __________________ |
| Chữ ký NNHN Ops | __________________ |

---

*Sau khi ký: upload PDF vào document store; set `dealProtectionPolicyId` trên tenant policy.*
