# Khóa ngoại của 15 bảng spec-target

`ON DELETE RESTRICT`. Không có `IF NOT EXISTS`.

| Cột | Khóa ngoại |
| --- | --- |
| `scoped_grants.project_id` | `projects` |
| `distribution_agreements.project_id` | `projects` |
| `distribution_agreements.stock_owner_tenant_id` | `tenants` |
| `unit_allocations.agreement_id` | `distribution_agreements` |
| `unit_allocations.unit_id` | `units` |
| `price_book_versions.project_id` | `projects` |
| `quotes.price_book_id` | `price_book_versions` |
| `quotes.unit_id` | `units` |
| `dedup_reviews.customer_id` | `customers` |
| `dedup_reviews.lead_id` | `leads` |
| `deposit_agreements.booking_id` | `bookings`, unique `(tenant_id, booking_id)` |
| `contract_artifacts.booking_id` | `bookings` |
| `handover_checklists.booking_id` | `bookings` |

Không có bảng tổ chức để tham chiếu, nên các cột sau không có khóa ngoại: `org_memberships.user_id`, `org_memberships.org_id`, `scoped_grants.grantee_org_id`, `access_review_items.user_id` (rộng hơn `users.id` và có thể chưa có dòng user), `evidence_records.actor_id`, `export_jobs.approved_by`, `distribution_agreements.partner_org_id`, `exception_items.owner_id`.

`scoped_grants` và `access_review_items` chỉ unique khi `status = 'ACTIVE'`, để giữ lịch sử thu hồi. `export_jobs` và `exception_items` không unique theo purpose hay severity.
