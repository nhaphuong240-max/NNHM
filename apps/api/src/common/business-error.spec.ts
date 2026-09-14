import { UnprocessableEntityException } from '@nestjs/common';
import { businessErrorBody, BusinessErrorCode, throwBusinessError } from './business-error';

describe('business-error', () => {
  it('builds stable code in body', () => {
    const body = businessErrorBody(BusinessErrorCode.LEAD_DEDUPED, 'merged');
    expect(body.code).toBe('LEAD_DEDUPED');
    expect(body.type).toContain('lead-deduped');
    expect(body.detail).toBe('merged');
  });

  it('throws UnprocessableEntityException for 422 codes', () => {
    expect(() => throwBusinessError(BusinessErrorCode.PHONE_INVALID, 'bad phone')).toThrow(
      UnprocessableEntityException,
    );
    try {
      throwBusinessError(BusinessErrorCode.PHONE_INVALID, 'bad phone');
    } catch (e) {
      const res = (e as UnprocessableEntityException).getResponse() as { code: string };
      expect(res.code).toBe('PHONE_INVALID');
    }
  });
});
