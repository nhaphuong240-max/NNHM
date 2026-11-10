# T02 bước 1 — Quyết định lệch schema

Trạng thái: **đã duyệt**, kèm điều chỉnh ngày 2026-11-10. Chưa có migration, chưa chạy database. Các câu `SELECT` ở mục runbook chỉ để đọc, không phải DDL.

Nhánh: `t02-baseline-schema`, tách từ `t02-safety-gates` tại `dd04be7`. PR #1 chưa merge vào `main`. Sau khi PR #1 merge, rebase nhánh này lên `main` rồi mới làm bước 2.

Nguồn lệch: `.tools/schema-drift/drift.json`, so 79 entity với 14 migration hiện có. File đó ghi 31 unique, 37 index và 8 khóa ngoại. Bảng dưới đây quyết định từng dòng đó.

Công cụ so sánh chỉ đọc decorator `@Index` và `@Unique`. Nó không thấy `unique: true` gắn trên `@Column`. Ba unique token và `users.email` thuộc nhóm này, được ghi ở cuối để baseline không bỏ sót.

## Unique chỉ có trong migration

Giữ ràng buộc của migration. Không nới lỏng.

| Bảng | Cột | Nguồn đúng | Việc với entity |
| --- | --- | --- | --- |
| `geo_areas` | `(tenant_id, slug)` | migration `1758070000000-P1Wave.ts` | Thêm `@Unique(['tenantId', 'slug'])`. Entity hiện không có unique. |
| `cms_pages` | `(tenant_id, slug)` | cùng migration | Thêm `@Unique(['tenantId', 'slug'])`. Entity hiện không có unique. |
| `dsr_share_links` | `(token)` | migration, và entity đã có `@Column({ unique: true })` | Giữ unique. Không thêm decorator thứ hai. Dòng lệch là do công cụ không đọc `unique` trên cột. |
| `open_day_rsvps` | `(qr_token)` | migration, và entity đã có `@Column({ name: 'qr_token', unique: true })` | Giữ unique. Không thêm decorator thứ hai. |
| `walk_in_galleries` | `(token)` | migration `1758110000000-PhaseC.ts`, và entity đã có `@Column({ unique: true })` | Giữ unique. Không thêm decorator thứ hai. |

`token` và `qr_token` là `NOT NULL`. Một token công khai chỉ được trỏ tới một dòng.

## Unique chỉ có trên entity

Nguồn đúng là entity. Baseline phải tạo đủ 26 ràng buộc. Sáu ràng buộc chống trùng tiền lấy đúng cột trên entity, không thêm cột.

PostgreSQL coi mỗi `NULL` trong unique là khác nhau. Key `NULL` không bị coi là trùng. Key khác `NULL` thì không được lặp theo các cột dưới đây.

| Bảng | Ràng buộc | Null |
| --- | --- | --- |
| `bookings` | `UNIQUE (tenant_id, idempotency_key)` | `idempotency_key` nullable |
| `payment_intents` | `UNIQUE (tenant_id, idempotency_key)` | `idempotency_key` nullable |
| `payment_webhook_events` | `UNIQUE (event_id)` | `event_id` NOT NULL. Không thêm cột provider. |
| `refunds` | `UNIQUE (tenant_id, idempotency_key)` | `idempotency_key` nullable |
| `ledger_journals` | `UNIQUE (webhook_event_id)` | `webhook_event_id` NOT NULL |
| `commission_snapshots` | `UNIQUE (tenant_id, booking_id)` | cả hai cột NOT NULL |

Rủi ro đã biết, không đưa vào baseline: `bookings` chưa có partial unique `(tenant_id, unit_id) WHERE status IN ('RESERVED', 'DEPOSITED')`. Hai booking cùng một căn ở trạng thái đang giữ chỗ chỉ bị chặn bởi Redis lock và `unit.status`. Baseline không thêm ràng buộc này.

Hai mươi unique còn lại cũng lấy từ entity và đưa vào baseline:

| Bảng | Cột |
| --- | --- |
| `agency_applications` | `(agency_tenant_id, project_id, distribution_policy_id)` |
| `agent_wau_daily` | `(tenant_id, report_date)` |
| `anchor_tenant_profiles` | `(tenant_id)` |
| `api_partner_keys` | `(tenant_id, key_hash)` |
| `commission_policies` | `(tenant_id, project_id, version)` |
| `data_mart_daily` | `(tenant_id, report_date, project_id)` |
| `data_product_entitlements` | `(tenant_id, product_code)` |
| `developer_trust_scores` | `(tenant_id, project_id)` |
| `distribution_policies` | `(tenant_id, project_id, version)` |
| `kyc_profiles` | `(tenant_id, subject_type, subject_id)` |
| `leads` | `(tenant_id, idempotency_key)` |
| `meta_lead_events` | `(leadgen_id)` |
| `meta_page_bindings` | `(page_id)` |
| `mobile_devices` | `(tenant_id, push_token)` |
| `reconciliation_reports` | `(tenant_id, report_date)` |
| `sms_deliveries` | `(tenant_id, source_type, source_id)` khi `source_id IS NOT NULL` |
| `tenant_config_versions` | `(tenant_id, domain, entity_id, version)` |
| `zalo_lead_events` | `(msg_id)` |
| `zalo_oa_bindings` | `(oa_id)` |
| `zalo_zns_deliveries` | `(tenant_id, source_type, source_id)` khi `source_id IS NOT NULL` |

