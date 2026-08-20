# Runbook — Payment webhook (UC-PAY-01 / BR-21)

## Symptoms

- Booking stays `RESERVED` after buyer paid
- Finance sees gateway money but no ledger journal
- Logs: `Invalid webhook signature` or `PaymentIntent not found`

## Severity

| Condition | SEV |
|-----------|-----|
| All webhooks failing | **SEV-1** |
| Single tenant / single intent | **SEV-2** |
| Duplicate replay (idempotent OK) | **SEV-4** info |

## Triage (≤ 5 min)

1. `curl -s http://localhost:3000/api/v1/health | jq .checks`
2. Confirm Redis + Postgres `up`
3. Check intent exists: `GET /api/v1/payment-intents` (via DB or audit)
4. Verify `WEBHOOK_HMAC_SECRET` matches gateway signer (never `WEBHOOK_SKIP_VERIFY=true` in prod)

## Replay webhook (dev / approved prod)

```bash
BODY='{"eventId":"evt_manual_'$(date +%s)'","eventType":"payment.success","transactionId":"MANUAL_TXN","amount":50000000,"paymentIntentId":"pi_xxx","tenantId":"ten_dev_01"}'
SIG=$(node -e "const c=require('crypto');const b=process.argv[1];console.log(c.createHmac('sha256',process.env.WEBHOOK_HMAC_SECRET||'wereal-dev-webhook-secret-change-me').update(b).digest('hex'))" "$BODY")

curl -s -X POST http://localhost:3000/api/v1/webhooks/payment \
  -H 'Content-Type: application/json' \
  -H "X-Signature: $SIG" \
  -d "$BODY" | jq .
```

**Expected:** `processed: true`, `ledgerEntryId` set, booking → `DEPOSITED`.

## Idempotent duplicate (BR-21)

Re-send **same `eventId`** → response `idempotentReplay: true`, no second journal.

## MOCK gateway shortcut

Open `paymentUrl` from intent or:

```bash
curl -s "http://localhost:3000/api/v1/payments/mock/complete?intentId=pi_xxx"
```

## Escalation

- Amount mismatch → stop payout, Finance + Tech Lead
- > 15 min MTTR (G1.8) → page on-call roster ([on-call.md](./on-call.md))

## Post-incident

- Append audit note `entityType: payment_webhook`
- Run reconciliation for ICT day ([reconciliation-daily.md](./reconciliation-daily.md))
