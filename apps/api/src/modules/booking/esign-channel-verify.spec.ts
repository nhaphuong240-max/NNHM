import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  ESIGN_OTP_LEAD_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_MAX_SENDS_ENV,
  ESIGN_OTP_PEPPER_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
  hashChannelDest,
} from './esign-otp-policy';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

const PEPPER = 'esign-otp-pepper-16';
const PHONE = '+84901234567';
const EMAIL = 'trang@example.com';
const CLOSED = 'signer channel destination is not registered';

function config(extra: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    [ESIGN_OTP_PEPPER_ENV]: PEPPER,
    [ESIGN_OTP_MAX_ATTEMPTS_ENV]: '2',
    [ESIGN_OTP_LEAD_MAX_ATTEMPTS_ENV]: '4',
    [ESIGN_OTP_MAX_SENDS_ENV]: '4',
    [ESIGN_OTP_LOCKOUT_ENV]: '60',
    [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
    EMAIL_SANDBOX: 'true',
    NODE_ENV: 'test',
    ...extra,
  };
  return { get: (key: string) => env[key] };
}

function claimManager(saved: Array<Record<string, unknown>>, maxAttempts = 2, leadMax = 4) {
  return {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      if (!String(sql).includes('signer_channel_verifications') || !String(sql).includes('UPDATE')) {
        return [];
      }
      const id = String(params[0]);
      const row = saved.find((item) => item.id === id) as
        | {
            id: string;
            status: string;
            attemptCount: number;
            codeHash: string | null;
            emailDestMasked: string;
            leadId: string;
            lockedUntil: Date | null;
            expiresAt: Date;
          }
        | undefined;
      if (!row || row.status !== 'PENDING') return [];
      if (row.expiresAt.getTime() <= Date.now()) return [];
      const failedTotal = saved
        .filter((item) => item.status !== 'VERIFIED')
        .reduce((sum, item) => sum + Number(item.attemptCount ?? 0), 0);
      if (row.attemptCount >= maxAttempts || failedTotal >= leadMax) return [];
      row.attemptCount += 1;
      const lockedUntil = row.attemptCount >= maxAttempts ? new Date() : row.lockedUntil;
      row.lockedUntil = lockedUntil;
      return [
        {
          id: row.id,
          attempt_count: row.attemptCount,
          code_hash: row.codeHash,
          email_dest_masked: row.emailDestMasked,
          lead_id: row.leadId,
          locked_until: lockedUntil,
        },
      ];
    }),
  };
}

function service(opts: { leads?: unknown; rows?: unknown; send?: jest.Mock; extraConfig?: Record<string, string | undefined> }) {
  return new SignerChannelVerificationService(
    (opts.leads ?? {
      findOne: jest.fn(async () => ({ id: 'ld_01', phone: PHONE, email: EMAIL })),
      find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: EMAIL }]),
    }) as never,
    (opts.rows ?? {
      findOne: jest.fn(async () => null),
      find: jest.fn(async () => []),
      save: jest.fn(),
      create: (row: Record<string, unknown>) => row,
      manager: { query: jest.fn(async () => []) },
    }) as never,
    {
      send: opts.send ?? jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true })),
      assertReady: jest.fn(),
      isSandbox: jest.fn(() => true),
    } as never,
    config(opts.extraConfig) as never,
  );
}

function memoryRows(saved: Array<Record<string, unknown>>, maxAttempts = 2) {
  return {
    findOne: jest.fn(async (opts?: { where?: { status?: string; id?: string } }) => {
      if (opts?.where?.status === 'VERIFIED') return saved.find((row) => row.status === 'VERIFIED') ?? null;
      if (opts?.where?.id) return saved.find((row) => row.id === opts.where?.id) ?? null;
      return saved.find((row) => row.status === 'VERIFIED') ?? saved[0] ?? null;
    }),
    find: jest.fn(async () => saved),
    create: (row: Record<string, unknown>) => row,
    save: jest.fn(async (row: Record<string, unknown>) => {
      const idx = saved.findIndex((item) => item.id === row.id);
      if (idx >= 0) saved[idx] = { ...saved[idx], ...row };
      else saved.push({ ...row, expiresAt: row.expiresAt ?? new Date(Date.now() + 60_000) });
      return row;
    }),
    manager: claimManager(saved, maxAttempts),
  };
}

