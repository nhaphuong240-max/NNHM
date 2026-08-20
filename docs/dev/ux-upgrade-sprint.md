# UX Upgrade Sprint — Web · Mobile · Performance

> Post T7 · unified experience · production dashboards · mobile parity · SLO close-loop

## Scope

| App | Priority upgrades | Status |
|-----|-------------------|--------|
| **Web (7 portal)** | E2E PR · design system · anchor dashboard · data intelligence production | ✅ code |
| **Mobile Agent** | Push live path · offline-first lead capture · WAU no simulate | ✅ Expo push + activity API |
| **Mobile Buyer** | Deal timeline · BNPL live · e-sign in-app WebView | ✅ API + UI fixes |
| **Performance** | API P95 ≤200ms (existing SLO) · web LCP <2.5s RUM | ✅ RUM + nginx + chunks |

## Web deliverables

| Artifact | Path |
|----------|------|
| Design tokens v2.1 | `apps/web/src/theme/tokens.ts` · `index.css` |
| Anchor dashboard | `pages/developer/DeveloperAnchorPage.tsx` · `/developer/anchor` |
| Data intelligence UI | `pages/developer/DeveloperIntelligencePage.tsx` (heatmap bars + billing tab) |
| E2E PR gate | `e2e/developer.spec.ts` · `ci.yml` (+ book + search) |
| Web vitals RUM | `lib/web-vitals.ts` · LCP target 2500ms |
| Vite code split | `vite.config.ts` · vendor chunk |
| nginx perf | `nginx.conf` · gzip + cache headers |

## Mobile Agent

| Artifact | Path |
|----------|------|
| Offline lead queue | `services/leadCaptureQueue.ts` · `useLeadCaptureSync.ts` |
| Capture UI | `screens/LeadsScreen.tsx` (offline queue + auto sync) |
| Push live | `expo-push.service.ts` · `PUSH_LIVE_ENABLED=true` → Expo API |
| WAU real activity | `POST /mobile/activity` · `useAgentSession.ts` (APP_SESSION) |
| Lead WAU events | `LEAD_CAPTURE` on live + batch sync |
| Profile status | WAU 7d + push mode on `ProfileScreen` |

WAU: `WAU_PILOT_SIM_ENABLED=false` on prod — `PILOT_SYNC` excluded from metrics.

Verify: `./scripts/uat-mobile-agent-ux.sh http://localhost:3000/api/v1`

## Mobile Buyer

| Artifact | Path |
|----------|------|
| Deal timeline fix | `portal.ts` · `steps` from API attributes |
| BNPL | `POST /portal/buyer/deals/:id/bnpl` |
| E-sign in-app | `EsignScreen.tsx` · WebView + sign-session |
| Push register | `POST /portal/buyer/devices/register` |

## Performance

| Target | Mechanism |
|--------|-----------|
| API P95 ≤200ms | Prometheus + `GET /health/slo` · Grafana alerts (existing) |
| Web LCP <2.5s | `web-vitals` RUM · `./scripts/check-web-lcp.sh` |

## Verify

```bash
cd apps/api && npm run build
cd apps/web && npm run build
./scripts/uat-ux-upgrade.sh http://localhost:3000/api/v1
```
