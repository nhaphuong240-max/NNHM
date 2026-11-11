/** OPS-S6-02 — browser hostname → tenant for white-label portal. */
const HOST_TENANT_MAP: Record<string, string> = {
  'portal.thanglong-dev.vn': 'ten_pilot_cdt_01',
  'thanglong.wereal.vn': 'ten_pilot_cdt_01',
};

export function resolveTenantFromHost(hostname?: string | null): string | null {
  if (!hostname?.trim()) return null;
  const host = hostname.trim().toLowerCase().split(':')[0] ?? '';
  if (HOST_TENANT_MAP[host]) return HOST_TENANT_MAP[host];
  if (host.endsWith('.wereal.vn')) {
    const sub = host.replace(/\.wereal\.vn$/, '');
    if (sub === 'thanglong') return 'ten_pilot_cdt_01';
  }
  return null;
}

export function applyHostTenantOverride(): string | null {
  if (typeof window === 'undefined') return null;
  const tenantId = resolveTenantFromHost(window.location.hostname);
  if (!tenantId) return null;
  document.documentElement.dataset.tenantHost = tenantId;
  return tenantId;
}
