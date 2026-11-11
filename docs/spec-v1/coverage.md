# SPEC v1.0 — trạng thái sau nhánh spec-v1-implementation

Không phải production-ready. `not-done (rules-only)` nghĩa là có bảng hoặc hàm thuần, chưa gắn Nest service/controller của luồng đó.

`1758130000000` `down()` gỡ prefix `v1.{tenant_id}.` trên mọi token khớp dạng đó, kể cả token tạo sau khi `up()` đã chạy, rồi `DROP POLICY`, `NO FORCE ROW LEVEL SECURITY`, và `DISABLE ROW LEVEL SECURITY` trên 22 bảng. Không chỉ gỡ policy.

| Gói | Trạng thái | File chính | Test |
| --- | --- | --- | --- |
| T03 | partial | `1758130000000-EnableRemainingTenantRls.ts`, `public-token-tenant.guard.ts`, `tenant-rls.interceptor.ts` | `scripts/t02-rls-hold-proof.js` trên role `NOSUPERUSER`. Jest superuser không phải bằng chứng G01 |
| T04 | not-done (rules-only) | `evidence-records.entity.ts`, `export-jobs.entity.ts` | `maskPhone`, `exportJobAllowed` |
| T05 | not-done (rules-only) | `distribution-agreements.entity.ts`, `unit-allocations.entity.ts` | `allocationAllowsPlacement` |
| T06 | not-done (rules-only) | `price-book-versions.entity.ts`, `quotes.entity.ts` | overlap và quote bất biến |
| T07 | not-done (rules-only) | `customers.entity.ts`, `dedup-reviews.entity.ts` | HOT lead đã có từ T02; dedup chưa vào service |
| T08 | not-done (rules-only) | `exception-items.entity.ts` | SLA và tranh chấp cũ giữ nguyên |
| T09 | partial | `1758150000000-ActiveHoldUnique.ts`, `docs/t09/active-hold-unique.md` | `scripts/t02-rls-hold-proof.js` ≥50 insert cùng một căn |
| T10 | partial | `payment.service.ts` | `payment.service.spec.ts`: amount và currency do server |
| T11 | not-done (rules-only) | webhook chữ ký cũ | không có test replay/journal mới |
| T12 | not-done | `refundWithinNet` | `RefundService` chưa tách maker/checker |
| T13 | not-done | `contract-artifacts.entity.ts` | luồng ký cũ chưa ép `PENDING_REVIEW` |
| T14 | not-done (rules-only) | `handover-checklists.entity.ts` | không làm ERP |
| T15 | not-done | — | không có rule earned/payable/paid trong code |
| T16 | not-done | `settlementLabel` | hàm từ chối `PAID` khi không có chứng từ; chưa gắn settlement service |
| T17 | not-done (rules-only) | `exception-items.entity.ts` | workspace cũ giữ nguyên |
| T18 | partial | `DeveloperIntelligencePage.tsx` đọc `data.districts`; mart id 32 ký tự; entitlement trùng `23505` được bỏ qua | `developer.spec.ts` giữ locator. CI `e2e-pr` xanh: heading `Absorption heatmap` và `MRR ước tính`. `mfa.spec.ts` xanh. Local macOS 12 không cài được Chromium của Playwright 1.62 |
| T19–T20 | not-done (rules-only) | `copilotAnswer` | abstain khi không có nguồn; không gắn retrieval |
| T21 | partial | seed MFA chỉ khi `MFA_SEED_SANDBOX=true` | e2e MFA cần `SEED_MFA_TOTP_SECRET` |
| T22 | implemented (tài liệu) | `docs/spec-v1/t22-t24-runbooks.md` | không deploy |
| T23 | implemented (tài liệu) | cùng file | không bật pilot |
| T24 | implemented (tài liệu) | cùng file | không có số liệu pilot |

Các chỗ còn fallback `DEFAULT_TENANT_ID` khi không có user. Vòng này không sửa. Trạng thái `not-done`.

| Chỗ | Lý do |
| --- | --- |
| `portal.controller.ts` buyer/public (`:76`, `:88`, `:101`, `:114`, `:127`) | request ẩn danh vẫn gọi `resolveTenantId` |
| `ai-chat.controller.ts:24` và `:39` | session chat công khai |
| `product-analytics.controller.ts:42` | beacon không có user |
| `sso.controller.ts:62` và `:93` | authorize/login không có user |
| `tenant-branding.controller.ts:20` | brand công khai |
| `payment.controller.ts:30` | checkout công khai |
| `payment-bnpl.controller.ts:52` | webhook đối tác |
| `ekyc.controller.ts:49` | webhook VNPT |
| `cms.controller.ts:25`, `:34`, `:41`, `:46` | trang công khai không gắn tenant từ tài nguyên |
| `simulate-rail.guard.ts:20` | header hoặc tenant mặc định khi user không có tenant |
| `PublicBrandContext.tsx:15` | host không khớp thì dùng tenant seed |
| `useUnitStatusStream.ts:32` | stream gắn cứng tenant seed |
| `BuyerEsignPage.tsx:22` | hợp đồng không phải pilot thì dùng tenant seed |
| `AuthSsoCallbackPage.tsx:33` | JWT không có `tenantId` thì dùng tenant seed |
