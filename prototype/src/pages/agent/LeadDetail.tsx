import { useParams, Link } from 'react-router-dom';
import { Phone, CalendarPlus } from 'lucide-react';
import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { HotLeadBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { VerifiedBadge } from '../../components/ui/Badge';
import { leads, units } from '../../data/mock';
import { formatPrice } from '../../lib/utils';

const agentNav = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
  { to: '/agent/bookings/new', label: 'Booking' },
];

const timeline = [
  { time: '28/07 15:00', event: 'Lead tạo từ form', type: 'system' },
  { time: '28/07 15:01', event: 'AI score: 85 HOT', type: 'ai' },
  { time: '28/07 15:05', event: 'Assigned → Hoàng Nam', type: 'system' },
  { time: '28/07 16:00', event: 'Ghi chú: Gọi lại chiều nay', type: 'note' },
];

export default function LeadDetail() {
  const { id } = useParams();
  const lead = leads.find((l) => l.id === id) ?? leads[0];
  const unit = units.find((u) => u.code === lead.unitCode);

  return (
    <PortalLayout portal="agent" title="Agent Portal" nav={agentNav} userMenu="Hoàng Nam ▾">
      <PageHeader
        title={lead.name}
        description={`${lead.tier} (${lead.score})`}
        backTo="/agent/leads"
        actions={
          <>
            <Button variant="outline" size="sm"><Phone className="h-4 w-4" /> Gọi</Button>
            <Link to="/agent/bookings/new">
              <Button size="sm"><CalendarPlus className="h-4 w-4" /> Tạo booking</Button>
            </Link>
          </>
        }
      />

      <div className="grid lg:grid-cols-2 gap-6 p-4 sm:p-6">
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3 text-sm">
              <h3 className="font-semibold">Thông tin</h3>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted">SĐT</span><span>090***4567 [Copy]</span>
                <span className="text-muted">Email</span><span>{lead.email}</span>
                <span className="text-muted">Nguồn</span><span>{lead.source}</span>
                <span className="text-muted">Quan tâm</span><span>{lead.unitCode} {lead.project}</span>
              </div>
              <div>
                <label className="text-muted text-xs">Stage</label>
                <select className="w-full mt-1 h-9 px-3 rounded-lg border border-border bg-card" defaultValue={lead.stage}>
                  <option>NEW</option>
                  <option>QUALIFIED</option>
                  <option>CONTACTED</option>
                  <option>BOOKING</option>
                </select>
              </div>
            </CardBody>
          </Card>

          {unit && (
            <Card>
              <CardBody>
                <h3 className="font-semibold text-sm mb-2">Căn quan tâm</h3>
                <div className="flex gap-3">
                  <div className="w-20 h-16 bg-secondary rounded flex items-center justify-center">🏠</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{unit.code}</span>
                      <VerifiedBadge />
                    </div>
                    <p className="text-sm text-primary font-bold">{formatPrice(unit.price)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Timeline</h3>
              <HotLeadBadge score={lead.score} />
            </div>
            <div className="space-y-4 border-l-2 border-border ml-2 pl-4">
              {timeline.map((item, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-xs text-muted">{item.time}</p>
                  <p className="text-sm">{item.event}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full">+ Thêm hoạt động</Button>
          </CardBody>
        </Card>
      </div>
    </PortalLayout>
  );
}
