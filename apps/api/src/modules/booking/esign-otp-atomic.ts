/** Conditional updates. affected is the number of returned rows, and it must be 1. */

export const SELECT_SCOPED_CHALLENGES_SQL = `
SELECT c."id" AS id, c."jti" AS jti, c."otp_hash" AS otp_hash, c."attempts" AS attempts,
       c."locked_until" AS locked_until, c."locked_indefinitely" AS locked_indefinitely,
       c."consumed_at" AS consumed_at, c."expires_at" AS expires_at, c."created_at" AS created_at
FROM "otp_challenges" c
WHERE c."tenant_id" = $1 AND c."jti" = $2
FOR UPDATE
`;

export const SELECT_SIGNER_BUDGET_SQL = `
SELECT c."id" AS id, c."jti" AS jti, c."otp_hash" AS otp_hash, c."attempts" AS attempts,
       c."locked_until" AS locked_until, c."locked_indefinitely" AS locked_indefinitely,
       c."consumed_at" AS consumed_at, c."expires_at" AS expires_at, c."created_at" AS created_at
FROM "otp_challenges" c
INNER JOIN "signature_requests" r ON r."id" = c."request_id"
INNER JOIN "signature_signers" s ON s."id" = c."signer_id"
WHERE c."tenant_id" = $1 AND r."contract_id" = $2 AND s."subject_id" = $3
`;

export const UPDATE_ATTEMPT_SQL = `
UPDATE "otp_challenges"
SET "attempts" = $2, "locked_until" = $3, "locked_indefinitely" = $4
WHERE "id" = $1 AND "tenant_id" = $5 AND "consumed_at" IS NULL
  AND "locked_indefinitely" = false
  AND ("locked_until" IS NULL OR "locked_until" <= now())
  AND ("attempts" < $6 OR ("locked_until" IS NOT NULL AND "locked_until" <= now()))
  AND "attempts" = $7
RETURNING "id"
`;

export const CONSUME_OTP_SQL = `
UPDATE "otp_challenges"
SET "consumed_at" = now()
WHERE "id" = $1 AND "tenant_id" = $2 AND "consumed_at" IS NULL
RETURNING "id"
`;

export const MARK_SIGNER_SIGNED_SQL = `
UPDATE "signature_signers"
SET "status" = 'SIGNED', "signed_at" = $4, "consent_at" = $4, "signature_ref" = $5, "display_name" = $6
WHERE "id" = $1 AND "tenant_id" = $2 AND "request_id" = $3 AND "status" <> 'SIGNED'
RETURNING "id"
`;

export const MARK_REQUEST_SIGNED_SQL = `
UPDATE "signature_requests"
SET "status" = 'SIGNED'
WHERE "id" = $1 AND "tenant_id" = $2 AND "status" <> 'SIGNED'
RETURNING "id"
`;

export const LOCK_REQUEST_DOCUMENT_SQL = `
SELECT "signed_pdf_document_id"
FROM "signature_requests"
WHERE "id" = $1 AND "tenant_id" = $2
FOR UPDATE
`;

export const SET_REQUEST_DOCUMENT_SQL = `
UPDATE "signature_requests"
SET "signed_pdf_document_id" = $3
WHERE "id" = $1 AND "tenant_id" = $2 AND "signed_pdf_document_id" IS NULL
RETURNING "id"
`;

export const CLAIM_TICKET_SQL = `
UPDATE "signature_signers"
SET "jti_consumed_at" = now()
WHERE "jti" = $1 AND "tenant_id" = $2 AND "jti_consumed_at" IS NULL
RETURNING "id"
`;

export const COUNT_SENDS_SQL = `
SELECT (
  (SELECT COUNT(*)::int
   FROM "otp_challenges" c
   INNER JOIN "signature_requests" r ON r."id" = c."request_id"
   INNER JOIN "signature_signers" s ON s."id" = c."signer_id"
   WHERE c."tenant_id" = $1 AND r."contract_id" = $2 AND s."subject_id" = $3)
  +
  (SELECT COUNT(*)::int
   FROM "email_deliveries" e
   WHERE e."tenant_id" = $1 AND e."source_type" = 'ESIGN_LINK' AND e."source_id" LIKE $4)
  +
  (SELECT COUNT(*)::int
   FROM "sms_deliveries" d
   WHERE d."tenant_id" = $1 AND d."source_type" = 'ESIGN_LINK' AND d."source_id" LIKE $4)
)::int AS sends
`;

export const VOID_OPEN_TICKETS_SQL = `
UPDATE "signature_signers" s
SET "jti_consumed_at" = now()
FROM "signature_requests" r
WHERE s."request_id" = r."id"
  AND s."tenant_id" = $1
  AND r."contract_id" = $2
  AND s."subject_id" = $3
  AND s."jti_consumed_at" IS NULL
  AND s."status" <> 'SIGNED'
RETURNING s."id", s."jti"
`;

export const LATEST_LINK_SQL = `
SELECT e."created_at" AS created_at, e."status" AS status, e."source_id" AS source_id
FROM "email_deliveries" e
WHERE e."tenant_id" = $1 AND e."source_type" = 'ESIGN_LINK' AND e."source_id" LIKE $2
UNION ALL
SELECT d."created_at" AS created_at, d."status" AS status, d."source_id" AS source_id
FROM "sms_deliveries" d
WHERE d."tenant_id" = $1 AND d."source_type" = 'ESIGN_LINK' AND d."source_id" LIKE $2
ORDER BY created_at DESC
LIMIT 1
`;

export const ADVISORY_LOCK_SQL = `SELECT pg_advisory_lock(hashtext($1))`;
export const ADVISORY_UNLOCK_SQL = `SELECT pg_advisory_unlock(hashtext($1))`;

export function returnedRows(result: unknown): unknown[] {
  if (!Array.isArray(result)) return [];
  // TypeORM's Postgres driver returns [rows, rowCount] for UPDATE and DELETE.
  if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as unknown[];
  }
  return result;
}
