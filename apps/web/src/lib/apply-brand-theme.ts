import type { TenantBrandConfig } from './api';
import { brand } from '../theme/tokens';

export type PublicBrand = Pick<
  TenantBrandConfig,
  'displayName' | 'primaryColor' | 'accentColor' | 'logoUrl' | 'customDomain' | 'live'
>;

export const FALLBACK_PUBLIC_BRAND: PublicBrand = {
  displayName: 'Ngôi Nhà Hôm Nay',
  primaryColor: brand.primary,
  accentColor: brand.hover,
  live: true,
};

export function applyBrandTheme(config: {
  primaryColor?: string;
  accentColor?: string;
  displayName?: string;
}) {
  const root = document.documentElement;
  if (config.primaryColor) {
    root.style.setProperty('--nnhn-primary', config.primaryColor);
    root.style.setProperty('--nnhn-primary-dark', config.primaryColor);
  }
  if (config.accentColor) {
    root.style.setProperty('--nnhn-accent', config.accentColor);
  }
  if (config.displayName) {
    document.title = config.displayName;
  }
}

export function brandPrimary(config?: { primaryColor?: string } | null) {
  return config?.primaryColor ?? brand.primary;
}

export function brandAccent(config?: { accentColor?: string } | null) {
  return config?.accentColor ?? brand.hover;
}

export function brandPrimaryDark(config?: { primaryColor?: string } | null) {
  return config?.primaryColor ?? brand.primaryDark;
}
