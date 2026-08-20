import { mergeContractTemplate, validateEsignOtp } from './booking-contract.util';

describe('booking-contract.util', () => {
  it('merges deposit template placeholders', () => {
    const text = mergeContractTemplate('tpl_deposit_agreement', {
      buyerName: 'Thu Trang',
      buyerPhone: '+84901234567',
      unitCode: 'A-12-05',
      unitArea: '68',
      basePrice: 3_850_000_000,
      depositAmount: 50_000_000,
      bookingId: 'bk_demo01',
      projectName: 'Sunrise Tower A',
      agentLabel: 'Agent Sunrise',
      contractDate: '29/07/2026',
    });

    expect(text).toContain('Thu Trang');
    expect(text).toContain('A-12-05');
    expect(text).toContain('bk_demo01');
    expect(text).not.toContain('{{');
  });

  it('validates demo e-sign OTP', () => {
    expect(validateEsignOtp('123456')).toBe(true);
    expect(validateEsignOtp('000000')).toBe(false);
  });
});
