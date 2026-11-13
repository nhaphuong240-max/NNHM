import { execFileSync } from 'child_process';
import * as path from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantBrandingController } from '../modules/identity/tenant-branding.controller';
import { requireHostTenant } from './resolve-tenant-from-host';

const BEACHHEAD = 'ten_dev_01';

describe('registered beachhead hosts', () => {
  const env = process.env.NODE_ENV;
  const flag = process.env.ALLOW_DEFAULT_TENANT;

  afterEach(() => {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
    if (flag === undefined) delete process.env.ALLOW_DEFAULT_TENANT;
    else process.env.ALLOW_DEFAULT_TENANT = flag;
  });

  function branding() {
    const getBrand = jest.fn((tenantId: string) => ({ data: { tenantId } }));
    const controller = new TenantBrandingController({ getBrand } as never, { get: () => undefined } as never);
    return { controller, getBrand };
  }

  function expectRegisteredHosts(nodeEnv: string) {
    process.env.NODE_ENV = nodeEnv;
    delete process.env.ALLOW_DEFAULT_TENANT;

    expect(requireHostTenant('ngoinhahomnay.vn')).toBe(BEACHHEAD);
    expect(requireHostTenant('www.ngoinhahomnay.vn')).toBe(BEACHHEAD);
    expect(requireHostTenant('NgoiNhaHomNay.vn:443')).toBe(BEACHHEAD);
    expect(requireHostTenant('ngoinhahomnay.vn.')).toBe(BEACHHEAD);

    for (const host of [
      'evil-ngoinhahomnay.vn',
      'ngoinhahomnay.vn.evil.com',
      'sunrise.wereal.vn',
      'app.wereal.vn',
      'localhost',
    ]) {
      expect(() => requireHostTenant(host)).toThrow(NotFoundException);
    }

    const { controller, getBrand } = branding();
    expect(() => controller.getPublic('ten_other', 'ngoinhahomnay.vn')).toThrow(ForbiddenException);
    expect(getBrand).not.toHaveBeenCalled();
    expect(controller.getPublic(BEACHHEAD, 'www.ngoinhahomnay.vn')).toEqual({
      data: { tenantId: BEACHHEAD },
    });
  }

  it('resolves the beachhead hosts and rejects lookalikes when NODE_ENV=production and the flag is off', () => {
    expectRegisteredHosts('production');
  });

  it('resolves the beachhead hosts and rejects lookalikes when NODE_ENV=staging and the flag is off', () => {
    expectRegisteredHosts('staging');
  });
});

describe('web host map copy', () => {
  it('keeps the web host map equal to the API host map', () => {
    const script = path.resolve(__dirname, '../../../../scripts/compare-host-tenant-maps.ts');
    execFileSync(process.execPath, ['--experimental-strip-types', script], { stdio: 'pipe' });
  });
});
