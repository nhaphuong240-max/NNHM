import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  ESIGN_OTP_LOCKOUT_ENV,
  ESIGN_OTP_MAX_ATTEMPTS_ENV,
  ESIGN_OTP_PEPPER_ENV,
  ESIGN_OTP_RESEND_COOLDOWN_ENV,
  hashChannelDest,
} from './esign-otp-policy';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

const PEPPER = 'esign-otp-pepper-16';
const PHONE = '+84901234567';
const EMAIL = 'trang@example.com';

function config(extra: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    [ESIGN_OTP_PEPPER_ENV]: PEPPER,
    [ESIGN_OTP_MAX_ATTEMPTS_ENV]: '2',
    [ESIGN_OTP_LOCKOUT_ENV]: '60',
    [ESIGN_OTP_RESEND_COOLDOWN_ENV]: '30',
    EMAIL_SANDBOX: 'true',
    NODE_ENV: 'test',
    ...extra,
  };
  return { get: (key: string) => env[key] };
}

function service(opts: {
  leads?: unknown;
  rows?: unknown;
  send?: jest.Mock;
}) {
  return new SignerChannelVerificationService(
    (opts.leads ?? {
      findOne: jest.fn(async () => ({ id: 'ld_01', phone: PHONE, email: EMAIL })),
      find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: EMAIL }]),
    }) as never,
    (opts.rows ?? { findOne: jest.fn(async () => null), find: jest.fn(async () => []), save: jest.fn() }) as never,
    {
      send: opts.send ?? jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true })),
      assertReady: jest.fn(),
      isSandbox: jest.fn(() => true),
    } as never,
    config() as never,
  );
}

describe('signer channel verification', () => {
  it('emails the CRM lead then marks SMS and EMAIL verified', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const svc = service({
      send,
      rows: {
        findOne: jest.fn(async (opts?: { where?: { status?: string; id?: string } }) => {
          if (opts?.where?.status === 'VERIFIED') return saved.find((row) => row.status === 'VERIFIED') ?? null;
          if (opts?.where?.id) return saved.find((row) => row.id === opts.where?.id) ?? null;
          return saved.find((row) => row.status === 'VERIFIED') ?? saved[0] ?? null;
        }),
        find: jest.fn(async () => saved),
        save: jest.fn(async (row: Record<string, unknown>) => {
          const idx = saved.findIndex((item) => item.id === row.id);
          if (idx >= 0) saved[idx] = { ...saved[idx], ...row };
          else saved.push(row);
          return row;
        }),
      },
    });
    const started = await svc.start('ten_b', '0901234567');
    expect(started.sent).toBe(true);
    expect(JSON.stringify(started)).not.toContain(EMAIL);
    expect(started.destMasked).toBe('t***@example.com');
    expect(send).toHaveBeenCalledTimes(1);
    await svc.confirm('ten_b', started.id, '123456');
    await svc.assertVerified('ten_b', 'SMS', PHONE);
    await svc.assertVerified('ten_b', 'EMAIL', EMAIL);
  });

  it('refuses an unknown phone without sending', async () => {
    const send = jest.fn();
    const svc = service({
      send,
      leads: { findOne: jest.fn(async () => null), find: jest.fn(async () => []) },
    });
    await expect(svc.start('ten_b', '0900000000')).rejects.toBeInstanceOf(UnprocessableEntityException);
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
    await expect(svc.start('ten_b', '0901234567')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a lead without email without sending', async () => {
    const send = jest.fn();
    const svc = service({
      send,
      leads: { find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: '' }]) },
    });
    await expect(svc.start('ten_b', '0901234567')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(send).not.toHaveBeenCalled();
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
    const svc = new SignerChannelVerificationService(
      {
        findOne: jest.fn(async () => ({ id: 'ld_01', phone: PHONE, email: 'new@example.com' })),
        find: jest.fn(async () => [{ id: 'ld_01', phone: PHONE, email: 'new@example.com' }]),
      } as never,
      {
        findOne: jest.fn(async () => saved[0]),
        find: jest.fn(async () => saved),
        save: jest.fn(async (row: Record<string, unknown>) => {
          saved[0] = { ...saved[0], ...row };
          return row;
        }),
      } as never,
      { send: jest.fn(), assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      config() as never,
    );
    await expect(svc.assertVerified('ten_b', 'EMAIL', EMAIL)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(saved[0]?.status).toBe('REVOKED');
  });

  it('locks after too many wrong codes', async () => {
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
    const svc = service({
      rows: {
        findOne: jest.fn(async () => row),
        find: jest.fn(async () => []),
        save: jest.fn(async (next: typeof row) => Object.assign(row, next)),
      },
    });
    await expect(svc.confirm('ten_b', 'scv_1', '000000')).rejects.toMatchObject({
      response: { detail: 'signer channel verification code is invalid' },
    });
    await expect(svc.confirm('ten_b', 'scv_1', '000000')).rejects.toMatchObject({
      response: { detail: 'signer channel verification is locked' },
    });
    expect(row.lockedUntil).not.toBeNull();
  });

  it('404s confirm for another tenant', async () => {
    const svc = service({
      rows: { findOne: jest.fn(async () => null), find: jest.fn(async () => []), save: jest.fn() },
    });
    await expect(svc.confirm('ten_other', 'scv_x', '123456')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hashes the same dest the send path uses', () => {
    expect(hashChannelDest(PHONE, PEPPER)).not.toBe(hashChannelDest(EMAIL, PEPPER));
  });
});
