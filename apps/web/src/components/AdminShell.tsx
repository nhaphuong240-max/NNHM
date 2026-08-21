import { AppChrome } from './AppChrome';
import { useOpsNoIndex } from '../hooks/useOpsNoIndex';
import { portalThemes } from '../theme/tokens';

const P0 = [
  { to: '/admin/ops', label: 'Ops' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/audit', label: 'Audit' },
  { to: '/admin', label: 'Dashboard' },
];

const ADVANCED = [
  { to: '/admin/tenants/onboard', label: 'Tenants' },
  { to: '/admin/users/roles', label: 'Roles' },
  { to: '/admin/bookings/replay', label: 'Replay' },
  { to: '/admin/disputes', label: 'Disputes' },
  { to: '/admin/duplicates', label: 'Duplicates' },
  { to: '/admin/kyc', label: 'KYC' },
  { to: '/admin/analytics/gmv', label: 'GMV' },
  { to: '/admin/analytics/attribution', label: 'Attribution' },
  { to: '/admin/integrations/leads', label: 'Omnichannel' },
  { to: '/admin/integrations/zalo', label: 'Zalo' },
  { to: '/admin/integrations/sms', label: 'SMS' },
  { to: '/admin/integrations/meta', label: 'Meta' },
  { to: '/admin/ai/anomaly', label: 'AI Anomaly' },
  { to: '/admin/api-marketplace', label: 'API Market' },
  { to: '/admin/marketplace', label: 'Marketplace' },
  { to: '/admin/payment-gateways', label: 'Gateways' },
  { to: '/admin/regulatory-export', label: 'Reg export' },
  { to: '/admin/commission/holdback', label: 'Holdback' },
  { to: '/admin/whitelabel', label: 'White-label' },
  { to: '/admin/workflows', label: 'Workflows' },
  { to: '/', label: 'Home' },
];

export function AdminShell({
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
  useOpsNoIndex(`${title} · Admin`);
  return (
    <AppChrome
      portalLabel={portalThemes.admin.label}
      mark={portalThemes.admin.mark}
      accent={portalThemes.admin.header}
      title={title}
      subtitle={subtitle}
      screenTag={screenTag ?? 'Admin / Ops'}
      primary={P0}
      advanced={ADVANCED}
    >
      {children}
    </AppChrome>
  );
}
