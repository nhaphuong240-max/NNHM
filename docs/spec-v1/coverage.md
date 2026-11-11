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

Fallback `DEFAULT_TENANT_ID` khi không có user. Đã đóng trên nhánh `tenant-fallback-close`. Không production-ready. Các gói T03–T24 phía trên không đổi.

| Chỗ | Trạng thái | File | Test |
| --- | --- | --- | --- |
| `resolveTenantId` | done | `resolve-tenant-id.ts:26` chỉ trả seed khi `ALLOW_DEFAULT_TENANT=true` và `NODE_ENV` là `development` hoặc `test`. Header không phải nguồn | `resolveTenantId does not treat the header or the seed tenant as a source` |
| Cờ boot | done | `default-tenant-flag.ts:7`, gọi ở `main.ts:8` | `refuses to boot when ALLOW_DEFAULT_TENANT is set in production, staging, or an empty NODE_ENV` |
| portal buyer/public | done | `portal.controller.ts:60`, `:74`, `:86`, `:98`, `:110`, `:121`, `:136` | `portal buyer routes 404 without a host or booking and 403 on a mismatched header` |
| cms | done | `cms.controller.ts:33`, `:47`, `:62` | `cms and public brand do not read the seed tenant without a registered host or slug` |
| tenant-branding | done | `tenant-branding.controller.ts:24` | cùng test cms/brand |
| ai-chat | done | `ai-chat.controller.ts:28`, `:51` | `anonymous chat and analytics require a project or public token` |
| product-analytics | done | `product-analytics.controller.ts:45` | cùng test chat/analytics |
| sso | done | `sso.service.ts:67`, `:337`; controller `:62`, `:92` | `sso authorize and login take the tenant from the stored provider` |
| payment checkout | done | `payment.controller.ts:32` | `public checkout, contract sign, search detail, and the unit stream use the stored row` |
| payment webhook | done | `payment-webhook.service.ts:76` lấy tenant từ intent đã lưu | `uses the stored payment intent tenant when the payload omits tenantId`; `rejects a payload tenant that does not match the stored payment intent`; `returns 404 when the payment intent is not stored` |
| mock complete | done | `mock-payment-complete.controller.ts:37` | cùng lookup payment intent; không còn `SEED_TENANT_ID` |
| bnpl webhook | done | `payment-bnpl.controller.ts:69` | `bnpl, ekyc, and notary webhooks reject a missing record and do not use the seed tenant` |
| ekyc webhook | done | `ekyc.controller.ts:71` | cùng test webhook |
| notary webhook | done | `notary-connector.controller.ts:30` | cùng test webhook |
| cms/search/stream/hợp đồng | done | `search.controller.ts` `publicTenant`; `stream.controller.ts:32`; `booking-contract.controller.ts:20` | cùng test checkout/stream |
| simulate rail | done | `simulate-rail.guard.ts:27` | `simulate rail requires a user tenant or one stored externalRef` |
| PublicBrandContext | done | `PublicBrandContext.tsx:15` hiện lỗi khi host không đăng ký | không còn `DEFAULT_TENANT_ID` trên web |
| useUnitStatusStream | done | `useUnitStatusStream.ts:36` chỉ mở khi có `unitId` và tenant từ API | `stream.controller.ts:32` trong test checkout/stream |
| BuyerEsignPage | done | `BuyerEsignPage.tsx:41` | API `booking-contract.controller.ts:93` trong test checkout/stream |
| AuthSsoCallbackPage | done | `AuthSsoCallbackPage.tsx:37` | không ghi session khi JWT thiếu tenant |
| AuthLoginPage | done | `AuthLoginPage.tsx:117`, `:170` | form không còn chọn sẵn `ten_dev_01` |
| search index worker | done | `search-index.worker.ts:20` bỏ qua seed khi cờ tắt | cùng cờ `allowDefaultTenant` |
| host seed | done | `resolve-tenant-from-host.ts:20` chỉ map `localhost` / `ngoinhahomnay.vn` khi cờ bật | brand test từ chối `localhost` |
| proof RLS | done | `scripts/t02-rls-app-proof.js` chèn `mem_t02_seed` | tenant B không thấy dòng `ten_dev_01` |

Chuỗi `ten_dev_01` còn lại, không phải fallback của request không có user:

| Chỗ | Trạng thái | Lý do |
| --- | --- | --- |
| `database.seed.service.ts` | không đổi | định nghĩa seed |
| migration `175807`, `175810`, `175811`, `175812` | không đổi | dữ liệu migration đã nằm trên `main` |
| `*.spec.ts` và e2e `developer.spec.ts`, `ops.spec.ts`, `mfa.spec.ts` | không đổi | fixture gọi tenant tường minh |
| `anchor-tenant.service.ts:60`, `:165`, `:341`, `:371` | not-done | catalog anchor synthetic và nhãn GMV của đúng tenant seed, không phải nguồn tenant của request ẩn danh |
| `public-tenant-token.ts:37` | done | comment; catalog token không còn đổ về seed |
