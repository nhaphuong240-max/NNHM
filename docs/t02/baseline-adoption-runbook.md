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
