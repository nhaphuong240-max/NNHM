import { NotFoundException } from '@nestjs/common';
import { allowDefaultTenant } from './default-tenant-flag';
import { normalizeHostHeader, tenantIdForOfficialHost } from './registered-host-tenant';

/**
 * Dev-only hosts. The beachhead domains are not in this map.
 * `ten_dev_01` here is used only when ALLOW_DEFAULT_TENANT is on in development or test.
 */
const DEV_HOST_TENANT_MAP: Record<string, string> = {
  localhost: 'ten_dev_01',
  'sunrise.wereal.vn': 'ten_dev_01',
  'app.wereal.vn': 'ten_dev_01',
};

export function resolveTenantFromHost(hostHeader?: string | null): string | null {
  if (!hostHeader?.trim()) return null;
  const host = normalizeHostHeader(hostHeader);
  if (!host) return null;
  const official = tenantIdForOfficialHost(host);
  if (official) return official;
  if (allowDefaultTenant() && DEV_HOST_TENANT_MAP[host]) return DEV_HOST_TENANT_MAP[host];
  return null;
}

export function requireHostTenant(hostHeader?: string | null): string {
  const tenantId = resolveTenantFromHost(hostHeader);
  if (!tenantId) {
    throw new NotFoundException({ detail: 'no tenant is registered for this host' });
  }
  return tenantId;
}