describe('signer channel verification', () => {
  it('emails the CRM lead then marks SMS and EMAIL verified', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const svc = service({ send, rows: memoryRows(saved) });
    const started = await svc.start('ten_b', '0901234567');
    expect(started.sent).toBe(true);
    expect(JSON.stringify(started)).not.toContain(EMAIL);
    expect(started.destMasked).toBe('t***@example.com');
    expect(send).toHaveBeenCalledTimes(1);
    await svc.confirm('ten_b', started.id, '123456');
    await svc.assertVerified('ten_b', 'SMS', PHONE, 'ld_01');
    await svc.assertVerified('ten_b', 'EMAIL', EMAIL, 'ld_01');
  });

  it('uses one closed detail when the phone is missing or the lead has no email', async () => {
    const send = jest.fn();
    const missing = service({
      send,
      leads: { findOne: jest.fn(async () => null), find: jest.fn(async () => []) },
    });
    await expect(missing.start('ten_b', '0900000000')).rejects.toMatchObject({ response: { detail: CLOSED } });
    const noEmail = service({
      send,
      leads: { find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: '' }]) },
    });
    await expect(noEmail.start('ten_b', '0901234567')).rejects.toMatchObject({ response: { detail: CLOSED } });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses duplicate CRM phones without sending', async () => {
    const send = jest.fn();
    const svc = service({
      send,
      leads: {
        find: jest.fn(async () => [
          { id: 'ld_01', phone: PHONE, email: EMAIL },
          { id: 'ld_02', phone: '0901234567', email: 'other@example.com' },
        ]),
      },
    });
    await expect(svc.start('ten_b', '0901234567')).rejects.toMatchObject({ response: { detail: CLOSED } });
    expect(send).not.toHaveBeenCalled();
  });

  it('reuses a still-valid PENDING row instead of inserting another', async () => {
    const saved: Array<Record<string, unknown>> = [
      {
        id: 'scv_pending',
        tenantId: 'ten_b',
        leadId: 'ld_01',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 31_000),
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
        emailDestMasked: 't***@example.com',
        smsDestHash: hashChannelDest(PHONE, PEPPER),
        emailDestHash: hashChannelDest(EMAIL, PEPPER),
      },
    ];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const svc = service({ send, rows: memoryRows(saved) });
    const started = await svc.start('ten_b', '0901234567');
    expect(started.id).toBe('scv_pending');
    expect(saved.filter((row) => row.status === 'PENDING')).toHaveLength(1);
    expect(saved[0]?.sendCount).toBe(1);
    expect(saved[0]?.lastSentAt).toBeInstanceOf(Date);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('revokes verification when the lead email changes', async () => {
    const saved: Array<Record<string, unknown>> = [
      {
        id: 'scv_old',
        tenantId: 'ten_b',
        leadId: 'ld_01',
        status: 'VERIFIED',
        smsDestHash: hashChannelDest(PHONE, PEPPER),
        emailDestHash: hashChannelDest(EMAIL, PEPPER),
        emailDestMasked: 't***@example.com',
      },
    ];
    const svc = service({
      leads: {
        findOne: jest.fn(async () => ({ id: 'ld_01', phone: PHONE, email: 'new@example.com' })),
        find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: 'new@example.com' }]),
      },
      rows: memoryRows(saved),
    });
    await expect(svc.assertVerified('ten_b', 'EMAIL', EMAIL, 'ld_01')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(saved[0]?.status).toBe('REVOKED');
  });

  it('locks after too many wrong codes and does not exceed the limit in parallel', async () => {
    const row = {
      id: 'scv_1',
      tenantId: 'ten_b',
      leadId: 'ld_01',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      lockedUntil: null as Date | null,
      lockedIndefinitely: false,
      codeHash: 'not-the-code',
      emailDestMasked: 't***@example.com',
    };
    const saved = [row];
    const svc = service({ rows: memoryRows(saved, 2) });
    await expect(svc.confirm('ten_b', 'scv_1', '000000')).rejects.toMatchObject({
      response: { detail: 'signer channel verification code is invalid' },
    });
    const parallel = await Promise.allSettled(Array.from({ length: 8 }, () => svc.confirm('ten_b', 'scv_1', '000000')));
    expect(row.attemptCount).toBe(2);
    expect(parallel.every((item) => item.status === 'rejected')).toBe(true);
  });

  it('404s confirm for another tenant', async () => {
    const svc = service({
      rows: {
        findOne: jest.fn(async () => null),
        find: jest.fn(async () => []),
        save: jest.fn(),
        create: (row: Record<string, unknown>) => row,
        manager: { query: jest.fn(async () => []) },
      },
    });
    await expect(svc.confirm('ten_other', 'scv_x', '123456')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses start when send limit env is empty', async () => {
    const svc = service({ extraConfig: { [ESIGN_OTP_MAX_SENDS_ENV]: '' } });
    await expect(svc.start('ten_b', '0901234567')).rejects.toMatchObject({
      response: { detail: 'esign otp send limit is not configured' },
    });
  });

  it('uses the closed dest detail for cooldown and does not leak that a lead exists', async () => {
    const saved: Array<Record<string, unknown>> = [
      {
        id: 'scv_pending',
        tenantId: 'ten_b',
        leadId: 'ld_01',
        status: 'PENDING',
        createdAt: new Date(),
        lastSentAt: new Date(),
        sendCount: 1,
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
        emailDestMasked: 't***@example.com',
        smsDestHash: hashChannelDest(PHONE, PEPPER),
        emailDestHash: hashChannelDest(EMAIL, PEPPER),
      },
    ];
    const send = jest.fn();
    const svc = service({ send, rows: memoryRows(saved) });
    await expect(svc.start('ten_b', '0901234567')).rejects.toMatchObject({ response: { detail: CLOSED } });
    expect(send).not.toHaveBeenCalled();
  });

  it('blocks a second start after cooldown because last_sent_at was just refreshed', async () => {
    const saved: Array<Record<string, unknown>> = [
      {
        id: 'scv_pending',
        tenantId: 'ten_b',
        leadId: 'ld_01',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 120_000),
        lastSentAt: new Date(Date.now() - 31_000),
        sendCount: 1,
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
        emailDestMasked: 't***@example.com',
        smsDestHash: hashChannelDest(PHONE, PEPPER),
        emailDestHash: hashChannelDest(EMAIL, PEPPER),
      },
    ];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const svc = service({ send, rows: memoryRows(saved) });
    await expect(svc.start('ten_b', '0901234567')).resolves.toMatchObject({ sent: true });
    expect(send).toHaveBeenCalledTimes(1);
    await expect(svc.start('ten_b', '0901234567')).rejects.toMatchObject({ response: { detail: CLOSED } });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('counts a resend after cooldown toward MAX_SENDS and then blocks', async () => {
    const saved: Array<Record<string, unknown>> = [
      {
        id: 'scv_pending',
        tenantId: 'ten_b',
        leadId: 'ld_01',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 120_000),
        lastSentAt: new Date(Date.now() - 31_000),
        sendCount: 4,
        expiresAt: new Date(Date.now() + 60_000),
        attemptCount: 0,
        emailDestMasked: 't***@example.com',
        smsDestHash: hashChannelDest(PHONE, PEPPER),
        emailDestHash: hashChannelDest(EMAIL, PEPPER),
      },
    ];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const svc = service({ send, rows: memoryRows(saved) });
    await expect(svc.start('ten_b', '0901234567')).rejects.toMatchObject({
      response: { detail: 'esign otp send limit is exhausted' },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses confirm when the lead attempt cap env is empty', async () => {
    const svc = service({ extraConfig: { [ESIGN_OTP_LEAD_MAX_ATTEMPTS_ENV]: '' } });
    await expect(svc.confirm('ten_b', 'scv_1', '123456')).rejects.toMatchObject({
      response: { detail: 'esign otp lead attempt cap is not configured' },
    });
  });

  it('hashes the same dest the send path uses', () => {
    expect(hashChannelDest(PHONE, PEPPER)).not.toBe(hashChannelDest(EMAIL, PEPPER));
  });
});
