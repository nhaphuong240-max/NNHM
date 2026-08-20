import { issuePartnerKey } from './api-marketplace.types';

describe('api-marketplace.types', () => {
  it('issues partner api keys', () => {
    const key = issuePartnerKey('ptn_test');
    expect(key.startsWith('wereal_ptn_test_')).toBe(true);
  });
});
