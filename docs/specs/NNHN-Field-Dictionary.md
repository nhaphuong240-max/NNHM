# Từ điển trường — Lead · Viewing · Registration · SavedSearch

> **Mã:** NNHN-FLD-001 v1.0 · **Wave 0 BA-01**

PII class: **P0** public-safe · **P1** partner scoped · **P2** restricted · **P3** platform audit only.

## Lead (`leads`)

| Field | Type | Req | PII | Retention | Ghi chú |
|---|---|---|---|---|---|
| `id` | string | Y | — | life+7y | `ld_*` |
| `tenantId` | string | Y | — | life | |
| `fullName` | string | Y | P1 | life+7y | Mask khi export sàn khác |
| `phone` | string | Y | P1 | life+7y | Normalize E.164 VN logic |
| `email` | string | N | P1 | life+7y | |
| `source` | string | Y | — | life | `PUBLIC_FORM`, `ZALO_OA`, … |
| `status` | enum | Y | — | life | Pipeline 7 stage |
| `tier` | enum | Y | — | life | HOT/WARM/NEW |
| `score` | int | Y | — | life | rules-v1 |
| `inquiryType` | string | N | — | life | buy/rent/project |
| `projectId` | string | N | — | life | |
| `unitId` | string | N | — | life | Bắt buộc khi BOOKING |
| `requirement` | jsonb | N | P1 | life | budget, timeline, loan |
| `consentGiven` | bool | Y* | — | life | *Public form |
| `privacyPolicyVersion` | string | Y* | — | life | e.g. `2026-07-01` |
| `marketingConsent` | bool | N | — | life | |
| `utmCampaign` | string | N | — | life | Attribution |
| `lostReason` | enum | N | — | life | Bắt buộc khi LOST |
| `assignedTo` | userId | N | — | life | |
| `routingStatus` | enum | Y | — | life | PENDING/ASSIGNED/CLOSED |

## Viewing (`crm_viewings`)

| Field | Type | Req | PII | Retention | Ghi chú |
|---|---|---|---|---|---|
| `id` | string | Y | — | life+7y | `vw_*` |
| `leadId` | string | Y | — | life | FK lead |
| `unitId` | string | N | — | life | |
| `projectId` | string | N | — | life | |
| `requestedSlot` | timestamptz | N | — | life | NULL = CALLBACK |
| `mode` | enum | Y | — | life | TIMESLOT/CALLBACK |
| `status` | enum | Y | — | life | REQUESTED→… |
| `outcome` | enum | N | P1 | life | Bắt buộc khi COMPLETED |
| `assignedTo` | userId | N | — | life | Agent confirm |
| `note` | text | N | P1 | life | |

## Lead registration (`lead_registrations`)

| Field | Type | Req | PII | Retention | Ghi chú |
|---|---|---|---|---|---|
| `id` | string | Y | — | life+7y | `lr_*` |
| `phoneNormalized` | string | Y | P1 | life | Dedup key + project |
| `fullName` | string | Y | P1 | life | Mask ABAC |
| `phone` | string | Y | P1 | life | Display format |
| `projectId` | string | Y | — | life | Scope bảo vệ |
| `registeredBy` | userId | Y | — | life | Agent |
| `registeredByOrgId` | string | N | — | life | **Wave 0 ABAC** |
| `status` | enum | Y | — | life | ACCEPTED, EXISTING_PROTECTED, CONFLICT, … |
| `protectedUntil` | timestamptz | Y | — | life | TTL 30 ngày default |
| `intent` | string | Y | — | life | buy/rent |

## Saved search (`saved_searches`)

| Field | Type | Req | PII | Retention | Ghi chú |
|---|---|---|---|---|---|
| `id` | string | Y | — | 2y | `ss_*` |
| `visitorId` | string | Y | P0 | 2y | Cookie local; P0-S2 → `userId` |
| `intent` | string | Y | — | 2y | |
| `q` | string | N | — | 2y | |
| `filters` | jsonb | N | — | 2y | district, PN, price |
| `alertFrequency` | enum | Y | — | 2y | none/daily/instant |
| `marketingConsent` | bool | Y | — | 2y | Alert worker |

## Tenant demand policy (`tenant_demand_policies`)

| Field | Type | Req | Ghi chú |
|---|---|---|---|
| `tenantId` | PK | Y | |
| `version` | int | Y | Tăng mỗi PATCH |
| `payload` | jsonb | Y | `TenantDemandPolicyPayload` — SLA, DP, search freshness |
| `updatedBy` | userId | N | Audit |

API: `GET/PATCH /crm/demand-policy` · Default: `demand-policy.types.ts`.
