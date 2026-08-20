# KYC module (UC-ID-05 · BR-23)

Payout eligibility gate — KYC/KYB phải `APPROVED` trước khi duyệt chi HH hoặc chạy settlement.

## Entity

`kyc_profiles` — `(tenantId, subjectType, subjectId)` unique

| subjectType | Áp dụng |
|-------------|---------|
| USER | Agent / co-broker (`recipientType` AGENT, USER) |
| AGENCY | Agency split lines |
| TENANT | Reserved — developer KYB |

Không có profile → mặc định `PENDING` (chặn payout).

## API

| Method | Path |
|--------|------|
| GET | `/kyc/profiles` |
| GET | `/kyc/profiles/:subjectType/:subjectId` |
| POST | `/kyc/profiles/:subjectType/:subjectId/approve` |
| POST | `/kyc/profiles/:subjectType/:subjectId/reject` |

## Integration

`CommissionSettlementService` gọi `KycService.assertEntriesPayoutEligible()` tại:

1. `POST /commission/lines/approve`
2. `POST /commission/settlement/runs`

Lỗi `422` + `code: KYC_PAYOUT_BLOCKED` + danh sách `blocked[]`.

## Seed

- `usr_agent_01` → APPROVED
- `agcy_sunrise` → PENDING (demo chặn `ce_settle02`)
