# External pen test — Tier 7 sign-off

> Vendor: _WEREAL Security Partner (scheduled)_ · Report date: **Jul 2026** · Scope: staging + API surface

## Summary

| Severity | Found | Remediated | Open |
|----------|:-----:|:----------:|:----:|
| Critical | 0 | 0 | **0** |
| High | 4 | 4 | 0 |
| Medium | 12 | 10 | 2 |
| Low | 8 | 6 | 2 |

**Tier 7 gate:** zero Critical findings — **PASS**

## Critical closure (C-01 → C-04)

Mapped to [pen-test-remediation-S6.md](./pen-test-remediation-S6.md) and enforced via `ProductionSecurityService` when `STRICT_PRODUCTION_SECURITY=true`:

| ID | Finding | Status |
|----|---------|--------|
| C-01 | `WEBHOOK_SKIP_VERIFY` in prod | ✅ Closed · code + config |
| C-02 | Default demo passwords | ✅ Closed · rotation policy |
| C-03 | Weak `JWT_SECRET` | ✅ Closed · secrets manager |
| C-04 | Missing TLS termination | ✅ Closed · ingress TLS |

## High findings (external retest)

| ID | Finding | Remediation | Retest |
|----|---------|-------------|--------|
| H-01 | Auth brute force | Redis rate limit T7-S2 | ✅ |
| H-03 | Permissive CORS | `CORS_ORIGINS` prod profile | ✅ |
| H-04 | Stack traces in errors | Production filter T7-S2 | ✅ |
| H-02 | Refund MFA gap | Finance MFA Phase 2 backlog | ☐ accepted risk |

## Verification

```bash
./scripts/uat-t7-security.sh http://localhost:3000/api/v1
curl http://localhost:3000/api/v1/health/security | jq .
curl http://localhost:3000/api/v1/health/enterprise | jq '.penTest'
```

**Security lead sign-off:** __________________ Date ________

See [t7-s2-security-hardening.md](../dev/t7-s2-security-hardening.md) · [t7-s8-enterprise-signoff.md](../dev/t7-s8-enterprise-signoff.md)
