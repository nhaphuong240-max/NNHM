import assert from 'node:assert/strict';
import {
  normalizeHostHeader as apiNormalize,
  PILOT_HOST_TENANT_MAP as apiPilot,
  REGISTERED_HOST_TENANT_MAP as apiRegistered,
  tenantIdForOfficialHost as apiTenant,
} from '../apps/api/src/common/registered-host-tenant.ts';
import {
  normalizeHostHeader as webNormalize,
  PILOT_HOST_TENANT_MAP as webPilot,
  REGISTERED_HOST_TENANT_MAP as webRegistered,
  tenantIdForOfficialHost as webTenant,
} from '../apps/web/src/lib/registered-host-tenant.ts';

assert.deepEqual(webRegistered, apiRegistered);
assert.deepEqual(webPilot, apiPilot);

const samples = [
  'ngoinhahomnay.vn',
  'www.ngoinhahomnay.vn',
  'NgoiNhaHomNay.vn:443',
  'ngoinhahomnay.vn.',
  'www.ngoinhahomnay.vn.',
  'evil-ngoinhahomnay.vn',
  'ngoinhahomnay.vn.evil.com',
  'sunrise.wereal.vn',
  'app.wereal.vn',
  'localhost:5174',
  'portal.thanglong-dev.vn',
  'thanglong.wereal.vn',
  '[::1]:80',
  '',
];

for (const sample of samples) {
  const host = apiNormalize(sample);
  assert.equal(webNormalize(sample), host);
  assert.equal(webTenant(host), apiTenant(host));
}
