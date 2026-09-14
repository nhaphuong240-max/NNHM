import { AppChrome } from './AppChrome';
import { brand, portalThemes } from '../theme/tokens';

const P0 = [
  { to: '/agent', label: 'Dashboard' },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/viewings', label: 'Xem nhà' },
  { to: '/agent/registrations', label: 'Đăng ký khách' },
  { to: '/agent/inbox', label: 'Inbox' },
  { to: '/agent/bookings/new', label: 'Giữ chỗ' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
];

const ADVANCED = [
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/leads/import', label: 'Import CSV' },
  { to: '/agent/tasks/sla', label: 'SLA tasks' },
  { to: '/agent/contracts/new', label: 'Hợp đồng' },
  { to: '/agent/bookings/cancel', label: 'Hủy booking' },
  { to: '/agent/listings/media', label: 'Media' },
  { to: '/agent/settings/routing', label: 'Routing' },
  { to: '/agent/marketplace/apply', label: 'Marketplace' },
  { to: '/public/search', label: 'Search' },
  { to: '/', label: 'Home' },
];

export function AgentShell({
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
      portalLabel={portalThemes.agent.label}
      mark={portalThemes.agent.mark}
      accent={brand.primary}
      title={title}
      subtitle={subtitle}
      screenTag={screenTag ?? 'Agent Portal'}
      primary={P0}
      advanced={ADVANCED}
    >
      {children}
    </AppChrome>
  );
}
