# Notary Connector — T5-S4

## Webhook ingress

`POST /integrations/notary/webhook`

```json
{
  "bookingId": "bk_001",
  "milestoneId": "ms_contract",
  "notarizationStatus": "COMPLETED",
  "contractRef": "NOT-2026-001"
}
```

Links booking timeline + escrow milestone `ms_contract`.

## Escrow integration

Milestone release requires dual approval (finance + compliance) per T5-S6.

## Sandbox partner

Category `NOTARY` · status `SANDBOX`.