`sms_deliveries` và `zalo_zns_deliveries` giữ nguyên unique có điều kiện của entity: `(tenant_id, source_type, source_id) WHERE "source_id" IS NOT NULL`. Không đổi thành unique đầy đủ. Nhiều dòng `source_id` null vẫn được phép.

`users.email` giữ `UNIQUE (email)` đúng `@Column({ unique: true })` trên entity, dù `drift.json` không liệt kê dòng này. Đây là unique toàn hệ thống như code hiện tại.

Câu hỏi mở D01/D02: `users.email` nên unique toàn hệ thống, hay unique theo tenant `(tenant_id, email)`? Baseline chưa đổi phạm vi. Chờ quyết định riêng trước khi thu hẹp hoặc nới ràng buộc.

## Index

Ba index trong migration rộng hơn entity vì có thêm `created_at`. Giữ bản rộng. Entity sau này bỏ index hẹp và khai báo đúng bộ cột của migration. Không giữ cả hai, vì index hẹp bị index rộng bao phủ.

| Bảng | Giữ | Bỏ |
| --- | --- | --- |
| `ai_lead_copilot_drafts` | `(tenant_id, lead_id, created_at)` từ `1758080000000-P2Wave.ts` | `(tenant_id, lead_id)` trên entity |
| `analytics_events` | `(tenant_id, name, created_at)` từ `1758050000000-P0Beachhead.ts` | `(tenant_id, name)` trên entity |
| `seeker_otp_challenges` | `(tenant_id, phone_normalized, created_at)` từ cùng migration P0 | `(tenant_id, phone_normalized)` trên entity |

Index thứ tư chỉ có trong migration: `walk_in_checkins (tenant_id, gallery_id, checked_in_at)` từ `1758110000000-PhaseC.ts`. Giữ nguyên và thêm `@Index(['tenantId', 'galleryId', 'checkedInAt'])` lên entity. Entity hiện không có index này.

Ba mươi index còn lại chỉ có trên entity. Nguồn đúng là entity. Baseline tạo đúng các cột sau, không thêm cột:

| Bảng | Cột |
| --- | --- |
| `agent_activity_events` | `(tenant_id, user_id, created_at)` |
| `api_partners` | `(tenant_id, name)` |
| `api_webhook_deliveries` | `(tenant_id, partner_id)` |
| `attribution_touchpoints` | `(tenant_id, lead_id)` |
| `bnpl_applications` | `(tenant_id, booking_id)` |
| `bnpl_installments` | `(tenant_id, application_id)` |
| `booking_domain_events` | `(tenant_id, booking_id, occurred_at)` |
| `commission_disputes` | `(snapshot_id)` |
| `commission_entries` | `(snapshot_id)` |
| `commission_entries` | `(settlement_run_id)` |
| `commission_settlement_runs` | `(tenant_id, status)` |
| `consent_ledger_entries` | `(tenant_id, subject_type, subject_id)` |
| `consent_ledger_entries` | `(tenant_id, recorded_at)` |
| `crm_activities` | `(tenant_id, lead_id)` |
| `document_access_logs` | `(tenant_id, document_id, created_at)` |
| `documents` | `(tenant_id, entity_type, entity_id)` |
| `escrow_accounts` | `(tenant_id, booking_id)` |
| `escrow_milestones` | `(tenant_id, account_id)` |
| `escrow_release_events` | `(tenant_id, account_id)` |
| `lead_conversion_events` | `(tenant_id, lead_id)` |
| `lead_conversion_events` | `(tenant_id, event_type)` |
| `lead_scoring_outbox` | `(status, created_at)` |
| `leads` | `(tenant_id, utm_campaign)` |
| `leads` | `(tenant_id, campaign_id)` |
| `ledger_entries` | `(journal_id)` |
| `mobile_devices` | `(tenant_id, user_id)` |
| `search_index_docs` | `(tenant_id)` |
| `search_index_docs` | `(tenant_id, bedrooms)` |
| `search_index_docs` | `(tenant_id, transaction_type)` |
| `search_outbox` | `(status, created_at)` |

`search_index_docs (tenant_id, district)` đã có cả ở entity và migration `1738339203000`. Không phải lệch. Không tạo thêm.

