# P3-S6 Runbook — Omnichannel SLA + E2E CI (OP-WIN-07)

> **Sprint:** P3-S6 · **Gate:** OP-WIN-07  
> **Tenant:** `ten_dev_01` · **Dashboard:** `/admin/integrations/leads`

## Prerequisites

```bash
cd apps/api && docker compose up -d && npm run start:dev
cd apps/web && npm run dev   # optional UI
```

## Automated verification

```bash
chmod +x scripts/uat-p3-s6.sh scripts/smoke-p3-ci.sh
./scripts/uat-p3-s6.sh
# Full CI gate (P0 + P3):
./scripts/smoke-p3-ci.sh
```

| Task | What the script proves |
|------|-------------------------|
| P3-S6-01 | `GET /portal/admin/omnichannel` · p95 &lt; 30s · `opWin07Pass` |
| P3-S6-02 | Meta simulate → CRM lead · `slaMs` recorded |
| P3-S6-03 | Zalo simulate → same latency panel |
| P3-S6-05 | MFA sandbox OTP (staging: TOTP via `MFA_SANDBOX=false`) |

## Playwright E2E (P3-S6-04)

```bash
cd apps/api && npm run start:prod &   # or start:dev
cd apps/web && npm ci && npm run build
E2E_API_URL=http://localhost:3000/api/v1 npm run test:e2e
```

**5 flows:** search · listing · book · reconcile · settle (+ omnichannel panel)

## Pass criteria

| Check | Expected |
|-------|----------|
| Meta/Zalo `slaMs` | &lt; 30000 on simulate |
| Dashboard `summary.latency.p95Ms` | &lt; 30000 (when samples exist) |
| `summary.opWin07Pass` | `true` |
| MFA dev | `123456` · mode `SANDBOX` |
| MFA staging | `MFA_SANDBOX=false` · TOTP (seed secret on admin) |
| Nightly CI | `smoke-p3-ci.sh` + Playwright green |

## Staging MFA (P3-S6-05)

```bash
# apps/api/.env
MFA_SANDBOX=false
```

Admin seed user `admin@sunrise-dev.vn` has TOTP secret `JBSWY3DPEHPK3PXP` (RFC test vector). Use any authenticator app or:

```bash
# Generate current code (Node one-liner in API repo)
node -e "const c=require('./dist/modules/identity/mfa-totp.util');console.log(c.generateTotp('JBSWY3DPEHPK3PXP'))"
```

Verify:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/mfa/verify \
  -H 'Content-Type: application/json' \
  -d '{"mfaOtp":"<6-digit>","email":"admin@sunrise-dev.vn"}'
```

## Manual demo (PO)

1. **Admin** → `/admin/integrations/meta` → Simulate lead (TC-21)
2. **Admin** → `/admin/integrations/leads` → OP-WIN-07 panel p95 &lt; 30s
3. Unified sync feed shows **SLA ms** column
4. GitHub Actions → Nightly P0 Smoke → green badge

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `sampleCount=0` | Run Meta/Zalo simulate once |
| p95 over 30s | Check failed events; re-seed DB |
| MFA 422 on staging | Pass `email` in body · configure TOTP secret |
| Playwright login fail | API must be up · `E2E_API_URL` set |
| E2E web 404 | Run `npm run build` before `test:e2e` |

## Related

- [Sprint-Backlog-P3.md](./Sprint-Backlog-P3.md)
- [staging-env.md](./staging-env.md)
- [scripts/uat-p3-s6.sh](../../scripts/uat-p3-s6.sh)
- [.github/workflows/nightly-smoke.yml](../../.github/workflows/nightly-smoke.yml)
