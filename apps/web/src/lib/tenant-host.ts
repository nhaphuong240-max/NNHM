import {
  normalizeHostHeader,
  tenantIdForOfficialHost,
} from './registered-host-tenant.ts';

/** Browser hostname → tenant. Same official map as the API. No seed fallback. */
export function resolveTenantFromHost(hostname?: string | null): string | null {
  if (!hostname?.trim()) return null;
  const host = normalizeHostHeader(hostname);
  if (!host) return null;
  return tenantIdForOfficialHost(host);
}

export function applyHostTenantOverride(): string | null {
  if (typeof window === 'undefined') return null;
  const tenantId = resolveTenantFromHost(window.location.hostname);
  if (!tenantId) return null;
  document.documentElement.dataset.tenantHost = tenantId;
  return tenantId;
}
