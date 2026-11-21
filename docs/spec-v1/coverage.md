# SPEC v1.0 — trạng thái sau nhánh spec-v1-implementation

Không phải production-ready. `not-done (rules-only)` nghĩa là có bảng hoặc hàm thuần, chưa gắn Nest service/controller của luồng đó.

`1758130000000` `down()` gỡ prefix `v1.{tenant_id}.` trên mọi token khớp dạng đó, kể cả token tạo sau khi `up()` đã chạy, rồi `DROP POLICY`, `NO FORCE ROW LEVEL SECURITY`, và `DISABLE ROW LEVEL SECURITY` trên 22 bảng. Không chỉ gỡ policy.

| Gói | Trạng thái | File chính | Test |
| --- | --- | --- | --- |
| T03 | partial | `1758130000000-EnableRemainingTenantRls.ts`, `public-token-tenant.guard.ts`, `tenant-rls.interceptor.ts`. `access-review.service.ts` xếp vai trò legacy vào `PENDING`, không cấp `ACTIVE`. MFA step-up và break-glass trả 422 | `scripts/t02-rls-hold-proof.js` trên role `NOSUPERUSER`. Jest superuser không phải bằng chứng G01. `queues a legacy role for a person and does not grant it` |
| T04 | partial | `export-job.service.ts` tạo `REQUESTED` chỉ khi purpose nằm trong allowlist. Allowlist mặc định rỗng. `APPROVED` chỉ khi người duyệt là `FINANCE_ADMIN` và khác người yêu cầu. Payload có `phone` thì phản hồi dùng `maskPhone` | Ma trận vai trò thật và MFA step-up chưa ký. `rejects an export purpose that is not on the signed allowlist` |
| T05 | partial | `assertHoldOrPublish` chạy trước giữ chỗ và trước `PUBLISHED`. `fieldsForPartner` trả căn cho chủ hàng. Tổ chức khác chỉ nhận `unitId` khi có grant `read`/`unit`, không nhận giá hay hồ sơ khách | Chưa thu phí phân bổ. Chưa tự giữ chỗ. Ranh giới pháp nhân thật chưa ký |
| T06 | partial | `price-book.service.ts` `openVersion` chặn khoảng chồng trong cùng tenant và trả 422 khi payload có `tax`, `fee`, `promo`, hoặc `discount`. `1758170000000-PriceWindowExclusion.ts` thêm exclusion constraint cùng tenant và project. Quote chỉ đi `DRAFT` sang `SENT`, `REJECTED`, `EXPIRED` hoặc `SENT` sang `REJECTED`, `EXPIRED`. `ACCEPTED` không đổi. Chỉ `DEVELOPER_ADMIN` | Không có biểu thuế, phí, ưu đãi. Không tự nhận quote. Proof up/down nằm ở `scripts/t02-price-window-proof.js`. `rejects a price window that carries an unsigned tax, fee, or promotion` |
| T07 | partial | `CrmService.createLead` gọi `enqueue`. Review ghi `protectionDays` chỉ khi tenant đã lưu policy. Không có dòng policy thì không điền số ngày. Không gán HOT, không gộp hồ sơ khách | Chưa tự duyệt. Chưa có bước gộp có kiểm soát |
| T08 | partial | `exception-item.service.ts` mở `DISPUTE` trạng thái `OPEN`. Người mở không tự resolve. Tenant khác 404 | Không bịa số giờ SLA. Workspace cũ không đổi |
| T09 | partial | `1758150000000-ActiveHoldUnique.ts`, `docs/t09/active-hold-unique.md` | `scripts/t02-rls-hold-proof.js` ≥50 insert cùng một căn |
| T10 | partial | `payment.service.ts` lấy amount và currency từ server. `vnpay-payment.adapter.ts` từ chối khi sandbox tắt, kể cả URL live | `payment.service.spec.ts`. `rejects a live payment URL until a merchant is signed` |
| T11 | partial | Notary HMAC đã có. `notaryJournalId` ghi một dòng `api_webhook_deliveries`. `NOTARY_LIVE_URL` có giá trị thì webhook từ chối | Cổng thanh toán và công chứng vẫn sandbox. Không gọi nhà cung cấp thật |
| T12 | partial | Duyệt lại cùng một đề xuất trả 409. Đề xuất sau, còn trong phần chưa hoàn, người khác được `CHECKED`. Phí giữ chỗ thì 422. `createRefund` vẫn cần `REFUND_CHECKED` của người khác. Không ghi `PAID` | Cổng sandbox vẫn một lần `SUCCEEDED` mỗi intent. `checks a later partial proposal within the remaining net and rejects a hold fee` |
| T13 | partial | `contract-artifact.service.ts` chỉ ghi `PENDING_REVIEW`. `markProviderSigned` từ chối cả khi thiếu artifact và khi đã có id. Portal cấp token ký cho đúng người mua, đúng contract và tenant | OTP sandbox vẫn có thể ghi `SIGNED` trên hợp đồng cũ. `mints a sign token for the owning buyer and rejects another person or tenant` |
| T14 | partial | `handover-checklist.service.ts` một checklist `OPEN` mỗi booking. Người khác mới `COMPLETE`. Gọi complete lần hai trả 409. `erpPosted` và `receivablePosted` luôn false. `postReceivable` luôn 422 | Không sổ phải thu, không BNPL |
| T15 | partial | `commission-stages.service.ts` tách earned / payable / paid. `recordPaid` trả 422 khi thiếu chứng từ và trả 422 khi đã có chứng từ vì tỷ lệ chưa ký. `paid` luôn `0` | Không đổi số tiền đã lưu |
| T16 | partial | `settlement-label.service.ts` đọc run và trả `NOT_PAID` khi không có chứng từ ngân hàng | Không đổi trạng thái run. Không gọi ngân hàng |
| T17 | partial | `exception-item.service.ts` `listMine` chỉ trả id, severity, status, dueAt của đúng owner và tenant | Workspace cũ không đổi. Không trả payload |
| T18 | partial | `unmeasuredDataBilling` trả `estimatedMrrVnd: null`. `signedDataProductPrice` trả null. Heatmap meta `measured: false`. Chỉ listing `PUBLISHED` được index. Developer shell `noindex` | Heatmap/MRR chưa đo pilot. Không có đơn giá data product. Locator e2e giữ heading. Local macOS 12 không cài Chromium Playwright 1.62 |
| T19–T20 | partial | Câu có nguồn ghi `citations` là id căn và dự án đã lưu. `retrievalCitations` trả mảng rỗng. Không có tên dự án thì `không đủ dữ liệu` và không có citation. Mẫu investment bỏ cụm “giá trị” | Không có chỉ mục retrieval riêng. Không tự đánh pass |
| T21 | partial | `mfaSandboxSeedAllowed` chỉ đúng khi `NODE_ENV` là `development` hoặc `test` và `MFA_SEED_SANDBOX` đúng `true`. Production, staging, và env rỗng bị từ chối | e2e CI vẫn cần tên biến `SEED_MFA_TOTP_SECRET`. Không ghi giá trị secret |
| T22 | partial | `scripts/t22-restore-drill.js` dùng `pg_dump --inserts` rồi nạp SQL giữa hai database thử `wereal_t22_src` và `wereal_t22_dst` trên cùng server với `wereal_t02`. Dòng `SET transaction_timeout` và lệnh `\\` bị bỏ vì client CI mới hơn Postgres 16. Log ghi `restore_elapsed_ms`, `rpo=unmeasured`, `rto_signed=false`. Ba cờ sandbox tắt thì `sandboxFlowWhenDisabled` trả `NOT_PAID` | Không restore database thật. Không xóa `wereal_t02`. RPO chưa đo vì không có WAL. Thời gian restore không phải RTO đã ký |
| T23 | partial | `reviewPilotChecklist` chỉ nhận `SYNTHETIC`, từ chối PII, thu tiền và cờ pilot. `openSyntheticDrill` lưu `class: SYNTHETIC` và không chép field cá nhân | Chưa tạo tài khoản thật. Chưa bật pilot |
| T24 | partial | `measureDrillKpis` để ô không có số là `measured: false`. `recommendation` luôn `none`, kể cả khi mọi ô đã có số | Không đề xuất expand, hold, hay stop. Số đếm trên database thử không phải kết quả pilot |

