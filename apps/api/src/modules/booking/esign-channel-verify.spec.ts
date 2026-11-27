import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ESIGN_OTP_MAX_ATTEMPTS_ENV, ESIGN_OTP_PEPPER_ENV, hashChannelDest } from './esign-otp-policy';
import { SignerChannelVerificationService } from './signer-channel-verification.service';

const PEPPER = 'esign-otp-pepper-16';
const PHONE = '+84901234567';
const EMAIL = 'trang@example.com';

function config(extra: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    [ESIGN_OTP_PEPPER_ENV]: PEPPER,
    [ESIGN_OTP_MAX_ATTEMPTS_ENV]: '4',
    EMAIL_SANDBOX: 'true',
    NODE_ENV: 'test',
    ...extra,
  };
  return { get: (key: string) => env[key] };
}

describe('signer channel verification', () => {
  it('emails the CRM lead then marks SMS and EMAIL verified', async () => {
    const saved: Array<Record<string, unknown>> = [];
    const send = jest.fn(async () => ({ status: 'SENT', deliveryId: 'eml_1', sandbox: true }));
    const service = new SignerChannelVerificationService(
      {
        findOne: jest.fn(async () => ({ id: 'ld_01', phone: PHONE, email: EMAIL })),
        find: jest.fn(async () => []),
      } as never,
      {
        findOne: jest.fn(async () => saved.find((row) => row.status === 'VERIFIED') ?? saved[0] ?? null),
        save: jest.fn(async (row: Record<string, unknown>) => {
          saved.push(row);
          return row;
        }),
      } as never,
      { send, assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      config() as never,
    );
    const started = await service.start('ten_b', '0901234567');
    expect(started.sent).toBe(true);
    expect(JSON.stringify(started)).not.toContain(EMAIL);
    expect(send).toHaveBeenCalledTimes(1);
    expect((send.mock.calls[0] as unknown as [string, { to: string }])[1].to).toBe(EMAIL);
    await service.confirm('ten_b', started.id, '123456');
    await service.assertVerified('ten_b', 'SMS', PHONE);
    await service.assertVerified('ten_b', 'EMAIL', EMAIL);
  });

  it('refuses an unknown phone without sending', async () => {
    const send = jest.fn();
    const service = new SignerChannelVerificationService(
      { findOne: jest.fn(async () => null), find: jest.fn(async () => []) } as never,
      { findOne: jest.fn(), save: jest.fn() } as never,
      { send, assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      config() as never,
    );
    await expect(service.start('ten_b', '0900000000')).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(send).not.toHaveBeenCalled();
  });

  it('404s confirm for another tenant', async () => {
    const service = new SignerChannelVerificationService(
      { findOne: jest.fn(), find: jest.fn() } as never,
      { findOne: jest.fn(async () => null), save: jest.fn() } as never,
      { send: jest.fn(), assertReady: jest.fn(), isSandbox: jest.fn(() => true) } as never,
      config() as never,
    );
    await expect(service.confirm('ten_other', 'scv_x', '123456')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hashes the same dest the send path uses', () => {
    expect(hashChannelDest(PHONE, PEPPER)).not.toBe(hashChannelDest(EMAIL, PEPPER));
  });
});
