# ADR-004: Payment Gateway Adapter Pattern

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-004 |
| **Status** | Accepted |
| **Date** | 20/07/2026 |
| **Deciders** | Architecture Team, Tech Lead, Finance Lead |
| **Baseline** | WEREAL-BL-2026-002 |
| **Related FR/NFR** | FR-PAY-01→06, NFR-CM03, BR-02, BR-21, EX-01 |
| **Supersedes** | — |
| **Superseded by** | — |

## Context

WEREAL Phase 1 cần tích hợp payment gateway cho booking deposit:

- Phase 1: **1 gateway** (VNPay sandbox → production)
- Phase 3: **multi-gateway routing** (VNPay + MoMo + future) — FR-PAY-06
- **Không tự xây payment gateway** — EX-01 explicit exclusion
- Webhook idempotent processing — FR-PAY-04, BR-21
- Double-entry ledger write on payment success — FR-PAY-03
- Swap gateway provider ≤ **2 sprint** — NFR-CM03

Persona P6 (Kim Anh — Finance) yêu cầu auto-reconciliation gateway vs ledger.

## Decision

Implement **Payment Gateway Adapter Pattern**:

```typescript
interface PaymentGatewayAdapter {
  createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntentResult>;
  verifyWebhook(payload: unknown, signature: string): WebhookEvent;
  queryTransaction(ref: string): Promise<TransactionStatus>;
  refund(params: RefundParams): Promise<RefundResult>;
}

class PaymentOrchestrator {
  route(gatewayCode: string): PaymentGatewayAdapter;
}
```

- **Orchestrator** routes by tenant/project config (`gatewayCode: 'VNPAY' | 'MOMO'`)
- **Webhook handler** per provider with HMAC verification
- **Mock adapter** for unit/integration tests without real gateway

## Rationale

1. **Vendor independence** — swap VNPay → MoMo ≤ 2 sprint without rewriting booking flow
2. **Sandbox/prod isolation** — separate adapter config per environment
3. **Testability** — MockPaymentAdapter in CI; no real money in test pipeline
4. **Webhook normalization** — map provider-specific events → internal `payment.success|failed|refunded`
5. **Natural NestJS fit** — DI register adapter implementations by token

## Consequences

### Positive

- Booking module depends on interface, not VNPay SDK
- Unit test payment flow end-to-end with mock
- Provider-specific quirks isolated in adapter implementation
- Finance reconciliation queries unified internal payment model

### Negative

- **Lowest common denominator API** — provider-specific features (installment, QR variants) need extension methods
- Each new gateway = new adapter + webhook handler + reconciliation mapping
- Orchestrator routing adds indirection layer

### Neutral

- Phase 1 scope: **VNPayAdapter** production; **MoMoAdapter** stub only

## Phase Scope

| Phase | Gateways | Notes |
|-------|----------|-------|
| P1 | VNPay | Sandbox T10/2026; production go-live |
| P2 | VNPay + MoMo stub | MoMo sandbox integration |
| P3 | Multi-gateway routing | FR-PAY-06; config per tenant |
| P5 | Embedded finance partners | Bank/mortgage — separate ADR |

## Implementation Notes

**Directory structure:**

```
modules/payment/
├── adapters/
│   ├── payment-gateway.adapter.ts      # Interface
│   ├── vnpay.adapter.ts
│   ├── momo.adapter.ts                 # Stub P1
│   └── mock.adapter.ts                 # Test
├── orchestrator/
│   └── payment-orchestrator.service.ts
├── webhook/
│   └── webhook.controller.ts           # POST /webhooks/payment
└── ledger/
    └── ledger-write.service.ts         # Double-entry on success
```

**Webhook flow:**

```
Gateway → POST /webhooks/payment
       → Verify HMAC + IP allowlist
       → Idempotent by eventId (Redis 7d TTL)
       → Update booking state → DEPOSITED
       → Write ledger entries
       → Return 200 { received: true, processed: true }
```

**Ledger accounts (Phase 1):**

| Debit | Credit | Event |
|-------|--------|-------|
| CASH_VNPAY | DEPOSIT_LIABILITY | payment.success |
| DEPOSIT_LIABILITY | CASH_VNPAY | payment.refunded |

## Alternatives Rejected

| Alternative | Lý do loại |
|-------------|------------|
| Direct VNPay SDK calls in BookingService | Không swap được; tight coupling |
| Build own payment gateway | EX-01 exclusion; regulatory complexity |
| Single generic REST client | Không handle webhook signature per provider |

## References

- SDD §9 Payment & Ledger Design
- [`Thiet-ke-API.md`](../Thiet-ke-API.md) — API-061→064, §7 Webhook spec
- [`So-do-CSDL.md`](../So-do-CSDL.md) — `payment_intents`, `payments`, `ledger_entries`
