import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTenantFromHost } from './tenant-host.ts';

const BEACHHEAD = 'ten_dev_01';

describe('tenant-host.ts', () => {
  it('resolves the registered beachhead hosts after normalization', () => {
    assert.equal(resolveTenantFromHost('ngoinhahomnay.vn'), BEACHHEAD);
    assert.equal(resolveTenantFromHost('www.ngoinhahomnay.vn'), BEACHHEAD);
    assert.equal(resolveTenantFromHost('NgoiNhaHomNay.vn:443'), BEACHHEAD);
    assert.equal(resolveTenantFromHost('ngoinhahomnay.vn.'), BEACHHEAD);
  });

  it('does not match lookalikes, dev hosts, or localhost', () => {
    for (const host of [
      'evil-ngoinhahomnay.vn',
      'ngoinhahomnay.vn.evil.com',
      'sunrise.wereal.vn',
      'app.wereal.vn',
      'localhost',
    ]) {
      assert.equal(resolveTenantFromHost(host), null);
    }
  });
});
