# T7-S6 — Network OS scale

> Sprint **T7-S6** · Gate **T7-G6** · 3 LIVE CĐT · WAU ≥500 · cross-anchor GMV

## Deliverables

| Artifact | Path |
|----------|------|
| 3 LIVE pilot anchors | `anchor-tenant.service.ts` · `LIVE_PILOT_ANCHORS` |
| Network scale API | `GET /anchor/network/scale` |
| Platform WAU (no sim) | `agent-wau.service.ts` · `getPlatformWauMetrics()` |
| Network health gate | `GET /health/network` |
| CĐT #2 #3 config | `config/gtm/pilot-cdt-v2.json`, `v3.json` |
| Onboard script | `scripts/onboard-pilot-cdt-network.sh` |

## Env flags

| Flag | Dev | Prod (`tier-t7/production-trust.env`) |
|------|-----|----------------------------------------|
| `WAU_PILOT_SIM_ENABLED` | `true` (staging) | `false` |
| `PUSH_LIVE_ENABLED` | — | `true` |

When `WAU_PILOT_SIM_ENABLED=false`, `POST /analytics/agent/wau/simulate` returns **403** and `PILOT_SYNC` events are excluded from WAU counts.

## Anchor topology (additive)

| Tenant | pilotClass | Role |
|--------|------------|------|
| `ten_pilot_cdt_01` | LIVE | CĐT Thăng Long |
| `ten_pilot_cdt_02` | LIVE | CĐT NovaLand #2 |
| `ten_pilot_cdt_03` | LIVE | CĐT GreenCity #3 |
| `ten_dev_01` | SYNTHETIC | Sunrise (unchanged) |
| `ten_anchor_02/03` | SYNTHETIC | Metro / Green Park |

## Cross-anchor GMV

LIVE tenant `ten_pilot_cdt_01` có booking `DEPOSITED` (`bk_pilot_deposit01`) — evidence cho T7-G6.

## Verify

```bash
./scripts/onboard-pilot-cdt.sh http://localhost:3000/api/v1
./scripts/onboard-pilot-cdt-network.sh http://localhost:3000/api/v1
./scripts/uat-t7-network.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/network | jq .
curl 'http://localhost:3000/api/v1/anchor/profiles?pilotClass=LIVE' | jq .
```

## Next (T7-S8)

Enterprise sign-off — DR drill · white-label · ERP · pen-test · scorecard.
