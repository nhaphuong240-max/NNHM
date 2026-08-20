import { TenantConfigService } from './tenant-config.service';

describe('TenantConfigService', () => {
  it('hashIp returns sha256 prefix', () => {
    const hash = TenantConfigService.hashIp('203.0.113.1');
    expect(hash).toHaveLength(32);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('hashIp returns null for empty', () => {
    expect(TenantConfigService.hashIp('')).toBeNull();
    expect(TenantConfigService.hashIp(undefined)).toBeNull();
  });
});
