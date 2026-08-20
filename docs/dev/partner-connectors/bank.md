# Bank Connector — T5-S4

## Webhook ingress

`POST /integrations/bank/webhook`

Headers: `X-Tenant-Id`

```json
{
  "transactionId": "txn_001",
  "bookingId": "bk_001",
  "paymentIntentId": "pi_001",
  "amount": 500000000,
  "status": "SUCCESS"
}
```

On `SUCCESS`, triggers `reconcilePaymentEvent(tenantId, paymentIntentId)`.

## Sandbox partner

Category `BANK` · seeded via `ApiMarketplaceService.ensureSeedPartners`.

## SDK

Use `@wereal/partner-sdk` for lead ingress; bank status via webhook above.
