import { randomBytes } from 'crypto';
import type { QueryRunner, Repository } from 'typeorm';
import type { SignatureEventEntity } from '../../database/entities/signature-event.entity';
import { readConfiguredPositiveInt, safeSignatureMetadata } from './esign-otp-policy';
import type { PreparedContractSignature } from './booking-contract.service';
import type { ContractSignClaims } from './contract-sign-token';

export const ESIGN_VAULT_RETRY_MAX_ATTEMPTS_ENV = 'ESIGN_VAULT_RETRY_MAX_ATTEMPTS';
export const ESIGN_VAULT_RETRY_INTERVAL_SECONDS_ENV = 'ESIGN_VAULT_RETRY_INTERVAL_SECONDS';

export const PENDING_SIGNED_WITHOUT_VAULT_SQL = `
SELECT s."id" AS signer_id, s."tenant_id" AS tenant_id, s."jti" AS jti, s."channel" AS channel,
       s."subject_id" AS subject_id, r."id" AS request_id, r."contract_id" AS contract_id
FROM "signature_signers" s
INNER JOIN "signature_requests" r ON r."id" = s."request_id" AND r."tenant_id" = s."tenant_id"
WHERE s."status" = 'SIGNED' AND r."signed_pdf_document_id" IS NULL
`;

export const TRY_VAULT_REQUEST_LOCK_SQL = `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired`;

export type PendingVaultRow = {
  signer_id: string;
  tenant_id: string;
  jti: string;
  channel: string;
  subject_id: string | null;
  request_id: string;
  contract_id: string;
};

export type VaultRetryLimits = {
  maxAttempts: number;
  intervalSeconds: number;
};

export function vaultRetryLeaderTtlSec(intervalSeconds: number): number {
  return Math.max(120, intervalSeconds + 30);
}

export function vaultRetryLockKey(row: PendingVaultRow): string {
  return `esign-vault:${row.tenant_id}:${row.request_id}`;
}

export function readVaultRetryLimits(read: (key: string) => string | undefined): VaultRetryLimits | null {
  const maxAttempts = readConfiguredPositiveInt(read, ESIGN_VAULT_RETRY_MAX_ATTEMPTS_ENV);
  const intervalSeconds = readConfiguredPositiveInt(read, ESIGN_VAULT_RETRY_INTERVAL_SECONDS_ENV);
  if (maxAttempts === null || intervalSeconds === null) return null;
  return { maxAttempts, intervalSeconds };
}

export function decideVaultRetry(input: {
  attempts: number;
  lastAttemptMs: number | null;
  now: number;
  limits: VaultRetryLimits;
}): 'run' | 'cooling' | 'exhausted' {
  if (input.attempts >= input.limits.maxAttempts) return 'exhausted';
  if (input.lastAttemptMs !== null && input.now < input.lastAttemptMs + input.limits.intervalSeconds * 1000) {
    return 'cooling';
  }
  return 'run';
}

export async function retryMissingVaultUploads(input: {
  now?: number;
  limits: VaultRetryLimits;
  pending: PendingVaultRow[];
  events: Repository<SignatureEventEntity>;
  contracts: {
    rebuildPendingSignature: (claims: ContractSignClaims) => Promise<PreparedContractSignature>;
    finishSignedVault: (prepared: PreparedContractSignature, runner?: QueryRunner) => Promise<unknown>;
    sendCompletionCopyAfterCommit?: (prepared: PreparedContractSignature, documentId: string) => Promise<void>;
  };
  lockRequest?: (row: PendingVaultRow, work: (runner: QueryRunner) => Promise<void>) => Promise<'ok' | 'busy'>;
  onRow?: () => Promise<boolean>;
}): Promise<{ attempted: number; stored: number }> {
  const now = input.now ?? Date.now();
  let attempted = 0;
  let stored = 0;
  for (const row of input.pending) {
    if (input.onRow && !(await input.onRow())) break;
    const history = await input.events.find({
      where: { tenantId: row.tenant_id, requestId: row.request_id, signerId: row.signer_id, action: 'VAULT_RETRY' },
      order: { occurredAt: 'ASC' },
    });
    const decision = decideVaultRetry({
      attempts: history.length,
      lastAttemptMs: history.length ? history[history.length - 1]!.occurredAt.getTime() : null,
      now,
      limits: input.limits,
    });
    if (decision !== 'run') continue;
    attempted += 1;
    try {
      let prepared: PreparedContractSignature | undefined;
      const work = async (runner?: QueryRunner) => {
        prepared = await input.contracts.rebuildPendingSignature({
          tenantId: row.tenant_id,
          contractId: row.contract_id,
          buyerId: row.subject_id ?? '',
          signerId: row.signer_id,
          requestId: row.request_id,
          jti: row.jti,
          channel: row.channel === 'EMAIL' || row.channel === 'ZALO' ? row.channel : 'SMS',
          exp: now,
        });
        await input.contracts.finishSignedVault(prepared, runner);
      };
      const outcome = input.lockRequest ? await input.lockRequest(row, work) : ((await work()), 'ok');
      if (outcome === 'busy') {
        attempted -= 1;
        continue;
      }
      stored += 1;
      await recordRetry(input.events, row, now, true);
      const copyId = prepared?.completionCopyDocumentId;
      if (input.lockRequest && copyId) {
        await input.contracts.sendCompletionCopyAfterCommit?.(prepared!, copyId);
      }
    } catch {
      await recordRetry(input.events, row, now, false);
    }
  }
  return { attempted, stored };
}

export async function lockVaultRetryRequest(
  runner: QueryRunner,
  row: PendingVaultRow,
): Promise<boolean> {
  const result = (await runner.query(TRY_VAULT_REQUEST_LOCK_SQL, [vaultRetryLockKey(row)])) as Array<{
    acquired: boolean | string | number;
  }>;
  const flag = result[0]?.acquired;
  return flag === true || flag === 't' || flag === 1;
}

async function recordRetry(
  events: Repository<SignatureEventEntity>,
  row: PendingVaultRow,
  now: number,
  ok: boolean,
): Promise<void> {
  await events.save(
    events.create({
      id: `sev_${randomBytes(8).toString('hex')}`,
      tenantId: row.tenant_id,
      requestId: row.request_id,
      signerId: row.signer_id,
      action: 'VAULT_RETRY',
      ip: null,
      userAgent: null,
      occurredAt: new Date(now),
      channel: row.channel,
      metadata: safeSignatureMetadata({ ok }),
    }),
  );
}
