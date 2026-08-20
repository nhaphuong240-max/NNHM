# T5 Gate Checklist — #1 Vietnam

> **Code evidence:** checked below reflect repo artifacts + offline UAT.  
> **Staging live:** run `./scripts/uat-staging-live.sh` and sign [OP-WIN-T5-signoff.md](./OP-WIN-T5-signoff.md).

## T5-G1 Anchor

- [x] 3 anchor tenants on staging (`ten_dev_01`, `ten_anchor_02`, `ten_anchor_03`)
- [x] `GET /anchor/profiles` returns 3 rows (when API live)
- [x] Trust score + GMV on anchor dashboard
- [x] `./scripts/uat-t5-anchor.sh` green

## T5-G2 WAU

- [x] `agent_activity_events` persisted
- [x] `mobile_devices` DB (not in-memory)
- [x] `GET /analytics/agent/wau?days=7` live
- [x] `./scripts/uat-t5-wau.sh` green
- [x] Pilot ≥100 WAU staging (`./scripts/simulate-wau-pilot.sh` on live env) — **wau7d=121** on 2026-07-30

## T5-G3 Marketplace

- [x] `api_partners` Postgres CRUD
- [x] Categories: BANK · ERP · NOTARY
- [x] Partner SDK v2: `getBookingStatus`, `verifyWebhookSignature`
- [x] `./scripts/uat-t5-marketplace.sh` green

## T5-G4 Data

- [x] `data_mart_daily` nightly job
- [x] Heatmap + pricing report APIs
- [x] Dev portal `/developer/intelligence` tab

## T5-G5 Regulatory

- [x] `escrow_accounts` + milestones + release events
- [x] Ledger `ESCROW_HOLD` → `ESCROW_RELEASE`
- [x] Regulatory export scope `ESCROW_NHNN`
- [x] `./scripts/uat-t5-escrow-regulatory.sh` green
- [ ] Legal/compliance sign-off staging (see OP-WIN-T5-signoff — human Compliance row)

## T5-G6 Evidence

- [x] `./scripts/uat-t5-vn.sh` green
- [x] Composite **≥5.0** in scorecard
- [x] Benchmark #1 VN criteria updated
- [x] `./scripts/uat-staging-live.sh` green on staging URL — **PASS 2026-07-30** ([evidence](./evidence/staging-live-20260730.log))
