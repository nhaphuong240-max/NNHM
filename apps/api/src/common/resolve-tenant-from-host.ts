/** OPS-S6-02 — map Host header / browser hostname → tenant for white-label portal. */
const HOST_TENANT_MAP: Record<string, string> = {
  'portal.thanglong-dev.vn': 'ten_pilot_cdt_01',
  'thanglong.wereal.vn': 'ten_pilot_cdt_01',
  'localhost': 'ten_dev_01',
};

export function resolveTenantFromHost(hostHeader?: string | null): string | null {
  if (!hostHeader?.trim()) return null;
  const host = hostHeader.trim().toLowerCase().split(':')[0] ?? '';
  if (HOST_TENANT_MAP[host]) return HOST_TENANT_MAP[host];
  const subdomain = host.endsWith('.wereal.vn') ? host.replace(/\.wereal\.vn$/, '') : null;
  if (subdomain === 'thanglong') return 'ten_pilot_cdt_01';
  if (subdomain === 'sunrise' || subdomain === 'app') return 'ten_dev_01';
  return null;
}
