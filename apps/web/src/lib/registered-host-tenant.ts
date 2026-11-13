/**
 * Copy of apps/api/src/common/registered-host-tenant.ts.
 * The web image build context is apps/web, so this file cannot import the API.
 * scripts/compare-host-tenant-maps.ts fails when the two copies differ.
 * `ten_dev_01` is the beachhead tenant registered for these hosts, not a fallback.
 */
export const REGISTERED_HOST_TENANT_MAP: Readonly<Record<string, string>> = {
  'ngoinhahomnay.vn': 'ten_dev_01',
  'www.ngoinhahomnay.vn': 'ten_dev_01',
};

/** Exact pilot hosts. No suffix match. */
export const PILOT_HOST_TENANT_MAP: Readonly<Record<string, string>> = {
  'portal.thanglong-dev.vn': 'ten_pilot_cdt_01',
  'thanglong.wereal.vn': 'ten_pilot_cdt_01',
};

/** Lowercase, drop a numeric port, drop a trailing dot. Exact key lookup only. */
export function normalizeHostHeader(raw: string): string {
  let host = raw.trim().toLowerCase();
  if (!host) return '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    host = end === -1 ? host.slice(1) : host.slice(1, end);
  } else {
    const colon = host.lastIndexOf(':');
    if (colon > 0 && /^\d+$/.test(host.slice(colon + 1))) {
      host = host.slice(0, colon);
    }
  }
  while (host.endsWith('.')) host = host.slice(0, -1);
  return host;
}

export function tenantIdForOfficialHost(host: string): string | null {
  return REGISTERED_HOST_TENANT_MAP[host] ?? PILOT_HOST_TENANT_MAP[host] ?? null;
}
