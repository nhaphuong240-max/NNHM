# PDPA Consent Ledger

Append-only ledger for consent events across subjects (Tier 2 T2-S2).

## Data model — `consent_ledger_entries`

| Column | Type | Description |
|--------|------|-------------|
| id | varchar | `cns_*` |
| tenant_id | varchar | Tenant scope |
| subject_type | enum | LEAD, USER, BOOKING, CONTRACT |
| subject_id | varchar | Entity id |
| purpose | enum | PRIVACY, MARKETING, ESIGN, DATA_PROCESSING |
| policy_version | varchar | e.g. `2026-07-01` |
| granted | boolean | true = granted, false = revoked |
| channel | varchar | PUBLIC_FORM, BUYER_PORTAL, META, ZALO, … |
| ip_hash | varchar | SHA-256 truncated (optional) |
| actor_id | varchar | User who recorded (nullable for public) |
| recorded_at | timestamptz | Immutable timestamp |

## Hooks (implemented)

- `CrmService.createLead` → PRIVACY + MARKETING when consented
- `BookingContractService.signContract` → ESIGN before signature

## API

- `GET /compliance/consent/:subjectType/:subjectId` — subject history
- `GET /compliance/consent/export?limit=500` — CSV for Legal/Finance

## Retention

- Align with lead/booking retention (10Y contracts, 3Y marketing opt-out proof)
- No UPDATE/DELETE on ledger rows — corrections via new revoke entry

## Audit trail

Each record also appends `consent_ledger` audit event (`CONSENT_GRANTED` / `CONSENT_REVOKED`).
