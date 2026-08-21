/** Ngôi Nhà Hôm Nay — green / paper */
export const brand = {
  primary: '#17692F',
  primaryLight: '#2A8644',
  primaryDark: '#0F4D22',
  primaryForeground: '#FFFFFF',
  hover: '#C7D9C9',
  secondary: '#C7D9C9',
  accent: '#C7D9C9',
  accentSoft: '#C7D9C9',
  muted: '#5C6570',
  border: '#D5DBD6',
  background: '#ECEFEA',
  surface: '#FFFFFF',
  pageBg: '#ECEFEA',
  success: '#17692F',
  warning: '#C45C12',
  destructive: '#C0392B',
  ink: '#12141A',
} as const;

export const semantic = {
  verified: { bg: '#C7D9C9', text: '#17692F', border: '#C7D9C9' },
  hotLead: { bg: '#FBE8D8', text: '#9A3412', border: '#F2C9A8' },
  available: { bg: '#C7D9C9', text: '#17692F', border: '#C7D9C9' },
  sold: { bg: '#ECEFEA', text: '#475569', border: '#D5DBD6' },
  pending: { bg: '#C7D9C9', text: '#17692F', border: '#C7D9C9' },
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
