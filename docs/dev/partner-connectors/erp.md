# ERP Connector — T5-S4

## Unit sync (idempotent)

`POST /partner/v1/units/sync`

Headers: `X-Tenant-Id`, `X-Partner-Api-Key`

```json
{
  "idempotencyKey": "sync_20260728",
  "units": [
    { "unitId": "unit_01", "status": "AVAILABLE", "basePrice": 3500000000 }
  ]
}
```

Patches Golden Record via optimistic lock (`expectedVersion`).

## Outbound

Tenant webhook event `booking.deposited` (via tenant-webhooks module).

## Sandbox partner

Category `ERP` · status `SANDBOX`.
