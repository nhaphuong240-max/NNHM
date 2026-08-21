/** Ngôi Nhà Hôm Nay — forest, clay, rice paper */
export const brand = {
  primary: '#1B5E3B',
  primaryLight: '#2E7A4F',
  primaryDark: '#123D27',
  primaryForeground: '#FFFFFF',
  hover: '#D8E5D4',
  secondary: '#D8E5D4',
  accent: '#C45C2A',
  accentSoft: '#F3E0D2',
  clay: '#C45C2A',
  claySoft: '#F3E0D2',
  muted: '#5A615C',
  border: '#DDD6C8',
  background: '#F4EFE6',
  surface: '#FFFcf7',
  pageBg: '#F4EFE6',
  success: '#1B5E3B',
  warning: '#C45C12',
  destructive: '#C0392B',
  ink: '#1A1814',
} as const;

export const semantic = {
  verified: { bg: '#D8E5D4', text: '#1B5E3B', border: '#D8E5D4' },
  hotLead: { bg: '#F3E0D2', text: '#9A3412', border: '#E8C4A8' },
  available: { bg: '#D8E5D4', text: '#1B5E3B', border: '#D8E5D4' },
  sold: { bg: '#F4EFE6', text: '#5A615C', border: '#DDD6C8' },
  pending: { bg: '#F3E0D2', text: '#C45C2A', border: '#E8C4A8' },
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
  admin: { header: brand.primaryDark, label: 'Admin', mark: 'OPS' },
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
