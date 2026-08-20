# T4 Gate Checklist — Product Moat

## Entry (Tier 3)

- [x] `verify-t3-gate.sh` PASS
- [x] `uat-t3-scale.sh` artifacts present
- [x] API unit tests green (254+)
- [x] K8s staging manifests + Dockerfiles

## Tier 4 gates

- [x] **T4-G1** TC-12 signed · HOT conversion on admin/agent dashboard
- [x] **T4-G2** Developer trust score · OP-WIN-04 UAT · auto-unverify on drift BLOCK
- [x] **T4-G3** Instant reconcile on payment webhook · finance live endpoint
- [x] **T4-G4** `bnpl_applications` / `bnpl_installments` · partner sandbox path
- [x] **T4-G5** `apps/mobile-buyer` TestFlight-ready scaffold
- [x] **T4-G6** `uat-t4-moat.sh` green · composite moat evidence

## Verification

```bash
./scripts/verify-t4-gate.sh
./scripts/uat-t4-moat.sh
cd apps/api && npm test
```
