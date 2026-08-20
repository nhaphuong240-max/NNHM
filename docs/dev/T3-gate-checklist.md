# Tier 3 Gate Checklist (Tier 2 → Scale)

Gate bắt buộc trước khi mở Tier 3 Scale.

## Tier 2 prerequisites

| Gate | Verify |
|------|--------|
| T2-G1→G5 | [Sprint-Backlog-T2.md](./Sprint-Backlog-T2.md) |
| Trust UAT | `./scripts/uat-t2-trust.sh` |
| Config v2-only | `CONFIG_PLATFORM_READ=v2` on staging |
| P3 smoke | `./scripts/smoke-p3-ci.sh` |

## Automated gate

```bash
chmod +x scripts/verify-t3-gate.sh
./scripts/verify-t3-gate.sh
```

**Pass when:** Tier 2 gate green + API unit tests pass + Tier 3 module endpoints reachable.
