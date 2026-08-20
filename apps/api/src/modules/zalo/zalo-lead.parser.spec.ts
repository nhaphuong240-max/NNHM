import { parseZaloLeadMessage } from './zalo-lead.parser';

describe('parseZaloLeadMessage', () => {
  it('parses labeled name + phone (VN format)', () => {
    const result = parseZaloLeadMessage(
      'Tên: Nguyễn Văn A\nSĐT: 0901234567\nQuan tâm Sunrise Tower',
      'sender_01',
    );
    expect(result.fullName).toBe('Nguyễn Văn A');
    expect(result.phone).toBe('+84901234567');
    expect(result.message).toContain('Sunrise');
  });

  it('parses inline name-phone', () => {
    const result = parseZaloLeadMessage('Trần B - 0987654321', 'sender_02');
    expect(result.fullName).toBe('Trần B');
    expect(result.phone).toBe('+84987654321');
  });

  it('falls back sender id when no name label', () => {
    const result = parseZaloLeadMessage('0901111222 cần tư vấn', '1234567890');
    expect(result.fullName).toBe('Zalo 567890');
    expect(result.phone).toBe('+84901111222');
  });

  it('throws when phone missing', () => {
    expect(() => parseZaloLeadMessage('Chào shop', 'x')).toThrow(/phone/i);
  });
});
