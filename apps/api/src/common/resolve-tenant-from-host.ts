import { NotFoundException } from '@nestjs/common';
import { allowDefaultTenant } from './default-tenant-flag';

/** Registered hosts. Seed-tenant hosts exist only while the explicit dev flag is on. */
const HOST_TENANT_MAP: Record<string, string> = {
  'portal.thanglong-dev.vn': 'ten_pilot_cdt_01',
  'thanglong.wereal.vn': 'ten_pilot_cdt_01',
};

const DEV_HOST_TENANT_MAP: Record<string, string> = {
  'ngoinhahomnay.vn': 'ten_dev_01',
  'www.ngoinhahomnay.vn': 'ten_dev_01',
  localhost: 'ten_dev_01',
};

export function resolveTenantFromHost(hostHeader?: string | null): string | null {
  if (!hostHeader?.trim()) return null;
  const host = hostHeader.trim().toLowerCase().split(':')[0] ?? '';
  if (HOST_TENANT_MAP[host]) return HOST_TENANT_MAP[host];
  if (allowDefaultTenant() && DEV_HOST_TENANT_MAP[host]) return DEV_HOST_TENANT_MAP[host];
  const subdomain = host.endsWith('.wereal.vn') ? host.replace(/\.wereal\.vn$/, '') : null;
  if (subdomain === 'thanglong') return 'ten_pilot_cdt_01';
  if (allowDefaultTenant() && (subdomain === 'sunrise' || subdomain === 'app')) return 'ten_dev_01';
  return null;
}

export function requireHostTenant(hostHeader?: string | null): string {
  const tenantId = resolveTenantFromHost(hostHeader);
  if (!tenantId) {
    throw new NotFoundException({ detail: 'no tenant is registered for this host' });
  }
  return tenantId;
}
