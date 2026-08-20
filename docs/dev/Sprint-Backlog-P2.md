# Sprint Backlog P2 — Integrations · Settlement · AI Scoring

> **Timeline:** 4 sprint × 2 tuần (T1–T2/2027 pilot)  
> **Goal:** OP-WIN-06→09 · omnichannel lead < 30s · settlement batch E2E · TC-12 scoring  
> **Gate:** G2.1 settlement · G2.2 Zalo/Meta · G2.4 mobile beta

---

## Sprint P2-S1 — Meta Graph + Zalo go-live

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| P2-S1-01 ✅ | meta | `MetaGraphClient.fetchLead` | UC-NW-02 | Webhook thiếu `field_data` → Graph fetch |
| P2-S1-02 ✅ | meta | `POST /integrations/meta/pages/connect` | UC-NW-02 | Page token lưu `meta_page_bindings` |
| P2-S1-03 ✅ | meta | Meta OAuth page subscribe (live) | UC-NW-02 | Admin connect page thật |
| P2-S1-04 | zalo | `ZALO_ZNS_SANDBOX=false` staging | UC-NW-01 | ZNS payment + lead notify live |
| P2-S1-05 | crm | Omnichannel dashboard metrics | UC-CRM-05 | `/admin/integrations/leads` latency < 30s |

**Demo P2-S1:** Meta webhook `leadgen_id` only → CRM lead + score PENDING → SCORED.

---

## Sprint P2-S2 — SMS + Tenant webhooks

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| P2-S2-01 ✅ | sms | `SmsProviderClient` HTTP live | UC-NW-03 | `SMS_SANDBOX=false` + provider URL |
| P2-S2-02 ✅ | booking | E-sign OTP qua SMS gateway | UC-BK-07 | Contract OTP ≠ hardcoded demo |
| P2-S2-03 ✅ | tenant-webhooks | `emitEvent` HTTP + HMAC | UC-NW-05 | Booking/payment dispatch |
| P2-S2-04 ✅ | tenant-webhooks | Retry queue (failed delivery) | UC-NW-05 | 3 attempts exponential backoff |
| P2-S2-05 ✅ | fe | Developer webhooks delivery log | SCR-DEV-013 | Show live vs simulate badge |

**Demo P2-S2:** Pay success → tenant webhook `payment.success` 200 + signature verify.

---

## Sprint P2-S3 — Settlement production

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| P2-S3-01 ✅ | commission | `CommissionPayoutClient` batch rail | UC-PAY-04 | `SETTLEMENT_PAYOUT_ENABLED=true` |
| P2-S3-02 ✅ | commission | Settlement run → payout before PAID | UC-PAY-04 | Audit payload có `payout` |
| P2-S3-03 | commission | Scheduler Mon 07:00 ICT smoke | UC-PAY-04 | CI cron test |
| P2-S3-04 ✅ | finance | Settlement UI payout status | SCR-FIN-006 | Badge SUBMITTED/SKIPPED |
| P2-S3-05 | kyc | BR-23 block + agency resubmit | UC-ID-05 | OP-WIN-06 E2E |

**Demo P2-S3:** Approve lines → run settlement → payout partner stub → entries PAID.

---

## Sprint P2-S4 — AI scoring hardening

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| P2-S4-01 ✅ | ai-scoring | Rules v1 P2 omnichannel weights | UC-AI-02 | META/ZALO/SMS tiers |
| P2-S4-02 | ai-scoring | `lead-routing.service` unit tests | UC-AI-02 | HOT round-robin covered |
| P2-S4-03 | ai-scoring | TC-12 acceptance script | UC-AI-02 | Pipeline HOT badge + explain |
| P2-S4-04 | fe | Agent lead detail score poll | SCR-AGENT-014 | PENDING → SCORED ≤ 3s |
| P2-S4-05 | qa | Omnichannel + settlement regression | OP-WIN-06→07 | CI nightly P2 smoke |

**Demo P2-S4:** Meta lead → score ≥ 85 HOT → auto-route agent · explain factors visible.

---

## Definition of Done (Phase 2)

- [ ] OP-WIN-06 commission settlement batch E2E
- [ ] OP-WIN-07 Zalo/Meta lead vào CRM < 30s
- [ ] TC-12 lead scoring HOT dashboard
- [ ] TC-21 Meta webhook dedup + Graph fetch
- [ ] Env documented: `META_*`, `SMS_PROVIDER_*`, `SETTLEMENT_PAYOUT_*`
- [ ] OpenAPI updated for new endpoints

## Env quick reference

```bash
# Meta live
META_GRAPH_SANDBOX=false
META_APP_ID=...
META_APP_SECRET=...
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/v1/integrations/meta/oauth/callback
META_OAUTH_SUCCESS_URL=http://localhost:5174/admin/integrations/meta
META_PAGE_ACCESS_TOKEN=...   # or OAuth / POST /integrations/meta/pages/connect

# SMS live
SMS_SANDBOX=false
SMS_PROVIDER_URL=...
SMS_PROVIDER_API_KEY=...

# Settlement payout
SETTLEMENT_PAYOUT_ENABLED=true
SETTLEMENT_PAYOUT_URL=...
SETTLEMENT_PAYOUT_API_KEY=...
```

## Related docs

- `apps/web/README.md` — Wave J (Phase 2 UI routes)
- `docs/specs/WEREAL-BA-Master-Spec.md` — As-Is + API shipped vs target
- `docs/dev/Sprint-Backlog-P3.md` — Tier 1 production credibility (OP-WIN-01→07)
- `docs/strategy/WEREAL-Domain-Scorecard.md` — Domain maturity 1–5
- `docs/strategy/WEREAL-Competitive-Benchmark.md` — vs FUB · kvCORE · Dotloop · Salesforce RE
- `Tieu-chi-chap-nhan.md` §14 — OP-WIN-06→09
