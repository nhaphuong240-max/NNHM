import { UnprocessableEntityException } from '@nestjs/common';
import {
  decideVaultRetry,
  readVaultRetryLimits,
  retryMissingVaultUploads,
  ESIGN_VAULT_RETRY_INTERVAL_SECONDS_ENV,
  ESIGN_VAULT_RETRY_MAX_ATTEMPTS_ENV,
  type PendingVaultRow,
} from './esign-vault-retry';
import { EsignVaultRetryJob } from './esign-vault-retry.job';

const pending: PendingVaultRow = {
  signer_id: 'ssgn_1',
  tenant_id: 'ten_b',
  jti: 'jti_1',
  channel: 'SMS',
  subject_id: 'usr_buyer',
  request_id: 'sreq_1',
  contract_id: 'ctr_b',
};

describe('esign vault retry', () => {
  it('does not invent limits when env is empty', () => {
    expect(readVaultRetryLimits(() => undefined)).toBeNull();
    expect(readVaultRetryLimits(() => '')).toBeNull();
    expect(readVaultRetryLimits(() => '0')).toBeNull();
  });

  it('skips the job when env is empty', async () => {
    const query = jest.fn();
    const job = new EsignVaultRetryJob(
      { get: () => undefined } as never,
      { rebuildPendingSignature: jest.fn(), finishSignedVault: jest.fn() } as never,
      { find: jest.fn(), save: jest.fn(), create: jest.fn() } as never,
      { query } as never,
      { isLeader: jest.fn(async () => true) } as never,
    );
    const result = await job.run();
    expect(result).toEqual({ ran: false, attempted: 0, stored: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it('retries a failed first upload and stores once', async () => {
    const stored: string[] = [];
    let fail = true;
    const finishSignedVault = jest.fn(async () => {
      if (fail) {
        fail = false;
        throw new UnprocessableEntityException({ detail: 'signed document was not stored' });
      }
      stored.push('doc_1');
      return { data: { attributes: { documentId: 'doc_1' } } };
    });
    const events: Array<{ action: string; occurredAt: Date }> = [];
    const repo = {
      find: jest.fn(async () => events.map((row) => ({ ...row }))),
      create: (row: { action: string }) => row,
      save: jest.fn(async (row: { action: string }) => {
        events.push({ action: row.action, occurredAt: new Date() });
        return row;
      }),
    };
    const first = await retryMissingVaultUploads({
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts: {
        rebuildPendingSignature: jest.fn(async () => ({ contractId: 'ctr_b' })),
        finishSignedVault,
      } as never,
    });
    expect(first).toEqual({ attempted: 1, stored: 0 });
    expect(stored).toHaveLength(0);

    const second = await retryMissingVaultUploads({
      now: Date.now() + 2_000,
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [pending],
      events: repo as never,
      contracts: {
        rebuildPendingSignature: jest.fn(async () => ({ contractId: 'ctr_b' })),
        finishSignedVault,
      } as never,
    });
    expect(second).toEqual({ attempted: 1, stored: 1 });
    expect(stored).toHaveLength(1);

    const third = await retryMissingVaultUploads({
      now: Date.now() + 4_000,
      limits: { maxAttempts: 3, intervalSeconds: 1 },
      pending: [],
      events: repo as never,
      contracts: {
        rebuildPendingSignature: jest.fn(),
        finishSignedVault,
      } as never,
    });
    expect(third).toEqual({ attempted: 0, stored: 0 });
    expect(finishSignedVault).toHaveBeenCalledTimes(2);
    expect(stored).toHaveLength(1);
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
