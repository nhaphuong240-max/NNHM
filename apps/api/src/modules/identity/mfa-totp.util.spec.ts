import { generateTotp, verifyTotp } from './mfa-totp.util';

describe('mfa-totp.util', () => {
  const secret = 'JBSWY3DPEHPK3PXP';

  it('generates 6-digit codes', () => {
    const code = generateTotp(secret, 30, 59 * 1000);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies matching token in window', () => {
    const at = 1_590_000_000_000;
    const code = generateTotp(secret, 30, at);
    expect(verifyTotp(secret, code, 1, at)).toBe(true);
    expect(verifyTotp(secret, '000000', 0, at)).toBe(false);
  });
});
