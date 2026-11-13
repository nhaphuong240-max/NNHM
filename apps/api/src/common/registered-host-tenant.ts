/**
 * Official host registration. `ten_dev_01` here is the beachhead tenant bound to
 * these hosts (UAT `ngoinhahomnay.vn`), not a fallback used when no tenant is known.
 * Evidence: scripts/uat-phase-b-beachhead.sh:5-6, database.seed.service.ts:905,
 * scripts/phase-a-enable-notify-prod.sh:27, docs/specs/NNHN-SRS-Implementation-Plan.md:490.
 * A later PR should give the beachhead its own tenant id and migrate the rows.
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

export const BEACHHEAD_TENANT_ID = REGISTERED_HOST_TENANT_MAP['ngoinhahomnay.vn']!;

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
