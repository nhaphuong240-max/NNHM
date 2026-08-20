import {
  buildZnsTemplateData,
  formatPhoneForZaloApi,
} from './zalo-graph.types';

describe('zalo-graph.types', () => {
  it('formats VN phone for Zalo API', () => {
    expect(formatPhoneForZaloApi('+84901234567')).toBe('84901234567');
    expect(formatPhoneForZaloApi('0901234567')).toBe('84901234567');
    expect(formatPhoneForZaloApi('84987654321')).toBe('84987654321');
  });

  it('builds default template_data by template id', () => {
    expect(buildZnsTemplateData('zns_otp_v1', {})).toEqual({ otp: '000000' });
    expect(buildZnsTemplateData('zns_lead_ack_v1', {})).toMatchObject({
      customer_name: expect.any(String),
    });
  });
});
