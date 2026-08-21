import { AppChrome } from './AppChrome';
import { useOpsNoIndex } from '../hooks/useOpsNoIndex';
import { finance, portalThemes } from '../theme/tokens';

const P0 = [
  { to: '/finance/reconciliation', label: 'Đối soát' },
  { to: '/finance/refunds', label: 'Hoàn tiền' },
  { to: '/finance/settlement', label: 'Settlement' },
];

const ADVANCED = [
  { to: '/finance/commission/split', label: 'Split HH' },
  { to: '/finance/commission/export', label: 'Export HH' },
  { to: '/finance/escrow', label: 'Escrow' },
  { to: '/', label: 'Public' },
];

export function FinanceShell({
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
  useOpsNoIndex(`${title} · Finance`);
  return (
    <AppChrome
      portalLabel={portalThemes.finance.label}
      mark={portalThemes.finance.mark}
      accent={finance.accentDark}
      title={title}
      subtitle={subtitle}
      screenTag={screenTag ?? 'Finance Portal'}
      primary={P0}
      advanced={ADVANCED}
      logoutHref="/auth/login?portal=finance"
    >
      {children}
    </AppChrome>
  );
}
