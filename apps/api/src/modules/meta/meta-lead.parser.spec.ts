import { normalizeVnPhone, parseMetaFieldData } from './meta-lead.parser';

describe('meta-lead.parser', () => {
  it('parses standard Meta field_data', () => {
    const parsed = parseMetaFieldData([
      { name: 'full_name', values: ['Nguyễn Meta Test'] },
      { name: 'phone_number', values: ['0901234567'] },
      { name: 'email', values: ['meta@test.vn'] },
    ]);

    expect(parsed.fullName).toBe('Nguyễn Meta Test');
    expect(parsed.phone).toBe('+84901234567');
    expect(parsed.email).toBe('meta@test.vn');
  });

  it('normalizes VN phone formats', () => {
    expect(normalizeVnPhone('84987654321')).toBe('+84987654321');
    expect(normalizeVnPhone('+84911223344')).toBe('+84911223344');
  });
});
