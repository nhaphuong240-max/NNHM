# WEREAL REOS — UI Prototype v2.1

Interactive **premium prototype** covering **78 use cases** from `wereal_ba_catalog_data.py` / BA Master Spec.

## Quick start

```bash
cd WEREAL/prototype
npm install
npm run dev
```

- **Portal Hub:** http://localhost:5173/
- **Design System:** http://localhost:5173/design-system
- **Use Case Catalog:** http://localhost:5173/catalog
- **Single UC screen:** http://localhost:5173/uc/UC-GR-01
- **Developer Portal:** http://localhost:5173/developer
- **Agent Mobile preview:** http://localhost:5173/agent/mobile

## Mobile (native)

Production Agent app: [`../apps/mobile/`](../apps/mobile/) — Expo React Native (UC-UX-01)

```bash
cd WEREAL/apps/mobile && npm start
```

Chiến lược: [`docs/dev/Mobile-Strategy.md`](../docs/dev/Mobile-Strategy.md)

## Coverage — 78 Use Cases

| Module | Examples |
|--------|----------|
| GR | Golden Record, Product Graph, Import, SSE, anti-drift |
| ID | Login/MFA, Tenant onboarding, RBAC, KYC |
| LS | Search, Compare, Moderation, Media upload |
| CRM | Lead form, Pipeline, Routing, Zalo/Meta |
| BK | Booking, Timeline, Cancel, Contract, E-sign |
| PAY | Payment, Reconcile, Refund, Escrow |
| COM | Commission policy, Split, Holdback |
| AI | Copilot, Scoring, RAG, Anomaly |
| TR | Audit, Document Vault, Dispute |
| AN | KPI, GMV, Absorption, Forecast |
| MKT | Distribution, Agency apply, Leaderboard |
| UX | Mobile PWA, Buyer track, White-label |
| NW | Zalo, Meta, SMS, Webhooks |

## 7 Portals

| Portal | Route | Persona |
|--------|-------|---------|
| Public | `/uc/UC-LS-01` | Buyer / Guest |
| Agent | `/uc/UC-AN-01` | Sale / Agency |
| Admin | `/uc/UC-UX-03` | Platform Ops |
| Developer | `/developer` | Chủ đầu tư |
| Finance | `/uc/UC-PAY-02` | Finance Admin |
| Buyer | `/uc/UC-PAY-01` | Buyer payment |
| Auth | `/uc/UC-ID-03` | Đăng nhập |
| **Agent Mobile** | `/agent/mobile` · `apps/mobile/` | UC-UX-01 native |

## Design system v2.1

- **Tokens:** `src/config/designTokens.ts`
- **Spec:** `docs/specs/WEREAL-Design-System-Spec.md`
- **Figma export:** `design-tokens/figma/` — `cd ../scripts && python3 export_figma_tokens.py`
- **Brand:** Primary `#0F4C81`, Accent `#C9A227`
- **Typography:** Inter + Be Vietnam Pro

## Roadmap production

Prototype ≠ production. Ưu tiên vận hành: `Ke-hoach-du-an.md` §13 · `Pham-vi-cong-viec.md` §13 · `Tieu-chi-chap-nhan.md` §14

**Vertical slice P0:** GR → listing → book → pay → ledger → 1 commission line.

## Build

```bash
npm run build
```
