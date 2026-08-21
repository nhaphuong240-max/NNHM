export type TenantBrandConfig = {
  tenantId: string;
  displayName: string;
  subdomain: string;
  /** OPS-S6-02 — custom domain e.g. portal.thanglong-dev.vn */
  customDomain?: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  live: boolean;
  whiteLabelTier?: 'STANDARD' | 'ENTERPRISE';
  updatedAt: string;
};

export const DEFAULT_BRAND: Omit<TenantBrandConfig, 'tenantId' | 'updatedAt'> = {
  displayName: 'Ngôi Nhà Hôm Nay',
  subdomain: 'nnhn',
  primaryColor: '#17692F',
  accentColor: '#C7D9C9',
  live: true,
};

export function normalizeSubdomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);
}
