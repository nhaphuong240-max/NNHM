# Kế hoạch hoàn thiện SPEC v1.0

Đọc trước khi sửa code. Base `4dc65bb3aeb64845ddfc49799ea1717be2b07e20` (`main` sau merge PR #4). File SPEC gốc không có trong repo. Bảng này lấy từ `docs/spec-v1/coverage.md`, `docs/spec-working-assumptions.md`, `apps/api/src/modules/spec-target/spec-target.rules.ts`, và script G01/G02. Không bịa gate chưa được đặt tên trong code.

Không production-ready. D01–D12 chưa có chữ ký.

## T01–T24

| Mã | Trạng thái | Bằng chứng | Còn thiếu | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T01 | not-done trong tree này | Không có artifact T01 trong repo. Báo cáo delta cũ không nằm ở SHA này | Không làm lại báo cáo baseline trong PR này | Không |
| T02 | done (schema đã merge) | `1738339100000-BaselineCoreSchema.ts`, `1738339201000-EnableTenantRls.ts`, `scripts/t02-harness.sh` | Không sửa migration đã có trên main | T01 |
| T03 | partial | `coverage.md:9`. RLS còn lại `1758130000000`. Bind trong `tenant-rls.service.ts` | Jest superuser không phải G01. Một số route ẩn danh còn nợ ở bước 1 | T02 |
| T04 | partial | `export-job.service.ts` dùng `exportJobAllowed`. Người yêu cầu không tự duyệt. Không xuất dòng | `maskPhone` chưa gắn. Chưa audit append-only cho job | T03, D02, D03 |
| T05 | partial | `allocation.service.ts` `grant` / `revoke` / `placement` dùng `allocationAllowsPlacement` | Chỉ tenant đang là `stockOwnerTenantId`. Chưa gán căn sang booking | T03, D01 |
| T06 | partial | `price-book.service.ts` `openVersion` dùng `priceWindowsOverlap`. Quote `ACCEPTED` bị chặn ở `changeQuoteStatus` | Chưa có biểu thuế, phí, ưu đãi. Vai trò ghi tạm là `DEVELOPER_ADMIN` | T03, D04 |
| T07 | partial | `dedup-review.service.ts` `enqueue` / `markDistinct`. HOT không bị gán trong luồng này | Chưa đổi số ngày bảo vệ. Không gộp dữ liệu khách | T03, D05 |
| T08 | partial | `exception-item.service.ts` `open` / `resolve`. Người mở không tự đóng | Không bịa hạn SLA. T17 workspace chưa gắn | T07 |
| T09 | partial | `1758150000000-ActiveHoldUnique.ts`, `docs/t09/active-hold-unique.md:7` | Giữ unique toàn cục theo `unit_id`. Không thêm unique `(tenant_id, unit_id)` | T02 |
| T10 | partial | `payment.service.ts` lấy amount/currency từ server | Chỉ sandbox. Không gọi cổng thật | T09, D07 |
| T11 | partial | `notary-connector.controller.ts` HMAC và `recordDeliveryOnce` | Replay thanh toán đã có từ trước. Không gọi cổng thật | T10, D07 |
| T12 | partial | `refund-check.service.ts` dùng `refundWithinNet`. Người đề xuất không tự duyệt | Luồng `createRefund` sandbox chưa tách. Không bịa phí | T10, D06 |
| T13 | partial | `contract-artifact.service.ts` giữ `PENDING_REVIEW`. Token ký ở `contract-sign-token.ts` | OTP sandbox vẫn có thể ghi `SIGNED`. Không ghi `EXECUTED` | T10, D08 |
| T14 | partial | `handover-checklist.service.ts` không ghi ERP | Không sổ phải thu. Không đổi BNPL | T13, D09 |
| T15 | partial | `commission-stages.service.ts` `stageCommissionAmount`. Không đổi rate | `paid` luôn 0 cho tới khi có chứng từ | T10, D10 |
| T16 | partial | `settlement-label.service.ts` dùng `settlementLabel` với chứng từ null | Run `COMPLETED` vẫn `NOT_PAID` | T15, D10 |
| T17 | partial | `exception-item.service.ts` `listMine` | Workspace cũ không bị thay. Không trả payload | T08 |
| T18 | partial | `data-intelligence.service.ts` `unmeasuredDataBilling`. `listingIsPubliclyIndexable` chỉ `PUBLISHED`. `DeveloperShell` noindex | Không có số KPI pilot. Không bịa đơn giá data product | T03, D11 |
| T19–T20 | partial | `copilot.service.ts` abstain khi project không có tên. Listing copy bỏ dòng giá | Chưa retrieval. Mẫu investment còn cụm “giá trị” | D12 |
| T21 | partial | Seed MFA chỉ khi `MFA_SEED_SANDBOX=true` | Không dùng secret thật | T03 |
| T22 | implemented (tài liệu) | `docs/spec-v1/t22-t24-runbooks.md:5-12` | Không deploy, không restore DB thật | D01–D12 chưa ký |
| T23 | implemented (tài liệu) | cùng file `:14-21` | Checklist, chưa bật pilot | T22 |
| T24 | implemented (tài liệu) | cùng file `:23-32` | KPI chưa đo. Không tự đánh pass | T23 |

## G01–G12

| Gate | Trạng thái | Bằng chứng | Còn thiếu |
| --- | --- | --- | --- |
| G01 | partial | `scripts/t02-rls-hold-proof.js:73` và `scripts/t02-rls-app-proof.js:3` trên DB cô lập. Test `G01 denies a grant...` trong `spec-target.rules.spec.ts:22` chỉ là hàm grant, không phải RLS | Cần người ký cho pen-test. Script CI là bằng chứng tự động hiện có |
| G02 | partial | `scripts/t02-rls-hold-proof.js:105`, ≥50 insert một căn | Không dùng test biến JavaScript làm bằng chứng |
| G03 | not-done | Không có định nghĩa G03 trong repo | Chờ SPEC hoặc chữ ký. Không tự bịa |
| G04 | not-done | Không có định nghĩa G04 trong repo | Chờ SPEC hoặc chữ ký |
| G05 | not-done (rules-only) | `spec-target.rules.spec.ts:78` nhãn sandbox không thành `PAID` | Chưa gắn service thanh toán/đối soát |
| G06 | not-done (rules-only) | Cùng test G05 | Chưa tách maker/checker hoàn tiền |
| G07 | not-done | Không có định nghĩa G07 trong repo | Chờ SPEC hoặc chữ ký |
| G08 | not-done | Không có định nghĩa G08 trong repo | Chờ SPEC hoặc chữ ký |
| G09 | not-done (rules-only) | `spec-target.rules.spec.ts:90` | Chưa gắn export service |
| G10 | not-done | Không có định nghĩa G10 trong repo | Chờ SPEC hoặc chữ ký |
| G11 | not-done | Không có định nghĩa G11 trong repo | Chờ SPEC hoặc chữ ký |
| G12 | not-done | Không có định nghĩa G12 trong repo | Chờ ký. Không tự đánh pass |

## Nợ bước 1, trước khi nối các gói rules-only

- Người mua phải sở hữu booking cho sign-session, BNPL, notifications/stub.
- `contracts/:id`, sign-session, sign: bỏ `@Public`. Chỉ token ký có hạn, đúng contract và tenant.
- Notary webhook cần HMAC.
- Stream chỉ phát căn được yêu cầu.
- Giới hạn tần suất ghi audit khi chưa xác thực.
- SSO provider đọc bảng cấu hình, không đi qua `audit_events`.
- `anchor-tenant.service.ts:60`, `:165`, `:341`, `:371`: gỡ khỏi runtime hoặc ghi rõ chỉ dùng cho seed.
- `contract-gate`: example `paths./buildings.get` phải khớp schema. Không tắt gate.

## Cách làm tiếp

Mỗi task một commit `Txx:`. Schema mới chỉ bằng migration mới, có `down()` và test up/down trên DB cô lập. Chỗ phụ thuộc D01–D12 đặt sau cờ, mặc định tắt hoặc chặt nhất, và ghi vào `docs/spec-v1/decisions-pending.md`.
