import { UnprocessableEntityException } from '@nestjs/common';
import {
  decideVaultRetry,
  readVaultRetryLimits,
  retryMissingVaultUploads,
  vaultRetryLeaderTtlSec,
  ESIGN_VAULT_RETRY_INTERVAL_SECONDS_ENV,
  ESIGN_VAULT_RETRY_MAX_ATTEMPTS_ENV,
  type PendingVaultRow,
} from './esign-vault-retry';
import { EsignVaultRetryJob } from './esign-vault-retry.job';
import type { PreparedContractSignature } from './booking-contract.service';

const pending: PendingVaultRow = {
  signer_id: 'ssgn_1',
  tenant_id: 'ten_b',
  jti: 'jti_1',
  channel: 'SMS',
  subject_id: 'usr_buyer',
  request_id: 'sreq_1',
  contract_id: 'ctr_b',
};

function eventRepo() {
  const events: Array<{ action: string; occurredAt: Date }> = [];
  return {
    events,
    repo: {
      find: jest.fn(async () => events.map((row) => ({ ...row }))),
      create: (row: { action: string }) => row,
      save: jest.fn(async (row: { action: string }) => {
        events.push({ action: row.action, occurredAt: new Date() });
        return row;
      }),
    },
  };
}

/** Mirrors putSignedCopy: one object key per contract+signer. */
function idempotentVault() {
  const documents: Array<{ id: string; key: string }> = [];
  let failOnce = false;
  const finishSignedVault = jest.fn(async (prepared: PreparedContractSignature) => {
    if (failOnce) {
      failOnce = false;
      throw new UnprocessableEntityException({ detail: 'signed document was not stored' });
    }
    const key = `booking/${prepared.bookingId}/esign/${prepared.contractId}/${prepared.signerId}_signed.txt`;
    const existing = documents.find((row) => row.key === key);
    if (existing) return { data: { attributes: { documentId: existing.id } } };
    const id = `doc_${documents.length + 1}`;
    documents.push({ id, key });
    return { data: { attributes: { documentId: id } } };
  });
  return {
    documents,
    failFirstUpload() {
      failOnce = true;
    },
    finishSignedVault,
    rebuildPendingSignature: jest.fn(async () => ({
      contractId: 'ctr_b',
      bookingId: 'bk_1',
      signerId: 'ssgn_1',
      requestId: 'sreq_1',
      tenantId: 'ten_b',
      buffer: Buffer.from('signed'),
      fileName: 'ctr_b_ssgn_1_signed.txt',
    })),
  };
}

describe('esign vault retry', () => {
  it('does not invent limits when env is empty', () => {
    expect(readVaultRetryLimits(() => undefined)).toBeNull();
    expect(readVaultRetryLimits(() => '')).toBeNull();
    expect(readVaultRetryLimits(() => '0')).toBeNull();
  });

  it('keeps the leader TTL longer than one retry interval', () => {
    expect(vaultRetryLeaderTtlSec(1)).toBe(120);
    expect(vaultRetryLeaderTtlSec(180)).toBe(210);
  });

  it('skips the job when env is empty', async () => {
    const query = jest.fn();
    const job = new EsignVaultRetryJob(
      { get: () => undefined } as never,
      { rebuildPendingSignature: jest.fn(), finishSignedVault: jest.fn() } as never,
      { find: jest.fn(), save: jest.fn(), create: jest.fn() } as never,
      { query } as never,
      { isLeader: jest.fn(async () => true), renewLeader: jest.fn(async () => true) } as never,
    );
    const result = await job.run();
    expect(result).toEqual({ ran: false, attempted: 0, stored: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it('retries a failed first upload then stores once when the job runs twice with the same pending row', async () => {
    const vault = idempotentVault();
    vault.failFirstUpload();
    const { repo } = eventRepo();
    const contracts = {
      rebuildPendingSignature: vault.rebuildPendingSignature,
      finishSignedVault: vault.finishSignedVault,
    } as never;

    const first = await retryMissingVaultUploads({
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts,
    });
    expect(first).toEqual({ attempted: 1, stored: 0 });
    expect(vault.documents).toHaveLength(0);

    const second = await retryMissingVaultUploads({
      now: Date.now() + 2_000,
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts,
    });
    expect(second).toEqual({ attempted: 1, stored: 1 });
    expect(vault.documents).toHaveLength(1);

    const third = await retryMissingVaultUploads({
      now: Date.now() + 4_000,
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts,
    });
    expect(third).toEqual({ attempted: 1, stored: 1 });
    expect(vault.documents).toHaveLength(1);
    expect(vault.documents.map((row) => row.key)).toEqual(['booking/bk_1/esign/ctr_b/ssgn_1_signed.txt']);
    expect(vault.finishSignedVault).toHaveBeenCalledTimes(3);
  });

  it('skips a request another worker already locked', async () => {
    const vault = idempotentVault();
    const { repo } = eventRepo();
    const result = await retryMissingVaultUploads({
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts: {
        rebuildPendingSignature: vault.rebuildPendingSignature,
        finishSignedVault: vault.finishSignedVault,
      } as never,
      lockRequest: async () => 'busy',
    });
    expect(result).toEqual({ attempted: 0, stored: 0 });
    expect(vault.finishSignedVault).not.toHaveBeenCalled();
    expect(vault.documents).toHaveLength(0);
  });

  it('does not retry inside the cooldown or after the attempt limit', () => {
    expect(
      decideVaultRetry({ attempts: 1, lastAttemptMs: 1_000, now: 1_500, limits: { maxAttempts: 3, intervalSeconds: 1 } }),
    ).toBe('cooling');
    expect(
      decideVaultRetry({ attempts: 3, lastAttemptMs: 1, now: 10_000, limits: { maxAttempts: 3, intervalSeconds: 1 } }),
    ).toBe('exhausted');
    expect(
      decideVaultRetry({ attempts: 0, lastAttemptMs: null, now: 1, limits: { maxAttempts: 3, intervalSeconds: 1 } }),
    ).toBe('run');
  });

  it('reads only configured positive integers', () => {
    expect(
      readVaultRetryLimits((key) => {
        if (key === ESIGN_VAULT_RETRY_MAX_ATTEMPTS_ENV) return '3';
        if (key === ESIGN_VAULT_RETRY_INTERVAL_SECONDS_ENV) return '60';
        return undefined;
      }),
    ).toEqual({ maxAttempts: 3, intervalSeconds: 60 });
  });
});
