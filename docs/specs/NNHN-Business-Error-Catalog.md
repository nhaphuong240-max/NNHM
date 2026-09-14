# Catalog mã lỗi nghiệp vụ — Demand OS

> **Mã:** NNHN-ERR-001 v1.0 · **Wave 0** · Đồng bộ code: `apps/api/src/common/business-error.ts`

Mọi response lỗi nghiệp vụ **phải** có trường `code` ổn định. Không đổi tên sau khi P0 ship.

| Code | HTTP | Khi nào | Ghi chú client |
|---|---|---|---|
| `LEAD_DEDUPED` | 422 | Trùng SĐT — merge, không tạo lead mới | Hiển thị “đã ghi nhận”; dùng `leadId` trả về |
| `REGISTRATION_PROTECTED` | 409 | Sàn khác đang bảo vệ khách + dự án | Không hiện PII; meta `EXISTING_PROTECTED` |
| `REGISTRATION_CONFLICT` | 409 | Nhiều bên, case tranh chấp mở | P0-S3 dispute workflow |
| `VIEWING_SLOT_INVALID` | 422 | Datetime không parse / quá khứ | Form PDP |
| `VIEWING_SLOT_CONFLICT` | 409 | Agent trùng lịch | P0-S3 |
| `SLA_NOT_APPLICABLE` | 422 | Ngoài giờ hành chính / ngày nghỉ | Không tính KPI HOT |
| `INTENT_INDEX_MISS` | 422 | Listing thiếu `transactionType` trên index | Job index, không SERP |
| `SEEKER_OTP_INVALID` | 422 | OTP sai / hết hạn | P0-S2 |
| `ALERT_OPTED_OUT` | 422 | User opt-out alert | Worker skip |
| `DISPUTE_OPEN` | 409 | Case tranh chấp chưa đóng | P0-S3 |
| `PDPA_CONSENT_REQUIRED` | 422 | Form public thiếu consent | BR-15 |
| `PHONE_INVALID` | 422 | SĐT không normalize được | |
| `VALIDATION_FAILED` | 422 | Generic validation | |
| `NOT_FOUND` | 404 | Entity không tồn tại | |
| `FORBIDDEN` | 403 | ABAC / role | |

## Format response (RFC 7807 style)

```json
{
  "type": "https://wereal.dev/problems/phone-invalid",
  "title": "Invalid phone number",
  "detail": "phone is invalid",
  "code": "PHONE_INVALID"
}
```

## Truy vết FR

| FR | Codes |
|---|---|
| FR-LEAD-002 | `LEAD_DEDUPED` |
| FR-DP-001 | `REGISTRATION_PROTECTED`, `REGISTRATION_CONFLICT` |
| FR-VIEW-001 | `VIEWING_SLOT_INVALID`, `VIEWING_SLOT_CONFLICT` |
| FR-LEAD-008 | `SLA_NOT_APPLICABLE` |
| FR-SRCH-006 | `INTENT_INDEX_MISS` |
| FR-IAM-SEEKER | `SEEKER_OTP_INVALID` |
| FR-SRCH-003b | `ALERT_OPTED_OUT` |
| FR-DP-004 | `DISPUTE_OPEN` |
| BR-15 | `PDPA_CONSENT_REQUIRED` |