## Khóa ngoại

Tám khóa ngoại chỉ có trên entity. Cả tám cột đều `NOT NULL`. `RESTRICT` chặn xóa cha khi còn con. `CASCADE` xóa con theo cha. Ba khóa đã ghi `onDelete: 'CASCADE'` trên entity thì giữ đúng giá trị đó.

| Bảng con | Cột | Bảng cha | `ON DELETE` | Lý do |
| --- | --- | --- | --- | --- |
| `projects` | `tenant_id` | `tenants` | `RESTRICT` | Xóa tenant không được kéo theo dự án. |
| `users` | `tenant_id` | `tenants` | `RESTRICT` | Xóa tenant không được kéo theo tài khoản. |
| `units` | `project_id` | `projects` | `RESTRICT` | Căn còn giá và có thể đang được booking. Xóa dự án phải dừng khi còn căn. |
| `listings` | `unit_id` | `units` | `RESTRICT` | Listing bắt buộc gắn một căn. Xóa căn phải dừng khi còn listing. |
| `listing_media` | `listing_id` | `listings` | `CASCADE` | Dòng media không tồn tại độc lập. `@ManyToOne` đã thêm `{ onDelete: 'CASCADE' }`. Khóa này không xóa file trong object storage. |
| `api_partner_keys` | `partner_id` | `api_partners` | `CASCADE` | Giữ `onDelete: 'CASCADE'` sẵn có. Key hết hiệu lực khi partner bị xóa. |
| `bnpl_installments` | `application_id` | `bnpl_applications` | `RESTRICT` | Đổi decorator từ `CASCADE` sang `RESTRICT`. Xóa hồ sơ BNPL phải dừng khi còn kỳ trả. |
| `escrow_milestones` | `account_id` | `escrow_accounts` | `RESTRICT` | Đổi decorator từ `CASCADE` sang `RESTRICT`. Xóa tài khoản escrow phải dừng khi còn mốc. |

Chỗ đang xóa dòng, đọc trong `apps/api/src`:

| Service | Việc xóa | Ảnh hưởng của `RESTRICT` |
| --- | --- | --- |
| `payment-bnpl.service.ts` `handlePartnerWebhook` | Khi webhook `APPROVED`, xóa các `bnpl_installments` của hồ sơ rồi tạo lại lịch. Không xóa `bnpl_applications`. | Không đụng cha. `RESTRICT` không chặn đường này. |
| Không có service | Không thấy lệnh xóa `bnpl_applications` hay `escrow_accounts`. | Chưa có đường xóa cha để `RESTRICT` chặn. |
| `listing-media.service.ts` | Xóa một dòng `listing_media` theo id. Không xóa `listings`. | `CASCADE` chỉ chạy khi listing cha bị xóa. Đường xóa media hiện tại xóa đúng dòng con. |
| `golden-record.service.ts` `deleteProject` | Xóa `projects` sau khi đếm và từ chối nếu còn unit. | `units.project_id` là `RESTRICT`. Service đã chặn trước khi còn căn. |

`BnplApplicationEntity` và `EscrowAccountEntity` vẫn có `@OneToMany(..., { cascade: true })`. Đó là cascade của TypeORM khi lưu hoặc xóa entity đã nạp relation, không phải `ON DELETE` của database. `RESTRICT` vẫn chặn `DELETE` SQL thẳng vào cha khi còn con. Không đổi `cascade: true` trong lần này.

Không thêm `ON DELETE SET NULL`. Không có cột nào trong tám khóa này được phép null.

## Runbook bước 4 — truy vấn chỉ đọc

Các câu dưới đây dùng khi đối chiếu database đang chạy với catalog, trước khi ghi dòng baseline vào bảng `migrations`. Chỉ `SELECT`. Không `INSERT`, không `DELETE`, không nối production từ tài liệu này.

Dòng trùng làm unique mới thất bại. Dòng mồ côi làm khóa ngoại mới thất bại. Kết quả mỗi câu phải là 0 dòng trước khi được đánh dấu baseline đã chạy.

### Dòng trùng

