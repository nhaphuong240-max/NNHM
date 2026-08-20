# Sprint Backlog — Tier 4 Product Moat

> Gate: Tier 3 signed · composite ≥4.0 · `uat-t3-scale.sh` green

## Gates

| Gate | Status | Evidence |
|------|:------:|----------|
| T4-G1 AI | ☑ | TC-12 · HOT conversion · `uat-tc12-hot.sh` |
| T4-G2 GR | ☑ | Trust score API · OP-WIN-04 · `uat-op-win-04.sh` |
| T4-G3 Finance | ☑ | Instant reconcile · live endpoint · `uat-op-win-06.sh` |
| T4-G4 BNPL | ☑ | `bnpl_applications` table · `uat-bnpl-live.sh` |
| T4-G5 Buyer | ☑ | `apps/mobile-buyer` · UC-UX-02 core |
| T4-G6 Evidence | ☑ | `uat-t4-moat.sh` · scorecard ≥4.5 domains |

## Sprints

| Sprint | Deliverable | Status |
|--------|-------------|:------:|
| T4-S1 | TC-12 + HOT conversion metric + threshold 85 | ☑ |
| T4-S2 | Developer trust score + auto-unverify + index <500ms | ☑ |
| T4-S3 | Finance real-time webhook reconcile + live dashboard | ☑ |
| T4-S4 | BNPL persistence + partner path | ☑ |
| T4-S5 | Buyer mobile Expo app | ☑ |
| T4-S6 | AI eval stub + gate close-out | ☑ |

## Key env (staging)

```bash
BNPL_PARTNER_ENABLED=true
SETTLEMENT_PAYOUT_ENABLED=true
SETTLEMENT_PAYOUT_STUB=true
```
