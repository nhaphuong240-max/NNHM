# T09 — một hold active cho mỗi căn

Invariant là của căn, không của tenant. Theo D01, sàn là tenant riêng. Unique `(tenant_id, unit_id)` vẫn cho hai sàn giữ cùng một `unit_id`.

Index `uq_bookings_active_hold` là `UNIQUE (unit_id) WHERE status IN ('RESERVED', 'DEPOSITED')`. Migration `1758150000000` quét `GROUP BY unit_id` và dừng nếu đã có trùng. Redis chỉ hỗ trợ; vi phạm unique trả 409, không trả lỗi Postgres thô.

Bằng chứng đồng thời nằm ở `scripts/t02-rls-hold-proof.js`, chạy trong job `t02-isolated-db` với ít nhất 50 insert cùng một căn. Test JavaScript một biến không phải bằng chứng G02.
