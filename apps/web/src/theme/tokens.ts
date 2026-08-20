/** WEREAL design tokens v3 — luxury ops chrome */
export const brand = {
  primary: '#0B3A5B',
  primaryLight: '#1A5A86',
  primaryDark: '#072A42',
  primaryForeground: '#FFFFFF',
  secondary: '#E8F0F6',
  accent: '#C4A35A',
  accentSoft: '#F4EBD6',
  muted: '#5C6570',
  border: '#E4E0D8',
  background: '#F6F3EE',
  surface: '#FFFcf8',
  pageBg: '#F6F3EE',
  success: '#1B7A4A',
  warning: '#C45C12',
  destructive: '#C0392B',
  ink: '#12141A',
} as const;

export const semantic = {
  verified: { bg: '#E4F5EA', text: '#166534', border: '#B7E0C4' },
  hotLead: { bg: '#FBE8D8', text: '#9A3412', border: '#F2C9A8' },
  available: { bg: '#E4F5EA', text: '#15803D', border: '#B7E0C4' },
  sold: { bg: '#EEEBE6', text: '#475569', border: '#E4E0D8' },
  pending: { bg: '#E4EEF6', text: '#1D4ED8', border: '#C5D8EA' },
} as const;

export const layout = {
  maxWidth: 'max-w-[1600px]',
  kpiGrid: 'grid grid-cols-2 lg:grid-cols-4 gap-4',
  cardGrid: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6',
} as const;

export const finance = {
  accent: '#0F766E',
  accentSoft: '#D7F3EE',
  accentDark: '#0F4F4A',
} as const;

export const portalThemes = {
  developer: { header: brand.primaryDark, label: 'CĐT', mark: 'CĐT' },
  agent: { header: brand.primary, label: 'Agent', mark: 'AG' },
  admin: { header: '#1A2330', label: 'Admin', mark: 'OPS' },
  finance: { header: finance.accentDark, label: 'Finance', mark: 'FIN' },
  buyer: { header: brand.primaryLight, label: 'Buyer', mark: 'KH' },
} as const;

export function formatPrice(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} tỷ ₫`;
  }
  return `${value.toLocaleString('vi-VN')} ₫`;
}

export function formatVnd(value: number) {
  return `${value.toLocaleString('vi-VN')} ₫`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatIctDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
