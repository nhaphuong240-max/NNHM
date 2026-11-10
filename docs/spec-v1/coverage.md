# SPEC v1.0 — trạng thái sau nhánh spec-v1-implementation

Không phải production-ready. `implemented` nghĩa là hành vi đã có test hoặc migration chạy được trên database thử. `partial` nghĩa là đã có quy tắc hoặc bảng, chưa phủ mọi đường cũ.

| Gói | Trạng thái | File chính | Test |
| --- | --- | --- | --- |
| T03 | implemented | `1758130000000-EnableRemainingTenantRls.ts`, `public-tenant-token.ts`, `spec-target.rules.ts` | `rls-isolation.spec.ts`, `spec-target.rules.spec.ts` |
| T04 | partial | `evidence-records.entity.ts`, `export-jobs.entity.ts` | mask và export trong `spec-target.rules.spec.ts` |
| T05 | partial | `distribution-agreements.entity.ts`, `unit-allocations.entity.ts` | `allocationAllowsPlacement` |
| T06 | partial | `price-book-versions.entity.ts`, `quotes.entity.ts` | overlap và quote bất biến |
| T07 | partial | `customers.entity.ts`, `dedup-reviews.entity.ts` | HOT lead đã có từ T02; dedup là hàng đợi |
| T08 | partial | `exception-items.entity.ts` | SLA/tranh chấp cũ giữ nguyên |
| T09 | implemented | `1758150000000-ActiveHoldUnique.ts` | 50 claim trong một process; unique trên database thử |
| T10 | partial | `payment.service.ts`, `deposit-agreements.entity.ts` | `payment.service.spec.ts` |
| T11 | partial | webhook chữ ký cũ | sandbox không được ghi `PAID` trong rule |
| T12 | partial | `refundWithinNet` | chưa tách maker/checker trên `RefundService` |
| T13 | partial | `contract-artifacts.entity.ts` | chưa ép `PENDING_REVIEW` trên luồng ký cũ |
| T14 | partial | `handover-checklists.entity.ts` | không làm ERP |
| T15 | partial | rule earned/payable/paid | settlement cũ chưa đổi nhãn toàn bộ |
| T16 | partial | `settlementLabel` | mock không được gọi là `PAID` trong rule |
| T17 | partial | `exception-items.entity.ts` | workspace cũ giữ nguyên |
| T18 | partial | trang developer | e2e chưa chạy lại trong phiên này |
| T19–T20 | partial | `copilotAnswer`, guardrail cũ | abstain khi không có nguồn; không có benchmark |
| T21 | partial | seed MFA sau user pilot | Jest API pass; e2e/contract/mobile chưa xanh |
| T22 | implemented (tài liệu) | `docs/spec-v1/t22-t24-runbooks.md` | không deploy |
| T23 | implemented (tài liệu) | cùng file | không bật pilot |
| T24 | implemented (tài liệu) | cùng file | không có số liệu pilot |
