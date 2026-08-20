import { buildRegulatoryManifest } from './regulatory-export.util';

describe('regulatory-export.util', () => {
  it('builds manifest with sha256', () => {
    const result = buildRegulatoryManifest({
      jobId: 'rex_demo01',
      tenantId: 'ten_dev_01',
      scope: 'FULL',
      auditCount: 10,
      bookingCount: 3,
      paymentCount: 2,
    });
    expect(result.sha256).toHaveLength(64);
    expect(result.csv).toContain('manifest_sha256');
  });
});
