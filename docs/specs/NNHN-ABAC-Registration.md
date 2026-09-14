# ABAC — Lead registration (PII mask)

> **Mã:** NNHN-ABAC-REG-001 v1.0 · **Wave 0 BA-04**  
> Code: `apps/api/src/modules/crm/registration-abac.util.ts`

## Quy tắc

| Viewer | Row owner | Cùng org | Status | Hiển thị PII |
|---|---|---|---|---|
| Cùng `registeredBy` | ✓ | — | any | ✓ |
| Cùng `organizationId` | — | ✓ | ACCEPTED | ✓ |
| Sàn khác | — | ✗ | ACCEPTED / PROTECTED / CONFLICT | ✗ (mask) |
| `NNHN_ADMIN` / `DEVELOPER_ADMIN` | — | — | any | ✓ (audit log) |

Mask format: tên `••••`, SĐT `0901****`.

## Schema Wave 0

- `users.organization_id` — agency trong tenant
- `lead_registrations.registered_by_org_id` — snapshot lúc đăng ký

## Test cases UAT

1. Agent A org Sunrise đăng ký → Accepted, thấy full PII.  
2. Agent B org River cùng SĐT+dự án → Existing Protected, mask.  
3. Agent C cùng org Sunrise → thấy full PII colleague.  
4. Ops role DEVELOPER_ADMIN → thấy full, action audited.

P0-S3: thêm `projectId` entitlement trên org (chưa Wave 0).
