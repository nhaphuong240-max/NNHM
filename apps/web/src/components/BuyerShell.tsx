import { AppChrome } from './AppChrome';
import { brand, portalThemes } from '../theme/tokens';

const P0 = [{ to: '/buyer/deals', label: 'Deals' }];

const ADVANCED = [
  { to: '/buyer/esign?contractId=ctr_esign_demo01', label: 'E-sign demo' },
  { to: '/', label: 'Home' },
];

export function BuyerShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AppChrome
      portalLabel={portalThemes.buyer.label}
      mark={portalThemes.buyer.mark}
      accent={brand.primary}
      title={title}
      subtitle={subtitle}
      screenTag="Buyer Portal"
      primary={P0}
      advanced={ADVANCED}
      compact
    >
      {children}
    </AppChrome>
  );
}
