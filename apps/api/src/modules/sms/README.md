# SMS Gateway (UC-NW-03 · SCR-ADMIN-012)

Pattern mirrors Zalo ZNS module — sandbox default, idempotent delivery, admin status.

## Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/integrations/sms/status` | Admin stats + recent deliveries |
| POST | `/integrations/sms/simulate` | Sandbox send |
| POST | `/integrations/sms/send` | Manual outbound |
| PATCH | `/integrations/sms/deliveries/:id/delivered` | Delivery report pilot |

## Event hooks

- `PaymentService.createIntent` → `SmsPaymentNotifyService.sendPaymentOtp`
- `PaymentWebhookService` → `SmsPaymentNotifyService.notifyPaymentSuccess`

## Env

| Var | Default |
|-----|---------|
| `SMS_SANDBOX` | `true` |
| `SMS_PAYMENT_OTP_ENABLED` | `true` |
| `SMS_PAYMENT_SUCCESS_ENABLED` | `true` |

Sandbox OTP is always `123456` for buyer payment pilot.
