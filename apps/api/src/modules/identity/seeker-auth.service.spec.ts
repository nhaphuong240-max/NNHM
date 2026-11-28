import { liveRailsFromEnv } from '../tenant-config/live-rails.util';
import { SeekerAuthService } from './seeker-auth.service';

describe('seeker OTP sandbox rails', () => {
  const emptySms = {
    get: (key: string, fallback?: string) => (key === 'SMS_SANDBOX' ? '' : fallback),
  };

  it('keeps seeker OTP in sandbox when SMS_SANDBOX is empty', async () => {
    const rails = liveRailsFromEnv(emptySms);
    expect(rails.smsSandbox).toBe(true);
    const sendSms = jest.fn(async () => ({ status: 'SENT', otp: '123456', sandbox: true }));
    const svc = new SeekerAuthService(
      { save: jest.fn(async (row: unknown) => row) } as never,
      {} as never,
      {} as never,
      {} as never,
      { resolve: jest.fn(async () => rails) } as never,
      { sendSms } as never,
      { query: jest.fn(async () => [{ found: 1 }]) } as never,
    );
    const result = await svc.requestOtp('ten_b', '0901234567', undefined, 'entry');
    expect(sendSms).toHaveBeenCalled();
    expect(result.data.sandboxHint).toBeTruthy();
  });
});
