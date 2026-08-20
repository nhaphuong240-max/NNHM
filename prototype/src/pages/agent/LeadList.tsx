import { Link } from 'react-router-dom';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { HotLeadBadge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { leads } from '../../data/mock';

const agentNav = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
  { to: '/agent/bookings/new', label: 'Booking' },
];

export default function LeadList() {
  return (
    <PortalLayout portal="agent" title="Agent Portal" subtitle="Agency ABC" nav={agentNav} userMenu="Hoàng Nam ▾">
      <PageHeader
        title="Leads"
        actions={
          <>
            <Button variant="outline" size="sm">Import</Button>
            <Button size="sm">+ Thêm</Button>
          </>
        }
      />

      <div className="p-4 sm:p-6">
        <div className="flex gap-2 mb-4">
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card">
            <option>Hot</option>
            <option>Tất cả</option>
          </select>
          <select className="h-9 px-3 rounded-lg border border-border text-sm bg-card">
            <option>Dự án</option>
          </select>
        </div>

        <Card>
          <CardBody className="p-0 divide-y divide-border">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                to={`/agent/leads/${lead.id}`}
                className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {lead.tier === 'HOT' ? (
                    <HotLeadBadge score={lead.score} />
                  ) : (
                    <span className="text-xs text-muted w-16">○ {lead.score}</span>
                  )}
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted">
                      {lead.unitCode} · {lead.minutesAgo} phút · {lead.contacted ? 'Đã gọi' : 'Chưa gọi'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={lead.stage === 'NEW' ? 'PENDING_REVIEW' : 'ACTIVE'} />
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
