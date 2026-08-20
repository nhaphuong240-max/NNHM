import { AppChrome } from './AppChrome';
import { brand, portalThemes } from '../theme/tokens';

const P0 = [
  { to: '/developer', label: 'Tổng quan' },
  { to: '/developer/units', label: 'Bảng hàng GR' },
  { to: '/developer/units/import', label: 'Import' },
  { to: '/developer/commission', label: 'Hoa hồng' },
  { to: '/developer/distribution', label: 'Phân phối' },
];

const ADVANCED = [
  { to: '/developer/anchor', label: 'Anchor' },
  { to: '/developer/intelligence', label: 'Intelligence' },
  { to: '/developer/product-graph', label: 'Product Graph' },
  { to: '/developer/time-travel', label: 'Time-travel' },
  { to: '/developer/forecast', label: 'Forecast' },
  { to: '/developer/absorption', label: 'Absorption' },
  { to: '/developer/attribution', label: 'Attribution' },
  { to: '/developer/documents', label: 'Tài liệu' },
  { to: '/developer/leaderboard', label: 'Leaderboard' },
  { to: '/developer/webhooks', label: 'Webhooks' },
  { to: '/', label: 'Home' },
];

export function DeveloperShell({
  title,
  subtitle,
  screenTag,
  children,
}: {
  title: string;
  subtitle?: string;
  screenTag?: string;
  children: React.ReactNode;
}) {
  return (
    <AppChrome
      portalLabel={portalThemes.developer.label}
      mark={portalThemes.developer.mark}
      accent={brand.primaryDark}
      title={title}
      subtitle={subtitle}
      screenTag={screenTag ?? 'Developer · Chủ đầu tư'}
      primary={P0}
      advanced={ADVANCED}
    >
      {children}
    </AppChrome>
  );
}
