# UAT OPS S4 — kênh VN (G-OPS-3)

> Tenant LIVE: `ten_pilot_cdt_01`  
> Cổng: **G-OPS-3**. Fail → không mở S5 payout live.

**Rails pilot (seed / verify):**

```bash
curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: ten_pilot_cdt_01" \
  "$API/admin/config/rails/resolved" | jq '.data | {znsSandbox,smsSandbox,pushLiveEnabled}'
```

Kỳ vọng: `znsSandbox: false`, `smsSandbox: false`, `pushLiveEnabled: true`.

## UAT-S4-01 — Zalo ZNS live

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Admin → Zalo integration: `graphMode` LIVE trên pilot | | | |
| 2 | Lead Zalo webhook → lead trong Inbox (channel ZALO) | | | |
| 3 | Không dùng sandbox ZNS trên tenant pilot | | | |

## UAT-S4-02 — Cọc → ZNS hoặc SMS

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Cọc VNPAY sandbox (không mock/complete) | | | |
| 2 | Máy buyer nhận ZNS `payment.success` HOẶC SMS fallback | | | |
| 3 | Audit: `PAYMENT_ZNS_SENT` hoặc `PAYMENT_SMS_SENT` | | | |

## UAT-S4-03 — Inbox buổi sáng

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Sale mở `/agent/inbox` — unread + Zalo/Meta trước WEB | | | |
| 2 | Import CSV chỉ qua Advanced, không lẫn flow omni | | | |

## UAT-S4-04 — SMS OTP live

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | OTP `123456` bị reject trên tenant pilot | | | |
| 2 | OTP thật qua HTTP provider (staging URL) | | | |
| 3 | Checkout không trả `sandboxOtp` trên meta | | | |

## UAT-S4-05 — Push lead &lt; 5 phút

| # | Step | Pass | Name | Date |
|---|------|------|------|------|
| 1 | Agent mobile đăng ký push token (Profile) | | | |
| 2 | Lead mới Zalo/web → push + hiện Inbox &lt; 5 phút | | | |
| 3 | Audit `LEAD_PUSH_SENT` có `notifiedAt` | | | |

---

## G-OPS-3 sign-off

| Role | Tiêu chí | Name | Date |
|------|----------|------|------|
| **Agency lead** | Lead Zalo/web vào inbox; sale quen mở Inbox sáng | | |
| **Product** | Cọc xong ZNS hoặc SMS máy thật | | |

Automated gate (`e2e/s4-inbox.spec.ts`) không thay chữ ký trên bảng này.