## G01–G12

Gate có định nghĩa trong repo thì job CI hiện có đã chạy bằng chứng đó. Không thêm job mới để tự đánh pass. Gate cần người ký vẫn là chờ ký. Gate không có định nghĩa trong repo là undefined.

| Gate | Trạng thái | Bằng chứng tự động | Chờ ký |
| --- | --- | --- | --- |
| G01 | chờ ký | Job `t02-isolated-db` chạy `scripts/t02-harness.sh`, trong đó `scripts/t02-rls-hold-proof.js` và `scripts/t02-rls-app-proof.js`. Test grant trong `spec-target.rules.spec.ts` không phải bằng chứng RLS. `docs/spec-v1/gate-evidence.md` chỉ liệt kê job | Pen-test người ký. Job xanh không thành pass |
| G02 | chờ ký | Cùng job, proof ≥50 insert một căn, một hold active. Cùng file bằng chứng | Không dùng biến JavaScript làm bằng chứng. Job xanh không thành pass |
| G03 | undefined | Không có định nghĩa G03 trong repo | Không bịa check |
| G04 | undefined | Không có định nghĩa G04 trong repo | Không bịa check |
| G05 | chờ ký | Job `api` chạy Jest `settlement-label.service.spec.ts`. `settlement-label.service.ts` trả `NOT_PAID` khi không có chứng từ. `docs/spec-v1/gate-evidence.md` chỉ liệt kê job | Chữ ký đối soát. Job xanh không thành pass |
| G06 | partial, chờ ký | Job `api` chạy `refund-check.service.spec.ts` và `refund.service.spec.ts`. Người đề xuất không tự duyệt. Đề xuất sau còn trong hạn mức thì người khác được kiểm. Phí giữ chỗ bị từ chối | Cổng sandbox vẫn một lần `SUCCEEDED` mỗi intent |
| G07 | undefined | Không có định nghĩa G07 trong repo | Không bịa check |
| G08 | undefined | Không có định nghĩa G08 trong repo | Không bịa check |
| G09 | partial, chờ ký | Job `api` chạy `export-job.service.spec.ts`. Allowlist rỗng thì purpose bị từ chối. Người duyệt phải là `FINANCE_ADMIN` và khác người yêu cầu. Field `phone` đi qua `maskPhone` | Danh sách mục đích thật chưa ký |
| G10 | undefined | Không có định nghĩa G10 trong repo | Không bịa check |
| G11 | undefined | Không có định nghĩa G11 trong repo | Không bịa check |
| G12 | undefined | Không có định nghĩa G12 trong repo | Không bịa check |

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
| BuyerEsignPage | done | `BuyerEsignPage.tsx` lấy token ở portal rồi gửi `X-Contract-Sign-Token` cho sign-session và sign. Portal chỉ cấp token sau `assertBookingOwnedBySeeker`. Job `e2e-pr` chạy `e2e/buyer-esign.spec.ts` trên API thật | CI `444f5e8` job `e2e-pr`: `buyer-esign owning buyer gets a token and opens the sign session` và `buyer-esign rejects sign-session when the contract sign token is missing` xanh |
| AuthSsoCallbackPage | done | `AuthSsoCallbackPage.tsx:37` | không ghi session khi JWT thiếu tenant |
| AuthLoginPage | done | `AuthLoginPage.tsx:117`, `:170` | form không còn chọn sẵn `ten_dev_01` |
| search index worker | done | `search-index.worker.ts:15` luôn index `ten_dev_01` từ map host chính thức, kể cả khi cờ tắt. Không đọc `DEFAULT_TENANT_ID`. Môi trường không có tenant này thì index rỗng | e2e `search page loads listings for the registered beachhead host` |
| host beachhead | done | API `registered-host-tenant.ts:9` và bản chép trong web `apps/web/src/lib/registered-host-tenant.ts:7`: `ngoinhahomnay.vn` và `www.ngoinhahomnay.vn` → `ten_dev_01`. Đây là tenant beachhead đã đăng ký theo host, không phải fallback. Web không import xuyên app vì image web chỉ copy `apps/web`. Bằng chứng: `scripts/uat-phase-b-beachhead.sh:5-6`, `database.seed.service.ts:905`, `scripts/phase-a-enable-notify-prod.sh:27`, `docs/specs/NNHN-SRS-Implementation-Plan.md:490` | `resolves the beachhead hosts and rejects lookalikes when NODE_ENV=production and the flag is off`, cùng test với `staging`, và `keeps the web host map equal to the API host map`. Web: `resolves the registered beachhead hosts after normalization` |
| host pilot | done | `registered-host-tenant.ts` `PILOT_HOST_TENANT_MAP`: `portal.thanglong-dev.vn` và `thanglong.wereal.vn` → `ten_pilot_cdt_01`, khớp đúng host, không còn suffix `.wereal.vn` | brand test `portal.thanglong-dev.vn` |
| host dev | done | `resolve-tenant-from-host.ts` `DEV_HOST_TENANT_MAP`: `localhost`, `sunrise.wereal.vn`, `app.wereal.vn` chỉ khi `ALLOW_DEFAULT_TENANT` và `NODE_ENV` là `development` hoặc `test`. `sunrise.wereal.vn` và `app.wereal.vn` không nằm trong map chính thức | cùng test host: production/staging không cờ thì 404 |
| proof RLS | done | `scripts/t02-rls-app-proof.js` chèn `mem_t02_seed` | tenant B không thấy dòng `ten_dev_01` |

