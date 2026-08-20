# Sprint Backlog P0 — Vertical slice MVP

> **Timeline:** 6 sprint × 2 tuần (T8–T12/2026)  
> **Goal:** OP-WIN-01→05 · 1 deal GR → Pay → Ledger → Commission snapshot  
> **Tracking:** Map task ID → UC/FR → PR → demo sprint

---

## Sprint S1 — Foundation (tuần 1–2)

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S1-01 | infra | Scaffold `apps/api` NestJS + Docker Postgres/Redis | — | `GET /health` 200 |
| S1-02 | identity | Tenant context middleware + JWT guard | UC-ID-03 | ✅ JWT login + 403 cross-tenant |
| S1-03 | identity | Tenant onboarding API stub | UC-ID-01 | POST tenant 201 |
| S1-04 | golden-record | GET projects/units (read) | UC-GR-01 | ✅ GET /units from Postgres + seed |
| S1-05 | audit | Audit interceptor append-only | UC-TR-01 | Mutation → event row |
| S1-06 | devops | CI lint + test pipeline | NFR-O01 | PR checks green |

**Demo S1:** Login → list units 1 project · audit log 1 mutation.

---

## Sprint S2 — Golden Record write + Listing

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S2-01 | golden-record | PATCH unit optimistic lock | UC-GR-01 | ✅ Version conflict 409 |
| S2-02 | golden-record | Anti-drift rules engine | UC-GR-03 | ✅ PASS/FLAG/BLOCK |
| S2-03 | listing | POST listing from GR wizard | UC-GR-02 | ✅ POST /listings |
| S2-04 | listing | Moderation queue approve/reject | UC-LS-02 | ✅ approve → search index |
| S2-05 | audit | Audit explorer API filters | UC-TR-01 | ✅ GET /audit/events DB |
| S2-06 | fe | Migrate Public search shell → apps/web | UC-LS-01 | ✅ apps/web search |
| M-S2-01 | mobile | Expo Agent app shell + bottom tabs | UC-UX-01 | ✅ runs + SecureStore JWT |
| M-S2-02 | mobile | Geo check-in POST /activities | UC-UX-01 | GPS permission OK |

**Demo S2:** Dev sửa giá GR → agent listing → ops approve · **Agent app** tab Leads.

---

## Sprint S3 — Booking + Real-time

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S3-01 | booking | POST booking + Redis lock | UC-BK-01 | ✅ 0 double-book test |
| S3-02 | booking | Expiry job release lock | UC-BK-01 | ✅ BR-17 auto release |
| S3-03 | booking | Event timeline GET | UC-BK-03 | ✅ GET /bookings/:id/timeline + /events |
| S3-04 | stream | SSE unit status channel | UC-GR-07 | ✅ Redis pub/sub + /stream/units |
| S3-05 | crm | Lead capture POST (minimal) | UC-CRM-01 | ✅ POST /leads + PDPA + SCR-PUBLIC-006 UI |
| S3-06 | test | k6 concurrent booking 100 | G1.5 | 0 failures |
| M-S3-01 | mobile | Offline leads cache AsyncStorage | UC-UX-01 | ✅ Airplane mode list |
| M-S3-02 | mobile | Quick booking → POST /bookings | UC-BK-01 | ✅ E2E mobile→API |

**Demo S3:** 2 agent cùng book 1 unit → 1 success 1 fail · **Mobile quick book**.

---

## Sprint S4 — Payment + Ledger

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S4-01 | payment | PaymentIntent + gateway adapter | UC-PAY-01 | ✅ MOCK/VNPAY redirect |
| S4-02 | payment | Webhook idempotent handler | UC-PAY-01 | ✅ BR-21 duplicate skip |
| S4-03 | ledger | Double-entry on payment success | UC-PAY-01 | ✅ Debit = credit (2 lines/journal) |
| S4-04 | ledger | Daily reconciliation job | UC-PAY-02 | ✅ GET /ledger/reconciliation + cron 06:00 ICT |
| S4-05 | payment | Refund + reversal | UC-PAY-03 | ✅ POST /refunds · DELETE /bookings cancel path |
| S4-06 | fe | Finance reconcile dashboard | UC-PAY-02 | ✅ /finance/reconciliation match UI |

**Demo S4:** Book → pay sandbox → ledger rows → reconcile pass.

---

## Sprint S5 — Commission + Trust

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S5-01 | commission | Policy CRUD publish | UC-COM-01 | ✅ version immutable publish |
| S5-02 | commission | Snapshot on deal complete | UC-COM-02 | ✅ policyHash stored |
| S5-03 | commission | Split lines calculate | UC-COM-03 | ✅ sum 100% |
| S5-04 | commission | Holdback on dispute open | UC-COM-04 | ✅ payout HOLDBACK |
| S5-05 | audit | Export audit CSV | UC-TR-01 | ✅ GET /audit/events/export.csv |
| S5-06 | fe | Developer commission policy UI | UC-COM-01 | ✅ /developer/commission |

**Demo S5:** Close deal → snapshot → split preview.

---

## Sprint S6 — Pilot hardening

| Task ID | Module | Mô tả | UC/FR | Done when |
|---------|--------|-------|-------|-----------|
| S6-01 ✅ | ops | Runbook payment + on-call | OP-P0-4 | G1.8 |
| S6-02 ✅ | ops | SLA dashboard Grafana | G1.12 | Uptime visible |
| S6-03 ✅ | qa | UAT-01→05 pilot tenant | OP-WIN-05 | PO sign-off |
| S6-04 ✅ | qa | Pen test remediate Critical | G1.7 | Zero Critical |
| S6-05 ✅ | docs | Module READMEs complete | — | 8 module README |
| S6-06 ✅ | all | Regression P0 smoke | R1.0 | CI nightly green |

**Gate:** Phase 1 checklist G1.1→G1.12 + OP-WIN-01→05.

---

## Definition of Done (mỗi task)

- [ ] Code merged via PR (review + CI)
- [ ] OpenAPI updated nếu có API change
- [ ] Unit test critical path
- [ ] Audit log nếu mutation
- [ ] Demo script ghi trong PR description
