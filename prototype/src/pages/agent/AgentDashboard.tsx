import { Link } from 'react-router-dom';
import { Phone, Eye } from 'lucide-react';
import { PortalLayout, PageHeader, KPICard } from '../../components/PortalLayout';
import { HotLeadBadge } from '../../components/ui/Badge';
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

export default function AgentDashboard() {
  const hotLeads = leads.filter((l) => l.tier === 'HOT');

  return (
    <PortalLayout
      portal="agent"
      title="Agent Portal"
      subtitle="Agency ABC · Hoàng Nam"
      nav={agentNav}
      userMenu="Hoàng Nam ▾"
    >
      <PageHeader
        title="Xin chào, Nam"
        description="Hôm nay 28/07/2026"
      />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Lead mới" value={12} />
          <KPICard label="Hot lead" value="5 HOT" highlight />
          <KPICard label="Booking" value={3} />
          <KPICard label="Cọc tháng" value="150M" />
        </div>

        <section>
          <h2 className="font-semibold mb-3">Lead nóng ưu tiên (score ≥ 80)</h2>
          <Card>
            <CardBody className="divide-y divide-border p-0">
              {hotLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <HotLeadBadge score={lead.score} />
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted">
                        {lead.unitCode} · {lead.minutesAgo} phút trước
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4" /> Gọi
                    </Button>
                    <Link to={`/agent/leads/${lead.id}`}>
                      <Button size="sm">
                        <Eye className="h-4 w-4" /> Xem
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Việc cần làm hôm nay</h2>
          <Card>
            <CardBody className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Follow-up lead #LD-042 (SLA 2h)
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Gửi link cọc booking #BK-018
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Duyệt AI content listing LS-042
              </label>
            </CardBody>
          </Card>
        </section>
      </div>
    </PortalLayout>
  );
}