```sql
SELECT tenant_id, idempotency_key, COUNT(*) AS n
FROM bookings
WHERE idempotency_key IS NOT NULL
GROUP BY tenant_id, idempotency_key
HAVING COUNT(*) > 1;

SELECT tenant_id, idempotency_key, COUNT(*) AS n
FROM payment_intents
WHERE idempotency_key IS NOT NULL
GROUP BY tenant_id, idempotency_key
HAVING COUNT(*) > 1;

SELECT event_id, COUNT(*) AS n
FROM payment_webhook_events
GROUP BY event_id
HAVING COUNT(*) > 1;

SELECT tenant_id, idempotency_key, COUNT(*) AS n
FROM refunds
WHERE idempotency_key IS NOT NULL
GROUP BY tenant_id, idempotency_key
HAVING COUNT(*) > 1;

SELECT webhook_event_id, COUNT(*) AS n
FROM ledger_journals
GROUP BY webhook_event_id
HAVING COUNT(*) > 1;

SELECT tenant_id, booking_id, COUNT(*) AS n
FROM commission_snapshots
GROUP BY tenant_id, booking_id
HAVING COUNT(*) > 1;

SELECT tenant_id, slug, COUNT(*) AS n FROM geo_areas GROUP BY tenant_id, slug HAVING COUNT(*) > 1;
SELECT tenant_id, slug, COUNT(*) AS n FROM cms_pages GROUP BY tenant_id, slug HAVING COUNT(*) > 1;
SELECT token, COUNT(*) AS n FROM dsr_share_links GROUP BY token HAVING COUNT(*) > 1;
SELECT qr_token, COUNT(*) AS n FROM open_day_rsvps GROUP BY qr_token HAVING COUNT(*) > 1;
SELECT token, COUNT(*) AS n FROM walk_in_galleries GROUP BY token HAVING COUNT(*) > 1;

SELECT agency_tenant_id, project_id, distribution_policy_id, COUNT(*) AS n
FROM agency_applications GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, report_date, COUNT(*) AS n FROM agent_wau_daily GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, COUNT(*) AS n FROM anchor_tenant_profiles GROUP BY tenant_id HAVING COUNT(*) > 1;
SELECT tenant_id, key_hash, COUNT(*) AS n FROM api_partner_keys GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, project_id, version, COUNT(*) AS n FROM commission_policies GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, report_date, project_id, COUNT(*) AS n FROM data_mart_daily GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, product_code, COUNT(*) AS n FROM data_product_entitlements GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, project_id, COUNT(*) AS n FROM developer_trust_scores GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, project_id, version, COUNT(*) AS n FROM distribution_policies GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, subject_type, subject_id, COUNT(*) AS n FROM kyc_profiles GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, idempotency_key, COUNT(*) AS n
FROM leads WHERE idempotency_key IS NOT NULL GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT leadgen_id, COUNT(*) AS n FROM meta_lead_events GROUP BY leadgen_id HAVING COUNT(*) > 1;
SELECT page_id, COUNT(*) AS n FROM meta_page_bindings GROUP BY page_id HAVING COUNT(*) > 1;
SELECT tenant_id, push_token, COUNT(*) AS n FROM mobile_devices GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, report_date, COUNT(*) AS n FROM reconciliation_reports GROUP BY 1, 2 HAVING COUNT(*) > 1;
SELECT tenant_id, source_type, source_id, COUNT(*) AS n
FROM sms_deliveries WHERE source_id IS NOT NULL GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT tenant_id, domain, entity_id, version, COUNT(*) AS n
FROM tenant_config_versions GROUP BY 1, 2, 3, 4 HAVING COUNT(*) > 1;
SELECT msg_id, COUNT(*) AS n FROM zalo_lead_events GROUP BY msg_id HAVING COUNT(*) > 1;
SELECT oa_id, COUNT(*) AS n FROM zalo_oa_bindings GROUP BY oa_id HAVING COUNT(*) > 1;
SELECT tenant_id, source_type, source_id, COUNT(*) AS n
FROM zalo_zns_deliveries WHERE source_id IS NOT NULL GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
SELECT email, COUNT(*) AS n FROM users GROUP BY email HAVING COUNT(*) > 1;
```

### Dòng mồ côi

```sql
SELECT p.id FROM projects p LEFT JOIN tenants t ON t.id = p.tenant_id WHERE t.id IS NULL;
SELECT u.id FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE t.id IS NULL;
SELECT u.id FROM units u LEFT JOIN projects p ON p.id = u.project_id WHERE p.id IS NULL;
SELECT l.id FROM listings l LEFT JOIN units u ON u.id = l.unit_id WHERE u.id IS NULL;
SELECT m.id FROM listing_media m LEFT JOIN listings l ON l.id = m.listing_id WHERE l.id IS NULL;
SELECT k.id FROM api_partner_keys k LEFT JOIN api_partners p ON p.id = k.partner_id WHERE p.id IS NULL;
SELECT i.id FROM bnpl_installments i LEFT JOIN bnpl_applications a ON a.id = i.application_id WHERE a.id IS NULL;
SELECT m.id FROM escrow_milestones m LEFT JOIN escrow_accounts a ON a.id = m.account_id WHERE a.id IS NULL;
```

## Chưa làm trong file này

RLS của 22 bảng và 575 cột chưa có `CREATE TABLE` không nằm trong bảng quyết định này. Bước 2, viết `1738339100000-BaselineCoreSchema.ts`, chỉ bắt đầu sau khi PR #1 đã merge và nhánh này đã rebase lên `main`. File migration đó chưa được viết.
