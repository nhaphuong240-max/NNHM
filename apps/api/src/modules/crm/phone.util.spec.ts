import { normalizePhone, phonesMatch, toE164Vn } from './phone.util';

describe('phone.util', () => {
  it('normalizes +84 and 84 prefixes to 0xxxxxxxxx', () => {
    expect(normalizePhone('+84901234567')).toBe('0901234567');
    expect(normalizePhone('84901234567')).toBe('0901234567');
    expect(normalizePhone('0901234567')).toBe('0901234567');
  });

  it('matches equivalent phone forms', () => {
    expect(phonesMatch('+84 901 234 567', '0901234567')).toBe(true);
    expect(phonesMatch('0901234567', '0912345678')).toBe(false);
  });

  it('accepts VN mobiles as E.164', () => {
    expect(toE164Vn('0901234567')).toBe('+84901234567');
    expect(toE164Vn('+84 901 234 567')).toBe('+84901234567');
    expect(toE164Vn('123')).toBeNull();
  });
});
