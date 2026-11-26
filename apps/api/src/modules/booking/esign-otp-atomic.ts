/** Conditional updates. affected is the number of returned rows, and it must be 1. */

export const SELECT_SCOPED_CHALLENGES_SQL = `
SELECT c."id" AS id, c."jti" AS jti, c."otp_hash" AS otp_hash, c."attempts" AS attempts,
       c."locked_until" AS locked_until, c."locked_indefinitely" AS locked_indefinitely,
       c."consumed_at" AS consumed_at, c."expires_at" AS expires_at, c."created_at" AS created_at
FROM "otp_challenges" c
INNER JOIN "signature_requests" r ON r."id" = c."request_id"
INNER JOIN "signature_signers" s ON s."id" = c."signer_id"
WHERE c."tenant_id" = $1 AND r."contract_id" = $2 AND s."subject_id" = $3
FOR UPDATE
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

export const CLAIM_TICKET_SQL = `
UPDATE "signature_signers"
SET "jti_consumed_at" = now()
WHERE "jti" = $1 AND "tenant_id" = $2 AND "jti_consumed_at" IS NULL
RETURNING "id"
`;

export const COUNT_SENDS_SQL = `
SELECT COUNT(*)::int AS sends
FROM "otp_challenges" c
INNER JOIN "signature_requests" r ON r."id" = c."request_id"
INNER JOIN "signature_signers" s ON s."id" = c."signer_id"
WHERE c."tenant_id" = $1 AND r."contract_id" = $2 AND s."subject_id" = $3
`;

export function returnedRows(result: unknown): unknown[] {
  if (!Array.isArray(result)) return [];
  // TypeORM's Postgres driver returns [rows, rowCount] for UPDATE and DELETE.
  if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0] as unknown[];
  }
  return result;
}