Chuỗi `ten_dev_01` còn lại, không phải fallback của request không có user:

| Chỗ | Trạng thái | Lý do |
| --- | --- | --- |
| `database.seed.service.ts` | không đổi | định nghĩa seed |
| migration `175807`, `175810`, `175811`, `175812` | không đổi | dữ liệu migration đã nằm trên `main` |
| `*.spec.ts` và e2e `developer.spec.ts`, `ops.spec.ts`, `mfa.spec.ts` | không đổi | fixture gọi tenant tường minh |
| `anchor-tenant.service.ts:60`, `:165`, `:341`, `:371` | not-done | catalog anchor synthetic và nhãn GMV của đúng tenant seed, không phải nguồn tenant của request ẩn danh |
| `public-tenant-token.ts:37` | done | comment; catalog token không còn đổ về seed |
| `modules/identity/README.md:33`, `modules/marketing/README.md:24`, `modules/meta/README.md:36`, `modules/zalo/README.md:85` | not-done | ví dụ curl và bảng seed cho người đã đăng nhập, không phải đường runtime khi không có user |
| Tách id beachhead khỏi `ten_dev_01` | not-done | host chính thức đang trỏ đúng id seed vì dữ liệu beachhead nằm ở id đó. PR riêng, có migration dữ liệu, mới được đổi id. Không làm trong PR này |
| Buyer ownership | done | `portal.controller.ts` gọi `requireOwnedBuyerBooking` trước notify stub, BNPL và sign-session | `requires the seeker phone on the booking lead before BNPL, notify, or sign-session` |
| Contract sign token | done | `booking-contract.controller.ts` `signedContractTenant`. Token gắn `buyerId`, không dùng `JWT_SECRET` khi thiếu `CONTRACT_SIGN_SECRET` | `rejects a contract sign token for another contract or after it expires`. `skips JWT for a valid contract sign token and does not reuse JWT_SECRET` |
| Notary HMAC | done | `notary-connector.controller.ts` `NOTARY_WEBHOOK_SECRET` | webhook test từ chối chữ ký sai bằng `UnauthorizedException` |
| Stream theo căn | done | `stream.controller.ts` trả 422 khi user đã đăng nhập mà thiếu `unitId`, rồi mới gọi `subscribeUnits` | `returns 422 when a signed-in user omits unitId and subscribes when unitId is present` |
| Audit chưa xác thực | done | `unscoped-audit-limit.ts` tối đa 8 lần mỗi phút theo IP hoặc nguồn và theo action. Map có TTL và tối đa 256 key. Vượt ngưỡng thì bỏ qua, không ghi thêm dòng | `stops unauthenticated audit inserts when the booking id changes`. `caps the unauthenticated audit map and drops expired keys` |
| SSO provider | done | `public-tenant-lookup.ts` `TENANT_LOOKUP_SQL.sso_provider` chỉ `tenant_config_versions` | `reads an SSO provider from tenant config and not from audit events` |
| Anchor seed | done | `anchor-tenant.service.ts` `ANCHOR_TENANT_SEEDS` chỉ là catalog seed. Dashboard không còn coi `ten_dev_01` là GMV sống | không còn nhánh runtime `tenantId === 'ten_dev_01'` |

Deploy khi đưa host beachhead ra môi trường thật:

- Proxy đứng trước API phải giữ nguyên header `Host`. Repo chưa có proxy tin cậy và API không đọc `X-Forwarded-Host`.
- Cần các biến `BNPL_WEBHOOK_SECRET`, `EKYC_WEBHOOK_SECRET`, `CONTRACT_SIGN_SECRET`, `NOTARY_WEBHOOK_SECRET`, và `SSO_STATE_SECRET` hoặc `JWT_SECRET` dài từ 16 ký tự. Không ghi giá trị secret vào repo.

Còn mở, không làm trong lượt này:

- Tách id beachhead khỏi `ten_dev_01`.
