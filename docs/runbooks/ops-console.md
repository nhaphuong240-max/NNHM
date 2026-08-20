# Runbook — Ops console (OPS-S3-01)

Bốn queue trên `/admin/ops` và `GET /ops/console` (JWT). Cùng payload: `GET /health/ops`.

## Stuck payment

**Symptom:** Widget count > 0 — `payment_intents` `PENDING` quá `expiresAt` hoặc >15 phút chưa IPN.

**Triage:**

1. Mở `/admin/payment-gateways` — xác nhận adapter VNPAY sandbox (pilot) vs MOCK (demo).
2. Không dùng `GET /payments/mock/complete` trên tenant `simulateEndpoints=false`.
3. Replay IPN: HMAC `POST /webhooks/payment` (`docs/runbooks/reconciliation-daily.md`).
4. Nếu TTL intent hết: tạo intent mới trên booking vẫn `RESERVED`.

## Lock TTL

**Symptom:** Redis unit lock TTL ≤120s. Sale sắp mất giữ chỗ.

**Triage:**

1. `GET /bookings/status` — `lockMetrics.acquired` / `contention`.
2. Deep link replay `/admin/bookings/replay?bookingId=…`.
3. Hết TTL: unit về AVAILABLE; không force-delete lock trừ khi finance xác nhận hủy.

## Drift BLOCK

**Symptom:** Listing `antiDriftStatus=BLOCK` (giá/diện tích lệch GR).

**Triage:**

1. `/admin/moderation` — không Approve.
2. Agent sửa giá marketing về GR, hoặc CĐT PATCH GR (SOP import).
3. UAT-04: lệch >10% giá = BLOCK.

## Reconcile mismatch

**Symptom:** Ngày ICT `MISMATCH` trong 7 ngày.

**Triage:** owner finance — `docs/runbooks/reconciliation-daily.md` (06:00 ICT job, review 09:00).

G-OPS-1 cần ledger MATCHED trên cọc người thật, không chỉ widget demo.
