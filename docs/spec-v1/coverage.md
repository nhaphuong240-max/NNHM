# SPEC v1.0 — trạng thái sau nhánh spec-v1-implementation

Không phải production-ready. `not-done (rules-only)` nghĩa là có bảng hoặc hàm thuần, chưa gắn Nest service/controller của luồng đó.

`1758130000000` `down()` đảo prefix `v1.{tenant_id}.` trên token đã thêm, rồi `DROP POLICY`, `NO FORCE ROW LEVEL SECURITY`, và `DISABLE ROW LEVEL SECURITY` trên 22 bảng. Không chỉ gỡ policy.

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
| T18 | partial | trang developer | e2e locator đúng nhãn KPI khi API trả dữ liệu |
| T19–T20 | not-done (rules-only) | `copilotAnswer` | abstain khi không có nguồn; không gắn retrieval |
| T21 | partial | seed MFA chỉ khi `MFA_SEED_SANDBOX=true` | e2e MFA cần `SEED_MFA_TOTP_SECRET` |
| T22 | implemented (tài liệu) | `docs/spec-v1/t22-t24-runbooks.md` | không deploy |
| T23 | implemented (tài liệu) | cùng file | không bật pilot |
| T24 | implemented (tài liệu) | cùng file | không có số liệu pilot |
