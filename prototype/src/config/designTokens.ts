/**
 * WEREAL REOS — Design Tokens (single source of truth)
 * Sync: docs/specs/WEREAL-Design-System-Spec.md · Mockup-UI-mau.md §3
 */
import type { Portal } from './useCases';

/** Brand core — không đổi giữa các portal */
export const brand = {
  primary: '#0F4C81',
  primaryLight: '#1a6bb5',
  primaryDark: '#0a3d6b',
  primaryForeground: '#FFFFFF',
  secondary: '#E8F1F8',
  accent: '#C9A227',
  accentLight: '#e8c547',
  accentDark: '#a8861f',
  success: '#16A34A',
  warning: '#EA580C',
  destructive: '#DC2626',
  muted: '#64748B',
  background: '#FAFBFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  pageBg: '#F4F7FA',
} as const;

/** Semantic — trạng thái nghiệp vụ BĐS */
export const semantic = {
  verified: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  hotLead: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
  reserved: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  available: { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' },
  sold: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
  pending: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  driftBlock: { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
} as const;

/** Typography scale */
export const typography = {
  displayLg: 'text-4xl font-bold tracking-tight',
  h1: 'text-2xl lg:text-3xl font-bold tracking-tight text-slate-900',
  h2: 'text-xl lg:text-2xl font-semibold text-slate-900',
  h3: 'text-lg font-semibold text-slate-800',
  bodyLg: 'text-base text-slate-700',
  bodySm: 'text-sm text-slate-600',
  label: 'text-xs font-medium uppercase tracking-wider text-slate-500',
  price: 'text-2xl font-bold tabular-nums text-primary',
  mono: 'font-mono text-sm text-slate-600',
} as const;

/** Layout */
export const layout = {
  maxWidth: 'max-w-[1600px]',
  sidebarWidth: 'w-64',
  headerHeight: 'h-16',
  contentPadding: 'p-4 lg:p-8',
  sectionGap: 'space-y-6 lg:space-y-8',
  gridCols: {
    kpi: 'grid grid-cols-2 lg:grid-cols-4 gap-4',
    cards: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6',
  },
} as const;

/** Spacing (4px base) */
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
} as const;

export type HeaderVariant = 'brand' | 'light';

export interface PortalTheme {
  label: string;
  headerVariant: HeaderVariant;
  /** Sidebar active border + tint */
  accent: string;
  accentSoft: string;
  description: string;
}

/** Portal themes — cùng brand, khác accent nhẹ (không dùng màu lạ) */
export const portalThemes: Record<Portal, PortalTheme> = {
  public: {
    label: 'Public Portal',
    headerVariant: 'light',
    accent: brand.primary,
    accentSoft: `${brand.primary}14`,
    description: 'Buyer/Guest — tin cậy, sáng, CTA rõ',
  },
  agent: {
    label: 'Agent Portal',
    headerVariant: 'brand',
    accent: brand.primary,
    accentSoft: `${brand.primary}14`,
    description: 'Agent/Agency — data-dense, tốc độ thao tác',
  },
  admin: {
    label: 'Admin / Ops Portal',
    headerVariant: 'brand',
    accent: brand.primaryDark,
    accentSoft: `${brand.primaryDark}18`,
    description: 'Platform/Ops — moderation, audit, tenant',
  },
  developer: {
    label: 'Portal Chủ đầu tư',
    headerVariant: 'brand',
    accent: brand.primary,
    accentSoft: `${brand.primary}14`,
    description: 'Developer — GR, absorption, gold KPI highlights',
  },
  finance: {
    label: 'Finance Portal',
    headerVariant: 'brand',
    accent: '#0F766E',
    accentSoft: '#0F766E18',
    description: 'Finance — ledger, reconcile (teal semantic)',
  },
  buyer: {
    label: 'Buyer Portal',
    headerVariant: 'brand',
    accent: brand.primaryLight,
    accentSoft: `${brand.primaryLight}18`,
    description: 'Buyer — deal tracker, payment đơn giản',
  },
  auth: {
    label: 'Đăng nhập',
    headerVariant: 'light',
    accent: brand.primary,
    accentSoft: `${brand.primary}14`,
    description: 'Auth — form tập trung, minimal',
  },
  system: {
    label: 'System',
    headerVariant: 'brand',
    accent: '#475569',
    accentSoft: '#47556918',
    description: 'System/infra monitors',
  },
};

/** Component class presets */
export const components = {
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0a3d6b] transition-colors',
  btnSecondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors',
  btnAccent:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity',
  btnDestructive:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity',
  input:
    'w-full h-11 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
  card: 'glass-card rounded-2xl p-5 lg:p-6',
  table: 'data-table rounded-xl overflow-hidden border border-border bg-white',
} as const;

export function getPortalTheme(portal: Portal): PortalTheme {
  return portalThemes[portal];
}
