# T02 bước 4 — Runbook áp dụng baseline

Tài liệu này không được thực thi trên production. Không có lệnh nào ở đây được chạy với `DATABASE_URL` của môi trường thật. Người viết runbook không kết nối production.

Baseline là file `apps/api/src/database/migrations/1738339100000-BaselineCoreSchema.ts`. Migration sau đó giữ nguyên. Index `attribution_touchpoints (tenant_id, lead_id)` nằm ở `1758070100000-AttributionTouchpointLeadIndex.ts` vì bảng được tạo ở `1758070000000`.

## Ai duyệt

Người duyệt schema (chủ repo) duyệt trước khi ghi một dòng vào bảng `migrations`. Không có đường tự ghi. `allowBootstrap()` vẫn trả `allow: false`.

## Sao lưu

Trước khi làm bất cứ việc gì trên một database đã có dữ liệu:

1. Dừng ứng dụng ghi vào database đó.
2. Lấy bản sao vật lý hoặc `pg_dump` của toàn bộ database, để ngoài repo, không kèm mật khẩu trong tên file.
3. Ghi lại `current_database()`, `current_user`, `inet_server_addr()`, `inet_server_port()` và đối chiếu với session đã được xác nhận. URL hoặc tên database không đủ để kết luận đây là database nào.
4. Giữ bản sao đến khi `migration:run` của các migration sau baseline xong và đối soát dữ liệu mẫu.

Phục hồi là restore bản sao đó. `migration:revert` chỉ dùng trên database thử, sau khi đã có bản sao.

## Database trống

`DB_SYNCHRONIZE=false`. Chạy `migration:run` từ đầu. Baseline tạo 56 bảng lõi rồi dừng nếu một bảng trong số đó đã tồn tại. Không dùng `IF NOT EXISTS` để bỏ qua bảng có sẵn.

## Database đã có schema

Chỉ đánh dấu baseline đã chạy khi mọi điều kiện sau đúng. Thiếu một điều kiện thì dừng, không `INSERT`.

1. Các `SELECT` trùng và mồ côi ở dưới trả về 0 dòng.
2. So `information_schema.columns`, `pg_constraint`, `pg_index`, `pg_policies` với 79 entity. Lệch cột, kiểu, null, unique, index, khóa ngoại hoặc policy thì dừng.
3. Không có bảng lõi nào thiếu so với `1738339100000`. Nếu thiếu, đó không phải database đã synchronize đủ; không đánh dấu baseline.
4. Người duyệt schema ký nhận kết quả đọc.

`synchronize` không phải bằng chứng catalog khớp. TypeORM gắn `@Index([...])` hoặc `@Unique([...])` trên một property thì bỏ mảng cột: metadata chỉ giữ tên property đó (`columns: propertyName ? [propertyName] : fields`). Lần chạy thử trước khi chuyển decorator đo được `DIFF=81`: unique và index thành một cột, ví dụ `bookings` unique trên `idempotency_key` thay vì `(tenant_id, idempotency_key)`, `agency_applications` unique trên `created_at`. Lần đó không đủ điều kiện để ghi dòng baseline.

Sau khi mọi decorator nhiều cột được chuyển lên class, chạy lại trên database dùng một lần `wereal_t02_sync` tại `127.0.0.1:55433`, `synchronize: true`, không `INSERT` vào `migrations`. So catalog ngày 2026-11-10: cột, unique, index và khóa ngoại không còn dòng lệch. Còn `DIFF=112`, toàn bộ là RLS vì `synchronize` không bật policy. Catalog chưa khớp nên không ghi dòng baseline.

```text
DIFF=112
distribution_policies rls not forced
distribution_policies policies none
agency_applications rls not forced
agency_applications policies none
documents rls not forced
documents policies none
document_access_logs rls not forced
document_access_logs policies none
meta_lead_events rls not forced
meta_lead_events policies none
meta_page_bindings rls not forced
meta_page_bindings policies none
zalo_lead_events rls not forced
zalo_lead_events policies none
zalo_oa_bindings rls not forced
zalo_oa_bindings policies none
zalo_zns_deliveries rls not forced
zalo_zns_deliveries policies none
sms_bindings rls not forced
sms_bindings policies none
sms_deliveries rls not forced
sms_deliveries policies none
kyc_profiles rls not forced
kyc_profiles policies none
commission_settlement_runs rls not forced
commission_settlement_runs policies none
commission_disputes rls not forced
commission_disputes policies none
commission_entries rls not forced
commission_entries policies none
commission_policies rls not forced
commission_policies policies none
commission_snapshots rls not forced
commission_snapshots policies none
refunds rls not forced
refunds policies none
reconciliation_reports rls not forced
reconciliation_reports policies none
ledger_entries rls not forced
ledger_entries policies none
ledger_journals rls not forced
ledger_journals policies none
payment_webhook_events rls not forced
payment_webhook_events policies none
booking_domain_events rls not forced
booking_domain_events policies none
bookings rls not forced
bookings policies none
leads rls not forced
leads policies none
crm_activities rls not forced
crm_activities policies none
search_outbox rls not forced
search_outbox policies none
search_index_docs rls not forced
search_index_docs policies none
lead_scoring_outbox rls not forced
lead_scoring_outbox policies none
payment_intents rls not forced
payment_intents policies none
audit_events rls not forced
audit_events policies none
trust_disputes rls not forced
trust_disputes policies none
tenant_config_versions rls not forced
tenant_config_versions policies none
consent_ledger_entries rls not forced
consent_ledger_entries policies none
lead_conversion_events rls not forced
lead_conversion_events policies none
developer_trust_scores rls not forced
developer_trust_scores policies none
anchor_tenant_profiles rls not forced
anchor_tenant_profiles policies none
agent_activity_events rls not forced
agent_activity_events policies none
agent_wau_daily rls not forced
agent_wau_daily policies none
mobile_devices rls not forced
mobile_devices policies none
api_webhook_deliveries rls not forced
api_webhook_deliveries policies none
escrow_release_events rls not forced
escrow_release_events policies none
data_mart_daily rls not forced
data_mart_daily policies none
data_product_entitlements rls not forced
data_product_entitlements policies none
tenants rls not forced
tenants policies none
users rls not forced
users policies none
projects rls not forced
projects policies none
units rls not forced
units policies none
listings rls not forced
listings policies none
listing_media rls not forced
listing_media policies none
bnpl_applications rls not forced
bnpl_applications policies none
bnpl_installments rls not forced
bnpl_installments policies none
api_partners rls not forced
api_partners policies none
api_partner_keys rls not forced
api_partner_keys policies none
escrow_accounts rls not forced
escrow_accounts policies none
escrow_milestones rls not forced
escrow_milestones policies none
```

Khi đủ điều kiện, ghi đúng một dòng, không chạy DDL của baseline:

```sql
INSERT INTO migrations (timestamp, name)
VALUES (1738339100000, 'BaselineCoreSchema1738339100000');
```

Sau đó chạy `migration:run` cho các migration còn lại. Dữ liệu cũ phải còn nguyên.

## Phục hồi khi lỗi

1. Nếu `migration:run` lỗi giữa chừng, transaction mặc định của TypeORM là `all`: cả lần chạy đó rollback.
2. Nếu đã commit một phần ở một lần chạy trước, `migration:revert` từng bước trên database thử.
3. Production dùng bản sao đã lấy ở mục sao lưu. Không sửa các migration cũ để “làm lại cho khớp”.

## Truy vấn chỉ đọc

Mỗi câu phải trả về 0 dòng trước khi được ghi dòng baseline. Chỉ `SELECT`.

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
